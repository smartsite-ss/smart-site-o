// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Module — 后端 AI 服务网关
 *
 * 聚合：
 *   - LLM Provider（统一 OpenAICompatibleProvider，为每个预置供应商创建实例）
 *   - LLMProxyService（路由 + 降级 + 健康检查）
 *   - AI Controller（REST API + SSE 端点 + Provider CRUD + 预置模板查询）
 *   - AiProviderConfigService（数据库 CRUD + AES 加密 + 预置种子）
 *
 * 使用方式：
 *   import { AiModule } from '@ss-node/ss-core';
 *   @Module({ imports: [AiModule] })
 *
 * 关联决策：
 *   - D-010 多供应商路由 + 降级
 *   - D-012 Feature Flag（AI_ENABLED）
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LLM_PROVIDERS } from './llm-provider.interface';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { LLMProxyService } from './llm-proxy.service';
import { AiController } from './ai.controller';
import { AiProviderConfigService } from './ai-provider-config.service';
import { AiProvider } from './entities/ai-provider.entity';
import { AiConversation, AiMessage } from './entities/ai-conversation.entity';
import { AiPrompt, AiPromptVersion } from './entities/ai-prompt.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { ConversationService } from './conversation.service';
import { PromptVersionService } from './prompt-version.service';
import { CostMonitorService } from './cost-monitor.service';
import { PROVIDER_PRESETS } from './provider-presets';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './feature-flag.guard';
import { LLMSafetyGuardService } from './llm-safety-guard.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { RetrievalService } from './retrieval.service';
import { RAGQAService } from './rag-qa.service';
import { Phase2FeaturesService } from './phase2-features.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiProvider,
      AiConversation,
      AiMessage,
      AiPrompt,
      AiPromptVersion,
      AiUsageLog,
    ]),
  ],
  controllers: [AiController],
  providers: [
    FeatureFlagService,
    FeatureFlagGuard,
    LLMSafetyGuardService,
    AgentOrchestratorService,
    ChunkingService,
    EmbeddingService,
    VectorStoreService,
    RetrievalService,
    RAGQAService,
    LLMProxyService,
    AiProviderConfigService,
    // P2-T08: 对话持久化 + Prompt 版本管理 + 成本监控
    ConversationService,
    PromptVersionService,
    CostMonitorService,
    // Phase 2 智能功能（A004/A005/C002/C003/E003）
    Phase2FeaturesService,
    /**
     * LLM Provider 工厂
     *
     * 为每个预置供应商创建独立的 OpenAICompatibleProvider 实例。
     * 实例通过 providerId 区分（deepseek/zhipu/qwen/moonshot/ernie/openai/claude/gemini/mistral/custom）。
     * 'custom' 实例用于处理用户自定义的 OpenAI 兼容端点。
     */
    {
      provide: LLM_PROVIDERS,
      useFactory: () => {
        return PROVIDER_PRESETS.map((preset) => new OpenAICompatibleProvider(preset.providerId));
      },
    },
  ],
  exports: [
    LLMProxyService,
    AiProviderConfigService,
    FeatureFlagService,
    FeatureFlagGuard,
    LLMSafetyGuardService,
    AgentOrchestratorService,
    ChunkingService,
    EmbeddingService,
    VectorStoreService,
    RetrievalService,
    RAGQAService,
    ConversationService,
    PromptVersionService,
    CostMonitorService,
    Phase2FeaturesService,
  ],
})
export class AiModule {}
