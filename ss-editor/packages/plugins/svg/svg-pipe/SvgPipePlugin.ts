// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, buildDefaultsFromSchema, DrawContext, AnimationTimer } from '@scada-editor/plugin-sdk';
import { svgPipePropertySchema } from './svgPipePropertySchema';
import { parseSvgPath, renderPathCommands } from './SvgPathParser';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
export interface SvgPipePoint {
  x: number;
  y: number;
}

export interface SvgPipeConfig {
  status: 'flowing' | 'stopped' | 'blocked';
  flowDirection: 'forward' | 'backward' | 'bidirectional';
  strokeColor: string;
  flowingColor: string;
  stoppedColor: string;
  blockedColor: string;
  strokeWidth: number;
  strokeLinecap: 'butt' | 'round' | 'square';
  strokeLinejoin: 'miter' | 'round' | 'bevel';
  strokeDasharray: string;
  gradientType: 'none' | 'linear' | 'radial';
  gradientStartColor: string;
  gradientEndColor: string;
  filterShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  showFlowAnimation: boolean;
  flowSpeed: number;
  arrowSpacing: number;
  arrowSize: number;
  arrowStyle: 'triangle' | 'rectangle' | 'square';
  points: SvgPipePoint[];
  pathData: string;
}

const defaultSvgPipeProps = buildDefaultsFromSchema(svgPipePropertySchema);

const DEFAULT_POINTS: SvgPipePoint[] = [
  { x: 0, y: 30 },
  { x: 100, y: 30 },
  { x: 200, y: 30 },
];

function pointsToPathData(points: SvgPipePoint[]): string {
  if (points.length === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${Math.round(points[0].x)} ${Math.round(points[0].y)}`);
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${Math.round(points[i].x)} ${Math.round(points[i].y)}`);
  }
  return parts.join(' ');
}

function computePathLength(points: SvgPipePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function pointAtDistance(points: SvgPipePoint[], distance: number): { x: number; y: number; segIndex: number } | null {
  if (points.length < 2) return null;
  let remaining = distance;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (remaining <= segLen) {
      const t = segLen > 0 ? remaining / segLen : 0;
      return {
        x: points[i - 1].x + dx * t,
        y: points[i - 1].y + dy * t,
        segIndex: i - 1,
      };
    }
    remaining -= segLen;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y, segIndex: points.length - 2 };
}

function getSegmentAngle(points: SvgPipePoint[], segIndex: number): number {
  if (segIndex < 0 || segIndex >= points.length - 1) return 0;
  const dx = points[segIndex + 1].x - points[segIndex].x;
  const dy = points[segIndex + 1].y - points[segIndex].y;
  return Math.atan2(dy, dx);
}

function buildDefaultConfig(): SvgPipeConfig {
  return {
    ...(defaultSvgPipeProps as unknown as SvgPipeConfig),
    points: DEFAULT_POINTS.map((p) => ({ ...p })),
    pathData: pointsToPathData(DEFAULT_POINTS),
  };
}

function computeGeomFromPoints(
  points: SvgPipePoint[],
  pipeWidth: number,
): { width: number; height: number; shiftX: number; shiftY: number } {
  if (points.length === 0) return { width: 100, height: 100, shiftX: 0, shiftY: 0 };
  const pad = pipeWidth / 2 + 5;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const shiftX = minX - pad < 0 ? -(minX - pad) : 0;
  const shiftY = minY - pad < 0 ? -(minY - pad) : 0;
  return {
    width: Math.round(Math.max(maxX + pad + shiftX, 60)),
    height: Math.round(Math.max(maxY + pad + shiftY, 60)),
    shiftX: Math.round(shiftX),
    shiftY: Math.round(shiftY),
  };
}


@Graphic({
  type: 'svg-pipe',
  name: i18n.global.t('svg-pipe.label'),
  category: 'svg',
  primaryCategory: 'industrial',
  description: i18n.global.t('svg-pipe.description'),
  defaultProps: defaultSvgPipeProps,
  defaultWidth: 200,
  defaultHeight: 60,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: true,
    animatable: true,
  },
})
export class SvgPipePlugin extends BasePlugin<SvgPipeConfig> {
  private flowOffset = 0;
  private animTimer = new AnimationTimer();

  constructor(x = 0, y = 0, w = 200, h = 60) {
    super('svg-pipe', x, y, w, h);
    this.setDefaultProps(buildDefaultConfig());
  }

  onMounted(): void {
    const p = this.pluginProps;
    if (p.status === 'flowing' && p.showFlowAnimation) {
      this.animTimer.start();
    }
    this.refreshGeometry();
  }

  onUnmounted(): void {
    this.animTimer.stop();
  }

  onPropertyChanged(changes: Record<string, any>): void {
    if (changes.customProps?.status !== undefined) {
      const p = this.pluginProps;
      this.animTimer.stop();
      this.animTimer = new AnimationTimer();
      this.flowOffset = 0;
      if (p.status === 'flowing' && p.showFlowAnimation) {
        this.animTimer.start();
      }
    }
    if (changes.customProps?.points !== undefined) {
      const points = this.pluginProps.points;
      this.pluginProps.pathData = pointsToPathData(points);
      this.refreshGeometry();
    }
  }

