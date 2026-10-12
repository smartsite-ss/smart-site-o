// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface RoleInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  menuIds: string[];
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  menuIds?: string[];
  sortOrder?: number;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  menuIds?: string[];
  sortOrder?: number;
}

/** 项目授权 DTO */
export interface ProjectAuthDto {
  roleId: string;
  projectId: string;
  permission: 'read' | 'write' | 'admin';
}

/** 设备授权 DTO */
export interface DeviceAuthDto {
  roleId: string;
  projectId: string;
  deviceId: string;
  permission: 'read' | 'write';
}

export const roleApi = {
  getRoles(): Promise<ApiResponse<RoleInfo[]>> {
    return client.get('/roles').then((res) => res.data);
  },

  getRole(id: string): Promise<ApiResponse<RoleInfo>> {
    return client.get(`/roles/${id}`).then((res) => res.data);
  },

  createRole(dto: CreateRoleDto): Promise<ApiResponse<RoleInfo>> {
    return client.post('/roles', dto).then((res) => res.data);
  },

  updateRole(id: string, dto: UpdateRoleDto): Promise<ApiResponse<RoleInfo>> {
    return client.put(`/roles/${id}`, dto).then((res) => res.data);
  },

  deleteRole(id: string): Promise<void> {
    return client.delete(`/roles/${id}`);
  },

  // ──────── 数据授权 API（v7.0 新增） ────────

  /** 获取角色的项目授权列表 */
  getProjectAuths(roleId: string): Promise<ApiResponse<ProjectAuthDto[]>> {
    return client.get(`/roles/${roleId}/project-auths`).then((res) => res.data);
  },

  /** 设置角色的项目授权（全量替换） */
  setProjectAuths(roleId: string, auths: Omit<ProjectAuthDto, 'roleId'>[]): Promise<ApiResponse<void>> {
    return client.put(`/roles/${roleId}/project-auths`, auths).then((res) => res.data);
  },

  /** 获取角色在某项目下的设备授权列表 */
  getDeviceAuths(roleId: string, projectId: string): Promise<ApiResponse<DeviceAuthDto[]>> {
    return client.get(`/roles/${roleId}/device-auths`, { params: { projectId } }).then((res) => res.data);
  },

  /** 设置角色在某项目下的设备授权（全量替换） */
  setDeviceAuths(roleId: string, projectId: string, auths: Omit<DeviceAuthDto, 'roleId' | 'projectId'>[]): Promise<ApiResponse<void>> {
    return client.put(`/roles/${roleId}/device-auths`, auths, { params: { projectId } }).then((res) => res.data);
  },

  // ──────── 权限审计日志 API（v7.0 新增） ────────

  /** 查询权限审计日志 */
  getAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    operatorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ items: any[]; total: number }>> {
    return client.get('/roles/audit-logs', { params }).then((res) => res.data);
  },

  // ──────── 权限码注册表（v8.0 新增） ────────

  /** 获取权限码注册表（含分类和标签，替代前端硬编码 PERMISSION_CATEGORIES） */
  getPermissionsRegistry(): Promise<
    ApiResponse<{
      categories: { module: string; label: string; codes: { code: string; label: string }[] }[];
    }>
  > {
    return client.get('/system/menu/permissions/registry', { _silent: true } as any).then((res) => res.data);
  },
};
