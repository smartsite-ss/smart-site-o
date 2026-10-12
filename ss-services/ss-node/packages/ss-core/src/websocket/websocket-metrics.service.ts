// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

/**
 * WebSocket 消息指标快照
 */
export interface WebSocketMetricsSnapshot {
  // ── 按事件类型统计 ──
  broadcastCounts: Record<string, number>;
  broadcastErrors: Record<string, number>;
  // ── 按推送目标统计 ──
  roomHitStats: Record<string, { broadcasts: number; totalRecipients: number }>;
  // ── 离线缓存统计 ──
  offlineCacheHits: number;
  offlineCacheMisses: number;
  // ── 耗时统计 ──
  bridgeLatencyMs: { count: number; totalMs: number; avgMs: number; maxMs: number };
  // ── 全局计数 ──
  totalBroadcasts: number;
  totalRecipients: number;
  // ── 时间信息 ──
  startedAt: number;
  snapshotAt: number;
}

/**
 * WebSocket 指标收集服务
 *
 * 监控消息的"来去过程"与"消息效率"：
 * - 来：DataPushBridge 收到 EventBus 事件 → 记录事件类型、来源、耗时
 * - 去：Gateway 广播到房间 → 记录目标房间、接收人数
 *
 * 通过 /api/v1/ws/metrics 端点暴露。
 */
@Injectable()
export class WebSocketMetricsService {
  private readonly logger = new Logger(WebSocketMetricsService.name);

  // ── 按事件类型统计 ──
  private readonly broadcastCounts = new Map<string, number>();
  private readonly broadcastErrors = new Map<string, number>();

  // ── 按推送目标房间统计 ──
  private readonly roomHitStats = new Map<
    string,
    { broadcasts: number; totalRecipients: number }
  >();

  // ── 离线缓存统计 ──
  private offlineCacheHits = 0;
  private offlineCacheMisses = 0;

  // ── DataPushBridge 处理耗时 ──
  private bridgeLatencyCount = 0;
  private bridgeLatencyTotalMs = 0;
  private bridgeLatencyMaxMs = 0;

  // ── 全局计数 ──
  private totalBroadcasts = 0;
  private totalRecipients = 0;

  private readonly startedAt = Date.now();

  /**
   * 记录一次广播（由 ScadaWebSocketGateway 调用）
   * @param event WebSocket 事件名（如 data:update, alarm:trigger）
   * @param room 目标房间名
   * @param recipientCount 接收客户端数
   */
  recordBroadcast(event: string, room: string, recipientCount: number): void {
    this.totalBroadcasts++;
    this.totalRecipients += recipientCount;

    // 按事件类型计数
    this.broadcastCounts.set(event, (this.broadcastCounts.get(event) || 0) + 1);

    // 按房间统计命中率
    const roomStat = this.roomHitStats.get(room) || { broadcasts: 0, totalRecipients: 0 };
    roomStat.broadcasts++;
    roomStat.totalRecipients += recipientCount;
    this.roomHitStats.set(room, roomStat);
  }

  /**
   * 记录一次广播错误
   */
  recordBroadcastError(event: string): void {
    this.broadcastErrors.set(event, (this.broadcastErrors.get(event) || 0) + 1);
  }

  /**
   * 记录 DataPushBridge 处理耗时（从 EventBus 收到事件到调用 gateway 广播）
   */
  recordBridgeLatency(event: string, durationMs: number): void {
    this.bridgeLatencyCount++;
    this.bridgeLatencyTotalMs += durationMs;
    if (durationMs > this.bridgeLatencyMaxMs) {
      this.bridgeLatencyMaxMs = durationMs;
    }
  }

  /**
   * 记录离线缓存命中
   */
  recordOfflineCacheHit(): void {
    this.offlineCacheHits++;
  }

  /**
   * 记录离线缓存未命中（无离线客户端）
   */
  recordOfflineCacheMiss(): void {
    this.offlineCacheMisses++;
  }