  private refreshGeometry(): void {
    const props = this.pluginProps;
    const points = props.points;
    if (!points || points.length < 2) return;

    const geom = computeGeomFromPoints(points, props.strokeWidth);

    if (geom.shiftX > 0 || geom.shiftY > 0) {
      const newPoints = points.map((p) => ({
        x: Math.round(p.x + geom.shiftX),
        y: Math.round(p.y + geom.shiftY),
      }));
      const pos = this.getPosition();
      this.setPosition(pos.x - geom.shiftX, pos.y - geom.shiftY);
      this.setPluginProps({ points: newPoints, pathData: pointsToPathData(newPoints) } as Partial<SvgPipeConfig>);
    }

    const { width: curW, height: curH } = this.getSize();
    const newW = Math.round(Math.max(curW, geom.width));
    const newH = Math.round(Math.max(curH, geom.height));
    if (newW !== curW || newH !== curH) {
      this.setSize(newW, newH);
    }
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const props = this.pluginProps;
    const { width, height } = this.getSize();

    const status = props.status ?? 'stopped';
    const colorMap: Record<string, string> = {
      flowing: props.flowingColor,
      stopped: props.stoppedColor,
      blocked: props.blockedColor,
    };
    const color = colorMap[status] ?? props.strokeColor;

    const pathData = props.pathData || pointsToPathData(props.points);
    const commands = parseSvgPath(pathData);

    ctx.save();

    if (props.filterShadow) {
      ctx.shadowColor = props.shadowColor;
      ctx.shadowBlur = props.shadowBlur;
    }

    if (props.gradientType !== 'none') {
      const grad = props.gradientType === 'linear'
        ? ctx.createLinearGradient(0, 0, width, 0)
        : ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      grad.addColorStop(0, props.gradientStartColor);
      grad.addColorStop(1, props.gradientEndColor);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = color;
    }

    ctx.lineWidth = props.strokeWidth;
    ctx.lineCap = props.strokeLinecap;
    ctx.lineJoin = props.strokeLinejoin;

    if (props.strokeDasharray) {
      ctx.setLineDash(props.strokeDasharray.split(/[\s,]+/).map(Number));
    }

    renderPathCommands(ctx, commands);
    ctx.stroke();

    ctx.restore();

    if (status === 'flowing' && props.showFlowAnimation) {
      this.drawFlowAnimation(ctx, props);
    }
  }

  private drawFlowArrowShape(
    ctx: CanvasRenderingContext2D,
    size: number,
    style: 'triangle' | 'rectangle' | 'square',
  ): void {
    ctx.beginPath();
    if (style === 'triangle') {
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, -size * 0.55);
      ctx.lineTo(-size * 0.7, size * 0.55);
      ctx.closePath();
    } else if (style === 'rectangle') {
      ctx.rect(-size * 0.6, -size * 0.25, size * 1.2, size * 0.5);
    } else {
      ctx.rect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }
    ctx.fill();
  }

  private drawFlowAnimation(ctx: CanvasRenderingContext2D, props: Readonly<SvgPipeConfig>): void {
    const points = props.points;
    if (!points || points.length < 2) return;

    const dt = this.animTimer.tick();
    if (dt <= 0) return;

    const totalLength = computePathLength(points);
    if (totalLength <= 0) return;

    const speed = (props.flowSpeed ?? 1) * 60 * dt;
    this.flowOffset = (this.flowOffset + speed) % 1000;

    const arrowSpacing = props.arrowSpacing ?? 30;
    const arrowSize = props.arrowSize ?? 8;
    const arrowColor = props.flowingColor ?? '#3498DBFF';
    const direction = props.flowDirection ?? 'forward';
    const arrowStyle = props.arrowStyle ?? 'triangle';

    ctx.save();
    ctx.fillStyle = arrowColor;

    if (direction === 'bidirectional') {
      let dist1 = this.flowOffset % arrowSpacing;
      while (dist1 < totalLength) {
        const pt = pointAtDistance(points, dist1);
        if (pt === null) break;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        const angle = getSegmentAngle(points, pt.segIndex);
        ctx.rotate(angle);
        this.drawFlowArrowShape(ctx, arrowSize, arrowStyle);
        ctx.restore();
        dist1 += arrowSpacing;
      }

      let dist2 = (this.flowOffset + arrowSpacing / 2) % arrowSpacing;
      while (dist2 < totalLength) {
        const pt = pointAtDistance(points, dist2);
        if (pt === null) break;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        const angle = getSegmentAngle(points, pt.segIndex);
        ctx.rotate(angle + Math.PI);
        this.drawFlowArrowShape(ctx, arrowSize, arrowStyle);
        ctx.restore();
        dist2 += arrowSpacing;
      }
    } else {
      let dist = this.flowOffset % arrowSpacing;
      while (dist < totalLength) {
        const pt = pointAtDistance(
          points,
          direction === 'backward' ? totalLength - dist : dist,
        );
        if (pt === null) break;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        const angle = getSegmentAngle(points, pt.segIndex);
        ctx.rotate(direction === 'backward' ? angle + Math.PI : angle);
        this.drawFlowArrowShape(ctx, arrowSize, arrowStyle);
        ctx.restore();
        dist += arrowSpacing;
      }
    }

    ctx.restore();
  }
}