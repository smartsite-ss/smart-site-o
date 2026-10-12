// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import { EnhancedScheduler, AcquisitionTask, TaskPriority } from '@ss-node/ss-collector-sdk';
import { Device, DataTag } from '@ss-node/ss-device';
import { TemplateLoaderService } from '@ss-node/ss-system';
import type { TemplateVariable } from '@ss-node/ss-system';

/**
 * 任务注册服务
 *
 * 负责为设备注册采集任务到 EnhancedScheduler，
 * 管理设备与任务的映射关系，以及任务的启用/禁用操作。
 */
@Injectable()
export class TaskRegistrationService {
  private readonly logger = new Logger(TaskRegistrationService.name);

  /** 设备 → 注册的调度任务 ID 列表 */
  private readonly deviceTaskMap = new Map<string, string[]>();

  constructor(
    private readonly scheduler: EnhancedScheduler,
    @Optional() private readonly templateLoader?: TemplateLoaderService,
  ) {}

  /**
   * 为单个设备的所有启用标签注册 EnhancedScheduler 任务
   *
   * 查找顺序：
   * 1. 优先从 dev_data_tags 表中查找该设备的启用标签
   * 2. 若 DB 中无标签但设备绑定了模板，则从模板 JSON 文件加载变量作为标签
   */
  async registerTasksForDevice(
    device: Device,
    protocol: string,
    tagRepo: any,
    projectName: string,
  ): Promise<void> {
    try {
      // 1. 从数据库查询标签
      const tags = await tagRepo.find({
        where: { deviceId: device.id, enabled: true },
      });

      // 2. 若 DB 无标签且有模板绑定，从模板加载变量
      if (tags.length === 0 && device.templateId && this.templateLoader) {
        const template = this.templateLoader.getTemplate(device.templateId);
        if (template && template.variables.length > 0) {
          const enabledVars = template.variables.filter((v) => v.enabled !== false);
          if (enabledVars.length === 0) {
            this.logger.debug(
              `Device ${device.id}: template "${device.templateId}" has no enabled variables`,
            );
            return;
          }

          this.logger.log(
            `Device "${device.deviceName}" (${device.id}) → loading ${enabledVars.length} variables from template "${device.templateId}"`,
          );

          const tasks = this.createTemplateTasks(device, protocol, enabledVars, projectName);
          this.registerTasks(device.id, device.deviceName, tasks);
          return;
        }
      }

      // 3. 无标签也无模板 → 设备已通过 DeviceLoadingService 追踪，不再跳过
      if (tags.length === 0) {
        this.logger.debug(
          `Device ${device.id} (${device.deviceName}): tracked but no tags to schedule ` +
            `${device.templateId ? `(template "${device.templateId}" not found/loaded)` : '(no template configured)'}`,
        );
        return;
      }

      // 4. DB 标签路径 — 注册调度任务
      const tasks = tags.map((tag: DataTag) =>
        this.createTagTask(device, protocol, tag, projectName),
      );
      this.registerTasks(device.id, device.deviceName, tasks);
    } catch (error) {
      this.logger.error(
        `Failed to register tasks for device ${device.id}: ${(error as Error).message}`,
      );
    }
  }

  /** 检查设备是否已有注册的任务 */
  hasDeviceTasks(deviceId: string): boolean {
    return this.deviceTaskMap.has(deviceId);
  }

  /** 获取已注册任务的设备 ID 集合 */
  getRegisteredDeviceIds(): Set<string> {
    return new Set(this.deviceTaskMap.keys());
  }

  /** 启用设备采集 */
  enableDeviceTasks(deviceId: string): void {
    const taskIds = this.deviceTaskMap.get(deviceId);
    if (!taskIds || taskIds.length === 0) {
      this.logger.warn(`No tasks found for device ${deviceId}`);
      return;
    }

    for (const taskId of taskIds) {
      this.scheduler.enableTask(taskId);
    }
    this.logger.log(`Device ${deviceId}: ${taskIds.length} tasks enabled`);
  }

  /** 禁用设备采集 */
  disableDeviceTasks(deviceId: string): void {
    const taskIds = this.deviceTaskMap.get(deviceId);
    if (!taskIds || taskIds.length === 0) {
      this.logger.warn(`No tasks found for device ${deviceId}`);
      return;
    }

    for (const taskId of taskIds) {
      this.scheduler.disableTask(taskId);
    }
    this.logger.log(`Device ${deviceId}: ${taskIds.length} tasks disabled`);
  }

  /**
   * 重新加载设备标签的采集任务（模板同步 / 标签变更场景）
   *
   * 执行流程：
   * 1. 注销旧任务（scheduler.unregisterTask）
   * 2. 从数据库重新读取启用标签
   * 3. 注册新任务（scheduler.registerTask）
   *
   * @param deviceId 设备 ID
   * @param projectId 项目 ID
   * @param protocol 采集协议
   * @param device 设备实体
   * @param tagRepo 项目级 DataTag Repository
   */
  async reloadDeviceTasks(
    deviceId: string,
    projectId: string,
    protocol: string,
    device: Device,
    tagRepo: any,
  ): Promise<void> {
    // 1. 注销旧任务
    const oldTaskIds = this.deviceTaskMap.get(deviceId);
    if (oldTaskIds && oldTaskIds.length > 0) {
      for (const taskId of oldTaskIds) {
        this.scheduler.unregisterTask(taskId);
      }
      this.deviceTaskMap.delete(deviceId);
      this.logger.log(`Device ${deviceId}: ${oldTaskIds.length} old tasks unregistered`);
    }

    // 2. 重新注册（复用现有 registerTasksForDevice 逻辑）
    await this.registerTasksForDevice(device, protocol, tagRepo, projectId);

    this.logger.log(`Device ${deviceId}: tasks reloaded after tag change`);
  }

