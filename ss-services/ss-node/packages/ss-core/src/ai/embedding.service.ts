// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Embedding Service — P1-T08 RAG 文本嵌入服务
 *
 * 调用 AI Provider 的嵌入端点将文本转换为向量。
 * 复用 LLMProxyService 的路由/降级能力。
 *
 * 用法:
 *   const vectors = await embeddingService.embed(['文本1', '文本2']);
 *   // → [ [0.123, -0.456, ...], [0.789, -0.012, ...] ]
 */

import { Injectable, Logger } from '@nestjs/common';
import { LLMProxyService } from './llm-proxy.service';

/** 嵌入请求 */
export interface EmbedRequest {
  texts: string[];
  /** 嵌入模型（默认自动选择） */
  model?: string;
}

/** 嵌入结果 */
export interface EmbedResult {
  /** 向量列表（与输入 text 一一对应） */
  vectors: number[][];
  /** 向量维度 */
  dimension: number;
  /** 使用的模型 */
  model: string;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private cachedDimension = 0;

  constructor(private readonly proxy: LLMProxyService) {}

  /**
   * 单文本嵌入
   */
  async embedSingle(text: string): Promise<number[]> {
    const result = await this.embed([text]);
    return result.vectors[0];
  }

  /**
   * 批量文本嵌入
   */
  async embed(texts: string[]): Promise<EmbedResult> {
    if (!texts.length) {
      return { vectors: [], dimension: this.cachedDimension, model: 'unknown' };
    }

    try {
      const response = await this.proxy.embed({
        inputs: texts,
      });

      if (response?.embeddings) {
        this.cachedDimension = response.dimension || response.embeddings[0]?.length || 0;
        return {
          vectors: response.embeddings,
          dimension: this.cachedDimension,
          model: response.model || 'unknown',
        };
      }

      throw new Error('嵌入响应格式错误');
    } catch (err) {
      this.logger.error(`嵌入失败: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * 获取缓存的向量维度
   */
  getDimension(): number {
    return this.cachedDimension;
  }
}
