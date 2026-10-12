// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * RAG QA Service — P1-T08 RAG 问答服务
 *
 * 整合检索 + LLM 生成，提供端到端的知识库问答能力。
 *
 * 流程：
 *   1. 用户提问
 *   2. RetrievalService 检索相关文档块
 *   3. 拼接上下文 + Prompt 模板
 *   4. LLM 生成回答（SSE 流式输出）
 *
 * 用法:
 *   const answer = await ragQaService.ask('如何配置 Modbus TCP 设备？');
 */

import { Injectable, Logger } from '@nestjs/common';
import { LLMProxyService } from './llm-proxy.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService, SearchResult } from './vector-store.service';
import { RetrievalService, RetrievalConfig } from './retrieval.service';
import { ChunkingService } from './chunking.service';
import { LLMSafetyGuardService } from './llm-safety-guard.service';
import { ChatMessage, ChatStreamChunk } from './llm.types';
import { FeatureFlagService, AI_FEATURE_FLAGS } from './feature-flag.service';

/** RAG QA 请求 */
export interface RAGQuestionRequest {
  /** 用户问题 */
  question: string;
  /** 对话历史（可选） */
  history?: ChatMessage[];
  /** 检索参数覆盖 */
  retrievalConfig?: Partial<RetrievalConfig>;
}

/** RAG QA 回答 */
export interface RAGAnswer {
  /** 回答文本 */
  answer: string;
  /** 引用来源 */
  sources: Array<{
    text: string;
    sourcePath: string;
    heading?: string;
  }>;
  /** 执行时间（毫秒） */
  latencyMs: number;
}

/** RAG 知识库项 */
export interface KnowledgeItem {
  /** 文档路径 */
  path: string;
  /** 文档内容 */
  content: string;
}

@Injectable()
export class RAGQAService {
  private readonly logger = new Logger(RAGQAService.name);
  private indexed = false;

  constructor(
    private readonly proxy: LLMProxyService,
    private readonly embedding: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly retrieval: RetrievalService,
    private readonly chunking: ChunkingService,
    private readonly safetyGuard: LLMSafetyGuardService,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  /**
   * 索引文档
   * @param items — 知识库项列表
   */
  async indexDocuments(items: KnowledgeItem[]): Promise<{ chunks: number; errors: number }> {
    if (!this.featureFlag.isEnabled(AI_FEATURE_FLAGS.KB)) {
      throw new Error('知识库功能未启用（Feature Flag: ai.kb.enabled）');
    }

    let totalChunks = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const chunks = this.chunking.chunk(item.content, item.path);
        const texts = chunks.map((c) => c.content);
        const embedResult = await this.embedding.embed(texts);
        this.vectorStore.addChunks(chunks, embedResult.vectors);
        totalChunks += chunks.length;
      } catch (err) {
        errors++;
        this.logger.error(`索引失败: ${item.path} — ${(err as Error).message}`);
      }
    }

    this.indexed = true;
    this.logger.log(`索引完成: ${totalChunks} 块，${errors} 错误`);
    return { chunks: totalChunks, errors };
  }

  /**
   * 问答（同步）
   * @param req — 问答请求
   * @returns 回答 + 引用来源
   */
  async ask(req: RAGQuestionRequest): Promise<RAGAnswer> {
    const startTime = Date.now();

    // Feature Flag
    if (!this.featureFlag.isEnabled(AI_FEATURE_FLAGS.KB)) {
      throw new Error('知识库功能未启用（Feature Flag: ai.kb.enabled）');
    }

    // 安全过滤
    const safetyResult = this.safetyGuard.filterInput(req.question);
    if (!safetyResult.passed) {
      throw new Error(`输入被安全过滤拦截：${safetyResult.reason}`);
    }

    // 检索
    const results = await this.retrieval.retrieve(req.question, req.retrievalConfig);

    // 净化上下文
    const chunkTexts = results.map((r) => r.chunk.content);
    const sanitized = this.safetyGuard.sanitizeContext(chunkTexts);
    if (!sanitized.passed || !sanitized.content) {
      return {
        answer: '抱歉，未找到相关知识，或检索内容被安全过滤。',
        sources: [],
        latencyMs: Date.now() - startTime,
      };
    }

    // 构建 Prompt
    const messages = this.buildRAGPrompt(req.question, sanitized.content, results, req.history);

    // LLM 生成
    const response = await this.proxy.generate({ messages, stream: false }, 'chat');

    const latencyMs = Date.now() - startTime;

    return {
      answer: response.content || '(无响应)',
      sources: results.slice(0, 5).map((r) => ({
        text: r.chunk.content.substring(0, 200),
        sourcePath: r.chunk.sourcePath,
        heading: r.chunk.metadata.heading,
      })),
      latencyMs,
    };
  }

  /**
   * 问答（流式）
   * @returns AsyncGenerator，每个 chunk 为 SSE 文本
   */
  async *askStream(req: RAGQuestionRequest): AsyncGenerator<ChatStreamChunk, void, unknown> {
    if (!this.featureFlag.isEnabled(AI_FEATURE_FLAGS.KB)) {
      yield { delta: '[ERROR] 知识库功能未启用', done: true };
      return;
    }

    // 安全过滤
    const safetyResult = this.safetyGuard.filterInput(req.question);
    if (!safetyResult.passed) {
      yield { delta: `[ERROR] 输入被安全过滤拦截：${safetyResult.reason}`, done: true };
      return;
    }

    // 检索
    const results = await this.retrieval.retrieve(req.question, req.retrievalConfig);
    const chunkTexts = results.map((r) => r.chunk.content);
    const sanitized = this.safetyGuard.sanitizeContext(chunkTexts);

    if (!sanitized.passed || !sanitized.content) {
      yield { delta: '抱歉，未找到相关知识。', done: true };
      return;
    }

    const messages = this.buildRAGPrompt(req.question, sanitized.content, results, req.history);

    // 流式生成
    yield* this.proxy.streamChat({ messages, stream: true }, 'chat');
  }

  /**
   * 是否已索引
   */
  isIndexed(): boolean {
    return this.indexed;
  }

  /**
   * 重置索引
   */
  reset(): void {
    this.vectorStore.clear();
    this.indexed = false;
    this.logger.log('索引已重置');
  }

  // ============================================================
  //  Prompt 模板
  // ============================================================

  private buildRAGPrompt(
    question: string,
    context: string,
    sources: SearchResult[],
    history?: ChatMessage[],
  ): ChatMessage[] {
    const sourceInfo = sources
      .slice(0, 3)
      .map((s, i) => `[${i + 1}] ${s.chunk.metadata.heading || s.chunk.sourcePath}`)
      .join('\n');

    const systemPrompt = `你是一个专业 SCADA 系统知识助手。
请根据以下参考资料回答用户问题。如果资料中没有相关信息，请如实告知。

【参考资料】
${context}

【引用来源】
${sourceInfo}

回答要求：
- 基于参考资料回答，不要编造
- 回答末尾标注引用来源编号
- 使用中文回答
- 如果问题涉及操作步骤，请按步骤清晰列出`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: question },
    ];

    return messages;
  }
}
