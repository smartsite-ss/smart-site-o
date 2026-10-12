// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * PluginGeneratorAgent 单元测试 — P1-T05
 *
 * 覆盖:
 *   - 插件配置推断（type/label/category/renderBackend）
 *   - Schema 推断（开关/状态灯/标签/数值/管道）
 *   - 渲染后端推断（Canvas2D/Vue/SVG/CSS/Three3D）
 *   - System Prompt 构建（含所有渲染后端绘制指引）
 *   - 分类关键词映射（工业/图表/表单/自定义）
 */

import { describe, it, expect } from 'vitest';
import { PluginGeneratorAgent } from '../../ai/plugin-generator-agent';

describe('PluginGeneratorAgent', () => {
  const agent = new PluginGeneratorAgent();

  // ────── 配置推断 ──────

  describe('配置推断', () => {
    it('"创建一个带开关和状态灯的阀门插件" → 推断为工业分类', () => {
      const result = agent.analyze('创建一个带开关和状态灯的阀门插件');
      expect(result.config.category).toBe('industrial');
      expect(result.config.label).toContain('阀门');
    });

    it('"生成一个泵监控图元" → 推断为工业+canvas2d', () => {
      const result = agent.analyze('生成一个泵监控图元');
      expect(result.config.category).toBe('industrial');
      expect(result.config.renderBackend).toBe('canvas2d');
    });

    it('应默认使用 Canvas 2D 渲染后端', () => {
      const result = agent.analyze('创建一个温度计插件');
      expect(result.config.renderBackend).toBe('canvas2d');
    });

    it('输入包含"3D"时应推断为 three3d', () => {
      const result = agent.analyze('创建一个3D管道插件');
      expect(result.config.renderBackend).toBe('three3d');
    });

    it('输入包含"Vue组件"时应推断为 vue', () => {
      const result = agent.analyze('创建一个Vue组件表单插件');
      expect(result.config.renderBackend).toBe('vue');
    });

    it('输入包含"SVG"时应推断为 svg-dom', () => {
      const result = agent.analyze('创建一个SVG图表插件');
      expect(result.config.renderBackend).toBe('svg-dom');
    });
  });

  // ────── Schema 推断 ──────

  describe('Schema 推断', () => {
    it('"带开关" → 推断 isOn (boolean)', () => {
      const result = agent.analyze('创建带开关的阀门插件');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names).toContain('isOn');
      const isOn = result.config.schema.fields.find((f) => f.name === 'isOn');
      expect(isOn!.type).toBe('boolean');
    });

    it('"带状态灯" → 推断 status/statusColor (select+color)', () => {
      const result = agent.analyze('创建带状态灯的插件');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names).toContain('status');
      expect(names).toContain('statusColor');
    });

    it('"温度/压力/流量" → 推断 minValue/maxValue/unit', () => {
      const result = agent.analyze('创建温度显示仪表');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names).toContain('minValue');
      expect(names).toContain('maxValue');
      expect(names).toContain('unit');
    });

    it('"标签/文字" → 推断 label/fontSize/textColor', () => {
      const result = agent.analyze('创建带标签文字的面板');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names).toContain('label');
      expect(names).toContain('fontSize');
      expect(names).toContain('textColor');
    });

    it('"管道/阀体/泵体" → 推断 bodyColor', () => {
      const result = agent.analyze('创建管道插件');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names).toContain('bodyColor');
    });

    it('无关键词时应生成默认属性（label/textColor/bgColor）', () => {
      const result = agent.analyze('创建一个自定义的通用组件');
      const names = result.config.schema.fields.map((f) => f.name);
      expect(names.length).toBeGreaterThanOrEqual(3);
      expect(names).toContain('label');
      expect(names).toContain('textColor');
      expect(names).toContain('bgColor');
    });
  });

  // ────── System Prompt ──────

  describe('System Prompt 构建', () => {
    it('应包含插件配置信息', () => {
      const result = agent.analyze('创建阀门插件');
      expect(result.systemPrompt).toContain('Smart-SCADA v7 插件开发专家');
    });

    it('应包含渲染后端绘制指引', () => {
      const result = agent.analyze('创建阀门插件');
      expect(result.systemPrompt).toContain('Canvas 2D');
    });

    it('应包含属性 Schema', () => {
      const result = agent.analyze('创建带开关的阀门插件');
      expect(result.systemPrompt).toContain('interface Props');
      expect(result.systemPrompt).toContain('isOn');
    });

    it('应生成 messages 数组', () => {
      const result = agent.analyze('创建阀门插件');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
    });

    it('buildSystemPrompt 应与 analyze 返回一致', () => {
      const analyzeResult = agent.analyze('创建阀门插件');
      const prompt = agent.buildSystemPrompt(analyzeResult.config);
      expect(prompt).toBe(analyzeResult.systemPrompt);
    });
  });

  // ────── 分类推断 ──────

  describe('分类推断', () => {
    const categoryCases = [
      ['阀门', 'industrial'],
      ['泵', 'industrial'],
      ['电机', 'industrial'],
      ['传感器', 'industrial'],
      ['仪表', 'industrial'],
      ['开关', 'industrial'],
      ['指示灯', 'industrial'],
      ['管道', 'industrial'],
      ['液位', 'industrial'],
      ['温度', 'industrial'],
      ['压力', 'industrial'],
      ['流量', 'industrial'],
      ['图表', 'chart'],
      ['趋势', 'chart'],
      ['报表', 'chart'],
      ['表单', 'form'],
      ['输入框', 'form'],
      ['按钮', 'form'],
    ] as const;

    for (const [keyword, expected] of categoryCases) {
      it(`"创建${keyword}插件" → category="${expected}"`, () => {
        const result = agent.analyze(`创建${keyword}插件`);
        expect(result.config.category).toBe(expected);
      });
    }

    it('无匹配关键词时应返回 "custom"', () => {
      const result = agent.analyze('创建一个神秘的外星科技');
      expect(result.config.category).toBe('custom');
    });
  });

  // ────── 典型场景 ──────

  describe('典型场景：P1-T05 验收标准', () => {
    it('"创建一个带开关和状态灯的阀门插件" 应生成完整配置', () => {
      const result = agent.analyze('创建一个带开关和状态灯的阀门插件');

      // 验证完整配置结构
      expect(result.config.type).toBeTruthy();
      expect(result.config.label).toContain('阀门');
      expect(result.config.category).toBe('industrial');
      expect(result.config.renderBackend).toBe('canvas2d');

      // Schema 应包含开关和状态灯
      const fieldNames = result.config.schema.fields.map((f) => f.name);
      expect(fieldNames).toContain('isOn');
      expect(fieldNames).toContain('statusColor');
      expect(fieldNames).toContain('bodyColor');

      // System Prompt 应包含所有必需部分
      expect(result.systemPrompt.length).toBeGreaterThan(500);
      expect(result.systemPrompt).toContain('插件配置');
      expect(result.systemPrompt).toContain('属性 Schema');
      expect(result.systemPrompt).toContain('绘制指引');
      expect(result.systemPrompt).toContain('输出要求');
    });

    it('"创建一个泵站工艺流程图片" 应推断为工业+canvas2d', () => {
      const result = agent.analyze('创建一个泵站工艺流程图片');
      expect(result.config.category).toBe('industrial');
      expect(result.config.renderBackend).toBe('canvas2d');
    });

    it('"创建一个数据趋势图" 应推断为图表分类', () => {
      const result = agent.analyze('创建一个数据趋势图');
      expect(result.config.category).toBe('chart');
    });

    it('"创建一个登录表单组件" 应推断为表单分类+Vue后端', () => {
      const result = agent.analyze('创建一个登录表单组件');
      expect(result.config.category).toBe('form');
      expect(result.config.renderBackend).toBe('vue');
    });
  });
});
