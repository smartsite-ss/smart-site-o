// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * LLMProxyService 单元测试 — P1-T03
 *
 * 验证内容：
 *   1. 任务路由策略（codegen→deepseek, chat→zhipu, embedding→zhipu）
 *   2. 主 Provider 失败时降级到备选 Provider
 *   3. 所有 Provider 均不可用时抛出错误
 *   4. Feature Flag（AI_ENABLED=false 时禁用所有调用）
 *   5. 嵌入任务固定路由到智谱
 *   6. 健康状态缓存
 */

import { LLMProxyService } from '../ai/llm-proxy.service';
import { ILLMProvider } from '../ai/llm-provider.interface';
import {
  ChatStreamChunk,
  DEFAULT_ROUTING,
  EmbeddingResponse,
  LLMProviderId,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderHealth,
} from '../ai/llm.types';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// ---- 测试辅助 ----

function makeProviderConfig(id: LLMProviderId): ProviderConfig {
  return {
    providerId: id,
    apiKey: `key-${id}`,
    apiBase: `https://${id}.example.com/v1`,
    defaultModel: `${id}-default`,
    timeout: 5000,
    maxRetries: 1,
    embeddingModel: id === 'zhipu' ? 'embedding-3' : undefined,
    embeddingDim: id === 'zhipu' ? 1024 : undefined,
    liteModel: id === 'zhipu' ? 'glm-4-flash' : undefined,
    codegenModel: id === 'deepseek' ? 'deepseek-coder' : undefined,
  };
}

function makeLLMResponse(provider: LLMProviderId, content: string): LLMResponse {
  return {
    content,
    model: `${provider}-model`,
    role: 'assistant',
    usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
    provider,
    finishReason: 'stop',
    latencyMs: 50,
  };
}

function makeEmbeddingResponse(): EmbeddingResponse {
  return {
    embeddings: [[0.1, 0.2, 0.3]],
    model: 'embedding-3',
    dimension: 3,
    usage: { promptTokens: 5, totalTokens: 5 },
    provider: 'zhipu',
  };
}

function makeHealth(id: LLMProviderId, healthy: boolean): ProviderHealth {
  return {
    providerId: id,
    healthy,
    lastCheckAt: Date.now(),
    avgLatencyMs: 30,
  };
}

/** 构造 mock Provider */
function createMockProvider(
  id: LLMProviderId,
  opts: {
    ready?: boolean;
    generateImpl?: (req: LLMRequest) => Promise<LLMResponse>;
    generateError?: Error;
    streamChunks?: ChatStreamChunk[];
    streamError?: Error;
    embedImpl?: (req: any) => Promise<EmbeddingResponse>;
    embedError?: Error;
    health?: ProviderHealth;
  } = {},
): ILLMProvider {
  const ready = opts.ready !== false;
  const config = makeProviderConfig(id);

  // 内部生成器实现
  async function* genImpl(): AsyncGenerator<ChatStreamChunk, void, unknown> {
    if (opts.streamError) throw opts.streamError;
    if (opts.streamChunks) {
      for (const c of opts.streamChunks) yield c;
      return;
    }
    yield { delta: `chunk-${id}`, done: false };
    yield { delta: '', done: true, finishReason: 'stop' };
  }

  // stream 必须是 jest.fn 才能被 expect().toHaveBeenCalled() 验证
  const streamFn = jest.fn().mockImplementation(() => genImpl());

  return {
    providerId: id,
    initialize: jest.fn(),
    isReady: jest.fn().mockReturnValue(ready),
    generate: opts.generateError
      ? jest.fn().mockRejectedValue(opts.generateError)
      : opts.generateImpl
        ? jest.fn().mockImplementation(opts.generateImpl)
        : jest.fn().mockResolvedValue(makeLLMResponse(id, `response-from-${id}`)),
    stream: streamFn as any,
    embed: opts.embedError
      ? jest.fn().mockRejectedValue(opts.embedError)
      : jest.fn().mockResolvedValue(makeEmbeddingResponse()),
    checkHealth: jest.fn().mockResolvedValue(opts.health || makeHealth(id, true)),
    ...({ _config: config } as any),
  };
}

function createMockConfigService(env: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]) as any,
  } as any;
}

