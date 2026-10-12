// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';

export interface ConnectionLimiterConfig {
  /** 单用户最大连接数，默认 5 */
  maxConnectionsPerUser: number;
  /** 全局最大连接数，默认 1000 */
  maxGlobalConnections: number;
  /** 单IP最大连接数，默认 10 */
  maxConnectionsPerIp: number;
  /** 空闲超时分钟数（无业务消息），默认 30 */
  idleTimeoutMinutes: number;
}

export const DEFAULT_CONNECTION_LIMITER_CONFIG: ConnectionLimiterConfig = {
  maxConnectionsPerUser: 5,
  maxGlobalConnections: 1000,
  maxConnectionsPerIp: 10,
  idleTimeoutMinutes: 30,
};

interface ConnectionRecord {
  socketId: string;
  userId?: string;
  ip: string;
  connectedAt: number;
  lastActivityAt: number;
}

@Injectable()
export class ConnectionLimiterService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionLimiterService.name);

  private readonly connections = new Map<string, ConnectionRecord>();
  private readonly userConnections = new Map<string, Set<string>>();
  private readonly ipConnections = new Map<string, Set<string>>();

  private config: ConnectionLimiterConfig;

  constructor(
    @Inject(I18nService)
    private readonly i18n: I18nService,
  ) {
    this.config = { ...DEFAULT_CONNECTION_LIMITER_CONFIG };
  }

  onModuleInit(): void {
    this.logger.log(
      `ConnectionLimiterService initialized (user:${this.config.maxConnectionsPerUser}, global:${this.config.maxGlobalConnections}, ip:${this.config.maxConnectionsPerIp}, idle:${this.config.idleTimeoutMinutes}min)`,
    );
  }

  updateConfig(partial: Partial<ConnectionLimiterConfig>): void {
    this.config = { ...this.config, ...partial };
    this.logger.log(`ConnectionLimiter config updated: ${JSON.stringify(this.config)}`);
  }

  getConfig(): ConnectionLimiterConfig {
    return { ...this.config };
  }

  /** 注册新连接，返回是否允许 */
  registerConnection(
    socketId: string,
    userId: string | undefined,
    ip: string,
  ): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // 全局连接数检查
    if (this.connections.size >= this.config.maxGlobalConnections) {
      const reason = this.i18n.tSync('websocket.connection.global_limit_exceeded', {
        current: String(this.connections.size),
        max: String(this.config.maxGlobalConnections),
      });
      this.logger.warn(
        `Global connection limit reached: ${this.connections.size}/${this.config.maxGlobalConnections}`,
      );
      return { allowed: false, reason };
    }

    // IP 连接数检查
    const ipSet = this.ipConnections.get(ip);
    if (ipSet && ipSet.size >= this.config.maxConnectionsPerIp) {
      const reason = this.i18n.tSync('websocket.connection.ip_limit_exceeded', {
        ip,
        current: String(ipSet.size),
        max: String(this.config.maxConnectionsPerIp),
      });
      this.logger.warn(
        `IP connection limit reached: ${ip} (${ipSet.size}/${this.config.maxConnectionsPerIp})`,
      );
      return { allowed: false, reason };
    }

    // 用户连接数检查
    if (userId) {
      const userSet = this.userConnections.get(userId);
      if (userSet && userSet.size >= this.config.maxConnectionsPerUser) {
        const reason = this.i18n.tSync('websocket.connection.user_limit_exceeded', {
          username: userId,
          current: String(userSet.size),
          max: String(this.config.maxConnectionsPerUser),
        });
        this.logger.warn(
          `User connection limit reached: ${userId} (${userSet.size}/${this.config.maxConnectionsPerUser})`,
        );
        return { allowed: false, reason };
      }
    }

    // 记录连接
    const record: ConnectionRecord = {
      socketId,
      userId,
      ip,
      connectedAt: now,
      lastActivityAt: now,
    };
    this.connections.set(socketId, record);

    // 更新 IP 索引
    if (!this.ipConnections.has(ip)) {
      this.ipConnections.set(ip, new Set());
    }
    this.ipConnections.get(ip)!.add(socketId);

    // 更新用户索引
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(socketId);
    }

    return { allowed: true };
  }

  /** 注销连接 */
  unregisterConnection(socketId: string): void {
    const record = this.connections.get(socketId);
    if (!record) return;

    this.connections.delete(socketId);

    // 清理 IP 索引
    const ipSet = this.ipConnections.get(record.ip);
    if (ipSet) {
      ipSet.delete(socketId);
      if (ipSet.size === 0) {
        this.ipConnections.delete(record.ip);
      }
    }

    // 清理用户索引
    if (record.userId) {
      const userSet = this.userConnections.get(record.userId);
      if (userSet) {
        userSet.delete(socketId);
        if (userSet.size === 0) {
          this.userConnections.delete(record.userId);
        }
      }
    }
  }

  /** 记录业务消息活动 */
  recordActivity(socketId: string): void {
    const record = this.connections.get(socketId);
    if (record) {
      record.lastActivityAt = Date.now();
    }
  }

  /** 检查空闲超时连接，返回需要断开的 socketId 列表 */
  checkIdleConnections(): string[] {
    const now = Date.now();
    const idleTimeoutMs = this.config.idleTimeoutMinutes * 60 * 1000;
    const idleSocketIds: string[] = [];

    this.connections.forEach((record, socketId) => {
      const idleDuration = now - record.lastActivityAt;
      if (idleDuration > idleTimeoutMs) {
        idleSocketIds.push(socketId);
        this.logger.log(
          `Idle connection detected: ${socketId} (idle ${Math.round(idleDuration / 60000)}min)`,
        );
      }
    });

    return idleSocketIds;
  }

  /** 获取连接统计 */
  getStats(): {
    totalConnections: number;
    userConnections: number;
    uniqueUsers: number;
    uniqueIps: number;
  } {
    let userConnectionCount = 0;
    this.userConnections.forEach((set) => {
      userConnectionCount += set.size;
    });

    return {
      totalConnections: this.connections.size,
      userConnections: userConnectionCount,
      uniqueUsers: this.userConnections.size,
      uniqueIps: this.ipConnections.size,
    };
  }

  /** 获取用户连接数 */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /** 获取IP连接数 */
  getIpConnectionCount(ip: string): number {
    return this.ipConnections.get(ip)?.size || 0;
  }

  /** 获取连接记录 */
  getConnection(socketId: string): ConnectionRecord | undefined {
    return this.connections.get(socketId);
  }

  /** 获取所有连接 */
  getAllConnections(): ConnectionRecord[] {
    return Array.from(this.connections.values());
  }

  /** 获取连接IP */
  getConnectionIp(socketId: string): string | undefined {
    return this.connections.get(socketId)?.ip;
  }
}
