// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, Script, ScriptExecution, ScriptTriggerType } from '../types/api';

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/scripts${path}`;

export interface CreateScriptDto {
  name: string;
  description?: string;
  code: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface UpdateScriptDto {
  name?: string;
  description?: string;
  code?: string;
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
  timeoutMs?: number;
  memoryLimitMb?: number;
  status?: string;
}

// ==================== 脚本模板类型 ====================

/** 模板分类 */
export type TemplateCategory = 'data_transform' | 'alarm_condition' | 'device_control' | 'report' | 'custom';

/** 脚本模板 */
export interface ScriptTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  triggerType: ScriptTriggerType;
  triggerConfig?: string;
  code: string;
  tags?: string[];
  author?: string;
  version: string;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScriptTemplateDto {
  name: string;
  description?: string;
  category: TemplateCategory;
  triggerType: ScriptTriggerType;
  triggerConfig?: string;
  code: string;
  tags?: string[];
  author?: string;
  version?: string;
}

export interface UpdateScriptTemplateDto {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  triggerType?: ScriptTriggerType;
  triggerConfig?: string;
  code?: string;
  tags?: string[];
  author?: string;
  version?: string;
}

export interface ScriptTemplateFilter {
  category?: string;
  keyword?: string;
}

export const scriptApi = {
  list(projectId: string): Promise<ApiResponse<Script[]>> {
    return client.get(buildUrl(projectId, '')).then((res) => res.data);
  },

  getById(projectId: string, id: string): Promise<ApiResponse<Script>> {
    return client.get(buildUrl(projectId, `/${id}`)).then((res) => res.data);
  },

  create(projectId: string, dto: CreateScriptDto): Promise<ApiResponse<Script>> {
    return client.post(buildUrl(projectId, ''), dto).then((res) => res.data);
  },

  update(projectId: string, id: string, dto: UpdateScriptDto): Promise<ApiResponse<Script>> {
    return client.patch(buildUrl(projectId, `/${id}`), dto).then((res) => res.data);
  },

  delete(projectId: string, id: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/${id}`));
  },

  execute(projectId: string, id: string): Promise<ApiResponse<ScriptExecution>> {
    return client.post(buildUrl(projectId, `/${id}/execute`)).then((res) => res.data);
  },

  getHistory(projectId: string, id: string): Promise<ApiResponse<ScriptExecution[]>> {
    return client.get(buildUrl(projectId, `/${id}/history`)).then((res) => res.data);
  },

  getApiFunctions(): Promise<ApiResponse<Array<{ name: string; description: string }>>> {
    return client.get('/api/functions').then((res) => res.data);
  },

  // ==================== 脚本模板 ====================

  getScriptTemplates(projectId: string, filter?: ScriptTemplateFilter): Promise<ScriptTemplate[]> {
    return client
      .get(buildUrl(projectId, '/templates'), { params: filter })
      .then((res) => {
        const body = res.data;
        const data = (body as ApiResponse<ScriptTemplate[]>).data;
        return data ?? (body as unknown as ScriptTemplate[]) ?? [];
      });
  },

  getScriptTemplate(projectId: string, id: string): Promise<ScriptTemplate> {
    return client
      .get(buildUrl(projectId, `/templates/${id}`))
      .then((res) => {
        const body = res.data;
        const data = (body as ApiResponse<ScriptTemplate>).data;
        return data ?? (body as unknown as ScriptTemplate);
      });
  },

  createScriptTemplate(projectId: string, dto: CreateScriptTemplateDto): Promise<ScriptTemplate> {
    return client
      .post(buildUrl(projectId, '/templates'), dto)
      .then((res) => {
        const body = res.data;
        const data = (body as ApiResponse<ScriptTemplate>).data;
        return data ?? (body as unknown as ScriptTemplate);
      });
  },

  updateScriptTemplate(projectId: string, id: string, dto: UpdateScriptTemplateDto): Promise<ScriptTemplate> {
    return client
      .patch(buildUrl(projectId, `/templates/${id}`), dto)
      .then((res) => {
        const body = res.data;
        const data = (body as ApiResponse<ScriptTemplate>).data;
        return data ?? (body as unknown as ScriptTemplate);
      });
  },

  deleteScriptTemplate(projectId: string, id: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/templates/${id}`)).then(() => undefined);
  },

  instantiateTemplate(projectId: string, id: string, name: string): Promise<Script> {
    return client
      .post(buildUrl(projectId, `/templates/${id}/instantiate`), { name })
      .then((res) => {
        const body = res.data;
        const data = (body as ApiResponse<Script>).data;
        return data ?? (body as unknown as Script);
      });
  },
};