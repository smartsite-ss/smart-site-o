// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 请求重试队列
 *
 * 后端断连期间，写操作（POST/PUT/PATCH/DELETE）请求入队，
 * 后端恢复后按 FIFO 顺序自动重发。
 *
 * - 队列上限 50 条，超出直接拒绝
 * - 请求过期时间 5 分钟，重发时跳过过期请求
 * - 最大重试次数 3 次
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export interface QueuedRequest {
  id: string;
  config: InternalAxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  enqueuedAt: number;
  retryCount: number;
  maxRetry: number;
}

export interface QueueStats {
  size: number;
  oldest: number | null;
}

const MAX_QUEUE_SIZE = 50;
const MAX_AGE = 5 * 60 * 1000; // 5 分钟
const DEFAULT_MAX_RETRY = 3;

let requestCounter = 0;

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private isFlushing = false;
  private sizeChangeListeners: Array<(stats: QueueStats) => void> = [];

  /** 入队（由响应拦截器调用） */
  enqueue(
    config: InternalAxiosRequestConfig,
    resolve: (value: any) => void,
    reject: (reason: any) => void,
    maxRetry: number = DEFAULT_MAX_RETRY,
  ): boolean {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }

    const request: QueuedRequest = {
      id: `req_${Date.now()}_${++requestCounter}`,
      config,
      resolve,
      reject,
      enqueuedAt: Date.now(),
      retryCount: 0,
      maxRetry,
    };

    this.queue.push(request);
    this.notifySizeChange();
    return true;
  }

  /** 刷新队列（后端恢复时调用） */
  async flush(client: AxiosInstance): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const batch = [...this.queue];
    this.queue = [];
    this.notifySizeChange();

    for (const request of batch) {
      // 检查过期
      if (Date.now() - request.enqueuedAt > MAX_AGE) {
        request.reject(new Error('REQUEST_EXPIRED'));
        continue;
      }

      // 检查重试次数
      if (request.retryCount >= request.maxRetry) {
        request.reject(new Error('MAX_RETRY_EXCEEDED'));
        continue;
      }

      request.retryCount++;

      try {
        const response = await client(request.config);
        request.resolve(response);
      } catch (error) {
        // 重发失败，如果还能重试则重新入队
        if (request.retryCount < request.maxRetry) {
          this.queue.push(request);
          this.notifySizeChange();
        } else {
          request.reject(error);
        }
      }
    }

    this.isFlushing = false;
  }

  /** 清空队列（所有请求 reject） */
  clear(): void {
    const rejected = this.queue;
    this.queue = [];
    rejected.forEach((req) => req.reject(new Error('QUEUE_CLEARED')));
    this.notifySizeChange();
  }

  /** 队列统计 */
  getStats(): QueueStats {
    if (this.queue.length === 0) {
      return { size: 0, oldest: null };
    }
    return {
      size: this.queue.length,
      oldest: this.queue[0].enqueuedAt,
    };
  }

  /** 注册队列大小变更监听 */
  onSizeChange(cb: (stats: QueueStats) => void): void {
    this.sizeChangeListeners.push(cb);
  }

  private notifySizeChange(): void {
    const stats = this.getStats();
    this.sizeChangeListeners.forEach((cb) => {
      try {
        cb(stats);
      } catch {
        // 忽略监听器错误
      }
    });
  }
}

/** 全局单例 */
export const requestQueue = new RequestQueue();
