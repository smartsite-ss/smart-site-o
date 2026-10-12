// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { PositionService, CreatePositionDto, UpdatePositionDto } from './position.service';

@ApiTags('岗位管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get()
  @ApiOperation({ summary: '获取岗位列表' })
  async findAll() {
    return this.positionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取岗位详情' })
  async findById(@Param('id') id: string) {
    return this.positionService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建岗位（管理员）' })
  async create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新岗位（管理员）' })
  async update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除岗位（管理员）' })
  async delete(@Param('id') id: string) {
    await this.positionService.delete(id);
    return { ok: true };
  }
}
