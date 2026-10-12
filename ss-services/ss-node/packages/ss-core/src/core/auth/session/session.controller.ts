// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';

@ApiTags('会话管理')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前用户的所有活跃会话' })
  async getUserSessions(@Req() req: any) {
    const sessions = this.sessionService.getUserSessions(req.user.id);
    return { sessions, count: sessions.length };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '强制登出指定会话' })
  async forceLogoutSession(@Req() req: any, @Param('id') sessionId: string) {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('会话不存在');
    }

    // Only allow deleting own sessions or admin can delete any
    if (session.userId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('无权操作此会话');
    }

    const result = this.sessionService.forceLogout(sessionId);
    if (!result) {
      throw new BadRequestException('登出会话失败');
    }

    return { message: '会话已登出' };
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登出所有其他会话，仅保留当前会话' })
  async logoutAllOtherSessions(@Req() req: any) {
    // Get current session ID from request (could be in header or body)
    const currentSessionId = (req as any).headers?.['x-session-id'] || req.user?.sessionId;
    if (!currentSessionId) {
      throw new BadRequestException('缺少当前会话ID');
    }

    const count = this.sessionService.logoutAllExcept(req.user.id, currentSessionId);
    return {
      message: `已登出 ${count} 个其他会话`,
      loggedOutCount: count,
    };
  }

  @Get('sessions/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前用户的登录历史' })
  async getLoginHistory(@Req() req: any) {
    const history = this.sessionService.getLoginHistory(req.user.id);
    return { history, count: history.length };
  }
}
