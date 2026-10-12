// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DeviceStateManager, ProjectDatabaseService } from '@ss-node/ss-core';
import { PluginRegistry } from '@ss-node/ss-collector-sdk';
import { Device } from '@ss-node/ss-device';
import { DeviceStatus } from '@ss-node/ss-sdk';
import { DataSource } from 'typeorm';

/** 设备加载结果 */
export interface DeviceLoadingResult {
  totalDevices: number;
  loadedByProtocol: Record<string, Device[]>;
  skippedDevices: number;
}

/**
 * 设备加载服务
 *
 * 负责从项目数据库中扫描和加载设备，按协议分组，
 * 并将设备注册到 DeviceStateManager 进行状态追踪。
 */
@Injectable()
export class DeviceLoadingService {
  private readonly logger = new Logger(DeviceLoadingService.name);

  /** 设备名称映射（供 IActiveDeviceTracker 查询） */
  private readonly deviceNameMap = new Map<string, string>();

  constructor(
    private readonly projectDbService: ProjectDatabaseService,
    @Optional() private readonly pluginRegistry?: PluginRegistry,
    private readonly deviceStateManager?: DeviceStateManager,
  ) {}

  /**
   * 从所有项目中加载设备
   *
   * @param projectsDir 项目目录路径
   * @returns 按协议分组的设备加载结果
   */
  async loadAllDevices(projectsDir: string): Promise<DeviceLoadingResult> {
    const projectDirs = this.scanProjectDirectories(projectsDir);
    this.logger.log(`Found ${projectDirs.length} project directories`);

    const result: DeviceLoadingResult = {
      totalDevices: 0,
      loadedByProtocol: {},
      skippedDevices: 0,
    };

    // 并行加载所有项目数据库（不限制并发数）
    const projectResults = await Promise.all(
      projectDirs.map((projectName) => this.loadDevicesFromProject(projectName)),
    );

    for (const projectResult of projectResults) {
      this.mergeResults(result, projectResult);
    }

    return result;
  }

  /**
   * 加载单个启用项目的设备（运行时启用项目时调用）
   *
   * @param projectId 项目 ID
   * @returns 按协议分组的设备列表
   */
  async loadProjectDevices(projectId: string): Promise<Record<string, Device[]>> {
    const result = await this.loadDevicesFromProject(projectId);
    this.logger.log(
      `Loaded ${result.totalDevices} devices from project ${projectId} (enabled at runtime)`,
    );
    return result.loadedByProtocol;
  }

  /**
   * 为特定协议重新加载设备（插件激活后调用）
   *
   * @param protocol 协议名称
   * @param availableProjects 可用项目列表
   * @param skipDeviceIds 需要跳过的设备 ID 集合
   * @returns 需要注册任务的设备列表
   */
  async reloadDevicesForProtocol(
    protocol: string,
    availableProjects: string[],
    skipDeviceIds: Set<string>,
  ): Promise<Device[]> {
    this.logger.log(`Reloading devices for protocol "${protocol}"...`);
    this.logger.log(`  availableProjects: [${availableProjects.join(', ')}]`);

    const newDevices: Device[] = [];

    for (const projectName of availableProjects) {
      let ds: DataSource;
      try {
        ds = await this.projectDbService.getSystemDb(projectName);
      } catch (err) {
        this.logger.warn(`  Failed to open DB for "${projectName}": ${(err as Error).message}`);
        continue;
      }

      const deviceRepo = ds.getRepository(Device);
      let devices: Device[];
      try {
        devices = await deviceRepo.find({ where: { projectId: projectName } });
      } catch (err) {
        this.logger.warn(
          `  Failed to query devices for "${projectName}": ${(err as Error).message}`,
        );
        continue;
      }

      this.logger.log(`  Project "${projectName}": ${devices.length} devices found`);
      for (const device of devices) {
        const deviceProtocol = (device.driver || '').toLowerCase();
        this.logger.log(
          `    Device ${device.id}: driver="${device.driver}", protocol="${deviceProtocol}"`,
        );
        if (deviceProtocol !== protocol) continue;

        const plugin = this.pluginRegistry?.getPlugin(protocol);
        if (!this.pluginRegistry) {
          this.logger.warn(`    Skipped ${device.id}: PluginRegistry is null/undefined`);
          continue;
        } else if (!plugin) {
          this.logger.warn(
            `    Skipped ${device.id}: plugin "${protocol}" not found in registry. Available: [${this.pluginRegistry
              .listPlugins()
              .map((p: any) => `${p.meta.protocol}(${p.status})`)
              .join(', ')}]`,
          );
          continue;
        } else if (plugin.status !== 'active') {
          this.logger.warn(
            `    Skipped ${device.id}: plugin "${protocol}" status="${plugin.status}" (not active)`,
          );
          continue;
        }

        if (skipDeviceIds.has(device.id)) {
          this.logger.debug(`    Skipped ${device.id}: already registered`);
          continue;
        }

        // 注册设备到状态管理器
        this.ensureDeviceTracked(device, protocol, projectName);
        newDevices.push(device);
      }
    }

    this.logger.log(`Protocol "${protocol}" reload complete: +${newDevices.length} devices`);

    return newDevices;
  }

