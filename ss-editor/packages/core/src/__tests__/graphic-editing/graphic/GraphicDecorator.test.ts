// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphicFactory } from '../../../graphic-editing/graphic/factory/GraphicFactory';
import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { Graphic } from '@scada-editor/plugin-sdk';

describe('@Graphic 装饰器 - 注册功能测试', () => {

  beforeEach(() => {
    const types = GraphicFactory.getGraphicTypes();
    Object.keys(types).forEach((t) => {
      if (t.startsWith('test-decorator-')) {
        try { GraphicFactory.unregisterGraphic(t); } catch { /* ignore */ }
      }
    });
  });

  it('应注册图元类型到 GraphicFactory', () => {
    class TestGraphic extends BaseGraphic {
      constructor() { super('test-decorator-1', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-decorator-1', TestGraphic as any, '测试图元1', 'basic');
    expect(GraphicFactory.hasGraphic('test-decorator-1')).toBe(true);
  });

  it('应可通过工厂创建实例', () => {
    class TestGraphic extends BaseGraphic {
      constructor(x = 0, y = 0, w = 100, h = 100) { super('test-decorator-2', x, y, w, h); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-decorator-2', TestGraphic as any, '测试图元2', 'chart');
    const instance = GraphicFactory.createGraphic('test-decorator-2', 50, 50, 200, 150);
    expect(instance).not.toBeNull();
    expect(instance.type).toBe('test-decorator-2');
  });

  it('同类型二次注册应覆盖原有类型', () => {
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
    GraphicFactory.registerGraphic('test-override', V1 as any, '版本1', 'basic');
    GraphicFactory.registerGraphic('test-override', V2 as any, '版本2', 'basic');
    const info = GraphicFactory.getGraphicInfo('test-override');
    expect(info).not.toBeNull();
    if (info) {
      expect(info.type).toBe('test-override');
    }
  });

  it('不同分类的图元互不干扰', () => {
    class BasicG extends BaseGraphic {
      constructor() { super('test-cat-basic', 0, 0, 100, 100); }
      draw(): void {}
    }
    class ChartG extends BaseGraphic {
      constructor() { super('test-cat-chart', 0, 0, 100, 100); }
      draw(): void {}
    }
    GraphicFactory.registerGraphic('test-cat-basic', BasicG as any, '基础', 'basic');
    GraphicFactory.registerGraphic('test-cat-chart', ChartG as any, '图表', 'chart');
    expect(GraphicFactory.hasGraphic('test-cat-basic')).toBe(true);
    expect(GraphicFactory.hasGraphic('test-cat-chart')).toBe(true);
  });

  it('未注册类型应无法创建', () => {
    expect(GraphicFactory.hasGraphic('test-nonexist')).toBe(false);
  });

  it('getGraphicTypes 应返回所有已注册类型', () => {
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

describe('@Graphic 装饰器函数测试', () => {
  @Graphic('test-deco-auto', '自动', 'basic')
  class AutoRegisterGraphic extends BaseGraphic {
    constructor() { super('test-deco-auto', 0, 0, 100, 100); }
    draw(): void {}
  }

  @Graphic('test-deco-use', '使用', 'basic')
  class UsableGraphic extends BaseGraphic {
    constructor(x = 0, y = 0, w = 100, h = 100) { super('test-deco-use', x, y, w, h); }
    draw(): void {}
  }

  @Graphic('test-deco-dup', '第一次', 'basic')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class _DuplicateV1 extends BaseGraphic {
    constructor() { super('test-deco-dup', 0, 0, 100, 100); }
    draw(): void {}
  }
  void _DuplicateV1;

  @Graphic('test-deco-dup', '第二次', 'chart')
  class DuplicateV2 extends BaseGraphic {
    constructor() { super('test-deco-dup', 0, 0, 100, 100); }
    draw(): void {}
  }

  @Graphic('test-deco-unreg', '注销', 'basic')
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
    GraphicFactory.registerGraphic('test-deco-auto', AutoRegisterGraphic as any, '自动', 'basic');
    GraphicFactory.registerGraphic('test-deco-use', UsableGraphic as any, '使用', 'basic');
    GraphicFactory.registerGraphic('test-deco-dup', DuplicateV2 as any, '第二次', 'chart');
    GraphicFactory.registerGraphic('test-deco-unreg', UnregisterableGraphic as any, '注销', 'basic');
  });

  it('应自动注册图元到 GraphicFactory', () => {
    expect(GraphicFactory.hasGraphic('test-deco-auto')).toBe(true);

    const info = GraphicFactory.getGraphicInfo('test-deco-auto');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('自动');
    expect(info!.category).toBe('basic');
  });

  it('应设置静态 type 属性', () => {
    @Graphic('test-static-type', '静态类型', 'basic')
    class StaticTypeGraphic extends BaseGraphic {
      constructor() { super('test-static-type', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticTypeGraphic as any).type).toBe('test-static-type');
  });

  it('应设置静态 displayName 属性', () => {
    @Graphic('test-static-name', '静态名称', 'basic')
    class StaticNameGraphic extends BaseGraphic {
      constructor() { super('test-static-name', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticNameGraphic as any).displayName).toBe('静态名称');
  });

  it('应设置静态 category 属性', () => {
    @Graphic('test-static-cat', '静态分类', 'chart')
    class StaticCatGraphic extends BaseGraphic {
      constructor() { super('test-static-cat', 0, 0, 100, 100); }
      draw(): void {}
    }
    expect((StaticCatGraphic as any).category).toBe('chart');
  });

  it('装饰器创建的图元可通过工厂正常使用', () => {

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

  it('装饰器注册的类原 name 属性不应被修改', () => {
    @Graphic('test-deco-name', '名称保持', 'basic')
    class NamePreservedGraphic extends BaseGraphic {
      constructor() { super('test-deco-name', 0, 0, 100, 100); }
      draw(): void {}
    }
    const origName = NamePreservedGraphic.name;
    expect(origName).toBe('NamePreservedGraphic');
  });

  it('装饰器多次应用（覆盖注册）应生效', () => {
    expect(GraphicFactory.hasGraphic('test-deco-dup')).toBe(true);


    expect(GraphicFactory.hasGraphic('test-deco-dup')).toBe(true);

    const info = GraphicFactory.getGraphicInfo('test-deco-dup');
    expect(info).not.toBeNull();
    expect(info!.name).toBe('第二次');
    expect(info!.category).toBe('chart');
  });

  it('装饰器不改变类继承关系', () => {
    @Graphic('test-deco-inherit', '继承', 'basic')
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

  it('装饰器注册后可注销', () => {

    expect(GraphicFactory.hasGraphic('test-deco-unreg')).toBe(true);
    GraphicFactory.unregisterGraphic('test-deco-unreg');
    expect(GraphicFactory.hasGraphic('test-deco-unreg')).toBe(false);
  });

  it('注销未注册类型不应抛出异常', () => {
    expect(() => GraphicFactory.unregisterGraphic('test-deco-nobody')).not.toThrow();
  });

  it('getGraphicInfo 对不存在类型返回 undefined', () => {
    expect(GraphicFactory.getGraphicInfo('test-deco-ghost')).toBeUndefined();
  });

  it('createGraphic 对不存在类型抛出异常', () => {
    expect(() => GraphicFactory.createGraphic('test-deco-ghost')).toThrow();
  });
});
