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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlarmGroupService } from './alarm-group.service';
import { JwtAuthGuard } from '@ss-node/ss-core';

@ApiTags('报警分组')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/alarm-groups')
export class AlarmGroupController {
  constructor(private readonly groupService: AlarmGroupService) {}

  @Post()
  @ApiOperation({ summary: '创建报警分组' })
  createGroup(@Param('projectId') projectId: string, @Body() dto: any) {
    return this.groupService.createGroup({ ...dto, projectId });
  }

  @Get()
  @ApiOperation({ summary: '获取项目下所有报警分组' })
  findAllGroups(@Param('projectId') projectId: string) {
    return this.groupService.findAllGroups(projectId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取报警分组树形结构' })
  getGroupTree(@Param('projectId') projectId: string) {
    return this.groupService.getGroupTree(projectId);
  }

  @Get(':alarmGroupId')
  @ApiOperation({ summary: '获取单个报警分组' })
  findOneGroup(@Param('alarmGroupId') alarmGroupId: string) {
    return this.groupService.findOneGroup(alarmGroupId);
  }

  @Patch(':alarmGroupId')
  @ApiOperation({ summary: '更新报警分组' })
  updateGroup(@Param('alarmGroupId') alarmGroupId: string, @Body() dto: any) {
    return this.groupService.updateGroup(alarmGroupId, dto);
  }

  @Delete(':alarmGroupId')
  @ApiOperation({ summary: '删除报警分组' })
  removeGroup(@Param('alarmGroupId') alarmGroupId: string) {
    return this.groupService.removeGroup(alarmGroupId);
  }

  @Post(':alarmGroupId/acknowledge')
  @ApiOperation({ summary: '批量确认分组内所有报警' })
  batchAcknowledge(@Param('alarmGroupId') alarmGroupId: string, @Request() req) {
    return this.groupService.batchAcknowledge(alarmGroupId, req.user?.id || 'system');
  }
}
