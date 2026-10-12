// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Repository } from 'typeorm';
import { DataPointCache } from './data-point.entity';
export declare class DataPointRepository {
  private repo;
  private readonly logger;
  constructor(repo: Repository<DataPointCache>);
  upsertValue(
    tagId: string,
    deviceId: string,
    projectId: string,
    value: number,
    quality: string,
  ): Promise<void>;
  getValue(tagId: string): Promise<DataPointCache | null>;
  getValuesByDevice(deviceId: string): Promise<DataPointCache[]>;
  getValuesByProject(projectId: string): Promise<DataPointCache[]>;
  deleteByDevice(deviceId: string): Promise<void>;
  getStaleData(maxAgeMs: number): Promise<DataPointCache[]>;
  getCount(): Promise<number>;
}