/**
 * 创建 mock AiProviderConfigService
 *
 * 源码重构后 Provider 配置从数据库加载（而非环境变量），
 * 测试需注入此 mock 模拟数据库返回的已启用 Provider 配置列表。
 */
function createMockProviderConfigService(configs?: ProviderConfig[]) {
  const defaultConfigs: ProviderConfig[] = configs || [
    {
      providerId: 'deepseek',
      apiKey: 'key-deepseek',
      apiBase: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
      codegenModel: 'deepseek-coder',
      timeout: 5000,
      maxRetries: 1,
    },
    {
      providerId: 'zhipu',
      apiKey: 'key-zhipu',
      apiBase: 'https://open.bigmodel.cn/api/paas/v4',
      defaultModel: 'glm-4',
      liteModel: 'glm-4-flash',
      embeddingModel: 'embedding-3',
      embeddingDim: 1024,
      timeout: 5000,
      maxRetries: 1,
    },
  ];
  return {
    ensureDefaultProviders: jest.fn().mockResolvedValue(undefined),
    getEnabledProviderConfigs: jest.fn().mockResolvedValue(defaultConfigs),
  };
}

describe('LLMProxyService', () => {
  let mockDeepseek: ReturnType<typeof createMockProvider>;
  let mockZhipu: ReturnType<typeof createMockProvider>;
  let mockConfig: ConfigService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockDeepseek = createMockProvider('deepseek');
    mockZhipu = createMockProvider('zhipu');
    mockConfig = createMockConfigService({
      AI_ENABLED: 'true',
      DEEPSEEK_API_KEY: 'key-deepseek',
      DEEPSEEK_API_BASE: 'https://api.deepseek.com/v1',
      DEEPSEEK_DEFAULT_MODEL: 'deepseek-chat',
      DEEPSEEK_CODEGEN_MODEL: 'deepseek-coder',
      DEEPSEEK_TIMEOUT: '5000',
      DEEPSEEK_MAX_RETRIES: '1',
      ZHIPU_API_KEY: 'key-zhipu',
      ZHIPU_API_BASE: 'https://open.bigmodel.cn/api/paas/v4',
      ZHIPU_DEFAULT_MODEL: 'glm-4',
      ZHIPU_LITE_MODEL: 'glm-4-flash',
      ZHIPU_EMBEDDING_MODEL: 'embedding-3',
      ZHIPU_EMBEDDING_DIM: '1024',
      ZHIPU_TIMEOUT: '5000',
      ZHIPU_MAX_RETRIES: '1',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createService(providers: ILLMProvider[] = [mockDeepseek, mockZhipu]) {
    // 阻止周期性健康检查
    const svc = new LLMProxyService(providers as any, mockConfig);
    // 调用 onModuleInit 手动触发初始化，但禁用健康检查调度
    jest.spyOn(svc as any, 'startHealthCheck').mockImplementation(() => {});
    svc.onModuleInit();
    return svc;
  }

  // ============================================================
  // 1. 路由策略
  // ============================================================
  describe('路由策略', () => {
    it('codegen 任务路由到 DeepSeek', async () => {
      const svc = createService();
      const req: LLMRequest = {
        messages: [{ role: 'user', content: '生成一段代码' }],
      };
      await svc.generate(req, 'codegen');
      expect(mockDeepseek.generate).toHaveBeenCalled();
      expect(mockZhipu.generate).not.toHaveBeenCalled();
    });

    it('chat 任务路由到智谱', async () => {
      const svc = createService();
      const req: LLMRequest = {
        messages: [{ role: 'user', content: '你好' }],
      };
      await svc.generate(req, 'chat');
      expect(mockZhipu.generate).toHaveBeenCalled();
      expect(mockDeepseek.generate).not.toHaveBeenCalled();
    });

    it('intent 任务路由到智谱', async () => {
      const svc = createService();
      await svc.generate({ messages: [{ role: 'user', content: '识别意图' }] }, 'intent');
      expect(mockZhipu.generate).toHaveBeenCalled();
      expect(mockDeepseek.generate).not.toHaveBeenCalled();
    });

    it('analysis 任务路由到智谱', async () => {
      const svc = createService();
      await svc.generate({ messages: [{ role: 'user', content: '分析数据' }] }, 'analysis');
      expect(mockZhipu.generate).toHaveBeenCalled();
      expect(mockDeepseek.generate).not.toHaveBeenCalled();
    });

    it('默认 taskType 为 chat', async () => {
      const svc = createService();
      await svc.generate({ messages: [{ role: 'user', content: 'hi' }] });
      expect(mockZhipu.generate).toHaveBeenCalled();
    });

    it('getRouting 返回当前路由策略', () => {
      const svc = createService();
      const routing = svc.getRouting();
      expect(routing).toEqual(DEFAULT_ROUTING);
    });

    it('可根据数据库配置自动推断路由策略', async () => {
      // 源码重构后路由策略从数据库已启用 Provider 列表自动推断，不再从环境变量读取
      // 模拟数据库返回：deepseek 在前（chat/intent/analysis/codegen → deepseek），
      // zhipu 支持 embedding（embedding → zhipu）
      const mockProviderConfigService = createMockProviderConfigService();
      const customConfig = createMockConfigService({
        AI_ENABLED: 'true',
      });
      const svc = new LLMProxyService(
        [mockDeepseek, mockZhipu] as any,
        customConfig,
        mockProviderConfigService as any,
      );
      jest.spyOn(svc as any, 'startHealthCheck').mockImplementation(() => {});
      svc.onModuleInit();
      // onModuleInit 中 initializeProvidersAsync 是 fire-and-forget，需等待完成
      await svc.reloadProviders();
      const routing = svc.getRouting();
      expect(routing.chat).toBe('deepseek'); // 第一个 Provider
      expect(routing.intent).toBe('deepseek');
      expect(routing.embedding).toBe('zhipu'); // 支持 embedding 的 Provider
    });
  });

  // ============================================================
  // 2. 降级策略
  // ============================================================
  describe('降级策略', () => {
    it('主 Provider 抛错时降级到备选', async () => {
      mockZhipu = createMockProvider('zhipu', {
        generateError: new Error('zhipu down'),
      });
      const svc = createService();
      const result = await svc.generate({ messages: [{ role: 'user', content: 'hi' }] }, 'chat');
      // 主（zhipu）失败 → 降级到 deepseek
      expect(mockZhipu.generate).toHaveBeenCalled();
      expect(mockDeepseek.generate).toHaveBeenCalled();
      expect(result.provider).toBe('deepseek');
    });

    it('所有 Provider 均失败时抛出错误', async () => {
      mockDeepseek = createMockProvider('deepseek', {
        generateError: new Error('deepseek down'),
      });
      mockZhipu = createMockProvider('zhipu', {
        generateError: new Error('zhipu down'),
      });
      const svc = createService();
      await expect(
        svc.generate({ messages: [{ role: 'user', content: 'hi' }] }, 'chat'),
      ).rejects.toThrow(/所有 Provider 均失败/);
    });

    it('Provider 不可用（isReady=false）时跳过', async () => {
      mockZhipu = createMockProvider('zhipu', { ready: false });
      const svc = createService();
      const result = await svc.generate({ messages: [{ role: 'user', content: 'hi' }] }, 'chat');
      // zhipu 不可用 → 跳过 → 走 deepseek
      expect(mockZhipu.generate).not.toHaveBeenCalled();
      expect(result.provider).toBe('deepseek');
    });

    it('流式：主 Provider 失败时降级到备选', async () => {
      mockZhipu = createMockProvider('zhipu', {
        streamError: new Error('zhipu stream failed'),
      });
      const svc = createService();
      const chunks: ChatStreamChunk[] = [];
      for await (const c of svc.streamChat(
        { messages: [{ role: 'user', content: 'hi' }] },
        'chat',
      )) {
        chunks.push(c);
      }
      // zhipu 流失败 → 降级到 deepseek
      expect(mockZhipu.stream).toHaveBeenCalled();
      expect(mockDeepseek.stream).toHaveBeenCalled();
      const deltas = chunks.filter((c) => !c.done).map((c) => c.delta);
      expect(deltas).toContain('chunk-deepseek');
    });

    it('流式：所有 Provider 均失败时抛出错误', async () => {
      mockDeepseek = createMockProvider('deepseek', {
        streamError: new Error('deepseek stream failed'),
      });
      mockZhipu = createMockProvider('zhipu', {
        streamError: new Error('zhipu stream failed'),
      });
      const svc = createService();
      await expect(
        (async () => {
          for await (const _ of svc.streamChat(
            { messages: [{ role: 'user', content: 'hi' }] },
            'chat',
          )) {
            // drain
          }
        })(),
      ).rejects.toThrow(/所有 Provider 流式生成均失败/);
    });
  });

  // ============================================================
  // 3. 嵌入
  // ============================================================
  describe('嵌入任务', () => {
    it('固定路由到智谱', async () => {
      const svc = createService();
      const result = await svc.embed({ inputs: ['hello'] });
      expect(mockZhipu.embed).toHaveBeenCalled();
      expect(mockDeepseek.embed).not.toHaveBeenCalled();
      expect(result.provider).toBe('zhipu');
    });

    it('智谱不可用时直接抛出（无降级）', async () => {
      mockZhipu = createMockProvider('zhipu', { ready: false });
      const svc = createService();
      await expect(svc.embed({ inputs: ['x'] })).rejects.toThrow(/不可用，无法降级/);
    });
  });

  // ============================================================
  // 4. Feature Flag
  // ============================================================
  describe('Feature Flag', () => {
    it('AI_ENABLED=false 时禁用所有调用', async () => {
      mockConfig = createMockConfigService({
        AI_ENABLED: 'false',
        DEEPSEEK_API_KEY: 'k',
        ZHIPU_API_KEY: 'k',
      });
      const svc = new LLMProxyService([mockDeepseek, mockZhipu] as any, mockConfig);
      svc.onModuleInit();
      expect(svc.isEnabled()).toBe(false);
      await expect(svc.generate({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
        /未启用/,
      );
      await expect(
        (async () => {
          for await (const _ of svc.streamChat({
            messages: [{ role: 'user', content: 'hi' }],
          })) {
            // drain
          }
        })(),
      ).rejects.toThrow(/未启用/);
      await expect(svc.embed({ inputs: ['x'] })).rejects.toThrow(/未启用/);
    });

    it('AI_ENABLED=true 时启用', () => {
      const svc = createService();
      expect(svc.isEnabled()).toBe(true);
    });
  });

  // ============================================================
  // 5. 健康检查
  // ============================================================
  describe('健康检查', () => {
    it('getHealth 调用所有 Provider 的 checkHealth', async () => {
      const svc = createService();
      const results = await svc.getHealth();
      expect(mockDeepseek.checkHealth).toHaveBeenCalled();
      expect(mockZhipu.checkHealth).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results.find((r) => r.providerId === 'deepseek')?.healthy).toBe(true);
      expect(results.find((r) => r.providerId === 'zhipu')?.healthy).toBe(true);
    });

    it('getCachedHealth 返回缓存的健康状态', async () => {
      const svc = createService();
      await svc.getHealth(); // 触发一次检查
      const cached = svc.getCachedHealth();
      expect(cached).toHaveLength(2);
      expect(cached.map((c) => c.providerId).sort()).toEqual(['deepseek', 'zhipu']);
    });
  });

  // ============================================================
  // 6. 初始化
  // ============================================================
  describe('Provider 初始化', () => {
    it('onModuleInit 调用各 Provider 的 initialize', async () => {
      // 源码重构后 onModuleInit 异步从数据库加载配置并调用 provider.initialize()
      // 需注入 mock AiProviderConfigService 并等待异步初始化完成
      const mockProviderConfigService = createMockProviderConfigService();
      const svc = new LLMProxyService(
        [mockDeepseek, mockZhipu] as any,
        mockConfig,
        mockProviderConfigService as any,
      );
      jest.spyOn(svc as any, 'startHealthCheck').mockImplementation(() => {});
      svc.onModuleInit();
      await svc.reloadProviders(); // 等待异步初始化完成
      expect(mockDeepseek.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'deepseek',
          apiKey: 'key-deepseek',
          defaultModel: 'deepseek-chat',
          codegenModel: 'deepseek-coder',
        }),
      );
      expect(mockZhipu.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'zhipu',
          apiKey: 'key-zhipu',
          defaultModel: 'glm-4',
          liteModel: 'glm-4-flash',
          embeddingModel: 'embedding-3',
          embeddingDim: 1024,
        }),
      );
    });
  });
});
