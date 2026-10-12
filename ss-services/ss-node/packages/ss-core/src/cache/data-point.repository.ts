// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { DataPointCache } from './data-point.entity';

@Injectable()
export class DataPointRepository {
  private readonly logger = new Logger(DataPointRepository.name);

  constructor(
    @Inject(getRepositoryToken(DataPointCache))
    private repo: Repository<DataPointCache>,
  ) {}

  async upsertValue(
    tagId: string,
    deviceId: string,
    projectId: string,
    value: number,
    quality: string,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(DataPointCache)
      .values({ tagId, deviceId, projectId, value, quality, updatedAt: new Date() })
      .orUpdate(['value', 'quality', 'updatedAt'], ['tagId'])
      .execute();
  }

  async getValue(tagId: string): Promise<DataPointCache | null> {
    return this.repo.findOne({ where: { tagId } });
  }

  async getValuesByDevice(deviceId: string): Promise<DataPointCache[]> {
    return this.repo.find({ where: { deviceId } });
  }

  async getValuesByProject(projectId: string): Promise<DataPointCache[]> {
    return this.repo.find({ where: { projectId } });
  }

  async deleteByDevice(deviceId: string): Promise<void> {
    await this.repo.delete({ deviceId });
  }

  async getStaleData(maxAgeMs: number): Promise<DataPointCache[]> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    return this.repo.createQueryBuilder('dp').where('dp.updatedAt < :cutoff', { cutoff }).getMany();
  }

  async getCount(): Promise<number> {
    return this.repo.count();
  }
}
