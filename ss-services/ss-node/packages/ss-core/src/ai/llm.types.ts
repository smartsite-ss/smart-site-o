// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * LLM 类型定义 — P1-T01 LLM API 接入配置
 *
 * 定义 LLM Provider、消息、请求/响应等公共类型。
 * 所有 Provider 实现均遵守此处定义的接口契约。
 */

/**
 * 供应商 ID
 *
 * 使用字符串类型以支持扩展（deepseek/zhipu/qwen/moonshot/ernie/openai/claude/gemini/mistral/custom 等）。
 * 具体可用供应商见 provider-presets.ts 的 PROVIDER_PRESETS。
 */
export type LLMProviderId = string;

/** 任务类型（用于路由策略 D-010） */
export type TaskType = 'codegen' | 'chat' | 'intent' | 'analysis' | 'embedding';

/** 消息角色 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/** 聊天消息 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** tool 角色消息的 tool_call_id */
  toolCallId?: string;
  /** assistant 消息携带的工具调用 */
  toolCalls?: ToolCall[];
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** 工具定义 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/** LLM 请求 */
export interface LLMRequest {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 指定供应商（覆盖任务类型路由，优先使用该供应商；失败再回退路由） */
  providerId?: LLMProviderId;
  /** 指定模型（覆盖默认） */
  model?: string;
  /** 温度（0-2，越高越发散） */
  temperature?: number;
  /** 最大生成 Token 数 */
  maxTokens?: number;
  /** 可用工具列表（Function Calling） */
  tools?: ToolDefinition[];
  /** 是否强制工具调用 */
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  /** 停止序列 */
  stop?: string[];
  /** 用户标识（用于审计） */
  user?: string;
  /** 是否启用流式输出 */
  stream?: boolean;
}

/** LLM 响应 */
export interface LLMResponse {
  /** 生成内容 */
  content: string;
  /** 模型名 */
  model: string;
  /** 角色（恒为 assistant） */
  role: 'assistant';
  /** 工具调用（如有） */
  toolCalls?: ToolCall[];
  /** Token 使用统计 */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 供应商 ID */
  provider: LLMProviderId;
  /** 完成原因 */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  /** 响应耗时（毫秒） */
  latencyMs: number;
}

/** 流式输出片段 */
export interface ChatStreamChunk {
  /** 增量内容 */
  delta: string;
  /** 是否结束 */
  done: boolean;
  /** 完成时的统计 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因（done=true 时） */
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  /** 由 Controller 在 done=true 时注入，标识本次对话所属会话（Provider 实现不应主动填充） */
  conversationId?: string;
}

/** 嵌入请求 */
export interface EmbeddingRequest {
  /** 待嵌入文本列表 */
  inputs: string[];
  /** 指定模型（覆盖默认） */
  model?: string;
}

/** 嵌入响应 */
export interface EmbeddingResponse {
  /** 嵌入向量列表（与 inputs 一一对应） */
  embeddings: number[][];
  /** 模型名 */
  model: string;
  /** 维度 */
  dimension: number;
  /** Token 使用统计 */
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  /** 供应商 ID */
  provider: LLMProviderId;
}

/** Provider 健康状态 */
export interface ProviderHealth {
  providerId: LLMProviderId;
  /** 是否可用 */
  healthy: boolean;
  /** 最近一次检查时间 */
  lastCheckAt: number;
  /** 最近错误信息 */
  lastError?: string;
  /** 平均响应延迟（毫秒） */
  avgLatencyMs?: number;
}

/** Provider 配置 */
export interface ProviderConfig {
  providerId: LLMProviderId;
  apiKey: string;
  apiBase: string;
  defaultModel: string;
  /** 代码生成模型（DeepSeek 专用） */
  codegenModel?: string;
  /** 轻量模型（智谱专用） */
  liteModel?: string;
  /** 嵌入模型 */
  embeddingModel?: string;
  /** 嵌入维度 */
  embeddingDim?: number;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/** 任务路由配置（D-010 多供应商路由策略） */
export interface RoutingConfig {
  codegen: LLMProviderId;
  chat: LLMProviderId;
  intent: LLMProviderId;
  analysis: LLMProviderId;
  /** 嵌入任务固定使用智谱 */
  embedding: LLMProviderId;
}

/** 默认路由策略（与 D-010 表格一致） */
export const DEFAULT_ROUTING: RoutingConfig = {
  codegen: 'deepseek',
  chat: 'zhipu',
  intent: 'zhipu',
  analysis: 'zhipu',
  embedding: 'zhipu',
};
