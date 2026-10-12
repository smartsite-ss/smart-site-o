// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 仪表盘聚合模块（02 模块）
 *
 * 跨包聚合先例参照 ./export（DataExportModule）：
 * 依赖 DeviceModule（设备统计）与 AlarmModule（报警记录仓储）已导出的服务，
 * AlarmRecord 仓储经 TypeOrmModule.forFeature 注入（隔离库模式下由服务内部切换）。
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmRecord } from '@ss-node/ss-alarm';
import { DeviceModule } from '@ss-node/ss-device';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [DeviceModule, TypeOrmModule.forFeature([AlarmRecord])],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
