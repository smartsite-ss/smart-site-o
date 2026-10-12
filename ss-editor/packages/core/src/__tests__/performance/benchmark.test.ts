// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height); } draw(_ctx: CanvasRenderingContext2D): void { /* 测试用的空实现 */ } } /* 性能基准测试 - 根据实际环境调整阈值 */ describe('性能基准测试', () => {
  describe('图形操作性能', () => {
    it('should add 100 graphics fast', () => {
      const page = new BasePage();
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const graphic = new TestShape(i * 20, i * 10, 100, 50);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('添加 100 个图形耗时: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(500); // 调整为更合理的阈值
      expect(page.graphics.length).toBe(100);
    });

    it('should remove graphics efficiently', () => {
      const page = new BasePage();
      
      for (let i = 0; i < 100; i++) {
        const graphic = new TestShape(i * 20, i * 10, 100, 50);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        page.removeGraphic(`g-${i}`);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('删除 100 个图形耗时: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(300); // 调整为更合理的阈值
    });

    it('should update graphic properties fast', () => {
      const page = new BasePage();
      
      const graphic = new TestShape(100, 100, 100, 50);
      graphic.id = 'g-1';
      page.addGraphic(graphic as any);
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        page.updateGraphic('g-1', {
          geometry: { x: i * 2, y: i }
        });
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('更新 100 次属性耗时: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(300); // 调整为更合理的阈值
    });
  });

  describe('历史记录性能', () => {
    it('should handle incremental history efficiently', () => {
      const page = new BasePage();
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const graphic = new TestShape(i * 20, i * 10, 100, 50);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      for (let i = 99; i >= 0; i--) {
        page.removeGraphic(`g-${i}`);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('添加 100 个和删除 100 个（增量历史）: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(1000); // 调整为更合理的阈值
    });

    it('should handle undo/redo efficiently', () => {
      const page = new BasePage();
      
      for (let i = 0; i < 50; i++) {
        const graphic = new TestShape(i * 20, i * 10, 100, 50);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      
      const startTime = performance.now();
      for (let i = 0; i < 50; i++) {
        page.undo();
      }
      for (let i = 0; i < 50; i++) {
        page.redo();
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('执行 50 次 undo 和 50 次 redo: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(500); // 调整为更合理的阈值
    });
  });

  describe('管理器性能', () => {
    it('BasePage should handle bulk operations', () => {
      const page = new BasePage();
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const graphic = new TestShape(i * 20, i * 10, 100, 50);
        graphic.id = `g-${i}`;
        page.addGraphic(graphic as any);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('BasePage 添加 100 个图形: ${duration.toFixed(2)}ms');
      
      expect(duration).toBeLessThan(500); // 调整为更合理的阈值
    });
  });
});
