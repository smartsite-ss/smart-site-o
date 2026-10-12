// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 场景创建 Agent 单元测试 — P2-T02
 *
 * 验证：
 *   - GRAPHIC_TYPE_MAP 数据完整性
 *   - matchGraphicTypes 关键词匹配
 *   - getSceneCreationSystemPrompt 完整性
 *   - isSceneCreationIntent 意图判断
 */

import {
  GRAPHIC_TYPE_MAP,
  matchGraphicTypes,
  getSceneCreationSystemPrompt,
  isSceneCreationIntent,
} from '../scene-creator-agent';

describe('GRAPHIC_TYPE_MAP', () => {
  it('应包含至少 50 个图元类型', () => {
    expect(GRAPHIC_TYPE_MAP.length).toBeGreaterThanOrEqual(50);
  });

  it('所有条目的 type 不应为空', () => {
    for (const entry of GRAPHIC_TYPE_MAP) {
      expect(entry.type).toBeTruthy();
      expect(typeof entry.type).toBe('string');
    }
  });

  it('所有条目的 label 不应为空', () => {
    for (const entry of GRAPHIC_TYPE_MAP) {
      expect(entry.label).toBeTruthy();
    }
  });

  it('所有条目的 keywords 至少包含 2 个', () => {
    for (const entry of GRAPHIC_TYPE_MAP) {
      expect(entry.keywords.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('所有条目的 defaultSize 应为 [number, number]', () => {
    for (const entry of GRAPHIC_TYPE_MAP) {
      expect(entry.defaultSize).toHaveLength(2);
      expect(typeof entry.defaultSize[0]).toBe('number');
      expect(typeof entry.defaultSize[1]).toBe('number');
    }
  });

  it('所有 type 名称应唯一', () => {
    const types = GRAPHIC_TYPE_MAP.map((e) => e.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('应包含常见工业图元', () => {
    const types = GRAPHIC_TYPE_MAP.map((e) => e.type);
    expect(types).toContain('waterpump');
    expect(types).toContain('valve');
    expect(types).toContain('pipe');
    expect(types).toContain('tank');
    expect(types).toContain('gauge');
  });

  it('应包含常见电力图元', () => {
    const types = GRAPHIC_TYPE_MAP.map((e) => e.type);
    expect(types).toContain('motor');
    expect(types).toContain('breaker');
    expect(types).toContain('transformer2w');
    expect(types).toContain('voltmeter');
    expect(types).toContain('ammeter');
  });

  it('应包含常见矿产图元', () => {
    const types = GRAPHIC_TYPE_MAP.map((e) => e.type);
    expect(types).toContain('conveyerbelt');
    expect(types).toContain('ballmill');
    expect(types).toContain('crusher');
    expect(types).toContain('pressuregauge');
    expect(types).toContain('flowmeter');
  });

  it('应包含通用和图表组件', () => {
    const types = GRAPHIC_TYPE_MAP.map((e) => e.type);
    expect(types).toContain('label');
    expect(types).toContain('button');
    expect(types).toContain('chart');
  });

  it('所有图元分类应为有效值', () => {
    const validCategories = ['工业组件', '电力组件', '矿产组件', '通用组件', '图表组件'];
    for (const entry of GRAPHIC_TYPE_MAP) {
      expect(validCategories).toContain(entry.category);
    }
  });
});

describe('matchGraphicTypes', () => {
  it('应匹配"水泵"到 waterpump', () => {
    const result = matchGraphicTypes('创建3台水泵');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('waterpump');
  });

  it('应匹配"压力表"到 pressuregauge', () => {
    const result = matchGraphicTypes('需要压力表');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('pressuregauge');
  });

  it('应匹配"阀门"到 valve', () => {
    const result = matchGraphicTypes('添加一个阀门');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('valve');
  });

  it('应匹配"温度传感器"到 tempsensor', () => {
    const result = matchGraphicTypes('需要温度传感器');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('tempsensor');
  });

  it('应匹配"流量计"到 flowmeter', () => {
    const result = matchGraphicTypes('安装流量计');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('flowmeter');
  });

  it('应匹配"电机"到 motor', () => {
    const result = matchGraphicTypes('需要一台电机');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('motor');
  });

  it('应匹配"变压器"到 transformer2w', () => {
    const result = matchGraphicTypes('添加变压器');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('transformer2w');
  });

  it('应匹配"断路器"到 breaker', () => {
    const result = matchGraphicTypes('安装断路器');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('breaker');
  });

  it('应匹配"传送带"到 conveyerbelt', () => {
    const result = matchGraphicTypes('需要传送带');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('conveyerbelt');
  });

  it('应匹配"球磨机"到 ballmill', () => {
    const result = matchGraphicTypes('球磨机监控');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('ballmill');
  });

  it('应匹配"图表"到 chart', () => {
    const result = matchGraphicTypes('添加趋势图表');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe('chart');
  });

  it('多重关键词应返回多个匹配（按得分排序）', () => {
    const result = matchGraphicTypes('泵站需要水泵和压力表和流量计');
    expect(result.length).toBeGreaterThanOrEqual(3);
    // 水泵得分最高（3字母+精确匹配）
    // 但 waterpump 和 pump 都会匹配"泵"，waterpump 因为精确匹配"水泵"得分更高
  });

  it('不匹配的描述应返回空数组', () => {
    const result = matchGraphicTypes('xyz不存在的设备');
    expect(result).toEqual([]);
  });

  it('空字符串应返回空数组', () => {
    const result = matchGraphicTypes('');
    expect(result).toEqual([]);
  });
});

describe('getSceneCreationSystemPrompt', () => {
  it('应返回非空字符串', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
  });

  it('应包含工作流程说明', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('scene.createPage');
    expect(prompt).toContain('scene.addGraphic');
    expect(prompt).toContain('scene.autoLayout');
    expect(prompt).toContain('scene.setBinding');
  });

  it('应包含图元速查表分类标题', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('工业组件');
    expect(prompt).toContain('电力组件');
    expect(prompt).toContain('矿产组件');
  });

  it('应包含布局策略说明', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('网格布局');
    expect(prompt).toContain('流式布局');
    expect(prompt).toContain('环形布局');
  });

  it('应包含泵站场景示例', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('泵站监控');
    expect(prompt).toContain('waterpump');
  });

  it('应包含配电场景示例', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('配电柜监控');
  });

  it('应包含注意事项', () => {
    const prompt = getSceneCreationSystemPrompt();
    expect(prompt).toContain('注意事项');
    expect(prompt).toContain('工具调用最多');
  });
});

describe('isSceneCreationIntent', () => {
  it('page_create 意图应返回 true', () => {
    expect(isSceneCreationIntent('page_create')).toBe(true);
  });

  it('graphic_add 意图应返回 true', () => {
    expect(isSceneCreationIntent('graphic_add')).toBe(true);
  });

  it('scene_create 意图应返回 true', () => {
    expect(isSceneCreationIntent('scene_create')).toBe(true);
  });

  it('非场景意图应返回 false', () => {
    expect(isSceneCreationIntent('kb_query')).toBe(false);
    expect(isSceneCreationIntent('plugin_gen')).toBe(false);
    expect(isSceneCreationIntent('alarm_query')).toBe(false);
  });

  it('undefined 意图应返回 false', () => {
    expect(isSceneCreationIntent(undefined)).toBe(false);
  });

  it('空字符串应返回 false', () => {
    expect(isSceneCreationIntent('')).toBe(false);
  });
});
