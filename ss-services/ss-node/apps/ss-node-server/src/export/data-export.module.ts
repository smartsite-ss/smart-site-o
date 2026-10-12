// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { CacheModule } from '@ss-node/ss-core';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';

export { DataExportService } from './data-export.service';

@Module({
  imports: [CacheModule],
  providers: [DataExportService],
  controllers: [DataExportController],
  exports: [DataExportService],
})
export class DataExportModule {}
