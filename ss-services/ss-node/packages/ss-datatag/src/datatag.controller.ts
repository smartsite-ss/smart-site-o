// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { DataTagService } from './datatag.service';
import { CreateDataTagDto } from './dto/create-datatag.dto';
import { UpdateDataTagDto } from './dto/update-datatag.dto';
import { TagQueryDto } from './dto/tag-query.dto';
import { BatchCreateDataTagDto } from './dto/batch-create-datatag.dto';
import { TagImportDto } from './dto/tag-import.dto';
import { TagImportService } from './import/tag-import.service';
import { TagExportService } from './export/tag-export.service';

@ApiTags('数据标签管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/datatags')
export class DataTagController {
  constructor(
    private readonly tagService: DataTagService,
    private readonly importService: TagImportService,
    private readonly exportService: TagExportService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '创建数据标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateDataTagDto) {
    dto.projectId = projectId;
    return this.tagService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '查询标签列表 (支持分页、搜索、筛选)' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiQuery({ name: 'deviceId', required: false, description: '设备ID' })
  findAll(@Param('projectId') projectId: string, @Query() query: TagQueryDto) {
    return this.tagService.findAll(projectId, query);
  }

  // ──────────── 搜索 & 导出（必须在 :tagId 之前，避免被参数路由匹配） ────────────

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '跨设备搜索标签' })
  @ApiQuery({ name: 'q', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'type', required: false, description: '标签数据类型' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  searchTags(
    @Param('projectId') projectId: string,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    if (parsedLimit < 1 || parsedLimit > 100) {
      return Promise.reject(new BadRequestException([{ field: 'limit', message: 'must not be greater than 100' }]));
    }
    return this.tagService.searchTags(
      projectId,
      q,
      type,
      parsedPage,
      parsedLimit,
    );
  }

  @Get('export/:deviceId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '导出设备标签 (JSON)' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  exportTags(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {
    return this.exportService.exportByDevice(deviceId, projectId);
  }

  // ──────────── :tagId 参数路由 ────────────

  @Get(':tagId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取标签详情' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagId', description: '标签ID' })
  findOne(@Param('tagId') tagId: string) {
    return this.tagService.findById(tagId);
  }

  @Patch(':tagId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新标签配置' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagId', description: '标签ID' })
  update(@Param('tagId') tagId: string, @Body() dto: UpdateDataTagDto) {
    return this.tagService.update(tagId, dto);
  }

  @Delete(':tagId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagId', description: '标签ID' })
  remove(@Param('tagId') tagId: string) {
    return this.tagService.remove(tagId);
  }

  // ──────────── 批量操作 ────────────

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '批量创建标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  batchCreate(@Param('projectId') projectId: string, @Body() dto: BatchCreateDataTagDto) {
    const tagsWithProject = dto.tags.map((t) => ({ ...t, projectId }));
    return this.tagService.batchCreate(tagsWithProject);
  }

  @Delete('batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '批量删除标签' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  batchDelete(@Body() body: { ids: string[] }) {
    return this.tagService.batchDelete(body.ids);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '批量导入标签 (JSON)' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  importTags(@Param('projectId') projectId: string, @Body() body: TagImportDto) {
    // deviceId 现为必填（DTO @IsString 校验），禁止回退 'default-device' 占位，
    // 否则标签 deviceId 与真实设备 UUID 失关联，导致按 deviceId 查询返回空（见 07 §4.1 G5）。
    return this.importService.importJson(body.tags, body.deviceId!, projectId, body.options);
  }

  @Post('batch/values')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '批量获取标签最新值' })
  batchGetLatest(@Param('projectId') projectId: string, @Body() body: { tagIds: string[] }) {
    return this.tagService.batchGetLatest(projectId, body.tagIds);
  }
}
