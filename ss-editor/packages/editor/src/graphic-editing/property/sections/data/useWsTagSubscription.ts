// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, onUnmounted, type Ref } from 'vue';
import { useWsStore } from '@scada-editor/system';

/**
 * useWsTagSubscription — WebSocket 标签订阅统一管理
 *
 * 抽取自 PreviewCanvas / TagSourceSelector / DataSourceConfigDialog
 * 中重复的 wsStore 调用模式：
 * 1. 按需 connect(projectId)
 * 2. subscribeTags(tagIds) + 跟踪本组件订阅的 tagIds
 * 3. onUnmounted 时自动 unsubscribeTags 释放引用计数
 *
 * 注意：wsStore 管理连接与订阅状态，BindingManager 管 graphicId↔tagId 属性映射，
 * 二者职责不同，本 composable 仅统一 wsStore 调用入口，不影响 BindingManager。
 */
export function useWsTagSubscription(projectId: Ref<string> | string) {
  const wsStore = useWsStore();
  /** 本组件订阅的标签 ID 列表（onUnmounted 时取消订阅） */
  const subscribedTagIds = ref<string[]>([]);

  function resolveProjectId(): string {
    return typeof projectId === 'string' ? projectId : projectId.value;
  }

  /**
   * 确保 WebSocket 已连接到指定项目；如未连接则自动建立连接。
   */
  async function ensureConnected(): Promise<void> {
    const pid = resolveProjectId();
    if (!pid) return;
    if (!wsStore.isConnected || wsStore.subscribedProjectId !== pid) {
      await wsStore.connect(pid);
    }
  }

  /**
   * 订阅指定标签并跟踪订阅列表（用于后续取消订阅）。
   * 重复订阅同一标签是安全的（wsStore 内部会去重）。
   */
  async function subscribe(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    await ensureConnected();
    wsStore.subscribeTags(tagIds);
    const merged = new Set([...subscribedTagIds.value, ...tagIds]);
    subscribedTagIds.value = [...merged];
  }

  /**
   * 取消订阅指定标签（从本组件跟踪列表中移除）。
   */
  function unsubscribe(tagIds: string[]): void {
    if (tagIds.length === 0) return;
    wsStore.unsubscribeTags(tagIds);
    const removeSet = new Set(tagIds);
    subscribedTagIds.value = subscribedTagIds.value.filter((id) => !removeSet.has(id));
  }

  /**
   * 取消订阅本组件所有已订阅标签。
   */
  function unsubscribeAll(): void {
    if (subscribedTagIds.value.length > 0) {
      wsStore.unsubscribeTags(subscribedTagIds.value);
      subscribedTagIds.value = [];
    }
  }

  /**
   * 获取标签实时值（从 wsStore.tagValues 读取）。
   */
  function getTagValue(tagId: string): { value: unknown; quality: string; timestamp: number } | null {
    const entry = wsStore.tagValues.get(tagId);
    if (!entry) return null;
    return {
      value: entry.value,
      quality: entry.quality,
      timestamp: entry.timestamp,
    };
  }

  // 组件卸载时自动释放订阅
  onUnmounted(() => {
    unsubscribeAll();
  });

  return {
    wsStore,
    subscribedTagIds,
    ensureConnected,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getTagValue,
  };
}
