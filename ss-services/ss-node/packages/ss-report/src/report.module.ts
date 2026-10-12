// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { DataModule } from '@ss-node/ss-storage-influx';
import { AlarmModule } from '@ss-node/ss-alarm';
import { DeviceModule } from '@ss-node/ss-device';

@Module({
  imports: [DataModule, AlarmModule, DeviceModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
