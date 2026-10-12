// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 供应商预置模板 — 国内外常用 LLM 厂家默认配置
 *
 * 用户在前端创建供应商配置时，只需选择厂家并填写 API Key，
 * 其余配置（apiBase、默认模型、模型列表等）均从此预置表自动填充。
 *
 * 所有列出的供应商均支持 OpenAI 兼容 API 格式（/chat/completions、/embeddings），
 * 由统一的 OpenAICompatibleProvider 处理。
 *
 * 关联决策：
 *   - D-001 云端 API 优先（多供应商选择）
 *   - D-002 LLM 模型选型（国内外常用模型）
 */

/** 供应商区域 */
export type ProviderRegion = 'domestic' | 'international';

/** 供应商预置模板 */
export interface ProviderPreset {
  /** 供应商 ID（唯一标识，用于数据库存储和路由） */
  providerId: string;
  /** 显示名称 */
  name: string;
  /** 区域：国内 / 国际 */
  region: ProviderRegion;
  /** API 基础地址（OpenAI 兼容格式） */
  apiBase: string;
  /** 默认对话模型 */
  defaultModel: string;
  /** 可用模型列表 */
  models: string[];
  /** 代码生成模型（可选，适合 codegen 任务） */
  codegenModel?: string;
  /** 轻量模型（可选，适合健康检查和低成本场景） */
  liteModel?: string;
  /** 嵌入模型（可选，用于 RAG 向量化） */
  embeddingModel?: string;
  /** 嵌入维度（可选） */
  embeddingDim?: number;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** API Key 申请地址 */
  apiKeyUrl: string;
  /** 是否支持嵌入 */
  supportsEmbedding: boolean;
  /** 厂家描述 */
  description: string;
}

/**
 * 预置供应商列表
 *
 * 国内供应商（5 家）+ 国际供应商（4 家）+ 自定义（1 项）
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  // ==================== 国内供应商 ====================
  {
    providerId: 'deepseek',
    name: 'DeepSeek',
    region: 'domestic',
    apiBase: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    codegenModel: 'deepseek-coder',
    liteModel: 'deepseek-chat',
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    supportsEmbedding: false,
    description: '代码生成能力极强、推理优秀、性价比高',
  },
  {
    providerId: 'zhipu',
    name: '智谱 GLM',
    region: 'domestic',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    models: ['glm-4', 'glm-4-flash', 'glm-4-air', 'glm-4-plus', 'embedding-3'],
    liteModel: 'glm-4-flash',
    embeddingModel: 'embedding-3',
    embeddingDim: 1024,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    supportsEmbedding: true,
    description: '中文理解最佳、多模态支持、生态完善',
  },
  {
    providerId: 'qwen',
    name: '通义千问 (Qwen)',
    region: 'domestic',
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long', 'text-embedding-v3'],
    codegenModel: 'qwen-plus',
    liteModel: 'qwen-turbo',
    embeddingModel: 'text-embedding-v3',
    embeddingDim: 1024,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    supportsEmbedding: true,
    description: '阿里云出品，多模型规模、长文本处理能力强',
  },
  {
    providerId: 'moonshot',
    name: 'Kimi (月之暗面)',
    region: 'domestic',
    apiBase: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    liteModel: 'moonshot-v1-8k',
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    supportsEmbedding: false,
    description: '超长上下文支持（最高 128K），适合长文档处理',
  },
  {
    providerId: 'ernie',
    name: '文心一言 (ERNIE)',
    region: 'domestic',
    apiBase: 'https://qianfan.baidubce.com/v2',
    defaultModel: 'ernie-4.0-8k-latest',
    models: ['ernie-4.0-8k-latest', 'ernie-3.5-8k', 'ernie-speed-128k', 'ernie-lite-8k'],
    codegenModel: 'ernie-4.0-8k-latest',
    liteModel: 'ernie-lite-8k',
    embeddingModel: 'bge-large-zh',
    embeddingDim: 1024,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    supportsEmbedding: true,
    description: '百度出品，中文理解强、生态完善',
  },

  // ==================== 国际供应商 ====================
  {
    providerId: 'openai',
    name: 'OpenAI',
    region: 'international',
    apiBase: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'o1-preview',
      'o1-mini',
      'text-embedding-3-small',
      'text-embedding-3-large',
    ],
    codegenModel: 'gpt-4o',
    liteModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    embeddingDim: 1536,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    supportsEmbedding: true,
    description: '业界标杆，多模态、代码生成、推理能力全面领先',
  },
  {
    providerId: 'claude',
    name: 'Anthropic Claude',
    region: 'international',
    apiBase: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    codegenModel: 'claude-3-5-sonnet-20241022',
    liteModel: 'claude-3-5-haiku-20241022',
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    supportsEmbedding: false,
    description: '超长上下文、推理与代码能力出色、安全性强',
  },
  {
    providerId: 'gemini',
    name: 'Google Gemini',
    region: 'international',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-pro',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'text-embedding-004'],
    codegenModel: 'gemini-1.5-pro',
    liteModel: 'gemini-1.5-flash',
    embeddingModel: 'text-embedding-004',
    embeddingDim: 768,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    supportsEmbedding: true,
    description: 'Google 出品，多模态原生支持、超长上下文（最高 2M tokens）',
  },
  {
    providerId: 'mistral',
    name: 'Mistral AI',
    region: 'international',
    apiBase: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'mistral-embed'],
    codegenModel: 'codestral-latest',
    liteModel: 'mistral-small-latest',
    embeddingModel: 'mistral-embed',
    embeddingDim: 1024,
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: 'https://console.mistral.ai/api-keys/',
    supportsEmbedding: true,
    description: '欧洲领先 AI 公司，开源生态活跃、代码生成强',
  },

  // ==================== 自定义 ====================
  {
    providerId: 'custom',
    name: '自定义供应商',
    region: 'domestic',
    apiBase: '',
    defaultModel: '',
    models: [],
    timeout: 60000,
    maxRetries: 3,
    apiKeyUrl: '',
    supportsEmbedding: false,
    description: '手动配置任意 OpenAI 兼容 API 端点',
  },
];

/** 按 providerId 查找预置模板 */
export function findPreset(providerId: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.providerId === providerId);
}

/** 获取所有预置模板（按区域分组） */
export function getPresetsByRegion(): {
  domestic: ProviderPreset[];
  international: ProviderPreset[];
} {
  return {
    domestic: PROVIDER_PRESETS.filter((p) => p.region === 'domestic'),
    international: PROVIDER_PRESETS.filter((p) => p.region === 'international'),
  };
}
