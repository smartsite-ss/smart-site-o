// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger } from '@nestjs/common';
import { PluginManagerService } from '../plugin-manager.service';
import { PluginRegistry } from '../plugin-registry';
import { PluginDiscoveryService } from '../plugin-discovery.service';
import { PluginUpdaterService } from '../plugin-updater.service';
import { PluginConfigService, PluginRuntimeConfig } from '../plugin-config.service';
import { PluginMonitorService, MonitorData, ClearLogsResult } from '../plugin-monitor.service';
import { IsolationFactory } from '../isolation/isolation-factory';
import {
  RegisteredPlugin,
  CollectorPluginMeta,
  PluginMetrics,
  PluginCategory,
  ActiveDeviceInfo,
  DeviceStats,
  IActiveDeviceTracker,
  IsolationMode,
} from '../plugin.types';
import { ChannelValidationResult } from '../../types';

// ============================================================
// Mock 工厂
// ============================================================

function makePluginMeta(overrides: Partial<CollectorPluginMeta> = {}): CollectorPluginMeta {
  return {
    protocol: 'modbus_tcp',
    displayName: 'Modbus TCP',
    version: '1.0.0',
    description: 'Modbus TCP 采集插件',
    category: PluginCategory.INDUSTRIAL_BUS,
    transport: 'tcp',
    connectionSchema: { type: 'object', properties: {} },
    defaultConnection: { host: '127.0.0.1', port: 502 },
    supportedDataTypes: ['int16', 'uint16', 'float32'],
    enabledByDefault: true,
    isolationMode: IsolationMode.IN_PROCESS,
    ...overrides,
  };
}

function makePluginMetrics(overrides: Partial<PluginMetrics> = {}): PluginMetrics {
  return {
    totalConnections: 0,
    activeConnections: 0,
    totalReads: 0,
    totalErrors: 0,
    avgResponseTime: 0,
    uptime: 100,
    lastActivity: null,
    ...overrides,
  };
}

function makeRegisteredPlugin(overrides: Partial<RegisteredPlugin> = {}): RegisteredPlugin {
  return {
    meta: makePluginMeta(),
    adapter: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      readTag: jest.fn(),
      writeTag: jest.fn(),
      validateChannelConfig: jest.fn(),
    },
    status: 'registered',
    registeredAt: new Date('2026-01-01T00:00:00.000Z'),
    metrics: makePluginMetrics(),
    ...overrides,
  };
}

