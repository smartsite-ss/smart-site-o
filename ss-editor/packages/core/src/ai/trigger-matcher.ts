// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Trigger Matcher — P1-T06 触发事件匹配器
 *
 * 基于关键词 + 规则从自然语言描述中推断触发事件类型和参数。
 * 无需 LLM 调用，轻量级匹配器（< 3KB）。
 *
 * 支持 4 种触发类型：
 *   - dataChange: 数据标签值变化触发（"当温度超过 80 度"）
 *   - timer: 定时触发（"每 5 秒执行一次"）
 *   - event: 图元事件触发（"点击按钮时"）
 *   - manual: 手动触发（"手动执行"）
 *   - unknown: 无法识别
 *
 * 用法:
 *   const result = triggerMatcher.match('当温度超过 80 度时触发告警');
 *   // { type: 'dataChange', tagId: 'temperature', condition: '>', threshold: 80, confidence: 0.8 }
 */

// ============================================================
// 类型定义
// ============================================================

export type TriggerType = 'dataChange' | 'timer' | 'event' | 'manual' | 'unknown';

export interface TriggerMatchResult {
  type: TriggerType;
  confidence: number;
  /** dataChange: 标签 ID */
  tagId?: string;
  /** dataChange: 比较条件 */
  condition?: string;
  /** dataChange: 阈值 */
  threshold?: number;
  /** timer: 间隔（毫秒） */
  interval?: number;
  /** timer: Cron 表达式（可选） */
  cron?: string;
  /** event: 图元 ID */
  graphicId?: string;
  /** event: 事件类型 */
  eventType?: 'click' | 'dblclick' | 'mousedown' | 'mouseup';
}

// ============================================================
// 常量：关键词 → 标签 ID 映射
// ============================================================

const TAG_KEYWORD_MAP: Record<string, string> = {
  温度: 'temperature',
  湿度: 'humidity',
  压力: 'pressure',
  流量: 'flow',
  液位: 'level',
  电流: 'current',
  电压: 'voltage',
  功率: 'power',
  转速: 'speed',
  振动: 'vibration',
  频率: 'frequency',
  开度: 'opening',
};

const COMPARISON_KEYWORDS: Record<string, string> = {
  超过: '>',
  大于: '>',
  高于: '>',
  超出: '>',
  低于: '<',
  小于: '<',
  不足: '<',
  等于: '==',
  达到: '>=',
  不低于: '>=',
  不高于: '<=',
  不等于: '!=',
};

const EVENT_KEYWORDS: Record<string, string> = {
  点击: 'click',
  双击: 'dblclick',
  按下: 'mousedown',
  松开: 'mouseup',
};

// ============================================================
// TriggerMatcher
// ============================================================

export class TriggerMatcher {
  /**
   * 从自然语言中匹配触发事件
   */
  match(input: string): TriggerMatchResult {
    // 1. 检测 timer 触发
    const timerResult = this._matchTimer(input);
    if (timerResult) return timerResult;

    // 2. 检测 event 触发
    const eventResult = this._matchEvent(input);
    if (eventResult) return eventResult;

    // 3. 检测 dataChange 触发
    const dataChangeResult = this._matchDataChange(input);
    if (dataChangeResult) return dataChangeResult;

    // 4. 检测 manual 触发
    if (/手动|菜单|按钮.*执行/.test(input)) {
      return { type: 'manual', confidence: 0.7 };
    }

    // 5. 默认：unknown
    return { type: 'unknown', confidence: 0 };
  }

  // ─── 私有匹配方法 ───

  private _matchDataChange(input: string): TriggerMatchResult | null {
    // 模式："当/如果 X 超过/大于/低于 Y (度/单位) 时/就..."
    const pattern = /(?:当|如果|一旦|若)\s*(.+?)\s*(超过|大于|高于|超出|低于|小于|不足|等于|达到|不低于|不高于|不等于)\s*(\d+(?:\.\d+)?)\s*(?:度|毫米|米|秒|分钟|小时|%|％)?/;
    const match = input.match(pattern);

    if (!match) {
      // 宽松模式：仅匹配 "当X变化时"
      const looseMatch = input.match(/(?:当|如果)\s*(.+?)\s*(?:变化|改变|更新|变动)/);
      if (looseMatch) {
        const tagId = this._extractTagId(looseMatch[1]);
        return { type: 'dataChange', confidence: 0.5, tagId };
      }
      return null;
    }

    const tagName = match[1].trim();
    const conditionWord = match[2];
    const threshold = parseFloat(match[3]);

    const tagId = this._extractTagId(tagName);
    const condition = COMPARISON_KEYWORDS[conditionWord] || '>';

    return {
      type: 'dataChange',
      confidence: 0.8,
      tagId,
      condition,
      threshold,
    };
  }

  private _matchTimer(input: string): TriggerMatchResult | null {
    // 模式："每 X 秒/分钟/小时/毫秒 执行"
    const pattern = /每\s*(\d+(?:\.\d+)?)\s*(秒|分钟?|小时?|毫秒|ms|s|min|h)\s*(?:执行|运行|触发|检查|调用)?/;
    const match = input.match(pattern);

    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      const interval = unitMultiplier[unit]
        ? value * unitMultiplier[unit]
        : value * 1000; // 默认秒

      return { type: 'timer', confidence: 0.85, interval };
    }

    // Cron 模式
    if (/cron|定时|周期性/.test(input)) {
      return { type: 'timer', confidence: 0.6, interval: 60000 }; // 默认 1 分钟
    }

    return null;
  }

  private _matchEvent(input: string): TriggerMatchResult | null {
    // 模式："点击/双击 X 按钮/图元 时"
    const pattern = /(点击|双击|按下|松开)\s*(.+?)(?:按钮|图元|组件|图标)?\s*时/;
    const match = input.match(pattern);

    if (match) {
      const eventType = (EVENT_KEYWORDS[match[1]] || 'click') as TriggerMatchResult['eventType'];
      const targetName = match[2].trim();
      const graphicId = this._extractGraphicId(targetName);

      return { type: 'event', confidence: 0.75, graphicId, eventType };
    }

    return null;
  }

  // ─── 辅助方法 ───

  private _extractTagId(tagName: string): string {
    // 先查关键词映射
    for (const [kw, id] of Object.entries(TAG_KEYWORD_MAP)) {
      if (tagName.includes(kw)) return id;
    }
    // 回退：保留中文字符（\u4e00-\u9fff），其他非单词字符转下划线
    return tagName
      .replace(/[^\w\u4e00-\u9fff]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'unknown_tag';
  }

  private _extractGraphicId(targetName: string): string {
    return targetName
      .replace(/[^\w\u4e00-\u9fff]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'unknown_graphic';
  }
}

// ============================================================
// 时间单位乘法器
// ============================================================

const unitMultiplier: Record<string, number> = {
  毫秒: 1,
  ms: 1,
  秒: 1000,
  s: 1000,
  分: 60_000,
  分钟: 60_000,
  min: 60_000,
  小时: 3_600_000,
  h: 3_600_000,
};

/** 单例 */
export const triggerMatcher = new TriggerMatcher();
