// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

/** WebSocket 监控概览数据 */
export interface WsMonitorOverview {
  metrics: {
    broadcastCounts: Record<string, number>;
    broadcastErrors: Record<string, number>;
    roomHitStats: Record<string, { broadcasts: number; totalRecipients: number }>;
    offlineCacheHits: number;
    offlineCacheMisses: number;
    bridgeLatencyMs: { count: number; totalMs: number; avgMs: number; maxMs: number };
    totalBroadcasts: number;
    totalRecipients: number;
    startedAt: number;
    snapshotAt: number;
  };
  monitor: {
    totalConnections: number;
    connectionsByProject: Record<string, number>;
    connectionsByUser: Record<string, number>;
    messageRates: Array<{ socketId: string; messagesPerSecond: number; totalMessages: number; windowSeconds: number }>;
    durationStats: {
      avgMs: number;
      maxMs: number;
      distribution: { under1Min: number; under10Min: number; under1Hour: number; under1Day: number; over1Day: number };
    };
    abnormalConnections: string[];
  };
  limiter: {
    totalConnections: number;
    userConnections: number;
    uniqueUsers: number;
    uniqueIps: number;
  };
  gateway: {
    totalConnections: number;
    roomCount: number;
    rooms: Array<{ name: string; size: number }>;
  };
}

/** 连接快照 */
export interface WsConnectionSnapshot {
  socketId: string;
  userId?: string;
  username?: string;
  ip: string;
  /** 业务来源：建立连接时所在页面路径 */
  source?: string;
  /** 客户端完整 URL */
  url?: string;
  /** 客户端 User-Agent */
  userAgent?: string;
  connectedAt: number;
  projectRooms: string[];
  messageCount: number;
  lastActivityAt: number;
}

/** 连接限制配置 */
export interface WsConnectionConfig {
  maxConnectionsPerUser: number;
  maxGlobalConnections: number;
  maxConnectionsPerIp: number;
  idleTimeoutMinutes: number;
}

/** 诊断信息 */
export interface WsDiagnosticInfo {
  conclusions?: string[];
  suggestions?: string[];
  details?: Record<string, unknown>;
}

export const websocketApi = {
  /** 获取综合概览 */
  getOverview(): Promise<ApiResponse<WsMonitorOverview>> {
    return client.get('/ws/admin/overview').then((res) => res.data);
  },

  /** 获取所有连接详情 */
  getConnections(): Promise<ApiResponse<{ total: number; connections: WsConnectionSnapshot[] }>> {
    return client.get('/ws/admin/connections').then((res) => res.data);
  },

  /** 强制断开指定连接 */
  forceDisconnect(socketId: string): Promise<ApiResponse<void>> {
    return client.delete(`/ws/admin/connections/${socketId}`).then((res) => res.data);
  },

  /** 清理空闲连接 */
  cleanupIdle(): Promise<ApiResponse<{ cleaned: number; total: number }>> {
    return client.post('/ws/admin/connections/cleanup-idle').then((res) => res.data);
  },

  /** 获取连接限制配置 */
  getConfig(): Promise<ApiResponse<WsConnectionConfig>> {
    return client.get('/ws/admin/config').then((res) => res.data);
  },

  /** 更新连接限制配置 */
  updateConfig(config: Partial<WsConnectionConfig>): Promise<ApiResponse<WsConnectionConfig>> {
    return client.put('/ws/admin/config', config).then((res) => res.data);
  },

  /** 获取诊断信息 */
  getDiagnostic(): Promise<ApiResponse<WsDiagnosticInfo>> {
    return client.get('/ws/metrics/diagnostic').then((res) => res.data);
  },
};
