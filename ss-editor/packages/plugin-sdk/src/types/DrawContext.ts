// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ColorUtils } from './ColorUtils';
import type { Rect } from './Rect';

export interface PipeOptions {
  color: string;
  flangeWidth?: number;
  flangeColor?: string;
  orientation?: 'horizontal' | 'vertical';
  radius?: number;
}

export interface FlangeOptions {
  color: string;
  boltCount?: number;
  boltColor?: string;
  innerRadius?: number;
}

export interface MetallicOptions {
  baseColor: string;
  direction?: 'vertical' | 'horizontal';
  stops?: Array<{ offset: number; lightenPercent: number }>;
  radius?: number;
  highlight?: { side: 'left' | 'top' | 'right' | 'bottom' };
}

export interface StatusLightOptions {
  color: string;
  glowing?: boolean;
  glowIntensity?: number;
  borderColor?: string;
}

export interface GaugeArcOptions {
  color: string;
  trackColor?: string;
  lineWidth?: number;
}

export interface NeedleOptions {
  color: string;
  width?: number;
  capRadius?: number;
  capColor?: string;
}

export interface ValveBodyOptions {
  baseColor: string;
  stemColor?: string;
  opening?: number;
  valveType?: 'butterfly' | 'gate';
}

export interface TankBodyOptions {
  baseColor: string;
  liquidColor?: string;
  liquidPercent?: number;
  rimColor?: string;
  showTicks?: boolean;
  tickCount?: number;
  ticksColor?: string;
}

export interface IndicatorRectOptions {
  color: string;
  status?: string;
  opacity?: number;
  radius?: number;
}

export interface TextOptions {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
}

export interface DrawPipePathOptions {
  points: { x: number; y: number }[];
  thickness: number;
  color: string;
  bendRadius?: number;
  jointStyle?: 'round' | 'miter' | 'bevel';
  endStyle?: 'flange' | 'butt' | 'none';
}

export class DrawContext {
  ctx: CanvasRenderingContext2D;
  bounds: Rect;
  isDark: boolean;

  constructor(ctx: CanvasRenderingContext2D, bounds: Rect, isDark: boolean = false) {
    this.ctx = ctx;
    this.bounds = bounds;
    this.isDark = isDark;
  }