  /**
   * 停止一组设备的采集任务（项目停用时调用）
   *
   * 注销所有调度任务并清理 deviceTaskMap。
   * 调用方负责查询项目下的设备 ID 列表（task-registration 不直接访问项目 DB）。
   *
   * @param deviceIds 需要停止采集的设备 ID 列表
   */
  stopProjectTasks(deviceIds: string[]): void {
    let stoppedCount = 0;
    for (const deviceId of deviceIds) {
      const taskIds = this.deviceTaskMap.get(deviceId);
      if (taskIds && taskIds.length > 0) {
        for (const taskId of taskIds) {
          this.scheduler.unregisterTask(taskId);
        }
        this.deviceTaskMap.delete(deviceId);
        stoppedCount += taskIds.length;
      }
    }
    this.logger.log(
      `Stopped ${stoppedCount} tasks for ${deviceIds.length} devices (project disabled)`,
    );
  }

  /** 批量启用设备 */
  async enableDevices(deviceIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const result = { success: [] as string[], failed: [] as string[] };
    for (const deviceId of deviceIds) {
      try {
        this.enableDeviceTasks(deviceId);
        result.success.push(deviceId);
      } catch (error) {
        this.logger.error(`Failed to enable device ${deviceId}: ${(error as Error).message}`);
        result.failed.push(deviceId);
      }
    }
    return result;
  }

  /** 批量禁用设备 */
  async disableDevices(deviceIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const result = { success: [] as string[], failed: [] as string[] };
    for (const deviceId of deviceIds) {
      try {
        this.disableDeviceTasks(deviceId);
        result.success.push(deviceId);
      } catch (error) {
        this.logger.error(`Failed to disable device ${deviceId}: ${(error as Error).message}`);
        result.failed.push(deviceId);
      }
    }
    return result;
  }

  /** 获取设备采集启用状态 */
  isDeviceTasksEnabled(deviceId: string): boolean {
    const taskIds = this.deviceTaskMap.get(deviceId);
    if (!taskIds || taskIds.length === 0) return false;
    const taskStatuses = this.scheduler.getTaskStatus();
    const task = taskStatuses.get(taskIds[0]);
    return task?.enabled ?? false;
  }

  /** 获取已注册任务总数 */
  getTaskCount(): number {
    return Array.from(this.deviceTaskMap.values()).reduce((s, t) => s + t.length, 0);
  }

  // -----------------------------------------------------------------------
  //  私有方法
  // -----------------------------------------------------------------------

  /** 从模板变量创建采集任务 */
  private createTemplateTasks(
    device: Device,
    protocol: string,
    enabledVars: TemplateVariable[],
    projectName: string,
  ): AcquisitionTask[] {
    const scanRate = device.scanRate || 1000;

    return enabledVars.map((variable) => {
      const syntheticTagId = `tpl_${device.id}_${variable.name}`;
      return {
        id: `collect_${device.id}_${syntheticTagId}`,
        deviceId: device.id,
        tagId: syntheticTagId,
        tagConfig: {
          id: syntheticTagId,
          name: variable.name,
          address: variable.address,
          dataType: variable.dataType || 'float32',
          projectId: projectName,
          deviceId: device.id,
          deviceCode: device.deviceCode,
          deviceName: device.deviceName,
          scanRate: variable.scanRate || scanRate,
          description: variable.description,
        },
        deviceClient: {
          id: device.id,
          name: device.deviceName,
          protocol,
          connection: device.connection,
        },
        priority: TaskPriority.NORMAL,
        interval: variable.scanRate || scanRate,
        retryCount: 0,
        maxRetries: variable.retryCount || 3,
        enabled: true,
      };
    });
  }

  /** 创建单个标签的采集任务 */
  private createTagTask(
    device: Device,
    protocol: string,
    tag: DataTag,
    projectName: string,
  ): AcquisitionTask {
    const scanRate = device.scanRate || 1000;
    return {
      id: `collect_${device.id}_${tag.id}`,
      deviceId: device.id,
      tagId: tag.id,
      tagConfig: {
        id: tag.id,
        name: tag.name,
        address: tag.address,
        dataType: tag.dataType,
        projectId: projectName,
        deviceId: device.id,
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        scanRate: tag.scanRate || scanRate,
      },
      deviceClient: {
        id: device.id,
        name: device.deviceName,
        protocol,
        connection: device.connection,
      },
      priority: TaskPriority.NORMAL,
      interval: tag.scanRate || scanRate,
      retryCount: 0,
      maxRetries: 3,
      enabled: true,
    };
  }

  /** 注册任务到调度器并记录映射 */
  private registerTasks(deviceId: string, deviceName: string, tasks: AcquisitionTask[]): void {
    const taskIds: string[] = [];
    const scanRate = tasks[0]?.interval || 1000;

    for (const task of tasks) {
      this.scheduler.registerTask(task);
      taskIds.push(task.id);
    }

    this.deviceTaskMap.set(deviceId, taskIds);
    this.logger.log(
      `Device "${deviceName}" (${deviceId}) → ${taskIds.length} tasks registered (interval: ${scanRate}ms)`,
    );
  }
}
