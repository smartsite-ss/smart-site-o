// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Vector Store — P1-T08 RAG 向量存储服务
 *
 * Phase 1：内存向量存储（使用余弦相似度检索）
 * Phase 2：迁移到 pgvector + HNSW 索引
 *
 * 用法:
 *   await vectorStore.addChunks(chunks, embeddings);
 *   const results = await vectorStore.search(queryVector, { topK: 5 });
 */

import { Injectable, Logger } from '@nestjs/common';
import { TextChunk } from './chunking.service';

/** 向量条目 */
export interface VectorEntry {
  chunk: TextChunk;
  vector: number[];
}

/** 检索配置 */
export interface SearchConfig {
  /** 返回结果数 */
  topK: number;
  /** 最小相似度阈值（0-1） */
  minSimilarity: number;
}

/** 检索结果 */
export interface SearchResult {
  chunk: TextChunk;
  /** 余弦相似度（0-1） */
  similarity: number;
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  topK: 5,
  minSimilarity: 0.5,
};

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private entries: VectorEntry[] = [];

  /**
   * 添加块 + 向量
   */
  addChunk(chunk: TextChunk, vector: number[]): void {
    this.entries.push({ chunk, vector });
  }

  /**
   * 批量添加
   */
  addChunks(chunks: TextChunk[], vectors: number[][]): void {
    if (chunks.length !== vectors.length) {
      throw new Error(`块数与向量数不匹配: ${chunks.length} vs ${vectors.length}`);
    }
    for (let i = 0; i < chunks.length; i++) {
      this.entries.push({ chunk: chunks[i], vector: vectors[i] });
    }
    this.logger.log(`已添加 ${chunks.length} 个向量块，总计 ${this.entries.length}`);
  }

  /**
   * 余弦相似度搜索
   * @param queryVector — 查询向量
   * @param config — 检索配置
   * @returns 按相似度降序排列的结果
   */
  search(queryVector: number[], config?: Partial<SearchConfig>): SearchResult[] {
    const mergedConfig = { ...DEFAULT_SEARCH_CONFIG, ...config };

    if (this.entries.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const entry of this.entries) {
      const similarity = this.cosineSimilarity(queryVector, entry.vector);
      if (similarity >= mergedConfig.minSimilarity) {
        results.push({ chunk: entry.chunk, similarity });
      }
    }

    // 按相似度降序排列
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, mergedConfig.topK);
  }

  /**
   * 清空向量存储
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * 获取条目数
   */
  size(): number {
    return this.entries.length;
  }

  // ============================================================
  //  余弦相似度计算
  // ============================================================

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
