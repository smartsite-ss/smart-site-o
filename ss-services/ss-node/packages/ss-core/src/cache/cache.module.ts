// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataPointCache } from './data-point.entity';
import { DataPointCacheService } from './data-point-cache.service';
import { DataPointRepository } from './data-point.repository';
import { MultiLevelCacheService } from './multi-level-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([DataPointCache])],
  providers: [DataPointCacheService, DataPointRepository, MultiLevelCacheService],
  exports: [DataPointCacheService, DataPointRepository, MultiLevelCacheService],
})
export class CacheModule {}
