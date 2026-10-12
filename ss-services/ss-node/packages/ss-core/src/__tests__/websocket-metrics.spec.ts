// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { WebSocketMetricsService } from '../websocket/websocket-metrics.service';
import { Logger } from '@nestjs/common';

describe('WebSocketMetricsService', () => {
  let service: WebSocketMetricsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new WebSocketMetricsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recordBroadcast', () => {
    it('应正确记录广播次数和接收者数', () => {
      service.recordBroadcast('data:update', 'project:p1', 5);
      service.recordBroadcast('data:update', 'project:p1', 3);
      service.recordBroadcast('alarm:trigger', 'project:p1', 2);

      const snapshot = service.getSnapshot();
      expect(snapshot.broadcastCounts['data:update']).toBe(2);
      expect(snapshot.broadcastCounts['alarm:trigger']).toBe(1);
      expect(snapshot.totalBroadcasts).toBe(3);
      expect(snapshot.totalRecipients).toBe(10);
    });

    it('应正确统计房间命中率', () => {
      service.recordBroadcast('data:update', 'project:p1', 5);
      service.recordBroadcast('data:update', 'project:p1', 3);
      service.recordBroadcast('data:update', 'tag:t1', 0);

      const snapshot = service.getSnapshot();
      expect(snapshot.roomHitStats['project:p1']).toEqual({
        broadcasts: 2,
        totalRecipients: 8,
      });
      expect(snapshot.roomHitStats['tag:t1']).toEqual({
        broadcasts: 1,
        totalRecipients: 0,
      });
    });
  });

  describe('recordBroadcastError', () => {
    it('应正确记录广播错误', () => {
      service.recordBroadcastError('data:update');
      service.recordBroadcastError('data:update');
      service.recordBroadcastError('alarm:trigger');

      const snapshot = service.getSnapshot();
      expect(snapshot.broadcastErrors['data:update']).toBe(2);
      expect(snapshot.broadcastErrors['alarm:trigger']).toBe(1);
    });
  });

  describe('recordBridgeLatency', () => {
    it('应正确计算平均和最大耗时', () => {
      service.recordBridgeLatency('data_point_changed', 10);
      service.recordBridgeLatency('data_point_changed', 30);
      service.recordBridgeLatency('alarm_triggered', 50);

      const snapshot = service.getSnapshot();
      expect(snapshot.bridgeLatencyMs.count).toBe(3);
      expect(snapshot.bridgeLatencyMs.totalMs).toBe(90);
      expect(snapshot.bridgeLatencyMs.avgMs).toBe(30);
      expect(snapshot.bridgeLatencyMs.maxMs).toBe(50);
    });
  });

  describe('recordOfflineCache', () => {
    it('应正确记录离线缓存命中和未命中', () => {
      service.recordOfflineCacheHit();
      service.recordOfflineCacheHit();
      service.recordOfflineCacheMiss();

      const snapshot = service.getSnapshot();
      expect(snapshot.offlineCacheHits).toBe(2);
      expect(snapshot.offlineCacheMisses).toBe(1);
    });
  });

  describe('getPrometheusMetrics', () => {
    it('应包含所有已记录指标的 Prometheus 格式文本', () => {
      service.recordBroadcast('data:update', 'project:p1', 5);
      service.recordBroadcastError('alarm:trigger');

      const prom = service.getPrometheusMetrics();

      expect(prom).toContain('ws_broadcasts_total{event="data:update"} 1');
      expect(prom).toContain('ws_broadcast_errors_total{event="alarm:trigger"} 1');
      expect(prom).toContain('ws_total_broadcasts 1');
      expect(prom).toContain('ws_total_recipients 5');
      expect(prom).toContain('ws_broadcast_rate');
      expect(prom).toContain('ws_bridge_latency_ms_avg');
      expect(prom).toContain('ws_offline_cache_hits_total');
    });
  });

  describe('reset', () => {
    it('应清空所有指标', () => {
      service.recordBroadcast('data:update', 'project:p1', 5);
      service.recordBridgeLatency('data_point_changed', 10);
      service.recordOfflineCacheHit();

      service.reset();

      const snapshot = service.getSnapshot();
      expect(snapshot.totalBroadcasts).toBe(0);
      expect(snapshot.totalRecipients).toBe(0);
      expect(snapshot.bridgeLatencyMs.count).toBe(0);
      expect(snapshot.offlineCacheHits).toBe(0);
      expect(Object.keys(snapshot.broadcastCounts)).toHaveLength(0);
    });
  });

  describe('getSnapshot 时间信息', () => {
    it('应包含 startedAt 和 snapshotAt', () => {
      const snapshot = service.getSnapshot();
      expect(snapshot.startedAt).toBeGreaterThan(0);
      expect(snapshot.snapshotAt).toBeGreaterThanOrEqual(snapshot.startedAt);
    });
  });
});
