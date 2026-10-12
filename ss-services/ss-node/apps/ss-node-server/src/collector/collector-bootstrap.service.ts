// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import {
  DeviceStateManager,
  DeviceStateRecord,
  ProjectDatabaseService,
  EventBusService,
  EventLogService,
} from '@ss-node/ss-core';
import { Device, DataTag } from '@ss-node/ss-device';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { IActiveDeviceTracker, ActiveDeviceInfo, DeviceStats } from '@ss-node/ss-collector-sdk';
import type { DeviceTagsChangedEvent, TemplateDevicesSyncedEvent } from '@ss-node/ss-core';

import { DeviceLoadingService } from './device-loading.service';
import { TaskRegistrationService } from './task-registration.service';
import { DevicePersistenceService } from './device-persistence.service';
import { PluginEventAdapter } from './plugin-event-adapter';

/**
 * 采集启动引导器（协调层）
 *
 * 在 NestJS 应用完成所有模块初始化后（OnApplicationBootstrap）执行：
 * 1. 等待插件注册完毕
 * 2. 扫描所有项目目录 → 加载设备 → 注册采集任务
 * 3. 启动周期性状态持久化
 * 4. 订阅插件生命周期事件
 *
 * 职责已拆分到以下子服务：
 * - DeviceLoadingService       → 设备加载与状态注册
 * - TaskRegistrationService    → 采集任务注册与管理
 * - DevicePersistenceService   → 设备状态持久化
 * - PluginEventAdapter         → 插件事件处理
 *
 * 业务效果追踪（#6 事件持久化）：
 * - project:enabled / project:disabled / device.tagsChanged 事件通过 wrapSubscriber 包装
 * - handler 返回业务效果对象（devicesLoaded / tasksRegistered / protocolsActive 等）
 * - 失败时由 wrapSubscriber 记录为 failed，外层 catch 避免 unhandled rejection
 */
