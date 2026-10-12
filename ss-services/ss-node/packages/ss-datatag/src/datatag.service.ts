// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { DataTag } from './entities/data-tag.entity';
import { CreateDataTagDto } from './dto/create-datatag.dto';
import { UpdateDataTagDto } from './dto/update-datatag.dto';
import { TagQueryDto } from './dto/tag-query.dto';
import { DataPointCacheService } from '@ss-node/ss-core';
import { PaginatedResult } from '@ss-node/ss-sdk';

@Injectable()
export class DataTagService {
  private readonly logger = new Logger(DataTagService.name);

  constructor(
    @InjectRepository(DataTag)
    private readonly tagRepo: Repository<DataTag>,
    @Optional()
    @Inject(DataPointCacheService)
    private readonly cacheService?: DataPointCacheService,
  ) {}

  async create(dto: CreateDataTagDto): Promise<DataTag> {
    const existing = await this.tagRepo.findOne({
      where: { name: dto.name, deviceId: dto.deviceId },
    });

    if (existing) {
      throw new BadRequestException(`标签名称 "${dto.name}" 在此设备中已存在`);
    }

    const tag = this.tagRepo.create({
      name: dto.name,
      address: dto.address,
      dataType: dto.dataType,
      deviceId: dto.deviceId,
      projectId: dto.projectId,
      description: dto.description,
      unit: dto.unit,
      displayFormat: dto.displayFormat,
      decimalPlaces: dto.decimalPlaces,
      minValue: dto.minValue,
      maxValue: dto.maxValue,
      engMinValue: dto.engMinValue,
      engMaxValue: dto.engMaxValue,
      scale: dto.scale ?? 1.0,
      offset: dto.offset ?? 0.0,
      scanRate: dto.scanRate ?? 1000,
      timeout: dto.timeout ?? 5000,
      retryCount: dto.retryCount ?? 3,
      enabled: dto.enabled ?? true,
      deadbandMode: dto.deadbandMode,
      deadbandValue: dto.deadbandValue,
      deadbandPercent: dto.deadbandPercent,
      deadbandTime: dto.deadbandTime,
      conversionType: dto.conversionType,
      conversionConfig: dto.conversionConfig as Record<string, any>,
      alarmHighHigh: dto.alarmHighHigh,
      alarmHigh: dto.alarmHigh,
      alarmLow: dto.alarmLow,
      alarmLowLow: dto.alarmLowLow,
      alarmDeviation: dto.alarmDeviation,
      alarmEnabled: dto.alarmEnabled ?? true,
      qualityCheckEnabled: dto.qualityCheckEnabled ?? false,
      maxAge: dto.maxAge,
      archiveEnabled: dto.archiveEnabled ?? false,
      archiveInterval: dto.archiveInterval,
      archiveDeadband: dto.archiveDeadband,
      retentionDays: dto.retentionDays,
      priority: typeof dto.priority === 'string' ? this.priorityToNum(dto.priority) : 0,
      groupId: dto.groupId,
      category: dto.category,
      tags: dto.tags,
      simulationEnabled: dto.simulationEnabled ?? false,
      simulationConfig: dto.simulationConfig,
    });

    this.logger.log(`Created tag: ${tag.name} [${tag.id}] for device ${tag.deviceId}`);
    return this.tagRepo.save(tag);
  }

