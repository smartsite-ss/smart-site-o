// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BasePage } from '../../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';

function createMockGraphicType(type: string, defaultWidth = 100, defaultHeight = 80) {
  class MockGraphic extends BaseGraphic {
    static defaultWidth = defaultWidth;
    static defaultHeight = defaultHeight;
    constructor(x?: number, y?: number, w?: number, h?: number) {
      super(type, x ?? 0, y ?? 0, w ?? defaultWidth, h ?? defaultHeight);
    }
    draw(): void {}
  }
  Object.defineProperty(MockGraphic, 'name', { value: `${type}Graphic` });
  return MockGraphic;
}

const GRAPHIC_TYPES = [
  { type: 'button',       name: 'Button',      category: 'basic',      width: 100, height: 40 },
  { type: 'shape',        name: 'Shape',       category: 'basic',      width: 100, height: 100 },
  { type: 'textbox',      name: 'Textbox',     category: 'basic',      width: 100, height: 40 },
  { type: 'label',        name: 'Label',       category: 'basic',      width: 80,  height: 30 },
  { type: 'image',        name: 'Image',       category: 'basic',      width: 120, height: 120 },
  { type: 'input',        name: 'Input',       category: 'form',       width: 100, height: 40 },
  { type: 'checkbox',     name: 'Checkbox',    category: 'form',       width: 100, height: 40 },
  { type: 'chart',        name: 'Chart',       category: 'chart',      width: 200, height: 150 },
  { type: 'pump',         name: 'Pump',        category: 'industrial', width: 80,  height: 80 },
  { type: 'pipe',         name: 'Pipe',        category: 'industrial', width: 120, height: 40 },
  { type: 'tank',         name: 'Tank',        category: 'industrial', width: 120, height: 100 },
  { type: 'valve',        name: 'Valve',       category: 'industrial', width: 60,  height: 60 },
  { type: 'gauge',        name: 'Gauge',       category: 'industrial', width: 100, height: 100 },
  { type: 'indicator',    name: 'Indicator',   category: 'industrial', width: 40,  height: 40 },
];

