// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Retrieval Service — P1-T08 RAG 混合检索服务
 *
 * 融合两种检索方式：
 *   - 语义检索：基于向量相似度（由 VectorStoreService 提供）
 *   - 关键词检索：基于 BM25 的简单关键词匹配
 *
 * 结果通过加权融合（RRF/Reciprocal Rank Fusion）排序。
 *
 * 用法:
 *   const results = await retrievalService.retrieve('如何配置 Modbus？', { topK: 5 });
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService, SearchResult } from './vector-store.service';

/** 检索配置 */
export interface RetrievalConfig {
  /** 返回结果数 */
  topK: number;
  /** 语义检索权重（0-1） */
  semanticWeight: number;
  /** 最小相似度 */
  minSimilarity: number;
  /** 是否融合关键词检索 */
  hybrid: boolean;
}

const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 5,
  semanticWeight: 0.7,
  minSimilarity: 0.5,
  hybrid: true,
};

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  /**
   * 检索
   * @param query — 用户查询
   * @param config — 检索配置
   */
  async retrieve(query: string, config?: Partial<RetrievalConfig>): Promise<SearchResult[]> {
    const mergedConfig = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };

    if (this.vectorStore.size() === 0) {
      this.logger.warn('向量存储为空，返回空结果');
      return [];
    }

    // 1. 语义检索
    const queryVector = await this.embeddingService.embedSingle(query);
    const semanticResults = this.vectorStore.search(queryVector, {
      topK: mergedConfig.topK * 2,
      minSimilarity: mergedConfig.minSimilarity,
    });

    // 2. 关键词检索（如果启用）
    if (mergedConfig.hybrid) {
      const keywordResults = this.keywordSearch(query, mergedConfig.topK * 2);
      return this.fusionRank(
        semanticResults,
        keywordResults,
        mergedConfig.semanticWeight,
        mergedConfig.topK,
      );
    }

    return semanticResults.slice(0, mergedConfig.topK);
  }

  // ============================================================
  //  关键词检索（简化 BM25）
  // ============================================================

  private keywordSearch(query: string, topK: number): SearchResult[] {
    // 查询关键词
    const queryTerms = this.tokenize(query);

    const results: SearchResult[] = [];
    for (const entry of this.vectorStore['entries'] || []) {
      if (!entry) continue;
      const chunk = entry.chunk;
      const chunkTerms = this.tokenize(chunk.content);

      // 计算关键词匹配分数（简化 TF-IDF）
      let score = 0;
      for (const qt of queryTerms) {
        const tf = chunkTerms.filter((t) => t === qt).length;
        if (tf > 0) {
          score += Math.log(1 + tf);
        }
      }

      // 归一化：按块长度
      const normalizedScore =
        chunk.content.length > 0 ? score / Math.log(1 + chunk.content.length / 100) : score;

      if (normalizedScore > 0) {
        results.push({ chunk, similarity: Math.min(normalizedScore, 0.99) });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * RRF (Reciprocal Rank Fusion) 融合排序
   */
  private fusionRank(
    semantic: SearchResult[],
    keyword: SearchResult[],
    semanticWeight: number,
    topK: number,
  ): SearchResult[] {
    const keywordWeight = 1 - semanticWeight;
    const scoreMap = new Map<string, { chunk: SearchResult['chunk']; score: number }>();

    const k = 60; // RRF 常数

    // 语义检索排名
    for (let i = 0; i < semantic.length; i++) {
      const r = semantic[i];
      const key = r.chunk.id;
      const current = scoreMap.get(key);
      scoreMap.set(key, {
        chunk: r.chunk,
        score: (current?.score || 0) + semanticWeight * (1 / (k + i + 1)),
      });
    }

    // 关键词检索排名
    for (let i = 0; i < keyword.length; i++) {
      const r = keyword[i];
      const key = r.chunk.id;
      const current = scoreMap.get(key);
      scoreMap.set(key, {
        chunk: r.chunk,
        score: (current?.score || 0) + keywordWeight * (1 / (k + i + 1)),
      });
    }

    const sorted = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ chunk, score }) => ({ chunk, similarity: score }));

    return sorted;
  }

  // ============================================================
  //  分词（简单中文分词）
  // ============================================================

  private tokenize(text: string): string[] {
    if (!text) return [];

    // 简单分词：按非中文字符分割 + 单字 n-gram
    const segments = text.split(
      /[\s\n\r\t.,;:!?，。；：！？、""''「」【】《》\(\)\[\]{}<>\/\\\-_+=@#$%^&*|`~]+/,
    );

    const tokens: string[] = [];
    for (const seg of segments) {
      if (!seg) continue;
      // 英文词直接按空格分
      if (/^[a-zA-Z0-9]+$/.test(seg)) {
        tokens.push(seg.toLowerCase());
      } else {
        // 中文：bigram
        for (let i = 0; i < seg.length - 1; i++) {
          tokens.push(seg.substring(i, i + 2));
        }
        // 单字也保留（用于短查询）
        if (seg.length === 1) {
          tokens.push(seg);
        }
      }
    }

    return tokens;
  }
}
