// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { scriptApi } from '../api/modules/script.api';
import { i18n } from '@scada-editor/core';
import type { Script, ScriptExecution } from '../types/api';
import type { CreateScriptDto, UpdateScriptDto } from '../api/modules/script.api';

export const useScriptStore = defineStore('script', () => {
  const scripts = ref<Script[]>([]);
  const currentScript = ref<Script | null>(null);
  const currentExecutions = ref<ScriptExecution[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchScripts(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await scriptApi.list(projectId);
      scripts.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchScriptListFailed');
    } finally {
      loading.value = false;
    }
  }

  async function fetchScript(projectId: string, id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await scriptApi.getById(projectId, id);
      currentScript.value = res.data || (res as any);
      return currentScript.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchScriptFailed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createScript(projectId: string, dto: CreateScriptDto) {
    loading.value = true;
    error.value = null;
    try {
      const res = await scriptApi.create(projectId, dto);
      const script = res.data || (res as any);
      scripts.value.unshift(script);
      return script;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.createScriptFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateScript(projectId: string, id: string, dto: UpdateScriptDto) {
    error.value = null;
    try {
      const res = await scriptApi.update(projectId, id, dto);
      const updated = res.data || (res as any);
      const idx = scripts.value.findIndex((s: Script) => s.id === id);
      if (idx !== -1) scripts.value[idx] = updated;
      if (currentScript.value?.id === id) currentScript.value = updated;
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateScriptFailed');
      throw e;
    }
  }

  async function deleteScript(projectId: string, id: string) {
    error.value = null;
    try {
      await scriptApi.delete(projectId, id);
      scripts.value = scripts.value.filter((s: Script) => s.id !== id);
      if (currentScript.value?.id === id) currentScript.value = null;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteScriptFailed');
      throw e;
    }
  }

  async function executeScript(projectId: string, id: string) {
    error.value = null;
    try {
      const res = await scriptApi.execute(projectId, id);
      return res.data || (res as any);
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.executeScriptFailed');
      throw e;
    }
  }

  async function fetchHistory(projectId: string, id: string) {
    try {
      const res = await scriptApi.getHistory(projectId, id);
      currentExecutions.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchExecutionHistoryFailed');
    }
  }

  function clearError() { error.value = null; }

  return {
    scripts,
    currentScript,
    currentExecutions,
    loading,
    error,
    fetchScripts,
    fetchScript,
    createScript,
    updateScript,
    deleteScript,
    executeScript,
    fetchHistory,
    clearError,
  };
});