  save(): void {
    this.ctx.save();
  }
  restore(): void {
    this.ctx.restore();
  }
  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
  }
  rotate(angle: number): void {
    this.ctx.rotate(angle);
  }
  scale(sx: number, sy: number): void {
    this.ctx.scale(sx, sy);
  }

  fillRoundedRect(rect: Rect, radius: number, color: string): void {
    if (color === 'transparent' || color === '#00000000') return;
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fill();
  }

  strokeRoundedRect(rect: Rect, radius: number, color: string, lineWidth: number): void {
    if (lineWidth <= 0) return;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.stroke();
  }

  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    const { ctx } = this;
    const {
      align = 'center',
      baseline = 'middle',
      color = this.isDark ? '#FFFFFF' : '#333333',
      fontSize = 12,
      fontWeight = 'normal',
      fontFamily = 'Arial',
    } = options;
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  drawPipe(rect: Rect, options: PipeOptions): void {
    const { ctx } = this;
    const { color, flangeWidth = 4, flangeColor, orientation = 'horizontal', radius = 2 } = options;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fill();

    if (flangeWidth > 0) {
      const fc = flangeColor || ColorUtils.darkenColor(color, 0.15);
      ctx.fillStyle = fc;
      if (orientation === 'horizontal') {
        ctx.fillRect(rect.x, rect.y, flangeWidth, rect.height);
        ctx.fillRect(rect.x + rect.width - flangeWidth, rect.y, flangeWidth, rect.height);
      } else {
        ctx.fillRect(rect.x, rect.y, rect.width, flangeWidth);
        ctx.fillRect(rect.x, rect.y + rect.height - flangeWidth, rect.width, flangeWidth);
      }
    }
  }

  drawFlange(cx: number, cy: number, radius: number, options: FlangeOptions): void {
    const { ctx } = this;
    const { color, boltCount = 4, boltColor, innerRadius = radius * 0.6 } = options;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    if (innerRadius > 0) {
      ctx.fillStyle = ColorUtils.darkenColor(color, 0.2);
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const bc = boltColor || ColorUtils.darkenColor(color, 0.3);
    const boltR = 2;
    for (let i = 0; i < boltCount; i++) {
      const angle = (Math.PI * 2 * i) / boltCount;
      const bx = cx + Math.cos(angle) * (radius * 0.78);
      const by = cy + Math.sin(angle) * (radius * 0.78);
      ctx.fillStyle = bc;
      ctx.beginPath();
      ctx.arc(bx, by, boltR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMetallicRect(rect: Rect, options: MetallicOptions): void {
    const { ctx } = this;
    const { baseColor, direction = 'vertical', stops, radius = 0 } = options;

    const isHorizontal = direction === 'horizontal';
    const endX = rect.x + rect.width;
    const endY = rect.y + rect.height;

    let grad: CanvasGradient;
    if (isHorizontal) {
      grad = ctx.createLinearGradient(rect.x, 0, endX, 0);
    } else {
      grad = ctx.createLinearGradient(0, rect.y, 0, endY);
    }

    if (stops && stops.length > 0) {
      for (const stop of stops) {
        const factor = this.isDark ? 1 - stop.lightenPercent : stop.lightenPercent;
        grad.addColorStop(stop.offset, ColorUtils.lightenColor(baseColor, factor > 0 ? factor / Math.PI : factor));
      }
    } else {
      grad.addColorStop(0, ColorUtils.lightenColor(baseColor, 0.3));
      grad.addColorStop(0.5, baseColor);
      grad.addColorStop(1, ColorUtils.darkenColor(baseColor, 0.2));
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (radius > 0) {
      ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    } else {
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
    }
    ctx.fill();

    if (options.highlight) {
      const hx =
        options.highlight.side === 'left'
          ? rect.x + 2
          : options.highlight.side === 'right'
            ? rect.x + rect.width - 8
            : rect.x + 4;
      const hy =
        options.highlight.side === 'left'
          ? rect.y + 4
          : options.highlight.side === 'right'
            ? rect.y + 4
            : options.highlight.side === 'top'
              ? rect.y + 2
              : rect.y + rect.height - 8;
      const hw =
        options.highlight.side === 'left' || options.highlight.side === 'right' ? 6 : rect.width - 8;
      const hh =
        options.highlight.side === 'top' || options.highlight.side === 'bottom' ? 4 : rect.height - 8;

      ctx.fillStyle = ColorUtils.lightenColor(baseColor, this.isDark ? -0.1 : 0.2);
      ctx.beginPath();
      ctx.roundRect(hx, hy, hw, hh, 2);
      ctx.fill();
    }
  }

  drawStatusLight(cx: number, cy: number, radius: number, options: StatusLightOptions): void {
    const { ctx } = this;
    const { color, glowing = false, glowIntensity = 0.4, borderColor } = options;

    if (glowing && glowIntensity > 0) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = radius * 4 * glowIntensity;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawGaugeArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    options: GaugeArcOptions,
  ): void {
    const { ctx } = this;
    const { color, trackColor, lineWidth = 8 } = options;

    if (trackColor) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  drawNeedle(cx: number, cy: number, length: number, angle: number, options: NeedleOptions): void {
    const { ctx } = this;
    const { color, width = 2, capRadius = 4, capColor } = options;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, capRadius, 0, Math.PI * 2);
    ctx.fillStyle = capColor || color;
    ctx.fill();

    ctx.restore();
  }

  drawValveBody(rect: Rect, options: ValveBodyOptions): void {
    const { baseColor, stemColor = '#BDC3C7', opening = 0, valveType = 'butterfly' } = options;
    const { ctx } = this;
    const { x, y, width, height } = rect;

    this.drawMetallicRect({ x, y, width, height }, {
      baseColor,
      radius: 4,
      highlight: { side: 'left' },
      stops: [
        { offset: 0, lightenPercent: 0.25 },
        { offset: 0.5, lightenPercent: 0 },
        { offset: 1, lightenPercent: -0.15 },
      ],
    });

    ctx.strokeStyle = ColorUtils.darkenColor(baseColor, 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 3);
    ctx.stroke();

    if (valveType === 'butterfly' && opening > 0) {
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((opening * Math.PI) / 180);
      ctx.fillStyle = ColorUtils.lightenColor(stemColor || '#BDC3C7', 0.15);
      ctx.fillRect(-width * 0.4, -height * 0.04, width * 0.8, height * 0.08);
      ctx.restore();
    }

    const stemW = 6;
    ctx.fillStyle = stemColor || '#BDC3C7';
    ctx.fillRect(x + width / 2 - stemW / 2, y + height * 0.2, stemW, height * 0.6);
  }

  drawTankBody(rect: Rect, options: TankBodyOptions): void {
    const {
      baseColor,
      liquidColor,
      liquidPercent = 0,
      rimColor = '#34495E',
      showTicks = false,
      tickCount = 5,
      ticksColor,
    } = options;
    const { ctx } = this;
    const { x, y, width, height } = rect;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();

    if (liquidPercent > 0 && liquidColor) {
      const liquidHeight = height * (liquidPercent / 100);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y + height - liquidHeight, width, liquidHeight, 6);
      ctx.clip();

      const grad = ctx.createLinearGradient(0, y + height - liquidHeight, 0, y + height);
      grad.addColorStop(0, ColorUtils.lightenColor(liquidColor, 0.15));
      grad.addColorStop(1, liquidColor);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + height - liquidHeight, width, liquidHeight);
      ctx.restore();
    }

    if (rimColor) {
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, width - 2, height - 2, 5);
      ctx.stroke();
    }

    if (showTicks && tickCount > 0) {
      const tc = ticksColor || rimColor;
      for (let i = 1; i <= tickCount; i++) {
        const ty = y + height - (height * i) / (tickCount + 1);
        ctx.beginPath();
        ctx.moveTo(x + 6, ty);
        ctx.lineTo(x + 20, ty);
        ctx.strokeStyle = tc;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  drawIndicatorRect(rect: Rect, options: IndicatorRectOptions): void {
    const { color, opacity = 1, radius = 4 } = options;
    const { ctx } = this;

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fill();

    ctx.globalAlpha = opacity * 0.8;
    const highlightGrad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height * 0.5);
    highlightGrad.addColorStop(0, ColorUtils.hexToRgba('#FFFFFF', 0.3));
    highlightGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.roundRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height * 0.4, radius);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  drawPipePath(options: DrawPipePathOptions): void {
    const { ctx } = this;
    const { points, thickness, color, bendRadius = 6, jointStyle = 'round', endStyle = 'flange' } = options;
    if (points.length < 2) return;

    ctx.save();
    ctx.fillStyle = color;

    for (let i = 0; i < points.length - 1; i++) {
      const A = points[i];
      const B = points[i + 1];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(A.x, A.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.rect(0, -thickness / 2, length, thickness);
      ctx.fill();
      ctx.restore();

      if (i < points.length - 2 && bendRadius > 0 && jointStyle === 'round') {
        const C = points[i + 2];
        const angleAB = Math.atan2(B.y - A.y, B.x - A.x);
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const r = Math.min(bendRadius, thickness * 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(B.x - Math.cos(angleAB) * r, B.y - Math.sin(angleAB) * r);
        ctx.arcTo(B.x, B.y, B.x + Math.cos(angleBC) * r, B.y + Math.sin(angleBC) * r, r);
        ctx.fill();
      }
    }

    if (endStyle === 'flange') {
      for (let i = 0; i < points.length; i++) {
        if (i > 0 && i < points.length - 1) continue;
        const p = points[i];
        const neighbor = i === 0 ? points[1] : points[points.length - 2];
        const angle =
          i === 0
            ? Math.atan2(neighbor.y - p.y, neighbor.x - p.x)
            : Math.atan2(p.y - neighbor.y, p.x - neighbor.x);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.fillStyle = ColorUtils.darkenColor(color, 0.15);
        ctx.beginPath();
        ctx.rect(-thickness * 0.3, -thickness * 0.7, thickness * 0.6, thickness * 1.4);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}