// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { deviceApi } from '../api/modules/device.api';
import { i18n } from '@scada-editor/core';
import type {
  CreateDeviceDto,
  UpdateDeviceDto,
  CreateDataTagDto,
  UpdateDataTagDto,
  CreateDeviceGroupDto,
  UpdateDeviceGroupDto,
} from '../api/modules/device.api';
import type { Device, DataTag, DeviceGroup, DeviceTree, DeviceSummary, PaginationInfo } from '../types/api';

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([]);
  const currentDevice = ref<Device | null>(null);
  const currentDeviceTags = ref<DataTag[]>([]);
  const groups = ref<DeviceGroup[]>([]);
  const groupTree = ref<DeviceTree[]>([]);
  /** 未分组的设备（挂载在项目节点下） */
  const rootDevices = ref<DeviceSummary[]>([]);
  const pagination = ref<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedGroupId = ref<string | null>(null);

  const hasDevices = computed(() => devices.value.length > 0);

  async function fetchDevices(projectId: string, page = 1, pageSize = 20, keyword?: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await deviceApi.list(projectId, { page, pageSize, keyword });
      devices.value = res.data || [];
      pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchDeviceListFailed');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 静默刷新设备列表（不显示 loading，用于定时刷新 lastOnlineAt / lastDataAt 等字段）
   */
  async function silentRefreshDevices(projectId: string, page = 1, pageSize = 20, keyword?: string) {
    try {
      const res = await deviceApi.list(projectId, { page, pageSize, keyword });
      devices.value = res.data || [];
      pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };
    } catch {
      // 静默失败，不影响当前显示
    }
  }

  async function fetchDevice(projectId: string, deviceId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await deviceApi.getById(projectId, deviceId);
      currentDevice.value = res.data || (res as any);
      currentDeviceTags.value = currentDevice.value?.tags || [];
      return currentDevice.value;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchDeviceFailed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createDevice(projectId: string, dto: CreateDeviceDto) {
    loading.value = true;
    error.value = null;
    try {
      const res = await deviceApi.create(projectId, dto);
      const device = res.data || (res as any);
      devices.value.unshift(device);
      pagination.value.total += 1;
      return device;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.createDeviceFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateDevice(projectId: string, deviceId: string, dto: UpdateDeviceDto) {
    loading.value = true;
    error.value = null;
    try {
      const res = await deviceApi.update(projectId, deviceId, dto);
      const updated = res.data || (res as any);
      const index = devices.value.findIndex((d: Device) => d.id === deviceId);
      if (index !== -1) {
        devices.value[index] = updated;
      }
      if (currentDevice.value?.id === deviceId) {
        currentDevice.value = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateDeviceFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteDevice(projectId: string, deviceId: string) {
    loading.value = true;
    error.value = null;
    try {
      await deviceApi.delete(projectId, deviceId);
      devices.value = devices.value.filter((d: Device) => d.id !== deviceId);
      pagination.value.total -= 1;
      if (currentDevice.value?.id === deviceId) {
        currentDevice.value = null;
      }
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteDeviceFailed');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function addTag(projectId: string, deviceId: string, dto: CreateDataTagDto) {
    error.value = null;
    try {
      const res = await deviceApi.addTag(projectId, deviceId, dto);
      const tag = res.data || (res as any);
      currentDeviceTags.value.push(tag);
      return tag;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.addTagFailed');
      throw e;
    }
  }

  async function updateTag(projectId: string, deviceId: string, tagId: string, dto: UpdateDataTagDto) {
    error.value = null;
    try {
      const res = await deviceApi.updateTag(projectId, deviceId, tagId, dto);
      const updated = res.data || (res as any);
      const index = currentDeviceTags.value.findIndex((t: DataTag) => t.id === tagId);
      if (index !== -1) {
        currentDeviceTags.value[index] = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateTagFailed');
      throw e;
    }
  }

  async function deleteTag(projectId: string, deviceId: string, tagId: string) {
    error.value = null;
    try {
      await deviceApi.deleteTag(projectId, deviceId, tagId);
      currentDeviceTags.value = currentDeviceTags.value.filter((t: DataTag) => t.id !== tagId);
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteTagFailed');
      throw e;
    }
  }

  async function fetchGroups(projectId: string) {
    error.value = null;
    try {
      const res = await deviceApi.listGroups(projectId);
      groups.value = (res.data || (res as any)) || [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchGroupListFailed');
    }
  }

  async function fetchGroupTree(projectId: string) {
    error.value = null;
    try {
      const res: any = await deviceApi.getGroupTree(projectId);
      // 后端返回 { projectId, projectName, groups: [...], rootDevices: [...] }
      const body = res.data || res;
      groupTree.value = body?.groups || (Array.isArray(body) ? body : []) || [];
      rootDevices.value = Array.isArray(body?.rootDevices) ? body.rootDevices : [];
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.fetchGroupTreeFailed');
    }
  }

  async function createGroup(projectId: string, dto: CreateDeviceGroupDto) {
    error.value = null;
    try {
      const res = await deviceApi.createGroup(projectId, dto);
      const group = res.data || (res as any);
      groups.value.push(group);
      return group;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.createGroupFailed');
      throw e;
    }
  }

  async function updateGroup(projectId: string, groupId: string, dto: UpdateDeviceGroupDto) {
    error.value = null;
    try {
      const res = await deviceApi.updateGroup(projectId, groupId, dto);
      const updated = res.data || (res as any);
      const index = groups.value.findIndex((g: DeviceGroup) => g.id === groupId);
      if (index !== -1) {
        groups.value[index] = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.updateGroupFailed');
      throw e;
    }
  }

  async function deleteGroup(projectId: string, groupId: string) {
    error.value = null;
    try {
      await deviceApi.deleteGroup(projectId, groupId);
      groups.value = groups.value.filter((g: DeviceGroup) => g.id !== groupId);
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.deleteGroupFailed');
      throw e;
    }
  }

  async function moveDevice(projectId: string, deviceId: string, targetGroupId: string | null) {
    error.value = null;
    try {
      const res = await deviceApi.moveDevice(projectId, deviceId, targetGroupId);
      const updated = res.data || (res as any);
      const index = devices.value.findIndex((d: Device) => d.id === deviceId);
      if (index !== -1) {
        devices.value[index] = updated;
      }
      return updated;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.moveDeviceFailed');
      throw e;
    }
  }

  const latestValues = ref<Record<string, any>>({});

  async function fetchLatestValues(projectId: string, deviceId: string) {
    try {
      const res = await deviceApi.getLatestValues(projectId, deviceId);
      latestValues.value = res.data || {};
    } catch {
      latestValues.value = {};
    }
  }

  async function writeTagValue(projectId: string, deviceId: string, tagId: string, value: any) {
    error.value = null;
    try {
      const res = await deviceApi.writeTagValue(projectId, deviceId, { tagId, value });
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.writeTagFailed');
      throw e;
    }
  }

  async function applyTemplate(projectId: string, deviceId: string, templateId: string) {
    error.value = null;
    try {
      const res = await deviceApi.applyTemplate(projectId, deviceId, templateId);
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.applyTemplateFailed');
      throw e;
    }
  }

  async function syncDeviceTemplate(projectId: string, deviceId: string, templateId: string) {
    error.value = null;
    try {
      const res = await deviceApi.syncTemplate(projectId, deviceId, templateId);
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.message || i18n.global.t('system.errors.syncTemplateFailed');
      throw e;
    }
  }

  function clearError() {
    error.value = null;
  }

  function selectGroup(groupId: string | null) {
    selectedGroupId.value = groupId;
  }

  function clearDevices() {
    devices.value = [];
    currentDevice.value = null;
    currentDeviceTags.value = [];
    latestValues.value = {};
    pagination.value = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  }

  return {
    devices,
    currentDevice,
    currentDeviceTags,
    groups,
    groupTree,
    rootDevices,
    pagination,
    loading,
    error,
    selectedGroupId,
    latestValues,
    hasDevices,
    fetchDevices,
    silentRefreshDevices,
    fetchDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    addTag,
    updateTag,
    deleteTag,
    fetchGroups,
    fetchGroupTree,
    createGroup,
    updateGroup,
    deleteGroup,
    moveDevice,
    fetchLatestValues,
    writeTagValue,
    applyTemplate,
    syncDeviceTemplate,
    clearError,
    clearDevices,
    selectGroup,
  };
});
