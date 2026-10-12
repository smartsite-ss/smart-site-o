// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TrendQueryScheme } from '../entities/trend-query-scheme.entity';

export interface CreateTrendQuerySchemeDto {
  name: string;
  projectId: string;
  deviceId: string;
  tagIds: string[];
  startTime?: string;
  endTime?: string;
  interpolationMode?: string;
  interpolationInterval?: number;
  presetRange?: string;
  scene?: string;
  timeRangeMinutes?: number;
  refreshIntervalSec?: number;
}

export interface UpdateTrendQuerySchemeDto {
  name?: string;
  tagIds?: string[];
  startTime?: string;
  endTime?: string;
  interpolationMode?: string;
  interpolationInterval?: number;
  presetRange?: string;
  scene?: string;
  timeRangeMinutes?: number;
  refreshIntervalSec?: number;
}

@Injectable()
export class TrendQuerySchemeService {
  private readonly logger = new Logger(TrendQuerySchemeService.name);

  constructor(
    @InjectRepository(TrendQueryScheme)
    private readonly repo: Repository<TrendQueryScheme>,
  ) {}

  async list(projectId: string, scene?: string): Promise<TrendQueryScheme[]> {
    const where: any = { projectId };
    if (scene) {
      where.scene = scene;
    }
    return this.repo.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  }

  async getById(id: string): Promise<TrendQueryScheme> {
    const scheme = await this.repo.findOne({ where: { id } });
    if (!scheme) {
      throw new NotFoundException(`Trend query scheme not found: ${id}`);
    }
    return scheme;
  }

  async create(dto: CreateTrendQuerySchemeDto, createdBy?: string): Promise<TrendQueryScheme> {
    const scheme = this.repo.create({
      id: randomUUID(),
      name: dto.name,
      projectId: dto.projectId,
      deviceId: dto.deviceId,
      tagIds: JSON.stringify(dto.tagIds),
      startTime: dto.startTime || null,
      endTime: dto.endTime || null,
      interpolationMode: dto.interpolationMode || 'raw',
      interpolationInterval: dto.interpolationInterval ?? 1000,
      presetRange: dto.presetRange || null,
      scene: dto.scene || 'historical-trend',
      timeRangeMinutes: dto.timeRangeMinutes ?? 60,
      refreshIntervalSec: dto.refreshIntervalSec ?? 5,
      createdBy: createdBy || null,
    });
    return this.repo.save(scheme);
  }

  async update(id: string, dto: UpdateTrendQuerySchemeDto): Promise<TrendQueryScheme> {
    const scheme = await this.getById(id);
    if (dto.name !== undefined) scheme.name = dto.name;
    if (dto.tagIds !== undefined) scheme.tagIds = JSON.stringify(dto.tagIds);
    if (dto.startTime !== undefined) scheme.startTime = dto.startTime;
    if (dto.endTime !== undefined) scheme.endTime = dto.endTime;
    if (dto.interpolationMode !== undefined) scheme.interpolationMode = dto.interpolationMode;
    if (dto.interpolationInterval !== undefined)
      scheme.interpolationInterval = dto.interpolationInterval;
    if (dto.presetRange !== undefined) scheme.presetRange = dto.presetRange;
    if (dto.scene !== undefined) scheme.scene = dto.scene;
    if (dto.timeRangeMinutes !== undefined) scheme.timeRangeMinutes = dto.timeRangeMinutes;
    if (dto.refreshIntervalSec !== undefined) scheme.refreshIntervalSec = dto.refreshIntervalSec;
    return this.repo.save(scheme);
  }

  async delete(id: string): Promise<void> {
    const scheme = await this.getById(id);
    await this.repo.remove(scheme);
  }
}
