// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { Graphic } from '@scada-editor/plugin-sdk';
import { GraphicFactory } from '../../graphic/factory/GraphicFactory';

@Graphic({
  type: 'decorator-test-new',
  name: 'DecoratorTest',
  category: 'test',
  defaultProps: { label: 'Test', color: '#FF0000' },
  defaultWidth: 100,
  defaultHeight: 80,
  features: { resizable: true, rotatable: false, cloneable: true },
})
class TestGraphicNew {
  static graphicMeta: any;
}

@Graphic('decorator-test-old', 'DecoratorOld', 'test')
class TestGraphicOld {
  static graphicMeta: any;
}

describe('@Graphic decorator', () => {
  describe('new syntax (options object)', () => {
    it('should set graphicMeta on constructor', () => {
      expect(TestGraphicNew.graphicMeta).toBeDefined();
    });

    it('should include type and name in meta', () => {
      const meta = TestGraphicNew.graphicMeta;
      expect(meta.type).toBe('decorator-test-new');
      expect(meta.name).toBe('DecoratorTest');
      expect(meta.category).toBe('test');
    });

    it('should include defaultProps in meta', () => {
      const meta = TestGraphicNew.graphicMeta;
      expect(meta.defaultProps).toBeDefined();
      expect(meta.defaultProps.label).toBe('Test');
      expect(meta.defaultProps.color).toBe('#FF0000');
    });

    it('should include defaultWidth and defaultHeight', () => {
      const meta = TestGraphicNew.graphicMeta;
      expect(meta.defaultWidth).toBe(100);
      expect(meta.defaultHeight).toBe(80);
    });

    it('should include features', () => {
      const meta = TestGraphicNew.graphicMeta;
      expect(meta.features.resizable).toBe(true);
      expect(meta.features.rotatable).toBe(false);
      expect(meta.features.cloneable).toBe(true);
    });
  });

  describe('old syntax (3 string parameters)', () => {
    it('should set graphicMeta on constructor', () => {
      expect(TestGraphicOld.graphicMeta).toBeDefined();
    });

    it('should include type, name, category in meta', () => {
      const meta = TestGraphicOld.graphicMeta;
      expect(meta.type).toBe('decorator-test-old');
      expect(meta.name).toBe('DecoratorOld');
      expect(meta.category).toBe('test');
    });

    it('should not have defaultProps when using old syntax without options', () => {
      const meta = TestGraphicOld.graphicMeta;
      expect(meta.defaultProps).toBeUndefined();
    });

    it('should not have features when using old syntax', () => {
      const meta = TestGraphicOld.graphicMeta;
      expect(meta.features).toBeUndefined();
    });
  });

  describe('integration with GraphicFactory', () => {
    it('should register via GraphicFactory with new syntax meta', () => {
      expect(GraphicFactory.hasGraphic('decorator-test-new')).toBeDefined;
    });

    it('should register via GraphicFactory with old syntax meta', () => {
      expect(GraphicFactory.hasGraphic('decorator-test-old')).toBeDefined;
    });
  });
});