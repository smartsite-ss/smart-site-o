// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Three3dPlugin, Graphic } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
interface GaugeProps {
  value: number;
  min: number;
  max: number;
  gaugeColor: string;
  warningColor: string;
  dangerColor: string;
  warningThreshold: number;
  dangerThreshold: number;
  showTicks: boolean;
  showLabels: boolean;
  needleColor: string;
  backgroundColor: string;
  rimColor: string;
}

const defaults: GaugeProps = {
  value: 50,
  min: 0,
  max: 100,
  gaugeColor: '#4CAF50',
  warningColor: '#FF9800',
  dangerColor: '#F44336',
  warningThreshold: 70,
  dangerThreshold: 90,
  showTicks: true,
  showLabels: true,
  needleColor: '#E53935',
  backgroundColor: '#1a1a2e',
  rimColor: '#555555',
};


@Graphic({
  type: 'three-gauge',
  name: i18n.global.t('three-gauge.label'),
  category: '3d',
  primaryCategory: '3d',
  description: i18n.global.t('three-gauge.description'),
  defaultProps: { ...defaults },
  defaultWidth: 400,
  defaultHeight: 400,
  minWidth: 200,
  minHeight: 200,
})
export class ThreeGaugePlugin extends Three3dPlugin<GaugeProps> {
  private _needle: any = null;
  private _colorArc: any = null;

  constructor(x = 0, y = 0, w = 400, h = 400) {
    super('three-gauge', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }

  async loadScene(THREE: any, scene: any, _camera: any): Promise<void> {
    const {
      gaugeColor, warningColor: _warningColor, dangerColor: _dangerColor,
      warningThreshold: _warningThreshold, dangerThreshold: _dangerThreshold,
      showTicks, showLabels: _showLabels,
      needleColor, backgroundColor, rimColor,
    } = this.pluginProps;

    const radius = 2;
    const tube = 0.12;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube + 0.05, 16, 64),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(rimColor), metalness: 0.6, roughness: 0.3 }),
    );
    rim.rotation.x = -Math.PI / 2;
    scene.add(rim);

    const _startAngle = Math.PI;
    const totalAngle = Math.PI;

    const gaugeArc = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 16, 32, 4, Math.PI),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(gaugeColor), metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide }),
    );
    gaugeArc.rotation.x = -Math.PI / 2;
    gaugeArc.rotation.z = -Math.PI / 2;
    scene.add(gaugeArc);

    const bgPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.3, radius + 0.3, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(backgroundColor), metalness: 0.3, roughness: 0.7 }),
    );
    bgPlatform.position.y = -0.05;
    scene.add(bgPlatform);

    if (showTicks) {
      for (let i = 0; i <= 10; i++) {
        const angle = Math.PI + (totalAngle * i) / 10;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);

        const tickHeight = i % 5 === 0 ? 0.3 : 0.15;
        const tick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, tickHeight, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5 }),
        );
        tick.position.set(x, tickHeight / 2, z);
        scene.add(tick);
      }
    }

    this._needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, radius * 0.75),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(needleColor), metalness: 0.3, roughness: 0.4 }),
    );
    this._needle.position.set(0, 0.08, -radius * 0.38);
    scene.add(this._needle);

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.3 }),
    );
    centerCap.position.y = 0.05;
    scene.add(centerCap);

    this._updateNeedleRotation();
  }

  onPropertyChanged(_changes: Record<string, any>): void {
    this._updateNeedleRotation();
  }

  animate(_dt: number): void {}

  private _updateNeedleRotation(): void {
    if (!this._needle) return;

    const { value, min, max } = this.pluginProps;
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    this._needle.rotation.y = Math.PI * (1 - ratio);
  }
}