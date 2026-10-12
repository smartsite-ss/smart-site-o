// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 请求去重工具
 *
 * 相同参数的 GET 请求在 pending 期间共享同一个 Promise，
 * 避免多个组件同时发起相同请求造成的重复网络开销。
 *
 * 使用方式：
 *   const dedupKey = `GET:/api/v1/projects/${projectId}/devices`;
 *   const result = await requestDedup.dedup(dedupKey, () => client.get(url));
 *
 * 组件卸载时取消请求：
 *   const controller = new AbortController();
 *   onMounted(() => fetchData(controller.signal));
 *   onUnmounted(() => controller.abort());
 */

type PendingEntry = {
  promise: Promise<any>;
  controller: AbortController;
};

class RequestDedup {
  private pending = new Map<string, PendingEntry>();

  /**
   * 执行去重请求：相同 key 的请求在 pending 期间共享同一个 Promise
   * @param key 去重键（建议格式：`METHOD:URL`）
   * @param fn 请求工厂函数，接收 AbortSignal
   * @returns 请求结果
   */
  async dedup<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    const controller = new AbortController();
    const promise = fn(controller.signal)
      .finally(() => {
        // 请求完成后从 pending 中移除，无论成功或失败
        this.pending.delete(key);
      });

    this.pending.set(key, { promise, controller });
    return promise;
  }

  /**
   * 取消指定 key 的 pending 请求
   */
  cancel(key: string): void {
    const entry = this.pending.get(key);
    if (entry) {
      entry.controller.abort();
      this.pending.delete(key);
    }
  }

  /**
   * 取消所有 pending 请求
   */
  cancelAll(): void {
    this.pending.forEach((entry) => {
      entry.controller.abort();
    });
    this.pending.clear();
  }

  /**
   * 检查是否有 pending 的请求
   */
  hasPending(key: string): boolean {
    return this.pending.has(key);
  }
}

export const requestDedup = new RequestDedup();