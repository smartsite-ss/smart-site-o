// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 客户端 — P1-T04 前端 AI 助手面板
 *
 * 提供与后端 AI 服务网关（/api/v1/ai/*）的通信能力：
 *   - chat()       非流式对话
 *   - streamChat() 流式对话（基于 fetch ReadableStream，支持 POST + Bearer Token）
 *   - embed()      文本嵌入
 *   - getStatus()  AI 功能开关
 *   - getHealth()  Provider 健康状态
 *
 * 设计要点：
 *   - 不依赖 axios（避免拦截器干扰流式响应），直接使用 fetch API
 *   - Token 从 localStorage 读取（与 system/src/api/client.ts 一致）
 *   - SSE 解析：逐块读取 ReadableStream，按 \n\n 分割事件
 *
 * 关联决策：
 *   - D-009 SSE 流式输出
 *   - D-010 多供应商路由（taskType 由调用方指定）
 */

// ============================================================
// 类型定义（与后端 llm.types.ts 对齐）
// ============================================================

export type LLMProviderId = 'deepseek' | 'zhipu';
export type TaskType = 'codegen' | 'chat' | 'intent' | 'analysis' | 'embedding' | 'plugin-dev' | 'script-dev';
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  toolCallId?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  taskType?: TaskType;
  /** 指定供应商（覆盖任务类型路由，优先使用该供应商） */
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: any;
  stop?: string[];
  user?: string;
  /** 会话 ID（缺省时由后端自动创建） */
  conversationId?: string;
  /** 项目 ID（创建新会话时使用） */
  projectId?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  role: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: LLMProviderId;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  latencyMs?: number;
  /** 本次对话所属会话 ID */
  conversationId?: string;
}

export interface ChatStreamChunk {
  delta: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** done=true 时携带，标识本次对话所属会话 */
  conversationId?: string;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dimension: number;
  usage?: { promptTokens: number; totalTokens: number };
  provider: LLMProviderId;
}

export interface ProviderHealth {
  providerId: LLMProviderId;
  healthy: boolean;
  lastCheckAt: number;
  lastError?: string;
  avgLatencyMs?: number;
}

/**
 * AI 功能状态（D-015 离线降级契约）
 *   - enabled      正常可用
 *   - disabled     未启用（AI_ENABLED=false 或无可用供应商）
 *   - unauthorized 认证失败（401/403，需重新登录）
 *   - unreachable  服务不可达（网络错误/5xx）
 */
export type AiStatusState = 'enabled' | 'disabled' | 'unauthorized' | 'unreachable';

export interface AiStatus {
  state: AiStatusState;
  /** 后端返回的原因（如 no_available_provider），仅 disabled 时可能存在 */
  reason?: string;
}

// ============================================================
// AI 客户端实现
// ============================================================

const TOKEN_KEY = 'scada_access_token';
const API_BASE = '/api/v1/ai';

/**
 * S-C03: Token 通过 HttpOnly Cookie 传输，JS 不可读取。
 * getToken() 始终返回 null，认证依赖 fetch 的 credentials: 'include'。
 * authHeaders() 保留为空对象，兼容已有调用点。
 */
