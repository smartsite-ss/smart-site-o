// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ThreeSceneManager } from './ThreeSceneManager';
import { CameraController, type CameraControllerOptions } from './CameraController';
import { I18nProvider } from '../utils/I18nProvider';

export interface ThreeStagePluginOptions {
  width?: number;
  height?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  cameraFov?: number;
  cameraNear?: number;
  cameraFar?: number;
  backgroundColor?: number | string;
  cameraController?: CameraControllerOptions;
}

export class ThreeStagePlugin {
  readonly type = 'three-stage';
  get meta() {
    return {
      label: I18nProvider.t('__system__', 'threeStage.label'),
      category: '3d',
      description: I18nProvider.t('__system__', 'threeStage.description'),
    };
  }

  private _props: Record<string, any> = {};
  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;

  private _mountPoint: HTMLDivElement | null = null;
  private _scene: any = null;
  private _camera: any = null;
  private _cameraController: CameraController | null = null;
  private _sceneId: string;

  private _options: ThreeStagePluginOptions;

  constructor(x = 0, y = 0, width = 800, height = 600, options: ThreeStagePluginOptions = {}) {
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    this._options = options;
    this._sceneId = `three-stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  get pluginProps(): Readonly<Record<string, any>> {
    return this._props;
  }

  get scene(): any {
    return this._scene;
  }

  get camera(): any {
    return this._camera;
  }

  get cameraController(): CameraController | null {
    return this._cameraController;
  }

  getDomElement(): HTMLElement | null {
    return this._mountPoint;
  }

  getPosition(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  getSize(): { width: number; height: number } {
    return { width: this._width, height: this._height };
  }

  async mount(container: HTMLElement): Promise<void> {
    const THREE = await import('three');

    this._mountPoint = document.createElement('div');
    this._mountPoint.className = 'ss-plugin-three-stage';
    this._mountPoint.style.position = 'absolute';
    this._mountPoint.style.left = `${this._x}px`;
    this._mountPoint.style.top = `${this._y}px`;
    this._mountPoint.style.width = `${this._width}px`;
    this._mountPoint.style.height = `${this._height}px`;

    const {
      cameraPosition = { x: 5, y: 8, z: 10 },
      cameraTarget = { x: 0, y: 0, z: 0 },
      cameraFov = 45,
      cameraNear = 0.1,
      cameraFar = 1000,
      backgroundColor = 0x1a1a2e,
      cameraController: ccOptions,
    } = this._options;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(backgroundColor as any);

    this._camera = new THREE.PerspectiveCamera(
      cameraFov,
      this._width / Math.max(this._height, 1),
      cameraNear,
      cameraFar,
    );
    this._camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    this._camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this._scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this._scene.add(directionalLight);

    this._scene.add(new THREE.AxesHelper(5));

    await this.loadScene(THREE, this._scene, this._camera);

    this._cameraController = new CameraController(this._camera, ccOptions);
    this._cameraController.setTarget(cameraTarget.x, cameraTarget.y, cameraTarget.z);

    const manager = ThreeSceneManager.getInstance();
    if (!manager.isInitialized) {
      await manager.init(this._mountPoint, {
        alpha: true,
        antialias: true,
      });
      manager.resize(this._width, this._height);
    }

    manager.registerScene(this._sceneId, {
      scene: this._scene,
      camera: this._camera,
      animate: (dt: number) => this.animate(dt),
    });

    const canvas = manager.getCanvas();
    if (canvas) {
      canvas.style.width = `${this._width}px`;
      canvas.style.height = `${this._height}px`;
      this._cameraController.attach(canvas);
    }

    container.appendChild(this._mountPoint);
    this.onMounted();
  }

  unmount(): void {
    const manager = ThreeSceneManager.getInstance();
    manager.unregisterScene(this._sceneId);

    if (this._cameraController) {
      this._cameraController.dispose();
      this._cameraController = null;
    }

    if (this._mountPoint) {
      this._mountPoint.remove();
      this._mountPoint = null;
    }

    this._scene = null;
    this._camera = null;

    this.onUnmounted();
  }

  update(props: Partial<Record<string, any>>): void {
    Object.assign(this._props, props);
  }

  updateGeometry(x: number, y: number, w: number, h: number): void {
    this._x = x;
    this._y = y;
    this._width = w;
    this._height = h;

    if (this._mountPoint) {
      this._mountPoint.style.left = `${x}px`;
      this._mountPoint.style.top = `${y}px`;
      this._mountPoint.style.width = `${w}px`;
      this._mountPoint.style.height = `${h}px`;
    }

    if (this._camera) {
      this._camera.aspect = w / Math.max(h, 1);
      this._camera.updateProjectionMatrix();
    }

    const manager = ThreeSceneManager.getInstance();
    manager.resize(w, h);
  }

  onMounted(): void {}
  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}
  onThemeChanged(_themeName: string): void {}

  animate(_dt: number): void {}

  async loadScene(_THREE: any, _scene: any, _camera: any): Promise<void> {}
}