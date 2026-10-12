// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, InferSchemaProps, buildDefaultsFromSchema, DrawContext } from '@scada-editor/plugin-sdk';
import { shapePropertySchema } from './shapePropertySchema';
import { i18n, getThemeColor, registerLocaleModules} from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';

const defaultShapeProps = {
  ...buildDefaultsFromSchema(shapePropertySchema),
  fillColor: getThemeColor('primary') + 'FF',
  borderColor: getThemeColor('primary') + 'FF',
};


@Graphic({
  type: 'shape',
  name: i18n.global.t('shape.label'),
  category: 'basic',
  version: pkg.version,
  primaryCategory: 'general',
  description: i18n.global.t('shape.description'),
  defaultProps: defaultShapeProps,
  defaultWidth: 100,
  defaultHeight: 100,
  features: { resizable: true, rotatable: true, cloneable: true, groupable: true, dataBindable: false },
})
export class ShapePlugin extends BasePlugin<InferSchemaProps<typeof shapePropertySchema>> {
  constructor(x = 0, y = 0, w = 100, h = 100) {
    super('shape', x, y, w, h);
    this.setDefaultProps({ ...defaultShapeProps });
  }

  onThemeChanged(_themeName: string): void {
    this.setPluginProps({
      fillColor: getThemeColor('primary') + 'FF',
      borderColor: getThemeColor('primary') + 'FF',
    } as any);
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    if (props.shadowColor !== '#00000000') {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowBlur = Number(props.shadowBlur);
      ctx.shadowOffsetX = Number(props.shadowOffsetX);
      ctx.shadowOffsetY = Number(props.shadowOffsetY);
    }

    ctx.fillStyle = props.fillColor;
    ctx.globalAlpha = Number(props.fillOpacity);
    ctx.strokeStyle = props.borderColor;
    ctx.lineWidth = Number(props.borderWidth);

    if (props.borderStyle === 'dashed') {
      ctx.setLineDash([5, 5]);
    } else if (props.borderStyle === 'dotted') {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }

    switch (props.shapeType) {
      case 'rectangle':
        this._drawRectangle(ctx, width, height, props);
        break;
      case 'rounded-rectangle':
        this._drawRoundedRectangle(ctx, width, height, props);
        break;
      case 'circle':
        this._drawCircle(ctx, width, height, props);
        break;
      case 'ellipse':
        this._drawEllipse(ctx, width, height, props);
        break;
      case 'triangle':
        this._drawTriangle(ctx, width, height, props);
        break;
      case 'diamond':
        this._drawDiamond(ctx, width, height, props);
        break;
      case 'polygon':
        this._drawPolygon(ctx, width, height, props);
        break;
      case 'arrow-up':
        this._drawArrow(ctx, width, height, props, 'up');
        break;
      case 'arrow-down':
        this._drawArrow(ctx, width, height, props, 'down');
        break;
      case 'arrow-left':
        this._drawArrow(ctx, width, height, props, 'left');
        break;
      case 'arrow-right':
        this._drawArrow(ctx, width, height, props, 'right');
        break;
      case 'line':
        this._drawLine(ctx, width, height);
        break;
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }

  private _drawRectangle(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, Number(props.borderRadius));
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawCircle(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    const radius = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawEllipse(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawTriangle(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.stroke();
  }

  private _drawRoundedRectangle(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    const r = Number(props.borderRadius) || Math.min(w, h) * 0.15;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawDiamond(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w / 2, h);
    ctx.lineTo(0, h / 2);
    ctx.closePath();
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawPolygon(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>): void {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const sides = 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const px = cx + rx * Math.cos(angle);
      const py = cy + ry * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }

  private _drawArrow(ctx: CanvasRenderingContext2D, w: number, h: number, props: InferSchemaProps<typeof shapePropertySchema>, direction: 'up' | 'down' | 'left' | 'right'): void {
    ctx.beginPath();
    switch (direction) {
      case 'up':
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h * 0.65);
        ctx.lineTo(w * 0.65, h * 0.65);
        ctx.lineTo(w * 0.65, h);
        ctx.lineTo(w * 0.35, h);
        ctx.lineTo(w * 0.35, h * 0.65);
        ctx.lineTo(0, h * 0.65);
        ctx.closePath();
        break;
      case 'down':
        ctx.moveTo(w / 2, h);
        ctx.lineTo(w, h * 0.35);
        ctx.lineTo(w * 0.65, h * 0.35);
        ctx.lineTo(w * 0.65, 0);
        ctx.lineTo(w * 0.35, 0);
        ctx.lineTo(w * 0.35, h * 0.35);
        ctx.lineTo(0, h * 0.35);
        ctx.closePath();
        break;
      case 'left':
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w * 0.65, h);
        ctx.lineTo(w * 0.65, h * 0.65);
        ctx.lineTo(w, h * 0.65);
        ctx.lineTo(w, h * 0.35);
        ctx.lineTo(w * 0.65, h * 0.35);
        ctx.lineTo(w * 0.65, 0);
        ctx.closePath();
        break;
      case 'right':
        ctx.moveTo(w, h / 2);
        ctx.lineTo(w * 0.35, h);
        ctx.lineTo(w * 0.35, h * 0.65);
        ctx.lineTo(0, h * 0.65);
        ctx.lineTo(0, h * 0.35);
        ctx.lineTo(w * 0.35, h * 0.35);
        ctx.lineTo(w * 0.35, 0);
        ctx.closePath();
        break;
    }
    ctx.fill();
    if (Number(props.borderWidth) > 0) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.stroke();
    }
  }
}