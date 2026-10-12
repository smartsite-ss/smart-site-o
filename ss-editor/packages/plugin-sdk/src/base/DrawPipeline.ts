// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { BaseGraphic } from './BaseGraphic';

interface AnimationTransform {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  rotate: number;
  clipRect?: { x: number; y: number; width: number; height: number };
}

export class DrawPipeline {
  

  static begin(ctx: CanvasRenderingContext2D, graphic: BaseGraphic): boolean {
    if (!graphic.getVisible()) return false;
    ctx.save();
    const { x, y } = graphic.getPosition();
    const { width, height } = graphic.getSize();
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const animEngine = graphic.pageContext?.animationEngine;
    const transform: AnimationTransform | null =
      animEngine?.getTransform(graphic.id, width, height) ?? null;

    if (transform) {
      ctx.globalAlpha = transform.opacity;
      ctx.translate(centerX, centerY);
      if (transform.skewX) ctx.transform(1, 0, Math.tan(transform.skewX), 1, 0, 0);
      ctx.scale(transform.scaleX, transform.scaleY);
      ctx.rotate(transform.rotate);
      ctx.translate(-centerX, -centerY);
      ctx.translate(transform.translateX, transform.translateY);
    } else {
      ctx.translate(centerX, centerY);
    }

    ctx.rotate((graphic.getRotation() * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    if (transform?.clipRect) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        transform.clipRect.x,
        transform.clipRect.y,
        transform.clipRect.width,
        transform.clipRect.height,
      );
      ctx.clip();
    }

    return true;
  }

  static end(ctx: CanvasRenderingContext2D, graphic: BaseGraphic): void {
    const animEngine = graphic.pageContext?.animationEngine;
    const transform: AnimationTransform | null =
      animEngine?.getTransform(graphic.id, 0, 0) ?? null;
    if (transform?.clipRect) ctx.restore();
    ctx.restore();
  }

  static fillRoundedRect(ctx: CanvasRenderingContext2D, color: string, w: number, h: number, radius: number): void {
    if (color === 'transparent' || color === '#00000000') return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.fill();
  }

  static strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    color: string,
    width: number,
    w: number,
    h: number,
    radius: number,
    style: 'solid' | 'dashed' | 'dotted' = 'solid',
  ): void {
    if (width <= 0 || color === 'transparent' || color === '#00000000') return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (style === 'dashed') ctx.setLineDash([5, 5]);
    else if (style === 'dotted') ctx.setLineDash([2, 2]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  static applyShadow(
    ctx: CanvasRenderingContext2D,
    color: string,
    blur: number,
    offsetX: number,
    offsetY: number,
  ): void {
    if (blur <= 0) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
  }

  static drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    font: string,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline,
    x: number,
    y: number,
  ): void {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  static drawMultilineText(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    fontSize: number,
    fontWeight: string,
    fontStyle: string,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline,
    w: number,
    lineHeight: number,
    maxLines: number,
    offsetX: number,
  ): void {
    const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.font = fontStr;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    const words = text.split(' ');
    let line = '';
    let yOffset = fontSize * lineHeight;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > w - 20 && i > 0) {
        ctx.fillText(line, offsetX, yOffset);
        line = words[i] + ' ';
        yOffset += fontSize * lineHeight;
        if (maxLines > 0 && Math.floor(yOffset / (fontSize * lineHeight)) > maxLines) {
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, offsetX, yOffset);
  }

  static fontString(fontSize: number, fontWeight: string, fontStyle?: string, fontFamily?: string): string {
    const style = fontStyle ? `${fontStyle} ` : '';
    const weight = fontWeight === 'bold' ? 'bold ' : fontWeight === 'normal' ? '' : `${fontWeight} `;
    return `${style}${weight}${fontSize}px ${fontFamily || 'Arial'}`;
  }
}