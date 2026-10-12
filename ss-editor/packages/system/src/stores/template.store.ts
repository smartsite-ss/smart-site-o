// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { templateApi } from '../api/modules/template.api';
import { i18n } from '@scada-editor/core';
import type {
  CreateDeviceTemplateDto,
  UpdateDeviceTemplateDto,
  ApplyTemplateDto,
  SyncTemplateDto,
  DeviceTemplate,
  ApplyTemplateResult,
  SyncTemplateResult,
} from '../api/modules/template.api';
import type { PaginationInfo } from '../types/api';

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<DeviceTemplate[]>([]);
  const currentTemplate = ref<DeviceTemplate | null>(null);
  const pagination = ref<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasTemplates = computed(() => templates.value.length > 0);
  const draftCount = computed(() => templates.value.filter((t: DeviceTemplate) => t.status === 'draft').length);
  const publishedCount = computed(() => templates.value.filter((t: DeviceTemplate) => t.status === 'published').length);

  // Aggregate all unique tags from all loaded templates
  const allTags = computed(() => {
    const tagSet = new Set<string>();
    for (const tpl of templates.value) {
      for (const tag of tpl.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  });

  async function fetchTemplates(
    page = 1,
    pageSize = 20,
    deviceType?: string,
    status?: string,
    keyword?: string,
    locale?: string,  // ✨ 新增
  ) {
    loading.value = true;
    error.value = null;
    try {
      const res = await templateApi.list({ page, pageSize, deviceType, status, keyword, locale });
      const result = (res as any).data;
      templates.value = Array.isArray(result) ? result : (result?.data || []);
      pagination.value = (result?.pagination) || {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      };
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchTemplateListFailed');
      templates.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchTemplate(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await templateApi.getById(id);
      currentTemplate.value = (res as any).data ?? res;
      if (currentTemplate.value?.variables) {
        if (typeof currentTemplate.value.variables === 'string') {
          currentTemplate.value.variables = JSON.parse(currentTemplate.value.variables as any);
        }
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchTemplateFailed');
      currentTemplate.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function createTemplate(dto: CreateDeviceTemplateDto) {
    error.value = null;
    try {
      const res = await templateApi.create(dto);
      const template = (res as any).data ?? res;
      templates.value.unshift(template);
      pagination.value.total += 1;
      return template;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.createTemplateFailed');
      throw e;
    }
  }

  async function updateTemplate(id: string, dto: UpdateDeviceTemplateDto, locale?: string) {
    error.value = null;
    try {
      const res = await templateApi.update(id, dto, locale);
      const updated = (res as any).data ?? res;
      const idx = templates.value.findIndex((t: DeviceTemplate) => t.id === id);
      if (idx !== -1) templates.value[idx] = updated;
      if (currentTemplate.value?.id === id) currentTemplate.value = updated;
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateTemplateFailed');
      throw e;
    }
  }

  async function deleteTemplate(id: string) {
    error.value = null;
    try {
      await templateApi.delete(id);
      templates.value = templates.value.filter((t: DeviceTemplate) => t.id !== id);
      pagination.value.total = Math.max(0, pagination.value.total - 1);
      if (currentTemplate.value?.id === id) currentTemplate.value = null;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteTemplateFailed');
      throw e;
    }
  }

  async function publishTemplate(id: string) {
    error.value = null;
    try {
      const res = await templateApi.publish(id);
      const published = (res as any).data ?? res;
      const idx = templates.value.findIndex((t: DeviceTemplate) => t.id === id);
      if (idx !== -1) templates.value[idx] = published;
      if (currentTemplate.value?.id === id) currentTemplate.value = published;
      return published;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.publishTemplateFailed');
      throw e;
    }
  }

  async function deprecateTemplate(id: string) {
    error.value = null;
    try {
      const res = await templateApi.deprecate(id);
      const deprecated = (res as any).data ?? res;
      const idx = templates.value.findIndex((t: DeviceTemplate) => t.id === id);
      if (idx !== -1) templates.value[idx] = deprecated;
      if (currentTemplate.value?.id === id) currentTemplate.value = deprecated;
      return deprecated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deprecateTemplateFailed');
      throw e;
    }
  }

  async function cloneTemplate(id: string) {
    error.value = null;
    try {
      const res = await templateApi.clone(id);
      const cloned = (res as any).data ?? res;
      templates.value.unshift(cloned);
      pagination.value.total += 1;
      return cloned;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.cloneTemplateFailed');
      throw e;
    }
  }

  async function applyTemplate(templateId: string, dto: ApplyTemplateDto): Promise<ApplyTemplateResult> {
    error.value = null;
    try {
      const res = await templateApi.apply(templateId, dto);
      return (res as any).data ?? res;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.applyTemplateFailed');
      throw e;
    }
  }

  async function syncTemplate(templateId: string, dto: SyncTemplateDto): Promise<SyncTemplateResult> {
    error.value = null;
    try {
      const res = await templateApi.sync(templateId, dto);
      return (res as any).data ?? res;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.syncTemplateFailed');
      throw e;
    }
  }

  return {
    templates,
    currentTemplate,
    pagination,
    loading,
    error,
    hasTemplates,
    draftCount,
    publishedCount,
    allTags,
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    publishTemplate,
    deprecateTemplate,
    cloneTemplate,
    applyTemplate,
    syncTemplate,
  };
});