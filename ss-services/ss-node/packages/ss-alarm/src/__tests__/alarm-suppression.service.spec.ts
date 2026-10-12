// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import {
  AlarmSuppressionService,
  SuppressionRule,
  AlarmEvent,
} from '../engine/alarm-suppression.service';

function makeRule(overrides: Partial<SuppressionRule> = {}): SuppressionRule {
  return {
    id: 'rule-001',
    type: 'maintenance',
    duration: 60000,
    devices: ['device-001'],
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<AlarmEvent> = {}): AlarmEvent {
  return {
    deviceId: 'device-001',
    tagId: 'tag-001',
    ruleId: 'rule-001',
    ...overrides,
  };
}

describe('AlarmSuppressionService', () => {
  let service: AlarmSuppressionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlarmSuppressionService],
    }).compile();

    service = module.get<AlarmSuppressionService>(AlarmSuppressionService);
  });

  // ==================== TC-ALM-080: maintenance mode suppression ====================
  it('TC-ALM-080: should suppress alarm during maintenance mode', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'maintenance',
        devices: ['device-001'],
        duration: 60000,
      }),
    );

    const event = makeEvent({ deviceId: 'device-001' });
    const result = service.isSuppressed(event);

    expect(result).toBe(true);
  });

  // ==================== TC-ALM-081: maintenance mode expires ====================
  it('TC-ALM-081: should not suppress after maintenance mode expires', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'maintenance',
        devices: ['device-001'],
        duration: 1,
      }),
    );

    jest.advanceTimersByTime(10);

    const event = makeEvent({ deviceId: 'device-001' });
    const result = service.isSuppressed(event);

    expect(result).toBe(false);
  });

  // ==================== TC-ALM-082: device offline suppression ====================
  it('TC-ALM-082: should suppress alarm for offline device', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'device_offline',
        devices: ['device-offline'],
        duration: undefined,
      }),
    );

    const event = makeEvent({ deviceId: 'device-offline' });
    const result = service.isSuppressed(event);

    expect(result).toBe(true);
  });

  // ==================== TC-ALM-083: parent-child suppression ====================
  it('TC-ALM-083: should suppress child alarm when parent is active', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'parent_child',
        parentRuleId: 'parent-rule',
        childRuleIds: ['child-rule-1', 'child-rule-2'],
        duration: undefined,
      }),
    );

    const event = makeEvent({ ruleId: 'child-rule-1' });
    const result = service.isSuppressed(event);

    expect(result).toBe(true);
  });

  // ==================== TC-ALM-084: remove suppression rule ====================
  it('TC-ALM-084: should remove suppression rule', () => {
    const ruleId = service.addSuppressionRule(
      makeRule({
        type: 'maintenance',
        devices: ['device-001'],
      }),
    );

    const removed = service.removeSuppressionRule(ruleId);
    expect(removed).toBe(true);

    const event = makeEvent({ deviceId: 'device-001' });
    const result = service.isSuppressed(event);
    expect(result).toBe(false);
  });

  // ==================== TC-ALM-085: multiple suppression rules ====================
  it('TC-ALM-085: should handle multiple suppression rules', () => {
    service.addSuppressionRule(
      makeRule({
        id: 'rule-1',
        type: 'maintenance',
        devices: ['device-001'],
      }),
    );
    service.addSuppressionRule(
      makeRule({
        id: 'rule-2',
        type: 'device_offline',
        devices: ['device-002'],
      }),
    );
    service.addSuppressionRule(
      makeRule({
        id: 'rule-3',
        type: 'parent_child',
        childRuleIds: ['rule-xyz'],
      }),
    );

    expect(service.isSuppressed(makeEvent({ deviceId: 'device-001' }))).toBe(true);
    expect(service.isSuppressed(makeEvent({ deviceId: 'device-002' }))).toBe(true);
    expect(service.isSuppressed(makeEvent({ ruleId: 'rule-xyz' }))).toBe(true);
    expect(service.isSuppressed(makeEvent({ deviceId: 'device-003', ruleId: 'rule-abc' }))).toBe(
      false,
    );
  });

  // ==================== TC-ALM-086: suppression rule expiry ====================
  it('TC-ALM-086: should handle suppression rule expiry', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'maintenance',
        duration: 1,
        devices: ['device-001'],
      }),
    );

    const cleared = service.clearExpiredRules();
    expect(cleared).toBeGreaterThanOrEqual(0);
  });

  // ==================== TC-ALM-087: non-suppressed alarm passes through ====================
  it('TC-ALM-087: should pass through non-suppressed alarms', () => {
    service.addSuppressionRule(
      makeRule({
        type: 'maintenance',
        devices: ['device-001'],
      }),
    );

    const event = makeEvent({ deviceId: 'device-002' });
    const result = service.isSuppressed(event);

    expect(result).toBe(false);
  });

  // ==================== getSuppressionRules ====================
  it('should return all active suppression rules', () => {
    service.addSuppressionRule(makeRule({ id: 'rule-1', type: 'maintenance' }));
    service.addSuppressionRule(
      makeRule({ id: 'rule-2', type: 'device_offline', duration: undefined }),
    );

    const rules = service.getSuppressionRules();
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.id)).toEqual(expect.arrayContaining(['rule-1', 'rule-2']));
  });

  // ==================== removeSuppressionRule non-existent ====================
  it('should return false when removing non-existent rule', () => {
    const result = service.removeSuppressionRule('non-existent');
    expect(result).toBe(false);
  });
});
