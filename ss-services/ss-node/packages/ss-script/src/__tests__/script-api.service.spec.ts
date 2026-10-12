// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock @nestjs/swagger to avoid decorator side effects
jest.mock('@nestjs/swagger', () => {
  const propDeco = (): any => () => {};
  return {
    ApiTags: () => () => {},
    ApiBearerAuth: () => () => {},
    ApiOperation: () => () => {},
    ApiParam: () => () => {},
    ApiQuery: () => () => {},
    ApiProperty: () => propDeco(),
    ApiPropertyOptional: () => propDeco(),
    ApiBody: () => () => {},
    ApiResponse: () => () => {},
    PartialType: (cls: any) => cls,
    OmitType: (cls: any) => cls,
    PickType: (cls: any) => cls,
    IntersectionType: (...classes: any[]) => classes[0],
  };
});

// Mock 外部服务包，避免加载真实源码的依赖链（swagger PartialType / ss-collector-sdk）
jest.mock('@ss-node/ss-datatag', () => ({
  DataTagService: jest.fn().mockImplementation(() => ({ findById: jest.fn() })),
  DatatagModule: class {},
  DataTag: class {},
}));
jest.mock('@ss-node/ss-alarm', () => ({
  AlarmService: jest.fn().mockImplementation(() => ({ acknowledgeAlarm: jest.fn() })),
  AlarmModule: class {},
}));
jest.mock('@ss-node/ss-storage-influx', () => ({
  DataQueryService: jest.fn().mockImplementation(() => ({ queryTrendData: jest.fn() })),
  DataModule: class {},
  InterpolationType: { RAW: 'raw', LINEAR: 'linear', STEP: 'step' },
}));

import { ScriptApiService } from '../script-api.service';

// ============================================================
// Mock 依赖服务
// ============================================================
function createMockCacheService() {
  return {
    get: jest.fn(),
    getMany: jest.fn(),
    set: jest.fn(),
  };
}

function createMockDataTagService() {
  return {
    findById: jest.fn(),
  };
}

function createMockAlarmService() {
  return {
    acknowledgeAlarm: jest.fn(),
  };
}

function createMockDataQueryService() {
  return {
    queryTrendData: jest.fn(),
  };
}

function createMockEventBusService() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
  };
}

