// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemConfigService, ConfigItemView, ConfigUpdateResult } from './system-config.service';
import { SystemRestartService, RestartState } from '../restart/system-restart.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';

@ApiTags('系统配置')
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemConfigController {
  private readonly logger = new Logger(SystemConfigController.name);

  constructor(
    private readonly configService: SystemConfigService,
    private readonly restartService: SystemRestartService,
  ) {}

  // ==================== 配置元数据 ====================

  @Get('configs/metadata')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有配置项元数据' })
  async getMetadata() {
    this.logger.log(
      '[DEBUG] getMetadata called, metadata count: ' + this.configService.getMetadata().length,
    );
    return {
      categories: this.configService.getMetadataByCategory(),
      items: this.configService.getMetadata(),
    };
  }

  @Get('configs/full')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有配置项（含元数据 + 当前值）' })
  async getAllWithMeta(): Promise<ConfigItemView[]> {
    const result = await this.configService.getAllWithMeta();
    this.logger.log(
      '[DEBUG] getAllWithMeta called, result count: ' + (result?.length ?? 'null/undefined'),
    );
    return result;
  }

  // ==================== 配置 CRUD ====================

  @Get('configs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有系统配置（仅 DB 中的）' })
  async getAll() {
    return this.configService.getAll();
  }

  @Get('configs/:key')
  @ApiOperation({ summary: '获取指定配置' })
  async get(@Param('key') key: string) {
    const value = await this.configService.get(key);
    return { key, value };
  }

  @Patch('configs/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新系统配置（带元数据校验，可选回写 env 文件）' })
  async set(
    @Param('key') key: string,
    @Body() body: { value: string; writeEnv?: boolean; description?: string },
  ): Promise<ConfigUpdateResult> {
    return this.configService.setWithMeta(key, body.value, {
      writeEnv: body.writeEnv ?? false,
      description: body.description,
    });
  }

  @Delete('configs/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除系统配置（仅 DB，不影响 env 文件）' })
  async delete(@Param('key') key: string) {
    await this.configService.delete(key);
    return { ok: true };
  }

  // ==================== 待重启清单 ====================

  @Get('configs/restart-required/list')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取待重启的配置清单' })
  async getRestartRequired() {
    const keys = await this.configService.getRestartRequired();
    return { keys, count: keys.length };
  }

  @Post('configs/restart-required/clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '清空待重启清单' })
  async clearRestartRequired() {
    await this.configService.clearPendingRestart();
    return { ok: true };
  }

  // ==================== 系统重启 ====================

  @Post('restart')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '触发系统重启' })
  async restart(@Req() req: any): Promise<RestartState> {
    const username = req.user?.username || 'unknown';
    return this.restartService.triggerRestart(username);
  }

  @Get('restart/status')
  @ApiOperation({ summary: '获取系统重启状态' })
  async getRestartStatus(): Promise<RestartState> {
    return this.restartService.getRestartStatus();
  }

  @Post('restart/clear-marker')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '清除重启 marker 文件' })
  async clearRestartMarker() {
    this.restartService.clearMarker();
    return { ok: true };
  }
}
