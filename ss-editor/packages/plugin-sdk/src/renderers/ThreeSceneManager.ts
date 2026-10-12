// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ThreeSceneManagerOptions {
  alpha?: boolean;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
}

export interface ThreeSceneEntry {
  scene: any;
  camera: any;
  animate?: (dt: number) => void;
}

export class ThreeSceneManager {
  private static _instance: ThreeSceneManager | null = null;

  private _THREE: any = null;
  private _renderer: any = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _animationId: number | null = null;
  private _running = false;
  private _sceneEntries = new Map<string, ThreeSceneEntry>();
  private _clock: any = null;

  private _width = 800;
  private _height = 600;

  static getInstance(): ThreeSceneManager {
    if (!this._instance) {
      this._instance = new ThreeSceneManager();
    }
    return this._instance;
  }

  static reset(): void {
    if (this._instance) {
      this._instance.destroy();
      this._instance = null;
    }
  }

  get isInitialized(): boolean {
    return this._THREE !== null && this._renderer !== null;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get renderer(): any {
    return this._renderer;
  }

  get THREE(): any {
    return this._THREE;
  }

  async init(container: HTMLElement, options: ThreeSceneManagerOptions = {}): Promise<void> {
    if (this.isInitialized) return;

    this._THREE = await import('three');

    const {
      alpha = true,
      antialias = true,
      preserveDrawingBuffer = false,
    } = options;

    this._width = container.clientWidth || this._width;
    this._height = container.clientHeight || this._height;

    this._renderer = new this._THREE.WebGLRenderer({
      alpha,
      antialias,
      preserveDrawingBuffer,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(this._width, this._height);
    this._renderer.setClearColor(0x1a1a2e, 1);

    this._canvas = this._renderer.domElement;
    if (this._canvas) {
      this._canvas.style.display = 'block';
      this._canvas.style.position = 'absolute';
      this._canvas.style.top = '0';
      this._canvas.style.left = '0';
      container.appendChild(this._canvas);
    }

    this._clock = new this._THREE.Clock();

    this._startLoop();
  }

  registerScene(id: string, entry: ThreeSceneEntry): void {
    if (!this.isInitialized) {
      console.warn(`[ThreeSceneManager] Not initialized, cannot register scene "${id}"`);
      return;
    }
    this._sceneEntries.set(id, entry);
  }

  unregisterScene(id: string): void {
    this._sceneEntries.delete(id);
  }

  resize(width: number, height: number): void {
    if (!this._renderer) return;
    this._width = width;
    this._height = height;
    this._renderer.setSize(width, height);

    for (const [, entry] of this._sceneEntries) {
      if (entry.camera && entry.camera.aspect !== undefined) {
        entry.camera.aspect = width / Math.max(height, 1);
        entry.camera.updateProjectionMatrix();
      }
    }
  }

  destroy(): void {
    this._running = false;
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this._canvas && this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
    if (this._renderer) {
      this._renderer.dispose?.();
    }
    this._sceneEntries.clear();
    this._renderer = null;
    this._THREE = null;
    this._canvas = null;
    this._clock = null;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  private _startLoop(): void {
    this._running = true;
    const loop = () => {
      if (!this._running) return;

      const dt = this._clock ? this._clock.getDelta() : 0;

      for (const [, entry] of this._sceneEntries) {
        if (entry.animate) {
          entry.animate(dt);
        }
        if (entry.scene && entry.camera && this._renderer) {
          this._renderer.render(entry.scene, entry.camera);
        }
      }

      this._animationId = requestAnimationFrame(loop);
    };
    this._animationId = requestAnimationFrame(loop);
  }
}