@Injectable()
export class DeviceCollectorBootstrap
  implements OnApplicationBootstrap, OnModuleDestroy, IActiveDeviceTracker
{
  private readonly logger = new Logger(DeviceCollectorBootstrap.name);

  /** 已发现的项目列表（供重载使用） */
  private availableProjects: string[] = [];

  constructor(
    private readonly deviceLoadingService: DeviceLoadingService,
    private readonly taskRegistrationService: TaskRegistrationService,
    private readonly devicePersistenceService: DevicePersistenceService,
    private readonly pluginEventAdapter: PluginEventAdapter,
    private readonly deviceStateManager: DeviceStateManager,
    private readonly configService: ConfigService,
    private readonly projectDbService: ProjectDatabaseService,
    private readonly eventBus: EventBusService,
    /** 事件日志服务 — 用于追踪 handler 的处理结果和业务效果（#6 事件持久化） */
    @Optional() private readonly eventLogService?: EventLogService,
  ) {}

  /**
   * 包装事件 handler：通过 EventLogService.wrapSubscriber 自动追踪处理结果和业务效果
   *
   * - 若 EventLogService 可用，记录处理状态（processing/processed/failed）和业务效果
   * - 外层 try/catch 捕获 wrapSubscriber 重新抛出的错误，避免 unhandled rejection
   * - 失败时仍记录业务效果（如部分加载的设备数）
   */
  private wrapHandler<T extends any[]>(
    eventType: string,
    subscriberName: string,
    handler: (...args: T) => Promise<Record<string, any> | void>,
  ): (...args: T) => Promise<void> {
    const traced = this.eventLogService
      ? this.eventLogService.wrapSubscriber(eventType, subscriberName, handler)
      : async (...args: T) => {
          await handler(...args);
        };

    return async (...args: T) => {
      try {
        await traced(...args);
      } catch (err) {
        this.logger.error(
          `Handler for ${eventType} failed: ${(err as Error).message}`,
        );
      }
    };
  }

  // -----------------------------------------------------------------------
  //  生命周期
  // -----------------------------------------------------------------------

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('CollectorBootstrap starting - waiting for plugin registration...');

    // 订阅设备标签变更事件（模板同步 / 标签修改 → 采集层重载任务）
    // 通过 wrapHandler 包装，自动记录处理状态和业务效果（#6 事件持久化）
    this.eventBus.on(
      'device.tagsChanged',
      this.wrapHandler(
        'device.tagsChanged',
        'DeviceCollectorBootstrap',
        async (event: DeviceTagsChangedEvent): Promise<Record<string, any>> => {
          this.logger.log(
            `Tags changed for device ${event.deviceId} (${event.changeType}), reloading tasks...`,
          );
          const ds = await this.projectDbService.getSystemDb(event.projectId);
          const tagRepo = ds.getRepository(DataTag);
          const deviceRepo = ds.getRepository(Device);
          const device = await deviceRepo.findOne({
            where: { id: event.deviceId },
          });
          if (!device) {
            this.logger.warn(
              `Device ${event.deviceId} not found in project ${event.projectId}, skip tag reload`,
            );
            return {
              deviceId: event.deviceId,
              tasksReloaded: 0,
              tagsCount: 0,
              deviceFound: false,
            };
          }

          const tagsCount = await tagRepo.count({
            where: { deviceId: event.deviceId },
          });
          await this.taskRegistrationService.reloadDeviceTasks(
            event.deviceId,
            event.projectId,
            event.protocol,
            device,
            tagRepo,
          );

          // 驱动切换时同步更新 DeviceStateManager 中的 protocol，避免按协议查询时结果错误
          let protocolUpdated = false;
          if (event.changeType === 'driver_switch') {
            this.deviceStateManager.registerDevice({
              deviceId: event.deviceId,
              projectId: event.projectId,
              protocol: event.protocol,
            });
            protocolUpdated = true;
            this.logger.log(
              `DeviceStateManager protocol updated for ${event.deviceId} → ${event.protocol}`,
            );
          }

          return {
            deviceId: event.deviceId,
            tasksReloaded: 1,
            tagsCount,
            protocol: event.protocol,
            changeType: event.changeType,
            protocolUpdated,
            deviceFound: true,
          };
        },
      ),
    );

    // ★ 订阅模板同步批量事件 — 分批并行重载所有受影响设备的点表
    this.eventBus.on('template.devices-synced', async (event: TemplateDevicesSyncedEvent) => {
      const { deviceIds, projectId, protocol, summary } = event;
      this.logger.log(
        `模板同步完成: ${deviceIds.length} 设备需重载点表` +
          (summary ? ` (新增${summary.added} 修改${summary.updated} 删除${summary.removed})` : ''),
      );

      const ds = await this.projectDbService.getSystemDb(projectId);
      const tagRepo = ds.getRepository(DataTag);
      const deviceRepo = ds.getRepository(Device);

      // 分批并行，控制 SQLite 并发上限
      const BATCH = 15;
      for (let i = 0; i < deviceIds.length; i += BATCH) {
        await Promise.all(
          deviceIds.slice(i, i + BATCH).map(async (deviceId) => {
            try {
              const device = await deviceRepo.findOne({ where: { id: deviceId } });
              if (!device) return;
              await this.taskRegistrationService.reloadDeviceTasks(
                deviceId,
                projectId,
                protocol,
                device,
                tagRepo,
              );
            } catch (err: any) {
              this.logger.error(`设备 ${deviceId} 点表重载失败: ${err.message}`);
            }
          }),
        );
      }

      this.logger.log(`模板同步点表重载完成: ${deviceIds.length} 设备`);
    });

    // 订阅项目启用状态变更事件（动态启停采集）
    // - project:enabled  → 加载该项目设备并注册采集任务
    // - project:disabled → 停止该项目所有设备任务并注销状态记录
    this.subscribeToProjectStatusChanges();

    // 订阅插件生命周期事件（激活/停用）
    this.pluginEventAdapter.subscribeToPluginEvents();

    // 启动周期性持久化
    this.devicePersistenceService.startPeriodicPersistence();

    // 监听插件注册完成，就绪后开始加载设备
    this.pluginEventAdapter.listenForPluginsReady(() => {
      this.startDeviceLoading();
    });

    this.logger.log('CollectorBootstrap initialized, awaiting plugins...');
  }

  onModuleDestroy(): void {
    this.devicePersistenceService.stopPeriodicPersistence();
    this.logger.log('CollectorBootstrap destroyed');
  }

  // -----------------------------------------------------------------------
  //  IActiveDeviceTracker 实现
  // -----------------------------------------------------------------------

  getActiveDeviceIds(protocol: string): string[] {
    return this.deviceStateManager.getDeviceIdsByProtocol(protocol.toLowerCase());
  }

  getActiveDeviceInfo(deviceId: string): ActiveDeviceInfo | undefined {
    const state = this.deviceStateManager.getState(deviceId);
    if (!state) return undefined;
    const deviceName = this.deviceLoadingService.getDeviceName(deviceId);
    return {
      deviceId: state.deviceId,
      deviceName,
      projectId: state.projectId,
      projectName: state.projectId,
      status:
        state.status === DeviceStatus.ONLINE
          ? 'online'
          : state.status === DeviceStatus.OFFLINE
            ? 'offline'
            : state.status === DeviceStatus.CONNECTING
              ? 'connecting'
              : 'error',
      lastOnlineAt: state.lastOnlineAt ? new Date(state.lastOnlineAt) : null,
      lastOfflineAt: state.lastOfflineAt ? new Date(state.lastOfflineAt) : null,
    };
  }

  getDeviceStats(protocol: string): DeviceStats {
    return this.deviceStateManager.getStatsByProtocol(protocol.toLowerCase());
  }

  // -----------------------------------------------------------------------
  //  项目启用状态变更（动态启停采集）
  // -----------------------------------------------------------------------

  /**
   * 订阅项目启用状态变更事件
   *
   * - `project:enabled`  → 加载项目设备并注册采集任务，同时纳入 availableProjects
   * - `project:disabled` → 停止该项目所有设备任务，注销 DeviceStateManager 记录
   *
   * 触发方：ProjectService.update() 检测到 enabled 字段变化时通过 EventBus 发射。
   *
   * 业务效果追踪（#6 事件持久化）：
   * - 通过 wrapHandler 包装，自动记录处理状态和业务效果
   * - project:enabled 返回 { devicesLoaded, tasksRegistered, protocolsActive, dataSourceOpened }
   * - project:disabled 返回 { devicesUnregistered, tasksStopped }
   */
  private subscribeToProjectStatusChanges(): void {
    this.eventBus.on(
      'project:enabled',
      this.wrapHandler(
        'project:enabled',
        'DeviceCollectorBootstrap',
        async (payload: { projectId: string }): Promise<Record<string, any>> => {
          const { projectId } = payload;
          this.logger.log(`Event "project:enabled" received: ${projectId}`);

          // 纳入可用项目列表（去重）
          if (!this.availableProjects.includes(projectId)) {
            this.availableProjects.push(projectId);
            this.pluginEventAdapter.setAvailableProjects(this.availableProjects);
          }

          // 加载设备并注册状态（DeviceLoadingService 内部已注册到 DeviceStateManager）
          const loadedByProtocol =
            await this.deviceLoadingService.loadProjectDevices(projectId);

          // 为加载的设备注册采集任务
          await this.registerTasksForLoadedDevices(loadedByProtocol);

          const totalLoaded = Object.values(loadedByProtocol).reduce(
            (sum, devices) => sum + devices.length,
            0,
          );
          this.logger.log(
            `Project ${projectId} enabled: ${totalLoaded} devices loaded, tasks registered`,
          );

          return {
            projectId,
            devicesLoaded: totalLoaded,
            tasksRegistered: totalLoaded,
            protocolsActive: Object.keys(loadedByProtocol),
            dataSourceOpened: true,
          };
        },
      ),
    );

    this.eventBus.on(
      'project:disabled',
      this.wrapHandler(
        'project:disabled',
        'DeviceCollectorBootstrap',
        async (payload: { projectId: string }): Promise<Record<string, any>> => {
          const { projectId } = payload;
          this.logger.log(`Event "project:disabled" received: ${projectId}`);

          // 先注销 DeviceStateManager 中该项目的设备，并拿到设备 ID 列表
          const deviceIds = this.deviceStateManager.unregisterProjectDevices(projectId);

          // 停止这些设备的采集任务（注销调度任务并清理 deviceTaskMap）
          this.taskRegistrationService.stopProjectTasks(deviceIds);

          // 从可用项目列表中移除
          const idx = this.availableProjects.indexOf(projectId);
          if (idx >= 0) {
            this.availableProjects.splice(idx, 1);
            this.pluginEventAdapter.setAvailableProjects(this.availableProjects);
          }

          // 清理 DeviceLoadingService 中的设备名映射（避免内存泄漏）
          for (const deviceId of deviceIds) {
            this.deviceLoadingService.deleteDeviceName(deviceId);
          }

          this.logger.log(
            `Project ${projectId} disabled: ${deviceIds.length} devices unregistered, tasks stopped`,
          );

          return {
            projectId,
            devicesUnregistered: deviceIds.length,
            tasksStopped: deviceIds.length,
          };
        },
      ),
    );
  }

  // -----------------------------------------------------------------------
  //  设备加载流程
  // -----------------------------------------------------------------------

  /**
   * 启动设备加载流程：
   * 扫描项目目录 → 加载设备 → 注册采集任务 → 补偿已激活插件
   */
  private async startDeviceLoading(): Promise<void> {
    this.logger.log('Starting device loading from project databases...');

    try {
      const projectsDir = this.resolveProjectsDir();
      const result = await this.deviceLoadingService.loadAllDevices(projectsDir);

      // 更新可用项目列表
      this.availableProjects = this.scanProjectNames(projectsDir);
      this.pluginEventAdapter.setAvailableProjects(this.availableProjects);

      // 为加载的设备注册采集任务
      await this.registerTasksForLoadedDevices(result.loadedByProtocol);

      const totalDevices = this.deviceStateManager.getAllStates().size;
      const totalTasks = this.taskRegistrationService.getTaskCount();
      // 按协议分组的设备统计（诊断用）
      const allStats = this.deviceStateManager.getAllStats();
      const byProtocol: Record<string, number> = {};
      for (const [protocol, stats] of Object.entries(allStats)) {
        byProtocol[protocol] = stats.total;
      }
      this.logger.log(
        `Device loading complete: ${totalDevices} devices by protocol: ${JSON.stringify(byProtocol)}, ${totalTasks} tasks registered`,
      );

      // 补偿已激活的插件：若插件在 CollectorBootstrap 订阅前就已激活
      await this.compensateActivePlugins();
    } catch (error) {
      this.logger.error(`Device loading failed: ${(error as Error).message}`);
    }
  }

  /**
   * 为已加载的设备注册采集任务
   */
  private async registerTasksForLoadedDevices(
    loadedByProtocol: Record<string, Device[]>,
  ): Promise<void> {
    for (const [protocol, devices] of Object.entries(loadedByProtocol)) {
      for (const device of devices) {
        const ds = await this.projectDbService.getSystemDb(device.projectId);
        const tagRepo = ds.getRepository(DataTag);
        await this.taskRegistrationService.registerTasksForDevice(
          device,
          protocol,
          tagRepo,
          device.projectId,
        );
      }
    }
  }

  /**
   * 补偿已激活的插件：检查哪些活跃插件没有设备记录，重新扫描加载
   */
  private async compensateActivePlugins(): Promise<void> {
    const skipDeviceIds = this.taskRegistrationService.getRegisteredDeviceIds();
    const compensationResults = await this.deviceLoadingService.compensateActivePlugins(
      this.availableProjects,
      skipDeviceIds,
    );

    for (const { protocol, devices } of compensationResults) {
      for (const device of devices) {
        const ds = await this.projectDbService.getSystemDb(device.projectId);
        const tagRepo = ds.getRepository(DataTag);
        await this.taskRegistrationService.registerTasksForDevice(
          device,
          protocol,
          tagRepo,
          device.projectId,
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  //  公开查询 API（供调试/监控）
  // -----------------------------------------------------------------------

  getDeviceStateEntries(): ReadonlyMap<string, DeviceStateRecord> {
    return this.deviceStateManager.getAllStates();
  }

  getDeviceTaskCount(): number {
    return this.taskRegistrationService.getTaskCount();
  }

  // -----------------------------------------------------------------------
  //  批量设备操作
  // -----------------------------------------------------------------------

  /** 启用设备采集 */
  async enableDevice(deviceId: string): Promise<void> {
    this.taskRegistrationService.enableDeviceTasks(deviceId);
  }

  /** 禁用设备采集 */
  async disableDevice(deviceId: string): Promise<void> {
    this.taskRegistrationService.disableDeviceTasks(deviceId);
  }

  /** 批量启用设备 */
  async enableDevices(deviceIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    return this.taskRegistrationService.enableDevices(deviceIds);
  }

  /** 批量禁用设备 */
  async disableDevices(deviceIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    return this.taskRegistrationService.disableDevices(deviceIds);
  }

  /** 获取设备采集启用状态 */
  isDeviceEnabled(deviceId: string): boolean {
    return this.taskRegistrationService.isDeviceTasksEnabled(deviceId);
  }

  // -----------------------------------------------------------------------
  //  工具方法
  // -----------------------------------------------------------------------

  /**
   * 解析 PROJECTS_DIR 配置为绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 apps/ss-node-server/src/collector/ 或 dist/collector/）
   *   .env.ss 中 PROJECTS_DIR=${DATA_DIR}/projects，DATA_DIR=../../ss-run/ss/data 相对于 ss-services/ss-node 解析
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *   .env 中 PROJECTS_DIR=../../data/projects 相对于该目录解析
   *
   * 修复历史：v1.4 之前用 process.cwd()，dev 模式下 cwd = apps/ss-node-server，
   * 导致 ../../ss-run/ss/data/projects 被解析为 ss-services/ss-node/ss-run/...（不存在），
   * DeviceLoadingService 扫描不到项目目录，启动时 "Found 0 project directories"。
   * 与 project.service.ts getProjectsDir()、app.module.ts getDatabaseConfig() 保持一致。
   */
  private resolveProjectsDir(): string {
    const rawDir = this.configService.get<string>('PROJECTS_DIR') || '';
    if (!rawDir) {
      // 未配置时，回退到默认项目目录
      const fallbackRoot =
        process.env.NODE_ENV === 'production'
          ? process.cwd()
          : path.resolve(__dirname, '..', '..', '..', '..');
      return path.resolve(fallbackRoot, 'data', 'projects');
    }
    if (path.isAbsolute(rawDir)) {
      return rawDir;
    }
    const projectRoot =
      process.env.NODE_ENV === 'production'
        ? process.cwd()
        : path.resolve(__dirname, '..', '..', '..', '..');
    return path.resolve(projectRoot, rawDir);
  }

  /**
   * 扫描项目目录名列表（仅启用项目）
   *
   * 与 DeviceLoadingService.scanProjectDirectories 保持一致：
   * 读取每个项目的 projectinfo.json，仅返回 enabled === true 的项目。
   * 停用项目不纳入 availableProjects，避免 compensateActivePlugins 误加载其设备。
   */
  private scanProjectNames(projectsDir: string): string[] {
    if (!fs.existsSync(projectsDir)) return [];
    return fs
      .readdirSync(projectsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((projectName) => {
        try {
          const infoPath = path.join(projectsDir, projectName, 'projectinfo.json');
          if (!fs.existsSync(infoPath)) return false;
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
          if (info.enabled !== true) {
            this.logger.log(`Skipping disabled project: ${projectName} (enabled=false)`);
            return false;
          }
          return true;
        } catch {
          return false;
        }
      });
  }
}
