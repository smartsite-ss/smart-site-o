// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Chunking Service — P1-T08 RAG 文档分块器
 *
 * 将 Markdown 文档按语义边界拆分为重叠的文本块。
 * 支持两种分块策略：
 *   - heading：按 Markdown 标题分块
 *   - fixed：固定大小 + 重叠窗口分块
 *
 * Phase 1 实现：简单版（不依赖 NLP 分句器）。
 *
 * 用法:
 *   const chunks = chunkingService.chunk(markdownText, { strategy: 'heading' });
 */

import { Injectable, Optional } from '@nestjs/common';

/** 文本块 */
export interface TextChunk {
  /** 块 ID */
  id: string;
  /** 块内容 */
  content: string;
  /** 来源文档路径 */
  sourcePath: string;
  /** 文档内序号（0-based） */
  chunkIndex: number;
  /** 元数据（标题层级等） */
  metadata: {
    /** 所属章节标题 */
    heading?: string;
    /** 标题层级（1-6） */
    headingLevel?: number;
    /** 块起始字符位置 */
    startPos: number;
    /** 块结束字符位置 */
    endPos: number;
  };
}

/** 分块策略 */
export type ChunkStrategy = 'heading' | 'fixed';

/** 分块配置 */
export interface ChunkConfig {
  /** 分块策略 */
  strategy: ChunkStrategy;
  /** 固定分块大小（字符数，fixed 策略时） */
  chunkSize: number;
  /** 块间重叠字符数 */
  overlap: number;
  /** 最小块大小（小于此值的块合并到上一块） */
  minChunkSize: number;
}

const DEFAULT_CONFIG: ChunkConfig = {
  strategy: 'heading',
  chunkSize: 1000,
  overlap: 200,
  minChunkSize: 100,
};

@Injectable()
export class ChunkingService {
  private config: ChunkConfig;

  constructor(@Optional() config: Partial<ChunkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 分块主入口
   * @param text — 文档全文
   * @param sourcePath — 来源路径
   * @param options — 可覆盖默认配置
   */
  chunk(text: string, sourcePath: string, options?: Partial<ChunkConfig>): TextChunk[] {
    const cfg = { ...this.config, ...options };
    return cfg.strategy === 'heading'
      ? this.chunkByHeading(text, sourcePath, cfg)
      : this.chunkByFixedSize(text, sourcePath, cfg);
  }

  // ============================================================
  //  按标题分块
  // ============================================================

  private chunkByHeading(text: string, sourcePath: string, cfg: ChunkConfig): TextChunk[] {
    const lines = text.split('\n');
    const chunks: TextChunk[] = [];
    let currentHeading = '';
    let currentLevel = 0;
    let currentContent: string[] = [];
    let startPos = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

      if (headingMatch) {
        // 保存当前块
        if (currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content.length >= cfg.minChunkSize) {
            chunks.push({
              id: `${sourcePath}#c${chunkIndex}`,
              content,
              sourcePath,
              chunkIndex,
              metadata: {
                heading: currentHeading || undefined,
                headingLevel: currentLevel || undefined,
                startPos,
                endPos: startPos + content.length,
              },
            });
            chunkIndex++;
          }
        }

        currentHeading = headingMatch[2];
        currentLevel = headingMatch[1].length;
        currentContent = [line];
        startPos = text.indexOf(line, startPos);
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }

    // 最后一块
    if (currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content.length >= cfg.minChunkSize) {
        chunks.push({
          id: `${sourcePath}#c${chunkIndex}`,
          content,
          sourcePath,
          chunkIndex,
          metadata: {
            heading: currentHeading || undefined,
            headingLevel: currentLevel || undefined,
            startPos,
            endPos: startPos + content.length,
          },
        });
      }
    }

    return chunks;
  }

  // ============================================================
  //  固定大小分块
  // ============================================================

  private chunkByFixedSize(text: string, sourcePath: string, cfg: ChunkConfig): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { chunkSize, overlap, minChunkSize } = cfg;

    if (text.length < minChunkSize) {
      return [
        {
          id: `${sourcePath}#c0`,
          content: text,
          sourcePath,
          chunkIndex: 0,
          metadata: { startPos: 0, endPos: text.length },
        },
      ];
    }

    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // 尝试在段落边界分割
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        if (paragraphBreak > start + minChunkSize) {
          end = paragraphBreak;
        }
      }

      const content = text.substring(start, end).trim();
      if (content.length >= minChunkSize) {
        chunks.push({
          id: `${sourcePath}#c${chunkIndex}`,
          content,
          sourcePath,
          chunkIndex,
          metadata: { startPos: start, endPos: end },
        });
        chunkIndex++;
      }

      start = end - overlap;
    }

    return chunks;
  }
}
