// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventBus } from './EventBus';
import type { ScadaEventType } from '../types/event-bus.types';
import type { AlarmRecord, AlarmRule, SuppressionRule, EscalationRule, AlarmNotifier } from '../types/alarm.types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export class AlarmManager {
  private static instance: AlarmManager;

  static getInstance(eventBus?: EventBus): AlarmManager {
    if (!AlarmManager.instance) {
      if (!eventBus) {
        throw new Error('[AlarmManager] EventBus instance required for initialization');
      }
      AlarmManager.instance = new AlarmManager(eventBus);
    }
    return AlarmManager.instance;
  }

  static resetInstance(): void {
    AlarmManager.instance = undefined as unknown as AlarmManager;
  }

  private _eventBus: EventBus;
  private _alarms: Map<string, AlarmRecord> = new Map();
  private _rules: AlarmRule[] = [];
  private _suppressionRules: SuppressionRule[] = [];
  private _escalationRules: EscalationRule[] = [];
  private _notifiers: AlarmNotifier[] = [];
  private _escalationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  evaluateRules(tagId: string, value: any, quality: string): void {
    const matchingRules = this._rules.filter((rule) => rule.tagId === tagId);
    for (const rule of matchingRules) {
      const conditionMet = this.evaluateCondition(rule.condition, { value, quality });
      if (conditionMet) {
        this._handleDebounce(rule, tagId, value);
      } else if (rule.autoRecover) {
        this._autoRecoverByRule(rule.definitionId);
      }
    }
  }

  triggerAlarm(rule: AlarmRule, tagId: string, value: any): AlarmRecord {
    const alarm: AlarmRecord = {
      id: generateId(),
      definitionId: rule.definitionId,
      tagId,
      level: rule.level,
      state: 'unacknowledged',
      value: Number(value),
      threshold: this._parseThreshold(rule.condition),
      message: rule.message,
      triggeredAt: Date.now(),
      sourceId: 'alarm-manager',
      escalationLevel: 0,
    };

    this._alarms.set(alarm.id, alarm);

    try {
      this._eventBus.emit('alarmTriggered', {
        id: alarm.id,
        definitionId: alarm.definitionId,
        tagId: alarm.tagId,
        level: alarm.level,
        message: alarm.message,
        value: alarm.value,
        triggeredAt: alarm.triggeredAt,
      });
    } catch (err) {
      console.error('[AlarmManager] Failed to emit alarmTriggered event:', err);
    }

    this.notifyAll(alarm, rule);
    this.startEscalationTimer(alarm.id);

    return alarm;
  }

  acknowledge(alarmId: string, operator: string): void {
    const alarm = this._alarms.get(alarmId);
    if (!alarm) {
      console.warn(`[AlarmManager] Alarm not found: ${alarmId}`);
      return;
    }
    if (alarm.state !== 'unacknowledged') {
      console.warn(`[AlarmManager] Cannot acknowledge alarm ${alarmId} in state: ${alarm.state}`);
      return;
    }

    alarm.state = 'acknowledged';
    alarm.acknowledgedAt = Date.now();
    alarm.acknowledgedBy = operator;

    this._clearEscalationTimer(alarmId);

    try {
      this._eventBus.emit('alarmAcknowledged', {
        id: alarm.id,
        definitionId: alarm.definitionId,
        tagId: alarm.tagId,
        level: alarm.level,
        acknowledgedBy: operator,
        acknowledgedAt: alarm.acknowledgedAt,
      });
    } catch (err) {
      console.error('[AlarmManager] Failed to emit alarmAcknowledged event:', err);
    }
  }

  recover(alarmId: string): void {
    const alarm = this._alarms.get(alarmId);
    if (!alarm) {
      console.warn(`[AlarmManager] Alarm not found: ${alarmId}`);
      return;
    }
    if (alarm.state === 'recovered' || alarm.state === 'archived') {
      return;
    }

    alarm.state = 'recovered';
    alarm.recoveredAt = Date.now();

    this._clearEscalationTimer(alarmId);

    try {
      this._eventBus.emit('alarmCleared', {
        id: alarm.id,
        definitionId: alarm.definitionId,
        tagId: alarm.tagId,
        level: alarm.level,
        recoveredAt: alarm.recoveredAt,
      });
    } catch (err) {
      console.error('[AlarmManager] Failed to emit alarmCleared event:', err);
    }
  }

  archive(alarmId: string): void {
    const alarm = this._alarms.get(alarmId);
    if (!alarm) {
      console.warn(`[AlarmManager] Alarm not found: ${alarmId}`);
      return;
    }

    alarm.state = 'archived';

    try {
      this._eventBus.emit('alarmArchived' as ScadaEventType, {
        id: alarm.id,
        definitionId: alarm.definitionId,
        tagId: alarm.tagId,
        level: alarm.level,
      });
    } catch (err) {
      console.error('[AlarmManager] Failed to emit alarmArchived event:', err);
    }
  }

  addRule(rule: AlarmRule): void {
    const existing = this._rules.findIndex((r) => r.definitionId === rule.definitionId);
    if (existing >= 0) {
      this._rules[existing] = rule;
    } else {
      this._rules.push(rule);
    }
  }

  removeRule(ruleId: string): void {
    this._rules = this._rules.filter((r) => r.definitionId !== ruleId);
  }

  addSuppressionRule(rule: SuppressionRule): void {
    this._suppressionRules.push(rule);
  }

  addEscalationRule(rule: EscalationRule): void {
    this._escalationRules.push(rule);
  }

  registerNotifier(notifier: AlarmNotifier): void {
    this._notifiers.push(notifier);
  }

  getActiveAlarms(): AlarmRecord[] {
    return Array.from(this._alarms.values()).filter(
      (a) => a.state === 'unacknowledged' || a.state === 'acknowledged',
    );
  }

  getAlarmsByState(state: string): AlarmRecord[] {
    return Array.from(this._alarms.values()).filter((a) => a.state === state);
  }

  evaluateCondition(condition: string, context: { value: any; quality: string }): boolean {
    if (!condition || typeof condition !== 'string') {
      return false;
    }

    const trimmed = condition.trim();
    const match = trimmed.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
    if (!match) {
      return false;
    }

    const [, op, operandStr] = match;
    const value = Number(context.value);
    const operand = Number(operandStr);

    if (isNaN(value) || isNaN(operand)) {
      return false;
    }

    switch (op) {
      case '>':
        return value > operand;
      case '<':
        return value < operand;
      case '>=':
        return value >= operand;
      case '<=':
        return value <= operand;
      case '==':
        return value == operand;
      case '!=':
        return value != operand;
      default:
        return false;
    }
  }

  isSuppressed(ruleId: string, tagId: string): boolean {
    const activeAlarms = this.getActiveAlarms();
    const activeAlarmIds = new Set(activeAlarms.map((a) => a.id));

    for (const rule of this._suppressionRules) {
      if (rule.sourceAlarmId && activeAlarmIds.has(rule.sourceAlarmId)) {
        const suppressedAlarm = this._alarms.get(rule.suppressedAlarmId);
        if (suppressedAlarm && suppressedAlarm.definitionId === ruleId && suppressedAlarm.tagId === tagId) {
          return true;
        }
      }
    }

    return false;
  }

  startEscalationTimer(alarmId: string): void {
    const rules = this._escalationRules;
    if (rules.length === 0) {
      return;
    }

    const sortedRules = [...rules].sort((a, b) => a.afterDuration - b.afterDuration);

    for (const rule of sortedRules) {
      const timerKey = `${alarmId}-${rule.afterDuration}`;
      const timer = setTimeout(() => {
        const alarm = this._alarms.get(alarmId);
        if (!alarm || alarm.state !== 'unacknowledged') {
          return;
        }

        alarm.escalationLevel += 1;
        alarm.level = rule.newLevel;

        try {
          this._eventBus.emit('alarmEscalated', {
            id: alarm.id,
            definitionId: alarm.definitionId,
            tagId: alarm.tagId,
            previousLevel: alarm.level,
            newLevel: rule.newLevel,
            escalationLevel: alarm.escalationLevel,
            notifyUsers: rule.notifyUsers,
          });
        } catch (err) {
          console.error('[AlarmManager] Failed to emit alarmEscalated event:', err);
        }

        this._escalationTimers.delete(timerKey);
      }, rule.afterDuration);

      this._escalationTimers.set(timerKey, timer);
    }
  }

  notifyAll(alarm: AlarmRecord, _rule: AlarmRule): void {
    for (const notifier of this._notifiers) {
      try {
        switch (notifier.type) {
          case 'popup':
            this._eventBus.emit('alarmPopup' as ScadaEventType, {
              id: alarm.id,
              level: alarm.level,
              message: alarm.message,
              tagId: alarm.tagId,
              triggeredAt: alarm.triggeredAt,
              config: notifier.config,
            });
            break;
          case 'sound':
            this._eventBus.emit('alarmSound' as ScadaEventType, {
              id: alarm.id,
              level: alarm.level,
              config: notifier.config,
            });
            break;
          case 'email':
            this._eventBus.emit('alarmEmail' as ScadaEventType, {
              id: alarm.id,
              level: alarm.level,
              message: alarm.message,
              tagId: alarm.tagId,
              config: notifier.config,
            });
            break;
          case 'api':
            this._eventBus.emit('alarmApiNotify' as ScadaEventType, {
              id: alarm.id,
              level: alarm.level,
              message: alarm.message,
              config: notifier.config,
            });
            break;
          default:
            break;
        }
      } catch (err) {
        console.error(`[AlarmManager] Notifier error for type "${notifier.type}":`, err);
      }
    }
  }

  destroy(): void {
    for (const [, timer] of this._escalationTimers) {
      clearTimeout(timer);
    }
    this._escalationTimers.clear();

    for (const [, timer] of this._debounceTimers) {
      clearTimeout(timer);
    }
    this._debounceTimers.clear();

    this._alarms.clear();
    this._rules = [];
    this._suppressionRules = [];
    this._escalationRules = [];
    this._notifiers = [];
  }

  private _handleDebounce(rule: AlarmRule, tagId: string, value: any): void {
    const debounceKey = `debounce-${rule.definitionId}-${tagId}`;

    const existingTimer = this._debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (this.isSuppressed(rule.definitionId, tagId)) {
      return;
    }

    const delay = rule.debounceMs || 0;
    if (delay <= 0) {
      this.triggerAlarm(rule, tagId, value);
      return;
    }

    const timer = setTimeout(() => {
      if (this.isSuppressed(rule.definitionId, tagId)) {
        this._debounceTimers.delete(debounceKey);
        return;
      }
      this.triggerAlarm(rule, tagId, value);
      this._debounceTimers.delete(debounceKey);
    }, delay);

    this._debounceTimers.set(debounceKey, timer);
  }

  private _autoRecoverByRule(definitionId: string): void {
    for (const [, alarm] of this._alarms) {
      if (
        alarm.definitionId === definitionId &&
        (alarm.state === 'unacknowledged' || alarm.state === 'acknowledged')
      ) {
        this.recover(alarm.id);
      }
    }
  }

  private _parseThreshold(condition: string): number {
    const match = condition.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
    if (match) {
      return Number(match[2]) || 0;
    }
    return 0;
  }

  private _clearEscalationTimer(alarmId: string): void {
    for (const [key, timer] of this._escalationTimers) {
      if (key.startsWith(alarmId)) {
        clearTimeout(timer);
        this._escalationTimers.delete(key);
      }
    }
  }
}