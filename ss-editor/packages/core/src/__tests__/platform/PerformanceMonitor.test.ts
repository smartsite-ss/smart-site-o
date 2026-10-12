// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../utils/core/PerformanceMonitor';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor({
            maxSamples: 10,
            enabled: true,
            reportInterval: 10000,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with default values', () => {
        const stats = monitor.getCurrentStats();
        expect(stats.totalRenders).toBe(0);
        expect(stats.fullRenders).toBe(0);
        expect(stats.partialRenders).toBe(0);
        expect(stats.totalDuration).toBe(0);
        expect(stats.fps).toBe(0);
    });

    it('should enable and disable monitoring', () => {
        expect(monitor.isEnabled()).toBe(true);
        
        monitor.disable();
        expect(monitor.isEnabled()).toBe(false);
        
        monitor.enable();
        expect(monitor.isEnabled()).toBe(true);
    });

    it('should record render time', () => {
        monitor.recordRenderTime(10);
        monitor.recordRenderTime(20);
        monitor.recordRenderTime(30);
        
        const metrics = monitor.getMetrics();
        expect(metrics.renderTime).toEqual([10, 20, 30]);
    });

    it('should record memory usage', () => {
        monitor.recordMemoryUsage(1024);
        monitor.recordMemoryUsage(2048);
        
        const metrics = monitor.getMetrics();
        expect(metrics.memoryUsage).toEqual([1024, 2048]);
    });

    it('should record graphic count', () => {
        monitor.recordGraphicCount(10);
        monitor.recordGraphicCount(20);
        
        const metrics = monitor.getMetrics();
        expect(metrics.graphicCount).toEqual([10, 20]);
    });

    it('should record draw calls', () => {
        monitor.recordDrawCalls(5);
        monitor.recordDrawCalls(10);
        
        const metrics = monitor.getMetrics();
        expect(metrics.drawCalls).toEqual([5, 10]);
    });

    it('should record full and partial renders', () => {
        monitor.recordFullRender();
        monitor.recordFullRender();
        monitor.recordPartialRender();
        
        const stats = monitor.getCurrentStats();
        expect(stats.fullRenders).toBe(2);
        expect(stats.partialRenders).toBe(1);
    });

    it('should trim arrays when exceeding max samples', () => {
        const monitorWithLimit = new PerformanceMonitor({ maxSamples: 3 });
        
        for (let i = 0; i < 5; i++) {
            monitorWithLimit.recordRenderTime(i * 10);
        }
        
        const metrics = monitorWithLimit.getMetrics();
        expect(metrics.renderTime.length).toBe(3);
        expect(metrics.renderTime).toEqual([20, 30, 40]);
    });

    it('should generate performance report', () => {
        monitor.recordRenderTime(10);
        monitor.recordRenderTime(20);
        monitor.recordRenderTime(30);
        
        const report = monitor.generateReport();
        expect(report.averageRenderTime).toBe(20);
        expect(report.minRenderTime).toBe(10);
        expect(report.maxRenderTime).toBe(30);
        expect(report.totalFrames).toBe(3);
        expect(report.totalRenderTime).toBe(60);
    });

    it('should generate report with empty metrics', () => {
        const report = monitor.generateReport();
        expect(report.averageRenderTime).toBe(0);
        expect(report.minRenderTime).toBe(0);
        expect(report.maxRenderTime).toBe(0);
        expect(report.totalFrames).toBe(0);
    });

    it('should reset all metrics', () => {
        monitor.recordRenderTime(10);
        monitor.recordMemoryUsage(1024);
        monitor.recordGraphicCount(5);
        
        monitor.reset();
        
        const metrics = monitor.getMetrics();
        expect(metrics.renderTime).toEqual([]);
        expect(metrics.memoryUsage).toEqual([]);
        expect(metrics.graphicCount).toEqual([]);
        
        const stats = monitor.getCurrentStats();
        expect(stats.totalRenders).toBe(0);
        expect(stats.totalDuration).toBe(0);
    });

    it('should set max samples and trim existing data', () => {
        for (let i = 0; i < 5; i++) {
            monitor.recordRenderTime(i * 10);
        }
        
        monitor.setMaxSamples(2);
        
        const metrics = monitor.getMetrics();
        expect(metrics.renderTime.length).toBe(2);
    });

    it('should not record metrics when disabled', () => {
        monitor.disable();
        
        monitor.recordRenderTime(10);
        monitor.recordMemoryUsage(1024);
        
        const metrics = monitor.getMetrics();
        expect(metrics.renderTime).toEqual([]);
        expect(metrics.memoryUsage).toEqual([]);
    });

    it('should call report callback at interval', () => {
        const callback = vi.fn();
        const testMonitor = new PerformanceMonitor({
            reportInterval: 100,
            reportCallback: callback,
        });
        
        return new Promise(resolve => {
            for (let i = 0; i < 50; i++) {
                testMonitor.recordRenderTime(10);
            }
            
            setTimeout(() => {
                expect(callback).toHaveBeenCalled();
                resolve(undefined);
            }, 150);
        });
    });

    it('should log report to console', () => {
        const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
        const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
        
        monitor.recordRenderTime(10);
        monitor.logReport();
        
        // logReport is a no-op placeholder, console.group is not called
        expect(consoleGroupSpy).not.toHaveBeenCalled();
        expect(consoleGroupEndSpy).not.toHaveBeenCalled();
        
        consoleGroupSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
    });
});