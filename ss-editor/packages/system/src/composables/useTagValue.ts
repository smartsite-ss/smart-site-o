// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef } from 'vue';
import { ScadaDataManager } from '@scada-editor/core';
import { useWsStore } from '../stores/ws.store';

/** useTagValue 所需的最小图元属性（调用方可传超集） */
export interface TagValueProps {
  tagId: string;
  tagName?: string;
  deviceCode?: string;
  deviceName?: string;
  decimalPlaces?: number;
}

/**
 * 单标签实时值组合式函数：统一管理
 * 「订阅 + 实时刷新 + 断线补偿 + 重绑定 + EventBus 兜底 + 小数位格式化」。
 * 供 tag-variable / tag-value 及工业组件等所有单变量图元复用，替代各自重复的订阅样板。
 */
export function useTagValue(
  props: TagValueProps,
  options?: {
    /** 非 WS 通道（运行态）兜底取数，默认 ScadaDataManager.getTagValue */
    fallbackGetter?: (tagId: string) => unknown;
  },
): {
  currentValue: ComputedRef<unknown>;
  displayValue: ComputedRef<string>;
  bindTitle: ComputedRef<string>;
} {
  const wsStore = useWsStore();
  const fallbackGetter =
    options?.fallbackGetter ?? ((tagId: string) => ScadaDataManager.getTagValue(tagId) ?? null);

  /** 兜底刷新版本号：运行态 EventBus / HTTP 轮询等通道通过 tagValueChanged 触发 */
  const localVersion = ref(0);

  const currentValue = computed<unknown>(() => {
    void wsStore.tagFlushVersion;
    void localVersion.value;
    if (!props.tagId) return null;

    const wsValue = wsStore.getTagValue(props.tagId);
    if (wsValue !== null && wsValue !== undefined) return wsValue;

    return fallbackGetter(props.tagId) ?? null;
  });

  const displayValue = computed(() => formatValue(currentValue.value, props.decimalPlaces));

  const bindTitle = computed(() =>
    props.tagId ? `${props.deviceName || props.deviceCode || ''} · ${props.tagName || props.tagId}` : '',
  );

  let unsubscribeEventBus: (() => void) | null = null;
  /** 已登记（attempted）到 wsStore 的标签，用于绑定变更时退订 / 新增 */
  let registeredTagId: string | null = null;

  /** 同步 wsStore 订阅：退订旧标签、登记新标签（断连时 subscribeTags 会被丢弃，由 isConnected 补偿） */
  function syncSubscription() {
    const next = props.tagId || null;
    if (registeredTagId && registeredTagId !== next) {
      wsStore.unsubscribeTags([registeredTagId]);
    }
    if (next && next !== registeredTagId && wsStore.isConnected) {
      wsStore.subscribeTags([next]);
    }
    registeredTagId = next;
  }

  onMounted(() => {
    syncSubscription();
    // 运行态 / 非 WS 通道兜底：监听全局 EventBus 的 tagValueChanged
    unsubscribeEventBus = ScadaDataManager.eventBus.on('tagValueChanged', (event) => {
      const payload = event.payload as { tagId?: string } | undefined;
      if (payload?.tagId === props.tagId) {
        localVersion.value++;
      }
    });
  });

  // 首次连接建立后补偿订阅：编辑态图元可能在 wsStore 连接完成前就已挂载
  watch(
    () => wsStore.isConnected,
    (connected) => {
      if (!connected) return;
      if (props.tagId) wsStore.subscribeTags([props.tagId]);
    },
  );

  // 绑定变更（重新绑定变量）：同步订阅
  watch(
    () => props.tagId,
    () => syncSubscription(),
  );

  onUnmounted(() => {
    if (registeredTagId) {
      wsStore.unsubscribeTags([registeredTagId]);
    }
    registeredTagId = null;
    unsubscribeEventBus?.();
  });

  return { currentValue, displayValue, bindTitle };
}

/** 按小数位格式化实时值；布尔与非数值（字符串）原样返回，空值返回占位符 */
function formatValue(raw: unknown, decimalPlaces: number | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '--';
  if (typeof raw === 'boolean') return String(raw);
  const num = Number(raw);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num.toFixed(decimalPlaces ?? 2);
  }
  return String(raw);
}