  /**
   * 补偿已激活的插件：检查哪些活跃插件在状态管理器中没有设备记录
   *
   * @param availableProjects 可用项目列表
   * @param skipDeviceIds 需要跳过的设备 ID 集合
   * @returns 需要注册任务的设备列表
   */
  async compensateActivePlugins(
    availableProjects: string[],
    skipDeviceIds: Set<string>,
  ): Promise<{ protocol: string; devices: Device[] }[]> {
    if (!this.pluginRegistry) return [];

    const activePlugins = this.pluginRegistry.listPlugins().filter((p) => p.status === 'active');
    if (activePlugins.length === 0) return [];

    // 收集已加载设备所覆盖的协议
    const loadedProtocols = new Set<string>();
    for (const [, state] of this.deviceStateManager!.getAllStates()) {
      loadedProtocols.add(state.protocol);
    }

    const results: { protocol: string; devices: Device[] }[] = [];

    for (const plugin of activePlugins) {
      const protocol = plugin.meta.protocol.toLowerCase();
      if (loadedProtocols.has(protocol)) {
        this.logger.debug(
          `Plugin "${protocol}" already has ${this.deviceStateManager!.getStatsByProtocol(protocol).total} devices loaded, skip compensation`,
        );
        continue;
      }

      this.logger.log(
        `Compensating already-active plugin "${protocol}" — no devices loaded yet, reloading...`,
      );
      const devices = await this.reloadDevicesForProtocol(
        protocol,
        availableProjects,
        skipDeviceIds,
      );
      if (devices.length > 0) {
        results.push({ protocol, devices });
      }
    }

    return results;
  }

  /** 获取设备名称 */
  getDeviceName(deviceId: string): string {
    return this.deviceNameMap.get(deviceId) || deviceId;
  }

  /** 设置设备名称 */
  setDeviceName(deviceId: string, name: string): void {
    this.deviceNameMap.set(deviceId, name);
  }

  /** 清除设备名称映射（项目停用时调用，避免内存泄漏） */
  deleteDeviceName(deviceId: string): void {
    this.deviceNameMap.delete(deviceId);
  }

