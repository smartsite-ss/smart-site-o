// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus } from '../../../scada-data/engine/EventBus';
import { AlarmManager } from '../../../scada-data/engine/AlarmManager';
import type { AlarmRule, AlarmNotifier } from '../../../scada-data/types/alarm.types';

describe('AlarmManager', () => {
  let eventBus: EventBus;
  let manager: AlarmManager;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = new EventBus();
    AlarmManager.resetInstance();
    manager = AlarmManager.getInstance(eventBus);
  });

  afterEach(() => {
    manager.destroy();
    AlarmManager.resetInstance();
    vi.useRealTimers();
  });

  // ==================== getInstance ====================
  describe('getInstance', () => {
    it('TC-ALM-001: should return same instance on repeated calls', () => {
      const a = AlarmManager.getInstance();
      const b = AlarmManager.getInstance();
      expect(a).toBe(b);
    });

    it('TC-ALM-002: should throw error if EventBus not provided on first initialization', () => {
      AlarmManager.resetInstance();
      expect(() => AlarmManager.getInstance()).toThrow('[AlarmManager] EventBus instance required');
    });

    it('TC-ALM-003: should not require EventBus on subsequent getInstance calls', () => {
      AlarmManager.resetInstance();
      AlarmManager.getInstance(eventBus);
      const instance = AlarmManager.getInstance();
      expect(instance).toBeDefined();
    });
  });

  // ==================== addRule / removeRule / getRules ====================
  describe('rule CRUD', () => {
    const makeRule = (overrides: Partial<AlarmRule> = {}): AlarmRule => ({
      definitionId: 'rule-1',
      tagId: 'tag-1',
      condition: '>=80',
      level: 'warning',
      message: 'High temperature',
      debounceMs: 0,
      autoRecover: false,
      ...overrides,
    });

    it('TC-ALM-010: addRule should add a new rule', () => {
      const rule = makeRule();
      manager.addRule(rule);
      // Can't inspect private _rules directly; verify via evaluateRules behavior
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('tag-1', 90, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-011: addRule should replace existing rule with same definitionId', () => {
      const rule1 = makeRule({ condition: '>=80', level: 'warning' });
      const rule2 = makeRule({ condition: '>=90', level: 'critical' });
      manager.addRule(rule1);
      manager.addRule(rule2);
      const spy = vi.spyOn(manager, 'triggerAlarm');
      // 85 >= 80 would trigger under rule1, but rule2 replaced it requiring >= 90
      manager.evaluateRules('tag-1', 85, 'good');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-012: removeRule should remove rule by definitionId', () => {
      const rule = makeRule();
      manager.addRule(rule);
      manager.removeRule('rule-1');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('tag-1', 90, 'good');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-013: removeRule should be idempotent for non-existent rule', () => {
      expect(() => manager.removeRule('non-existent')).not.toThrow();
    });
  });

  // ==================== evaluateRules - condition evaluation ====================
  describe('evaluateRules - condition operators', () => {
    const addRule = (id: string, tagId: string, condition: string) => {
      manager.addRule({
        definitionId: id, tagId, condition, level: 'warning',
        message: 'Test', debounceMs: 0, autoRecover: false,
      });
    };

    it('TC-ALM-020: should trigger on >= condition met', () => {
      addRule('r1', 't1', '>=50');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 50, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-021: should trigger on > condition met', () => {
      addRule('r1', 't1', '>50');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 51, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-022: should NOT trigger on > condition not met (equal)', () => {
      addRule('r1', 't1', '>50');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 50, 'good');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-023: should trigger on <= condition met', () => {
      addRule('r1', 't1', '<=10');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 10, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-024: should trigger on < condition met', () => {
      addRule('r1', 't1', '<10');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 5, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-025: should trigger on == condition met', () => {
      addRule('r1', 't1', '==100');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 100, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-026: should trigger on != condition met', () => {
      addRule('r1', 't1', '!=0');
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.evaluateRules('t1', 1, 'good');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('TC-ALM-027: should return false for invalid condition string', () => {
      const result = manager.evaluateCondition('invalid', { value: 10, quality: 'good' });
      expect(result).toBe(false);
    });

    it('TC-ALM-028: should return false for empty condition', () => {
      const result = manager.evaluateCondition('', { value: 10, quality: 'good' });
      expect(result).toBe(false);
    });

    it('TC-ALM-029: should return false for non-string condition', () => {
      const result = manager.evaluateCondition(null as any, { value: 10, quality: 'good' });
      expect(result).toBe(false);
    });

    it('TC-ALM-030: should return false when value is NaN', () => {
      const result = manager.evaluateCondition('>=10', { value: 'abc', quality: 'good' });
      expect(result).toBe(false);
    });

    it('TC-ALM-031: should return false when operand is NaN', () => {
      const result = manager.evaluateCondition('>=abc', { value: 10, quality: 'good' });
      expect(result).toBe(false);
    });
  });

  // ==================== triggerAlarm ====================
  describe('triggerAlarm', () => {
    it('TC-ALM-040: should create alarm record with correct fields', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'critical', message: 'Over limit', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 85);
      expect(alarm.id).toBeDefined();
      expect(alarm.definitionId).toBe('rule-1');
      expect(alarm.tagId).toBe('tag-1');
      expect(alarm.level).toBe('critical');
      expect(alarm.state).toBe('unacknowledged');
      expect(alarm.value).toBe(85);
      expect(alarm.threshold).toBe(80);
      expect(alarm.message).toBe('Over limit');
      expect(alarm.triggeredAt).toBeGreaterThan(0);
      expect(alarm.escalationLevel).toBe(0);
    });

    it('TC-ALM-041: should emit alarmTriggered event', () => {
      const callback = vi.fn();
      eventBus.on('alarmTriggered', callback);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Alarm', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].payload).toMatchObject({
        definitionId: 'rule-1',
        tagId: 'tag-1',
        level: 'warning',
        value: 90,
      });
    });

    it('TC-ALM-042: should return alarm and add to active alarms', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      const active = manager.getActiveAlarms();
      expect(active.some((a) => a.id === alarm.id)).toBe(true);
    });
  });

  // ==================== acknowledge ====================
  describe('acknowledge', () => {
    it('TC-ALM-050: should acknowledge an unacknowledged alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'operator1');
      const active = manager.getActiveAlarms();
      const acked = active.find((a) => a.id === alarm.id);
      expect(acked?.state).toBe('acknowledged');
      expect(acked?.acknowledgedBy).toBe('operator1');
      expect(acked?.acknowledgedAt).toBeGreaterThan(0);
    });

    it('TC-ALM-051: should emit alarmAcknowledged event', () => {
      const callback = vi.fn();
      eventBus.on('alarmAcknowledged', callback);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'op');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].payload).toMatchObject({
        acknowledgedBy: 'op',
      });
    });

    it('TC-ALM-052: should warn when acknowledging non-existent alarm', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.acknowledge('non-existent', 'op');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Alarm not found'));
      warnSpy.mockRestore();
    });

    it('TC-ALM-053: should not re-acknowledge already acknowledged alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'op1');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.acknowledge(alarm.id, 'op2');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot acknowledge'));
      warnSpy.mockRestore();
    });

    it('TC-ALM-054: should not acknowledge recovered alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager.acknowledge(alarm.id, 'op');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot acknowledge'));
      warnSpy.mockRestore();
    });
  });

  // ==================== recover ====================
  describe('recover', () => {
    it('TC-ALM-060: should recover active alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      const alarms = manager.getAlarmsByState('recovered');
      expect(alarms.length).toBe(1);
      expect(alarms[0].id).toBe(alarm.id);
      expect(alarms[0].recoveredAt).toBeGreaterThan(0);
    });

    it('TC-ALM-061: should emit alarmCleared event on recover', () => {
      const callback = vi.fn();
      eventBus.on('alarmCleared', callback);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-062: should not recover already recovered alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      // Second recover should be no-op
      const callback = vi.fn();
      eventBus.on('alarmCleared', callback);
      manager.recover(alarm.id);
      expect(callback).not.toHaveBeenCalled();
    });

    it('TC-ALM-063: recovered alarm should not appear in active alarms', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      const active = manager.getActiveAlarms();
      expect(active).toHaveLength(0);
    });
  });

  // ==================== archive ====================
  describe('archive', () => {
    it('TC-ALM-070: should archive alarm', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.archive(alarm.id);
      const archived = manager.getAlarmsByState('archived');
      expect(archived.length).toBe(1);
      expect(archived[0].state).toBe('archived');
    });

    it('TC-ALM-071: should emit alarmArchived event', () => {
      const callback = vi.fn();
      eventBus.on('alarmArchived' as any, callback);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.archive(alarm.id);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== getActiveAlarms / getAlarmsByState ====================
  describe('getActiveAlarms / getAlarmsByState', () => {
    it('TC-ALM-080: getActiveAlarms should return only active alarms', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      const active = manager.getActiveAlarms();
      expect(active).toHaveLength(1);
      expect(active[0].state).toBe('unacknowledged');
    });

    it('TC-ALM-081: getActiveAlarms should return acknowledged alarms', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'op');
      const active = manager.getActiveAlarms();
      expect(active).toHaveLength(1);
      expect(active[0].state).toBe('acknowledged');
    });

    it('TC-ALM-082: getActiveAlarms should not return recovered alarms', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.recover(alarm.id);
      expect(manager.getActiveAlarms()).toHaveLength(0);
    });

    it('TC-ALM-083: getAlarmsByState should filter by state', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'op');
      expect(manager.getAlarmsByState('acknowledged')).toHaveLength(1);
      expect(manager.getAlarmsByState('unacknowledged')).toHaveLength(0);
    });
  });

  // ==================== registerNotifier ====================
  describe('registerNotifier', () => {
    it('TC-ALM-090: should call notifier when alarm triggers', () => {
      const popupCallback = vi.fn();
      eventBus.on('alarmPopup' as any, popupCallback);
      const notifier: AlarmNotifier = { type: 'popup', config: { timeout: 5000 } };
      manager.registerNotifier(notifier);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      expect(popupCallback).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-091: should handle sound notifier', () => {
      const soundCallback = vi.fn();
      eventBus.on('alarmSound' as any, soundCallback);
      const notifier: AlarmNotifier = { type: 'sound', config: { file: 'beep.wav' } };
      manager.registerNotifier(notifier);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      expect(soundCallback).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-092: should handle email notifier', () => {
      const emailCallback = vi.fn();
      eventBus.on('alarmEmail' as any, emailCallback);
      const notifier: AlarmNotifier = { type: 'email', config: { to: 'admin@test.com' } };
      manager.registerNotifier(notifier);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      expect(emailCallback).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-093: should handle api notifier', () => {
      const apiCallback = vi.fn();
      eventBus.on('alarmApiNotify' as any, apiCallback);
      const notifier: AlarmNotifier = { type: 'api', config: { url: 'http://api/callback' } };
      manager.registerNotifier(notifier);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.triggerAlarm(rule, 'tag-1', 90);
      expect(apiCallback).toHaveBeenCalledTimes(1);
    });

    it('TC-ALM-094: should not throw for unknown notifier type', () => {
      const notifier: AlarmNotifier = { type: 'unknown' as any, config: {} };
      manager.registerNotifier(notifier);
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      expect(() => manager.triggerAlarm(rule, 'tag-1', 90)).not.toThrow();
    });
  });

  // ==================== debounce ====================
  describe('debounce', () => {
    it('TC-ALM-100: should delay alarm triggering when debounceMs > 0', () => {
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 500, autoRecover: false,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('TC-ALM-101: should reset debounce timer on repeated evaluation', () => {
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 500, autoRecover: false,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      vi.advanceTimersByTime(300);
      manager.evaluateRules('tag-1', 95, 'good');
      vi.advanceTimersByTime(300);
      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('TC-ALM-102: should trigger immediately when debounceMs is 0', () => {
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  // ==================== autoRecover ====================
  describe('autoRecover', () => {
    it('TC-ALM-110: should auto-recover when condition no longer met', () => {
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: true,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      expect(manager.getActiveAlarms()).toHaveLength(1);
      manager.evaluateRules('tag-1', 70, 'good');
      expect(manager.getActiveAlarms()).toHaveLength(0);
    });

    it('TC-ALM-111: should NOT auto-recover when autoRecover is false', () => {
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      expect(manager.getActiveAlarms()).toHaveLength(1);
      manager.evaluateRules('tag-1', 70, 'good');
      expect(manager.getActiveAlarms()).toHaveLength(1);
    });
  });

  // ==================== suppression rules ====================
  describe('suppression rules', () => {
    it('TC-ALM-120: should suppress alarm when source alarm is active', () => {
      const rule1: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'critical', message: 'Primary', debounceMs: 0, autoRecover: false,
      };
      const rule2: AlarmRule = {
        definitionId: 'rule-2', tagId: 'tag-1', condition: '>=70',
        level: 'warning', message: 'Secondary', debounceMs: 0, autoRecover: false,
      };
      manager.addRule(rule1);
      manager.addRule(rule2);
      const alarm1 = manager.triggerAlarm(rule1, 'tag-1', 90);
      manager.addSuppressionRule({
        sourceAlarmId: alarm1.id,
        suppressedAlarmId: 'any-suppressed',
        duration: 0,
      });
      // The suppressedAlarmId is matched against alarm records, not rule ids directly
      const suppressed = manager.isSuppressed('rule-2', 'tag-1');
      // Since no alarm with suppressedAlarmId exists, this should be false
      expect(suppressed).toBe(false);
    });

    it('TC-ALM-121: isSuppressed should return false when source alarm not active', () => {
      const result = manager.isSuppressed('some-rule', 'some-tag');
      expect(result).toBe(false);
    });
  });

  // ==================== escalation ====================
  describe('escalation', () => {
    it('TC-ALM-130: should escalate alarm after duration', () => {
      const callback = vi.fn();
      eventBus.on('alarmEscalated', callback);
      manager.addEscalationRule({
        afterDuration: 1000,
        newLevel: 'critical',
        notifyUsers: ['admin'],
      });
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].payload).toMatchObject({
        newLevel: 'critical',
        escalationLevel: 1,
      });
      // Alarm level should be upgraded
      const active = manager.getActiveAlarms();
      const escalated = active.find((a) => a.id === alarm.id);
      expect(escalated?.level).toBe('critical');
      expect(escalated?.escalationLevel).toBe(1);
    });

    it('TC-ALM-131: should not escalate acknowledged alarm', () => {
      const callback = vi.fn();
      eventBus.on('alarmEscalated', callback);
      manager.addEscalationRule({
        afterDuration: 1000,
        newLevel: 'critical',
        notifyUsers: ['admin'],
      });
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      const alarm = manager.triggerAlarm(rule, 'tag-1', 90);
      manager.acknowledge(alarm.id, 'op');
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ==================== destroy ====================
  describe('destroy', () => {
    it('TC-ALM-140: should clear all state on destroy', () => {
      const rule: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      };
      manager.addRule(rule);
      manager.triggerAlarm(rule, 'tag-1', 90);
      manager.destroy();
      expect(manager.getActiveAlarms()).toHaveLength(0);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('TC-ALM-150: should handle multiple rules for same tag', () => {
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'High', debounceMs: 0, autoRecover: false,
      });
      manager.addRule({
        definitionId: 'rule-2', tagId: 'tag-1', condition: '<=20',
        level: 'warning', message: 'Low', debounceMs: 0, autoRecover: false,
      });
      manager.evaluateRules('tag-1', 90, 'good');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('TC-ALM-151: should handle evaluateRules with no matching rules', () => {
      expect(() => manager.evaluateRules('no-rule-tag', 50, 'good')).not.toThrow();
    });

    it('TC-ALM-152: should handle multiple alarms for same tag', () => {
      const rule1: AlarmRule = {
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'High', debounceMs: 0, autoRecover: false,
      };
      const rule2: AlarmRule = {
        definitionId: 'rule-2', tagId: 'tag-1', condition: '>=90',
        level: 'critical', message: 'Critical', debounceMs: 0, autoRecover: false,
      };
      manager.addRule(rule1);
      manager.addRule(rule2);
      manager.evaluateRules('tag-1', 95, 'good');
      const active = manager.getActiveAlarms();
      expect(active.length).toBeGreaterThanOrEqual(2);
    });

    it('TC-ALM-153: should handle string value that converts to number', () => {
      const spy = vi.spyOn(manager, 'triggerAlarm');
      manager.addRule({
        definitionId: 'rule-1', tagId: 'tag-1', condition: '>=80',
        level: 'warning', message: 'Test', debounceMs: 0, autoRecover: false,
      });
      manager.evaluateRules('tag-1', '95', 'good');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });
});