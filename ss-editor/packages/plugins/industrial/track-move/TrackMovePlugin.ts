// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BasePlugin, Graphic, DrawContext, AnimationTimer, ColorUtils } from '@scada-editor/plugin-sdk';
import { i18n, registerLocaleModules } from '@scada-editor/core';
registerLocaleModules(import.meta.glob('./locales/*.json', { eager: true }));
import pkg from './package.json';
import {
  TrackMoveConfig,
  TrackPoint,
  computePathLength,
  pointAtDistance,
  getProgressForLoopMode,
} from './trackMoveUtils';

const DEFAULT_POINTS: TrackPoint[] = [
  { x: 20, y: 30 },   // start
  { x: 140, y: 10 },  // bend (折弯点)
  { x: 260, y: 30 },  // end
];

const defaultConfig: TrackMoveConfig = {
  points: DEFAULT_POINTS.map((p) => ({ ...p })),
  speed: 50,
  dotStyle: 'circle',
  dotColor: '#FF5722FF',
  dotSize: 12,
  trackColor: '#4A90A4FF',
  trackWidth: 2,
  trackStyle: 'dashed',
  status: true,
  direction: 'forward',
  loopMode: 'bounce',
};


@Graphic({
  type: 'track-move',
  name: i18n.global.t('track-move.label'),
  category: 'industrial',
  version: pkg.version,
  description: i18n.global.t('track-move.description'),
  defaultProps: defaultConfig,
  defaultWidth: 300,
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
export class TrackMovePlugin extends BasePlugin<TrackMoveConfig> {
  private elapsed = 0;
  private animTimer = new AnimationTimer();
  private lastTimestamp = 0;
  private imageCache: HTMLImageElement | null = null;
  private imageUrl: string | null = null;

  constructor(x = 0, y = 0, w = 300, h = 60) {
    super('track-move', x, y, w, h);
    this.setDefaultProps({ ...defaultConfig, points: DEFAULT_POINTS.map((p) => ({ ...p })) });
  }

  onMounted(): void {
    this.animTimer.start();
    this.lastTimestamp = performance.now();
    this.loadImage();
  }

  onUnmounted(): void {
    this.animTimer.stop();
    this.imageCache = null;
  }

  onPropertyChanged(changes: Record<string, any>): void {
    if (changes.customProps?.points !== undefined) {
      this.recomputeBoundsInternal();
    }
    if (changes.customProps?.dotImage !== undefined) {
      this.loadImage();
    }
    if (changes.customProps?.dotSize !== undefined) {
      this.recomputeBoundsInternal();
    }
  }

  private loadImage(): void {
    const props = this.pluginProps;
    const url = props.dotImage;
    if (!url) {
      this.imageCache = null;
      this.imageUrl = null;
      return;
    }
    if (url === this.imageUrl && this.imageCache) return;
    this.imageUrl = url;
    const img = new Image();
    img.onload = () => {
      this.imageCache = img;
    };
    img.onerror = () => {
      this.imageCache = null;
    };
    img.src = url;
  }

  private recomputeBoundsInternal(): void {
    // Bounds are recalculated in render based on point positions
  }

  private isSelected(): boolean {
    if (typeof this.pageContext?.getPage !== 'function') return false;
    const page = this.pageContext.getPage();
    return (page as any)?.selectedGraphicIds?.includes(this.id) ?? false;
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx as CanvasRenderingContext2D;
    if (!ctx) return;
    const props = this.pluginProps;
    if (!props) return;
    const points = props.points;
    if (!points || points.length < 2) return;

    // Calculate animation progress
    const totalLen = computePathLength(points);
    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    if (props.status) {
      this.elapsed += dt * props.speed;
    }
    const { progress, finished } = getProgressForLoopMode(totalLen, this.elapsed, props.loopMode);
    if (finished && props.status) {
      this.setPluginProps({ status: false } as Partial<TrackMoveConfig>);
    }

    // Get current position (handle direction)
    let effectiveProgress = progress;
    if (props.direction === 'backward') {
      effectiveProgress = totalLen - progress;
    }
    const pos = pointAtDistance(points, effectiveProgress);

    const selected = this.isSelected();

    ctx.save();

    // Draw track line (only in edit mode, not in preview/runtime mode)
    const page = this.pageContext?.getPage?.();
    const pageMode = (page as any)?.mode;
    if (pageMode !== 'preview') {
      this.drawTrack(ctx, points, props.trackColor, props.trackWidth, props.trackStyle);
    }

    // Draw moving dot
    this.drawMovingDot(ctx, pos, props);

    // Draw control points (only when selected)
    if (selected) {
      this.drawControlPoints(ctx, points);
    }

    ctx.restore();
  }

  private drawTrack(
    ctx: CanvasRenderingContext2D,
    points: TrackPoint[],
    color: string,
    width: number,
    style: 'solid' | 'dashed',
  ): void {
    ctx.strokeStyle = this.normalizeColor(color);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (style === 'dashed') {
      ctx.setLineDash([8, 6]);
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawMovingDot(
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number; angle: number },
    config: TrackMoveConfig,
  ): void {
    if (config.dotStyle === 'circle') {
      const color = this.normalizeColor(config.dotColor);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, config.dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      // Inner highlight
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = ColorUtils.lightenColor(config.dotColor, 0.3);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, config.dotSize / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (config.dotStyle === 'image') {
      if (this.imageCache) {
        const w = config.imageWidth || 24;
        const h = config.imageHeight || 24;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);
        ctx.drawImage(this.imageCache, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        // Fallback: draw circle while image is loading
        const color = this.normalizeColor(config.dotColor);
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, config.dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawControlPoints(
    ctx: CanvasRenderingContext2D,
    points: TrackPoint[],
  ): void {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const isEndpoint = i === 0 || i === points.length - 1;

      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;

      if (isEndpoint) {
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.rect(p.x - 6, p.y - 6, 12, 12);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + 6, p.y);
        ctx.lineTo(p.x, p.y + 6);
        ctx.lineTo(p.x - 6, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private normalizeColor(hex: string): string {
    if (!hex || typeof hex !== 'string') return '#7f8c8d';
    if (hex.length === 9 && hex.startsWith('#')) {
      return hex.substring(0, 7);
    }
    return hex;
  }

  containsPoint(x: number, y: number): boolean {
    if (super.containsPoint(x, y)) return true;

    const props = this.pluginProps;
    const points = props.points;
    if (!points || points.length === 0) return false;

    const pos = this.getPosition();
    const localX = x - pos.x;
    const localY = y - pos.y;

    for (const p of points) {
      const dx = localX - p.x;
      const dy = localY - p.y;
      if (dx * dx + dy * dy <= 49) {
        return true;
      }
    }
    return false;
  }

  getHitControlPoint(x: number, y: number): number {
    const props = this.pluginProps;
    const points = props.points;
    if (!points || points.length === 0) return -1;

    const pos = this.getPosition();
    const localX = x - pos.x;
    const localY = y - pos.y;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = localX - p.x;
      const dy = localY - p.y;
      if (dx * dx + dy * dy <= 64) {
        return i;
      }
    }
    return -1;
  }

  moveControlPoint(index: number, newX: number, newY: number): void {
    const props = this.pluginProps;
    const points = props.points;
    if (!points || index < 0) return;

    const rx = Math.round(newX);
    const ry = Math.round(newY);

    if (index >= points.length) {
      const newPoints = [
        { x: points[0].x, y: points[0].y },
        { x: rx, y: ry },
        { x: points[points.length - 1].x, y: points[points.length - 1].y },
      ];
      this.setPluginProps({ points: newPoints } as Partial<TrackMoveConfig>);
      return;
    }

    const updatedPoints = points.map((p, i) =>
      i === index ? { ...p, x: rx, y: ry } : { ...p }
    );
    this.setPluginProps({ points: updatedPoints } as Partial<TrackMoveConfig>);
  }

  insertControlPoint(atIndex: number): void {
    const props = this.pluginProps;
    const points = props.points;
    if (!points || atIndex < 1) return;

    const { width, height } = this.getSize();

    if (atIndex >= points.length) {
      const prev = points[0];
      const next = points[points.length - 1];
      const midX = Math.max(0, Math.min(width, Math.round((prev.x + next.x) / 2)));
      const midY = Math.max(0, Math.min(height, Math.round((prev.y + next.y) / 2)));
      const newPoints = [
        { x: points[0].x, y: points[0].y },
        { x: midX, y: midY },
        { x: points[points.length - 1].x, y: points[points.length - 1].y },
      ];
      this.setPluginProps({ points: newPoints } as Partial<TrackMoveConfig>);
      return;
    }

    const prev = points[atIndex - 1];
    const next = points[atIndex];
    const midX = Math.max(0, Math.min(width, Math.round((prev.x + next.x) / 2)));
    const midY = Math.max(0, Math.min(height, Math.round((prev.y + next.y) / 2)));

    const newPoints = [
      ...points.slice(0, atIndex),
      { x: midX, y: midY },
      ...points.slice(atIndex),
    ];
    this.setPluginProps({ points: newPoints } as Partial<TrackMoveConfig>);
  }

  deleteBendPoint(index: number): void {
    const props = this.pluginProps;
    const points = props.points;
    if (!points || points.length <= 2) return;
    if (index <= 0 || index >= points.length - 1) return;

    const newPoints = [...points];
    newPoints.splice(index, 1);
    this.setPluginProps({ points: newPoints } as Partial<TrackMoveConfig>);
  }
}