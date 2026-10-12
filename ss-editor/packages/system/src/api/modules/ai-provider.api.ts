// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Provider 配置 API — 对接后端 /api/v1/ai/providers
 *
 * 供应商配置已迁移到数据库管理，支持：
 *   - 预置模板查询（GET /providers/presets）
 *   - 快速创建（POST /providers/from-preset，仅需 API Key）
 *   - 完整 CRUD（POST/PUT/DELETE /providers）
 */

import client from '../client';
import type { ApiResponse } from '../types/api';

/** 供应商区域 */
export type ProviderRegion = 'domestic' | 'international';

/** 预置供应商模板（从后端获取，含厂家默认配置） */
export interface ProviderPreset {
  providerId: string;
  name: string;
  region: ProviderRegion;
  apiBase: string;
  defaultModel: string;
  models: string[];
  codegenModel?: string;
  liteModel?: string;
  embeddingModel?: string;
  embeddingDim?: number;
  timeout: number;
  maxRetries: number;
  apiKeyUrl: string;
  supportsEmbedding: boolean;
  description: string;
}

/** AI 供应商配置视图 */
export interface AiProviderConfig {
  id: string;
  providerId: string;
  name: string;
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  models: string[];
  enabled: boolean;
  sortOrder: number;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderPayload {
  providerId: string;
  name: string;
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  models?: string[];
  enabled?: boolean;
  sortOrder?: number;
  config?: Record<string, any>;
}

export type UpdateAiProviderPayload = Partial<CreateAiProviderPayload>;

/** 快速创建 payload（仅需 providerId 和 apiKey） */
export interface CreateFromPresetPayload {
  providerId: string;
  apiKey: string;
}

/** 供应商连接测试结果 */
export interface AiProviderTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
  checkedAt: number;
}

export const aiProviderApi = {
  /** 获取所有供应商配置 */
  async list(): Promise<AiProviderConfig[]> {
    const res = await client.get<ApiResponse<{ providers: AiProviderConfig[] }>>('/ai/providers');
    return res.data.data?.providers ?? [];
  },

  /** 获取所有预置供应商模板（厂家默认配置） */
  async presets(): Promise<ProviderPreset[]> {
    const res = await client.get<ApiResponse<{ presets: ProviderPreset[] }>>('/ai/providers/presets');
    return res.data.data?.presets ?? [];
  },

  /** 按预置模板快速创建供应商（仅需 API Key） */
  async createFromPreset(payload: CreateFromPresetPayload): Promise<AiProviderConfig> {
    const res = await client.post<ApiResponse<AiProviderConfig>>('/ai/providers/from-preset', payload);
    return res.data.data;
  },

  /** 创建供应商配置（完整字段） */
  async create(payload: CreateAiProviderPayload): Promise<AiProviderConfig> {
    const res = await client.post<ApiResponse<AiProviderConfig>>('/ai/providers', payload);
    return res.data.data;
  },

  /** 更新供应商配置 */
  async update(id: string, payload: UpdateAiProviderPayload): Promise<AiProviderConfig> {
    const res = await client.put<ApiResponse<AiProviderConfig>>(`/ai/providers/${id}`, payload);
    return res.data.data;
  },

  /** 删除供应商配置 */
  async remove(id: string): Promise<void> {
    await client.delete(`/ai/providers/${id}`);
  },

  /** 切换启用/禁用 */
  async toggle(id: string, enabled: boolean): Promise<AiProviderConfig> {
    const res = await client.put<ApiResponse<AiProviderConfig>>(
      `/ai/providers/${id}/toggle`,
      { enabled },
    );
    return res.data.data;
  },

  /** 更新 API Key（便捷方法，仅传 apiKey） */
  async updateApiKey(id: string, apiKey: string): Promise<AiProviderConfig> {
    const res = await client.put<ApiResponse<AiProviderConfig>>(`/ai/providers/${id}`, { apiKey });
    return res.data.data;
  },

  /** 测试供应商连接（使用已保存配置发起最小化请求，返回连接结果与延迟） */
  async test(id: string): Promise<AiProviderTestResult> {
    const res = await client.post<ApiResponse<AiProviderTestResult>>(`/ai/providers/${id}/test`);
    return res.data.data;
  },
};
