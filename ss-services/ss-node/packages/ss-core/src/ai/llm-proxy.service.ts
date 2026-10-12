// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * LLM Proxy Service — 后端 AI 服务网关
 *
 * 职责：
 *   1. 根据任务类型路由到对应 Provider（D-010 多供应商路由策略）
 *   2. 主 Provider 失败时降级到备选 Provider
 *   3. 周期性健康检查调度（OnModuleInit 启动 30s 周期）
 *   4. 从数据库加载 Provider 配置（不再从环境变量读取）
 *
 * 关联决策：
 *   - D-009 SSE 流式输出（streamChat 方法返回 AsyncGenerator）
 *   - D-010 多供应商路由 + 降级
 *   - D-012 Feature Flag（AI_ENABLED 控制，仅此一项保留在环境变量）
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILLMProvider, LLM_PROVIDERS } from './llm-provider.interface';
import { AiProviderConfigService } from './ai-provider-config.service';
import {
  ChatStreamChunk,
  DEFAULT_ROUTING,
  EmbeddingRequest,
  EmbeddingResponse,
  LLMProviderId,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderHealth,
  RoutingConfig,
  TaskType,
} from './llm.types';
import { findPreset } from './provider-presets';
import { LLMSafetyGuardService } from './llm-safety-guard.service';

const HEALTH_CHECK_INTERVAL_MS = 30_000;