function getToken(): string | null {
  // S-C03: Token 不再存储在 localStorage，通过 HttpOnly Cookie 自动传输
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * S-C03: 所有 fetch 调用的通用选项（携带 Cookie 凭证）
 */
const FETCH_CREDENTIALS: RequestInit = { credentials: 'include' };

/**
 * 解包后端 TransformInterceptor 的标准响应格式 { code, data, message, timestamp }
 * 提取内层 data 字段，兼容无包装的直接响应
 */
function unwrap<T>(resp: any): T {
  // 后端 TransformInterceptor 包装格式：{ code, data, message, timestamp }
  if (resp && typeof resp === 'object' && 'code' in resp && 'data' in resp) {
    return resp.data as T;
  }
  // 兼容：无包装的直接响应
  return resp as T;
}

/**
 * AI 功能状态检测（D-015）
 *
 * 不抛异常：网络/认证错误映射为对应状态，调用方必须区分
 * disabled（未启用）与 unreachable/unauthorized（故障），禁止静默吞错。
 */
export async function getAiStatus(): Promise<AiStatus> {
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/status`, {
      ...FETCH_CREDENTIALS,
      headers: { ...authHeaders() },
    });
  } catch {
    // 网络层失败（后端未启动/断网）
    return { state: 'unreachable' };
  }
  if (resp.status === 401 || resp.status === 403) {
    return { state: 'unauthorized' };
  }
  if (!resp.ok) {
    return { state: 'unreachable' };
  }
  const body = await resp.json().catch(() => null);
  const data = unwrap<{ enabled: boolean; reason?: string } | null>(body);
  if (data?.enabled === true) {
    return { state: 'enabled' };
  }
  return { state: 'disabled', reason: data?.reason };
}

/** 获取 Provider 健康状态 */
export async function getAiHealth(): Promise<ProviderHealth[]> {
  const resp = await fetch(`${API_BASE}/health`, {
    ...FETCH_CREDENTIALS,
    headers: { ...authHeaders() },
  });
  if (!resp.ok) throw new Error(`健康检查失败: ${resp.status}`);
  const body = await resp.json();
  const data = unwrap<{ providers: ProviderHealth[] }>(body);
  return data?.providers || [];
}

/** 已启用供应商的模型选项（供 AI 助手面板下拉选择） */
export interface EnabledProviderOption {
  providerId: string;
  name: string;
  defaultModel: string;
  models: string[];
}

/**
 * 获取已配置并启用的供应商及其模型列表
 *
 * 用于 AI 助手对话面板的模型选择器：用户只能从此列表中选择模型。
 * 失败时返回空数组（不抛异常，避免阻塞面板初始化）。
 */
export async function getEnabledProviders(): Promise<EnabledProviderOption[]> {
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/providers`, {
      ...FETCH_CREDENTIALS,
      headers: { ...authHeaders() },
    });
  } catch {
    return [];
  }
  if (!resp.ok) return [];
  const body = await resp.json().catch(() => null);
  const data = unwrap<{ providers: Array<{ enabled: boolean; providerId: string; name: string; defaultModel: string; models: string[] }> } | null>(body);
  if (!data?.providers) return [];
  return data.providers
    .filter((p) => p.enabled && p.models?.length > 0)
    .map((p) => ({
      providerId: p.providerId,
      name: p.name,
      defaultModel: p.defaultModel,
      models: p.models,
    }));
}

/** 非流式对话 */
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const resp = await fetch(`${API_BASE}/chat`, {
    ...FETCH_CREDENTIALS,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AI chat 请求失败 (${resp.status}): ${text}`);
  }
  const body = await resp.json();
  return unwrap<ChatResponse>(body);
}

/**
 * 流式对话（SSE）
 *
 * 使用 fetch + ReadableStream 实现，支持 POST 请求和 Bearer Token。
 * 返回 AsyncGenerator，逐块 yield ChatStreamChunk。
 *
 * 用法：
 *   for await (const chunk of streamChat(req)) {
 *     if (chunk.delta) appendToUI(chunk.delta);
 *     if (chunk.done) break;
 *   }
 */
export async function* streamChat(
  req: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  const resp = await fetch(`${API_BASE}/chat/stream`, {
    ...FETCH_CREDENTIALS,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authHeaders(),
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AI stream 请求失败 (${resp.status}): ${text}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream 不可用（浏览器不支持或响应无 body）');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按双换行分割 SSE 事件
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        // 提取 data: 字段
        const dataLine = rawEvent
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n')
          .trim();

        if (!dataLine) continue;
        if (dataLine === '[DONE]') return;

        try {
          const chunk = JSON.parse(dataLine) as ChatStreamChunk;
          yield chunk;
        } catch {
          // 跳过无法解析的行
          console.warn('[AI] SSE 解析失败，跳过:', dataLine.slice(0, 200));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 文本嵌入 */
export async function embed(
  inputs: string[],
  model?: string,
): Promise<EmbedResponse> {
  const resp = await fetch(`${API_BASE}/embed`, {
    ...FETCH_CREDENTIALS,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ inputs, model }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AI embed 请求失败 (${resp.status}): ${text}`);
  }
  const body = await resp.json();
  return unwrap<EmbedResponse>(body);
}

// ============================================================
// 会话管理 API（P2-T08 对话持久化）
// ============================================================

export interface ConversationSummary {
  id: string;
  title: string;
  projectId: string;
  userId: string;
  taskType: string;
  model: string | null;
  messageCount: number;
  totalTokens: number;
  archived: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string | null;
  toolCalls: string | null;
  toolCallId: string | null;
  toolName: string | null;
  tokens: number;
  seq: number;
  createdAt: string;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  successRate: number;
  byProvider: Record<string, { tokens: number; cost: number; calls: number }>;
  byTaskType: Record<string, { tokens: number; cost: number; calls: number }>;
}

export interface BudgetStatus {
  budgetLimit: number;
  currentSpent: number;
  remaining: number;
  usageRate: number;
  isBlocked: boolean;
  shouldWarn: boolean;
}

export interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  taskType: string;
  description: string | null;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  systemPrompt: string;
  variables: string | null;
  llmConfig: string | null;
  changelog: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** 通用 JSON 请求封装（复用 fetch + unwrap 逻辑） */
