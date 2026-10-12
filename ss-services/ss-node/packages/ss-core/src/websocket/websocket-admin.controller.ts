// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Delete, Post, Put, Param, Body, Logger } from '@nestjs/common';
import { ScadaWebSocketGateway } from './websocket.gateway';
import { ConnectionMonitorService } from './connection-monitor.service';
import { ConnectionLimiterService, ConnectionLimiterConfig } from './connection-limiter.service';
import { WebSocketMetricsService } from './websocket-metrics.service';

/**
 * WebSocket 管理员 REST API
 *
 * 提供连接管理、配置管理和综合监控能力：
 * - GET    /api/v1/ws/admin/overview                  — 综合概览（metrics + monitor + limiter + gateway）
 * - GET    /api/v1/ws/admin/connections               — 所有连接详情列表
 * - DELETE /api/v1/ws/admin/connections/:socketId     — 强制断开指定连接
 * - POST   /api/v1/ws/admin/connections/cleanup-idle  — 清理空闲连接
 * - GET    /api/v1/ws/admin/config                    — 获取连接限制配置
 * - PUT    /api/v1/ws/admin/config                    — 更新连接限制配置
 *
 * 注意：所有方法返回原始数据，由全局 TransformInterceptor 统一包装为
 * { code, data, message, timestamp } 信封。切勿在此手动预包装（缺少 timestamp 字段
 * 会被拦截器二次包装，导致前端 res.data 多解一层后取不到真实 payload）。
 */
@Controller('ws/admin')
export class WebSocketAdminController {
  private readonly logger = new Logger(WebSocketAdminController.name);

  constructor(
    private readonly wsGateway: ScadaWebSocketGateway,
    private readonly connectionMonitor: ConnectionMonitorService,
    private readonly connectionLimiter: ConnectionLimiterService,
    private readonly metricsService: WebSocketMetricsService,
  ) {}

  /** 综合概览：聚合 metrics / monitor / limiter / gateway 四类数据 */
  @Get('overview')
  getOverview() {
    return {
      metrics: this.metricsService.getSnapshot(),
      monitor: this.connectionMonitor.getStats(),
      limiter: this.connectionLimiter.getStats(),
      gateway: this.wsGateway.getMetrics(),
    };
  }

  /** 所有连接详情列表 */
  @Get('connections')
  getConnections() {
    const snapshots = this.connectionMonitor.getAllSnapshots();
    return {
      total: snapshots.length,
      connections: snapshots,
    };
  }

  /** 强制断开指定连接 */
  @Delete('connections/:socketId')
  forceDisconnect(@Param('socketId') socketId: string) {
    const success = this.wsGateway.forceDisconnect(socketId);
    this.logger.log(`Admin force disconnect: ${socketId} → ${success ? 'success' : 'not found'}`);
    return { success, socketId };
  }

  /** 清理空闲连接 */
  @Post('connections/cleanup-idle')
  cleanupIdle() {
    const idleSocketIds = this.connectionLimiter.checkIdleConnections();
    let cleaned = 0;
    for (const socketId of idleSocketIds) {
      if (this.wsGateway.forceDisconnect(socketId)) {
        cleaned++;
      }
    }
    this.logger.log(`Admin cleanup idle connections: ${cleaned}/${idleSocketIds.length}`);
    return { cleaned, total: idleSocketIds.length };
  }

  /** 获取连接限制配置 */
  @Get('config')
  getConfig() {
    return this.connectionLimiter.getConfig();
  }

  /** 更新连接限制配置 */
  @Put('config')
  updateConfig(@Body() body: Partial<ConnectionLimiterConfig>) {
    this.connectionLimiter.updateConfig(body);
    return this.connectionLimiter.getConfig();
  }
}
