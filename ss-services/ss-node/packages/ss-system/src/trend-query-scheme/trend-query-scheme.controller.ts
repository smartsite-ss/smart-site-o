// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@ss-node/ss-core';
import {
  TrendQuerySchemeService,
  CreateTrendQuerySchemeDto,
  UpdateTrendQuerySchemeDto,
} from './trend-query-scheme.service';
import { TrendQueryScheme } from '../entities/trend-query-scheme.entity';

@ApiTags('趋势查询方案')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trend-query-schemes')
export class TrendQuerySchemeController {
  constructor(private readonly service: TrendQuerySchemeService) {}

  @Get()
  @ApiOperation({ summary: '获取项目下的查询方案（可按 scene 过滤）' })
  async list(
    @Query('projectId') projectId: string,
    @Query('scene') scene?: string,
  ): Promise<TrendQueryScheme[]> {
    return this.service.list(projectId, scene);
  }

  @Get(':schemeId')
  @ApiOperation({ summary: '获取单个查询方案详情' })
  async getById(@Param('schemeId') schemeId: string): Promise<TrendQueryScheme> {
    return this.service.getById(schemeId);
  }

  @Post()
  @ApiOperation({ summary: '创建查询方案' })
  async create(@Body() dto: CreateTrendQuerySchemeDto, @Req() req: any): Promise<TrendQueryScheme> {
    const createdBy = req.user?.username || req.user?.id;
    return this.service.create(dto, createdBy);
  }

  @Patch(':schemeId')
  @ApiOperation({ summary: '更新查询方案' })
  async update(
    @Param('schemeId') schemeId: string,
    @Body() dto: UpdateTrendQuerySchemeDto,
  ): Promise<TrendQueryScheme> {
    return this.service.update(schemeId, dto);
  }

  @Delete(':schemeId')
  @ApiOperation({ summary: '删除查询方案' })
  async delete(@Param('schemeId') schemeId: string): Promise<{ success: boolean }> {
    await this.service.delete(schemeId);
    return { success: true };
  }
}