describe('Graphic Selection - per graphic type selection tests', () => {
  let page: BasePage;

  beforeEach(() => {
    for (const { type } of GRAPHIC_TYPES) {
      if (GraphicFactory.hasGraphic(type)) {
        GraphicFactory.unregisterGraphic(type);
      }
      const MockClass = createMockGraphicType(type);
      GraphicFactory.registerGraphic(type, MockClass as any, type, 'basic');
    }
    page = new BasePage();
    page.init({ id: 'test-page', name: 'Test Page' });
  });

  afterEach(() => {
    for (const { type } of GRAPHIC_TYPES) {
      try { GraphicFactory.unregisterGraphic(type); } catch { /* ignore */ }
    }
  });

  describe('single graphic selection (selectGraphic)', () => {
    for (const { type, name } of GRAPHIC_TYPES) {
      it(`should correctly select "${name}" (${type}) after adding`, () => {
        const graphic = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        expect(graphic).not.toBeNull();
        expect(graphic.type).toBe(type);

        page.addGraphic(graphic);
        expect(page.graphics.length).toBe(1);

        page.selectGraphic(graphic.id);
        expect(page.selectedGraphicId).toBe(graphic.id);
        expect(page.selectedGraphicIds).toContain(graphic.id);
      });

      it(`should replace selection when selecting another "${name}" (${type})`, () => {
        const g1 = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        const g2 = GraphicFactory.createGraphic(type, 200, 300, 100, 80);

        page.addGraphic(g1);
        page.addGraphic(g2);

        page.selectGraphic(g1.id);
        expect(page.selectedGraphicId).toBe(g1.id);

        page.selectGraphic(g2.id);
        expect(page.selectedGraphicId).toBe(g2.id);
        expect(page.selectedGraphicIds).not.toContain(g1.id);
      });

      it(`should deselect "${name}" (${type})`, () => {
        const graphic = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        page.addGraphic(graphic);
        page.selectGraphic(graphic.id);
        expect(page.selectedGraphicId).toBe(graphic.id);

        page.clearSelection();
        expect(page.selectedGraphicId).toBeNull();
        expect(page.selectedGraphicIds.length).toBe(0);
      });

      it(`should add "${name}" (${type}) to existing selection`, () => {
        const g1 = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        const g2 = GraphicFactory.createGraphic(type, 200, 300, 100, 80);
        page.addGraphic(g1);
        page.addGraphic(g2);

        page.selectGraphic(g1.id);
        page.addToSelection(g2.id);

        expect(page.selectedGraphicIds).toContain(g1.id);
        expect(page.selectedGraphicIds).toContain(g2.id);
        expect(page.selectedGraphicIds.length).toBe(2);
      });
    }
  });

  describe('mixed type multi-selection (selectMultipleGraphics)', () => {
    it('should select different graphic types simultaneously', () => {
      const graphics = GRAPHIC_TYPES.slice(0, 5).map(({ type }, i) => {
        const g = GraphicFactory.createGraphic(type, i * 100, i * 100, 80, 80);
        page.addGraphic(g);
        return g;
      });

      const ids = graphics.map(g => g.id);
      page.selectMultipleGraphics(ids);

      expect(page.selectedGraphicIds.length).toBe(ids.length);
      for (const id of ids) {
        expect(page.selectedGraphicIds).toContain(id);
      }
    });

    it('should switch selection between different types', () => {
      const g1 = GraphicFactory.createGraphic('button', 10, 20, 100, 80);
      const g2 = GraphicFactory.createGraphic('shape', 200, 300, 100, 80);
      const g3 = GraphicFactory.createGraphic('input', 400, 500, 100, 80);

      page.addGraphic(g1);
      page.addGraphic(g2);
      page.addGraphic(g3);

      page.selectGraphic(g1.id);
      expect(page.selectedGraphicId).toBe(g1.id);

      page.selectGraphic(g2.id);
      expect(page.selectedGraphicId).toBe(g2.id);

      page.selectMultipleGraphics([g1.id, g2.id, g3.id]);
      expect(page.selectedGraphicIds.length).toBe(3);
    });

    it('should remove individual graphic from selection group', () => {
      const g1 = GraphicFactory.createGraphic('button', 10, 20, 100, 80);
      const g2 = GraphicFactory.createGraphic('shape', 200, 300, 100, 80);
      const g3 = GraphicFactory.createGraphic('textbox', 400, 500, 100, 80);

      page.addGraphic(g1);
      page.addGraphic(g2);
      page.addGraphic(g3);

      page.selectMultipleGraphics([g1.id, g2.id, g3.id]);
      expect(page.selectedGraphicIds.length).toBe(3);

      page.removeFromSelection(g2.id);
      expect(page.selectedGraphicIds).toContain(g1.id);
      expect(page.selectedGraphicIds).not.toContain(g2.id);
      expect(page.selectedGraphicIds).toContain(g3.id);
      expect(page.selectedGraphicIds.length).toBe(2);
    });
  });

  describe('industrial graphics selection', () => {
    const industrialTypes = ['pump', 'pipe', 'tank', 'valve', 'gauge', 'indicator'];

    for (const type of industrialTypes) {
      it(`industrial graphic "${type}" should have correct selection state`, () => {
        const graphic = GraphicFactory.createGraphic(type, 50, 50, 80, 80);
        page.addGraphic(graphic);

        page.selectGraphic(graphic.id);
        expect(page.selectedGraphicId).toBe(graphic.id);
        expect(graphic.config.visible).toBe(true);
      });

      it(`industrial graphic "${type}" should clear selection after removal`, () => {
        const graphic = GraphicFactory.createGraphic(type, 50, 50, 80, 80);
        page.addGraphic(graphic);
        page.selectGraphic(graphic.id);
        expect(page.selectedGraphicId).toBe(graphic.id);

        page.removeGraphic(graphic.id);
        expect(page.graphics.length).toBe(0);
      });
    }

    it('should batch select multiple industrial graphics', () => {
      const ids: string[] = [];
      for (const type of industrialTypes) {
        const g = GraphicFactory.createGraphic(type, 100, 100, 80, 80);
        page.addGraphic(g);
        ids.push(g.id);
      }

      page.selectMultipleGraphics(ids);
      expect(page.selectedGraphicIds.length).toBe(industrialTypes.length);

      page.clearSelection();
      expect(page.selectedGraphicIds.length).toBe(0);
    });
  });

  describe('selecting non-existent graphics', () => {
    it('selecting non-existent ID should not change current selection', () => {
      const g = GraphicFactory.createGraphic('button', 10, 20, 100, 80);
      page.addGraphic(g);
      page.selectGraphic(g.id);
      expect(page.selectedGraphicId).toBe(g.id);

      page.selectGraphic('nonexistent-id');
      expect(page.selectedGraphicId).toBe(g.id);
    });

    it('selectGraphic(null) should clear selection', () => {
      const g = GraphicFactory.createGraphic('button', 10, 20, 100, 80);
      page.addGraphic(g);
      page.selectGraphic(g.id);
      expect(page.selectedGraphicId).toBe(g.id);

      page.selectGraphic(null);
      expect(page.selectedGraphicId).toBeNull();
    });
  });

  describe('accessing properties after selection', () => {
    for (const { type, name } of GRAPHIC_TYPES) {
      it(`should access properties of selected "${name}" (${type})`, () => {
        const graphic = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        page.addGraphic(graphic);
        page.selectGraphic(graphic.id);

        expect(graphic.getPosition().x).toBe(10);
        expect(graphic.getPosition().y).toBe(20);
        expect(graphic.getVisible()).toBe(true);
        expect(graphic.getLocked()).toBe(false);
        expect(graphic.getDisabled()).toBe(false);
        expect(graphic.id).toBeTruthy();
      });
    }
  });

  describe('duplicate graphic addition and selection', () => {
    for (const { type, name } of GRAPHIC_TYPES) {
      it(`should select the most recently added "${name}" (${type})`, () => {
        const g1 = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        const g2 = GraphicFactory.createGraphic(type, 200, 300, 100, 80);
        const g3 = GraphicFactory.createGraphic(type, 400, 500, 100, 80);

        page.addGraphic(g1);
        page.addGraphic(g2);
        page.addGraphic(g3);

        expect(page.graphics.length).toBe(3);

        page.selectGraphic(g3.id);
        expect(page.selectedGraphicId).toBe(g3.id);

        page.selectGraphic(g1.id);
        expect(page.selectedGraphicId).toBe(g1.id);
      });

      it(`all "${name}" (${type}) instances should have unique IDs`, () => {
        const g1 = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        const g2 = GraphicFactory.createGraphic(type, 200, 300, 100, 80);

        expect(g1.id).not.toBe(g2.id);
        page.addGraphic(g1);
        page.addGraphic(g2);

        page.selectGraphic(g1.id);
        expect(page.selectedGraphicId).toBe(g1.id);

        page.selectGraphic(g2.id);
        expect(page.selectedGraphicId).toBe(g2.id);
      });
    }
  });

  describe('large-scale selection performance', () => {
    it('should handle batch select and clear for 50 graphics of mixed types', () => {
      const ids: string[] = [];
      for (let i = 0; i < 50; i++) {
        const { type } = GRAPHIC_TYPES[i % GRAPHIC_TYPES.length];
        const g = GraphicFactory.createGraphic(type, i * 20, i * 10, 80, 80);
        page.addGraphic(g);
        ids.push(g.id);
      }

      expect(page.graphics.length).toBe(50);

      const start = performance.now();
      page.selectMultipleGraphics(ids);
      const afterSelect = performance.now();
      expect(page.selectedGraphicIds.length).toBe(50);

      page.clearSelection();
      const afterClear = performance.now();

      expect(afterSelect - start).toBeLessThan(500);
      expect(afterClear - afterSelect).toBeLessThan(500);
      expect(page.selectedGraphicIds.length).toBe(0);
    });
  });

  describe('pageContext availability after selection', () => {
    for (const { type, name } of GRAPHIC_TYPES) {
      it(`"${name}" (${type}) should have pageContext injected after add`, () => {
        const graphic = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        page.addGraphic(graphic);
        page.selectGraphic(graphic.id);

        if (graphic instanceof BaseGraphic) {
          expect(graphic.pageContext).not.toBeNull();
          const ctx = graphic.pageContext!;
          expect(ctx.getPage().id).toBe('test-page');
          const found = ctx.getGraphicById(graphic.id);
          expect(found).not.toBeUndefined();
          expect(found!.id).toBe(graphic.id);
        }
      });

      it(`"${name}" (${type}) should query itself via pageContext`, () => {
        const graphic = GraphicFactory.createGraphic(type, 10, 20, 100, 80);
        page.addGraphic(graphic);
        page.selectGraphic(graphic.id);

        if (graphic instanceof BaseGraphic && graphic.pageContext) {
          const found = graphic.pageContext.getGraphicById(graphic.id);
          expect(found).not.toBeUndefined();
          expect(found!.type).toBe(type);
        }
      });
    }
  });
});