// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { QualityCode, QualityRule, TagMetadata } from '../types/quality.types';
import type { TagValue } from '../types/data-source.types';

export class QualityManager {
  private _rules: Map<string, QualityRule[]> = new Map();
  private _metadata: Map<string, TagMetadata> = new Map();
  private _getCached?: (tagId: string) => TagValue | undefined;

  registerTag(tagId: string, metadata: TagMetadata): void { this._metadata.set(tagId, metadata); }
  registerRule(tagId: string, rule: QualityRule): void {
    const rules = this._rules.get(tagId) || [];
    rules.push(rule);
    this._rules.set(tagId, rules);
  }

  evaluateQuality(tagId: string, value: unknown): QualityCode {
    const metadata = this._metadata.get(tagId);
    if (metadata && metadata.staleThresholdMs != null && this._getCached) {
      const cached = this._getCached(tagId);
      if (cached && Date.now() - cached.timestamp > metadata.staleThresholdMs) return 'stale';
    }
    const rules = this._rules.get(tagId) || [];
    for (const rule of rules) {
      if (this._checkCondition(rule.condition, value)) return rule.code;
    }
    return 'good';
  }

  evaluateBatch(_tagId: string, tagValue: TagValue): QualityCode {
    return (tagValue.quality as QualityCode) || this.evaluateQuality(_tagId, tagValue.value);
  }

  removeTag(tagId: string): void { this._metadata.delete(tagId); this._rules.delete(tagId); }
  clear(): void { this._metadata.clear(); this._rules.clear(); }
  setCacheLookup(fn: (tagId: string) => TagValue | undefined): void { this._getCached = fn; }

  private _checkCondition(condition: string, value: unknown): boolean {
    try { return new Function('value', `return ${condition}`)(value); }
    catch { return false; }
  }
}