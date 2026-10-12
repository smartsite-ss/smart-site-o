// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, shallowRef, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../api/client';
import { getWsServerUrl } from '../utils/ws-url';
import { i18n, ScadaDataManager } from '@scada-editor/core';
import type { TagValue } from '@scada-editor/core';

// WebSocketDriver 已拆分到独立文件，此处 re-export 保持向后兼容
export { WebSocketDriver } from './WebSocketDriver';
export type { DataSourceStatus } from './WebSocketDriver';
import type { DataSourceStatus } from './WebSocketDriver';

export interface TagValueEntry {
  tagId: string;
  tagName: string;
  value: any;
  /** 后端 FormatStep 产出的格式化字符串（如 "12.3"），可能为空 */
  displayValue?: string;
  quality: string;
  /** 统一为毫秒时间戳(后端推送 ISO 字符串时自动转换) */
  timestamp: number;
  /** 活跃告警（仅当后端推送包含此字段时存在，无告警时为 undefined） */
  activeAlarms?: Array<{
    alarmId: string;
    level: string;
    condition: string;
    message: string;
  }>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** 设备状态变更条目(对应后端 device:statusChange 事件) */
export interface DeviceStatusEntry {
  deviceId: string;
  fromStatus: string;
  toStatus: string;
  errorMessage?: string;
  timestamp: string;
}

/** 活跃报警条目(对应后端 alarm:trigger 事件) */
export interface AlarmEntry {
  alarmId: string;
  ruleName: string;
  tagName: string;
  level: string;
  value: number;
  message: string;
  timestamp: string;
  /** 报警状态:active/acknowledged/cleared */
  state: 'active' | 'acknowledged' | 'cleared';
  acknowledgedBy?: string;
  clearedBy?: string;
}

/** 系统广播消息(对应后端 system:broadcast 事件) */
export interface SystemMessageEntry {
  message: string;
  data?: unknown;
  timestamp: string;
}

/** 将后端推送的时间戳(ISO 字符串或数值)统一转换为毫秒时间戳 */
function toEpochMs(ts: unknown): number {
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms)) return ms;
  }
  return Date.now();
}