  /**
   * 获取指标快照
   */
  getSnapshot(): WebSocketMetricsSnapshot {
    const avgMs =
      this.bridgeLatencyCount > 0
        ? Math.round((this.bridgeLatencyTotalMs / this.bridgeLatencyCount) * 100) / 100
        : 0;

    return {
      broadcastCounts: Object.fromEntries(this.broadcastCounts),
      broadcastErrors: Object.fromEntries(this.broadcastErrors),
      roomHitStats: Object.fromEntries(this.roomHitStats),
      offlineCacheHits: this.offlineCacheHits,
      offlineCacheMisses: this.offlineCacheMisses,
      bridgeLatencyMs: {
        count: this.bridgeLatencyCount,
        totalMs: this.bridgeLatencyTotalMs,
        avgMs,
        maxMs: this.bridgeLatencyMaxMs,
      },
      totalBroadcasts: this.totalBroadcasts,
      totalRecipients: this.totalRecipients,
      startedAt: this.startedAt,
      snapshotAt: Date.now(),
    };
  }

  /**
   * 获取 Prometheus 文本格式指标
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const snapshot = this.getSnapshot();
    const uptimeSec = Math.max(1, (snapshot.snapshotAt - snapshot.startedAt) / 1000);

    // ws_broadcasts_total
    lines.push('# HELP ws_broadcasts_total Total WebSocket broadcasts by event type');
    lines.push('# TYPE ws_broadcasts_total counter');
    for (const [event, count] of Object.entries(snapshot.broadcastCounts)) {
      lines.push(`ws_broadcasts_total{event="${event}"} ${count}`);
    }
    lines.push('');

    // ws_broadcast_errors_total
    lines.push('# HELP ws_broadcast_errors_total WebSocket broadcast errors by event type');
    lines.push('# TYPE ws_broadcast_errors_total counter');
    for (const [event, count] of Object.entries(snapshot.broadcastErrors)) {
      lines.push(`ws_broadcast_errors_total{event="${event}"} ${count}`);
    }
    lines.push('');

    // ws_total_broadcasts
    lines.push('# HELP ws_total_broadcasts Total WebSocket broadcasts (all events)');
    lines.push('# TYPE ws_total_broadcasts counter');
    lines.push(`ws_total_broadcasts ${snapshot.totalBroadcasts}`);
    lines.push('');

    // ws_total_recipients
    lines.push('# HELP ws_total_recipients Total message recipients (sum of room sizes)');
    lines.push('# TYPE ws_total_recipients counter');
    lines.push(`ws_total_recipients ${snapshot.totalRecipients}`);
    lines.push('');

    // ws_broadcast_rate
    lines.push('# HELP ws_broadcast_rate Broadcasts per second since startup');
    lines.push('# TYPE ws_broadcast_rate gauge');
    lines.push(`ws_broadcast_rate ${(snapshot.totalBroadcasts / uptimeSec).toFixed(2)}`);
    lines.push('');

    // ws_bridge_latency_ms
    lines.push('# HELP ws_bridge_latency_ms DataPushBridge processing latency stats');
    lines.push('# TYPE ws_bridge_latency_ms gauge');
    lines.push(`ws_bridge_latency_ms_avg ${snapshot.bridgeLatencyMs.avgMs}`);
    lines.push(`ws_bridge_latency_ms_max ${snapshot.bridgeLatencyMs.maxMs}`);
    lines.push('');

    // ws_offline_cache
    lines.push('# HELP ws_offline_cache_hits_total Offline message cache hits');
    lines.push('# TYPE ws_offline_cache_hits_total counter');
    lines.push(`ws_offline_cache_hits_total ${snapshot.offlineCacheHits}`);
    lines.push(`ws_offline_cache_misses_total ${snapshot.offlineCacheMisses}`);
    lines.push('');

    // ws_room_recipients
    lines.push('# HELP ws_room_recipients Total recipients by room');
    lines.push('# TYPE ws_room_recipients counter');
    for (const [room, stat] of Object.entries(snapshot.roomHitStats)) {
      lines.push(`ws_room_recipients{room="${room}"} ${stat.totalRecipients}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 重置所有指标（主要用于测试）
   */
  reset(): void {
    this.broadcastCounts.clear();
    this.broadcastErrors.clear();
    this.roomHitStats.clear();
    this.offlineCacheHits = 0;
    this.offlineCacheMisses = 0;
    this.bridgeLatencyCount = 0;
    this.bridgeLatencyTotalMs = 0;
    this.bridgeLatencyMaxMs = 0;
    this.totalBroadcasts = 0;
    this.totalRecipients = 0;
    this.logger.debug('WebSocket metrics reset');
  }
}