  async findAll(
    projectId: string,
    query: TagQueryDto,
  ): Promise<{ data: DataTag[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: FindOptionsWhere<DataTag>[] = [];

    const baseWhere: FindOptionsWhere<DataTag> = {
      projectId,
    };

    if (query.deviceId) {
      baseWhere.deviceId = query.deviceId;
    }

    if (query.groupId) {
      baseWhere.groupId = query.groupId;
    }

    if (query.q) {
      where.push({ ...baseWhere, name: Like(`%${query.q}%`) });
      where.push({ ...baseWhere, address: Like(`%${query.q}%`) });
    }

    if (query.dataType) {
      const applyType = (w: FindOptionsWhere<DataTag>) => {
        w.dataType = query.dataType;
      };
      if (where.length > 0) {
        where.forEach((w) => applyType(w));
      } else {
        baseWhere.dataType = query.dataType;
      }
    }

    if (query.enabled !== undefined && query.enabled !== null) {
      const value = String(query.enabled) === 'true';
      const applyEnabled = (w: FindOptionsWhere<DataTag>) => {
        w.enabled = value;
      };
      if (where.length > 0) {
        where.forEach((w) => applyEnabled(w));
      } else {
        baseWhere.enabled = value;
      }
    }

    const finalWhere = where.length > 0 ? where : baseWhere;

    const [data, total] = await this.tagRepo.findAndCount({
      where: finalWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findByDevice(deviceId: string): Promise<DataTag[]> {
    return this.tagRepo.find({
      where: { deviceId },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<DataTag> {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`标签不存在: ${id}`);
    }
    return tag;
  }

  async update(id: string, dto: UpdateDataTagDto): Promise<DataTag> {
    const tag = await this.findById(id);

    if (dto.name && dto.name !== tag.name) {
      const existing = await this.tagRepo.findOne({
        where: { name: dto.name, deviceId: tag.deviceId },
      });
      if (existing) {
        throw new BadRequestException(`标签名称 "${dto.name}" 在此设备中已存在`);
      }
    }

    const updates: Partial<DataTag> = {};

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.address !== undefined) updates.address = dto.address;
    if (dto.dataType !== undefined) updates.dataType = dto.dataType;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.unit !== undefined) updates.unit = dto.unit;
    if (dto.decimalPlaces !== undefined) updates.decimalPlaces = dto.decimalPlaces;
    if (dto.minValue !== undefined) updates.minValue = dto.minValue;
    if (dto.maxValue !== undefined) updates.maxValue = dto.maxValue;
    if (dto.projectId !== undefined) updates.projectId = dto.projectId;
    if (dto.displayFormat !== undefined) updates.displayFormat = dto.displayFormat;
    if (dto.engMinValue !== undefined) updates.engMinValue = dto.engMinValue;
    if (dto.engMaxValue !== undefined) updates.engMaxValue = dto.engMaxValue;
    if (dto.timeout !== undefined) updates.timeout = dto.timeout;
    if (dto.retryCount !== undefined) updates.retryCount = dto.retryCount;
    if (dto.scale !== undefined) updates.scale = dto.scale;
    if (dto.offset !== undefined) updates.offset = dto.offset;
    if (dto.scanRate !== undefined) updates.scanRate = dto.scanRate;
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;
    if (dto.deadbandMode !== undefined) updates.deadbandMode = dto.deadbandMode;
    if (dto.deadbandValue !== undefined) updates.deadbandValue = dto.deadbandValue;
    if (dto.deadbandPercent !== undefined) updates.deadbandPercent = dto.deadbandPercent;
    if (dto.deadbandTime !== undefined) updates.deadbandTime = dto.deadbandTime;
    if (dto.conversionType !== undefined) updates.conversionType = dto.conversionType;
    if (dto.conversionConfig !== undefined)
      updates.conversionConfig = dto.conversionConfig as Record<string, any>;
    if (dto.alarmHighHigh !== undefined) updates.alarmHighHigh = dto.alarmHighHigh;
    if (dto.alarmHigh !== undefined) updates.alarmHigh = dto.alarmHigh;
    if (dto.alarmLow !== undefined) updates.alarmLow = dto.alarmLow;
    if (dto.alarmLowLow !== undefined) updates.alarmLowLow = dto.alarmLowLow;
    if (dto.alarmDeviation !== undefined) updates.alarmDeviation = dto.alarmDeviation;
    if (dto.alarmEnabled !== undefined) updates.alarmEnabled = dto.alarmEnabled;
    if (dto.qualityCheckEnabled !== undefined)
      updates.qualityCheckEnabled = dto.qualityCheckEnabled;
    if (dto.maxAge !== undefined) updates.maxAge = dto.maxAge;
    if (dto.archiveEnabled !== undefined) updates.archiveEnabled = dto.archiveEnabled;
    if (dto.archiveInterval !== undefined) updates.archiveInterval = dto.archiveInterval;
    if (dto.archiveDeadband !== undefined) updates.archiveDeadband = dto.archiveDeadband;
    if (dto.retentionDays !== undefined) updates.retentionDays = dto.retentionDays;
    if (dto.priority !== undefined) {
      updates.priority =
        typeof dto.priority === 'string'
          ? this.priorityToNum(dto.priority as string)
          : dto.priority;
    }
    if (dto.groupId !== undefined) updates.groupId = dto.groupId;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.tags !== undefined) updates.tags = dto.tags;
    if (dto.simulationEnabled !== undefined) updates.simulationEnabled = dto.simulationEnabled;
    if (dto.simulationConfig !== undefined) updates.simulationConfig = dto.simulationConfig;

    Object.assign(tag, updates);

    this.logger.log(`Updated tag: ${tag.name} [${tag.id}]`);
    return this.tagRepo.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findById(id);
    await this.tagRepo.remove(tag);
    this.logger.log(`Deleted tag: ${tag.name} [${tag.id}]`);
  }

  async batchCreate(
    dtos: CreateDataTagDto[],
  ): Promise<{ success: DataTag[]; errors: Array<{ index: number; message: string }> }> {
    const success: DataTag[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < dtos.length; i++) {
      try {
        const tag = await this.create(dtos[i]);
        success.push(tag);
      } catch (err: any) {
        errors.push({ index: i, message: err.message });
      }
    }

    return { success, errors };
  }

  async batchDelete(ids: string[]): Promise<{ deleted: number }> {
    const result = await this.tagRepo.delete(ids);
    return { deleted: result.affected ?? 0 };
  }

  async batchUpdate(ids: string[], dto: UpdateDataTagDto): Promise<DataTag[]> {
    const results: DataTag[] = [];
    for (const id of ids) {
      results.push(await this.update(id, dto));
    }
    return results;
  }

  private priorityToNum(priority: string): number {
    const map: Record<string, number> = {
      low: 0,
      normal: 1,
      high: 2,
      critical: 3,
    };
    return map[priority] ?? 1;
  }

  async searchTags(
    projectId: string,
    q?: string,
    dataType?: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<DataTag>> {
    const where: FindOptionsWhere<DataTag> = { projectId, enabled: true };

    if (q) {
      where.name = Like(`%${q}%`);
    }
    if (dataType) {
      where.dataType = dataType as any;
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await this.tagRepo.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { name: 'ASC' },
    });

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async batchGetLatest(
    projectId: string,
    tagIds: string[],
  ): Promise<Record<string, { value: any; quality: string; timestamp: number }>> {
    const result: Record<string, { value: any; quality: string; timestamp: number }> = {};

    if (this.cacheService) {
      const cached = await this.cacheService.getMany(tagIds);
      cached.forEach((entry, tagId) => {
        result[tagId] = {
          value: entry.value,
          quality: entry.quality,
          timestamp: entry.timestamp,
        };
      });
    }

    for (const tagId of tagIds) {
      if (!result[tagId]) {
        result[tagId] = { value: null, quality: 'unknown', timestamp: Date.now() };
      }
    }

    return result;
  }
}
