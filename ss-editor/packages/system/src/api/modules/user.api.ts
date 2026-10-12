// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, UserInfo } from '../types/api';

export interface AdminUserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  roleId?: string;
  roleEntity?: { id: string; name: string; code: string };
  positionId?: string;
  position?: { id: string; name: string; code: string };
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  email: string;
  displayName?: string;
  roleId?: string;
  positionId?: string;
  phone?: string;
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
  roleId?: string;
  positionId?: string;
  phone?: string;
  isActive?: boolean;
}

export const userApi = {
  getProfile(): Promise<ApiResponse<UserInfo>> {
    return client.get('/users/profile').then((res) => res.data);
  },

  /** 获取用户列表（管理员） */
  getUsers(): Promise<ApiResponse<AdminUserInfo[]>> {
    return client.get('/users').then((res) => res.data);
  },

  /** 创建用户（管理员） */
  createUser(dto: CreateUserDto): Promise<ApiResponse<AdminUserInfo>> {
    return client.post('/users', dto).then((res) => res.data);
  },

  /** 更新用户（管理员） */
  updateUser(id: string, dto: UpdateUserDto): Promise<ApiResponse<AdminUserInfo>> {
    return client.patch(`/users/${id}`, dto).then((res) => res.data);
  },

  /** 禁用用户（管理员） */
  deleteUser(id: string): Promise<void> {
    return client.delete(`/users/${id}`);
  },

  /** 分配角色 */
  assignRole(userId: string, roleId: string): Promise<ApiResponse<AdminUserInfo>> {
    return client.patch(`/users/${userId}/role`, { roleId }).then((res) => res.data);
  },

  /** 分配岗位 */
  assignPosition(userId: string, positionId: string): Promise<ApiResponse<AdminUserInfo>> {
    return client.patch(`/users/${userId}/position`, { positionId }).then((res) => res.data);
  },

  /** 更新个人资料 */
  updateProfile(dto: { displayName?: string; email?: string }): Promise<ApiResponse<UserInfo>> {
    return client.patch('/users/profile', dto).then((res) => res.data);
  },

  /** 修改密码 */
  changePassword(dto: { oldPassword: string; newPassword: string; confirmPassword: string }): Promise<ApiResponse<{ message: string }>> {
    return client.post('/users/change-password', dto).then((res) => res.data);
  },
};