@Injectable()
export class LLMProxyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LLMProxyService.name);
  private providers = new Map<string, ILLMProvider>();
  private routing: RoutingConfig = { ...DEFAULT_ROUTING };
  private enabled = false;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private readonly healthMap = new Map<string, ProviderHealth>();

  constructor(
    @Inject(LLM_PROVIDERS) providerList: ILLMProvider[],
    private readonly configService: ConfigService,
    @Optional() private readonly providerConfigService?: AiProviderConfigService,
    @Optional() private readonly safetyGuard?: LLMSafetyGuardService,
  ) {
    for (const p of providerList) {
      this.providers.set(p.providerId, p);
    }
  }

  onModuleInit(): void {
    // AI_ENABLED 保留在环境变量中作为启动级 Feature Flag
    this.enabled = this.configService.get<string>('AI_ENABLED') === 'true';
    if (!this.enabled) {
      this.logger.warn('AI 功能未启用（AI_ENABLED != true），LLMProxyService 处于禁用状态');
      return;
    }

    // 异步初始化：从数据库加载配置
    this.initializeProvidersAsync().catch((err) => {
      this.logger.error(`Provider 异步初始化失败: ${err.message}`);
    });
    this.startHealthCheck();
    this.logger.log(`LLMProxyService 已启用，已注册 ${this.providers.size} 个 Provider 实例`);
  }

  /**
   * 重新加载 Provider 配置（从前端配置变更后调用）
   * 从数据库读取最新配置并重新初始化所有 Provider。
   */
  async reloadProviders(): Promise<void> {
    if (!this.providerConfigService) {
      this.logger.warn('AiProviderConfigService 未注入，无法从数据库重载配置');
      return;
    }
    await this.initializeProvidersAsync();
    this.logger.log('AI Provider 配置已从数据库重新加载');
  }

  /**
   * 异步初始化 Provider：从数据库读取配置
   *
   * 配置流程：
   *   1. 调用 AiProviderConfigService.ensureDefaultProviders() 确保预置供应商已种入数据库
   *   2. 读取所有已启用的供应商配置
   *   3. 对每条配置，找到对应的 Provider 实例并初始化
   *   4. 自动推断路由策略（第一个支持嵌入的供应商作为 embedding 路由）
   */
  private async initializeProvidersAsync(): Promise<void> {
    if (!this.providerConfigService) {
      this.logger.warn('AiProviderConfigService 未注入，无法从数据库加载配置');
      return;
    }

    try {
      // 确保预置供应商已种入数据库（首次启动时自动执行）
      await this.providerConfigService.ensureDefaultProviders();

      const dbConfigs = await this.providerConfigService.getEnabledProviderConfigs();
      if (dbConfigs.length === 0) {
        this.logger.warn(
          '数据库中无已启用的 AI Provider 配置。请在系统设置 → AI 模型配置中添加供应商并填入 API Key',
        );
        return;
      }

      this.logger.log(`从数据库加载 ${dbConfigs.length} 个已启用的 AI Provider 配置`);
      let embeddingProvider: string | null = null;

      for (const cfg of dbConfigs) {
        const provider = this.providers.get(cfg.providerId);
        if (provider) {
          provider.initialize(cfg);
          this.logger.log(`Provider ${cfg.providerId} 已从数据库配置初始化`);

          // 第一个支持嵌入的供应商作为 embedding 路由
          if (!embeddingProvider) {
            const preset = findPreset(cfg.providerId);
            if (preset?.supportsEmbedding || cfg.embeddingModel) {
              embeddingProvider = cfg.providerId;
            }
          }
        } else {
          this.logger.warn(
            `数据库中有 Provider ${cfg.providerId} 配置，但无对应实现实例（可能未在 PROVIDER_PRESETS 中注册）`,
          );
        }
      }

      // 自动推断路由策略
      this.inferRouting(dbConfigs, embeddingProvider);
    } catch (err) {
      this.logger.error(`从数据库读取 Provider 配置失败: ${(err as Error).message}`);
    }
  }

  /**
   * 根据已启用的 Provider 列表自动推断路由策略
   *
   * 策略：
   *   - codegen: 优先选有 codegenModel 的供应商，否则第一个
   *   - chat/intent/analysis: 第一个已启用的供应商
   *   - embedding: 第一个支持嵌入的供应商
   */
  private inferRouting(configs: ProviderConfig[], embeddingProvider: string | null): void {
    if (configs.length === 0) return;

    const first = configs[0].providerId;
    const codegen = configs.find((c) => c.codegenModel)?.providerId || first;
    const embedding = embeddingProvider || first;

    this.routing = {
      codegen: codegen as LLMProviderId,
      chat: first as LLMProviderId,
      intent: first as LLMProviderId,
      analysis: first as LLMProviderId,
      embedding: embedding as LLMProviderId,
    };

    this.logger.log(`路由策略已自动推断: ${JSON.stringify(this.routing)}`);
  }

  onModuleDestroy(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  /** 是否启用 AI 功能 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 同步生成（按任务类型路由 + 降级）
   */
  async generate(req: LLMRequest, taskType: TaskType = 'chat'): Promise<LLMResponse> {
    this.assertEnabled();

    // P1-T09：安全过滤 — 用户输入检查
    if (this.safetyGuard) {
      const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user')?.content;
      if (lastUserMsg) {
        const safetyResult = this.safetyGuard.filterInput(lastUserMsg);
        if (!safetyResult.passed) {
          throw new Error(`输入被安全过滤拦截：${safetyResult.reason}`);
        }
      }
    }

    const primary = this.routing[taskType];
    const fallback = this.getFallbackProvider(primary, taskType);

    const tried = new Set<LLMProviderId>();
    // 用户显式指定供应商时优先使用（覆盖任务类型路由）；未就绪再回退到路由队列
    // 校验队列构建时机：降级队列仅包含已就绪的 Provider
    const queue = this.buildQueue(req.providerId, primary, fallback);

    let lastErr: unknown;
    for (const pid of queue) {
      if (tried.has(pid)) continue;
      tried.add(pid);
      const provider = this.providers.get(pid);
      if (!provider || !provider.isReady()) {
        const reason = pid === req.providerId ? '用户指定但未配置 API Key' : '不可用';
        this.logger.warn(`Provider ${pid} ${reason}，尝试下一个`);
        continue;
      }
      try {
        const response = await provider.generate(req);

        // P1-T09：安全过滤 — 输出净化
        if (this.safetyGuard && response?.content) {
          const safetyResult = this.safetyGuard.sanitizeOutput(response.content);
          if (safetyResult.content !== undefined) {
            response.content = safetyResult.content;
          }
        }

        return response;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`Provider ${pid} 生成失败：${(err as Error).message}，尝试降级`);
      }
    }
    throw new Error(
      `所有 Provider 均失败，任务类型=${taskType}，最后错误：${(lastErr as Error)?.message || 'unknown'}`,
    );
  }

  /**
   * 流式生成（按任务类型路由 + 降级）
   *
   * 注意：流式降级在首个 chunk 之前发生；一旦开始 yield，则不再降级。
   */
  async *streamChat(
    req: LLMRequest,
    taskType: TaskType = 'chat',
  ): AsyncGenerator<ChatStreamChunk, void, unknown> {
    this.assertEnabled();

    // P1-T09：安全过滤 — 用户输入检查
    if (this.safetyGuard) {
      const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user')?.content;
      if (lastUserMsg) {
        const safetyResult = this.safetyGuard.filterInput(lastUserMsg);
        if (!safetyResult.passed) {
          // 流式错误通过 SSE error event 返回
          yield {
            delta: `[ERROR] 输入被安全过滤拦截：${safetyResult.reason}`,
            done: true,
          };
          return;
        }
      }
    }

    const primary = this.routing[taskType];
    const fallback = this.getFallbackProvider(primary, taskType);

    const tried = new Set<LLMProviderId>();
    // 用户显式指定供应商时优先使用（覆盖任务类型路由）；未就绪再回退到路由队列
    const queue = this.buildQueue(req.providerId, primary, fallback);

    let lastErr: unknown;
    for (const pid of queue) {
      if (tried.has(pid)) continue;
      tried.add(pid);
      const provider = this.providers.get(pid);
      if (!provider || !provider.isReady()) {
        const reason = pid === req.providerId ? '用户指定但未配置 API Key' : '不可用';
        this.logger.warn(`Provider ${pid} ${reason}，尝试下一个`);
        continue;
      }
      try {
        // 流式降级：仅在建立流之前尝试，一旦 yield 成功则不再降级
        const generator = provider.stream(req);
        // 探测首个 chunk
        const firstResult = await generator.next();
        if (firstResult.done) {
          // 空响应，继续降级
          continue;
        }
        // 成功建立流，转发剩余 chunk（含安全过滤）
        const safeChunk = this.applySafetyToChunk(firstResult.value as ChatStreamChunk);
        yield safeChunk;
        for await (const chunk of generator) {
          yield this.applySafetyToChunk(chunk as ChatStreamChunk);
        }
        return;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`Provider ${pid} 流式失败：${(err as Error).message}，尝试降级`);
      }
    }
    throw new Error(
      `所有 Provider 流式生成均失败，任务类型=${taskType}，最后错误：${(lastErr as Error)?.message || 'unknown'}`,
    );
  }

  /**
   * 嵌入任务（路由到第一个支持嵌入的 Provider）
   */
  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.assertEnabled();
    const providerId = this.routing.embedding;
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isReady()) {
      throw new Error(`嵌入 Provider ${providerId} 不可用，无法降级`);
    }
    return provider.embed(req);
  }

  /** 获取所有 Provider 的健康状态 */
  async getHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    for (const [pid, provider] of this.providers) {
      const health = await provider.checkHealth();
      this.healthMap.set(pid, health);
      results.push(health);
    }
    return results;
  }

  /** 获取缓存的健康状态（不触发新检查） */
  getCachedHealth(): ProviderHealth[] {
    return Array.from(this.healthMap.values());
  }

  /** 当前路由策略 */
  getRouting(): RoutingConfig {
    return { ...this.routing };
  }

  // -------- 私有方法 --------

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new Error('AI 功能未启用（设置 AI_ENABLED=true 启用）');
    }
  }

  /** 获取主 Provider 之外的备选列表（仅返回已就绪的 Provider） */
  private getFallbackProvider(primary: LLMProviderId, _taskType: TaskType): LLMProviderId[] {
    const all: LLMProviderId[] = [];
    for (const [pid, provider] of this.providers) {
      if (pid !== primary && provider.isReady()) all.push(pid);
    }
    return all;
  }

  /** 构建降级队列：用户指定的 → 路由主 → 已就绪备选，去重 */
  private buildQueue(
    requestedProvider: LLMProviderId | undefined,
    primary: LLMProviderId,
    fallback: LLMProviderId[],
  ): LLMProviderId[] {
    const seen = new Set<LLMProviderId>();
    const queue: LLMProviderId[] = [];
    if (requestedProvider) {
      seen.add(requestedProvider);
      queue.push(requestedProvider);
    }
    if (!seen.has(primary)) {
      seen.add(primary);
      queue.push(primary);
    }
    for (const pid of fallback) {
      if (!seen.has(pid)) {
        seen.add(pid);
        queue.push(pid);
      }
    }
    return queue;
  }

  private startHealthCheck(): void {
    this.healthTimer = setInterval(() => {
      this.getHealth().catch((err) => {
        this.logger.error(`健康检查失败：${err.message}`);
      });
    }, HEALTH_CHECK_INTERVAL_MS);
    // 启动后立即检查一次
    this.getHealth().catch(() => {
      /* 忽略首次失败 */
    });
  }

  /**
   * P1-T09：对流式 chunk 进行安全净化
   */
  private applySafetyToChunk(chunk: ChatStreamChunk): ChatStreamChunk {
    if (!this.safetyGuard || !chunk?.delta) return chunk;
    const safetyResult = this.safetyGuard.sanitizeOutput(chunk.delta);
    if (safetyResult.content !== undefined) {
      return { ...chunk, delta: safetyResult.content };
    }
    return chunk;
  }
}
