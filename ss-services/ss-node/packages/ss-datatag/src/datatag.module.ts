// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataTag } from './entities/data-tag.entity';
import { TagGroup } from './entities/tag-group.entity';
import { DataTagService } from './datatag.service';
import { DataTagController } from './datatag.controller';
import { TagGroupService } from './group/tag-group.service';
import { TagGroupController } from './group/tag-group.controller';
import { TagImportService } from './import/tag-import.service';
import { TagExportService } from './export/tag-export.service';
import { CacheModule } from '@ss-node/ss-core';

@Module({
  imports: [TypeOrmModule.forFeature([DataTag, TagGroup]), CacheModule],
  controllers: [DataTagController, TagGroupController],
  providers: [DataTagService, TagGroupService, TagImportService, TagExportService],
  exports: [DataTagService, TagGroupService, TagImportService, TagExportService],
})
export class DatatagModule {}
