// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Three3dPlugin, Graphic } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
interface CubeProps {
  cubeColor: string;
  cubeSize: number;
  rotationSpeed: number;
  showGrid: boolean;
  showAxes: boolean;
}

const defaults: CubeProps = {
  cubeColor: '#4A90A4',
  cubeSize: 2,
  rotationSpeed: 0.5,
  showGrid: true,
  showAxes: false,
};


@Graphic({
  type: 'three-cube',
  name: i18n.global.t('three-cube.label'),
  category: '3d',
  primaryCategory: '3d',
  description: i18n.global.t('three-cube.description'),
  defaultProps: { ...defaults },
  defaultWidth: 400,
  defaultHeight: 300,
  minWidth: 200,
  minHeight: 150,
})
export class ThreeCubePlugin extends Three3dPlugin<CubeProps> {
  private _cube: any = null;
  private _material: any = null;
  private _gridHelper: any = null;
  private _axesHelper: any = null;
  private _THREE: any = null;

  constructor(x = 0, y = 0, w = 400, h = 300) {
    super('three-cube', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }

  async loadScene(THREE: any, scene: any, _camera: any): Promise<void> {
    this._THREE = THREE;
    const { cubeColor, cubeSize, showGrid, showAxes } = this.pluginProps;

    this._material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cubeColor),
      metalness: 0.1,
      roughness: 0.5,
    });
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    this._cube = new THREE.Mesh(geometry, this._material);
    scene.add(this._cube);

    this._gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    this._gridHelper.visible = showGrid;
    scene.add(this._gridHelper);

    this._axesHelper = new THREE.AxesHelper(5);
    this._axesHelper.visible = showAxes;
    scene.add(this._axesHelper);
  }

  onPropertyChanged(changes: Record<string, any>): void {
    const THREE = this._THREE;
    if (!THREE) return;

    const customChanges: Record<string, any> = changes.customProps || {};
    const props = this.pluginProps;

    if ('cubeColor' in customChanges && this._material) {
      this._material.color.set(props.cubeColor);
    }

    if ('cubeSize' in customChanges && this._cube) {
      this._cube.geometry.dispose();
      this._cube.geometry = new THREE.BoxGeometry(props.cubeSize, props.cubeSize, props.cubeSize);
    }

    if ('showGrid' in customChanges && this._gridHelper) {
      this._gridHelper.visible = props.showGrid;
    }

    if ('showAxes' in customChanges && this._axesHelper) {
      this._axesHelper.visible = props.showAxes;
    }
  }

  animate(dt: number): void {
    if (this._cube && this.pluginProps.rotationSpeed > 0) {
      this._cube.rotation.x += dt * this.pluginProps.rotationSpeed;
      this._cube.rotation.y += dt * this.pluginProps.rotationSpeed * 0.7;
    }
  }
}