function makeMockRegistry() {
  return {
    listPlugins: jest.fn().mockReturnValue([]),
    getPlugin: jest.fn().mockReturnValue(undefined),
    getAdapter: jest.fn(),
    activate: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PluginRegistry>;
}

function makeMockDiscovery() {
  return {
    discoverPlugins: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<PluginDiscoveryService>;
}

function makeMockUpdater() {
  return {
    hotReload: jest.fn().mockResolvedValue({
      protocol: 'modbus_tcp',
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      elapsed: 100,
      success: true,
    }),
    checkUpdate: jest.fn().mockResolvedValue({
      protocol: 'modbus_tcp',
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      updateAvailable: false,
    }),
    rollback: jest.fn().mockResolvedValue({
      protocol: 'modbus_tcp',
      success: true,
    }),
  } as unknown as jest.Mocked<PluginUpdaterService>;
}

function makeMockMonitor() {
  return {
    getMonitorData: jest.fn().mockReturnValue({
      protocol: 'modbus_tcp',
      metrics: {
        heapUsed: 10,
        heapTotal: 50,
        rss: 80,
        cpuUser: 100,
        cpuSystem: 50,
        cpuUsage: 0.5,
        uptime: 1000,
      },
      processName: 'node (main: modbus_tcp)',
      processId: process.pid,
      isolationMode: IsolationMode.IN_PROCESS,
      logs: [],
      logFilePath: '/tmp/modbus_tcp.log',
    } as MonitorData),
    clearLogs: jest.fn().mockReturnValue({
      cleared: true,
      logFilePath: '/tmp/modbus_tcp.log',
      message: '日志已清空',
    } as ClearLogsResult),
    writeLog: jest.fn(),
  } as unknown as jest.Mocked<PluginMonitorService>;
}

function makeMockConfigService() {
  return {
    getConfig: jest.fn().mockReturnValue({} as PluginRuntimeConfig),
    saveConfig: jest.fn(),
  } as unknown as jest.Mocked<PluginConfigService>;
}

function makeMockIsolationFactory() {
  return {
    getExecutor: jest.fn().mockReturnValue({
      getHealth: jest.fn().mockResolvedValue({ status: 'healthy' }),
    }),
  } as unknown as jest.Mocked<IsolationFactory>;
}

function makeMockActiveDeviceTracker() {
  return {
    getActiveDeviceIds: jest.fn().mockReturnValue([]),
    getActiveDeviceInfo: jest.fn(),
    getDeviceStats: jest.fn().mockReturnValue({
      total: 0,
      online: 0,
      offline: 0,
      other: 0,
    } as DeviceStats),
  } as unknown as jest.Mocked<IActiveDeviceTracker>;
}

// ============================================================
// 测试套件
// ============================================================

describe('PluginManagerService', () => {
  let service: PluginManagerService;
  let registry: jest.Mocked<PluginRegistry>;
  let discovery: jest.Mocked<PluginDiscoveryService>;
  let updater: jest.Mocked<PluginUpdaterService>;
  let monitor: jest.Mocked<PluginMonitorService>;
  let configService: jest.Mocked<PluginConfigService>;
  let isolationFactory: jest.Mocked<IsolationFactory>;
  let activeDeviceTracker: jest.Mocked<IActiveDeviceTracker>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    registry = makeMockRegistry();
    discovery = makeMockDiscovery();
    updater = makeMockUpdater();
    monitor = makeMockMonitor();
    configService = makeMockConfigService();
    isolationFactory = makeMockIsolationFactory();
    activeDeviceTracker = makeMockActiveDeviceTracker();

    service = new PluginManagerService(
      registry,
      discovery,
      updater,
      monitor,
      configService,
      isolationFactory,
      activeDeviceTracker,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // listPlugins
  // -------------------------------------------------------------
  describe('listPlugins', () => {
    it('应将 RegisteredPlugin 转换为 PluginInfo 返回', () => {
      const plugin = makeRegisteredPlugin();
      registry.listPlugins.mockReturnValue([plugin]);

      const result = service.listPlugins();

      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe('modbus_tcp');
      expect(result[0].displayName).toBe('Modbus TCP');
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].status).toBe('registered');
    });

    it('应传递 filter 参数给 registry', () => {
      const plugin = makeRegisteredPlugin({ status: 'active' });
      registry.listPlugins.mockReturnValue([plugin]);

      service.listPlugins({ status: 'active' });

      expect(registry.listPlugins).toHaveBeenCalledWith({ status: 'active' });
    });

    it('registry 返回空数组时应返回空数组', () => {
      registry.listPlugins.mockReturnValue([]);
      expect(service.listPlugins()).toEqual([]);
    });

    it('应将 Date 类型的 registeredAt 转换为 ISO 字符串', () => {
      const date = new Date('2026-07-15T08:30:00.000Z');
      const plugin = makeRegisteredPlugin({ registeredAt: date });
      registry.listPlugins.mockReturnValue([plugin]);

      const result = service.listPlugins();
      expect(result[0].registeredAt).toBe(date.toISOString());
    });

    it('应将 Date 类型的 activatedAt 转换为 ISO 字符串', () => {
      const date = new Date('2026-07-15T08:30:00.000Z');
      const plugin = makeRegisteredPlugin({ activatedAt: date });
      registry.listPlugins.mockReturnValue([plugin]);

      const result = service.listPlugins();
      expect(result[0].activatedAt).toBe(date.toISOString());
    });

    it('未激活的插件 activatedAt 应为 undefined', () => {
      const plugin = makeRegisteredPlugin({ activatedAt: undefined });
      registry.listPlugins.mockReturnValue([plugin]);

      const result = service.listPlugins();
      expect(result[0].activatedAt).toBeUndefined();
    });

    it('未指定 isolationMode 时应默认 in_process', () => {
      const plugin = makeRegisteredPlugin();
      plugin.meta.isolationMode = undefined;
      registry.listPlugins.mockReturnValue([plugin]);

      const result = service.listPlugins();
      expect(result[0].isolationMode).toBe('in_process');
    });
  });

  // -------------------------------------------------------------
  // getPlugin
  // -------------------------------------------------------------
  describe('getPlugin', () => {
    it('插件存在时应返回 PluginInfo', () => {
      const plugin = makeRegisteredPlugin();
      registry.getPlugin.mockReturnValue(plugin);

      const result = service.getPlugin('modbus_tcp');
      expect(result).not.toBeNull();
      expect(result!.protocol).toBe('modbus_tcp');
    });

    it('插件不存在时应返回 null', () => {
      registry.getPlugin.mockReturnValue(undefined);
      expect(service.getPlugin('unknown')).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // activate / deactivate
  // -------------------------------------------------------------
  describe('activate', () => {
    it('应委托 registry.activate 并返回 PluginInfo', async () => {
      const plugin = makeRegisteredPlugin({ status: 'active' });
      registry.getPlugin.mockReturnValue(plugin);

      const result = await service.activate('modbus_tcp');

      expect(registry.activate).toHaveBeenCalledWith('modbus_tcp');
      expect(result.protocol).toBe('modbus_tcp');
      expect(result.status).toBe('active');
    });
  });

  describe('deactivate', () => {
    it('应委托 registry.deactivate 并返回 PluginInfo', async () => {
      const plugin = makeRegisteredPlugin({ status: 'inactive' });
      registry.getPlugin.mockReturnValue(plugin);

      const result = await service.deactivate('modbus_tcp');

      expect(registry.deactivate).toHaveBeenCalledWith('modbus_tcp');
      expect(result.status).toBe('inactive');
    });
  });

  // -------------------------------------------------------------
  // rediscover
  // -------------------------------------------------------------
  describe('rediscover', () => {
    it('应调用 discovery.discoverPlugins 并返回最新插件列表', async () => {
      const plugin = makeRegisteredPlugin();
      discovery.discoverPlugins.mockResolvedValue([]);
      registry.listPlugins.mockReturnValue([plugin]);

      const result = await service.rediscover();

      expect(discovery.discoverPlugins).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe('modbus_tcp');
    });
  });

  // -------------------------------------------------------------
  // hotReload / checkUpdate / rollback
  // -------------------------------------------------------------
  describe('hotReload', () => {
    it('应委托 updater.hotReload', async () => {
      const ret = await service.hotReload('modbus_tcp');
      expect(updater.hotReload).toHaveBeenCalledWith('modbus_tcp');
      expect(ret.success).toBe(true);
    });
  });

  describe('checkUpdate', () => {
    it('应委托 updater.checkUpdate', async () => {
      const ret = await service.checkUpdate('modbus_tcp');
      expect(updater.checkUpdate).toHaveBeenCalledWith('modbus_tcp');
      expect(ret.updateAvailable).toBe(false);
    });
  });

  describe('rollback', () => {
    it('应委托 updater.rollback', async () => {
      const ret = await service.rollback('modbus_tcp');
      expect(updater.rollback).toHaveBeenCalledWith('modbus_tcp');
      expect(ret.success).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // getPluginStatus
  // -------------------------------------------------------------
  describe('getPluginStatus', () => {
    it('插件存在时应返回 PluginStatus', () => {
      const date = new Date('2026-07-15T08:30:00.000Z');
      const plugin = makeRegisteredPlugin({
        status: 'active',
        registeredAt: date,
        activatedAt: date,
        metrics: makePluginMetrics({ uptime: 200 }),
      });
      registry.getPlugin.mockReturnValue(plugin);

      const result = service.getPluginStatus('modbus_tcp');

      expect(result.protocol).toBe('modbus_tcp');
      expect(result.status).toBe('active');
      expect(result.uptime).toBe(200);
      expect(result.registeredAt).toBe(date.toISOString());
      expect(result.activatedAt).toBe(date.toISOString());
    });

    it('插件不存在时应抛出错误', () => {
      registry.getPlugin.mockReturnValue(undefined);
      expect(() => service.getPluginStatus('unknown')).toThrow('Plugin not found: unknown');
    });
  });

  // -------------------------------------------------------------
  // healthCheck
  // -------------------------------------------------------------
  describe('healthCheck', () => {
    it('应返回所有插件健康报告', async () => {
      const activePlugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ protocol: 'modbus_tcp' }),
      });
      const inactivePlugin = makeRegisteredPlugin({
        status: 'inactive',
        meta: makePluginMeta({ protocol: 'opcua' }),
      });
      registry.listPlugins
        .mockReturnValueOnce([activePlugin]) // status: 'active' 过滤
        .mockReturnValueOnce([activePlugin, inactivePlugin]); // 全部

      const result = await service.healthCheck();

      expect(result.totalPlugins).toBe(2);
      expect(result.activePlugins).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].protocol).toBe('modbus_tcp');
      expect(result.results[0].status).toBe('healthy');
    });

    it('无活跃插件时应返回空 results', async () => {
      registry.listPlugins.mockReturnValue([]);
      const result = await service.healthCheck();
      expect(result.totalPlugins).toBe(0);
      expect(result.activePlugins).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // getConnectionSchema
  // -------------------------------------------------------------
  describe('getConnectionSchema', () => {
    it('插件存在时应返回 connectionSchema', () => {
      const schema = { type: 'object', properties: { host: { type: 'string' } } };
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ connectionSchema: schema }),
      });
      registry.getPlugin.mockReturnValue(plugin);

      expect(service.getConnectionSchema('modbus_tcp')).toEqual(schema);
    });

    it('插件不存在时应返回 null', () => {
      registry.getPlugin.mockReturnValue(undefined);
      expect(service.getConnectionSchema('unknown')).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // validateChannelConfig
  // -------------------------------------------------------------
  describe('validateChannelConfig', () => {
    it('应委托 adapter.validateChannelConfig', async () => {
      const validationResult: ChannelValidationResult = {
        valid: true,
        errors: [],
      };
      const adapter: any = {
        validateChannelConfig: jest.fn().mockResolvedValue(validationResult),
      };
      registry.getAdapter.mockReturnValue(adapter);

      const result = await service.validateChannelConfig('modbus_tcp', {
        host: '127.0.0.1',
      });

      expect(registry.getAdapter).toHaveBeenCalledWith('modbus_tcp');
      expect(adapter.validateChannelConfig).toHaveBeenCalledWith({
        host: '127.0.0.1',
      });
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // getPluginActiveDevices
  // -------------------------------------------------------------
  describe('getPluginActiveDevices', () => {
    it('activeDeviceTracker 未注入时应返回空数组', () => {
      const svc = new PluginManagerService(
        registry,
        discovery,
        updater,
        monitor,
        configService,
        isolationFactory,
        undefined, // 没有 tracker
      );
      expect(svc.getPluginActiveDevices('modbus_tcp')).toEqual([]);
    });

    it('应返回活跃设备信息列表', () => {
      const deviceInfo: ActiveDeviceInfo = {
        deviceId: 'dev-1',
        deviceName: '设备 1',
        projectId: 'proj-1',
        projectName: '项目 1',
        status: 'online',
        lastOnlineAt: new Date(),
        lastOfflineAt: null,
      };
      activeDeviceTracker.getActiveDeviceIds.mockReturnValue(['dev-1']);
      activeDeviceTracker.getActiveDeviceInfo.mockReturnValue(deviceInfo);

      const result = service.getPluginActiveDevices('modbus_tcp');

      expect(activeDeviceTracker.getActiveDeviceIds).toHaveBeenCalledWith('modbus_tcp');
      expect(result).toHaveLength(1);
      expect(result[0].deviceId).toBe('dev-1');
    });

    it('应过滤 getActiveDeviceInfo 返回 undefined 的设备', () => {
      activeDeviceTracker.getActiveDeviceIds.mockReturnValue(['dev-1', 'dev-2']);
      activeDeviceTracker.getActiveDeviceInfo
        .mockReturnValueOnce({
          deviceId: 'dev-1',
          deviceName: '设备 1',
          projectId: 'p',
          projectName: 'p',
          status: 'online',
          lastOnlineAt: null,
          lastOfflineAt: null,
        })
        .mockReturnValueOnce(undefined);

      const result = service.getPluginActiveDevices('modbus_tcp');
      expect(result).toHaveLength(1);
      expect(result[0].deviceId).toBe('dev-1');
    });
  });

  // -------------------------------------------------------------
  // getAllDeviceStats
  // -------------------------------------------------------------
  describe('getAllDeviceStats', () => {
    it('activeDeviceTracker 未注入时应返回空对象并记录警告', () => {
      const svc = new PluginManagerService(
        registry,
        discovery,
        updater,
        monitor,
        configService,
        isolationFactory,
        undefined,
      );
      const result = svc.getAllDeviceStats();
      expect(result).toEqual({});
    });

    it('应返回所有插件的设备统计', () => {
      const plugin1 = makeRegisteredPlugin({
        meta: makePluginMeta({ protocol: 'modbus_tcp' }),
      });
      const plugin2 = makeRegisteredPlugin({
        meta: makePluginMeta({ protocol: 'opcua' }),
      });
      registry.listPlugins.mockReturnValue([plugin1, plugin2]);

      const stats1: DeviceStats = { total: 10, online: 8, offline: 2, error: 0, other: 0 };
      const stats2: DeviceStats = { total: 5, online: 5, offline: 0, error: 0, other: 0 };
      activeDeviceTracker.getDeviceStats.mockReturnValueOnce(stats1).mockReturnValueOnce(stats2);

      const result = service.getAllDeviceStats();

      expect(result['modbus_tcp']).toEqual(stats1);
      expect(result['opcua']).toEqual(stats2);
    });
  });

  // -------------------------------------------------------------
  // getMonitorData
  // -------------------------------------------------------------
  describe('getMonitorData', () => {
    it('in_process 模式应直接返回 monitor 数据', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.getPlugin.mockReturnValue(plugin);

      const result = await service.getMonitorData('modbus_tcp');

      expect(monitor.getMonitorData).toHaveBeenCalledWith('modbus_tcp', 'in_process');
      expect(result.protocol).toBe('modbus_tcp');
    });

    it('插件不存在时应使用默认 in_process 模式', async () => {
      registry.getPlugin.mockReturnValue(undefined);
      monitor.getMonitorData.mockReturnValueOnce({
        protocol: 'unknown',
        metrics: {
          heapUsed: 0,
          heapTotal: 0,
          rss: 0,
          cpuUser: 0,
          cpuSystem: 0,
          cpuUsage: 0,
          uptime: 0,
        },
        processName: 'node (main: unknown)',
        processId: process.pid,
        isolationMode: IsolationMode.IN_PROCESS,
        logs: [],
        logFilePath: '/tmp/unknown.log',
      } as MonitorData);

      const result = await service.getMonitorData('unknown');

      expect(monitor.getMonitorData).toHaveBeenCalledWith('unknown', 'in_process');
      expect(result.protocol).toBe('unknown');
    });

    it('worker_thread 模式应从 executor 获取运行时信息', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.WORKER_THREAD }),
      });
      registry.getPlugin.mockReturnValue(plugin);
      const executor = {
        getHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          threadId: 12345,
          uptime: 50000,
        }),
      };
      isolationFactory.getExecutor.mockReturnValue(executor as any);

      const result = await service.getMonitorData('modbus_tcp');

      expect(result.threadId).toBe(12345);
      expect(result.processName).toBe('worker (modbus_tcp)');
      expect(result.metrics.uptime).toBe(50);
    });

    it('child_process 模式应从 executor 获取 PID', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.CHILD_PROCESS }),
      });
      registry.getPlugin.mockReturnValue(plugin);
      const executor = {
        getHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          pid: 9999,
          uptime: 30000,
        }),
      };
      isolationFactory.getExecutor.mockReturnValue(executor as any);

      const result = await service.getMonitorData('modbus_tcp');

      expect(result.processId).toBe(9999);
      expect(result.metrics.uptime).toBe(30);
    });

    it('executor 抛错时应保持 monitor 主进程数据', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.WORKER_THREAD }),
      });
      registry.getPlugin.mockReturnValue(plugin);
      isolationFactory.getExecutor.mockImplementation(() => {
        throw new Error('executor not started');
      });

      const result = await service.getMonitorData('modbus_tcp');
      // 不应抛错，保持 monitor 返回的主进程数据
      expect(result.protocol).toBe('modbus_tcp');
    });
  });

  // -------------------------------------------------------------
  // clearPluginLogs / writePluginLog
  // -------------------------------------------------------------
  describe('clearPluginLogs', () => {
    it('应委托 monitor.clearLogs', () => {
      const result = service.clearPluginLogs('modbus_tcp');
      expect(monitor.clearLogs).toHaveBeenCalledWith('modbus_tcp');
      expect(result.cleared).toBe(true);
    });
  });

  describe('writePluginLog', () => {
    it('应委托 monitor.writeLog', () => {
      service.writePluginLog('modbus_tcp', 'INFO', '采集开始');
      expect(monitor.writeLog).toHaveBeenCalledWith('modbus_tcp', 'INFO', '采集开始');
    });
  });

  // -------------------------------------------------------------
  // getPluginConfig / updatePluginConfig / setPluginIsolationMode
  // -------------------------------------------------------------
  describe('getPluginConfig', () => {
    it('应委托 configService.getConfig', () => {
      const config: PluginRuntimeConfig = { isolationMode: IsolationMode.WORKER_THREAD };
      configService.getConfig.mockReturnValue(config);

      const result = service.getPluginConfig('modbus_tcp');
      expect(configService.getConfig).toHaveBeenCalledWith('modbus_tcp');
      expect(result.isolationMode).toBe('worker_thread');
    });
  });

  describe('updatePluginConfig', () => {
    it('应委托 configService.saveConfig 并返回合并后的配置', async () => {
      const merged: PluginRuntimeConfig = { isolationMode: IsolationMode.WORKER_THREAD };
      configService.saveConfig.mockReturnValue(merged);

      const result = await service.updatePluginConfig('modbus_tcp', {
        isolationMode: IsolationMode.WORKER_THREAD,
      });

      expect(configService.saveConfig).toHaveBeenCalledWith('modbus_tcp', {
        isolationMode: IsolationMode.WORKER_THREAD,
      });
      expect(result.isolationMode).toBe('worker_thread');
    });

    it('修改 isolationMode 时应同步更新 plugin.meta.isolationMode', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.getPlugin.mockReturnValue(plugin);
      const merged: PluginRuntimeConfig = { isolationMode: IsolationMode.WORKER_THREAD };
      configService.saveConfig.mockReturnValue(merged);

      await service.updatePluginConfig('modbus_tcp', {
        isolationMode: IsolationMode.WORKER_THREAD,
      });

      expect(plugin.meta.isolationMode).toBe('worker_thread');
    });

    it('插件不存在时不应抛错（只不更新 meta）', async () => {
      registry.getPlugin.mockReturnValue(undefined);
      const merged: PluginRuntimeConfig = { isolationMode: IsolationMode.WORKER_THREAD };
      configService.saveConfig.mockReturnValue(merged);

      const result = await service.updatePluginConfig('unknown', {
        isolationMode: IsolationMode.WORKER_THREAD,
      });

      expect(result.isolationMode).toBe('worker_thread');
    });

    it('未修改 isolationMode 时不应更新 meta', async () => {
      const plugin = makeRegisteredPlugin({
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.getPlugin.mockReturnValue(plugin);
      const merged: PluginRuntimeConfig = {}; // 没改 isolationMode
      configService.saveConfig.mockReturnValue(merged);

      await service.updatePluginConfig('modbus_tcp', {});

      expect(plugin.meta.isolationMode).toBe('in_process'); // 保持原值
    });
  });

  describe('setPluginIsolationMode', () => {
    it('应等价于调用 updatePluginConfig({ isolationMode })', async () => {
      const merged: PluginRuntimeConfig = { isolationMode: IsolationMode.CHILD_PROCESS };
      configService.saveConfig.mockReturnValue(merged);

      await service.setPluginIsolationMode('modbus_tcp', 'child_process');

      expect(configService.saveConfig).toHaveBeenCalledWith('modbus_tcp', {
        isolationMode: IsolationMode.CHILD_PROCESS,
      });
    });
  });

  // -------------------------------------------------------------
  // setPipelineMetricsService / listPluginsWithRuntime
  // -------------------------------------------------------------
  describe('setPipelineMetricsService', () => {
    it('应允许后续 listPluginsWithRuntime 合并真实指标', async () => {
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.listPlugins.mockReturnValue([plugin]);

      const mockMetricsService = {
        getProtocolMetrics: jest.fn().mockReturnValue({
          totalConnections: 10,
          activeConnections: 5,
          totalReads: 1000,
          totalErrors: 3,
          avgResponseTime: 50,
          lastActivity: new Date('2026-07-15T08:30:00.000Z'),
        }),
      } as any;

      service.setPipelineMetricsService(mockMetricsService);

      const result = await service.listPluginsWithRuntime();

      expect(mockMetricsService.getProtocolMetrics).toHaveBeenCalledWith('modbus_tcp');
      expect(result[0].metrics.totalReads).toBe(1000);
      expect(result[0].metrics.totalErrors).toBe(3);
      expect(result[0].metrics.activeConnections).toBe(5);
    });
  });

  describe('listPluginsWithRuntime', () => {
    it('无 isolationFactory 时应直接返回 listPlugins 结果', async () => {
      const svc = new PluginManagerService(
        registry,
        discovery,
        updater,
        monitor,
        configService,
        undefined, // 无 isolationFactory
        undefined,
      );
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.listPlugins.mockReturnValue([plugin]);

      const result = await svc.listPluginsWithRuntime();
      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe('modbus_tcp');
    });

    it('in_process 模式应设置主进程信息', async () => {
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.IN_PROCESS }),
      });
      registry.listPlugins.mockReturnValue([plugin]);

      const result = await service.listPluginsWithRuntime();

      expect(result[0].processId).toBe(process.pid);
      expect(result[0].processName).toBe('node (main: modbus_tcp)');
    });

    it('worker_thread 模式应从 executor 获取线程 ID', async () => {
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.WORKER_THREAD }),
      });
      registry.listPlugins.mockReturnValue([plugin]);
      const executor = {
        getHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          threadId: 9999,
        }),
      };
      isolationFactory.getExecutor.mockReturnValue(executor as any);

      const result = await service.listPluginsWithRuntime();

      expect(result[0].threadId).toBe(9999);
      expect(result[0].processName).toBe('worker (modbus_tcp)');
    });

    it('child_process 模式应从 executor 获取 PID', async () => {
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.CHILD_PROCESS }),
      });
      registry.listPlugins.mockReturnValue([plugin]);
      const executor = {
        getHealth: jest.fn().mockResolvedValue({
          status: 'healthy',
          pid: 1234,
        }),
      };
      isolationFactory.getExecutor.mockReturnValue(executor as any);

      const result = await service.listPluginsWithRuntime();

      expect(result[0].processId).toBe(1234);
    });

    it('executor 抛错时应保持 in_process 默认值', async () => {
      const plugin = makeRegisteredPlugin({
        status: 'active',
        meta: makePluginMeta({ isolationMode: IsolationMode.WORKER_THREAD }),
      });
      registry.listPlugins.mockReturnValue([plugin]);
      isolationFactory.getExecutor.mockImplementation(() => {
        throw new Error('executor not started');
      });

      const result = await service.listPluginsWithRuntime();
      // 不应抛错
      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe('modbus_tcp');
    });
  });
});
