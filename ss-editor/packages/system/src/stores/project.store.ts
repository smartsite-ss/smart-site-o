// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { projectApi } from '../api/modules/project.api';
import { i18n } from '@scada-editor/core';
import type { CreateProjectDto, UpdateProjectDto } from '../api/modules/project.api';
import type { Project, PaginationInfo, DiagnoseResult } from '../types/api';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const diagnosingProjects = ref<Record<string, DiagnoseResult | null>>({});
  const pagination = ref<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const searchKeyword = ref('');
  const error = ref<string | null>(null);

  const hasProjects = computed(() => projects.value.length > 0);
  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages);

  /**
   * 拉取项目列表
   *
   * @param page 当前页码
   * @param pageSize 每页数量
   * @param keyword 搜索关键字
   * @param includeDisabled 是否包含停用项目（项目管理页传 true 查看全部，首页统计/设备树默认 false 仅看启用）
   */
  async function fetchProjects(
    page = 1,
    pageSize = 20,
    keyword?: string,
    includeDisabled?: boolean,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const res = await projectApi.list({ page, pageSize, keyword }, includeDisabled);
      projects.value = res.data || [];
      pagination.value = res.pagination || {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      };
      if (keyword !== undefined) {
        searchKeyword.value = keyword;
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchProjectListFailed');
      projects.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await projectApi.getById(projectId);
      currentProject.value = res.data || (res as any);
      return currentProject.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchProjectFailed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createProject(dto: CreateProjectDto) {
    loading.value = true;
    error.value = null;
    try {
      const res = await projectApi.create(dto);
      const project = res.data || (res as any);
      projects.value.unshift(project);
      pagination.value.total += 1;
      return project;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.createProjectFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateProject(projectId: string, dto: UpdateProjectDto) {
    loading.value = true;
    error.value = null;
    try {
      const res = await projectApi.update(projectId, dto);
      const updated = res.data || (res as any);
      const index = projects.value.findIndex((p: Project) => p.projectId === updated.projectId || p.projectId === projectId);
      if (index !== -1) {
        projects.value[index] = updated;
      }
      if (currentProject.value?.projectId === updated.projectId || currentProject.value?.projectId === projectId) {
        currentProject.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateProjectFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteProject(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      await projectApi.delete(projectId);
      projects.value = projects.value.filter((p: Project) => p.projectId !== projectId);
      pagination.value.total -= 1;
      if (currentProject.value?.projectId === projectId) {
        currentProject.value = null;
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteProjectFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 切换项目启用状态（动态启停采集）
   *
   * - 启用 → 后端 EventBus 发 project:enabled，采集层加载设备并注册任务
   * - 停用 → 后端 EventBus 发 project:disabled，采集层立即停止该项目所有设备的采集任务
   *
   * @param projectId 项目 ID
   * @param enabled 目标状态：true=启用，false=停用
   */
  async function toggleProjectEnabled(projectId: string, enabled: boolean): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await projectApi.update(projectId, { enabled });
      const updated = res.data || (res as any);
      const index = projects.value.findIndex((p: Project) => p.projectId === projectId);
      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...updated };
      }
      if (currentProject.value?.projectId === projectId) {
        currentProject.value = { ...currentProject.value, ...updated };
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateProjectFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function diagnoseProject(projectId: string): Promise<DiagnoseResult | null> {
    try {
      const res = await projectApi.diagnose(projectId);
      const result: DiagnoseResult = res;
      diagnosingProjects.value[projectId] = result;
      return result;
    } catch (e: any) {
      diagnosingProjects.value[projectId] = null;
      throw e;
    }
  }

  async function initProjectResources(projectId: string, resources?: string[]): Promise<{
    initialized: string[];
    skipped: string[];
    warnings: string[];
  } | null> {
    const res = await projectApi.initResources(projectId, resources);
    return res;
  }

  function clearError() {
    error.value = null;
  }

  return {
    projects,
    currentProject,
    pagination,
    loading,
    searchKeyword,
    error,
    hasProjects,
    hasMore,
    diagnosingProjects,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    toggleProjectEnabled,
    diagnoseProject,
    initProjectResources,
    clearError,
  };
});