async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...FETCH_CREDENTIALS,
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AI API 请求失败 (${resp.status}) ${url}: ${text}`);
  }
  const body = await resp.json();
  return unwrap<T>(body);
}

/** 获取用户会话列表 */
export async function listConversations(projectId?: string): Promise<ConversationSummary[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const data = await requestJson<ConversationSummary[] | { conversations?: ConversationSummary[] }>(
    `${API_BASE}/conversations${query}`,
  );
  return Array.isArray(data) ? data : (data.conversations || []);
}

/** 获取会话详情 */
export async function getConversation(id: string): Promise<ConversationSummary> {
  return requestJson<ConversationSummary>(`${API_BASE}/conversations/${id}`);
}

/** 获取会话消息列表 */
export async function getConversationMessages(id: string): Promise<ConversationMessage[]> {
  const data = await requestJson<{ messages: ConversationMessage[] }>(
    `${API_BASE}/conversations/${id}/messages`,
  );
  return data.messages;
}

/** 更新会话标题 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await requestJson(`${API_BASE}/conversations/${id}/title`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

/** 归档/取消归档会话 */
export async function archiveConversation(id: string, archived: boolean): Promise<void> {
  await requestJson(`${API_BASE}/conversations/${id}/archive`, {
    method: 'PUT',
    body: JSON.stringify({ archived }),
  });
}

/** 删除会话 */
export async function deleteConversation(id: string): Promise<void> {
  await requestJson(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
}

/** 获取用量统计 */
export async function getUsageStats(params?: {
  startDate?: string;
  endDate?: string;
  providerId?: string;
  taskType?: string;
}): Promise<UsageStats> {
  const qs = new URLSearchParams();
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.providerId) qs.set('providerId', params.providerId);
  if (params?.taskType) qs.set('taskType', params.taskType);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return requestJson<UsageStats>(`${API_BASE}/usage/stats${query}`);
}

/** 获取月度预算状态 */
export async function getUsageBudget(): Promise<BudgetStatus> {
  return requestJson<BudgetStatus>(`${API_BASE}/usage/budget`);
}

/** 获取 Prompt 模板列表 */
export async function listPrompts(): Promise<PromptTemplate[]> {
  const data = await requestJson<{ prompts: PromptTemplate[] }>(`${API_BASE}/prompts`);
  return data.prompts;
}

/** 创建 Prompt 模板 */
export async function createPrompt(dto: {
  key: string;
  name: string;
  taskType?: string;
  description?: string;
}): Promise<PromptTemplate> {
  return requestJson<PromptTemplate>(`${API_BASE}/prompts`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/** 更新 Prompt 模板 */
export async function updatePrompt(
  id: string,
  dto: Partial<{ name: string; description: string }>,
): Promise<void> {
  await requestJson(`${API_BASE}/prompts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

/** 获取 Prompt 版本列表 */
export async function listPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const data = await requestJson<{ versions: PromptVersion[] }>(
    `${API_BASE}/prompts/${promptId}/versions`,
  );
  return data.versions;
}

/** 创建 Prompt 新版本 */
export async function createPromptVersion(
  promptId: string,
  dto: {
    version: string;
    systemPrompt: string;
    variables?: string;
    llmConfig?: string;
    changelog?: string;
  },
): Promise<PromptVersion> {
  return requestJson<PromptVersion>(`${API_BASE}/prompts/${promptId}/versions`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/** 发布 Prompt 版本 */
export async function publishPromptVersion(versionId: string): Promise<void> {
  await requestJson(`${API_BASE}/prompts/versions/${versionId}/publish`, { method: 'PUT' });
}

/** 归档 Prompt 版本 */
export async function archivePromptVersion(versionId: string): Promise<void> {
  await requestJson(`${API_BASE}/prompts/versions/${versionId}/archive`, { method: 'PUT' });
}

/** 回滚 Prompt 版本 */
export async function rollbackPromptVersion(versionId: string): Promise<void> {
  await requestJson(`${API_BASE}/prompts/versions/${versionId}/rollback`, { method: 'PUT' });
}

export const aiClient = {
  getStatus: getAiStatus,
  getHealth: getAiHealth,
  getEnabledProviders,
  chat,
  streamChat,
  embed,
  // P2-T08 会话管理
  listConversations,
  getConversation,
  getConversationMessages,
  updateConversationTitle,
  archiveConversation,
  deleteConversation,
  // P2-T08 用量统计
  getUsageStats,
  getUsageBudget,
  // P2-T08 Prompt 管理
  listPrompts,
  createPrompt,
  updatePrompt,
  listPromptVersions,
  createPromptVersion,
  publishPromptVersion,
  archivePromptVersion,
  rollbackPromptVersion,
};
