// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ConnectionStatus } from '../api/connection-monitor';
import { connectionMonitor } from '../api/connection-monitor';
import { requestQueue } from '../api/request-queue';

/**
 * 连接状态 Store
 *
 * 全局管理后端连接状态和待重试请求计数。
 * 由 ConnectionMonitor 驱动状态变更，ConnectionBanner 消费状态展示 UI。
 */
export const useConnectionStore = defineStore('connection', () => {
  const status = ref<ConnectionStatus>('online');
  const lastOfflineAt = ref<number | null>(null);
  const pendingRequests = ref(0);

  const isOffline = computed(() => status.value === 'offline');
  const isRecovering = computed(() => status.value === 'recovering');
  const hasPending = computed(() => pendingRequests.value > 0);

  function setStatus(s: ConnectionStatus): void {
    if (s === 'offline' && status.value !== 'offline') {
      lastOfflineAt.value = Date.now();
    }
    status.value = s;
  }

  function setPendingCount(n: number): void {
    pendingRequests.value = n;
  }

  // 初始化：监听 ConnectionMonitor 状态变更
  connectionMonitor.onStatusChange((s) => {
    setStatus(s);
  });

  // 监听队列大小变更
  requestQueue.onSizeChange((stats) => {
    setPendingCount(stats.size);
  });

  return {
    status,
    lastOfflineAt,
    pendingRequests,
    isOffline,
    isRecovering,
    hasPending,
    setStatus,
    setPendingCount,
  };
});
