// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OfflineMessageCacheService } from './offline-message-cache.service';
import { WebSocketMetricsService } from './websocket-metrics.service';
import { ConnectionLimiterService } from './connection-limiter.service';
import { ConnectionMonitorService } from './connection-monitor.service';

interface AuthenticatedSocket extends Socket {
  user?: { sub: string; username: string; role: string };
  connectedAt?: number;
}

/**
 * WebSocket CORS 白名单：与 HTTP 层（main.ts enableCors）保持一致的环境变量来源，
 * 并强制包含 Tauri 桌面端源（页面源 https://tauri.localhost 与后端跨源，
 * 缺失时 socket.io 握手被拒，表现为设备监控实时数据不更新）。
 */
function buildWsCorsOrigins(): string[] {
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const TAURI_DESKTOP_ORIGINS = ['https://tauri.localhost', 'tauri://localhost'];
  for (const tauriOrigin of TAURI_DESKTOP_ORIGINS) {
    if (!origins.includes(tauriOrigin)) {
      origins.push(tauriOrigin);
    }
  }
  return origins;
}

@Injectable()
@NestWebSocketGateway({
  cors: { origin: buildWsCorsOrigins(), credentials: true },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class ScadaWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScadaWebSocketGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  /** 批量更新缓冲区：projectId → 待推送标签数据列表 */
  private batchUpdateBuffer = new Map<
    string,
    Array<{ tagId: string; tagName: string; value: number; quality: string; timestamp: string }>
  >();
  /** 批量刷新定时器（合并 200ms 窗口内的多次推送） */
  private batchFlushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly batchFlushIntervalMs = 200;
  /** 空闲连接清理定时器（每 60 秒检查一次） */
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private readonly idleCheckIntervalMs = 60000;

  constructor(
    private jwtService: JwtService,
    private readonly offlineCache: OfflineMessageCacheService,
    private readonly metricsService: WebSocketMetricsService,
    private readonly connectionLimiter: ConnectionLimiterService,
    private readonly connectionMonitor: ConnectionMonitorService,
  ) {
    // 空闲连接清理定时器：每 60 秒检查一次，断开超时连接
    this.idleCheckTimer = setInterval(() => {
      try {
        const idleSocketIds = this.connectionLimiter.checkIdleConnections();
        for (const socketId of idleSocketIds) {
          this.connectedClients.get(socketId)?.disconnect(true);
        }
        if (idleSocketIds.length > 0) {
          this.logger.log(`Idle cleanup: disconnected ${idleSocketIds.length} idle connections`);
        }
      } catch (err) {
        this.logger.error(`Idle check timer error: ${(err as Error).message}`);
      }
    }, this.idleCheckIntervalMs);
  }

  handleConnection(client: AuthenticatedSocket): void {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          client.user = { sub: payload.sub, username: payload.username, role: payload.role };
          client.connectedAt = Date.now();

          // 加入用户专属房间 (用于私人通知)
          client.join(`user:${payload.sub}`);
        } catch {
          // 未认证用户可连接但功能受限
          this.logger.warn(`Unauthenticated WS connection: ${client.id}`);
        }
      }

      // 连接限制检查（JWT 认证后、加入 connectedClients 前）
      const ip = client.handshake.address || client.conn.remoteAddress || 'unknown';
      const userId = client.user?.sub;
      const username = client.user?.username;
      const checkResult = this.connectionLimiter.registerConnection(client.id, userId, ip);
      if (!checkResult.allowed) {
        this.logger.warn(`WS connection rejected: ${client.id} (reason: ${checkResult.reason})`);
        client.emit('connection:error', { reason: checkResult.reason });
        client.disconnect(true);
        return;
      }

      // 提取业务来源信息（用于监控页区分连接来自哪个页面/模块）
      const handshakeAuth = (client.handshake.auth || {}) as {
        source?: string;
        clientUrl?: string;
      };
      const headers = client.handshake.headers || {};
      const source = handshakeAuth.source || '';
      const url = handshakeAuth.clientUrl || headers.referer || headers.origin || '';
      const userAgent = (headers['user-agent'] as string) || '';

      // 注册连接监控
      this.connectionMonitor.registerConnection(
        client.id,
        userId,
        username,
        ip,
        source,
        url,
        userAgent,
      );

      this.connectedClients.set(client.id, client);

      this.logger.log(
        `WS client connected: ${client.id}` +
          (client.user ? ` (user: ${client.user.username})` : ' (anonymous)') +
          ` [total: ${this.connectedClients.size}]`,
      );

      client.emit('connection', {
        message: 'WebSocket connected',
        authenticated: !!client.user,
        timestamp: new Date().toISOString(),
      });

      // 离线消息补发：检查并补发客户端离线期间的缓存消息
      this.resendPendingMessages(client);
    } catch (error) {
      this.logger.error(`WS connection error: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id);
    // 注销连接限制记录
    this.connectionLimiter.unregisterConnection(client.id);
    // 注销连接监控记录
    this.connectionMonitor.unregisterConnection(client.id);
    // 注意：不清除离线消息缓存，保留以等待客户端重连后补发
    this.logger.log(`WS client disconnected: ${client.id} [total: ${this.connectedClients.size}]`);
  }

  /**
   * 补发客户端离线期间的缓存消息
   * 使用 userId 作为客户端标识（稳定标识，不随 socket.id 变化）
   */
  private resendPendingMessages(client: AuthenticatedSocket): void {
    if (!client.user) {
      return;
    }

    const clientId = client.user.sub;
    this.offlineCache.registerClient(clientId);

    const pendingMessages = this.offlineCache.getPendingMessages(clientId);
    if (pendingMessages.length === 0) {
      return;
    }

    this.logger.log(
      `Resending ${pendingMessages.length} pending messages to client ${client.id} (user: ${client.user.username})`,
    );

    for (const message of pendingMessages) {
      client.emit(message.event, message.data);
    }

    // 补发完成后清除缓存
    this.offlineCache.clearMessages(clientId);
  }

  /**
   * 获取当前在线的已认证用户 ID 集合
   * 用于离线消息缓存判断哪些客户端处于离线状态
   */
  getOnlineUserIds(): Set<string> {
    const onlineIds = new Set<string>();
    this.connectedClients.forEach((client) => {
      if (client.user) {
        onlineIds.add(client.user.sub);
      }
    });
    return onlineIds;
  }

  /**
   * 为离线客户端缓存消息
   * @param event 事件名称
   * @param data 消息数据
   */
  private cacheForOfflineClients(event: string, data: unknown): void {
    const onlineIds = this.getOnlineUserIds();
    const offlineIds = this.offlineCache.getOfflineClientIds(onlineIds);

    for (const clientId of offlineIds) {
      this.offlineCache.cacheMessage(clientId, event, data);
    }
  }

  // ── 心跳 ──
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    this.connectionLimiter.recordActivity(client.id);
    this.connectionMonitor.recordMessage(client.id);
    client.emit('pong', {
      message: 'Pong',
      timestamp: new Date().toISOString(),
      connections: this.connectedClients.size,
    });
  }

  // ── 房间管理 ──

  @SubscribeMessage('subscribe:project')
  handleSubscribeProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `project:${data.projectId}`;
    client.join(room);
    // 更新连接监控的项目房间信息
    this.connectionMonitor.updateProjectRooms(client.id, [room]);
    this.connectionLimiter.recordActivity(client.id);
    this.connectionMonitor.recordMessage(client.id);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    client.emit('room:joined', { room, projectId: data.projectId });
  }

  @SubscribeMessage('unsubscribe:project')
  handleUnsubscribeProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `project:${data.projectId}`;
    client.leave(room);
    this.connectionLimiter.recordActivity(client.id);
    this.connectionMonitor.recordMessage(client.id);
    client.emit('room:left', { room });
  }

  @SubscribeMessage('subscribe:device')
  handleSubscribeDevice(
    @MessageBody() data: { deviceId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `device:${data.deviceId}`;
    client.join(room);
    this.connectionLimiter.recordActivity(client.id);
    this.connectionMonitor.recordMessage(client.id);
    this.logger.debug(`Client ${client.id} joined device room: ${data.deviceId}`);
  }

  @SubscribeMessage('subscribe:tag')
  handleSubscribeTag(
    @MessageBody() data: { tagIds: string[] },
    @ConnectedSocket() client: Socket,
  ): void {
    for (const tagId of data.tagIds) {
      client.join(`tag:${tagId}`);
    }
    this.connectionLimiter.recordActivity(client.id);
    this.connectionMonitor.recordMessage(client.id);
  }

  // ── 数据广播 ──

  /**
   * 记录广播指标（监控消息的"去"过程）
   * @param event WebSocket 事件名
   * @param room 目标房间名
   */
  private recordBroadcastMetric(event: string, room: string): void {
    try {
      const recipientCount = this.getRoomSize(room);
      this.metricsService.recordBroadcast(event, room, recipientCount);
    } catch (err) {
      // 指标记录失败不影响广播
      this.metricsService.recordBroadcastError(event);
    }
  }

  /** 广播标签值变更到项目房间 */
  broadcastTagUpdate(
    projectId: string,
    tagData: {
      tagId: string;
      tagName: string;
      value: number | null;
      quality: string;
      timestamp: string;
    },
  ): void {
    const projectRoom = `project:${projectId}`;
    const tagRoom = `tag:${tagData.tagId}`;
    this.server.to(projectRoom).emit('data:update', {
      event: 'tagValueChanged',
      ...tagData,
    });
    // 同时推送到标签专属房间
    this.server.to(tagRoom).emit('data:update', {
      event: 'tagValueChanged',
      ...tagData,
    });
    // 记录广播指标
    this.recordBroadcastMetric('data:update', projectRoom);
    this.recordBroadcastMetric('data:update', tagRoom);
  }

  /** 批量广播标签值（缓冲合并：200ms 窗口内的多次调用合并为一次推送，降低频率） */
  broadcastBatchUpdate(
    projectId: string,
    tags: Array<{
      tagId: string;
      tagName: string;
      value: number | null;
      quality: string;
      timestamp: string;
    }>,
  ): void {
    // 缓冲到 batchUpdateBuffer，由定时器统一刷新
    const existing = this.batchUpdateBuffer.get(projectId) || [];
    existing.push(...tags);
    this.batchUpdateBuffer.set(projectId, existing);

    // 启动定时刷新定时器（如未启动）
    if (!this.batchFlushTimer) {
      this.batchFlushTimer = setInterval(() => this.flushBatchUpdates(), this.batchFlushIntervalMs);
    }
  }

  /**
   * 刷新批量更新缓冲区
   * 将缓冲的标签数据一次性推送到对应项目房间，并在无数据时停止定时器
   */
  private flushBatchUpdates(): void {
    if (this.batchUpdateBuffer.size === 0) {
      // 无待刷新数据，停止定时器（下次调用 broadcastBatchUpdate 时会重新启动）
      if (this.batchFlushTimer) {
        clearInterval(this.batchFlushTimer);
        this.batchFlushTimer = null;
      }
      return;
    }

    const now = new Date().toISOString();
    for (const [projectId, tags] of this.batchUpdateBuffer.entries()) {
      this.server.to(`project:${projectId}`).emit('data:batch', {
        event: 'tagValuesChanged',
        data: tags,
        timestamp: now,
      });
      // 记录广播指标
      this.recordBroadcastMetric('data:batch', `project:${projectId}`);
    }

    this.batchUpdateBuffer.clear();
  }

  // ── 报警广播 ──

  /** 广播报警触发 */
  broadcastAlarmTrigger(
    projectId: string,
    alarmData: {
      alarmId: string;
      ruleName: string;
      tagName: string;
      level: string;
      value: number;
      message: string;
      timestamp: string;
    },
  ): void {
    const projectRoom = `project:${projectId}`;
    this.server.to(projectRoom).emit('alarm:trigger', {
      event: 'alarmTriggered',
      ...alarmData,
    });
    // 记录广播指标
    this.recordBroadcastMetric('alarm:trigger', projectRoom);
  }

  /** 广播报警确认 */
  broadcastAlarmAcknowledged(
    projectId: string,
    data: {
      alarmId: string;
      acknowledgedBy: string;
      timestamp: string;
    },
  ): void {
    const payload = {
      event: 'alarmAcknowledged',
      ...data,
    };
    this.server.to(`project:${projectId}`).emit('alarm:acknowledged', payload);
    // 为离线客户端缓存消息
    this.cacheForOfflineClients('alarm:acknowledged', payload);
  }

  /** 广播报警清除 */
  broadcastAlarmCleared(
    projectId: string,
    data: {
      alarmId: string;
      clearedBy: string;
      timestamp: string;
    },
  ): void {
    const payload = {
      event: 'alarmCleared',
      ...data,
    };
    this.server.to(`project:${projectId}`).emit('alarm:cleared', payload);
    // 为离线客户端缓存消息
    this.cacheForOfflineClients('alarm:cleared', payload);
  }

  /** 广播报警自动恢复 */
  broadcastAlarmRecovered(
    projectId: string,
    data: {
      alarmId: string;
      recoveredValue: string;
      ruleName?: string;
      timestamp: string;
    },
  ): void {
    const payload = {
      event: 'alarmRecovered',
      ...data,
    };
    this.server.to(`project:${projectId}`).emit('alarm:recovered', payload);
    // 为离线客户端缓存消息
    this.cacheForOfflineClients('alarm:recovered', payload);
  }

  // ── 设备状态广播 ──

  /** 广播设备状态变更 */
  broadcastDeviceStatus(
    projectId: string,
    deviceId: string,
    status: {
      fromStatus: string;
      toStatus: string;
      errorMessage?: string;
      timestamp: string;
    },
  ): void {
    const projectRoom = `project:${projectId}`;
    const deviceRoom = `device:${deviceId}`;
    this.server.to(projectRoom).emit('device:statusChange', {
      event: 'deviceStatusChanged',
      deviceId,
      ...status,
    });
    this.server.to(deviceRoom).emit('device:statusChange', {
      event: 'deviceStatusChanged',
      deviceId,
      ...status,
    });
    // 记录广播指标
    this.recordBroadcastMetric('device:statusChange', projectRoom);
    this.recordBroadcastMetric('device:statusChange', deviceRoom);
  }

  // ── 系统广播 ──

  /** 全系统广播（仅管理员房间） */
  broadcastSystem(message: string, data?: unknown): void {
    const payload = {
      event: 'systemBroadcast',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('system:broadcast', payload);
    // 为离线客户端缓存系统广播消息
    this.cacheForOfflineClients('system:broadcast', payload);
  }

  /** 给指定用户发送通知 */
  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /** 管理员强制断开连接 */
  forceDisconnect(socketId: string): boolean {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.disconnect(true);
      return true;
    }
    return false;
  }

  // ── 统计 ──

  getConnectionCount(): number {
    return this.connectedClients.size;
  }

  getRoomSize(room: string): number {
    const adapter = this.server.sockets.adapter;
    return adapter.rooms.get(room)?.size || 0;
  }

  getMetrics(): {
    totalConnections: number;
    roomCount: number;
    rooms: Array<{ name: string; size: number }>;
  } {
    const adapter = this.server.sockets.adapter;
    const rooms: Array<{ name: string; size: number }> = [];
    adapter.rooms.forEach((sockets, roomName) => {
      // 排除 socket.id == roomName 的默认房间
      if (roomName.length < 20) {
        rooms.push({ name: roomName, size: sockets.size });
      }
    });

    return {
      totalConnections: this.connectedClients.size,
      roomCount: rooms.length,
      rooms: rooms.sort((a, b) => b.size - a.size).slice(0, 50),
    };
  }
}
