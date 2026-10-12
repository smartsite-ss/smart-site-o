// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * LLM Provider 抽象层接口 — P1-T01 LLM API 接入配置
 *
 * 所有 LLM 供应商（DeepSeek、智谱等）均实现此接口。
 * 后端 LLM 代理服务（LLMProxyService）通过此接口调用底层供应商 API，
 * 实现多供应商路由、降级、统一接口契约。
 *
 * 关联决策：
 *   - D-001 云端 API 优先（DeepSeek + 智谱）
 *   - D-002 LLM 模型选型（DeepSeek + 智谱 GLM）
 *   - D-009 SSE 流式输出
 *   - D-010 多供应商路由 + 降级
 */

import { ProviderConfig, ProviderHealth } from './llm.types';
import {
  LLMRequest,
  LLMResponse,
  ChatStreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from './llm.types';

/**
 * LLM Provider 接口
 *
 * 实现类负责：
 *   1. 调用具体供应商 API（DeepSeek / 智谱 / ...）
 *   2. 将供应商响应转换为统一格式（LLMResponse / ChatStreamChunk）
 *   3. 处理重试、超时、错误降级
 *   4. 报告自身健康状态
 */
export interface ILLMProvider {
  /** 供应商 ID（支持扩展：deepseek/zhipu/qwen/moonshot/ernie/openai/claude/gemini/mistral/custom 等） */
  readonly providerId: string;

  /** 初始化 Provider（注入配置） */
  initialize(config: ProviderConfig): void;

  /** 是否已初始化（apiKey 等配置就绪） */
  isReady(): boolean;

  /**
   * 同步生成（非流式）
   * @throws Error 当 API 调用失败、超时、所有重试均失败时抛出
   */
  generate(req: LLMRequest): Promise<LLMResponse>;

  /**
   * 流式生成（AsyncGenerator）
   *
   * 每次 yield 一个 ChatStreamChunk，最后一个 chunk 的 done=true。
   * 实现需在内部处理网络断开、超时等异常，并在异常时通过 throw 中断流。
   */
  stream(req: LLMRequest): AsyncGenerator<ChatStreamChunk, void, unknown>;

  /**
   * 嵌入（向量生成）
   *
   * 用于 RAG 文档向量化、查询向量化（D-006 / D-007）。
   * DeepSeek Provider 可不实现此方法（throw NotImplemented），
   * 嵌入任务通过路由固定走智谱（见 DEFAULT_ROUTING.embedding = 'zhipu'）。
   */
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;

  /** 健康检查（Ping 供应商 API，返回 ProviderHealth） */
  checkHealth(): Promise<ProviderHealth>;
}

/**
 * LLM Provider Token（NestJS DI 注入标识）
 *
 * 用于在 LLMProxyService 中通过 @Inject(LLM_PROVIDERS) 注入所有 Provider 实例。
 */
export const LLM_PROVIDERS = Symbol('LLM_PROVIDERS');
