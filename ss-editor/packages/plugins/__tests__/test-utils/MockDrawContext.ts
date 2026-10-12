// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DrawContext, type Rect } from '@scada-editor/core';

export function createMockDrawContext(w = 100, h = 100): {
  dc: DrawContext;
  calls: string[];
} {
  const calls: string[] = [];

  const mockCtx = {
    fillStyle: '#000',
    strokeStyle: '#000',
    font: '',
    lineWidth: 0,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    shadowColor: '#00000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,

    save: () => { calls.push('save()'); },
    restore: () => { calls.push('restore()'); },
    translate: (x: number, y: number) => { calls.push(`translate(${x},${y})`); },
    rotate: (a: number) => { calls.push(`rotate(${a})`); },
    scale: (sx: number, sy: number) => { calls.push(`scale(${sx},${sy})`); },

    fillRect: (x: number, y: number, w: number, h: number) => { calls.push(`fillRect(${x},${y},${w},${h})`); },
    strokeRect: (x: number, y: number, w: number, h: number) => { calls.push(`strokeRect(${x},${y},${w},${h})`); },
    clearRect: (x: number, y: number, w: number, h: number) => { calls.push(`clearRect(${x},${y},${w},${h})`); },

    fillText: (text: string, x: number, y: number) => { calls.push(`fillText("${text}",${x},${y})`); },
    strokeText: (text: string, x: number, y: number) => { calls.push(`strokeText("${text}",${x},${y})`); },
    measureText: () => ({ width: 50, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0, fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0 }),

    beginPath: () => { calls.push('beginPath()'); },
    closePath: () => { calls.push('closePath()'); },
    moveTo: (x: number, y: number) => { calls.push(`moveTo(${x},${y})`); },
    lineTo: (x: number, y: number) => { calls.push(`lineTo(${x},${y})`); },
    arc: (x: number, y: number, r: number, s: number, e: number) => { calls.push(`arc(${x},${y},${r},${s},${e})`); },
    arcTo: (x1: number, y1: number, x2: number, y2: number, r: number) => { calls.push(`arcTo(${x1},${y1},${x2},${y2},${r})`); },
    bezierCurveTo: () => { calls.push('bezierCurveTo()'); },
    quadraticCurveTo: () => { calls.push('quadraticCurveTo()'); },
    rect: (x: number, y: number, w: number, h: number) => { calls.push(`rect(${x},${y},${w},${h})`); },
    roundRect: (x: number, y: number, w: number, h: number, r: number) => { calls.push(`roundRect(${x},${y},${w},${h},${r})`); },
    ellipse: () => { calls.push('ellipse()'); },

    fill: () => { calls.push('fill()'); },
    stroke: () => { calls.push('stroke()'); },
    clip: () => { calls.push('clip()'); },

    setLineDash: (d: number[]) => { calls.push(`setLineDash(${JSON.stringify(d)})`); },
    getLineDash: () => [],
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    setTransform: () => {},
    transform: () => {},
    resetTransform: () => {},

    createLinearGradient: () => ({ addColorStop: () => {} } as any),
    createRadialGradient: () => ({ addColorStop: () => {} } as any),
    createConicGradient: () => ({ addColorStop: () => {} } as any),
    createPattern: () => ({} as any),

    drawImage: () => {},
    drawFocusIfNeeded: () => {},
    scrollPathIntoView: () => {},

    createImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' } as any),
    getImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0, colorSpace: 'srgb' } as any),
    putImageData: () => {},

    isPointInPath: () => false,
    isPointInStroke: () => false,
    isContextLost: () => false,
    getContextAttributes: () => ({} as any),
    reset: () => {},
  } as unknown as CanvasRenderingContext2D;

  const bounds: Rect = { x: 0, y: 0, width: w, height: h };
  const dc = new DrawContext(mockCtx, bounds, false);

  return { dc, calls };
}