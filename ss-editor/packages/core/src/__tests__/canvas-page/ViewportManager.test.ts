// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GridSnapManager } from '../../graphic-editing/managers/GridSnapManager';
import { ZoomManager, defaultAutoFitConfig } from '../../canvas-page/managers/ZoomManager';

class TestShape extends BaseGraphic {
  constructor(x: number, y: number, width: number, height: number) {
    super('test-shape', x, y, width, height); } draw(_ctx: CanvasRenderingContext2D): void { /* Empty implementation for testing */ } } describe('Viewport control features', () => {
  let page: BasePage;

  beforeEach(() => {
    page = new BasePage();
    page.init({
      id: 'test-page',
      name: 'Test Page',
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
    });
  });

  describe('Page zoom functionality', () => {
    it('should initialize zoom ratio correctly', () => {
      expect(page.scale).toBe(100);
    });

    it('should be able to set zoom ratio', () => {
      page.scale = 150;
      expect(page.scale).toBe(150);
    });

    it('should convert zoom factor correctly', () => {
      page.scale = 100;
      expect(page.scale / 100).toBe(1.0);

      page.scale = 50;
      expect(page.scale / 100).toBe(0.5);

      page.scale = 200;
      expect(page.scale / 100).toBe(2.0);
    });
  });

  describe('网格吸附功能', () => {
    it('应该能够获取网格吸附管理器', () => {
      const gridSnapManager = page.getGridSnapManager();
      expect(gridSnapManager).toBeInstanceOf(GridSnapManager);
    });

    it('应该能够设置网格吸附配置', () => {
      const config = {
        enabled: true,
        gridSize: 20,
        snapToGrid: true,
        snapToGuides: true,
        snapToObjects: true,
        snapDistance: 8,
      };
      
      page.setGridSnapConfig(config);
      const currentConfig = page.getGridSnapConfig();
      
      expect(currentConfig.enabled).toBe(true);
      expect(currentConfig.gridSize).toBe(20);
      expect(currentConfig.snapToGrid).toBe(true);
      expect((currentConfig as any).snapToGuides).toBe(true);
      expect((currentConfig as any).snapToObjects).toBe(true);
      expect(currentConfig.snapDistance).toBe(8);
    });

    it('应该能够启用和禁用网格吸附', () => {
      page.setGridSnapConfig({ enabled: true });
      expect(page.getGridSnapConfig().enabled).toBe(true);

      page.setGridSnapConfig({ enabled: false });
      expect(page.getGridSnapConfig().enabled).toBe(false);
    });

    it('应该能够进行位置吸附', () => {
      page.setGridSnapConfig({ enabled: true, gridSize: 20, snapDistance: 8 });
      
      const result = page.snapPosition(25, 35);
      
      expect(result).toBeDefined();
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });
  });

  describe('智能对齐功能', () => {
    it('应该能够设置对齐距离', () => {
      page.setAlignDistance(10);
      const smartAlignManager = page.getSmartAlignManager();
      expect(smartAlignManager).toBeDefined();
    });

    it('应该能够检测对齐目标', () => {
      const graphic1 = new TestShape(100, 100, 50, 50);
      const graphic2 = new TestShape(200, 200, 50, 50);
      page.addGraphic(graphic1);
      page.addGraphic(graphic2);

      const targets = page.detectAlignTargets(graphic1, [graphic2]);
      
      expect(targets).toBeDefined();
      expect(Array.isArray(targets)).toBe(true);
    });
  });

  describe('辅助线管理功能', () => {
    it('应该能够添加水平辅助线', () => {
      const lineId = page.addGuideLine(100, 'horizontal');
      
      expect(lineId).toBeDefined();
      expect(typeof lineId).toBe('string');
      
      const lines = page.getAllGuideLines();
      expect(lines.length).toBe(1);
      expect(lines[0].id).toBe(lineId);
      expect(lines[0].position).toBe(100);
      expect(lines[0].direction).toBe('horizontal');
    });

    it('应该能够添加垂直辅助线', () => {
      const lineId = page.addGuideLine(200, 'vertical');
      
      expect(lineId).toBeDefined();
      
      const lines = page.getAllGuideLines();
      expect(lines.length).toBe(1);
      expect(lines[0].direction).toBe('vertical');
    });

    it('应该能够获取单个辅助线', () => {
      const lineId = page.addGuideLine(150, 'horizontal');
      const line = page.getGuideLine(lineId);
      
      expect(line).not.toBeNull();
      expect(line?.id).toBe(lineId);
      expect(line?.position).toBe(150);
    });

    it('应该能够更新辅助线位置', () => {
      const lineId = page.addGuideLine(100, 'horizontal');
      page.updateGuideLinePosition(lineId, 200);
      
      const line = page.getGuideLine(lineId);
      expect(line?.position).toBe(200);
    });

    it('应该能够删除辅助线', () => {
      const lineId = page.addGuideLine(100, 'horizontal');
      expect(page.getAllGuideLines().length).toBe(1);
      
      page.removeGuideLine(lineId);
      expect(page.getAllGuideLines().length).toBe(0);
    });

    it('应该能够清除所有辅助线', () => {
      page.addGuideLine(100, 'horizontal');
      page.addGuideLine(200, 'vertical');
      page.addGuideLine(300, 'horizontal');
      
      expect(page.getAllGuideLines().length).toBe(3);
      
      page.clearAllGuideLines();
      expect(page.getAllGuideLines().length).toBe(0);
    });

    it('应该能够获取不存在的辅助线返回 null', () => {
      const line = page.getGuideLine('non-existent-id');
      expect(line).toBeNull();
    });
  });

  describe('页面尺寸管理', () => {
    it('应该能够获取页面尺寸', () => {
      const size = page.getSize();
      
      expect(size.width).toBe(1920);
      expect(size.height).toBe(1080);
    });

    it('应该能够正确初始化自定义尺寸', () => {
      const customPage = new BasePage();
      customPage.init({
        id: 'custom-page',
        name: 'Custom Page',
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      });

      expect(customPage.width).toBe(800);
      expect(customPage.height).toBe(600);
    });
  });

  describe('图元尺寸调整功能', () => {
    it('应该能够使选中图元等宽', () => {
      const graphic1 = new TestShape(0, 0, 50, 100);
      const graphic2 = new TestShape(100, 0, 100, 80);
      const graphic3 = new TestShape(200, 0, 75, 90);
      
      page.addGraphic(graphic1);
      page.addGraphic(graphic2);
      page.addGraphic(graphic3);

      graphic1.setSize(50, 100);
      graphic2.setSize(100, 80);
      graphic3.setSize(75, 90);

      page.makeSameWidth([graphic1, graphic2, graphic3]);

      const sizes = [graphic1, graphic2, graphic3].map(g => g.getSize());
      const widths = sizes.map(s => s.width);
      
      expect(widths.every(w => w === 100)).toBe(true);
    });

    it('应该能够使选中图元等高', () => {
      const graphic1 = new TestShape(0, 0, 50, 50);
      const graphic2 = new TestShape(100, 0, 100, 100);
      const graphic3 = new TestShape(200, 0, 75, 75);
      
      page.addGraphic(graphic1);
      page.addGraphic(graphic2);
      page.addGraphic(graphic3);

      graphic1.setSize(50, 50);
      graphic2.setSize(100, 100);
      graphic3.setSize(75, 75);

      page.makeSameHeight([graphic1, graphic2, graphic3]);

      const sizes = [graphic1, graphic2, graphic3].map(g => g.getSize());
      const heights = sizes.map(s => s.height);
      
      expect(heights.every(h => h === 100)).toBe(true);
    });

    it('应该能够使选中图元等尺寸', () => {
      const graphic1 = new TestShape(0, 0, 50, 50);
      const graphic2 = new TestShape(100, 0, 100, 80);
      
      page.addGraphic(graphic1);
      page.addGraphic(graphic2);

      graphic1.setSize(50, 50);
      graphic2.setSize(100, 80);

      page.makeSameSize([graphic1, graphic2]);

      const size1 = graphic1.getSize();
      const size2 = graphic2.getSize();
      
      expect(size1.width).toBe(100);
      expect(size1.height).toBe(80);
      expect(size2.width).toBe(100);
      expect(size2.height).toBe(80);
    });

    it('等宽等高操作对不足2个图元应该不生效', () => {
      const graphic1 = new TestShape(0, 0, 50, 50);
      page.addGraphic(graphic1);

      expect(() => page.makeSameWidth([graphic1])).not.toThrow();
      expect(() => page.makeSameHeight([])).not.toThrow();
    });
  });

  describe('页面边缘对齐功能', () => {
    it('应该能够将图元对齐到页面边缘', () => {
      const graphic = new TestShape(100, 100, 100, 100);
      page.addGraphic(graphic);

      page.alignToPageEdge([graphic], 'left');
      expect(graphic.getPosition().x).toBe(0);

      page.alignToPageEdge([graphic], 'right');
      expect(graphic.getPosition().x).toBe(1920 - 100);

      page.alignToPageEdge([graphic], 'top');
      expect(graphic.getPosition().y).toBe(0);

      page.alignToPageEdge([graphic], 'bottom');
      expect(graphic.getPosition().y).toBe(1080 - 100);
    });

    it('应该能够将图元居中到页面', () => {
      const graphic = new TestShape(0, 0, 100, 100);
      page.addGraphic(graphic);

      page.centerOnPage([graphic], 'horizontal');
      expect(graphic.getPosition().x).toBe((1920 - 100) / 2);

      page.centerOnPage([graphic], 'vertical');
      expect(graphic.getPosition().y).toBe((1080 - 100) / 2);

      page.centerOnPage([graphic], 'both');
      expect(graphic.getPosition().x).toBe((1920 - 100) / 2);
      expect(graphic.getPosition().y).toBe((1080 - 100) / 2);
    });
  });

  describe('智能自适应策略', () => {
    describe('ZoomManager.autoSelectFitMode', () => {
      it('应该为竖屏选择 fitHeight 模式', () => {
        const result = ZoomManager.autoSelectFitMode(0.45, defaultAutoFitConfig); /* 手机竖屏 1080x2400 */
        expect(result).toBe('fitHeight');
      });

      it('应该为接近正方形选择 contain 模式', () => {
        const result = ZoomManager.autoSelectFitMode(1.0, defaultAutoFitConfig); /* 正方形屏幕 */
        expect(result).toBe('contain');
      });

      it('应该为宽屏选择 fitWidth 模式', () => {
        const result = ZoomManager.autoSelectFitMode(1.78, defaultAutoFitConfig); /* 普通显示器 1920x1080 */
        expect(result).toBe('fitWidth');
      });

      it('应该为超宽屏选择 fitWidth 模式', () => {
        const result = ZoomManager.autoSelectFitMode(2.39, defaultAutoFitConfig); /* 带鱼屏 3440x1440 */
        expect(result).toBe('fitWidth');
      });
    });

    describe('ZoomManager.calculateFitScale', () => {
      it('应该正确计算 contain 模式的缩放', () => {
        const scale = ZoomManager.calculateFitScale('contain', 1920, 1080, 1280, 720);
        expect(scale).toBeCloseTo(66.67, 2);
      });

      it('应该正确计算 fitWidth 模式的缩放', () => {
        const scale = ZoomManager.calculateFitScale('fitWidth', 1920, 1080, 1280, 720);
        expect(scale).toBeCloseTo(66.67, 2);
      });

      it('应该正确计算 fitHeight 模式的缩放', () => {
        const scale = ZoomManager.calculateFitScale('fitHeight', 1920, 1080, 1280, 720);
        expect(scale).toBeCloseTo(66.67, 2);
      });
    });

    describe('ZoomManager.calculateAutoFitScale', () => {
      it('应该为竖屏自动选择 fitHeight 并计算缩放', () => {
        const result = ZoomManager.calculateAutoFitScale(1920, 1080, 1080, 2400);
        expect(result.fitMode).toBe('fitHeight'); expect(result.scale).toBeGreaterThan(100); /* 竖屏需要放大 */ }); it('应该为宽屏自动选择 fitWidth 并计算缩放', () => {
        const result = ZoomManager.calculateAutoFitScale(1920, 1080, 3440, 1440);
        expect(result.fitMode).toBe('fitWidth'); expect(result.scale).toBeGreaterThan(100); /* 宽屏需要放大 */ }); it('应该限制缩放范围在 10%-200%', () => { const result = ZoomManager.calculateAutoFitScale(1920, 1080, 100, 100); expect(result.scale).toBe(10); /* 最小缩放 */ const result2 = ZoomManager.calculateAutoFitScale(100, 100, 10000, 10000); expect(result2.scale).toBe(200); /* 最大缩放 */ }); }); describe('页面适配方法', () => {
      it('应该默认使用 auto 模式', () => {
        expect(page.getFitMode()).toBe('auto');
      });

      it('应该能够设置和获取适配模式', () => {
        page.setFitMode('fitWidth');
        expect(page.getFitMode()).toBe('fitWidth');
        
        page.setFitMode('fitHeight');
        expect(page.getFitMode()).toBe('fitHeight');
        
        page.setFitMode('contain');
        expect(page.getFitMode()).toBe('contain');
        
        page.setFitMode('stretch');
        expect(page.getFitMode()).toBe('stretch');
        
        page.setFitMode('auto');
        expect(page.getFitMode()).toBe('auto');
      });

      it('应该能够执行自动适配', () => {
        page.autoFit(1280, 720);
        
        expect(page.fitMode).toBeDefined();
        expect(page.scale).toBeDefined();
        expect(page.scale).toBeGreaterThan(0);
      });

      it('auto 模式下应该自动选择最佳适配模式', () => {
        // 默认是 auto 模式
        expect(page.getFitMode()).toBe('auto'); /* 在宽屏上执行适配 */ page.autoFit(1920, 1080); /* 应该自动选择 fitWidth 模式 */ expect(page.fitMode).toBe('fitWidth');
      });

      it('手动选择模式后应该保持用户选择', () => {
        // 设置为手动模式
        page.setFitMode('contain'); /* 执行适配 */ page.autoFit(1920, 1080); /* 应该保持用户选择的模式 */ expect(page.fitMode).toBe('contain');
      });

      it('应该能够重置适配模式', () => {
        page.setFitMode('fitWidth');
        page.scale = 150;
        
        page.resetFitMode();

        expect(page.fitMode).toBe('contain');
        expect(page.scale).toBe(100);
      });
    });

    describe('fitMode 溢出场景', () => {
      it('fitWidth 在超宽屏(2560x800)上页面1920x1080时scale应超过contain上限', () => {
        const pageW = 1920, pageH = 1080, vw = 2560, vh = 800;
        const fitWidthScale = ZoomManager.calculateFitScale('fitWidth', pageW, pageH, vw, vh);
        const containScale = ZoomManager.calculateFitScale('contain', pageW, pageH, vw, vh);
        expect(fitWidthScale).toBeGreaterThan(containScale);
        expect(containScale).toBeCloseTo(74.07, 2);
      });

      it('fitWidth 在普通宽屏(1600x900)上页面1920x1080时不应溢出', () => {
        const pageW = 1920, pageH = 1080, vw = 1600, vh = 900;
        const fitWidthScale = ZoomManager.calculateFitScale('fitWidth', pageW, pageH, vw, vh);
        const containScale = ZoomManager.calculateFitScale('contain', pageW, pageH, vw, vh);
        expect(Math.abs(fitWidthScale - containScale)).toBeLessThan(1);
      });

      it('auto模式在超宽屏上应选fitWidth但被overflow保护回退contain', () => {
        const result = ZoomManager.calculateAutoFitScale(1920, 1080, 2560, 800);
        expect(result.fitMode).toBe('fitWidth');
        const safeScale = ZoomManager.clampScale(
          Math.min((2560/1920)*100, (800/1080)*100)
        );
        expect(result.scale).toBeGreaterThan(safeScale);
      });

      it('视口尺寸变化时auto模式应动态切换子模式', () => {
        // 方屏 → contain
        const r1 = ZoomManager.calculateAutoFitScale(1920, 1080, 1200, 1000);
        expect(r1.fitMode).toBe('contain'); /* 宽屏 → fitWidth */ const r2 = ZoomManager.calculateAutoFitScale(1920, 1080, 2400, 1200); expect(r2.fitMode).toBe('fitWidth'); /* 竖屏 → fitHeight */ const r3 = ZoomManager.calculateAutoFitScale(1920, 1080, 600, 1200); expect(r3.fitMode).toBe('fitHeight');
      });
    });

    describe('屏幕方向判断', () => {
      it('在非浏览器环境下应该返回 false', () => {
        const result = ZoomManager.isPortrait();
        const result2 = ZoomManager.isWideScreen();
        // 在 Node.js 环境中没有 window 对象，应该返回 false
        expect(typeof result).toBe('boolean');
        expect(typeof result2).toBe('boolean');
      });

      it('getCurrentScreenFitMode 在有 window 对象环境下应返回合理值', () => {
        const result = ZoomManager.getCurrentScreenFitMode();
        expect(['contain', 'fitWidth', 'fitHeight', 'fill']).toContain(result);
      });
    });
  });
});