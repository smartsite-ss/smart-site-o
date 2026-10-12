// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, onUnmounted } from 'vue';
import { SaveStatus, SaveServiceConfig, ProjectData, ISaveService, saveServiceManager } from '@scada-editor/core';

export interface AutoSaveOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export function useProjectSave(
  config: SaveServiceConfig,
  customService?: ISaveService,
  autoSaveOptions?: AutoSaveOptions,
) {
  const saveStatus = ref<SaveStatus>('idle');
  const lastSavedTime = ref<number | null>(null);
  const isAutoSaveEnabled = ref(autoSaveOptions?.enabled ?? true);
  const autoSaveIntervalMs = ref(autoSaveOptions?.intervalMs ?? 300000);
  const autoSaveTimer = ref<number | null>(null);
  const statusUnsubscribe = ref<(() => void) | null>(null);

  const initSaveService = () => {
    saveServiceManager.init(config, customService);
    statusUnsubscribe.value = saveServiceManager.onStatusChange((status) => {
      saveStatus.value = status;
    });
  };

  const saveProject = async (projectData: ProjectData) => {
    try {
      await saveServiceManager.save(projectData);
      lastSavedTime.value = saveServiceManager.getLastSavedTime();
    } catch (error) {
      console.error('[useProjectSave] 保存失败', error);
      throw error;
    }
  };

  const restoreProject = async () => {
    try {
      // 直接调用 load()，不再前置 hasSavedData() 检查
      // hasSavedData() 会重复请求 /pages 和 /groups，与 load() 高度重叠
      const projectData = await saveServiceManager.load();
      if (projectData) {
        lastSavedTime.value = projectData.savedAt;
      }
      return projectData;
    } catch (error) {
      console.error('[useProjectSave] 恢复失败', error);
      return null;
    }
  };

  let _autoSaveCallback: (() => Promise<void>) | null = null;

  const scheduleAutoSave = (saveCallback?: () => Promise<void>) => {
    if (saveCallback) {
      _autoSaveCallback = saveCallback;
    }
    if (!_autoSaveCallback || !isAutoSaveEnabled.value) return;
    if (autoSaveTimer.value) {
      clearTimeout(autoSaveTimer.value);
    }
    autoSaveTimer.value = window.setTimeout(() => {
      _autoSaveCallback!().catch(err => console.error('[useProjectSave] 自动保存失败', err));
      autoSaveTimer.value = null;
    }, autoSaveIntervalMs.value);
  };

  const setAutoSaveEnabled = (enabled: boolean) => {
    isAutoSaveEnabled.value = enabled;
    if (!enabled && autoSaveTimer.value) {
      clearTimeout(autoSaveTimer.value);
      autoSaveTimer.value = null;
    }
  };

  const setAutoSaveInterval = (ms: number) => {
    autoSaveIntervalMs.value = ms;
  };

  const clearSaveData = async () => {
    try {
      await saveServiceManager.delete();
      lastSavedTime.value = null;
    } catch (error) {
      console.error('[useProjectSave] 清除失败', error);
      throw error;
    }
  };

  onUnmounted(() => {
    if (autoSaveTimer.value) {
      clearTimeout(autoSaveTimer.value);
    }
    if (statusUnsubscribe.value) {
      statusUnsubscribe.value();
    }
  });

  return {
    saveStatus,
    lastSavedTime,
    isAutoSaveEnabled,
    initSaveService,
    saveProject,
    restoreProject,
    scheduleAutoSave,
    clearSaveData,
    setAutoSaveEnabled,
    setAutoSaveInterval,
  };
}