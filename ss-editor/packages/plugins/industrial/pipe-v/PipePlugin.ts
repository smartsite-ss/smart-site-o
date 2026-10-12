// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext, ColorUtils, AnimationTimer } from '@scada-editor/plugin-sdk';
import { pipePropertySchema } from './pipePropertySchema';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
const defaultPipeProps = buildDefaultsFromSchema(pipePropertySchema);


@Graphic({
  type: 'pipe-v',
  name: i18n.global.t('pipe-v.label'),
  category: 'industrial',
  primaryCategory: 'industrial',
  description: i18n.global.t('pipe-v.description'),
  defaultProps: defaultPipeProps,
  defaultWidth: 120,
  defaultHeight: 20,
  features: { resizable: true, rotatable: false, cloneable: true, groupable: true, dataBindable: true },
})
export class PipePlugin extends BasePlugin<InferSchemaProps<typeof pipePropertySchema>> {
  private flowOffset: number = 0;
  private _animTimer = new AnimationTimer();

  constructor(x = 0, y = 0, w = 120, h = 20) {
    super('pipe-v', x, y, w, h);
    this.setDefaultProps({ ...defaultPipeProps });
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
      this.setPluginProps({ pipeColor: defaultPipeProps.pipeColor } as any);
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

    const thickness = width * (Number(props.pipeThickness) / 100);
    const pipeX = (width - thickness) / 2;
    const pipeY = 0;
    const pipeW = thickness;
    const pipeH = height;

    ctx.fillStyle = pipeColor;
    ctx.beginPath();
    ctx.roundRect(pipeX, pipeY, pipeW, pipeH, thickness * 0.3);
    ctx.fill();

    if ((props.showFlange as unknown as boolean) !== false) {
      const flangeW = thickness * 1.4;
      const flangeH = 4;
      ctx.fillStyle = ColorUtils.darkenColor(pipeColor, 0.15);
      ctx.beginPath();
      ctx.roundRect(pipeX - (flangeW - pipeW) / 2, 0, flangeW, flangeH, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(pipeX - (flangeW - pipeW) / 2, height - flangeH, flangeW, flangeH, 2);
      ctx.fill();
    }

    if (props.status === 'flowing' && props.showFlowAnimation) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipeX, pipeY, pipeW, pipeH, thickness * 0.3);
      ctx.clip();

      const arrowCount = Math.ceil(height / 30);
      for (let i = 0; i < arrowCount; i++) {
        const basePos = ((i * height) / arrowCount + this.flowOffset) % height;
        const ax = pipeX + pipeW / 2;
        const ay = basePos;
        ctx.fillStyle = ColorUtils.hexToRgba('#FFFFFF', 0.6);
        ctx.beginPath();
        ctx.moveTo(ax - 4, ay);
        ctx.lineTo(ax + 4, ay);
        ctx.lineTo(ax, ay + 8);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}