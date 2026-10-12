// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface PerformanceMetrics {
  renderTime: number[];
  fps: number[];
  memoryUsage: number[];
  graphicCount: number[];
  drawCalls: number[];
}

export interface PerformanceReport {
  averageRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageGraphicCount: number;
  averageDrawCalls: number;
  totalFrames: number;
  totalRenderTime: number;
}

export interface PerfRenderStats {
  totalRenders: number;
  fullRenders: number;
  partialRenders: number;
  totalDuration: number;
  lastFrameTime: number;
  frameCount: number;
  fps: number;
  lastFpsUpdate: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: [],
    fps: [],
    memoryUsage: [],
    graphicCount: [],
    drawCalls: [],
  };

  private renderStats: PerfRenderStats = {
    totalRenders: 0,
    fullRenders: 0,
    partialRenders: 0,
    totalDuration: 0,
    lastFrameTime: 0,
    frameCount: 0,
    fps: 0,
    lastFpsUpdate: performance.now(),
  };

  private maxSamples: number = 100;
  private enabled: boolean = true;
  private reportInterval: number = 5000;
  private lastReportTime: number = 0;
  private reportCallback?: (report: PerformanceReport) => void;

  constructor(options?: {
    maxSamples?: number;
    enabled?: boolean;
    reportInterval?: number;
    reportCallback?: (report: PerformanceReport) => void;
  }) {
    this.maxSamples = options?.maxSamples ?? 100;
    this.enabled = options?.enabled ?? true;
    this.reportInterval = options?.reportInterval ?? 5000;
    this.reportCallback = options?.reportCallback;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  recordRenderTime(ms: number): void {
    if (!this.enabled) return;
    
    this.metrics.renderTime.push(ms);
    this.trimArray(this.metrics.renderTime);
    
    this.renderStats.totalRenders++;
    this.renderStats.totalDuration += ms;
    this.renderStats.lastFrameTime = ms;
    
    this.updateFps();
    this.maybeGenerateReport(performance.now());
  }

  recordFps(fps: number): void {
    if (!this.enabled) return;
    
    this.metrics.fps.push(fps);
    this.trimArray(this.metrics.fps);
  }

  recordMemoryUsage(bytes: number): void {
    if (!this.enabled) return;
    
    this.metrics.memoryUsage.push(bytes);
    this.trimArray(this.metrics.memoryUsage);
  }

  recordGraphicCount(count: number): void {
    if (!this.enabled) return;
    
    this.metrics.graphicCount.push(count);
    this.trimArray(this.metrics.graphicCount);
  }

  recordDrawCalls(count: number): void {
    if (!this.enabled) return;
    
    this.metrics.drawCalls.push(count);
    this.trimArray(this.metrics.drawCalls);
  }

  recordFullRender(): void {
    this.renderStats.fullRenders++;
  }

  recordPartialRender(): void {
    this.renderStats.partialRenders++;
  }

  private updateFps(): void {
    const now = performance.now();
    this.renderStats.frameCount++;
    
    if (now - this.renderStats.lastFpsUpdate >= 1000) {
      this.renderStats.fps = Math.round(
        (this.renderStats.frameCount * 1000) / (now - this.renderStats.lastFpsUpdate)
      );
      this.recordFps(this.renderStats.fps);
      this.renderStats.frameCount = 0;
      this.renderStats.lastFpsUpdate = now;
      
      this.maybeGenerateReport(now);
    }
  }

  private maybeGenerateReport(now: number): void {
    if (this.reportCallback && now - this.lastReportTime >= this.reportInterval) {
      const report = this.generateReport();
      this.reportCallback(report);
      this.lastReportTime = now;
    }
  }

  private trimArray(arr: number[]): void {
    while (arr.length > this.maxSamples) {
      arr.shift();
    }
  }

  generateReport(): PerformanceReport {
    const { renderTime, fps, memoryUsage, graphicCount, drawCalls } = this.metrics;
    
    return {
      averageRenderTime: this.calculateAverage(renderTime),
      minRenderTime: renderTime.length > 0 ? Math.min(...renderTime) : 0,
      maxRenderTime: renderTime.length > 0 ? Math.max(...renderTime) : 0,
      averageFps: this.calculateAverage(fps),
      minFps: fps.length > 0 ? Math.min(...fps) : 0,
      maxFps: fps.length > 0 ? Math.max(...fps) : 0,
      averageMemoryUsage: this.calculateAverage(memoryUsage),
      peakMemoryUsage: memoryUsage.length > 0 ? Math.max(...memoryUsage) : 0,
      averageGraphicCount: this.calculateAverage(graphicCount),
      averageDrawCalls: this.calculateAverage(drawCalls),
      totalFrames: this.renderStats.totalRenders,
      totalRenderTime: this.renderStats.totalDuration,
    };
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getCurrentStats(): PerfRenderStats {
    return { ...this.renderStats };
  }

  getMetrics(): PerformanceMetrics {
    return {
      renderTime: [...this.metrics.renderTime],
      fps: [...this.metrics.fps],
      memoryUsage: [...this.metrics.memoryUsage],
      graphicCount: [...this.metrics.graphicCount],
      drawCalls: [...this.metrics.drawCalls],
    };
  }

  reset(): void {
    this.metrics = {
      renderTime: [],
      fps: [],
      memoryUsage: [],
      graphicCount: [],
      drawCalls: [],
    };
    
    this.renderStats = {
      totalRenders: 0,
      fullRenders: 0,
      partialRenders: 0,
      totalDuration: 0,
      lastFrameTime: 0,
      frameCount: 0,
      fps: 0,
      lastFpsUpdate: performance.now(),
    };
    
    this.lastReportTime = 0;
  }

  setReportCallback(callback: (report: PerformanceReport) => void): void {
    this.reportCallback = callback;
  }

  setMaxSamples(maxSamples: number): void {
    this.maxSamples = maxSamples;
    this.trimArray(this.metrics.renderTime);
    this.trimArray(this.metrics.fps);
    this.trimArray(this.metrics.memoryUsage);
    this.trimArray(this.metrics.graphicCount);
    this.trimArray(this.metrics.drawCalls);
  }

  setReportInterval(interval: number): void {
    this.reportInterval = interval;
  }

  logReport(): void {
  }
}

export const performanceMonitor = new PerformanceMonitor({
  maxSamples: 100,
  enabled: true,
  reportInterval: 5000,
});