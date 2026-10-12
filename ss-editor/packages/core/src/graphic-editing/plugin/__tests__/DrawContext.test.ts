// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi } from 'vitest';
import { DrawContext } from '@scada-editor/plugin-sdk';

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    ellipse: vi.fn(),
    clip: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    font: '14px Arial',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    textDecoration: 'none' as any,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    shadowColor: '#00000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    setTransform: vi.fn(),
    transform: vi.fn(),
    resetTransform: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100), width: 10, height: 10 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100), width: 10, height: 10 })),
    putImageData: vi.fn(),
    drawFocusIfNeeded: vi.fn(),
    scrollPathIntoView: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

describe('DrawContext', () => {
  describe('constructor', () => {
    it('should create with given context and bounds', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      expect(dc.ctx).toBe(ctx);
      expect(dc.bounds.width).toBe(100);
      expect(dc.bounds.height).toBe(100);
    });

    it('should detect light/dark theme', () => {
      const ctx = createMockContext();
      const dcLight = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      expect(dcLight.isDark).toBe(false);

      const dcDark = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, true);
      expect(dcDark.isDark).toBe(true);
    });
  });

  describe('coordinate transform', () => {
    it('save and restore should delegate to ctx', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.save();
      expect(ctx.save).toHaveBeenCalled();
      dc.restore();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('translate should delegate to ctx', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.translate(50, 100);
      expect(ctx.translate).toHaveBeenCalledWith(50, 100);
    });

    it('rotate should delegate to ctx', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.rotate(Math.PI / 4);
      expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 4);
    });

    it('scale should delegate to ctx', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.scale(2, 3);
      expect(ctx.scale).toHaveBeenCalledWith(2, 3);
    });
  });

  describe('industrial drawing primitives', () => {
    it('drawPipe should draw a rectangle-based pipe', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawPipe({ x: 10, y: 20, width: 80, height: 40 }, { color: '#4A90A4' });
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawPipe should draw flanges when flangeWidth > 0', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawPipe(
        { x: 10, y: 20, width: 80, height: 40 },
        { color: '#4A90A4', flangeWidth: 4, flangeColor: '#2E6B7D' },
      );
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawMetallicRect should draw with metallic gradient', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawMetallicRect({ x: 10, y: 10, width: 80, height: 60 }, {
        baseColor: '#4A90A4',
        radius: 4,
      });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawMetallicRect should support highlight side', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawMetallicRect({ x: 0, y: 0, width: 100, height: 80 }, {
        baseColor: '#6BA5B8',
        highlight: { side: 'left' },
        radius: 4,
      });
      expect(ctx.createLinearGradient).toHaveBeenCalled();
    });

    it('drawStatusLight should draw circle with color', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawStatusLight(50, 50, 10, { color: '#4CAF50' });
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawStatusLight should support glowing effect', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawStatusLight(50, 50, 10, { color: '#4CAF50', glowing: true, glowIntensity: 0.8 });
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawStatusLight should support border', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawStatusLight(50, 50, 10, {
        color: '#FFC107',
        borderColor: '#E0E0E0',
      });
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('drawFlange should draw flange arcs', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawFlange(50, 50, 20, { color: '#888888', direction: 'horizontal' } as any);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawGaugeArc should draw arc with given angles', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawGaugeArc(50, 50, 30, 0, Math.PI, { color: '#2196F3' });
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('drawNeedle should draw needle line', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawNeedle(50, 50, 25, Math.PI / 4, { color: '#F44336' });
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('drawValveBody should draw valve shape', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawValveBody({ x: 10, y: 10, width: 80, height: 60 }, {
        baseColor: '#6BA5B8',
        direction: 'horizontal',
      } as any);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawTankBody should draw tank shape', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawTankBody({ x: 10, y: 10, width: 80, height: 60 }, {
        bodyColor: '#4A5A6A',
        rimColor: '#5D6D7E',
      } as any);
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawIndicatorRect should draw with rounded corners', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawIndicatorRect({ x: 10, y: 10, width: 80, height: 60 }, {
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E0E0',
      } as any);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('drawPipePath', () => {
    it('should render two-point pipe with default options', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 100 }, false);
      dc.drawPipePath({
        points: [{ x: 0, y: 50 }, { x: 200, y: 50 }],
        thickness: 20,
        color: '#4A90A4',
      });
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should render multi-point L-shaped pipe with bends', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 200 }, false);
      dc.drawPipePath({
        points: [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
          { x: 100, y: 150 },
        ],
        thickness: 16,
        color: '#4A90A4',
        bendRadius: 8,
        jointStyle: 'round',
      });
      expect(ctx.arcTo).toHaveBeenCalled();
    });

    it('should render flange ends by default', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 100 }, false);
      dc.drawPipePath({
        points: [{ x: 0, y: 50 }, { x: 200, y: 50 }],
        thickness: 20,
        color: '#4A90A4',
        endStyle: 'flange',
      });
      expect(ctx.fill).toHaveBeenCalled();
      const flangeFillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(flangeFillCalls).toBeGreaterThan(1);
    });

    it('should skip flanges with endStyle "butt"', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 100 }, false);
      dc.drawPipePath({
        points: [{ x: 0, y: 50 }, { x: 200, y: 50 }],
        thickness: 20,
        color: '#4A90A4',
        endStyle: 'butt',
      });
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should not render bends with jointStyle "miter"', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 200 }, false);
      dc.drawPipePath({
        points: [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
          { x: 100, y: 150 },
        ],
        thickness: 16,
        color: '#4A90A4',
        bendRadius: 8,
        jointStyle: 'miter',
      });
      expect(ctx.arcTo).not.toHaveBeenCalled();
    });

    it('should not render bends with bendRadius 0', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 200 }, false);
      dc.drawPipePath({
        points: [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
          { x: 100, y: 150 },
        ],
        thickness: 16,
        color: '#4A90A4',
        bendRadius: 0,
        jointStyle: 'round',
      });
      expect(ctx.arcTo).not.toHaveBeenCalled();
    });

    it('should return early for single point', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.drawPipePath({
        points: [{ x: 50, y: 50 }],
        thickness: 20,
        color: '#4A90A4',
      });
      expect(ctx.save).not.toHaveBeenCalled();
    });

    it('should render with custom thickness', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 200, height: 100 }, false);
      dc.drawPipePath({
        points: [{ x: 0, y: 50 }, { x: 200, y: 50 }],
        thickness: 40,
        color: '#E74C3C',
      });
      expect(ctx.rect).toHaveBeenCalledWith(0, -20, 200, 40);
    });
  });

  describe('fillRoundedRect / strokeRoundedRect', () => {
    it('fillRoundedRect should fill with given color', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.fillRoundedRect({ x: 0, y: 0, width: 80, height: 60 }, 8, '#FF0000');
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('strokeRoundedRect should stroke with given color and width', () => {
      const ctx = createMockContext();
      const dc = new DrawContext(ctx, { x: 0, y: 0, width: 100, height: 100 }, false);
      dc.strokeRoundedRect({ x: 0, y: 0, width: 80, height: 60 }, 4, '#0000FF', 2);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });
});