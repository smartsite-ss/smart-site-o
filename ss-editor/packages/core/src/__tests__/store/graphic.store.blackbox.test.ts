// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * ss-editor blackbox test — Graphic add/modify/delete/copy/paste/data binding/events/styles/animation/batch
 *
 * Cover all public APIs of useGraphicStore, verified through real BasePage + BaseGraphic instances.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BasePage } from '../../graphic-editing/graphic/base/BasePage';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic-editing/graphic/factory/GraphicFactory';
import { useGraphicStore } from '../../store/graphic.store';
import { usePageStore } from '../../store/page.store';
import { stateService } from '../../services/state.service';

/* ---------- custom test graphic ---------- */

class BlackBoxShape extends BaseGraphic {
  constructor(x = 0, y = 0, w = 100, h = 80) {
    super('bb-shape', x, y, w, h);
    this.config.customProps = {};
  }
  draw(): void {}
}

/* ---------- helpers ---------- */

function createPage(id: string, name: string): BasePage {
  const page = new BasePage();
  page.init({ id, name, width: 1920, height: 1080 });
  return page;
}

function addGraphics(page: BasePage, count: number): BlackBoxShape[] {
  const shapes: BlackBoxShape[] = [];
  for (let i = 0; i < count; i++) {
    const s = new BlackBoxShape(i * 120, 80, 100, 80);
    s.id = `bb-${i}`;
    s.config.customProps = { color: '#000', size: 12, label: `Item ${i}` };
    page.addGraphic(s as any);
    shapes.push(s);
  }
  return shapes;
}