export const useWsStore = defineStore('ws', () => {
  const socket = ref<Socket | null>(null);
  const connectionStatus = ref<ConnectionStatus>('disconnected');
  // 当前客户端 socket.id，连接建立后填充，断开后置空；供 WS 监控页展示
  const socketId = ref<string | null>(null);
  const tagValues = shallowRef<Map<string, TagValueEntry>>(new Map());
  /** 每次 flushTagUpdates 时递增，供外部 watch 强制触发 computed 重新计算 */
  const tagFlushVersion = ref(0);
  const subscribedTags = ref<Set<string>>(new Set());
  const subscribedProjectId = ref<string | null>(null);
  const error = ref<string | null>(null);
  const reconnectAttempts = ref(0);

  // 设备状态、报警、系统广播
  const deviceStatuses = ref<Map<string, DeviceStatusEntry>>(new Map());
  const activeAlarms = ref<Map<string, AlarmEntry>>(new Map());
  const systemMessages = ref<SystemMessageEntry[]>([]);
  const lastPongAt = ref<string | null>(null);

  // 出站消息缓冲：断连期间 emit 的消息入队，重连后自动补发
  const MAX_OUTBOUND_BUFFER = 100;
  const outboundBuffer: Array<{ event: string; data: any }> = [];
  const outboundBufferSize = ref(0);

  // 标签订阅引用计数：多个调用方（BindingManager / WebSocketDriver / DataSourceConfigDialog）
  // 可能各自订阅同一标签，仅当引用计数归零时才真正向服务端取消订阅
  const _tagReferenceCount = new Map<string, number>();

  // 标签值批处理：使用 RAF 合并同一帧内的多次 WS 更新，减少 Vue 响应式触发次数
  const pendingTagUpdates = new Map<string, TagValueEntry>();
  let rafId: number | null = null;
  let flushPending = false;

  // 增量数据回调监听器：由 WebSocketDriver 注册（运行态接管时）。
  // 当存在监听器时，flushTagUpdates 不再直接 emit EventBus，避免双重触发。
  const flushedListeners = new Set<(entries: Map<string, TagValueEntry>) => void>();

  /**
   * 注册增量数据回调。返回注销函数。
   * 由 WebSocketDriver.connect 注册，使其接管数据流（运行态走 DataSourceManager 路径）。
   * 编辑态无监听器时，flushTagUpdates 仍直接 emit EventBus 作为 fallback。
   */
  function onFlushed(cb: (entries: Map<string, TagValueEntry>) => void): () => void {
    flushedListeners.add(cb);
    return () => { flushedListeners.delete(cb); };
  }

  function flushTagUpdates() {
    flushPending = false;
    rafId = null;
    if (pendingTagUpdates.size === 0) return;
    const current = tagValues.value;
    const next = new Map(current);
    pendingTagUpdates.forEach((entry, tagId) => {
      next.set(tagId, entry);
    });
    // 保存副本用于回调 / EventBus 发送（clear 之后无法遍历）
    const flushedEntries = new Map(pendingTagUpdates);
    const flushTagIds = [...flushedEntries.keys()];
    pendingTagUpdates.clear();
    tagValues.value = next;
    tagFlushVersion.value++;
    // 优先派发给 WebSocketDriver 监听器（运行态走 DataSourceManager → EventBus 路径）
    if (flushedListeners.size > 0) {
      for (const cb of flushedListeners) {
        try { cb(flushedEntries); } catch { void 0; }
      }
      return;
    }

    // Fallback：编辑态无 WebSocketDriver 接管时，直接 emit EventBus
    const eventBus = ScadaDataManager.eventBus;
    if (eventBus) {
      flushedEntries.forEach((entry, tagId) => {
        eventBus.emit('tagValueChanged', {
          tagId,
          value: entry.value,
          quality: entry.quality,
          timestamp: entry.timestamp,
        });
      });
    }
  }

  function scheduleTagFlush() {
    if (!flushPending) {
      flushPending = true;
      rafId = requestAnimationFrame(flushTagUpdates);
    }
  }

  // 心跳定时器：每 25s 发送 ping,防止后端空闲清理(60s)断开连接
  const HEARTBEAT_INTERVAL_MS = 25000;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const isConnected = computed(() => connectionStatus.value === 'connected');

  /** 安全 emit：已连接则直接发送，断连则入缓冲队列 */
  function safeEmit(event: string, data: any): void {
    if (socket.value?.connected) {
      socket.value.emit(event, data);
    } else {
      // 缓冲上限，超限丢弃最早消息
      if (outboundBuffer.length >= MAX_OUTBOUND_BUFFER) {
        outboundBuffer.shift();
      }
      outboundBuffer.push({ event, data });
      outboundBufferSize.value = outboundBuffer.length;
    }
  }

  /** 重连后补发出站缓冲中的消息 */
  function flushOutboundBuffer(): void {
    while (outboundBuffer.length > 0) {
      const { event, data } = outboundBuffer.shift()!;
      socket.value?.emit(event, data);
    }
    outboundBufferSize.value = 0;
  }

  function connect(projectId: string): Promise<void> {
    if (socket.value?.connected) {
      if (subscribedProjectId.value !== projectId) {
        switchProject(projectId);
      }
      return Promise.resolve();
    }

    let token = getToken();
    // Debug token 兜底策略（按优先级）：
    // 1. getToken() 已返回有效 token → 直接使用
    // 2. localStorage.scada_debug_skip_auth === '1' → 用户显式开启了 debug 模式
    // 3. import.meta.env.DEV → Vite dev server 模式，自动使用 debug token
    if (!token) {
      try {
        if (localStorage.getItem('scada_debug_skip_auth') === '1') {
          token = 'debug-mock-token';
        }
      } catch { /* not in browser */ }
    }
    if (!token && import.meta.env.DEV) {
      token = 'debug-mock-token';
    }
    if (!token) {
      error.value = i18n.global.t('system.ws.notLoggedIn');
      return Promise.resolve();
    }

    connectionStatus.value = 'connecting';
    error.value = null;

    // Web 同源：页面 origin（Vite/反向代理转发）；桌面端（Tauri）：后端绝对地址，
    // 否则 socket.io 会连接 https://tauri.localhost/socket.io 导致实时数据不更新（见 ws-url.ts）
    const wsUrl = getWsServerUrl();

    socket.value = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token,
        source: typeof window !== 'undefined' ? window.location.pathname : '',
        clientUrl: typeof window !== 'undefined' ? window.location.href : '',
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
    });

    const connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      socket.value!.on('connect', () => {
        if (settled) return;
        settled = true;
        connectionStatus.value = 'connected';
        socketId.value = socket.value?.id ?? null;
        reconnectAttempts.value = 0;
        subscribeProject(projectId);
        flushOutboundBuffer();
        startHeartbeat();
        resolve();
      });

      socket.value!.on('connect_error', (err: any) => {
        if (settled) return;
        settled = true;
        connectionStatus.value = 'error';
        socketId.value = null;
        reconnectAttempts.value += 1;
        error.value = i18n.global.t('system.ws.connectFailed', { message: err.message });
        reject(err);
      });
    });

    socket.value.on('connection', (data: any) => {
      if (!data?.authenticated) {
        error.value = i18n.global.t('system.ws.authFailed');
      }
    });

    socket.value.on('connection:error', (data: any) => {
      error.value = i18n.global.t('system.ws.connectionRejected', {
        reason: data?.reason || 'unknown',
      });
    });

    socket.value.on('disconnect', (reason: string) => {
      connectionStatus.value = 'disconnected';
      socketId.value = null;
      stopHeartbeat();
      if (reason === 'io server disconnect') {
        error.value = i18n.global.t('system.ws.serverDisconnected');
      }
    });

    socket.value.on('data:update', (data: any) => {
      if (data?.tagId) {
        pendingTagUpdates.set(data.tagId, {
          tagId: data.tagId,
          tagName: data.tagName || '',
          value: data.value,
          displayValue: data.displayValue,
          quality: data.quality || 'good',
          timestamp: toEpochMs(data.timestamp),
          activeAlarms: data.activeAlarms,
        });
        scheduleTagFlush();
      }
    });

    socket.value.on('data:batch', (data: any) => {
      if (data?.data && Array.isArray(data.data)) {
        data.data.forEach((item: any) => {
          if (item.tagId) {
            pendingTagUpdates.set(item.tagId, {
              tagId: item.tagId,
              tagName: item.tagName || '',
              value: item.value,
              displayValue: item.displayValue,
              quality: item.quality || 'good',
              timestamp: toEpochMs(item.timestamp),
              activeAlarms: item.activeAlarms,
            });
          }
        });
        scheduleTagFlush();
      }
    });

    // 设备状态变更:更新 deviceStatuses Map
    socket.value.on('device:statusChange', (data: any) => {
      if (data?.deviceId) {
        deviceStatuses.value.set(data.deviceId, {
          deviceId: data.deviceId,
          fromStatus: data.fromStatus || '',
          toStatus: data.toStatus || '',
          errorMessage: data.errorMessage,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        deviceStatuses.value = new Map(deviceStatuses.value);
      }
    });

    // 报警触发:添加到 activeAlarms
    socket.value.on('alarm:trigger', (data: any) => {
      if (data?.alarmId) {
        activeAlarms.value.set(data.alarmId, {
          alarmId: data.alarmId,
          ruleName: data.ruleName || '',
          tagName: data.tagName || '',
          level: data.level || 'warning',
          value: data.value,
          message: data.message || '',
          timestamp: data.timestamp || new Date().toISOString(),
          state: 'active',
        });
        activeAlarms.value = new Map(activeAlarms.value);
      }
    });

    // 报警确认:更新状态为 acknowledged
    socket.value.on('alarm:acknowledged', (data: any) => {
      if (data?.alarmId) {
        const alarm = activeAlarms.value.get(data.alarmId);
        if (alarm) {
          alarm.state = 'acknowledged';
          alarm.acknowledgedBy = data.acknowledgedBy;
          activeAlarms.value = new Map(activeAlarms.value);
        }
      }
    });

    // 报警清除:更新状态为 cleared
    socket.value.on('alarm:cleared', (data: any) => {
      if (data?.alarmId) {
        const alarm = activeAlarms.value.get(data.alarmId);
        if (alarm) {
          alarm.state = 'cleared';
          alarm.clearedBy = data.clearedBy;
          activeAlarms.value = new Map(activeAlarms.value);
        }
      }
    });

    // 报警自动恢复:更新状态为 cleared（自动恢复）
    socket.value.on('alarm:recovered', (data: any) => {
      if (data?.alarmId) {
        const alarm = activeAlarms.value.get(data.alarmId);
        if (alarm) {
          alarm.state = 'cleared';
          alarm.clearedBy = 'system';
          activeAlarms.value = new Map(activeAlarms.value);
          // 30s 后从 activeAlarms 中移除已恢复的告警
          setTimeout(() => {
            if (activeAlarms.value.get(data.alarmId)?.state === 'cleared') {
              activeAlarms.value.delete(data.alarmId);
              activeAlarms.value = new Map(activeAlarms.value);
            }
          }, 30000);
        }
      }
    });

    // 系统广播
    socket.value.on('system:broadcast', (data: any) => {
      if (data?.message) {
        systemMessages.value.push({
          message: data.message,
          data: data.data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        // 仅保留最近 50 条
        if (systemMessages.value.length > 50) {
          systemMessages.value = systemMessages.value.slice(-50);
        }
      }
    });

    // 心跳响应
    socket.value.on('pong', (data: any) => {
      lastPongAt.value = data?.timestamp || new Date().toISOString();
    });

    return connectPromise;
  }

  function subscribeProject(projectId: string) {
    if (!socket.value?.connected) return;
    safeEmit('subscribe:project', { projectId });
    subscribedProjectId.value = projectId;
  }

  function subscribeDevice(deviceId: string) {
    if (!socket.value?.connected) return;
    safeEmit('subscribe:device', { deviceId });
  }

  function subscribeTags(tagIds: string[]) {
    if (!socket.value?.connected || tagIds.length === 0) return;
    const newTagIds: string[] = [];
    for (const id of tagIds) {
      const prev = _tagReferenceCount.get(id) || 0;
      _tagReferenceCount.set(id, prev + 1);
      if (prev === 0) {
        newTagIds.push(id);
      }
    }
    if (newTagIds.length === 0) return;
    safeEmit('subscribe:tag', { tagIds: newTagIds });
    newTagIds.forEach((id) => subscribedTags.value.add(id));
  }

  function unsubscribeTags(tagIds: string[]) {
    const removedTagIds: string[] = [];
    for (const id of tagIds) {
      const prev = _tagReferenceCount.get(id);
      if (prev === undefined) continue;
      if (prev <= 1) {
        _tagReferenceCount.delete(id);
        removedTagIds.push(id);
      } else {
        _tagReferenceCount.set(id, prev - 1);
      }
    }
    if (removedTagIds.length === 0) return;
    if (socket.value?.connected) {
      safeEmit('unsubscribe:tag', { tagIds: removedTagIds });
    }
    subscribedTags.value = new Set(
      [...subscribedTags.value].filter((id) => !removedTagIds.includes(id)),
    );
  }

  function switchProject(newProjectId: string) {
    if (!socket.value?.connected) return;
    if (subscribedProjectId.value) {
      safeEmit('unsubscribe:project', { projectId: subscribedProjectId.value });
    }
    subscribedTags.value.clear();
    _tagReferenceCount.clear();
    tagValues.value = new Map();
    subscribeProject(newProjectId);
  }

  function updateTagValue(tagId: string, value: any) {
    const next = new Map(tagValues.value);
    next.set(tagId, {
      tagId,
      tagName: '',
      value,
      quality: 'good',
      timestamp: Date.now(),
    });
    tagValues.value = next;
  }

  function getTagValue(tagId: string): any {
    return tagValues.value.get(tagId)?.value ?? null;
  }

  function disconnect() {
    stopHeartbeat();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      flushPending = false;
    }
    pendingTagUpdates.clear();
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
    connectionStatus.value = 'disconnected';
    socketId.value = null;
    subscribedProjectId.value = null;
    subscribedTags.value.clear();
    tagValues.value = new Map();
    deviceStatuses.value.clear();
    activeAlarms.value.clear();
    systemMessages.value = [];
    lastPongAt.value = null;
    error.value = null;
    outboundBuffer.length = 0;
    outboundBufferSize.value = 0;
  }

  function clearError() {
    error.value = null;
  }

  /** 启动客户端心跳:定时发送 ping 防止后端空闲清理断开 */
  function startHeartbeat(): void {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      safeEmit('ping', {});
    }, HEARTBEAT_INTERVAL_MS);
  }

  /** 停止心跳定时器 */
  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  return {
    connectionStatus,
    socketId,
    tagValues,
    tagFlushVersion,
    subscribedTags,
    subscribedProjectId,
    error,
    isConnected,
    outboundBufferSize,
    deviceStatuses,
    activeAlarms,
    systemMessages,
    lastPongAt,
    connect,
    disconnect,
    subscribeProject,
    subscribeDevice,
    subscribeTags,
    unsubscribeTags,
    switchProject,
    updateTagValue,
    getTagValue,
    safeEmit,
    clearError,
    startHeartbeat,
    stopHeartbeat,
    onFlushed,
  };
});