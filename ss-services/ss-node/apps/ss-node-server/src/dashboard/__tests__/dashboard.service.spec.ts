// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * DashboardService 单测（02 模块仪表盘聚合）
 *
 * 覆盖：聚合字段映射、30s 缓存 TTL、forceRefresh 绕过、角色透传、隔离库仓储切换
 */
import { DashboardService } from '../dashboard.service';
import { AlarmLevel, AlarmStatus } from '@ss-node/ss-alarm';

interface MockQueryBuilder {
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  setParameters: jest.Mock;
  getRawOne: jest.Mock;
}

function createMockQueryBuilder(raw: Record<string, string | number>): MockQueryBuilder {
  const builder: Partial<MockQueryBuilder> = {};
  const self = () => builder;
  builder.select = jest.fn(self);
  builder.addSelect = jest.fn(self);
  builder.where = jest.fn(self);
  builder.setParameters = jest.fn(self);
  builder.getRawOne = jest.fn().mockResolvedValue(raw);
  return builder as MockQueryBuilder;
}

function createMockRepo(raw: Record<string, string | number>) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder(raw)),
  };
}

function createDeviceStats() {
  return {
    total: 12,
    online: 8,
    offline: 2,
    connecting: 1,
    degraded: 0,
    error: 1,
    totalTags: 64,
  };
}

function createAlarmRaw() {
  return {
    todayTotal: '7',
    todayInfo: '3',
    todayWarning: '2',
    todayError: '1',
    todayCritical: '1',
    activeUnacknowledged: '4',
  };
}

function createService(options?: {
  deviceService?: any;
  repo?: any;
  projectDbService?: any;
  dbMode?: string;
}) {
  const deviceService = options?.deviceService ?? {
    getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
  };
  const repo = options?.repo ?? createMockRepo(createAlarmRaw());
  const projectDbService = options?.projectDbService;
  const configService = {
    get: jest.fn().mockReturnValue(options?.dbMode ?? 'shared'),
  };
  const service = new DashboardService(
    deviceService,
    repo as any,
    projectDbService,
    configService as any,
  );
  return { service, deviceService, repo, projectDbService };
}

describe('DashboardService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T08:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getSummary 聚合字段映射', () => {
    it('TC-DASH-001: 设备统计与报警聚合映射为 DashboardSummary 契约字段', async () => {
      const { service } = createService();

      const summary = await service.getSummary('project-001');

      expect(summary.deviceTotal).toBe(12);
      expect(summary.deviceOnlineCount).toBe(8);
      expect(summary.deviceOfflineCount).toBe(2);
      expect(summary.deviceConnectingCount).toBe(1);
      expect(summary.deviceDegradedCount).toBe(0);
      expect(summary.deviceErrorCount).toBe(1);
      expect(summary.totalTagCount).toBe(64);
      expect(summary.todayAlarmTotalCount).toBe(7);
      expect(summary.todayAlarmCountByLevel).toEqual({
        [AlarmLevel.INFO]: 3,
        [AlarmLevel.WARNING]: 2,
        [AlarmLevel.ERROR]: 1,
        [AlarmLevel.CRITICAL]: 1,
      });
      expect(summary.activeUnacknowledgedAlarmCount).toBe(4);
      expect(summary.generatedAt).toBe(Date.now());
    });

    it('TC-DASH-002: 聚合结果为空时数值回落为 0', async () => {
      const { service } = createService({ repo: createMockRepo({}) });

      const summary = await service.getSummary('project-001');

      expect(summary.todayAlarmTotalCount).toBe(0);
      expect(summary.todayAlarmCountByLevel).toEqual({
        [AlarmLevel.INFO]: 0,
        [AlarmLevel.WARNING]: 0,
        [AlarmLevel.ERROR]: 0,
        [AlarmLevel.CRITICAL]: 0,
      });
      expect(summary.activeUnacknowledgedAlarmCount).toBe(0);
    });

    it('TC-DASH-003: roleId 透传给设备统计做授权过滤', async () => {
      const deviceService = {
        getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
      };
      const { service } = createService({ deviceService });

      await service.getSummary('project-001', false, 'role-viewer');

      expect(deviceService.getDeviceStats).toHaveBeenCalledWith('project-001', 'role-viewer');
    });

    it('TC-DASH-004: 报警聚合按项目过滤并使用当日 0 点参数', async () => {
      const repo = createMockRepo(createAlarmRaw());
      const { service } = createService({ repo });

      await service.getSummary('project-001');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('r');
      const builder = repo.createQueryBuilder.mock.results[0].value;
      expect(builder.where).toHaveBeenCalledWith('r.projectId = :projectId', {
        projectId: 'project-001',
      });
      const parameters = builder.setParameters.mock.calls[0][0];
      expect(parameters.active).toBe(AlarmStatus.ACTIVE);
      expect(new Date(parameters.startOfToday).getHours()).toBe(0);
      expect(new Date(parameters.startOfToday).getMinutes()).toBe(0);
    });
  });

  describe('30s 内存缓存', () => {
    it('TC-DASH-005: TTL 内重复请求命中缓存，不重复聚合', async () => {
      const deviceService = {
        getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
      };
      const { service } = createService({ deviceService });

      const first = await service.getSummary('project-001');
      jest.advanceTimersByTime(29_000);
      const second = await service.getSummary('project-001');

      expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('TC-DASH-006: 超过 30s 后缓存失效重新聚合', async () => {
      const deviceService = {
        getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
      };
      const { service } = createService({ deviceService });

      await service.getSummary('project-001');
      jest.advanceTimersByTime(30_001);
      await service.getSummary('project-001');

      expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(2);
    });

    it('TC-DASH-007: forceRefresh 绕过缓存立即重新聚合', async () => {
      const deviceService = {
        getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
      };
      const { service } = createService({ deviceService });

      await service.getSummary('project-001');
      await service.getSummary('project-001', true);

      expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(2);
    });

    it('TC-DASH-008: 不同项目缓存相互独立', async () => {
      const deviceService = {
        getDeviceStats: jest.fn().mockResolvedValue(createDeviceStats()),
      };
      const { service } = createService({ deviceService });

      await service.getSummary('project-001');
      await service.getSummary('project-002');
      await service.getSummary('project-001');

      expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('项目隔离库仓储切换', () => {
    it('TC-DASH-009: isolated 模式使用项目独立库仓储', async () => {
      const isolatedRepo = createMockRepo(createAlarmRaw());
      const projectDbService = {
        getSystemDb: jest.fn().mockResolvedValue({
          getRepository: jest.fn().mockReturnValue(isolatedRepo),
        }),
      };
      const defaultRepo = createMockRepo(createAlarmRaw());
      const { service } = createService({
        repo: defaultRepo,
        projectDbService,
        dbMode: 'isolated',
      });

      await service.getSummary('project-001');

      expect(projectDbService.getSystemDb).toHaveBeenCalledWith('project-001');
      expect(isolatedRepo.createQueryBuilder).toHaveBeenCalled();
      expect(defaultRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
