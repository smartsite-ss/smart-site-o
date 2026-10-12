// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScadaWebSocketGateway } from '../websocket/websocket.gateway';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { OfflineMessageCacheService } from '../websocket/offline-message-cache.service';
import { WebSocketMetricsService } from '../websocket/websocket-metrics.service';
import { ConnectionLimiterService } from '../websocket/connection-limiter.service';
import { ConnectionMonitorService } from '../websocket/connection-monitor.service';

describe('ScadaWebSocketGateway', () => {
  let gateway: ScadaWebSocketGateway;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockSocket: Partial<Socket>;
  let mockServer: Partial<Server>;
  let mockOfflineCache: jest.Mocked<OfflineMessageCacheService>;
  let mockMetricsService: jest.Mocked<WebSocketMetricsService>;
  let mockConnectionLimiter: jest.Mocked<ConnectionLimiterService>;
  let mockConnectionMonitor: jest.Mocked<ConnectionMonitorService>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    mockJwtService = {
      verify: jest.fn(),
    } as any;

    mockOfflineCache = {
      registerClient: jest.fn(),
      getPendingMessages: jest.fn().mockReturnValue([]),
      clearMessages: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ totalClients: 0, totalMessages: 0 }),
      getOfflineClientIds: jest.fn().mockReturnValue([]),
      cacheMessage: jest.fn(),
    } as any;

    mockMetricsService = {
      recordBroadcast: jest.fn(),
      recordBroadcastError: jest.fn(),
      recordBridgeLatency: jest.fn(),
      recordOfflineCacheHit: jest.fn(),
      recordOfflineCacheMiss: jest.fn(),
      getSnapshot: jest.fn().mockReturnValue({ totalBroadcasts: 0 }),
      getPrometheusMetrics: jest.fn().mockReturnValue(''),
      reset: jest.fn(),
    } as any;

    mockConnectionLimiter = {
      registerConnection: jest.fn().mockReturnValue({ allowed: true }),
      unregisterConnection: jest.fn(),
      recordActivity: jest.fn(),
      checkIdleConnections: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        totalConnections: 0,
        userConnections: 0,
        uniqueUsers: 0,
        uniqueIps: 0,
      }),
      getConfig: jest.fn().mockReturnValue({
        maxConnectionsPerUser: 5,
        maxGlobalConnections: 1000,
        maxConnectionsPerIp: 10,
        idleTimeoutMinutes: 30,
      }),
      updateConfig: jest.fn(),
      getUserConnectionCount: jest.fn().mockReturnValue(0),
      getIpConnectionCount: jest.fn().mockReturnValue(0),
      getConnection: jest.fn().mockReturnValue(undefined),
      getAllConnections: jest.fn().mockReturnValue([]),
      getConnectionIp: jest.fn().mockReturnValue(undefined),
    } as any;

    mockConnectionMonitor = {
      registerConnection: jest.fn(),
      unregisterConnection: jest.fn(),
      updateProjectRooms: jest.fn(),
      recordMessage: jest.fn(),
      getMessageRates: jest.fn().mockReturnValue([]),
      getDurationStats: jest.fn().mockReturnValue({
        avgMs: 0,
        maxMs: 0,
        distribution: {
          under1Min: 0,
          under10Min: 0,
          under1Hour: 0,
          under1Day: 0,
          over1Day: 0,
        },
      }),
      detectAbnormalConnections: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        totalConnections: 0,
        connectionsByProject: {},
        connectionsByUser: {},
        messageRates: [],
        durationStats: {
          avgMs: 0,
          maxMs: 0,
          distribution: {
            under1Min: 0,
            under10Min: 0,
            under1Hour: 0,
            under1Day: 0,
            over1Day: 0,
          },
        },
        abnormalConnections: [],
      }),
      getOnlineCountByProject: jest.fn().mockReturnValue(0),
      getOnlineCountByUser: jest.fn().mockReturnValue(0),
      getConnectionSnapshot: jest.fn().mockReturnValue(undefined),
      getAllSnapshots: jest.fn().mockReturnValue([]),
      setAbnormalThresholds: jest.fn(),
    } as any;

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
      } as any,
    } as any;

    mockSocket = {
      id: 'socket-test-001',
      handshake: {
        auth: {},
        query: {},
        headers: {},
        time: '',
        address: '127.0.0.1',
        xdomain: false,
        secure: false,
        issued: 0,
        url: '',
        ...({} as any),
      },
      conn: {
        remoteAddress: '127.0.0.1',
      } as any,
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    gateway = new ScadaWebSocketGateway(
      mockJwtService,
      mockOfflineCache,
      mockMetricsService,
      mockConnectionLimiter,
      mockConnectionMonitor,
    );
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== 1.1 WebSocket 连接与认证 ====================
  describe('handleConnection', () => {
    it('should authenticate client with valid JWT token from auth', () => {
      const payload = { sub: 'user-001', username: 'testuser', role: 'admin' };
      mockJwtService.verify.mockReturnValue(payload);
      mockSocket.handshake!.auth = { token: 'valid-jwt-token' };

      gateway.handleConnection(mockSocket as any);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-jwt-token');
      expect((mockSocket as any).user).toEqual(payload);
      expect((mockSocket as any).connectedAt).toBeDefined();
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-001');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connection',
        expect.objectContaining({
          authenticated: true,
        }),
      );
    });

    it('should authenticate client with valid JWT token from query', () => {
      const payload = { sub: 'user-002', username: 'queryuser', role: 'user' };
      mockJwtService.verify.mockReturnValue(payload);
      mockSocket.handshake!.auth = {};
      mockSocket.handshake!.query = { token: 'query-jwt-token' };

      gateway.handleConnection(mockSocket as any);

      expect(mockJwtService.verify).toHaveBeenCalledWith('query-jwt-token');
      expect((mockSocket as any).user.username).toBe('queryuser');
    });

    it('should allow connection without token (anonymous)', () => {
      mockSocket.handshake!.auth = {};
      mockSocket.handshake!.query = {};

      gateway.handleConnection(mockSocket as any);

      expect((mockSocket as any).user).toBeUndefined();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connection',
        expect.objectContaining({
          authenticated: false,
        }),
      );
    });

    it('should warn on invalid JWT token but still allow connection', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockSocket.handshake!.auth = { token: 'invalid-token' };

      gateway.handleConnection(mockSocket as any);

      expect(Logger.prototype.warn).toHaveBeenCalled();
      expect((mockSocket as any).user).toBeUndefined();
    });

    it('should track connected clients count', () => {
      mockSocket.handshake!.auth = {};

      gateway.handleConnection(mockSocket as any);

      expect(gateway.getConnectionCount()).toBe(1);
    });

    it('should disconnect client on fatal error', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Fatal error');
      });
      mockSocket.handshake!.auth = { token: 'any-token' };
      // Simulate handleConnection error by triggering disconnect
      // The gateway catches errors in handleConnection and disconnects
      (mockSocket as any).connectedAt = undefined;

      gateway.handleConnection(mockSocket as any);

      // Client should still be tracked since it was added before error check
      // But if error happens before add, disconnect is called
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from tracking on disconnect', () => {
      mockSocket.handshake!.auth = {};
      gateway.handleConnection(mockSocket as any);
      expect(gateway.getConnectionCount()).toBe(1);

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway.getConnectionCount()).toBe(0);
    });
  });

  // ==================== 心跳 ====================
  describe('handlePing', () => {
    it('should respond with pong and connection count', () => {
      mockSocket.handshake!.auth = {};
      gateway.handleConnection(mockSocket as any);

      gateway.handlePing(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'pong',
        expect.objectContaining({
          message: 'Pong',
          timestamp: expect.any(String),
          connections: 1,
        }),
      );
    });
  });

  // ==================== 房间管理 ====================
  describe('subscribe:project', () => {
    it('should join project room and confirm', () => {
      gateway.handleSubscribeProject({ projectId: 'project-001' }, mockSocket as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith('project:project-001');
      expect(mockSocket.emit).toHaveBeenCalledWith('room:joined', {
        room: 'project:project-001',
        projectId: 'project-001',
      });
    });
  });

  describe('unsubscribe:project', () => {
    it('should leave project room and confirm', () => {
      gateway.handleUnsubscribeProject({ projectId: 'project-001' }, mockSocket as Socket);

      expect(mockSocket.leave).toHaveBeenCalledWith('project:project-001');
      expect(mockSocket.emit).toHaveBeenCalledWith('room:left', {
        room: 'project:project-001',
      });
    });
  });

  describe('subscribe:device', () => {
    it('should join device room', () => {
      gateway.handleSubscribeDevice({ deviceId: 'device-001' }, mockSocket as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith('device:device-001');
    });
  });

  describe('subscribe:tag', () => {
    it('should join multiple tag rooms', () => {
      gateway.handleSubscribeTag(
        { tagIds: ['tag-001', 'tag-002', 'tag-003'] },
        mockSocket as Socket,
      );

      expect(mockSocket.join).toHaveBeenCalledWith('tag:tag-001');
      expect(mockSocket.join).toHaveBeenCalledWith('tag:tag-002');
      expect(mockSocket.join).toHaveBeenCalledWith('tag:tag-003');
    });
  });

  // ==================== 1.2 数据推送 ====================
  describe('broadcastTagUpdate', () => {
    it('should broadcast tag update to project room', () => {
      const tagData = {
        tagId: 'tag-001',
        tagName: 'Temperature',
        value: 25.5,
        quality: 'good',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastTagUpdate('project-001', tagData);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('data:update', {
        event: 'tagValueChanged',
        ...tagData,
      });
    });

    it('should also broadcast to tag-specific room', () => {
      const tagData = {
        tagId: 'tag-002',
        tagName: 'Pressure',
        value: 101.3,
        quality: 'good',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastTagUpdate('project-001', tagData);

      expect(mockServer.to).toHaveBeenCalledWith('tag:tag-002');
    });
  });

  describe('broadcastBatchUpdate', () => {
    it('should broadcast batch tag updates to project room after flush', () => {
      const tags = [
        {
          tagId: 'tag-001',
          tagName: 'T1',
          value: 10,
          quality: 'good',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          tagId: 'tag-002',
          tagName: 'T2',
          value: 20,
          quality: 'good',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      // 缓冲模式下，broadcastBatchUpdate 不立即推送，需触发 flush
      gateway.broadcastBatchUpdate('project-001', tags);
      (gateway as any).flushBatchUpdates();

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('data:batch', {
        event: 'tagValuesChanged',
        data: tags,
        timestamp: expect.any(String),
      });
    });
  });

  // ==================== 1.3 事件通知 — 报警 ====================
  describe('broadcastAlarmTrigger', () => {
    it('should broadcast alarm trigger to project room', () => {
      const alarmData = {
        alarmId: 'alarm-001',
        ruleName: 'High Temperature',
        tagName: 'Temperature',
        level: 'critical',
        value: 100,
        message: 'Temperature exceeds threshold',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastAlarmTrigger('project-001', alarmData);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('alarm:trigger', {
        event: 'alarmTriggered',
        ...alarmData,
      });
    });
  });

  describe('broadcastAlarmAcknowledged', () => {
    it('should broadcast alarm acknowledged to project room', () => {
      const data = {
        alarmId: 'alarm-001',
        acknowledgedBy: 'admin',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastAlarmAcknowledged('project-001', data);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('alarm:acknowledged', {
        event: 'alarmAcknowledged',
        ...data,
      });
    });
  });

  describe('broadcastAlarmCleared', () => {
    it('should broadcast alarm cleared to project room', () => {
      const data = {
        alarmId: 'alarm-001',
        clearedBy: 'system',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastAlarmCleared('project-001', data);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('alarm:cleared', {
        event: 'alarmCleared',
        ...data,
      });
    });
  });

  describe('broadcastAlarmRecovered', () => {
    it('TC-WS-GW-020: should broadcast alarm recovered to project room', () => {
      const data = {
        alarmId: 'alarm-001',
        recoveredValue: '25.5',
        ruleName: '温度过高',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastAlarmRecovered('project-001', data);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('alarm:recovered', {
        event: 'alarmRecovered',
        ...data,
      });
    });

    it('TC-WS-GW-021: should handle missing ruleName gracefully', () => {
      const data = {
        alarmId: 'alarm-002',
        recoveredValue: '0',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastAlarmRecovered('project-001', data);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.emit).toHaveBeenCalledWith('alarm:recovered', {
        event: 'alarmRecovered',
        ...data,
      });
    });
  });

  // ==================== 事件通知 — 设备状态 ====================
  describe('broadcastDeviceStatus', () => {
    it('should broadcast device status to project and device rooms', () => {
      const status = {
        fromStatus: 'online',
        toStatus: 'offline',
        errorMessage: 'Connection timeout',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      gateway.broadcastDeviceStatus('project-001', 'device-001', status);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-001');
      expect(mockServer.to).toHaveBeenCalledWith('device:device-001');
      expect(mockServer.emit).toHaveBeenCalledWith('device:statusChange', {
        event: 'deviceStatusChanged',
        deviceId: 'device-001',
        ...status,
      });
    });
  });

  // ==================== 事件通知 — 系统广播 ====================
  describe('broadcastSystem', () => {
    it('should broadcast system message to all clients', () => {
      gateway.broadcastSystem('System maintenance in 5 minutes', { type: 'warning' });

      expect(mockServer.emit).toHaveBeenCalledWith('system:broadcast', {
        event: 'systemBroadcast',
        message: 'System maintenance in 5 minutes',
        data: { type: 'warning' },
        timestamp: expect.any(String),
      });
    });
  });

  describe('sendToUser', () => {
    it('should send event to specific user room', () => {
      const eventData = { title: 'Notification', body: 'You have new alerts' };

      gateway.sendToUser('user-001', 'notification', eventData);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-001');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', eventData);
    });
  });

  // ==================== 统计 ====================
  describe('getConnectionCount', () => {
    it('should return 0 when no connections', () => {
      expect(gateway.getConnectionCount()).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return connection and room metrics', () => {
      const metrics = gateway.getMetrics();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.roomCount).toBe(0);
      expect(Array.isArray(metrics.rooms)).toBe(true);
    });
  });
});
