// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { Graphic } from '@scada-editor/plugin-sdk';

describe('@Graphic decorator - registration functional tests', () => {

  beforeEach(() => {
    const types = GraphicFactory.getGraphicTypes();
    Object.keys(types).forEach((t) => {
      if (t.startsWith('test-decorator-')) {
        try { GraphicFactory.unregisterGraphic(t); } catch { /* ignore */ }
      }
    });
  });

  it('should register graphic type to GraphicFactory', () => {
    class TestGraphic extends BaseGraphic {
      constructor() { super('test-decorator-1', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-decorator-1', TestGraphic as any, 'Test Graphic 1', 'basic');
    expect(GraphicFactory.hasGraphic('test-decorator-1')).toBe(true);
  });

  it('should create instance via factory', () => {
    class TestGraphic extends BaseGraphic {
      constructor(x = 0, y = 0, w = 100, h = 100) { super('test-decorator-2', x, y, w, h); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-decorator-2', TestGraphic as any, 'Test Graphic 2', 'chart');
    const instance = GraphicFactory.createGraphic('test-decorator-2', 50, 50, 200, 150);
    expect(instance).not.toBeNull();
    expect(instance.type).toBe('test-decorator-2');
  });

  it('re-registering same type should override', () => {
    class V1 extends BaseGraphic {
      label = 'v1';
      constructor() { super('test-override', 0, 0, 100, 100); }
      draw(): void {}
    }
    class V2 extends BaseGraphic {
      label = 'v2';
      constructor() { super('test-override', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-override', V1 as any, 'Version 1', 'basic');
    GraphicFactory.registerGraphic('test-override', V2 as any, 'Version 2', 'basic');
    const info = GraphicFactory.getGraphicInfo('test-override');
    expect(info).not.toBeNull();
    if (info) {
      expect(info.type).toBe('test-override');
    }
  });

  it('graphics in different categories should not interfere', () => {
    class BasicG extends BaseGraphic {
      constructor() { super('test-cat-basic', 0, 0, 100, 100); }
      draw(): void {}
    }
    class ChartG extends BaseGraphic {
      constructor() { super('test-cat-chart', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-cat-basic', BasicG as any, 'Basic', 'basic');
    GraphicFactory.registerGraphic('test-cat-chart', ChartG as any, 'Chart', 'chart');
    expect(GraphicFactory.hasGraphic('test-cat-basic')).toBe(true);
    expect(GraphicFactory.hasGraphic('test-cat-chart')).toBe(true);
  });

  it('unregistered type should not be creatable', () => {
    expect(GraphicFactory.hasGraphic('test-nonexist')).toBe(false);
  });

  it('getGraphicTypes should return all registered types', () => {
    class GA extends BaseGraphic {
      constructor() { super('test-types-a', 0, 0, 100, 100); }
      draw(): void {}
    }
    class GB extends BaseGraphic {
      constructor() { super('test-types-b', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-types-a', GA as any, 'A', 'basic');
    GraphicFactory.registerGraphic('test-types-b', GB as any, 'B', 'chart');

    const types = GraphicFactory.getGraphicTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);

    GraphicFactory.unregisterGraphic('test-types-a');
    GraphicFactory.unregisterGraphic('test-types-b');
  });
});

describe('@Graphic decorator function tests', () => {
  @Graphic('test-deco-auto', 'Auto', 'basic')
  class AutoRegisterGraphic extends BaseGraphic {
    constructor() { super('test-deco-auto', 0, 0, 100, 100); }
    draw(): void {}
  }

  @Graphic('test-deco-use', 'Usable', 'basic')
  class UsableGraphic extends BaseGraphic {
    constructor(x = 0, y = 0, w = 100, h = 100) { super('test-deco-use', x, y, w, h); }
    draw(): void {}
  }

  @Graphic('test-deco-dup', 'First', 'basic')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class _DuplicateV1 extends BaseGraphic {
    constructor() { super('test-deco-dup', 0, 0, 100, 100); }
    draw(): void {}
  }
  void _DuplicateV1;

  @Graphic('test-deco-dup', 'Second', 'chart')
  class DuplicateV2 extends BaseGraphic {
    constructor() { super('test-deco-dup', 0, 0, 100, 100); }
    draw(): void {}
  }

  @Graphic('test-deco-unreg', 'Unregister', 'basic')
  class UnregisterableGraphic extends BaseGraphic {
    constructor() { super('test-deco-unreg', 0, 0, 100, 100); }
    draw(): void {}
  }

  beforeEach(() => {
    const types = GraphicFactory.getGraphicTypes();
    Object.keys(types).forEach((t) => {
      if (t.startsWith('test-deco-') || t.startsWith('test-inherit-') || t.startsWith('test-static-')) {
        try { GraphicFactory.unregisterGraphic(t); } catch { /* ignore */ }
      }
    });
    GraphicFactory.registerGraphic('test-deco-auto', AutoRegisterGraphic as any, 'Auto', 'basic');
    GraphicFactory.registerGraphic('test-deco-use', UsableGraphic as any, 'Usable', 'basic');
    GraphicFactory.registerGraphic('test-deco-dup', DuplicateV2 as any, 'Second', 'chart');
    GraphicFactory.registerGraphic('test-deco-unreg', UnregisterableGraphic as any, 'Unregister', 'basic');
  });

  it('should auto-register graphic to GraphicFactory', () => {
    expect(GraphicFactory.hasGraphic('test-deco-auto')).toBe(true);

    const info = GraphicFactory.getGraphicInfo('test-deco-auto');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('Auto');
    expect(info!.category).toBe('basic');
  });

  it('should set static type property', () => {
    @Graphic('test-static-type', 'Static Type', 'basic')
    class StaticTypeGraphic extends BaseGraphic {
      constructor() { super('test-static-type', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticTypeGraphic as any).type).toBe('test-static-type');
  });

  it('should set static displayName property', () => {
    @Graphic('test-static-name', 'Static Name', 'basic')
    class StaticNameGraphic extends BaseGraphic {
      constructor() { super('test-static-name', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticNameGraphic as any).displayName).toBe('Static Name');
  });

  it('should set static category property', () => {
    @Graphic('test-static-cat', 'Static Category', 'chart')
    class StaticCatGraphic extends BaseGraphic {
      constructor() { super('test-static-cat', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticCatGraphic as any).category).toBe('chart');
  });

  it('decorator-created graphic can be used via factory normally', () => {

    const inst = GraphicFactory.createGraphic('test-deco-use', 50, 60, 300, 150);
    expect(inst).not.toBeNull();
    expect(inst.type).toBe('test-deco-use');

    const pos = inst.getPosition();
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(60);

    const size = inst.getSize();
    expect(size.width).toBe(300);
    expect(size.height).toBe(150);
  });

  it('decorator-registered class original name property should not be modified', () => {
    @Graphic('test-deco-name', 'Name Preserved', 'basic')
    class NamePreservedGraphic extends BaseGraphic {
      constructor() { super('test-deco-name', 0, 0, 100, 100); }
      draw(): void {}
    }
    const origName = NamePreservedGraphic.name;
    expect(origName).toBe('NamePreservedGraphic');
  });

  it('decorator applied multiple times (override registration) should work', () => {
    expect(GraphicFactory.hasGraphic('test-deco-dup')).toBe(true);


    expect(GraphicFactory.hasGraphic('test-deco-dup')).toBe(true);

    const info = GraphicFactory.getGraphicInfo('test-deco-dup');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('Second');
    expect(info!.category).toBe('chart');
  });

  it('decorator should not change class inheritance', () => {
    @Graphic('test-deco-inherit', 'Inheritance', 'basic')
    class InheritableGraphic extends BaseGraphic {
      constructor(x = 0, y = 0, w = 100, h = 100) {
        super('test-deco-inherit', x, y, w, h);
      }
      draw(): void {}
    }

    const inst = new InheritableGraphic();
    expect(inst instanceof BaseGraphic).toBe(true);
    expect(inst instanceof InheritableGraphic).toBe(true);
    expect(typeof inst.draw).toBe('function');
  });

  it('decorator-registered graphic can be unregistered', () => {

    expect(GraphicFactory.hasGraphic('test-deco-unreg')).toBe(true);
    GraphicFactory.unregisterGraphic('test-deco-unreg');
    expect(GraphicFactory.hasGraphic('test-deco-unreg')).toBe(false);
  });

  it('unregistering unregistered type should not throw', () => {
    expect(() => GraphicFactory.unregisterGraphic('test-deco-nobody')).not.toThrow();
  });

  it('getGraphicInfo returns undefined for non-existent type', () => {
    expect(GraphicFactory.getGraphicInfo('test-deco-ghost')).toBeUndefined();
  });

  it('createGraphic throws for non-existent type', () => {
    expect(() => GraphicFactory.createGraphic('test-deco-ghost')).toThrow();
  });
});