  /**
   * 从单个项目的 system.db 中加载设备
   */
  private async loadDevicesFromProject(projectName: string): Promise<DeviceLoadingResult> {
    let ds: DataSource;
    try {
      ds = await this.projectDbService.getSystemDb(projectName);
    } catch {
      this.logger.warn(`Failed to open database for project "${projectName}", skipping`);
      return { totalDevices: 0, loadedByProtocol: {}, skippedDevices: 0 };
    }

    const deviceRepo = ds.getRepository(Device);

    let devices: Device[];
    try {
      devices = await deviceRepo.find({ where: { projectId: projectName } });
    } catch {
      this.logger.warn(`Failed to query devices for project "${projectName}"`);
      return { totalDevices: 0, loadedByProtocol: {}, skippedDevices: 0 };
    }

    if (devices.length === 0) {
      this.logger.log(`Project "${projectName}": no devices found`);
      return { totalDevices: 0, loadedByProtocol: {}, skippedDevices: 0 };
    }

    this.logger.log(`Project "${projectName}": ${devices.length} devices total`);

    const loadedByProtocol: Record<string, Device[]> = {};
    let skippedCount = 0;
    let noProtocolCount = 0;

    for (const device of devices) {
      const protocol = (device.driver || '').toLowerCase();
      if (!protocol) {
        noProtocolCount++;
        this.logger.warn(
          `Device ${device.id} (${device.deviceName}): has no driver/protocol configured`,
        );
        continue;
      }

      const plugin = this.pluginRegistry?.getPlugin(protocol);
      if (!this.pluginRegistry) {
        this.logger.warn(
          `Device ${device.id} (${device.deviceName}): Skipped — PluginRegistry not available (null/undefined)`,
        );
        skippedCount++;
        continue;
      }
      if (!plugin) {
        this.logger.warn(
          `Device ${device.id} (${device.deviceName}): Skipped — plugin "${protocol}" not found in registry. ` +
            `Registered plugins: [${
              this.pluginRegistry
                .listPlugins()
                .map((p) => `${p.meta.protocol}(${p.status})`)
                .join(', ') || 'none'
            }]`,
        );
        skippedCount++;
        continue;
      }
      if (plugin.status !== 'active') {
        this.logger.warn(
          `Device ${device.id} (${device.deviceName}): Skipped — plugin "${protocol}" status is "${plugin.status}" (expected "active")`,
        );
        skippedCount++;
        continue;
      }

      // 注册设备到状态管理器
      this.ensureDeviceTracked(device, protocol, projectName);

      if (!loadedByProtocol[protocol]) {
        loadedByProtocol[protocol] = [];
      }
      loadedByProtocol[protocol].push(device);
    }

    if (skippedCount > 0 || noProtocolCount > 0) {
      this.logger.warn(
        `Project "${projectName}" summary: ${Object.keys(loadedByProtocol).length} protocol(s) loaded, ` +
          `${skippedCount} device(s) skipped (plugin not active), ` +
          `${noProtocolCount} device(s) skipped (no driver configured)` +
          ` — total devices: ${devices.length}`,
      );
    }

    return {
      totalDevices: devices.length,
      loadedByProtocol,
      skippedDevices: skippedCount,
    };
  }

  /**
   * 确保设备已加入内存状态追踪（委托给 DeviceStateManager）
   */
  private ensureDeviceTracked(device: Device, protocol: string, projectName: string): void {
    this.deviceStateManager!.registerDevice({
      deviceId: device.id,
      projectId: projectName,
      protocol,
      scanRate: device.scanRate || undefined,
      offlinePeriod: device.offlinePeriod || undefined,
      initialStatus: (device.status as DeviceStatus) || DeviceStatus.OFFLINE,
    });

    this.deviceNameMap.set(device.id, device.deviceName);
  }

  private scanProjectDirectories(projectsDir: string): string[] {
    if (!fs.existsSync(projectsDir)) {
      this.logger.warn(`Projects directory not found: ${projectsDir}`);
      return [];
    }

    return fs
      .readdirSync(projectsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((projectName) => {
        // 跳过未启用项目：读 projectinfo.json 的 enabled 字段
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

  private mergeResults(target: DeviceLoadingResult, source: DeviceLoadingResult): void {
    target.totalDevices += source.totalDevices;
    target.skippedDevices += source.skippedDevices;

    for (const [protocol, devices] of Object.entries(source.loadedByProtocol)) {
      if (!target.loadedByProtocol[protocol]) {
        target.loadedByProtocol[protocol] = [];
      }
      target.loadedByProtocol[protocol].push(...devices);
    }
  }
}
