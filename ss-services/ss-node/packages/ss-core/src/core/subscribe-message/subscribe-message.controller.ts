// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 订阅消息接口（10 模块）
 *
 * 路由前缀（含全局 api/v1）：/api/v1/wechat/subscribe/*
 *   - GET  config        模板配置（模板 ID 配置驱动，未配置返回空）
 *   - POST authorization 上报 uni.requestSubscribeMessage 授权结果
 *   - GET  quota         查询剩余发送配额
 *   - GET  preferences   获取通知偏好
 *   - PUT  preferences   更新通知偏好
 */
import { Body, Controller, Get, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthorizationReportDto,
  NotificationPreferenceDto,
  SubscribeMessageService,
} from './subscribe-message.service';

@ApiTags('订阅消息')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wechat/subscribe')
export class SubscribeMessageController {
  constructor(private readonly subscribeMessageService: SubscribeMessageService) {}

  @Get('config')
  @ApiOperation({ summary: '获取订阅模板配置（报警模板 ID）' })
  getConfig() {
    return this.subscribeMessageService.getSubscribeConfig();
  }

  @Post('authorization')
  @ApiOperation({ summary: '上报订阅授权结果（accept 累加发送配额）' })
  reportAuthorization(@Request() req: any, @Body() dto: AuthorizationReportDto) {
    return this.subscribeMessageService.reportAuthorization(req.user.id, dto);
  }

  @Get('quota')
  @ApiOperation({ summary: '查询指定模板剩余发送配额' })
  getQuota(@Request() req: any, @Query('templateId') templateId: string) {
    return this.subscribeMessageService.getQuota(req.user.id, templateId || '');
  }

  @Get('preferences')
  @ApiOperation({ summary: '获取通知偏好' })
  getPreferences(@Request() req: any) {
    return this.subscribeMessageService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: '更新通知偏好（开关 + 最低推送级别）' })
  updatePreferences(@Request() req: any, @Body() dto: NotificationPreferenceDto) {
    return this.subscribeMessageService.updatePreferences(req.user.id, dto);
  }
}
