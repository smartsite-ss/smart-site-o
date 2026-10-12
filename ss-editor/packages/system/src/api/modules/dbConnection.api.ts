// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface DbConnectionRecord {
  id: string;
  projectId: string;
  name: string;
  dbType: 'mysql' | 'sqlite' | 'oracle' | 'postgresql' | 'mssql';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDbConnectionPayload {
  name: string;
  dbType: 'mysql' | 'sqlite' | 'oracle' | 'postgresql' | 'mssql';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
  enabled?: boolean;
}

const buildUrl = (projectId: string, path: string) =>
  `/projects/${projectId}/db-connections${path}`;

export const dbConnectionApi = {
  list(projectId: string): Promise<ApiResponse<DbConnectionRecord[]>> {
    return client.get(buildUrl(projectId, '')).then((res) => res.data);
  },

  getById(projectId: string, id: string): Promise<ApiResponse<DbConnectionRecord>> {
    return client.get(buildUrl(projectId, `/${id}`)).then((res) => res.data);
  },

  create(projectId: string, payload: CreateDbConnectionPayload): Promise<ApiResponse<DbConnectionRecord>> {
    return client.post(buildUrl(projectId, ''), payload).then((res) => res.data);
  },

  update(projectId: string, id: string, payload: Partial<CreateDbConnectionPayload>): Promise<ApiResponse<DbConnectionRecord>> {
    return client.patch(buildUrl(projectId, `/${id}`), payload).then((res) => res.data);
  },

  delete(projectId: string, id: string): Promise<void> {
    return client.delete(buildUrl(projectId, `/${id}`));
  },

  test(projectId: string, id: string): Promise<ApiResponse<{ success: boolean; latency: number; error?: string }>> {
    return client.post(buildUrl(projectId, `/${id}/test`)).then((res) => res.data);
  },

  getTables(projectId: string, id: string): Promise<ApiResponse<string[]>> {
    return client.get(buildUrl(projectId, `/${id}/tables`)).then((res) => res.data);
  },

  getColumns(projectId: string, id: string, tableName: string): Promise<ApiResponse<{ name: string; type: string }[]>> {
    return client.get(buildUrl(projectId, `/${id}/tables/${encodeURIComponent(tableName)}/columns`)).then((res) => res.data);
  },

  executeQuery(projectId: string, id: string, sql: string): Promise<ApiResponse<any[]>> {
    return client.post(buildUrl(projectId, `/${id}/query`), { sql }).then((res) => res.data);
  },
};
