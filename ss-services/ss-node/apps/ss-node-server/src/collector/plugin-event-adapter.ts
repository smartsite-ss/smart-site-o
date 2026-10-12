// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventBusService, DeviceStateManager, ProjectDatabaseService } from '@ss-node/ss-core';
import { PluginRegistry, PluginLifecycleEvent } from '@ss-node/ss-collector-sdk';
import { DataTag } from '@ss-node/ss-device';
import { DeviceLoadingService } from './device-loading.service';
import { TaskRegistrationService } from './task-registration.service';
import { DevicePersistenceService } from './device-persistence.service';

/**
 * 插件事件适配器
 *
 * 负责订阅和处理插件生命周期事件（注册/激活/停用）以及设备状态变更事件，
 * 协调各子服务完成设备重载、任务注册和状态持久化。
 */
@Injectable()
export class PluginEventAdapter {
  private readonly logger = new Logger(PluginEventAdapter.name);

  /** 可用项目列表（由 Bootstrap 更新） */
  private availableProjects: string[] = [];

  /** 插件就绪回调 */
  private onPluginsReady?: () => void;

  /** 插件是否已就绪 */
  private pluginsReady = false;
  private registeredPluginCount = 0;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly deviceLoadingService: DeviceLoadingService,
    private readonly taskRegistrationService: TaskRegistrationService,
    private readonly devicePersistenceService: DevicePersistenceService,
    private readonly deviceStateManager: DeviceStateManager,
    private readonly projectDbService: ProjectDatabaseService,
    @Optional() private readonly pluginRegistry?: PluginRegistry,
  ) {}

  /** 更新可用项目列表 */
  setAvailableProjects(projects: string[]): void {
    this.availableProjects = projects;
  }

  /**
   * 监听插件注册完成，就绪后触发回调
   *
   * @param onReady 插件就绪回调
   */
  listenForPluginsReady(onReady: () => void): void {
    this.onPluginsReady = onReady;

    // 若 PluginRegistry 未注入，直接触发回调
    if (!this.pluginRegistry) {
      this.logger.warn('PluginRegistry not available, loading devices without plugin filtering');
      this.pluginsReady = true;
      // 延迟 100ms 启动设备加载，让 HTTP 服务器先就绪，避免阻塞 app.listen()
      setTimeout(() => this.onPluginsReady?.(), 100);
      return;
    }

    const currentPlugins = this.pluginRegistry.listPlugins();
    this.registeredPluginCount = currentPlugins.length;

    // 监听后续的 plugin.registered 事件
    this.eventBus.on('plugin.registered', (event: PluginLifecycleEvent) => {
      this.registeredPluginCount++;
      this.logger.log(`Plugin registered (${this.registeredPluginCount}): ${event.protocol}`);

      // 一旦至少有一个插件，就开始加载设备
      if (!this.pluginsReady && this.registeredPluginCount >= 1) {
        this.pluginsReady = true;
        this.onPluginsReady?.();
      }
    });

    // 如果已有插件，直接开始
    if (currentPlugins.length > 0) {
      this.pluginsReady = true;
      // 延迟 100ms 启动设备加载，让 HTTP 服务器先就绪，避免阻塞 app.listen()
      setTimeout(() => this.onPluginsReady?.(), 100);
    }
  }

  /**
   * 订阅插件生命周期事件和设备状态变更事件
   */
  subscribeToPluginEvents(): void {
    // DeviceStateManager 统一发射 device:statusChanged 事件
    // 监听取 dirty 标记用于持久化
    this.eventBus.on(
      'device:statusChanged',
      (event: { deviceId: string; previousStatus: string }) => {
        this.devicePersistenceService.markDeviceDirty(event.deviceId);
      },
    );

    // 插件激活后重新扫描设备，拾取匹配该协议的设备
    this.eventBus.on('plugin.activated', (event: PluginLifecycleEvent) => {
      this.logger.log(`Plugin activated: ${event.protocol} — reloading devices`);
      this.handlePluginActivated(event.protocol.toLowerCase());
    });

    // 插件停用时将该协议所有在线设备标记为离线
    this.eventBus.on('plugin.deactivated', (event: PluginLifecycleEvent) => {
      this.handlePluginDeactivated(event.protocol.toLowerCase());
    });

    // 插件隔离体崩溃：将该协议所有设备标记为错误，携带崩溃详情
    this.eventBus.on(
      'plugin.isolation.crash',
      (event: { protocol: string; error: string; mode: string }) => {
        this.handlePluginIsolationCrash(event.protocol.toLowerCase(), event.error, event.mode);
      },
    );

    this.logger.log('Plugin event subscriptions initialized');
  }

  /**
   * 处理插件激活事件：重新加载匹配协议的设备并注册采集任务
   */
  private async handlePluginActivated(protocol: string): Promise<void> {
    try {
      const skipDeviceIds = this.taskRegistrationService.getRegisteredDeviceIds();
      const newDevices = await this.deviceLoadingService.reloadDevicesForProtocol(
        protocol,
        this.availableProjects,
        skipDeviceIds,
      );

      // 为新设备注册采集任务
      for (const device of newDevices) {
        const ds = await this.projectDbService.getSystemDb(
          this.deviceStateManager.getState(device.id)?.projectId || '',
        );
        const tagRepo = ds.getRepository(DataTag);
        const projectName = this.deviceStateManager.getState(device.id)?.projectId || '';
        await this.taskRegistrationService.registerTasksForDevice(
          device,
          protocol,
          tagRepo,
          projectName,
        );
      }

      const totalTasks = this.taskRegistrationService.getTaskCount();
      this.logger.log(
        `Plugin "${protocol}" activation complete: +${newDevices.length} devices, total tasks: ${totalTasks}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle plugin activation for "${protocol}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * 处理插件停用事件：将该协议所有设备标记为离线
   */
  private handlePluginDeactivated(protocol: string): void {
    const deviceIds = this.deviceStateManager.getDeviceIdsByProtocol(protocol);
    this.logger.log(
      `Plugin deactivated: ${protocol} — marking ${deviceIds.length} devices offline`,
    );

    for (const deviceId of deviceIds) {
      this.deviceStateManager.setOffline(deviceId, 'Plugin deactivated');
      this.devicePersistenceService.markDeviceDirty(deviceId);
    }
  }

  /**
   * 处理插件隔离体崩溃事件：将该协议所有设备标记为错误
   */
  private handlePluginIsolationCrash(protocol: string, errorMsg: string, mode: string): void {
    const deviceIds = this.deviceStateManager.getDeviceIdsByProtocol(protocol);
    if (deviceIds.length === 0) return;

    const errorDetail = `Plugin isolation crash (${mode}): ${errorMsg}`;
    this.logger.warn(
      `Plugin isolation crash: ${protocol} (${mode}) — marking ${deviceIds.length} devices as error`,
    );

    for (const deviceId of deviceIds) {
      this.deviceStateManager.setError(deviceId, errorDetail);
      this.deviceStateManager.setDiagnostics(deviceId, {
        circuitState: 'open',
        lastErrorAt: Date.now(),
      });
      this.devicePersistenceService.markDeviceDirty(deviceId);
    }
  }
}
