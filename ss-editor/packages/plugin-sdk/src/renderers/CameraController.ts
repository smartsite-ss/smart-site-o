// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type CameraDragMode = 'orbit' | 'pan';

export interface CameraControllerOptions {
  rotateSpeed?: number;
  zoomSpeed?: number;
  panSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  enabled?: boolean;
}

export class CameraController {
  private _camera: any;
  private _domElement: HTMLElement | null = null;
  private _enabled = true;

  private _rotateSpeed: number;
  private _zoomSpeed: number;
  private _panSpeed: number;
  private _minDistance: number;
  private _maxDistance: number;
  private _minPolarAngle: number;
  private _maxPolarAngle: number;

  private _target = { x: 0, y: 0, z: 0 };
  private _spherical = { radius: 10, phi: Math.PI / 4, theta: Math.PI / 4 };

  private _isDragging = false;
  private _dragMode: CameraDragMode = 'orbit';
  private _lastMouse = { x: 0, y: 0 };

  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onContextMenu: (e: MouseEvent) => void;

  constructor(camera: any, options: CameraControllerOptions = {}) {
    this._camera = camera;

    this._rotateSpeed = options.rotateSpeed ?? 0.005;
    this._zoomSpeed = options.zoomSpeed ?? 0.1;
    this._panSpeed = options.panSpeed ?? 0.5;
    this._minDistance = options.minDistance ?? 1;
    this._maxDistance = options.maxDistance ?? 100;
    this._minPolarAngle = options.minPolarAngle ?? 0.1;
    this._maxPolarAngle = options.maxPolarAngle ?? Math.PI - 0.1;
    this._enabled = options.enabled ?? true;

    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onContextMenu = (e: MouseEvent) => e.preventDefault();
  }

  attach(domElement: HTMLElement): void {
    this.detach();
    this._domElement = domElement;
    domElement.addEventListener('mousedown', this._onMouseDown);
    domElement.addEventListener('mousemove', this._onMouseMove);
    domElement.addEventListener('mouseup', this._onMouseUp);
    domElement.addEventListener('wheel', this._onWheel, { passive: false });
    domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  detach(): void {
    if (!this._domElement) return;
    this._domElement.removeEventListener('mousedown', this._onMouseDown);
    this._domElement.removeEventListener('mousemove', this._onMouseMove);
    this._domElement.removeEventListener('mouseup', this._onMouseUp);
    this._domElement.removeEventListener('wheel', this._onWheel);
    this._domElement.removeEventListener('contextmenu', this._onContextMenu);
    this._domElement = null;
  }

  set enabled(v: boolean) {
    this._enabled = v;
    if (!v) this._isDragging = false;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setTarget(x: number, y: number, z: number): void {
    this._target = { x, y, z };
    this._updateCamera();
  }

  setPosition(x: number, y: number, z: number): void {
    this._spherical.radius = Math.sqrt(x * x + y * y + z * z);
    this._spherical.phi = Math.acos(y / Math.max(this._spherical.radius, 0.001));
    this._spherical.theta = Math.atan2(x, z);
    this._clampSpherical();
    this._updateCamera();
  }

  lookAt(x: number, y: number, z: number): void {
    this._target = { x, y, z };
    this._updateCamera();
  }

  zoom(delta: number): void {
    this._spherical.radius += delta * this._zoomSpeed;
    this._clampSpherical();
    this._updateCamera();
  }

  update(): void {
    this._updateCamera();
  }

  dispose(): void {
    this.detach();
  }

  private _handleMouseDown(e: MouseEvent): void {
    if (!this._enabled) return;
    this._isDragging = true;
    this._lastMouse.x = e.clientX;
    this._lastMouse.y = e.clientY;

    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      this._dragMode = 'pan';
    } else {
      this._dragMode = 'orbit';
    }
  }

  private _handleMouseMove(e: MouseEvent): void {
    if (!this._isDragging || !this._enabled) return;

    const dx = e.clientX - this._lastMouse.x;
    const dy = e.clientY - this._lastMouse.y;
    this._lastMouse.x = e.clientX;
    this._lastMouse.y = e.clientY;

    if (this._dragMode === 'orbit') {
      this._spherical.theta -= dx * this._rotateSpeed;
      this._spherical.phi -= dy * this._rotateSpeed;
      this._clampSpherical();
    } else {
      const panFactor = this._spherical.radius * 0.001 * this._panSpeed;
      this._target.x -= dx * panFactor;
      this._target.y += dy * panFactor;
    }

    this._updateCamera();
  }

  private _handleMouseUp(_e: MouseEvent): void {
    this._isDragging = false;
  }

  private _handleWheel(e: WheelEvent): void {
    if (!this._enabled) return;
    e.preventDefault();
    this._spherical.radius += e.deltaY * 0.01 * this._zoomSpeed;
    this._clampSpherical();
    this._updateCamera();
  }

  private _clampSpherical(): void {
    this._spherical.radius = Math.max(
      this._minDistance,
      Math.min(this._maxDistance, this._spherical.radius),
    );
    this._spherical.phi = Math.max(
      this._minPolarAngle,
      Math.min(this._maxPolarAngle, this._spherical.phi),
    );
  }

  private _updateCamera(): void {
    if (!this._camera) return;

    const sinPhi = Math.sin(this._spherical.phi);
    const cosPhi = Math.cos(this._spherical.phi);
    const sinTheta = Math.sin(this._spherical.theta);
    const cosTheta = Math.cos(this._spherical.theta);

    const x = this._target.x + this._spherical.radius * sinPhi * cosTheta;
    const y = this._target.y + this._spherical.radius * cosPhi;
    const z = this._target.z + this._spherical.radius * sinPhi * sinTheta;

    this._camera.position.set(x, y, z);
    this._camera.lookAt(this._target.x, this._target.y, this._target.z);
  }
}