// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * ScriptGeneratorAgent 单元测试 — P1-T06
 *
 * 覆盖:
 *   - analyze(): 触发匹配 + System Prompt 构建
 *   - buildSystemPrompt(): 注入 26 个 ScriptAPI
 *   - 触发类型代码模板注入（dataChange/timer/event/manual）
 *   - ChatMessage 构建
 *   - 典型场景验收
 */

import { describe, it, expect } from 'vitest';
import { ScriptGeneratorAgent } from '../../ai/script-generator-agent';

describe('ScriptGeneratorAgent', () => {
  const agent = new ScriptGeneratorAgent();

  // ────── analyze() ──────

  describe('analyze() 触发匹配 + Prompt 构建', () => {
    it('应正确匹配 dataChange 触发类型', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.trigger.type).toBe('dataChange');
      expect(result.trigger.tagId).toBe('temperature');
    });

    it('应正确匹配 timer 触发类型', () => {
      const result = agent.analyze('每10秒读取一次压力值');
      expect(result.trigger.type).toBe('timer');
    });

    it('应正确匹配 event 触发类型', () => {
      const result = agent.analyze('点击确认按钮时保存数据');
      expect(result.trigger.type).toBe('event');
    });

    it('应正确匹配 manual 触发类型', () => {
      const result = agent.analyze('手动执行数据清理');
      expect(result.trigger.type).toBe('manual');
    });

    it('无法识别时应返回 unknown', () => {
      const result = agent.analyze('只是一个描述性的对话');
      expect(result.trigger.type).toBe('unknown');
    });
  });

  // ────── System Prompt 内容 ──────

  describe('System Prompt 内容', () => {
    it('应包含 26 个 ScriptAPI 文档', () => {
      const result = agent.analyze('当温度超过80度时触发告警');

      // 检查关键 API 是否在 System Prompt 中
      const requiredAPIs = [
        'readTag',
        'writeTag',
        'getTagQuality',
        'setGraphicProps',
        'showGraphic',
        'hideGraphic',
        'moveGraphic',
        'rotateGraphic',
        'triggerAlarm',
        'acknowledgeAlarm',
        'clearAlarm',
        'getActiveAlarms',
        'switchPage',
        'getCurrentPageId',
        'fetch',
        'setTimeout',
        'setInterval',
        'sleep',
        'notify',
        'log',
        'clamp',
        'mapRange',
        'colorForValue',
      ];

      for (const api of requiredAPIs) {
        expect(result.systemPrompt).toContain(api);
      }
    });

    it('应包含沙箱环境说明', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.systemPrompt).toContain('沙箱');
      expect(result.systemPrompt).toContain('api');
      expect(result.systemPrompt).toContain('禁止使用');
    });

    it('应包含触发配置信息（dataChange）', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.systemPrompt).toContain('触发配置');
      expect(result.systemPrompt).toContain('dataChange');
      expect(result.systemPrompt).toContain('temperature');
    });

    it('unknown 触发类型时应提示手动选择', () => {
      const result = agent.analyze('hello');
      expect(result.systemPrompt).toContain('未能自动匹配触发类型');
      expect(result.systemPrompt).toContain('选择合适的触发方式');
    });

    it('应包含代码规范说明', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.systemPrompt).toContain('api');
      expect(result.systemPrompt).toContain('const');
      expect(result.systemPrompt).toContain('export');
    });
  });

  // ────── 触发模板 ──────

  describe('触发类型代码模板', () => {
    it('dataChange 模板应包含标签 ID 和条件', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.systemPrompt).toContain('temperature');
      expect(result.systemPrompt).toContain('>');
      expect(result.systemPrompt).toContain('80');
    });

    it('timer 模板应包含间隔', () => {
      const result = agent.analyze('每5秒执行一次');
      expect(result.systemPrompt).toContain('timer');
    });

    it('event 模板应包含图元 ID', () => {
      const result = agent.analyze('点击启动按钮时开机');
      expect(result.systemPrompt).toContain('event');
    });
  });

  // ────── ChatMessage 构建 ──────

  describe('ChatMessage 构建', () => {
    it('应生成 system + user 两条消息', () => {
      const result = agent.analyze('当温度超过80度时触发告警');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].role).toBe('user');
    });

    it('user 消息应包含原始输入', () => {
      const input = '当温度超过80度时触发告警';
      const result = agent.analyze(input);
      expect(result.messages[1].content).toContain(input);
    });
  });

  // ────── 典型场景（P1-T06 验收标准） ──────

  describe('典型场景验收', () => {
    it('"当温度超过80度时触发告警" 应生成含告警API的System Prompt', () => {
      const result = agent.analyze('当温度超过80度时触发告警');

      // 触发匹配
      expect(result.trigger.type).toBe('dataChange');

      // System Prompt 应包含 triggerAlarm API
      expect(result.systemPrompt).toContain('triggerAlarm');
      expect(result.systemPrompt).toContain('readTag');

      // 应包含代码模板
      expect(result.systemPrompt).toContain('dataChange 触发');
    });

    it('"每30秒查询一次设备状态" 应为 timer 触发', () => {
      const result = agent.analyze('每30秒查询一次设备状态');
      expect(result.trigger.type).toBe('timer');
    });

    it('"点击报警确认按钮时清除告警" 应为 event 触发', () => {
      const result = agent.analyze('点击报警确认按钮时清除告警');
      expect(result.trigger.type).toBe('event');
      expect(result.trigger.graphicId).toBe('报警确认');
    });

    it('"当压力低于1.5时关闭阀门" 应匹配 <= 条件', () => {
      const result = agent.analyze('当压力低于1.5时关闭阀门');
      expect(result.trigger.type).toBe('dataChange');
      expect(result.trigger.tagId).toBe('pressure');
      expect(result.trigger.condition).toBe('<');
      expect(result.trigger.threshold).toBe(1.5);
    });

    it('"每1小时生成一次运行报告" 应为 timer (3,600,000ms)', () => {
      const result = agent.analyze('每1小时生成一次运行报告');
      expect(result.trigger.type).toBe('timer');
      expect(result.trigger.interval).toBe(3_600_000);
    });
  });

  // ────── 单例导出 ──────

  describe('单例', () => {
    it('导出的 scriptGeneratorAgent 应是 ScriptGeneratorAgent 实例', async () => {
      const { scriptGeneratorAgent: sga } = await import('../../ai/script-generator-agent');
      expect(sga).toBeInstanceOf(ScriptGeneratorAgent);
    });
  });
});
