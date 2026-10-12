// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';
import { EventBusService } from '../event-bus/event-bus.service';

export interface ConnectionSnapshot {
  socketId: string;
  userId?: string;
  username?: string;
  ip: string;
  /** 业务来源：客户端建立连接时所在页面路径（如 /system/device-monitor） */
  source?: string;
  /** 客户端完整 URL（来源于握手 auth.clientUrl 或 Referer 头） */
  url?: string;
  /** 客户端 User-Agent */
  userAgent?: string;
  connectedAt: number;
  projectRooms: string[];
  messageCount: number;
  lastActivityAt: number;
}

export interface MessageRateStats {
  socketId: string;
  messagesPerSecond: number;
  totalMessages: number;
  windowSeconds: number;
}

export interface DurationStats {
  avgMs: number;
  maxMs: number;
  distribution: {
    under1Min: number;
    under10Min: number;
    under1Hour: number;
    under1Day: number;
    over1Day: number;
  };
}

export interface MonitorStats {
  totalConnections: number;
  connectionsByProject: Record<string, number>;
  connectionsByUser: Record<string, number>;
  messageRates: MessageRateStats[];
  durationStats: DurationStats;
  abnormalConnections: string[];
}

interface MessageRecord {
  socketId: string;
  timestamp: number;
}

