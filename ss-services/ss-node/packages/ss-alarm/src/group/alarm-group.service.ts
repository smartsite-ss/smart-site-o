// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmGroup } from '../entities/alarm-group.entity';
import { AlarmRecord, AlarmStatus, AlarmLevel } from '../entities/alarm.entity';

export interface AlarmGroupTreeNode extends AlarmGroup {
  level: number;
  children: AlarmGroupTreeNode[];
}

export interface AlarmGroupStats {
  groupId: string;
  groupName: string;
  total: number;
  [AlarmLevel.INFO]?: number;
  [AlarmLevel.WARNING]?: number;
  [AlarmLevel.ERROR]?: number;
  [AlarmLevel.CRITICAL]?: number;
}

export interface CreateAlarmGroupDto {
  name: string;
  description?: string;
  parentId?: string;
  projectId: string;
  sortOrder?: number;
}

export interface UpdateAlarmGroupDto {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

@Injectable()
export class AlarmGroupService {
  private readonly logger = new Logger(AlarmGroupService.name);

  constructor(
    @Inject(getRepositoryToken(AlarmGroup))
    private readonly groupRepo: Repository<AlarmGroup>,
    @Inject(getRepositoryToken(AlarmRecord))
    private readonly alarmRecordRepo: Repository<AlarmRecord>,
  ) {}

  async createGroup(dto: CreateAlarmGroupDto): Promise<AlarmGroup> {
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      parentId: dto.parentId ?? null,
      projectId: dto.projectId,
      sortOrder: dto.sortOrder ?? 0,
    });

    this.logger.log(`Created alarm group: ${group.name} [${group.id}]`);
    return this.groupRepo.save(group);
  }

  async findAllGroups(projectId: string): Promise<AlarmGroup[]> {
    return this.groupRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOneGroup(id: string): Promise<AlarmGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`报警分组不存在: ${id}`);
    }
    return group;
  }

  async updateGroup(id: string, dto: UpdateAlarmGroupDto): Promise<AlarmGroup> {
    const group = await this.findOneGroup(id);

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.parentId !== undefined) group.parentId = dto.parentId;
    if (dto.sortOrder !== undefined) group.sortOrder = dto.sortOrder;

    this.logger.log(`Updated alarm group: ${group.name} [${id}]`);
    return this.groupRepo.save(group);
  }

  async removeGroup(id: string): Promise<void> {
    const group = await this.findOneGroup(id);

    const children = await this.groupRepo.find({ where: { parentId: id } });
    for (const child of children) {
      child.parentId = group.parentId ?? null;
      await this.groupRepo.save(child);
    }

    await this.groupRepo.remove(group);
    this.logger.log(`Deleted alarm group: ${group.name} [${id}]`);
  }

  async getGroupTree(projectId: string): Promise<AlarmGroupTreeNode[]> {
    const groups = await this.findAllGroups(projectId);
    return this.buildTree(groups, null);
  }

  async batchAcknowledge(groupId: string, userId: string): Promise<number> {
    const group = await this.findOneGroup(groupId);

    const _allGroupIds = await this.collectDescendantIds(groupId);

    const records = await this.alarmRecordRepo.find({
      where: { status: AlarmStatus.ACTIVE },
    });

    const now = new Date();
    let count = 0;

    for (const record of records) {
      record.status = AlarmStatus.ACKNOWLEDGED;
      record.acknowledgedAt = now;
      record.acknowledgedBy = userId;
      await this.alarmRecordRepo.save(record);
      count++;
    }

    this.logger.log(`Batch acknowledged ${count} alarms in group ${group.name}`);
    return count;
  }

  async getGroupStats(groupId: string): Promise<AlarmGroupStats> {
    const group = await this.findOneGroup(groupId);

    const _allGroupIds = await this.collectDescendantIds(groupId);

    const stats: AlarmGroupStats = {
      groupId: group.id,
      groupName: group.name,
      total: 0,
      [AlarmLevel.INFO]: 0,
      [AlarmLevel.WARNING]: 0,
      [AlarmLevel.ERROR]: 0,
      [AlarmLevel.CRITICAL]: 0,
    };

    const records = await this.alarmRecordRepo.find({
      where: { status: AlarmStatus.ACTIVE },
    });

    for (const record of records) {
      stats.total++;
      const level = record.level as string;
      if (stats[level] !== undefined) {
        stats[level]++;
      }
    }

    return stats;
  }

  private async collectDescendantIds(groupId: string): Promise<string[]> {
    const ids: string[] = [groupId];
    const children = await this.groupRepo.find({ where: { parentId: groupId } });
    for (const child of children) {
      const childIds = await this.collectDescendantIds(child.id);
      ids.push(...childIds);
    }
    return ids;
  }

  private buildTree(
    groups: AlarmGroup[],
    parentId: string | null,
    depth: number = 0,
  ): AlarmGroupTreeNode[] {
    if (depth >= 10) return [];

    const children = groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return children.map((group) => ({
      ...group,
      level: depth,
      children: this.buildTree(groups, group.id, depth + 1),
    }));
  }
}
