// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';
import { usePageStore, ProjectConfig } from '@scada-editor/core';

export type SavePageStatus = 'idle' | 'saving' | 'success' | 'error';

export function useEditorSave() {
  const pageStore = usePageStore();
  const saveStatus = ref<SavePageStatus>('idle');
  const lastSavedTime = ref<number | null>(null);
  const saveError = ref<string | null>(null);
  const projectsDir = ref<string>(ProjectConfig.getProjectsDir());

  const collectPageData = () => {
    const pages = pageStore.pages;
    return pages.map((page) => {
      const json = page.toJSON();
      return {
        id: json.id,
        name: json.name,
        width: json.width,
        height: json.height,
        backgroundColor: json.backgroundColor,
        backgroundImage: json.backgroundImage,
        graphics: json.graphics || [],
        layout: json.layout || null,
        templateId: json.templateId || undefined,
        templateMode: json.templateMode || undefined,
      };
    });
  };

  const setSaving = () => {
    saveStatus.value = 'saving';
    saveError.value = null;
  };

  const setSuccess = () => {
    saveStatus.value = 'success';
    lastSavedTime.value = Date.now();
  };

  const setError = (message: string) => {
    saveStatus.value = 'error';
    saveError.value = message;
  };

  const setProjectsDir = (dir: string) => {
    ProjectConfig.setProjectsDir(dir);
    projectsDir.value = dir;
  };

  const resetStatus = () => {
    saveStatus.value = 'idle';
    saveError.value = null;
  };

  return {
    saveStatus,
    lastSavedTime,
    saveError,
    projectsDir,
    collectPageData,
    setSaving,
    setSuccess,
    setError,
    setProjectsDir,
    resetStatus,
  };
}