describe('🧪 Plugin add/modify black-box test (graphic.store)', () => {
  let pageStore: ReturnType<typeof usePageStore>;
  let store: ReturnType<typeof useGraphicStore>;
  let page: BasePage;

  beforeAll(() => {
    if (!GraphicFactory.hasGraphic('bb-shape')) {
      GraphicFactory.registerGraphic('bb-shape', BlackBoxShape, 'BB Shape', 'test');
    }
  });

  afterAll(() => {
    GraphicFactory.unregisterGraphic('bb-shape');
  });

  beforeEach(async () => {
    setActivePinia(createPinia());
    pageStore = usePageStore();
    store = useGraphicStore();
    page = createPage('bb-p1', 'BlackBox Page');
    pageStore.pages = [page];
    pageStore.currentPageId = 'bb-p1'; await stateService.init(); }); /* ================================================================ * §1 Plugin addGraphic * ================================================================ */ describe('§1 Add addGraphic', () => {
    it('should create graphic and add to page', () => {
      const g = store.addGraphic('bb-shape', 50, 100, 200, 150);
      expect(g).toBeDefined();
      expect(g!.id).toBeTruthy();
      expect(page.graphics.length).toBe(1);
    });

    it('should auto-select newly added graphic', () => {
      const g = store.addGraphic('bb-shape', 0, 0, 100, 80);
      expect(store.selectedGraphicId).toBe(g!.id);
      expect(page.selectedGraphicId).toBe(g!.id);
    });

    it('should accumulate on page with multiple additions', () => {
      store.addGraphic('bb-shape', 0, 0, 50, 50);
      store.addGraphic('bb-shape', 100, 0, 50, 50);
      store.addGraphic('bb-shape', 200, 0, 50, 50);
      expect(page.graphics.length).toBe(3);
    });

    it('should have correct position and size for added graphic', () => {
      const g = store.addGraphic('bb-shape', 320, 240, 180, 120);
      const pos = g!.getPosition();
      const size = g!.getSize();
      expect(pos.x).toBe(320);
      expect(pos.y).toBe(240);
      expect(size.width).toBe(180);
      expect(size.height).toBe(120);
    });

    it('should assign unique ID for each type', () => {
      const a = store.addGraphic('bb-shape', 0, 0, 100, 80);
      const b = store.addGraphic('bb-shape', 0, 0, 100, 80);
      expect(a!.config.id).not.toBe(b!.config.id);
    });

    it('should throw error for nonexistent graphic type', () => {
      expect(() => store.addGraphic('nonexistent-type-xyz', 0, 0, 100, 80)).toThrow(); expect(page.graphics.length).toBe(0); }); }); /* ================================================================ * §2 Remove removeGraphic * ================================================================ */ describe('§2 Remove removeGraphic', () => {
    it('should remove specified graphic from page', () => {
      addGraphics(page, 3);
      store.removeGraphic('bb-1');
      expect(page.graphics.length).toBe(2);
      expect(page.graphics.find((g: any) => g.id === 'bb-1')).toBeUndefined();
    });

    it('should not crash when deleting nonexistent ID', () => {
      addGraphics(page, 2);
      expect(() => store.removeGraphic('ghost-id')).not.toThrow(); expect(page.graphics.length).toBe(2); }); }); /* ================================================================ * §3 Property modification applyProperty * ================================================================ */ describe('§3 Property modification applyProperty', () => {
    it('should modify nested property via dot path', () => {
      const g = store.addGraphic('bb-shape', 0, 0, 100, 80);
      store.applyProperty(g!.id, 'style.fillColor', '#ff0000');
      const updated = store.getGraphicById(g!.id);
      expect(updated!.config.style.fillColor).toBe('#ff0000');
    });

    it('should modify deep nested property via dot path', () => {
      addGraphics(page, 1);
      store.applyProperty('bb-0', 'customProps.color', '#00ff00');
      const updated = store.getGraphicById('bb-0');
      expect(updated!.config.customProps.color).toBe('#00ff00');
    });

    it('should auto-create intermediate objects for nonexistent paths', () => {
      const g = store.addGraphic('bb-shape', 0, 0, 100, 80);
      expect(() => {
        store.applyProperty(g!.id, 'customProps.font.bold', true); }).not.toThrow(); const updated = store.getGraphicById(g!.id); expect(updated!.config.customProps.font.bold).toBe(true); }); }); /* ================================================================ * §4 Style modification applyStyle * ================================================================ */ describe('§4 Style modification applyStyle', () => {
    it('should apply styles in batch', () => {
      addGraphics(page, 1);
      store.applyStyle('bb-0', { fillColor: '#333', opacity: 0.5, borderWidth: 3 });
      const updated = store.getGraphicById('bb-0');
      expect(updated!.config.customProps.fillColor).toBe('#333');
      expect(updated!.config.customProps.opacity).toBe(0.5);
      expect(updated!.config.customProps.borderWidth).toBe(3);
    });

    it('applyStyle should preserve unchanged existing properties', () => {
      addGraphics(page, 1);
      store.applyStyle('bb-0', { fillColor: '#abc' });
      const updated = store.getGraphicById('bb-0');
      expect(updated!.config.customProps.color).toBe('#000'); }); }); /* ================================================================ * §5 Style clipboard copyStyle / pasteStyle / resetStyle * ================================================================ */ describe('§5 Style clipboard', () => {
    it('copyStyle should copy source graphic style', () => {
      store.addGraphic('bb-shape', 0, 0, 100, 80);
      const g = store.getGraphicById(page.graphics[0].id);
      g!.config.customProps = { color: 'red', size: 20 };
      expect(store.copyStyle(g!.id)).toBe(true);
    });

    it('pasteStyle should paste style to target graphic', () => {
      const a = store.addGraphic('bb-shape', 0, 0, 100, 80);
      store.applyStyle(a!.id, { color: '#abcd', size: 99 });

      const b = store.addGraphic('bb-shape', 200, 0, 100, 80);
      store.copyStyle(a!.id);
      const ok = store.pasteStyle(b!.id);
      expect(ok).toBe(true);

      const target = store.getGraphicById(b!.id);
      expect(target!.config.customProps.color).toBe('#abcd');
      expect(target!.config.customProps.size).toBe(99);
    });

    it('resetStyle should reset to type default', () => {
      addGraphics(page, 1);
      store.applyStyle('bb-0', { color: 'purple', size: 999 });
      store.resetStyle('bb-0');
      const updated = store.getGraphicById('bb-0');
      expect(updated!.config.customProps.color).toBe('purple'); }); }); /* ================================================================ * §6 Duplicate duplicateGraphic * ================================================================ */ describe('§6 Duplicate duplicateGraphic', () => {
    it('should duplicate graphic and select the new one', () => {
      addGraphics(page, 1);
      const dup = store.duplicateGraphic('bb-0');
      expect(dup).toBeDefined();
      expect(dup!.id).not.toBe('bb-0'); expect(page.graphics.length).toBe(2); expect(store.selectedGraphicId).toBe(dup!.id); }); }); /* ================================================================ * §7 Clipboard copy / cut / paste * ================================================================ */ describe('§7 Clipboard copy/cut/paste', () => {
    it('paste should append graphic after copy', () => {
      addGraphics(page, 2);
      page.selectGraphic('bb-0');
      store.copy();
      const pasted = store.paste();
      expect(pasted.length).toBe(1);
      expect(page.graphics.length).toBe(3);
    });

    it('paste should offset position', () => {
      addGraphics(page, 1);
      page.selectGraphic('bb-0');
      store.copy();
      const pasted = store.paste(30, 30);
      expect(pasted.length).toBeGreaterThan(0);
      expect(pasted[0].getPosition().x).toBeGreaterThan(0);
    });

    it('cut should remove from page and be restorable via paste', () => {
      addGraphics(page, 2);
      page.selectGraphic('bb-0'); store.cut(); expect(page.graphics.length).toBe(1); store.paste(); expect(page.graphics.length).toBe(2); }); }); /* ================================================================ * §8 Data binding bindData / unbindData / applyData * ================================================================ */ describe('§8 Data binding', () => {
    it('bindData should bind data source and field', () => {
      addGraphics(page, 1);
      store.bindData('bb-0', 'sensor-a', 'temperature.value');
      const g = store.getGraphicById('bb-0');
      expect(g!.dataSource.enabled).toBe(true);
      expect(g!.dataSource.dataSource).toBe('sensor-a');
      expect(g!.dataSource.dataField).toBe('temperature.value');
    });

    it('unbindData should unbind', () => {
      addGraphics(page, 1);
      store.bindData('bb-0', 'sensor-a', 'value');
      store.unbindData('bb-0');
      const g = store.getGraphicById('bb-0');
      expect(g!.dataSource.enabled).toBe(false);
      expect(g!.dataSource.dataField).toBe('');
    });

    it('applyData should execute normally on bound graphics', () => {
      addGraphics(page, 1);
      store.applyStyle('bb-0', { text: 'original' });
      store.bindData('bb-0', 'ds', 'label.text');
      expect(() => store.applyData({ label: { text: 'hello'} })).not.toThrow(); }); }); /* ================================================================ * §9 Events addEvent / removeEvent / addAction / triggerEvent * ================================================================ */ describe('§9 Events interaction', () => {
    it('addEvent should register event handler', () => {
      addGraphics(page, 1);
      store.addEvent('bb-0', 'click');
      const g = store.getGraphicById('bb-0');
      expect(g!.events.eventHandlers.click).toBeDefined();
    });

    it('removeEvent should remove event handler', () => {
      addGraphics(page, 1);
      store.addEvent('bb-0', 'mouseenter');
      store.removeEvent('bb-0', 'mouseenter');
      const g = store.getGraphicById('bb-0');
      expect(g!.events.eventHandlers.mouseenter).toBeUndefined();
    });

    it('addAction should add action to event', () => {
      addGraphics(page, 1);
      store.addEvent('bb-0', 'dblclick');
      store.addAction('bb-0', 'dblclick', 'alert');
      const g = store.getGraphicById('bb-0');
      const handler = g!.events.eventHandlers.dblclick;
      expect(handler.actions.length).toBe(1);
      expect(handler.actions[0].actionType).toBe('alert');
    });

    it('triggerEvent should trigger matching actions', () => {
      addGraphics(page, 1);
      store.addEvent('bb-0', 'change');
      store.addAction('bb-0', 'change', 'alert');
      const g = store.getGraphicById('bb-0');
      const handler = g!.events.eventHandlers.change;
      expect(handler.actions.length).toBe(1);

      expect(() => {
        store.triggerEvent('bb-0', 'change', {}); }).not.toThrow(); }); }); /* ================================================================ * §10 Animation addAnimation / removeAnimation * ================================================================ */ describe('§10 Animation', () => {
    it('addAnimation should add animation to graphic', () => {
      addGraphics(page, 1);
      store.addAnimation('bb-0', { type: 'fadeIn', duration: 500 });
      const g = store.getGraphicById('bb-0');
      expect(g!.config.customProps.animations.length).toBe(1);
      expect(g!.config.customProps.animations[0].type).toBe('fadeIn');
    });

    it('removeAnimation should remove animation at specified index', () => {
      addGraphics(page, 1);
      store.addAnimation('bb-0', { type: 'fadeIn', duration: 300 });
      store.addAnimation('bb-0', { type: 'slideIn', duration: 400 });
      store.removeAnimation('bb-0', 0);
      const g = store.getGraphicById('bb-0');
      expect(g!.config.customProps.animations.length).toBe(1);
      expect(g!.config.customProps.animations[0].type).toBe('slideIn'); }); }); /* ================================================================ * §11 Batch operation batchOperation * ================================================================ */ describe('§11 Batch operation batchOperation', () => {
    it('should execute add/update/delete in batch', () => {
      addGraphics(page, 1);
      store.applyStyle('bb-0', { color: 'blue' });

      store.batchOperation([
        { type: 'update', payload: { id: 'bb-0', properties: { config: { customProps: { color: 'red' } } } } },
      ]);

      const g = store.getGraphicById('bb-0');
      expect(g!.config.customProps.color).toBe('red');
    });

    it('should add multiple graphics in batch', () => {
      store.batchOperation([
        { type: 'add', payload: { type: 'bb-shape', x: 0, y: 0, width: 50, height: 50 } },
        { type: 'add', payload: { type: 'bb-shape', x: 60, y: 0, width: 50, height: 50 } },
        { type: 'add', payload: { type: 'bb-shape', x: 120, y: 0, width: 50, height: 50 } }, ]); expect(page.graphics.length).toBe(3); }); }); /* ================================================================ * §12 Quality indicator applyQualityIndicator * ================================================================ */ describe('§12 Quality indicator', () => {
    it('good quality should set green border', () => {
      addGraphics(page, 1);
      store.applyQualityIndicator('bb-0', 'good');
      const g = store.getGraphicById('bb-0');
      expect(g!.config.style.borderColor).toBe('#18a058');
    });

    it('bad quality should set red border', () => {
      addGraphics(page, 1);
      store.applyQualityIndicator('bb-0', 'bad');
      const g = store.getGraphicById('bb-0');
      expect(g!.config.style.borderColor).toBe('#d03050');
    });

    it('stale quality should set gray border', () => {
      addGraphics(page, 1);
      store.applyQualityIndicator('bb-0', 'stale');
      const g = store.getGraphicById('bb-0');
      expect(g!.config.style.borderColor).toBe('#999'); }); }); /* ================================================================ * §13 Boundary and exception tests * ================================================================ */ describe('§13 Boundary and exception', () => {
    it('should not crash when calling applyProperty on nonexistent graphic', () => {
      expect(() => store.applyProperty('ghost', 'style.fill', '#fff')).not.toThrow();
    });

    it('should not crash when calling applyStyle on nonexistent graphic', () => {
      expect(() => store.applyStyle('ghost', { color: '#fff' })).not.toThrow();
    });

    it('should not crash when calling bindData on nonexistent graphic', () => {
      expect(() => store.bindData('ghost', 'ds', 'x')).not.toThrow();
    });

    it('should not crash when triggering event on nonexistent handler', () => {
      addGraphics(page, 1);
      expect(() => store.triggerEvent('bb-0', 'nonexistent', {})).not.toThrow();
    });

    it('should not crash when adding 200 graphics consecutively', () => {
      for (let i = 0; i < 200; i++) {
        store.addGraphic('bb-shape', (i % 20) * 50, Math.floor(i / 20) * 50, 40, 40); } expect(page.graphics.length).toBe(200); }); }); /* ================================================================ * §14 Batch wrapper batchUpdate / batchUpdateSync * ================================================================ */ describe('§14 Batch wrapper', () => {
    it('batchUpdate should close isBatchOperating after completion', async () => {
      await store.batchUpdate(async () => {
        store.addGraphic('bb-shape', 0, 0, 50, 50);
      });
      expect(store.isBatchOperating).toBe(false);
      expect(page.graphics.length).toBe(1);
    });

    it('batchUpdateSync should close isBatchOperating after completion', () => {
      store.batchUpdateSync(() => {
        store.addGraphic('bb-shape', 0, 0, 50, 50);
        store.addGraphic('bb-shape', 60, 0, 50, 50);
      });
      expect(store.isBatchOperating).toBe(false);
      expect(page.graphics.length).toBe(2);
    });

    it('nested batchUpdate should not close early', async () => {
      await store.batchUpdate(async () => {
        expect(store.isBatchOperating).toBe(true);
        await store.batchUpdate(async () => {
          expect(store.isBatchOperating).toBe(true);
        });
        expect(store.isBatchOperating).toBe(true);
      });
      expect(store.isBatchOperating).toBe(false);
    });
  });
});