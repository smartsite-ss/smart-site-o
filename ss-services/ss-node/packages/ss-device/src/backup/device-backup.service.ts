// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { DataTag } from '../entities/data-tag.entity';
import { DeviceGroup } from '../entities/device-group.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';

/** 备份数据结构 */
export interface DeviceBackup {
  /** 备份元数据 */
  metadata: {
    backupId: string;
    projectId: string;
    createdAt: string;
    version: string;
    type: 'device' | 'project';
    deviceId?: string;
    deviceCount?: number;
    tagCount?: number;
  };
  /** 设备配置 */
  devices: DeviceBackupEntry[];
  /** 分组信息 */
  groups?: GroupBackupEntry[];
}

export interface DeviceBackupEntry {
  id: string;
  deviceCode: string;
  deviceName: string;
  nameAlias?: string;
  description?: string;
  type: string;
  status: string;
  config?: Record<string, any>;
  connection?: Record<string, any>;
  driver?: string;
  groupId?: string;
  templateId?: string;
  templateVersion?: string;
  tags: TagBackupEntry[];
}

export interface TagBackupEntry {
  id: string;
  name: string;
  address: string;
  dataType: string;
  description?: string;
  unit?: string;
  scale?: number;
  offset?: number;
  scanRate?: number;
  enabled?: boolean;
  minValue?: number;
  maxValue?: number;
  deadbandMode?: string;
  deadbandValue?: number;
  deadbandPercent?: number;
  deadbandTime?: number;
  conversionType?: string;
  conversionConfig?: Record<string, any>;
  alarmEnabled?: boolean;
  alarmHighHigh?: number;
  alarmHigh?: number;
  alarmLow?: number;
  alarmLowLow?: number;
  alarmDeviation?: number;
  archiveEnabled?: boolean;
  archiveInterval?: number;
  retentionDays?: number;
  priority?: number;
  timeout?: number;
  retryCount?: number;
}

export interface GroupBackupEntry {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
}

export interface BackupListItem {
  backupId: string;
  projectId: string;
  type: 'device' | 'project';
  deviceId?: string;
  deviceCount?: number;
  tagCount?: number;
  createdAt: string;
  version: string;
}

