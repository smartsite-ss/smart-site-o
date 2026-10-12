// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService, CreateUserDto, UpdateUserDto } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req) {
    const user = await this.userService.findById(req.user.id);
    if (!user) {
      const { password: _password, ...rest } = req.user;
      return rest;
    }
    const { password: _password, ...rest } = user;
    return rest;
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新个人资料' })
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: '修改密码' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  // ──────── 管理员端点（v6.0 新增） ────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取用户列表（管理员）' })
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((u) => {
      const { password: _password, ...rest } = u;
      return rest;
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建用户（管理员）' })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.userService.adminCreateUser(dto);
    const { password: _password, ...rest } = user;
    return rest;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新用户（管理员）' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.adminUpdateUser(id, dto);
    const { password: _password, ...rest } = user;
    return rest;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '禁用用户（管理员）' })
  async deleteUser(@Param('id') id: string) {
    await this.userService.adminUpdateUser(id, { isActive: false });
    return { ok: true };
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '分配角色（管理员）' })
  async assignRole(@Param('id') id: string, @Body() dto: { roleId: string }) {
    const user = await this.userService.assignRole(id, dto.roleId);
    const { password: _password, ...rest } = user;
    return rest;
  }

  @Patch(':id/position')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '分配岗位（管理员）' })
  async assignPosition(@Param('id') id: string, @Body() dto: { positionId: string }) {
    const user = await this.userService.assignPosition(id, dto.positionId);
    const { password: _password, ...rest } = user;
    return rest;
  }
}
