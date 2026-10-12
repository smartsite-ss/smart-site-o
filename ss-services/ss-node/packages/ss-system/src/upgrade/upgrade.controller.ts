// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UpgradeService } from './upgrade.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('系统升级')
@Controller('system/upgrade')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UpgradeController {
  constructor(private readonly upgradeService: UpgradeService) {}

  @Get('check')
  @ApiOperation({ summary: '检查版本更新' })
  async checkVersion() {
    return this.upgradeService.checkVersion();
  }

  @Post('download/:version')
  @ApiOperation({ summary: '下载升级包' })
  async downloadUpgrade(@Param('version') version: string) {
    return this.upgradeService.downloadUpgrade(version);
  }

  @Post('migrate')
  @ApiOperation({ summary: '运行数据库迁移' })
  async runMigrations() {
    return this.upgradeService.runMigrations();
  }

  @Post('upgrade/:version')
  @ApiOperation({ summary: '执行升级' })
  async performUpgrade(@Param('version') version: string) {
    return this.upgradeService.performUpgrade(version);
  }

  @Post('rollback')
  @ApiOperation({ summary: '回滚升级' })
  async rollback() {
    return this.upgradeService.rollback();
  }
}