describe('ScriptApiService', () => {
  let service: ScriptApiService;
  let mockCacheService: ReturnType<typeof createMockCacheService>;
  let mockDataTagService: ReturnType<typeof createMockDataTagService>;
  let mockAlarmService: ReturnType<typeof createMockAlarmService>;
  let mockDataQueryService: ReturnType<typeof createMockDataQueryService>;
  let mockEventBusService: ReturnType<typeof createMockEventBusService>;

  beforeEach(() => {
    mockCacheService = createMockCacheService();
    mockDataTagService = createMockDataTagService();
    mockAlarmService = createMockAlarmService();
    mockDataQueryService = createMockDataQueryService();
    mockEventBusService = createMockEventBusService();

    service = new ScriptApiService(
      mockCacheService as any,
      mockDataTagService as any,
      mockAlarmService as any,
      mockDataQueryService as any,
      mockEventBusService as any,
    );
  });

  // ==================== readTag ====================
  describe('readTag', () => {
    it('should return cached value when available', async () => {
      const cached = {
        tagId: 'tag-1',
        deviceId: 'dev-1',
        projectId: 'proj-1',
        value: 42.5,
        quality: 'good',
        timestamp: Date.now(),
        cachedAt: Date.now(),
      };
      mockCacheService.get.mockResolvedValue(cached);

      const provider = service.getApiProvider('proj-1');
      const result = await provider.readTag('tag-1');

      expect(result.tagId).toBe('tag-1');
      expect(result.value).toBe(42.5);
      expect(result.quality).toBe('good');
      expect(result.timestamp).toBeDefined();
      expect(mockCacheService.get).toHaveBeenCalledWith('tag-1');
    });

    it('should return null value when cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const provider = service.getApiProvider('proj-1');
      const result = await provider.readTag('tag-missing');

      expect(result.value).toBeNull();
      expect(result.quality).toBe('unknown');
    });

    it('should degrade gracefully when cacheService is not available', async () => {
      const degradedService = new ScriptApiService(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
      );
      const provider = degradedService.getApiProvider('proj-1');
      const result = await provider.readTag('tag-1');

      expect(result.value).toBeNull();
      expect(result.quality).toBe('unknown');
    });
  });

  // ==================== readTags ====================
  describe('readTags', () => {
    it('should batch read multiple tags', async () => {
      const map = new Map([
        ['tag-1', { tagId: 'tag-1', value: 10, quality: 'good', timestamp: 1000, cachedAt: 1000 }],
        ['tag-2', { tagId: 'tag-2', value: 20, quality: 'good', timestamp: 2000, cachedAt: 2000 }],
      ]);
      mockCacheService.getMany.mockResolvedValue(map);

      const provider = service.getApiProvider('proj-1');
      const result = await provider.readTags(['tag-1', 'tag-2', 'tag-3']);

      expect(result['tag-1'].value).toBe(10);
      expect(result['tag-2'].value).toBe(20);
      expect(result['tag-3'].value).toBeNull();
      expect(result['tag-3'].quality).toBe('unknown');
    });
  });

  // ==================== writeTag ====================
  describe('writeTag', () => {
    it('should update cache and emit event', async () => {
      mockDataTagService.findById.mockResolvedValue({
        id: 'tag-1',
        deviceId: 'dev-1',
        projectId: 'proj-1',
      });

      const provider = service.getApiProvider('proj-1');
      const result = await provider.writeTag('tag-1', 100);

      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
      expect(mockDataTagService.findById).toHaveBeenCalledWith('tag-1');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tagId: 'tag-1',
          deviceId: 'dev-1',
          value: 100,
          quality: 'good',
        }),
      );
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        'data_point_changed',
        expect.objectContaining({
          tagId: 'tag-1',
          deviceId: 'dev-1',
          projectId: 'proj-1',
          value: 100,
        }),
      );
    });

    it('should continue without deviceId when DataTag not found', async () => {
      mockDataTagService.findById.mockRejectedValue(new Error('not found'));

      const provider = service.getApiProvider('proj-1');
      const result = await provider.writeTag('tag-unknown', 50);

      expect(result.success).toBe(true);
      // Should still write to cache and emit event (with empty deviceId)
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        'data_point_changed',
        expect.objectContaining({ deviceId: '' }),
      );
    });
  });

  // ==================== triggerAlarm ====================
  describe('triggerAlarm', () => {
    it('should emit alarm_triggered event with correct format', () => {
      const provider = service.getApiProvider('proj-1');
      const result = provider.triggerAlarm('高温报警', '温度超过阈值', 'critical', {
        tagId: 'tag-1',
        deviceId: 'dev-1',
        value: 95,
      });

      expect(result.triggered).toBe(true);
      expect(result.alarmId).toBeDefined();
      expect(result.level).toBe('critical');
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        'alarm_triggered',
        expect.objectContaining({
          tagId: 'tag-1',
          deviceId: 'dev-1',
          projectId: 'proj-1',
          condition: expect.objectContaining({ severity: 'critical' }),
          value: 95,
          message: '[高温报警] 温度超过阈值',
        }),
      );
    });

    it('should default level to warning for invalid level', () => {
      const provider = service.getApiProvider('proj-1');
      provider.triggerAlarm('test', 'msg', 'invalid-level');

      // 事件中的 severity 应规范化为 warning
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        'alarm_triggered',
        expect.objectContaining({
          condition: expect.objectContaining({ severity: 'warning' }),
        }),
      );
    });
  });

  // ==================== acknowledgeAlarm ====================
  describe('acknowledgeAlarm', () => {
    it('should call alarmService.acknowledgeAlarm and return success', async () => {
      mockAlarmService.acknowledgeAlarm.mockResolvedValue({ status: 'acknowledged' });

      const provider = service.getApiProvider('proj-1');
      const result = await provider.acknowledgeAlarm('alarm-1', 'user-1');

      expect(result.acknowledged).toBe(true);
      expect(mockAlarmService.acknowledgeAlarm).toHaveBeenCalledWith('alarm-1', 'user-1', 'proj-1');
    });

    it('should return error when alarmService throws', async () => {
      mockAlarmService.acknowledgeAlarm.mockRejectedValue(new Error('Alarm not found'));

      const provider = service.getApiProvider('proj-1');
      const result = await provider.acknowledgeAlarm('alarm-missing', 'user-1');

      expect(result.acknowledged).toBe(false);
      expect(result.error).toBe('Alarm not found');
    });

    it('should degrade when alarmService is not available', async () => {
      const degradedService = new ScriptApiService(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
      );
      const provider = degradedService.getApiProvider('proj-1');
      const result = await provider.acknowledgeAlarm('alarm-1', 'user-1');

      expect(result.acknowledged).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  // ==================== queryTagHistory ====================
  describe('queryTagHistory', () => {
    it('should call dataQueryService.queryTrendData with correct options', async () => {
      const queryResult = { data: [], pagination: { total: 0 } };
      mockDataQueryService.queryTrendData.mockResolvedValue(queryResult);

      const provider = service.getApiProvider('proj-1');
      const result = await provider.queryTagHistory(
        ['tag-1'],
        '2024-01-01T00:00:00Z',
        '2024-01-02T00:00:00Z',
        { maxPoints: 500, interpolation: 'linear' },
      );

      expect(result).toEqual(queryResult);
      expect(mockDataQueryService.queryTrendData).toHaveBeenCalledWith(
        expect.objectContaining({
          tagIds: ['tag-1'],
          projectId: 'proj-1',
          maxPoints: 500,
        }),
      );
    });

    it('should degrade when dataQueryService is not available', async () => {
      const degradedService = new ScriptApiService(
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
      );
      const provider = degradedService.getApiProvider('proj-1');
      const result = await provider.queryTagHistory(['tag-1'], '2024-01-01', '2024-01-02');

      expect(result.data).toEqual([]);
    });
  });

  // ==================== getApiProvider projectId 闭包 ====================
  describe('getApiProvider projectId closure', () => {
    it('should bind projectId to all functions via closure', async () => {
      mockDataTagService.findById.mockResolvedValue({
        id: 'tag-1',
        deviceId: 'dev-1',
        projectId: 'proj-closure',
      });

      const provider = service.getApiProvider('proj-closure');
      await provider.writeTag('tag-1', 1);

      // projectId 应通过闭包传递到 writeTag 内部
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        'data_point_changed',
        expect.objectContaining({ projectId: 'proj-closure' }),
      );
    });

    it('should produce independent providers for different projectIds', () => {
      // 使用 triggerAlarm 测试闭包隔离（writeTag 会从 DataTag 覆盖 projectId）
      const providerA = service.getApiProvider('proj-A');
      const providerB = service.getApiProvider('proj-B');

      providerA.triggerAlarm('test', 'msg', 'warning');
      providerB.triggerAlarm('test', 'msg', 'warning');

      const calls = mockEventBusService.emit.mock.calls;
      expect(calls[0][1].projectId).toBe('proj-A');
      expect(calls[1][1].projectId).toBe('proj-B');
    });
  });

  // ==================== httpGet / httpPost ====================
  describe('httpGet / httpPost', () => {
    it('should return error for invalid URL', async () => {
      const provider = service.getApiProvider('proj-1');
      const result = await provider.httpGet('not-a-valid-url');

      expect(result.status).toBe(0);
      expect(result.error).toContain('Invalid URL');
    });
  });

  // ==================== getTime / log / sleep ====================
  describe('getTime / log / sleep', () => {
    it('getTime should return timestamp and iso string', () => {
      const provider = service.getApiProvider('proj-1');
      const result = provider.getTime();

      expect(result.timestamp).toBeDefined();
      expect(result.iso).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });

    it('log should not throw', () => {
      const provider = service.getApiProvider('proj-1');
      expect(() => provider.log('info', 'test message')).not.toThrow();
    });

    it('sleep should resolve after specified duration', async () => {
      jest.useRealTimers();
      try {
        const provider = service.getApiProvider('proj-1');
        await expect(provider.sleep(10)).resolves.toBeUndefined();
      } finally {
        jest.useFakeTimers();
      }
    });
  });
});
