// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pluginApi } from '../api/modules/plugin.api';
import { i18n } from '@scada-editor/core';
import type {
  PluginInfo,
  PluginStatusInfo,
  PluginConnectionSchema,
  PluginUpdateCheck,
  PluginHealthCheck,
  PluginActiveDevices,
  DeviceStats,
} from '../api/types/plugin';

export const usePluginStore = defineStore('plugin', () => {
  const plugins = ref<PluginInfo[]>([]);
  const currentPlugin = ref<PluginInfo | null>(null);
  const currentPluginStatus = ref<PluginStatusInfo | null>(null);
  const currentPluginSchema = ref<PluginConnectionSchema | null>(null);
  const updateCheck = ref<PluginUpdateCheck | null>(null);
  const health = ref<PluginHealthCheck | null>(null);
  const activeDevices = ref<PluginActiveDevices | null>(null);
  const deviceStats = ref<Record<string, DeviceStats>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filter = ref<{ status?: string; category?: string }>({ status: '', category: '' });

  async function fetchPlugins() {
    loading.value = true;
    error.value = null;
    try {
      const res: any = await pluginApi.list(filter.value);
      const data = res?.data?.data ?? res?.data ?? (Array.isArray(res) ? res : []);
      plugins.value = Array.isArray(data) ? data : [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.fetchFailed');
    } finally {
      loading.value = false;
    }
  }

  /** Extract actual data from potential double-wrapped {code,data:{code,data,...}} response */
  function unwrap(res: any): any {
    return res?.data?.data ?? res?.data ?? res;
  }

  async function fetchPlugin(protocol: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await pluginApi.getByProtocol(protocol);
      currentPlugin.value = unwrap(res) as PluginInfo;
      return currentPlugin.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.fetchFailed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPluginStatus(protocol: string) {
    error.value = null;
    try {
      const res = await pluginApi.getStatus(protocol);
      currentPluginStatus.value = unwrap(res) as PluginStatusInfo;
      return currentPluginStatus.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.fetchFailed');
      return null;
    }
  }

  async function fetchPluginSchema(protocol: string) {
    error.value = null;
    try {
      const res = await pluginApi.getSchema(protocol);
      currentPluginSchema.value = unwrap(res) as PluginConnectionSchema;
      return currentPluginSchema.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.fetchFailed');
      return null;
    }
  }

  async function activatePlugin(protocol: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await pluginApi.activate(protocol);
      const updated = unwrap(res) as PluginInfo;
      const index = plugins.value.findIndex((p) => p.protocol === protocol);
      if (index !== -1) {
        plugins.value[index] = updated;
      }
      if (currentPlugin.value?.protocol === protocol) {
        currentPlugin.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.activateFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deactivatePlugin(protocol: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await pluginApi.deactivate(protocol);
      const updated = unwrap(res) as PluginInfo;
      const index = plugins.value.findIndex((p) => p.protocol === protocol);
      if (index !== -1) {
        plugins.value[index] = updated;
      }
      if (currentPlugin.value?.protocol === protocol) {
        currentPlugin.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.deactivateFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function rediscover() {
    loading.value = true;
    error.value = null;
    try {
      await pluginApi.discover();
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.rediscoverFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function checkUpdate(protocol: string) {
    error.value = null;
    try {
      const res = await pluginApi.checkUpdate(protocol);
      updateCheck.value = unwrap(res) as PluginUpdateCheck;
      return updateCheck.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.updateFailed');
      return null;
    }
  }

  async function updatePlugin(protocol: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await pluginApi.update(protocol);
      const updated = unwrap(res) as PluginInfo;
      const index = plugins.value.findIndex((p) => p.protocol === protocol);
      if (index !== -1) {
        plugins.value[index] = updated;
      }
      if (currentPlugin.value?.protocol === protocol) {
        currentPlugin.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.updateFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function rollbackPlugin(protocol: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await pluginApi.rollback(protocol);
      const updated = unwrap(res) as PluginInfo;
      const index = plugins.value.findIndex((p) => p.protocol === protocol);
      if (index !== -1) {
        plugins.value[index] = updated;
      }
      if (currentPlugin.value?.protocol === protocol) {
        currentPlugin.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.rollbackFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchHealth() {
    error.value = null;
    try {
      const res = await pluginApi.health();
      health.value = unwrap(res) as PluginHealthCheck;
      return health.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.healthCheckFailed');
      return null;
    }
  }

  async function fetchActiveDevices(protocol: string) {
    error.value = null;
    try {
      const res = await pluginApi.getActiveDevices(protocol);
      activeDevices.value = unwrap(res) as PluginActiveDevices;
      return activeDevices.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.plugins.errors.fetchFailed');
      return null;
    }
  }

  async function fetchDeviceStats() {
    try {
      const res = await pluginApi.getDeviceStats();
      deviceStats.value = unwrap(res) as Record<string, DeviceStats>;
      return deviceStats.value;
    } catch (e: any) {
      // silent fail - stats are supplementary data
      return {};
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    plugins,
    currentPlugin,
    currentPluginStatus,
    currentPluginSchema,
    updateCheck,
    health,
    activeDevices,
    deviceStats,
    loading,
    error,
    filter,
    fetchPlugins,
    fetchPlugin,
    fetchPluginStatus,
    fetchPluginSchema,
    activatePlugin,
    deactivatePlugin,
    rediscover,
    checkUpdate,
    updatePlugin,
    rollbackPlugin,
    fetchHealth,
    fetchActiveDevices,
    fetchDeviceStats,
    clearError,
  };
});