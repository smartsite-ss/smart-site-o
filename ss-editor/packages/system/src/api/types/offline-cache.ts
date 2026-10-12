// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 离线缓存相关类型定义
 * 与后端 ss-core OfflineCacheService 对齐
 */

/** 离线缓存统计 */
export interface OfflineCacheStats {
  /** 当前缓冲的消息数 */
  totalBuffered: number;
  /** 最大容量 */
  maxCapacity: number;
  /** 最早缓冲时间戳 */
  oldestTimestamp: number | null;
  /** 最新缓冲时间戳 */
  newestTimestamp: number | null;
  /** dump 文件完整路径 */
  dumpDir: string;
  /** dump 文件大小（字节），文件不存在时为 null */
  dumpFileSize: number | null;
}

/** 刷新结果 */
export interface OfflineCacheFlushResult {
  /** 已刷新的消息数 */
  flushed: number;
}
