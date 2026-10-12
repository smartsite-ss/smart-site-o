// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

﻿﻿﻿﻿﻿﻿﻿import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { TagGroupService } from './tag-group.service';

@ApiTags('标签分组管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/datatags/groups')
export class TagGroupController {
  constructor(private readonly groupService: TagGroupService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '创建标签分组' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  create(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; parentId?: string; sortOrder?: number },
  ) {
    return this.groupService.create(projectId, body.name, body.parentId, body.sortOrder);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取所有标签分组' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  findAll(@Param('projectId') projectId: string) {
    return this.groupService.findAll(projectId);
  }

  @Get('tree')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取标签分组树形结构 (最多3级)' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  findTree(@Param('projectId') projectId: string) {
    return this.groupService.findTree(projectId);
  }

  @Get(':tagGroupId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取分组详情' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagGroupId', description: '分组ID' })
  findOne(@Param('tagGroupId') tagGroupId: string) {
    return this.groupService.findById(tagGroupId);
  }

  @Patch(':tagGroupId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新分组' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagGroupId', description: '分组ID' })
  update(
    @Param('tagGroupId') tagGroupId: string,
    @Body() body: { name?: string; parentId?: string; sortOrder?: number },
  ) {
    return this.groupService.update(tagGroupId, body);
  }

  @Delete(':tagGroupId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除分组 (子分组上移)' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiParam({ name: 'tagGroupId', description: '分组ID' })
  remove(@Param('tagGroupId') tagGroupId: string) {
    return this.groupService.remove(tagGroupId);
  }
}
