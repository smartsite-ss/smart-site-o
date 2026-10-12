// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * TriggerMatcher 单元测试 — P1-T06
 *
 * 覆盖:
 *   - dataChange 触发匹配（精确 + 宽松）
 *   - timer 触发匹配（秒/分/Cron）
 *   - event 触发匹配（点击/双击）
 *   - manual 触发匹配
 *   - unknown 回退
 *   - 工业量关键词 → tagId 映射
 */

import { describe, it, expect } from 'vitest';
import { TriggerMatcher } from '../../ai/trigger-matcher';

describe('TriggerMatcher', () => {
  const matcher = new TriggerMatcher();

  // ────── dataChange 触发 ──────

  describe('dataChange 触发匹配', () => {
    it('应匹配 "当温度超过80度时触发告警" → dataChange', () => {
      const result = matcher.match('当温度超过80度时触发告警');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('temperature');
      expect(result.condition).toBe('>');
      expect(result.threshold).toBe(80);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('应匹配 "如果压力低于0.5时就通知" → dataChange', () => {
      const result = matcher.match('如果压力低于0.5时就通知');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('pressure');
      expect(result.condition).toBe('<');
      expect(result.threshold).toBe(0.5);
    });

    it('应匹配 "一旦液位达到100" → dataChange', () => {
      const result = matcher.match('一旦液位达到100');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('level');
      expect(result.condition).toBe('>=');
      expect(result.threshold).toBe(100);
    });

    it('应匹配 "当流量不等于0" → dataChange', () => {
      const result = matcher.match('当流量不等于0');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('flow');
      expect(result.condition).toBe('!=');
      expect(result.threshold).toBe(0);
    });

    it('应匹配宽松模式 "当温度变化时" → dataChange（无阈值）', () => {
      const result = matcher.match('当温度变化时更新显示');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('temperature');
      expect(result.confidence).toBe(0.5);
      expect(result.threshold).toBeUndefined();
    });

    it('应匹配 "当电流高于200安" → dataChange（带单位后缀）', () => {
      const result = matcher.match('当电流高于200安时断开');
      expect(result.type).toBe('dataChange');
      expect(result.tagId).toBe('current');
      expect(result.condition).toBe('>');
      expect(result.threshold).toBe(200);
    });
  });

  // ────── timer 触发 ──────

  describe('timer 触发匹配', () => {
    it('应匹配 "每5秒执行一次" → timer', () => {
      const result = matcher.match('每5秒执行一次');
      expect(result.type).toBe('timer');
      expect(result.interval).toBe(5000);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('应匹配 "每2分钟检查一次" → timer', () => {
      const result = matcher.match('每2分钟检查一次');
      expect(result.type).toBe('timer');
      expect(result.interval).toBe(120_000);
    });

    it('应匹配 "每1小时执行" → timer', () => {
      const result = matcher.match('每1小时执行');
      expect(result.type).toBe('timer');
      expect(result.interval).toBe(3_600_000);
    });

    it('应匹配 "每100毫秒" → timer', () => {
      const result = matcher.match('每100毫秒');
      expect(result.type).toBe('timer');
      expect(result.interval).toBe(100);
    });

    it('应匹配 Cron "定时执行数据同步" → timer', () => {
      const result = matcher.match('定时执行数据同步');
      expect(result.type).toBe('timer');
      expect(result.confidence).toBe(0.6);
    });
  });

  // ────── event 触发 ──────

  describe('event 触发匹配', () => {
    it('应匹配 "点击确认按钮时" → event', () => {
      const result = matcher.match('点击确认按钮时执行');
      expect(result.type).toBe('event');
      expect(result.eventType).toBe('click');
      expect(result.graphicId).toBe('确认');
    });

    it('应匹配 "双击图表组件时" → event', () => {
      const result = matcher.match('双击图表组件时放大');
      expect(result.type).toBe('event');
      expect(result.eventType).toBe('dblclick');
      expect(result.graphicId).toBe('图表');
    });

    it('应匹配 "按下启动图元" → event', () => {
      const result = matcher.match('按下启动图元时');
      expect(result.type).toBe('event');
      expect(result.eventType).toBe('mousedown');
    });
  });

  // ────── manual 触发 ──────

  describe('manual 触发匹配', () => {
    it('应匹配 "手动执行" → manual', () => {
      const result = matcher.match('手动执行');
      expect(result.type).toBe('manual');
      expect(result.confidence).toBe(0.7);
    });
  });

  // ────── 边界与回退 ──────

  describe('边界与回退', () => {
    it('无法识别时应返回 unknown', () => {
      const result = matcher.match('hello world 123');
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('空字符串应返回 unknown', () => {
      const result = matcher.match('');
      expect(result.type).toBe('unknown');
    });

    it('匹配优先级: timer > event > dataChange', () => {
      // "每5秒点击按钮超过80度" 应先匹配到 timer
      const result = matcher.match('每5秒点击启动按钮时');
      expect(result.type).toBe('timer');
    });
  });

  // ────── 工业量关键词映射 ──────

  describe('工业量关键词 → tagId 映射', () => {
    const mappings = [
      ['温度', 'temperature'],
      ['湿度', 'humidity'],
      ['压力', 'pressure'],
      ['流量', 'flow'],
      ['液位', 'level'],
      ['电流', 'current'],
      ['电压', 'voltage'],
      ['功率', 'power'],
      ['转速', 'speed'],
      ['振动', 'vibration'],
      ['频率', 'frequency'],
      ['开度', 'opening'],
    ] as const;

    for (const [keyword, expected] of mappings) {
      it(`"当${keyword}超过50" → tagId="${expected}"`, () => {
        const result = matcher.match(`当${keyword}超过50时`);
        expect(result.tagId).toBe(expected);
      });
    }
  });
});
