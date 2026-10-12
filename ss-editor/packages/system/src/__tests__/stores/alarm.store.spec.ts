// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAlarmStore } from '../../stores/alarm.store';

vi.mock('../../api/modules/alarm.api', () => ({
  alarmApi: {
    getRules: vi.fn(),
    getRecords: vi.fn(),
    acknowledge: vi.fn(),
    clear: vi.fn(),
    shelve: vi.fn(),
    getStatistics: vi.fn(),
    getTrends: vi.fn(),
    getTopRules: vi.fn(),
    getSuppressionRules: vi.fn(),
    addSuppressionRule: vi.fn(),
    getEscalationRules: vi.fn(),
    exportReport: vi.fn(),
  },
}));

const mockRecord = (id: string, status: string) => ({
  id,
  ruleName: 'High Temp',
  deviceName: 'Device 1',
  severity: 'critical' as const,
  status,
  value: 100,
  threshold: 80,
  triggeredAt: '2024-01-01T00:00:00Z',
});

describe('useAlarmStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty rules and records', () => {
      const store = useAlarmStore();
      expect(store.rules).toEqual([]);
      expect(store.records).toEqual([]);
    });

    it('should have null statistics', () => {
      const store = useAlarmStore();
      expect(store.statistics).toBeNull();
    });

    it('should have loading as false', () => {
      const store = useAlarmStore();
      expect(store.loading).toBe(false);
    });

    it('should have activeCount as 0', () => {
      const store = useAlarmStore();
      expect(store.activeCount).toBe(0);
    });
  });

  describe('fetchRules', () => {
    it('should populate rules', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const rules = [{ id: 'r1', name: 'High Temp', enabled: true, projectId: 'proj-1' }];
      (alarmApi.getRules as any).mockResolvedValueOnce({ data: rules });

      const store = useAlarmStore();
      await store.fetchRules('proj-1');

      expect(store.rules).toHaveLength(1);
      expect(store.rules[0].name).toBe('High Temp');
    });

    it('should handle error', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      (alarmApi.getRules as any).mockRejectedValueOnce(new Error('Failed'));

      const store = useAlarmStore();
      await store.fetchRules('proj-1');

      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchRecords', () => {
    it('should populate records and calculate activeCount', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const records = [
        mockRecord('a1', 'active'),
        mockRecord('a2', 'active'),
        mockRecord('a3', 'cleared'),
      ];
      (alarmApi.getRecords as any).mockResolvedValueOnce({ data: records });

      const store = useAlarmStore();
      await store.fetchRecords('proj-1');

      expect(store.records).toHaveLength(3);
      expect(store.activeCount).toBe(2);
    });
  });

  describe('acknowledgeAlarm', () => {
    it('should update record after acknowledge', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const records = [mockRecord('a1', 'active')];
      (alarmApi.getRecords as any).mockResolvedValueOnce({ data: records });
      const acknowledged = { ...records[0], status: 'acknowledged' };
      (alarmApi.acknowledge as any).mockResolvedValueOnce({ data: acknowledged });

      const store = useAlarmStore();
      await store.fetchRecords('proj-1');
      await store.acknowledgeAlarm('proj-1', 'a1');

      expect(store.records[0].status).toBe('acknowledged');
    });
  });

  describe('clearAlarm', () => {
    it('should update record after clear', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const records = [mockRecord('a1', 'active')];
      (alarmApi.getRecords as any).mockResolvedValueOnce({ data: records });
      const cleared = { ...records[0], status: 'cleared' };
      (alarmApi.clear as any).mockResolvedValueOnce({ data: cleared });

      const store = useAlarmStore();
      await store.fetchRecords('proj-1');
      await store.clearAlarm('proj-1', 'a1');

      expect(store.records[0].status).toBe('cleared');
    });
  });

  describe('shelveAlarm', () => {
    it('should update record after shelve', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const records = [mockRecord('a1', 'active')];
      (alarmApi.getRecords as any).mockResolvedValueOnce({ data: records });
      const shelved = { ...records[0], status: 'shelved' };
      (alarmApi.shelve as any).mockResolvedValueOnce({ data: shelved });

      const store = useAlarmStore();
      await store.fetchRecords('proj-1');
      await store.shelveAlarm('proj-1', 'a1', 'Maintenance');

      expect(store.records[0].status).toBe('shelved');
    });
  });

  describe('fetchStatistics', () => {
    it('should populate statistics', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const stats = { total: 100, active: 5, acknowledged: 90, cleared: 5 };
      (alarmApi.getStatistics as any).mockResolvedValueOnce({ data: stats });

      const store = useAlarmStore();
      await store.fetchStatistics('proj-1');

      expect(store.statistics).toEqual(stats);
    });

    it('should handle error', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      (alarmApi.getStatistics as any).mockRejectedValueOnce(new Error('Failed'));

      const store = useAlarmStore();
      await store.fetchStatistics('proj-1');

      expect(store.error).toBeTruthy();
    });
  });

  describe('fetchTrends', () => {
    it('should populate trends', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      const trends = [{ date: '2024-01-01', count: 10 }];
      (alarmApi.getTrends as any).mockResolvedValueOnce({ data: trends });

      const store = useAlarmStore();
      await store.fetchTrends('proj-1', 7);

      expect(store.trends).toHaveLength(1);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { alarmApi } = await import('../../api/modules/alarm.api');
      (alarmApi.getRules as any).mockRejectedValueOnce(new Error('Failed'));

      const store = useAlarmStore();
      await store.fetchRules('proj-1');
      expect(store.error).toBeTruthy();

      store.clearError();
      expect(store.error).toBeNull();
    });
  });
});