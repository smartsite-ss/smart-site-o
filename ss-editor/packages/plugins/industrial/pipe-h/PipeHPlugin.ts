// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext, ColorUtils, AnimationTimer } from '@scada-editor/plugin-sdk';
import { pipeHPropertySchema } from './pipeHPropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
const defaultPipeHProps = buildDefaultsFromSchema(pipeHPropertySchema);


@Graphic({
  type: 'pipe-h',
  name: i18n.global.t('pipeH.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('pipeH.description'),
  defaultProps: defaultPipeHProps,
  defaultWidth: 120,
  defaultHeight: 30,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class PipeHPlugin extends BasePlugin<InferSchemaProps<typeof pipeHPropertySchema>> {
  private flowOffset: number = 0;
  private _animTimer = new AnimationTimer();

  constructor(x = 0, y = 0, w = 120, h = 30) {
    super('pipe-h', x, y, w, h);
    this.setDefaultProps({ ...defaultPipeHProps });
  }

  onMounted(): void { this._animTimer.start(); }
  onUnmounted(): void { this._animTimer.stop(); }

  onPropertyChanged(changes: any): void {
    if (changes.customProps && 'status' in changes.customProps) {
      changes.customProps.status === 'flowing' ? this._animTimer.start() : this._animTimer.stop();
    }
  }

  onThemeChanged(themeName: string): void {
    if (themeName === 'dark') {
      this.setPluginProps({ pipeColor: '#6BA5B8' } as any);
    } else {
      this.setPluginProps({ pipeColor: defaultPipeHProps.pipeColor } as any);
    }
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx as CanvasRenderingContext2D;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (this._animTimer.active) {
      const dt = this._animTimer.tick();
      this.flowOffset = (this.flowOffset + dt * 60 * Number(props.flowSpeed)) % 60;
    }

    const pipeColor = props.status === 'flowing' ? props.flowingColor
      : props.status === 'blocked' ? props.blockedColor
      : props.stoppedColor;

    const thickness = height * (Number(props.pipeThickness) / 100);
    const pipeX = 0;
    const pipeY = (height - thickness) / 2;
    const pipeW = width;
    const pipeH = thickness;

    ctx.fillStyle = pipeColor;
    ctx.beginPath();
    ctx.roundRect(pipeX, pipeY, pipeW, pipeH, thickness * 0.3);
    ctx.fill();

    if (props.showFlange !== false) {
      const flangeW = 4;
      const flangeH = thickness * 1.4;
      ctx.fillStyle = ColorUtils.darkenColor(pipeColor, 0.15);
      ctx.beginPath();
      ctx.roundRect(0, pipeY - (flangeH - pipeH) / 2, flangeW, flangeH, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(width - flangeW, pipeY - (flangeH - pipeH) / 2, flangeW, flangeH, 2);
      ctx.fill();
    }

    if (props.status === 'flowing' && props.showFlowAnimation) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipeX, pipeY, pipeW, pipeH, thickness * 0.3);
      ctx.clip();

      const arrowCount = Math.ceil(width / 30);
      for (let i = 0; i < arrowCount; i++) {
        const basePos = ((i * width) / arrowCount + this.flowOffset) % width;
        const ax = basePos;
        const ay = pipeY + pipeH / 2;
        ctx.fillStyle = ColorUtils.hexToRgba('#FFFFFF', 0.6);
        ctx.beginPath();
        ctx.moveTo(ax, ay - 4);
        ctx.lineTo(ax + 8, ay);
        ctx.lineTo(ax, ay + 4);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}