@Injectable()
export class ConnectionMonitorService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionMonitorService.name);

  /** 消息记录滑动窗口（用于速率计算） */
  private readonly messageWindow: MessageRecord[] = [];
  /** 速率计算窗口大小（毫秒），默认 10 秒 */
  private readonly rateWindowMs = 10000;
  /** 异常消息速率阈值（msg/sec），默认 100 */
  private abnormalRateThreshold = 100;
  /** 异常连接时长阈值（毫秒），超过 24 小时标记为异常，默认 24h */
  private abnormalDurationThreshold = 24 * 60 * 60 * 1000;

  /** 连接信息快照 */
  private readonly connectionSnapshots = new Map<string, ConnectionSnapshot>();

  /** 周期检查定时器 */
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(I18nService)
    private readonly i18n: I18nService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.logger.log('ConnectionMonitorService initialized');

    // 每 30 秒检查一次异常连接
    this.checkInterval = setInterval(() => {
      this.detectAbnormalConnections();
    }, 30000);
  }

  onModuleDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /** 注册连接监控 */
  registerConnection(
    socketId: string,
    userId?: string,
    username?: string,
    ip?: string,
    source?: string,
    url?: string,
    userAgent?: string,
  ): void {
    this.connectionSnapshots.set(socketId, {
      socketId,
      userId,
      username,
      ip: ip || 'unknown',
      source,
      url,
      userAgent,
      connectedAt: Date.now(),
      projectRooms: [],
      messageCount: 0,
      lastActivityAt: Date.now(),
    });
  }

  /** 注销连接监控 */
  unregisterConnection(socketId: string): void {
    this.connectionSnapshots.delete(socketId);
  }

  /** 更新连接的项目房间 */
  updateProjectRooms(socketId: string, rooms: string[]): void {
    const snapshot = this.connectionSnapshots.get(socketId);
    if (snapshot) {
      snapshot.projectRooms = rooms;
    }
  }

  /** 记录消息 */
  recordMessage(socketId: string): void {
    const snapshot = this.connectionSnapshots.get(socketId);
    if (snapshot) {
      snapshot.messageCount++;
      snapshot.lastActivityAt = Date.now();
    }

    this.messageWindow.push({ socketId, timestamp: Date.now() });

    // 清理过期消息记录
    this.cleanMessageWindow();
  }

  /** 获取消息速率 */
  getMessageRates(): MessageRateStats[] {
    const now = Date.now();
    const windowStart = now - this.rateWindowMs;
    const recentMessages = this.messageWindow.filter((r) => r.timestamp >= windowStart);

    const socketMessages = new Map<string, number>();
    for (const record of recentMessages) {
      socketMessages.set(record.socketId, (socketMessages.get(record.socketId) || 0) + 1);
    }

    const rates: MessageRateStats[] = [];
    socketMessages.forEach((count, socketId) => {
      rates.push({
        socketId,
        messagesPerSecond: Math.round((count / (this.rateWindowMs / 1000)) * 100) / 100,
        totalMessages: count,
        windowSeconds: this.rateWindowMs / 1000,
      });
    });

    return rates.sort((a, b) => b.messagesPerSecond - a.messagesPerSecond);
  }

  /** 获取连接时长统计 */
  getDurationStats(): DurationStats {
    const now = Date.now();
    const durations: number[] = [];
    const distribution = {
      under1Min: 0,
      under10Min: 0,
      under1Hour: 0,
      under1Day: 0,
      over1Day: 0,
    };

    this.connectionSnapshots.forEach((snapshot) => {
      const duration = now - snapshot.connectedAt;
      durations.push(duration);

      if (duration < 60000) distribution.under1Min++;
      else if (duration < 600000) distribution.under10Min++;
      else if (duration < 3600000) distribution.under1Hour++;
      else if (duration < 86400000) distribution.under1Day++;
      else distribution.over1Day++;
    });

    const avgMs =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    const maxMs = durations.length > 0 ? Math.max(...durations) : 0;

    return { avgMs, maxMs, distribution };
  }

  /** 检测异常连接 */
  detectAbnormalConnections(): string[] {
    const abnormal: string[] = [];
    const now = Date.now();

    // 检测高消息速率
    const rates = this.getMessageRates();
    for (const rate of rates) {
      if (rate.messagesPerSecond > this.abnormalRateThreshold) {
        abnormal.push(rate.socketId);
        this.logger.warn(
          `Abnormal message rate: ${rate.socketId} (${rate.messagesPerSecond} msg/s)`,
        );
      }
    }

    // 检测超长连接
    this.connectionSnapshots.forEach((snapshot, socketId) => {
      if (now - snapshot.connectedAt > this.abnormalDurationThreshold) {
        if (!abnormal.includes(socketId)) {
          abnormal.push(socketId);
        }
        this.logger.warn(
          `Abnormal connection duration: ${socketId} (${Math.round((now - snapshot.connectedAt) / 3600000)}h)`,
        );
      }

      // 检测长时间无活动
      const idleDuration = now - snapshot.lastActivityAt;
      if (idleDuration > this.abnormalDurationThreshold) {
        if (!abnormal.includes(socketId)) {
          abnormal.push(socketId);
        }
        this.logger.warn(
          `Abnormal idle duration: ${socketId} (${Math.round(idleDuration / 3600000)}h)`,
        );
      }
    });

    return abnormal;
  }

  /** 获取完整监控统计 */
  getStats(): MonitorStats {
    const connectionsByProject: Record<string, number> = {};
    const connectionsByUser: Record<string, number> = {};
    const _now = Date.now();

    this.connectionSnapshots.forEach((snapshot) => {
      // 按项目统计
      for (const room of snapshot.projectRooms) {
        if (room.startsWith('project:')) {
          const projectId = room.replace('project:', '');
          connectionsByProject[projectId] = (connectionsByProject[projectId] || 0) + 1;
        }
      }

      // 按用户统计
      if (snapshot.userId) {
        connectionsByUser[snapshot.userId] = (connectionsByUser[snapshot.userId] || 0) + 1;
      }
    });

    return {
      totalConnections: this.connectionSnapshots.size,
      connectionsByProject,
      connectionsByUser,
      messageRates: this.getMessageRates(),
      durationStats: this.getDurationStats(),
      abnormalConnections: this.detectAbnormalConnections(),
    };
  }

  /** 获取在线连接数（按项目） */
  getOnlineCountByProject(projectId: string): number {
    let count = 0;
    this.connectionSnapshots.forEach((snapshot) => {
      if (snapshot.projectRooms.includes(`project:${projectId}`)) {
        count++;
      }
    });
    return count;
  }

  /** 获取在线连接数（按用户） */
  getOnlineCountByUser(userId: string): number {
    let count = 0;
    this.connectionSnapshots.forEach((snapshot) => {
      if (snapshot.userId === userId) {
        count++;
      }
    });
    return count;
  }

  /** 获取连接快照 */
  getConnectionSnapshot(socketId: string): ConnectionSnapshot | undefined {
    return this.connectionSnapshots.get(socketId);
  }

  /** 获取所有连接快照 */
  getAllSnapshots(): ConnectionSnapshot[] {
    return Array.from(this.connectionSnapshots.values());
  }

  /** 设置异常检测阈值 */
  setAbnormalThresholds(rateThreshold?: number, durationThresholdMs?: number): void {
    if (rateThreshold !== undefined) {
      this.abnormalRateThreshold = rateThreshold;
    }
    if (durationThresholdMs !== undefined) {
      this.abnormalDurationThreshold = durationThresholdMs;
    }
  }

  private cleanMessageWindow(): void {
    const cutoff = Date.now() - this.rateWindowMs * 2;
    while (this.messageWindow.length > 0 && this.messageWindow[0].timestamp < cutoff) {
      this.messageWindow.shift();
    }

    // 防止消息窗口无限增长
    if (this.messageWindow.length > 10000) {
      this.messageWindow.splice(0, this.messageWindow.length - 5000);
    }
  }
}
