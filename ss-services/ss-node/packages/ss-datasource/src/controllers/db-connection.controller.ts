// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

﻿﻿﻿﻿﻿﻿﻿import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@ss-node/ss-core';
import { DbConnectionService } from '../services/db-connection.service';
import { CreateDbConnectionDto } from '../dto/create-db-connection.dto';
import { UpdateDbConnectionDto } from '../dto/update-db-connection.dto';

@ApiTags('数据库连接')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/db-connections')
export class DbConnectionController {
  private readonly logger = new Logger(DbConnectionController.name);

  constructor(private readonly dbConnectionService: DbConnectionService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '创建数据库连接' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateDbConnectionDto) {
    return this.dbConnectionService.create(projectId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取项目下所有数据库连接' })
  findAll(@Param('projectId') projectId: string) {
    return this.dbConnectionService.findAll(projectId);
  }

  @Get(':dbConnectionId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取单个数据库连接' })
  findOne(@Param('projectId') projectId: string, @Param('dbConnectionId') dbConnectionId: string) {
    return this.dbConnectionService.findOne(projectId, dbConnectionId);
  }

  @Patch(':dbConnectionId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '更新数据库连接' })
  update(
    @Param('projectId') projectId: string,
    @Param('dbConnectionId') dbConnectionId: string,
    @Body() dto: UpdateDbConnectionDto,
  ) {
    return this.dbConnectionService.update(projectId, dbConnectionId, dto);
  }

  @Delete(':dbConnectionId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除数据库连接' })
  remove(@Param('projectId') projectId: string, @Param('dbConnectionId') dbConnectionId: string) {
    return this.dbConnectionService.remove(projectId, dbConnectionId);
  }

  @Post(':dbConnectionId/test')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '测试数据库连接' })
  async test(
    @Param('projectId') projectId: string,
    @Param('dbConnectionId') dbConnectionId: string,
  ) {
    const result = await this.dbConnectionService.test(projectId, dbConnectionId);
    return { data: result };
  }

  @Get(':dbConnectionId/tables')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取数据库中所有表' })
  async getTables(
    @Param('projectId') projectId: string,
    @Param('dbConnectionId') dbConnectionId: string,
  ) {
    const tables = await this.dbConnectionService.getTables(projectId, dbConnectionId);
    return { data: tables };
  }

  @Get(':dbConnectionId/tables/:tableName/columns')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  @ApiOperation({ summary: '获取指定表的字段列表' })
  async getColumns(
    @Param('projectId') projectId: string,
    @Param('dbConnectionId') dbConnectionId: string,
    @Param('tableName') tableName: string,
  ) {
    const columns = await this.dbConnectionService.getColumns(projectId, dbConnectionId, tableName);
    return { data: columns };
  }

  @Post(':dbConnectionId/query')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '执行 SQL 查询（仅 SELECT，限制 100 条）' })
  async executeQuery(
    @Param('projectId') projectId: string,
    @Param('dbConnectionId') dbConnectionId: string,
    @Body() body: { sql: string },
  ) {
    const sql = (body.sql || '').trim();
    if (!/^SELECT\s/i.test(sql)) {
      return { data: [], error: 'Only SELECT queries are allowed' };
    }
    const limited = sql.replace(/;\s*$/, '') + ' LIMIT 100';
    const rows = await this.dbConnectionService.executeQuery(projectId, dbConnectionId, limited);
    return { data: rows };
  }
}
