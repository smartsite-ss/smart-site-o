// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseGraphic } from './BaseGraphic';
import { markRaw, toRaw } from 'vue';

export abstract class Three3dPlugin<TProps extends Record<string, any>> extends BaseGraphic {
  private _scene: any = null;
  private _camera: any = null;
  private _renderer: any = null;
  private _rendererTarget: HTMLCanvasElement | null = null;
  private _mountPoint: HTMLDivElement | null = null;
  private _animationId: number | null = null;
  private _clock: any = null;

  constructor(type: string, x: number = 0, y: number = 0, width: number = 400, height: number = 300) {
    super(type, x, y, width, height);
  }

  get pluginProps(): Readonly<TProps> {
    return (this.config.customProps || {}) as unknown as TProps;
  }

  setDefaultProps(props: TProps): void {
    this.config.customProps = { ...props } as any;
  }

  protected setPluginProps(partial: Partial<TProps>): void {
    if (!this.config.customProps) {
      this.config.customProps = {} as any;
    }
    const customProps = this.config.customProps as Record<string, any>;
    const keys = Object.keys(partial) as Array<keyof TProps>;
    const changes: Record<string, any> = {};
    for (const k of keys) {
      customProps[k as string] = partial[k];
      changes[k as string] = partial[k];
    }
    this.onPropertyChanged({ customProps: changes });
  }

  getSize(): { width: number; height: number } {
    const g = this.config.geometry;
    return { width: g.width, height: g.height };
  }

  updateGeometry(x: number, y: number, w: number, h: number): void {
    const g = this.config.geometry;
    g.x = Math.round(x);
    g.y = Math.round(y);
    g.width = Math.round(w);
    g.height = Math.round(h);
    if (this._renderer) {
      this._renderer.setSize(w, h);
    }
    if (this._camera) {
      this._camera.aspect = w / Math.max(h, 1);
      this._camera.updateProjectionMatrix();
    }
  }

  async mount(container: HTMLElement): Promise<void> {
    const THREE = await import('three');

    const g = this.config.geometry;
    this._mountPoint = document.createElement('div');
    this._mountPoint.className = 'ss-plugin-three3d';
    this._mountPoint.style.position = 'relative';
    this._mountPoint.style.width = '100%';
    this._mountPoint.style.height = '100%';

    this._scene = markRaw(new THREE.Scene());

    this._camera = markRaw(new THREE.PerspectiveCamera(45, g.width / Math.max(g.height, 1), 0.1, 1000));
    this._camera.position.set(5, 5, 10);
    this._camera.lookAt(0, 0, 0);

    const ambientLight = markRaw(new THREE.AmbientLight(0xffffff, 0.6));
    this._scene.add(ambientLight);
    const directionalLight = markRaw(new THREE.DirectionalLight(0xffffff, 0.8));
    directionalLight.position.set(5, 10, 5);
    this._scene.add(directionalLight);

    await this.loadScene(THREE, this._scene, this._camera);

    const unwrapScene = (obj: any) => {
      if (obj && obj.children) {
        for (let i = 0; i < obj.children.length; i++) {
          obj.children[i] = toRaw(obj.children[i]);
          unwrapScene(obj.children[i]);
        }
      }
    };
    const rawScene = toRaw(this._scene);
    if (rawScene) {
      unwrapScene(rawScene);
    }

    this._renderer = markRaw(new (THREE as any).WebGLRenderer({ alpha: true, antialias: true }));
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(g.width, g.height);
    this._rendererTarget = this._renderer.domElement;
    if (this._rendererTarget) {
      this._rendererTarget.style.display = 'block';
      this._rendererTarget.style.width = '100%';
      this._rendererTarget.style.height = '100%';
      this._mountPoint.appendChild(this._rendererTarget);
    }

    this._clock = markRaw(new (THREE as any).Clock());

    const loop = () => {
      if (!this._scene || !this._renderer || !this._camera) return;
      const dt = this._clock ? this._clock.getDelta() : 0;
      this.animate(dt);
      const scene = toRaw(this._scene);
      const camera = toRaw(this._camera);
      this._renderer.render(scene, camera);
      this._animationId = requestAnimationFrame(loop);
    };
    this._animationId = requestAnimationFrame(loop);

    container.appendChild(this._mountPoint);
  }

  unmount(): void {
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this._renderer) {
      this._renderer.dispose?.();
      this._renderer = null;
    }
    if (this._mountPoint && this._rendererTarget) {
      this._rendererTarget.remove();
    }
    if (this._mountPoint) {
      this._mountPoint.remove();
      this._mountPoint = null;
    }
    this._scene = null;
    this._camera = null;
    this._rendererTarget = null;
    this._clock = null;
  }

  update(properties: any): void {
    if (properties.config?.customProps) {
      super.update(properties);
      this.onPropertyChanged({ customProps: properties.config.customProps });
      return;
    }
    if (properties.customProps) {
      this.setPluginProps(properties.customProps);
      return;
    }
    this.setPluginProps(properties);
  }

  getDomElement(): HTMLElement | null {
    return this._mountPoint;
  }

  getScene(): any {
    return this._scene;
  }

  getCamera(): any {
    return this._camera;
  }

  draw(_context: CanvasRenderingContext2D): void {
    /* 3D 插件不使用 Canvas 2D 绘制，而是通过 Three.js 独立渲染 */
  }

  onMounted(): void {
    /* 3D 插件不使用动画引擎，留给子类按需覆盖 */
  }

  onUnmounted(): void {}
  onPropertyChanged(_changes: Record<string, any>): void {}
  onThemeChanged(_themeName: string): void {}

  animate(_dt: number): void {}

  abstract loadScene(THREE: any, scene: any, camera: any): Promise<void> | void;
}