/** 备份验证结果 */
export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class DeviceBackupService {
  private readonly logger = new Logger(DeviceBackupService.name);
  /** 内存存储备份（生产环境应替换为持久化存储） */
  private readonly backupStore = new Map<string, DeviceBackup>();
  private readonly dbMode: string;

  constructor(
    @Inject(getRepositoryToken(Device))
    private deviceRepository: Repository<Device>,
    @Inject(getRepositoryToken(DataTag))
    private dataTagRepository: Repository<DataTag>,
    @Inject(getRepositoryToken(DeviceGroup))
    private deviceGroupRepository: Repository<DeviceGroup>,
    @Inject(ProjectDatabaseService)
    private projectDbService: ProjectDatabaseService,
  ) {
    this.dbMode = 'isolated';
  }

  private async getRepos(projectId: string) {
    if (this.dbMode === 'isolated' && this.projectDbService) {
      const ds = await this.projectDbService.getSystemDb(projectId);
      return {
        deviceRepo: ds.getRepository(Device),
        dataTagRepo: ds.getRepository(DataTag),
        deviceGroupRepo: ds.getRepository(DeviceGroup),
      };
    }
    return {
      deviceRepo: this.deviceRepository,
      dataTagRepo: this.dataTagRepository,
      deviceGroupRepo: this.deviceGroupRepository,
    };
  }

  /**
   * 备份单个设备配置到 JSON
   */
  async backupDevice(deviceId: string, projectId: string): Promise<DeviceBackup> {
    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);

    const device = await deviceRepo.findOne({ where: { id: deviceId, projectId } });
    if (!device) {
      throw new NotFoundException(`设备不存在: ${deviceId}`);
    }

    const tags = await dataTagRepo.find({ where: { deviceId } });

    const backupId = this.generateBackupId();
    const deviceEntry = this.toDeviceEntry(device, tags);

    const backup: DeviceBackup = {
      metadata: {
        backupId,
        projectId,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        type: 'device',
        deviceId,
        deviceCount: 1,
        tagCount: tags.length,
      },
      devices: [deviceEntry],
    };

    this.backupStore.set(backupId, backup);
    this.logger.log(`Device backup created: ${backupId} for device ${deviceId}`);
    return backup;
  }

  /**
   * 备份项目中所有设备配置到 JSON
   */
  async backupProject(projectId: string): Promise<DeviceBackup> {
    const { deviceRepo, dataTagRepo, deviceGroupRepo } = await this.getRepos(projectId);

    const devices = await deviceRepo.find({ where: { projectId } });
    const groups = await deviceGroupRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });

    const backupId = this.generateBackupId();
    const deviceEntries: DeviceBackupEntry[] = [];
    let totalTags = 0;

    for (const device of devices) {
      const tags = await dataTagRepo.find({ where: { deviceId: device.id } });
      totalTags += tags.length;
      deviceEntries.push(this.toDeviceEntry(device, tags));
    }

    const groupEntries: GroupBackupEntry[] = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      parentId: g.parentId,
      sortOrder: g.sortOrder,
    }));

    const backup: DeviceBackup = {
      metadata: {
        backupId,
        projectId,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        type: 'project',
        deviceCount: devices.length,
        tagCount: totalTags,
      },
      devices: deviceEntries,
      groups: groupEntries,
    };

    this.backupStore.set(backupId, backup);
    this.logger.log(
      `Project backup created: ${backupId} for project ${projectId} (${devices.length} devices, ${totalTags} tags)`,
    );
    return backup;
  }

  /**
   * 从备份数据恢复单个设备
   */
  async restoreDevice(backupData: DeviceBackup, projectId: string): Promise<Device> {
    this.validateBackup(backupData);

    if (backupData.metadata.type !== 'device' || !backupData.metadata.deviceId) {
      throw new BadRequestException('备份数据不是设备类型备份');
    }

    const { deviceRepo, dataTagRepo } = await this.getRepos(projectId);
    const entry = backupData.devices[0];
    if (!entry) {
      throw new BadRequestException('备份数据中没有设备信息');
    }

    // 检查是否已存在同编码设备
    const existing = await deviceRepo.findOne({
      where: { deviceCode: entry.deviceCode, projectId },
    });
    if (existing) {
      this.logger.warn(`Device with deviceCode ${entry.deviceCode} already exists, will update`);
      Object.assign(existing, {
        deviceName: entry.deviceName,
        nameAlias: entry.nameAlias,
        description: entry.description,
        type: entry.type,
        config: entry.config,
        connection: entry.connection,
        driver: entry.driver,
        groupId: entry.groupId,
        templateId: entry.templateId,
        templateVersion: entry.templateVersion,
      });
      await deviceRepo.save(existing);

      // 恢复 tags
      await this.restoreTags(existing.id, entry.tags, dataTagRepo);
      return existing;
    }

    // 创建新设备
    const device = deviceRepo.create({
      deviceCode: entry.deviceCode,
      deviceName: entry.deviceName,
      nameAlias: entry.nameAlias,
      description: entry.description,
      type: entry.type,
      config: entry.config,
      connection: entry.connection,
      driver: entry.driver,
      groupId: entry.groupId,
      templateId: entry.templateId,
      templateVersion: entry.templateVersion,
      projectId,
    } as any);
    const savedDevice = await deviceRepo.save(device);

    // 恢复 tags
    await this.restoreTags((savedDevice as any).id, entry.tags, dataTagRepo);

    this.logger.log(`Device restored: ${(savedDevice as any).id} from backup`);
    return savedDevice as unknown as Device;
  }

  /**
   * 从备份数据恢复整个项目的设备
   */
  async restoreProject(
    backupData: DeviceBackup,
    projectId: string,
  ): Promise<{ devicesRestored: number; tagsRestored: number; groupsRestored: number }> {
    this.validateBackup(backupData);

    if (backupData.metadata.type !== 'project') {
      throw new BadRequestException('备份数据不是项目类型备份');
    }

    const { deviceRepo, dataTagRepo, deviceGroupRepo } = await this.getRepos(projectId);

    let devicesRestored = 0;
    let tagsRestored = 0;
    let groupsRestored = 0;

    // 恢复分组
    if (backupData.groups) {
      for (const groupEntry of backupData.groups) {
        const existing = await deviceGroupRepo.findOne({
          where: { id: groupEntry.id, projectId },
        });
        if (existing) {
          Object.assign(existing, {
            name: groupEntry.name,
            description: groupEntry.description,
            parentId: groupEntry.parentId,
            sortOrder: groupEntry.sortOrder,
          });
          await deviceGroupRepo.save(existing);
        } else {
          const group = deviceGroupRepo.create({
            ...groupEntry,
            projectId,
          });
          await deviceGroupRepo.save(group);
        }
        groupsRestored++;
      }
    }

    // 恢复设备
    for (const entry of backupData.devices) {
      const existing = await deviceRepo.findOne({
        where: { deviceCode: entry.deviceCode, projectId },
      });

      let deviceId: string;
      if (existing) {
        Object.assign(existing, {
          deviceName: entry.deviceName,
          nameAlias: entry.nameAlias,
          description: entry.description,
          type: entry.type,
          config: entry.config,
          connection: entry.connection,
          driver: entry.driver,
          groupId: entry.groupId,
          templateId: entry.templateId,
          templateVersion: entry.templateVersion,
        });
        await deviceRepo.save(existing);
        deviceId = existing.id;
      } else {
        const device = deviceRepo.create({
          deviceCode: entry.deviceCode,
          deviceName: entry.deviceName,
          nameAlias: entry.nameAlias,
          description: entry.description,
          type: entry.type,
          config: entry.config,
          connection: entry.connection,
          driver: entry.driver,
          groupId: entry.groupId,
          templateId: entry.templateId,
          templateVersion: entry.templateVersion,
          projectId,
        } as any);
        const saved = await deviceRepo.save(device);
        deviceId = (saved as any).id;
      }
      devicesRestored++;

      // 恢复 tags
      const restoredTags = await this.restoreTags(deviceId, entry.tags, dataTagRepo);
      tagsRestored += restoredTags;
    }

    this.logger.log(
      `Project restored: ${devicesRestored} devices, ${tagsRestored} tags, ${groupsRestored} groups`,
    );
    return { devicesRestored, tagsRestored, groupsRestored };
  }

  /**
   * 验证备份文件结构
   */
  validateBackup(data: any): BackupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('备份数据为空');
      return { valid: false, errors, warnings };
    }

    if (!data.metadata) {
      errors.push('缺少 metadata 字段');
      return { valid: false, errors, warnings };
    }

    const { metadata } = data;
    if (!metadata.backupId) errors.push('metadata.backupId 缺失');
    if (!metadata.projectId) errors.push('metadata.projectId 缺失');
    if (!metadata.version) warnings.push('metadata.version 缺失，可能为旧版本备份');
    if (!metadata.type) {
      errors.push('metadata.type 缺失');
    } else if (!['device', 'project'].includes(metadata.type)) {
      errors.push(`metadata.type 无效: ${metadata.type}，应为 device 或 project`);
    }

    if (!Array.isArray(data.devices)) {
      errors.push('devices 字段必须是数组');
    } else if (data.devices.length === 0) {
      warnings.push('devices 数组为空');
    } else {
      for (let i = 0; i < data.devices.length; i++) {
        const device = data.devices[i];
        if (!device.deviceCode) errors.push(`devices[${i}].deviceCode 缺失`);
        if (!device.deviceName) errors.push(`devices[${i}].deviceName 缺失`);
        if (!device.type) errors.push(`devices[${i}].type 缺失`);
        if (!Array.isArray(device.tags)) {
          errors.push(`devices[${i}].tags 必须是数组`);
        }
      }
    }

    if (metadata.type === 'device' && data.devices.length > 1) {
      warnings.push('设备类型备份包含多个设备');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 列出可用的备份
   */
  listBackups(projectId?: string): BackupListItem[] {
    const backups: BackupListItem[] = [];

    for (const [backupId, backup] of this.backupStore) {
      if (projectId && backup.metadata.projectId !== projectId) continue;

      backups.push({
        backupId,
        projectId: backup.metadata.projectId,
        type: backup.metadata.type,
        deviceId: backup.metadata.deviceId,
        deviceCount: backup.metadata.deviceCount,
        tagCount: backup.metadata.tagCount,
        createdAt: backup.metadata.createdAt,
        version: backup.metadata.version,
      });
    }

    return backups.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId: string): boolean {
    const existed = this.backupStore.has(backupId);
    if (existed) {
      this.backupStore.delete(backupId);
      this.logger.log(`Backup deleted: ${backupId}`);
    } else {
      this.logger.warn(`Backup not found: ${backupId}`);
    }
    return existed;
  }

  /**
   * 获取备份数据
   */
  getBackup(backupId: string): DeviceBackup | undefined {
    return this.backupStore.get(backupId);
  }

  // ──────────── 私有方法 ────────────

  private generateBackupId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `bkp_${timestamp}_${random}`;
  }

  private toDeviceEntry(device: Device, tags: DataTag[]): DeviceBackupEntry {
    return {
      id: device.id,
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      nameAlias: device.nameAlias,
      description: device.description,
      type: device.type,
      status: device.status,
      config: device.config,
      connection: device.connection,
      driver: device.driver,
      groupId: device.groupId,
      templateId: device.templateId,
      templateVersion: device.templateVersion,
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        address: tag.address,
        dataType: (tag as any).dataType,
        description: (tag as any).description,
        unit: (tag as any).unit,
        scale: (tag as any).scale,
        offset: (tag as any).offset,
        scanRate: (tag as any).scanRate,
        enabled: (tag as any).enabled,
        minValue: (tag as any).minValue,
        maxValue: (tag as any).maxValue,
        deadbandMode: (tag as any).deadbandMode,
        deadbandValue: (tag as any).deadbandValue,
        deadbandPercent: (tag as any).deadbandPercent,
        deadbandTime: (tag as any).deadbandTime,
        conversionType: (tag as any).conversionType,
        conversionConfig: (tag as any).conversionConfig,
        alarmEnabled: (tag as any).alarmEnabled,
        alarmHighHigh: (tag as any).alarmHighHigh,
        alarmHigh: (tag as any).alarmHigh,
        alarmLow: (tag as any).alarmLow,
        alarmLowLow: (tag as any).alarmLowLow,
        alarmDeviation: (tag as any).alarmDeviation,
        archiveEnabled: (tag as any).archiveEnabled,
        archiveInterval: (tag as any).archiveInterval,
        retentionDays: (tag as any).retentionDays,
        priority: (tag as any).priority,
        timeout: (tag as any).timeout,
        retryCount: (tag as any).retryCount,
      })),
    };
  }

  private async restoreTags(
    deviceId: string,
    tags: TagBackupEntry[],
    dataTagRepo: Repository<DataTag>,
  ): Promise<number> {
    let count = 0;
    for (const tagEntry of tags) {
      const existing = await dataTagRepo.findOne({
        where: { id: tagEntry.id, deviceId },
      });
      if (existing) {
        Object.assign(existing, tagEntry);
        await dataTagRepo.save(existing);
      } else {
        const tag = dataTagRepo.create({
          ...tagEntry,
          deviceId,
        } as any);
        await dataTagRepo.save(tag);
      }
      count++;
    }
    return count;
  }
}
