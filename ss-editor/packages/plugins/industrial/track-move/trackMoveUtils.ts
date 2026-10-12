// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackMoveConfig {
  points: TrackPoint[];
  speed: number;
  dotStyle: 'circle' | 'image';
  dotColor: string;
  dotSize: number;
  dotImage?: string;
  imageWidth?: number;
  imageHeight?: number;
  trackColor: string;
  trackWidth: number;
  trackStyle: 'solid' | 'dashed';
  status: boolean;
  direction: 'forward' | 'backward';
  loopMode: 'once' | 'loop' | 'bounce';
}

export function computeBounds(
  points: TrackPoint[],
  dotSize: number,
): { x: number; y: number; width: number; height: number } {
  const padding = dotSize + 8;
  const minX = Math.min(...points.map((p) => p.x)) - padding;
  const minY = Math.min(...points.map((p) => p.y)) - padding;
  const maxX = Math.max(...points.map((p) => p.x)) + padding;
  const maxY = Math.max(...points.map((p) => p.y)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function computePathLength(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function pointAtDistance(
  points: TrackPoint[],
  distance: number,
): { x: number; y: number; angle: number } {
  let remaining = distance;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return {
        x: points[i].x + dx * t,
        y: points[i].y + dy * t,
        angle: Math.atan2(dy, dx),
      };
    }
    remaining -= segLen;
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x),
  };
}

export function getProgressForLoopMode(
  totalLen: number,
  elapsedDist: number,
  mode: 'once' | 'loop' | 'bounce',
): { progress: number; finished?: boolean } {
  switch (mode) {
    case 'once':
      if (elapsedDist >= totalLen) {
        return { progress: totalLen, finished: true };
      }
      return { progress: elapsedDist };
    case 'loop':
      return { progress: elapsedDist % totalLen };
    case 'bounce': {
      const cycle = totalLen * 2;
      const mod = elapsedDist % cycle;
      return { progress: mod > totalLen ? cycle - mod : mod };
    }
  }
}