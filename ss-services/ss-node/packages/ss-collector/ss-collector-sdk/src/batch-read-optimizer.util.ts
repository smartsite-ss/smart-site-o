// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 批量读取优化器
 *
 * 按地址连续性将标签分组，以便合并为更少的读取请求。
 * 适用于 Modbus 寄存器合并读取、S7 DB 块合并读取等场景。
 */

/** 分组结果 */
export interface BatchGroup<T> {
  /** 该批次包含的标签 */
  items: T[];
  /** 起始地址 */
  startAddress: number;
  /** 该批次总长度 */
  length: number;
}

export class BatchReadOptimizer {
  /**
   * 按地址连续性将标签分组
   *
   * 算法：
   *  1. 按地址升序排序
   *  2. 依次扫描，若与前一个标签的间隔 ≤ gapThreshold 且累计大小未超 maxBatchSize，则合并到当前批次
   *  3. 否则结束当前批次，开启新批次
   *
   * @param tags 标签列表
   * @param getAddress 从标签中提取地址的函数
   * @param getSize 从标签中获取读取大小的函数（默认为 1）
   * @param gapThreshold 相邻标签允许的最大间隔（默认 0，即仅合并完全连续的地址）
   * @param maxBatchSize 单批最大大小（默认 64）
   */
  static groupByContiguousAddress<T>(
    tags: T[],
    getAddress: (tag: T) => number,
    getSize?: (tag: T) => number,
    gapThreshold: number = 0,
    maxBatchSize: number = 64,
  ): BatchGroup<T>[] {
    if (!tags || tags.length === 0) return [];

    const sizeFn = getSize ?? (() => 1);

    // 按地址排序
    const sorted = [...tags]
      .map((tag) => ({ tag, address: getAddress(tag) }))
      .filter((item) => !Number.isNaN(item.address))
      .sort((a, b) => a.address - b.address);

    const batches: BatchGroup<T>[] = [];
    let batch: T[] = [];
    let batchEnd = -1;
    let batchBytes = 0;

    for (const { tag, address } of sorted) {
      const size = sizeFn(tag);
      const tagEnd = address + size;

      if (batch.length === 0) {
        batch = [tag];
        batchEnd = tagEnd;
        batchBytes = size;
      } else {
        const gap = address - batchEnd;

        if (
          gap >= 0 &&
          gap <= gapThreshold &&
          batchBytes + gap + size <= maxBatchSize &&
          batch.length < maxBatchSize
        ) {
          batch.push(tag);
          batchEnd = Math.max(batchEnd, tagEnd);
          batchBytes += gap + size;
        } else {
          batches.push({
            items: batch,
            startAddress: getAddress(batch[0]),
            length: batchBytes,
          });
          batch = [tag];
          batchEnd = tagEnd;
          batchBytes = size;
        }
      }
    }

    if (batch.length > 0) {
      batches.push({
        items: batch,
        startAddress: getAddress(batch[0]),
        length: batchBytes,
      });
    }

    return batches;
  }
}
