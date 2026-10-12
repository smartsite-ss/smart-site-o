// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceStateManager, ProjectDatabaseService } from '@ss-node/ss-core';
import { Device } from '@ss-node/ss-device';
import { TimerConfigService } from '@ss-node/ss-system';

/**
 * 设备持久化服务
 *
 * 负责将内存中发生变更的设备状态批量写入各项目的 system.db。
 * 通过脏标记机制收集变更，周期性批量持久化。
 */
@Injectable()
export class DevicePersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(DevicePersistenceService.name);

  /** 脏设备 ID 集合 */
  private readonly dirtyDeviceIds = new Set<string>();

  /** 定时器 */
  private persistTimer: NodeJS.Timeout | null = null;
  private readonly PERSIST_INTERVAL_MS = 30_000; // 30 秒持久化一次

  constructor(
    private readonly projectDbService: ProjectDatabaseService,
    private readonly deviceStateManager: DeviceStateManager,
    private readonly configService: ConfigService,
    private readonly timerConfigService: TimerConfigService,
  ) {}

  /** 启动周期性持久化 */
  startPeriodicPersistence(): void {
    if (this.persistTimer) return;

    const interval =
      this.configService.get<number>('DEVICE_PERSIST_INTERVAL_MS') || this.PERSIST_INTERVAL_MS;

    this.persistTimer = setInterval(async () => {
      await this.persistDirtyStatuses();
    }, interval);

    // 注册热更新回调
    this.timerConfigService.register('DEVICE_PERSIST_INTERVAL_MS', (newInterval: number) =>
      this.restartTimer(newInterval),
    );

    this.logger.log(`Periodic persistence started (interval: ${interval}ms)`);
  }

  /** 停止周期性持久化 */
  stopPeriodicPersistence(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
      this.logger.log('Periodic persistence stopped');
    }
  }

  /** 运行时热更新持久化间隔 */
  private restartTimer(newInterval: number): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
    }
    this.persistTimer = setInterval(async () => {
      await this.persistDirtyStatuses();
    }, newInterval);
    this.logger.log(`Persistence interval hot-reloaded to ${newInterval}ms`);
  }

  /** 标记设备为脏状态（状态已变更，待持久化） */
  markDeviceDirty(deviceId: string): void {
    this.dirtyDeviceIds.add(deviceId);
  }

  onModuleDestroy(): void {
    this.stopPeriodicPersistence();
  }

  /**
   * 将内存中发生变更的设备状态批量写入各项目的 system.db
   */
  async persistDirtyStatuses(): Promise<void> {
    if (this.dirtyDeviceIds.size === 0) return;

    const dirtyIds = Array.from(this.dirtyDeviceIds);
    this.dirtyDeviceIds.clear();

    // 按项目分组
    const byProject = new Map<string, string[]>();
    for (const deviceId of dirtyIds) {
      const state = this.deviceStateManager.getState(deviceId);
      if (!state) continue;
      if (!byProject.has(state.projectId)) {
        byProject.set(state.projectId, []);
      }
      byProject.get(state.projectId)!.push(deviceId);
    }

    for (const [projectId, deviceIds] of byProject) {
      try {
        const ds = await this.projectDbService.getSystemDb(projectId);
        const deviceRepo = ds.getRepository(Device);

        // 批量更新设备表
        for (const deviceId of deviceIds) {
          const state = this.deviceStateManager.getState(deviceId);
          if (!state) continue;

          await deviceRepo.update(
            { id: deviceId },
            {
              status: state.status as any,
              lastOnlineAt: state.lastOnlineAt ? new Date(state.lastOnlineAt) : undefined,
              lastOfflineAt: state.lastOfflineAt ? new Date(state.lastOfflineAt) : undefined,
              lastDataAt: state.lastDataAt ? new Date(state.lastDataAt) : undefined,
            },
          );
        }

        this.logger.debug(
          `Persisted ${deviceIds.length} device statuses to project "${projectId}"`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to persist statuses for project "${projectId}": ${(error as Error).message}`,
        );
      }
    }
  }
}
