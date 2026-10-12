// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Logger } from '@nestjs/common';
import { WebSocketMetricsService } from './websocket-metrics.service';
import { ScadaWebSocketGateway } from './websocket.gateway';
import { ConnectionMonitorService } from './connection-monitor.service';
import { OfflineMessageCacheService } from './offline-message-cache.service';

/**
 * WebSocket 监控指标 Controller
 *
 * 提供消息来去过程监控与消息效率统计：
 * - GET /api/v1/ws/metrics            — JSON 指标快照
 * - GET /api/v1/ws/metrics/prometheus — Prometheus 文本格式
 * - GET /api/v1/ws/metrics/connections — 连接详情
 * - GET /api/v1/ws/metrics/diagnostic  — 诊断信息（排查消息丢失/无数据问题）
 */
@Controller('ws/metrics')
export class WebSocketMetricsController {
  private readonly logger = new Logger(WebSocketMetricsController.name);

  constructor(
    private readonly metricsService: WebSocketMetricsService,
    private readonly wsGateway: ScadaWebSocketGateway,
    private readonly connectionMonitor: ConnectionMonitorService,
    private readonly offlineCache: OfflineMessageCacheService,
  ) {}

  /** JSON 格式指标快照 */
  @Get()
  getJsonMetrics() {
    const snapshot = this.metricsService.getSnapshot();
    if (snapshot.totalBroadcasts === 0) {
      this.logger.warn(
        'getJsonMetrics: totalBroadcasts=0 — WebSocket 从未广播过消息。' +
          '可能原因: 1) 无采集任务运行 2) EventBus 事件未触发 3) DataPushBridge 未初始化。',
      );
    }
    return snapshot;
  }

  /** Prometheus 文本格式指标 */
  @Get('prometheus')
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  /** 连接详情（集成 ConnectionMonitorService） */
  @Get('connections')
  getConnectionDetails() {
    const monitorStats = this.connectionMonitor.getStats();
    const gatewayMetrics = this.wsGateway.getMetrics();

    return {
      monitor: monitorStats,
      gateway: gatewayMetrics,
      onlineUserIds: Array.from(this.wsGateway.getOnlineUserIds()),
    };
  }

  /**
   * 诊断端点：一次性返回 WebSocket 消息链路状态，排查"消息无数据"问题。
   * 返回原始数据（由全局 TransformInterceptor 统一包装），形状对齐前端 WsDiagnosticInfo：
   * { conclusions, suggestions, details }。
   *
   * 排查思路：
   * - totalBroadcasts === 0 → 消息从未广播，检查 DataPushBridge 和采集任务
   * - broadcastCounts 有数据但 roomHitStats 中 totalRecipients === 0 → 无客户端订阅
   * - bridgeLatencyMs.count > 0 但 broadcastCounts 为空 → Bridge 收到事件但未广播
   * - offlineCacheHits > 0 → 有离线客户端在缓存消息
   */
  @Get('diagnostic')
  getDiagnostic() {
    const metricsSnapshot = this.metricsService.getSnapshot();
    const monitorStats = this.connectionMonitor.getStats();
    const gatewayMetrics = this.wsGateway.getMetrics();
    const onlineUserIds = this.wsGateway.getOnlineUserIds();

    const diagnosis = this.buildDiagnosis(metricsSnapshot, monitorStats, gatewayMetrics);

    this.logger.log(
      `getDiagnostic: broadcasts=${metricsSnapshot.totalBroadcasts}, ` +
        `recipients=${metricsSnapshot.totalRecipients}, ` +
        `connections=${monitorStats.totalConnections}, ` +
        `onlineUsers=${onlineUserIds.size}`,
    );

    return {
      conclusions: diagnosis,
      suggestions: [],
      details: {
        timestamp: new Date().toISOString(),
        metrics: metricsSnapshot,
        connections: {
          monitor: monitorStats,
          gateway: gatewayMetrics,
          onlineUserCount: onlineUserIds.size,
        },
      },
    };
  }

  /**
   * 根据当前状态自动生成诊断结论
   */
  private buildDiagnosis(metrics: any, monitor: any, gateway: any): string[] {
    const conclusions: string[] = [];

    // 检查消息广播情况
    if (metrics.totalBroadcasts === 0) {
      conclusions.push(
        '❌ WebSocket 从未广播过消息 — 检查: 1) 采集任务是否运行 2) EventBus 是否触发 data_point_changed/device:statusChanged/alarm_triggered 3) DataPushBridge 是否初始化',
      );
    } else {
      conclusions.push(
        `✅ 已广播 ${metrics.totalBroadcasts} 次消息，共 ${metrics.totalRecipients} 个接收者`,
      );

      // 检查事件类型分布
      const eventTypes = Object.keys(metrics.broadcastCounts);
      conclusions.push(`📊 广播事件类型: ${eventTypes.join(', ')}`);
    }

    // 检查 Bridge 延迟
    if (metrics.bridgeLatencyMs.count > 0) {
      conclusions.push(
        `✅ DataPushBridge 处理 ${metrics.bridgeLatencyMs.count} 次，平均耗时 ${metrics.bridgeLatencyMs.avgMs}ms，最大 ${metrics.bridgeLatencyMs.maxMs}ms`,
      );
    }

    // 检查连接情况
    if (monitor.totalConnections === 0) {
      conclusions.push('❌ 无 WebSocket 客户端连接 — 前端未连接或连接失败');
    } else {
      conclusions.push(`✅ 当前 ${monitor.totalConnections} 个客户端连接`);

      // 检查房间订阅
      if (gateway.roomCount === 0) {
        conclusions.push('⚠️ 无房间订阅 — 客户端未订阅任何项目/设备/标签房间');
      } else {
        conclusions.push(`✅ 已订阅 ${gateway.roomCount} 个房间`);
      }
    }

    // 检查离线缓存
    if (metrics.offlineCacheHits > 0) {
      conclusions.push(`✅ 离线缓存命中 ${metrics.offlineCacheHits} 次（有客户端曾离线）`);
    }

    // 检查房间命中率（是否有空房间推送）
    const roomStats = metrics.roomHitStats || {};
    const emptyRooms = Object.entries(roomStats).filter(
      ([, stat]: [string, any]) => stat.totalRecipients === 0,
    );
    if (emptyRooms.length > 0) {
      conclusions.push(
        `⚠️ ${emptyRooms.length} 个房间推送但无接收者: ${emptyRooms
          .map(([r]: [string, any]) => r)
          .slice(0, 5)
          .join(', ')}`,
      );
    }

    return conclusions;
  }
}
