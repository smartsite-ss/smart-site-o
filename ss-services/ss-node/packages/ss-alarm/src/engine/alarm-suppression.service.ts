// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

export interface SuppressionRule {
  id: string;
  type: 'maintenance' | 'device_offline' | 'parent_child';
  duration?: number;
  devices?: string[];
  parentRuleId?: string;
  childRuleIds?: string[];
  createdAt: number;
  expiresAt?: number;
}

export interface AlarmEvent {
  deviceId: string;
  tagId: string;
  ruleId: string;
}

@Injectable()
export class AlarmSuppressionService {
  private readonly logger = new Logger(AlarmSuppressionService.name);

  private suppressionRules: Map<string, SuppressionRule> = new Map();

  addSuppressionRule(rule: SuppressionRule): string {
    if (!rule.id) {
      rule.id = `suppression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    rule.createdAt = Date.now();

    if (rule.type === 'maintenance' && rule.duration) {
      rule.expiresAt = Date.now() + rule.duration;
    }

    this.suppressionRules.set(rule.id, rule);
    this.logger.log(`Added suppression rule: ${rule.id} [${rule.type}]`);
    return rule.id;
  }

  removeSuppressionRule(ruleId: string): boolean {
    const existed = this.suppressionRules.has(ruleId);
    if (existed) {
      this.suppressionRules.delete(ruleId);
      this.logger.log(`Removed suppression rule: ${ruleId}`);
    }
    return existed;
  }

  isSuppressed(event: AlarmEvent): boolean {
    const now = Date.now();

    for (const rule of this.suppressionRules.values()) {
      if (rule.expiresAt && now > rule.expiresAt) {
        this.suppressionRules.delete(rule.id);
        this.logger.debug(`Suppression rule ${rule.id} expired`);
        continue;
      }

      if (rule.type === 'maintenance') {
        if (rule.devices && rule.devices.length > 0) {
          if (rule.devices.includes(event.deviceId)) {
            this.logger.debug(`Maintenance suppression for device ${event.deviceId}`);
            return true;
          }
        } else {
          this.logger.debug(`Global maintenance suppression active`);
          return true;
        }
      }

      if (rule.type === 'device_offline') {
        if (rule.devices && rule.devices.includes(event.deviceId)) {
          this.logger.debug(`Device offline suppression for ${event.deviceId}`);
          return true;
        }
      }

      if (rule.type === 'parent_child') {
        if (rule.childRuleIds && rule.childRuleIds.includes(event.ruleId)) {
          this.logger.debug(`Parent-child suppression for rule ${event.ruleId}`);
          return true;
        }
      }
    }

    return false;
  }

  getSuppressionRules(): SuppressionRule[] {
    const now = Date.now();
    const rules: SuppressionRule[] = [];

    for (const rule of this.suppressionRules.values()) {
      if (rule.expiresAt && now > rule.expiresAt) {
        this.suppressionRules.delete(rule.id);
        continue;
      }
      rules.push({ ...rule });
    }

    return rules;
  }

  clearExpiredRules(): number {
    const now = Date.now();
    let count = 0;

    for (const [id, rule] of this.suppressionRules.entries()) {
      if (rule.expiresAt && now > rule.expiresAt) {
        this.suppressionRules.delete(id);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`Cleared ${count} expired suppression rules`);
    }

    return count;
  }
}
