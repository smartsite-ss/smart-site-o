// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HistoricalData } from './entities/historical-data.entity';

@Injectable()
export class DataService {
  constructor(
    @Inject(getRepositoryToken(HistoricalData))
    private historicalDataRepository: Repository<HistoricalData>,
  ) {}

  async getHistoricalData(
    tagId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<HistoricalData[]> {
    return this.historicalDataRepository.find({
      where: { tagId, timestamp: Between(startTime, endTime) },
      order: { timestamp: 'ASC' },
    });
  }

  async getLatestData(tagId: string): Promise<HistoricalData | null> {
    return this.historicalDataRepository.findOne({
      where: { tagId },
      order: { timestamp: 'DESC' },
    });
  }
}
