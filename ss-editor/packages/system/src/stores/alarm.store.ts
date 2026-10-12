// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { alarmApi } from '../api/modules/alarm.api';
import { i18n } from '@scada-editor/core';
import type { AlarmRule, AlarmRecord, AlarmStatistics, AlarmTrend, AlarmTopRule, DeviceStats, TagStats } from '../types/api';

export const useAlarmStore = defineStore('alarm', () => {
  const rules = ref<AlarmRule[]>([]);
  const records = ref<AlarmRecord[]>([]);
  const statistics = ref<AlarmStatistics | null>(null);
  const trends = ref<AlarmTrend[]>([]);
  const topRules = ref<AlarmTopRule[]>([]);
  const statsByDevice = ref<DeviceStats[]>([]);
  const statsByTag = ref<TagStats[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeCount = computed(() =>
    records.value.filter((r: AlarmRecord) => r.status === 'active').length,
  );

  /** 实时告警计数（isActive=true，含 active/acknowledged/shelved 未恢复）。
   *  Phase 5.6：基于 isActive 字段显式统计，用于"实时告警"子标签徽标 */
  const realtimeCount = computed(() =>
    records.value.filter((r: AlarmRecord) => r.isActive === true).length,
  );

  async function fetchRules(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await alarmApi.getRules(projectId);
      rules.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchAlarmRulesFailed');
    } finally {
      loading.value = false;
    }
  }

  async function fetchRecords(projectId: string, params?: { limit?: number; level?: string; status?: string; keyword?: string; startDate?: string; endDate?: string; alarmType?: string; dispositionType?: string; isActive?: boolean }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await alarmApi.getRecords(projectId, params);
      records.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchAlarmRecordsFailed');
    } finally {
      loading.value = false;
    }
  }

  async function acknowledgeAlarm(projectId: string, recordId: string) {
    error.value = null;
    try {
      const res = await alarmApi.acknowledge(projectId, recordId);
      const updated = res.data || (res as any);
      const idx = records.value.findIndex((r: AlarmRecord) => r.id === recordId);
      if (idx !== -1) records.value[idx] = updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.acknowledgeAlarmFailed');
      throw e;
    }
  }

  async function clearAlarm(projectId: string, recordId: string) {
    error.value = null;
    try {
      const res = await alarmApi.clear(projectId, recordId);
      const updated = res.data || (res as any);
      const idx = records.value.findIndex((r: AlarmRecord) => r.id === recordId);
      if (idx !== -1) records.value[idx] = updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.clearAlarmFailed');
      throw e;
    }
  }

  async function shelveAlarm(projectId: string, recordId: string, reason: string) {
    error.value = null;
    try {
      const res = await alarmApi.shelve(projectId, recordId, reason);
      const updated = res.data || (res as any);
      const idx = records.value.findIndex((r: AlarmRecord) => r.id === recordId);
      if (idx !== -1) records.value[idx] = updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.shelveAlarmFailed');
      throw e;
    }
  }

  async function batchAcknowledgeAlarms(projectId: string, ids: string[]) {
    error.value = null;
    try {
      await alarmApi.batchAcknowledge(projectId, ids);
      // 更新本地状态
      for (const id of ids) {
        const idx = records.value.findIndex((r: AlarmRecord) => r.id === id);
        if (idx !== -1) {
          records.value[idx] = { ...records.value[idx], status: 'acknowledged' as any, acknowledgedAt: new Date().toISOString() };
        }
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.acknowledgeAlarmFailed');
      throw e;
    }
  }

  async function batchClearAlarms(projectId: string, ids: string[]) {
    error.value = null;
    try {
      await alarmApi.batchClear(projectId, ids);
      for (const id of ids) {
        const idx = records.value.findIndex((r: AlarmRecord) => r.id === id);
        if (idx !== -1) {
          records.value[idx] = { ...records.value[idx], status: 'cleared' as any, clearedAt: new Date().toISOString() };
        }
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.clearAlarmFailed');
      throw e;
    }
  }

  async function fetchStatistics(projectId: string) {
    try {
      const res = await alarmApi.getStatistics(projectId);
      statistics.value = res.data || (res as any);
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchStatisticsFailed');
    }
  }

  async function fetchTrends(projectId: string, days = 7) {
    try {
      const res = await alarmApi.getTrends(projectId, days);
      trends.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchTrendsFailed');
    }
  }

  async function fetchTopRules(projectId: string) {
    try {
      const res = await alarmApi.getTopRules(projectId);
      topRules.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchTopRulesFailed');
    }
  }

  async function fetchStatsByDevice(projectId: string) {
    try {
      const res = await alarmApi.getStatsByDevice(projectId);
      statsByDevice.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchStatsFailed');
    }
  }

  async function fetchStatsByTag(projectId: string) {
    try {
      const res = await alarmApi.getStatsByTag(projectId);
      statsByTag.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchStatsFailed');
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    rules,
    records,
    statistics,
    trends,
    topRules,
    statsByDevice,
    statsByTag,
    loading,
    error,
    activeCount,
    realtimeCount,
    fetchRules,
    fetchRecords,
    acknowledgeAlarm,
    clearAlarm,
    shelveAlarm,
    batchAcknowledgeAlarms,
    batchClearAlarms,
    fetchStatistics,
    fetchTrends,
    fetchTopRules,
    fetchStatsByDevice,
    fetchStatsByTag,
    clearError,
  };
});
