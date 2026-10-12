// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * WebSocket 模块集成测试
 *
 * 测试 WebSocket 模块各服务之间的端到端协作流程。
 * 使用真实服务实例（不 mock 服务本身），只 mock 框架对象（Socket、Server、JwtService、I18nService、EventEmitter2）。
 *
 * 覆盖场景：
 * 1. 连接限制端到端流程
 * 2. 连接监控端到端流程
 * 3. 空闲连接检测
 * 4. 离线消息缓存与重连补发（OfflineMessageService）
 * 5. 离线缓存服务（OfflineMessageCacheService）
 * 6. Gateway + 服务集成流程
 * 7. 连接配置动态更新
 */

import { ScadaWebSocketGateway } from '../websocket/websocket.gateway';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ConnectionLimiterService } from '../websocket/connection-limiter.service';
import { ConnectionMonitorService } from '../websocket/connection-monitor.service';
import { OfflineMessageService } from '../websocket/offline-message.service';
import { OfflineMessageCacheService } from '../websocket/offline-message-cache.service';
import { WebSocketMetricsService } from '../websocket/websocket-metrics.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { I18nService } from '@ss-node/ss-i18n';

// ── Helper: 创建 mock Socket ──
function createMockSocket(id: string, ip: string = '127.0.0.1', token?: string): any {
  const socket: any = {
    id,
    handshake: {
      auth: token ? { token } : {},
      query: {},
      headers: {},
      time: '',
      address: ip,
      xdomain: false,
      secure: false,
      issued: 0,
      url: '',
    },
    conn: {
      remoteAddress: ip,
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return socket;
}

// ── Helper: 创建 mock Server ──
function createMockServer(): Partial<Server> {
  return {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    sockets: {
      adapter: {
        rooms: new Map(),
      },
    } as any,
  } as any;
}

// ── Helper: 创建 mock I18nService ──
function createMockI18n(): jest.Mocked<I18nService> {
  return {
    tSync: jest.fn().mockImplementation((key: string, args?: Record<string, unknown>) => {
      if (args) {
        return `${key} ${JSON.stringify(args)}`;
      }
      return key;
    }),
    t: jest.fn(),
    translate: jest.fn(),
    translateSync: jest.fn(),
    getLanguage: jest.fn(),
    getFallbackLanguage: jest.fn().mockReturnValue('zh-CN'),
    getSupportedLanguages: jest.fn().mockReturnValue(['zh-CN', 'en-US']),
  } as any;
}

// ── Helper: 创建 mock EventEmitter2 ──
function createMockEventEmitter(): any {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

describe('WebSocket Module Integration', () => {
  // 真实服务实例
  let connectionLimiter: ConnectionLimiterService;
  let connectionMonitor: ConnectionMonitorService;
  let offlineMessageService: OfflineMessageService;
  let offlineCacheService: OfflineMessageCacheService;
  let metricsService: WebSocketMetricsService;
  let gateway: ScadaWebSocketGateway;

  // Mock 框架对象
  let mockJwtService: jest.Mocked<JwtService>;
  let mockI18n: jest.Mocked<I18nService>;
  let mockEventBus: EventBusService;
  let mockEventEmitter: any;
  let mockServer: Partial<Server>;

  beforeEach(() => {
    // 静默所有日志
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // 创建 mock 依赖
    mockI18n = createMockI18n();
    mockEventEmitter = createMockEventEmitter();
    mockEventBus = new EventBusService(mockEventEmitter);
    mockJwtService = { verify: jest.fn() } as any;
    mockServer = createMockServer();

    // 创建真实服务实例
    connectionLimiter = new ConnectionLimiterService(mockI18n);
    connectionMonitor = new ConnectionMonitorService(mockI18n, mockEventBus);
    offlineMessageService = new OfflineMessageService(mockI18n);
    offlineCacheService = new OfflineMessageCacheService();
    metricsService = new WebSocketMetricsService();

    // 创建真实 Gateway 实例，注入真实服务
    gateway = new ScadaWebSocketGateway(
      mockJwtService,
      offlineCacheService,
      metricsService,
      connectionLimiter,
      connectionMonitor,
    );
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    // 清理 Gateway 的定时器（idleCheckTimer 在构造函数中创建）
    const gw = gateway as any;
    if (gw.idleCheckTimer) {
      clearInterval(gw.idleCheckTimer);
      gw.idleCheckTimer = null;
    }
    if (gw.batchFlushTimer) {
      clearInterval(gw.batchFlushTimer);
      gw.batchFlushTimer = null;
    }
    jest.restoreAllMocks();
  });

  // ==================== 1. 连接限制端到端流程 ====================
  describe('Connection Limiter End-to-End', () => {
    it('should allow 5 connections for a single user (default limit)', () => {
      for (let i = 0; i < 5; i++) {
        const result = connectionLimiter.registerConnection(`socket-${i}`, 'user-1', `10.0.0.${i}`);
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject the 6th connection for the same user', () => {
      for (let i = 0; i < 5; i++) {
        connectionLimiter.registerConnection(`socket-${i}`, 'user-1', `10.0.0.${i}`);
      }

      const result = connectionLimiter.registerConnection('socket-5', 'user-1', '10.0.0.5');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow connections for different users independently', () => {
      for (let i = 0; i < 5; i++) {
        connectionLimiter.registerConnection(`socket-a${i}`, 'user-a', `10.0.1.${i}`);
      }

      const result = connectionLimiter.registerConnection('socket-b0', 'user-b', '10.0.2.0');
      expect(result.allowed).toBe(true);
      expect(connectionLimiter.getUserConnectionCount('user-a')).toBe(5);
      expect(connectionLimiter.getUserConnectionCount('user-b')).toBe(1);
    });

    it('should reject 11th connection from the same IP (default limit 10)', () => {
      for (let i = 0; i < 10; i++) {
        connectionLimiter.registerConnection(`socket-ip${i}`, `user-${i}`, '10.0.0.1');
      }

      const result = connectionLimiter.registerConnection('socket-ip10', 'user-10', '10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should reject connection exceeding global limit', () => {
      connectionLimiter.updateConfig({ maxGlobalConnections: 3 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');
      connectionLimiter.registerConnection('s2', 'u2', '10.0.0.2');
      connectionLimiter.registerConnection('s3', 'u3', '10.0.0.3');

      const result = connectionLimiter.registerConnection('s4', 'u4', '10.0.0.4');
      expect(result.allowed).toBe(false);
    });

    it('should release quota after disconnect', () => {
      for (let i = 0; i < 5; i++) {
        connectionLimiter.registerConnection(`socket-${i}`, 'user-1', `10.0.0.${i}`);
      }
      expect(connectionLimiter.getUserConnectionCount('user-1')).toBe(5);

      connectionLimiter.unregisterConnection('socket-0');
      expect(connectionLimiter.getUserConnectionCount('user-1')).toBe(4);

      const result = connectionLimiter.registerConnection('socket-new', 'user-1', '10.0.0.99');
      expect(result.allowed).toBe(true);
    });

    it('should update lastActivityAt on recordActivity', () => {
      connectionLimiter.registerConnection('socket-1', 'user-1', '10.0.0.1');
      const record = connectionLimiter.getConnection('socket-1');
      expect(record).toBeDefined();

      const originalActivity = record!.lastActivityAt;
      // 模拟旧的活动时间
      (record as any).lastActivityAt = originalActivity - 60000;

      // 记录新活动
      connectionLimiter.recordActivity('socket-1');

      const updated = connectionLimiter.getConnection('socket-1');
      expect(updated!.lastActivityAt).toBe(Date.now());
    });
  });

  // ==================== 2. 连接监控端到端流程 ====================
  describe('Connection Monitor End-to-End', () => {
    it('should return correct connection count in getStats after registration', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      connectionMonitor.registerConnection('s2', 'u2', 'user2', '10.0.0.2');

      const stats = connectionMonitor.getStats();
      expect(stats.totalConnections).toBe(2);
    });

    it('should group connections by project', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      connectionMonitor.registerConnection('s2', 'u2', 'user2', '10.0.0.2');
      connectionMonitor.updateProjectRooms('s1', ['project:p1']);
      connectionMonitor.updateProjectRooms('s2', ['project:p1', 'project:p2']);

      const stats = connectionMonitor.getStats();
      expect(stats.connectionsByProject['p1']).toBe(2);
      expect(stats.connectionsByProject['p2']).toBe(1);
    });

    it('should group connections by user', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      connectionMonitor.registerConnection('s2', 'u1', 'user1', '10.0.0.2');

      const stats = connectionMonitor.getStats();
      expect(stats.connectionsByUser['u1']).toBe(2);
    });

    it('should update message count on recordMessage', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      const before = connectionMonitor.getConnectionSnapshot('s1')!.messageCount;

      connectionMonitor.recordMessage('s1');

      const after = connectionMonitor.getConnectionSnapshot('s1')!.messageCount;
      expect(after).toBe(before + 1);
    });

    it('should return message rates from getMessageRates', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      for (let i = 0; i < 5; i++) {
        connectionMonitor.recordMessage('s1');
      }

      const rates = connectionMonitor.getMessageRates();
      expect(rates.length).toBeGreaterThan(0);

      const s1Rate = rates.find((r) => r.socketId === 's1');
      expect(s1Rate).toBeDefined();
      expect(s1Rate!.totalMessages).toBe(5);
    });

    it('should remove connection from monitor on unregister', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      expect(connectionMonitor.getConnectionSnapshot('s1')).toBeDefined();

      connectionMonitor.unregisterConnection('s1');

      expect(connectionMonitor.getConnectionSnapshot('s1')).toBeUndefined();
    });

    it('should detect abnormal high message rate', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      // 设置异常速率阈值为 0（任何消息都算异常）
      connectionMonitor.setAbnormalThresholds(0, undefined);

      connectionMonitor.recordMessage('s1');

      const abnormal = connectionMonitor.detectAbnormalConnections();
      expect(abnormal).toContain('s1');
    });

    it('should return duration distribution stats', () => {
      connectionMonitor.registerConnection('s1', 'u1', 'user1', '10.0.0.1');
      connectionMonitor.registerConnection('s2', 'u2', 'user2', '10.0.0.2');

      const durationStats = connectionMonitor.getDurationStats();
      expect(durationStats.distribution.under1Min).toBeGreaterThanOrEqual(2);
      expect(durationStats.avgMs).toBeGreaterThanOrEqual(0);
      expect(durationStats.maxMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== 3. 空闲连接检测 ====================
  describe('Idle Connection Detection', () => {
    it('should detect idle connections after timeout exceeded', () => {
      connectionLimiter.updateConfig({ idleTimeoutMinutes: 1 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');

      // 模拟 2 分钟前的活动时间
      const record = connectionLimiter.getConnection('s1');
      (record as any).lastActivityAt = Date.now() - 2 * 60 * 1000;

      const idle = connectionLimiter.checkIdleConnections();
      expect(idle).toContain('s1');
    });

    it('should not detect recently registered connections as idle', () => {
      connectionLimiter.updateConfig({ idleTimeoutMinutes: 1 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');

      // 刚注册，lastActivityAt 是当前时间
      const idle = connectionLimiter.checkIdleConnections();
      expect(idle).not.toContain('s1');
    });

    it('should not detect connections with recent activity as idle', () => {
      connectionLimiter.updateConfig({ idleTimeoutMinutes: 1 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');

      // 设置旧的活动时间
      const record = connectionLimiter.getConnection('s1');
      (record as any).lastActivityAt = Date.now() - 2 * 60 * 1000;

      // 记录新活动，刷新 lastActivityAt
      connectionLimiter.recordActivity('s1');

      const idle = connectionLimiter.checkIdleConnections();
      expect(idle).not.toContain('s1');
    });
  });

  // ==================== 4. 离线消息缓存与重连补发 ====================
  describe('Offline Message Service End-to-End', () => {
    it('should cache a message and return it in getUnreadMessages', () => {
      const msg = offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', {
        alarmId: 'a1',
      });

      expect(msg).toBeDefined();
      expect(msg.confirmed).toBe(false);

      const unread = offlineMessageService.getUnreadMessages('u1');
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe(msg.id);
    });

    it('should return unread messages in replayMessages', () => {
      offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', { alarmId: 'a1' });
      offlineMessageService.cacheMessage('u1', 'device_status_change', 'p1', {
        deviceId: 'd1',
      });

      const replay = offlineMessageService.replayMessages('u1');
      expect(replay).toHaveLength(2);
    });

    it('should exclude confirmed messages from getUnreadMessages', () => {
      const msg = offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', {
        alarmId: 'a1',
      });

      offlineMessageService.confirmMessage(msg.id);

      const unread = offlineMessageService.getUnreadMessages('u1');
      expect(unread).toHaveLength(0);
    });

    it('should delete all user messages', () => {
      offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', { alarmId: 'a1' });
      offlineMessageService.cacheMessage('u1', 'alarm_cleared', 'p1', { alarmId: 'a2' });

      const count = offlineMessageService.deleteUserMessages('u1');
      expect(count).toBe(2);
      expect(offlineMessageService.getAllMessages('u1')).toHaveLength(0);
    });

    it('should clean up expired messages', () => {
      offlineMessageService.updateConfig({ expireAfterMs: 100 });
      offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', { alarmId: 'a1' });

      // 推进时间使消息过期
      jest.advanceTimersByTime(200);

      const cleaned = offlineMessageService.cleanupExpiredMessages();
      expect(cleaned).toBeGreaterThanOrEqual(1);
      expect(offlineMessageService.getAllMessages('u1')).toHaveLength(0);
    });

    it('should return correct stats', () => {
      offlineMessageService.cacheMessage('u1', 'alarm_trigger', 'p1', { alarmId: 'a1' });
      offlineMessageService.cacheMessage('u2', 'device_status_change', 'p2', {
        deviceId: 'd1',
      });

      const stats = offlineMessageService.getStats();
      expect(stats.totalMessages).toBe(2);
      expect(stats.activeUsers).toBe(2);
      expect(stats.unconfirmedMessages).toBe(2);
    });
  });

  // ==================== 5. 离线缓存服务（OfflineMessageCacheService） ====================
  describe('Offline Message Cache Service End-to-End', () => {
    it('should register a client', () => {
      offlineCacheService.registerClient('client-1');

      // 没有在线客户端时，client-1 应在离线列表中
      const offline = offlineCacheService.getOfflineClientIds(new Set());
      expect(offline).toContain('client-1');
    });

    it('should cache a message for a client', () => {
      offlineCacheService.cacheMessage('client-1', 'test:event', { data: 'hello' });

      const pending = offlineCacheService.getPendingMessages('client-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].event).toBe('test:event');
      expect(pending[0].data).toEqual({ data: 'hello' });
    });

    it('should return pending messages excluding expired', () => {
      offlineCacheService.cacheMessage('client-1', 'test:event', { data: 'hello' });

      // 推进时间超过 TTL（5 分钟）
      jest.advanceTimersByTime(6 * 60 * 1000);

      const pending = offlineCacheService.getPendingMessages('client-1');
      expect(pending).toHaveLength(0);
    });

    it('should clear messages for a client', () => {
      offlineCacheService.cacheMessage('client-1', 'test:event', { data: 'hello' });
      offlineCacheService.cacheMessage('client-1', 'test:event2', { data: 'world' });

      offlineCacheService.clearMessages('client-1');

      const pending = offlineCacheService.getPendingMessages('client-1');
      expect(pending).toHaveLength(0);
    });

    it('should return cache stats', () => {
      offlineCacheService.cacheMessage('client-1', 'test:event', { data: '1' });
      offlineCacheService.cacheMessage('client-1', 'test:event', { data: '2' });
      offlineCacheService.cacheMessage('client-2', 'test:event', { data: '3' });

      const stats = offlineCacheService.getCacheStats();
      expect(stats.totalClients).toBe(2);
      expect(stats.totalMessages).toBe(3);
    });

    it('should return offline client ids', () => {
      offlineCacheService.registerClient('client-1');
      offlineCacheService.registerClient('client-2');
      offlineCacheService.registerClient('client-3');

      // client-2 在线
      const offline = offlineCacheService.getOfflineClientIds(new Set(['client-2']));
      expect(offline).toContain('client-1');
      expect(offline).toContain('client-3');
      expect(offline).not.toContain('client-2');
    });
  });

  // ==================== 6. Gateway + 服务集成流程 ====================
  describe('Gateway + Services Integration', () => {
    it('should register connection in limiter and monitor on connect with valid JWT', () => {
      const payload = { sub: 'user-1', username: 'testuser', role: 'user' };
      mockJwtService.verify.mockReturnValue(payload);
      const socket = createMockSocket('socket-001', '10.0.0.1', 'valid-token');

      gateway.handleConnection(socket);

      // 验证连接限制器记录了连接
      expect(connectionLimiter.getConnection('socket-001')).toBeDefined();
      // 验证连接监控记录了连接
      const snapshot = connectionMonitor.getConnectionSnapshot('socket-001');
      expect(snapshot).toBeDefined();
      expect(snapshot!.userId).toBe('user-1');
      expect(snapshot!.username).toBe('testuser');
      // 验证 socket 被加入用户专属房间
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
      // 验证发出了连接成功事件
      expect(socket.emit).toHaveBeenCalledWith(
        'connection',
        expect.objectContaining({ authenticated: true }),
      );
    });

    it('should reject connection when limiter denies (user limit exceeded)', () => {
      // 用同一用户填满连接限制（默认 5）
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        username: 'u',
        role: 'user',
      });
      for (let i = 0; i < 5; i++) {
        const s = createMockSocket(`socket-${i}`, `10.0.0.${i}`, 'token');
        gateway.handleConnection(s);
      }

      // 第 6 个连接应被拒绝
      const socket = createMockSocket('socket-5', '10.0.0.5', 'token');
      gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith(
        'connection:error',
        expect.objectContaining({ reason: expect.any(String) }),
      );
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      // 验证被拒绝的连接未进入限制器
      expect(connectionLimiter.getConnection('socket-5')).toBeUndefined();
    });

    it('should update monitor project rooms on subscribe:project', () => {
      const socket = createMockSocket('socket-001', '10.0.0.1');
      gateway.handleConnection(socket);

      gateway.handleSubscribeProject({ projectId: 'p1' }, socket as Socket);

      const snapshot = connectionMonitor.getConnectionSnapshot('socket-001');
      expect(snapshot!.projectRooms).toContain('project:p1');
      // 验证 socket.join 被调用
      expect(socket.join).toHaveBeenCalledWith('project:p1');
      // 验证发出了 room:joined 事件
      expect(socket.emit).toHaveBeenCalledWith('room:joined', {
        room: 'project:p1',
        projectId: 'p1',
      });
    });

    it('should unregister from limiter and monitor on disconnect', () => {
      const socket = createMockSocket('socket-001', '10.0.0.1');
      gateway.handleConnection(socket);
      expect(connectionLimiter.getConnection('socket-001')).toBeDefined();
      expect(connectionMonitor.getConnectionSnapshot('socket-001')).toBeDefined();

      gateway.handleDisconnect(socket as Socket);

      expect(connectionLimiter.getConnection('socket-001')).toBeUndefined();
      expect(connectionMonitor.getConnectionSnapshot('socket-001')).toBeUndefined();
    });

    it('should replay pending offline messages on reconnect', () => {
      // 先缓存离线消息
      offlineCacheService.registerClient('user-1');
      offlineCacheService.cacheMessage('user-1', 'alarm:trigger', { alarmId: 'a1' });
      offlineCacheService.cacheMessage('user-1', 'alarm:cleared', { alarmId: 'a2' });

      // 模拟重连
      const payload = { sub: 'user-1', username: 'testuser', role: 'user' };
      mockJwtService.verify.mockReturnValue(payload);
      const socket = createMockSocket('socket-reconnect', '10.0.0.1', 'token');

      gateway.handleConnection(socket);

      // 验证补发了缓存的消息
      expect(socket.emit).toHaveBeenCalledWith('alarm:trigger', { alarmId: 'a1' });
      expect(socket.emit).toHaveBeenCalledWith('alarm:cleared', { alarmId: 'a2' });

      // 验证补发后缓存被清除
      const pending = offlineCacheService.getPendingMessages('user-1');
      expect(pending).toHaveLength(0);
    });

    it('should not replay messages for anonymous (unauthenticated) connections', () => {
      offlineCacheService.registerClient('user-1');
      offlineCacheService.cacheMessage('user-1', 'alarm:trigger', { alarmId: 'a1' });

      // 无 token 的匿名连接
      const socket = createMockSocket('socket-anon', '10.0.0.1');
      gateway.handleConnection(socket);

      // 不应补发 alarm:trigger 事件（只应发出 connection 事件）
      expect(socket.emit).not.toHaveBeenCalledWith('alarm:trigger', expect.anything());
      // 缓存应保留
      const pending = offlineCacheService.getPendingMessages('user-1');
      expect(pending).toHaveLength(1);
    });

    it('should cache messages for offline clients on system broadcast', () => {
      // 注册一个客户端（模拟曾经连接过）
      offlineCacheService.registerClient('user-1');

      // 当前没有客户端通过 Gateway 连接，user-1 处于离线状态
      gateway.broadcastSystem('System maintenance', { type: 'warning' });

      // 验证为离线客户端缓存了消息
      const pending = offlineCacheService.getPendingMessages('user-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].event).toBe('system:broadcast');
      // 验证也通过 Server 向所有在线客户端广播
      expect(mockServer.emit).toHaveBeenCalledWith(
        'system:broadcast',
        expect.objectContaining({ message: 'System maintenance' }),
      );
    });
  });

  // ==================== 7. 连接配置动态更新 ====================
  describe('Connection Config Dynamic Update', () => {
    it('should apply new maxConnectionsPerUser immediately', () => {
      connectionLimiter.updateConfig({ maxConnectionsPerUser: 2 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');
      connectionLimiter.registerConnection('s2', 'u1', '10.0.0.2');

      const result = connectionLimiter.registerConnection('s3', 'u1', '10.0.0.3');
      expect(result.allowed).toBe(false);
    });

    it('should apply new maxConnectionsPerIp immediately', () => {
      connectionLimiter.updateConfig({ maxConnectionsPerIp: 2 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');
      connectionLimiter.registerConnection('s2', 'u2', '10.0.0.1');

      const result = connectionLimiter.registerConnection('s3', 'u3', '10.0.0.1');
      expect(result.allowed).toBe(false);
    });

    it('should apply new maxGlobalConnections immediately', () => {
      connectionLimiter.updateConfig({ maxGlobalConnections: 2 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');
      connectionLimiter.registerConnection('s2', 'u2', '10.0.0.2');

      const result = connectionLimiter.registerConnection('s3', 'u3', '10.0.0.3');
      expect(result.allowed).toBe(false);
    });

    it('should apply new idleTimeoutMinutes immediately', () => {
      // 初始超时 5 分钟
      connectionLimiter.updateConfig({ idleTimeoutMinutes: 5 });
      connectionLimiter.registerConnection('s1', 'u1', '10.0.0.1');
      const record = connectionLimiter.getConnection('s1');
      // 设置活动时间为 3 分钟前（在 5 分钟超时内）
      (record as any).lastActivityAt = Date.now() - 3 * 60 * 1000;

      let idle = connectionLimiter.checkIdleConnections();
      expect(idle).not.toContain('s1');

      // 更新超时为 2 分钟（3 分钟 > 2 分钟，应检测为空闲）
      connectionLimiter.updateConfig({ idleTimeoutMinutes: 2 });
      idle = connectionLimiter.checkIdleConnections();
      expect(idle).toContain('s1');
    });
  });
});
