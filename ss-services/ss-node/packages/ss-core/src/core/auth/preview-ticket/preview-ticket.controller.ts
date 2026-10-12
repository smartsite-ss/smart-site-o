// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PreviewTicketService } from './preview-ticket.service';
import { PreviewTicketExchangeDto } from './dto/preview-ticket-exchange.dto';
import { PreviewTicketIssueDto } from './dto/preview-ticket-issue.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

/**
 * 组态运行态预览票据端点（06 方案路线 B #2 ticket 鉴权桥）
 *
 * - POST /auth/preview-ticket：已认证客户端（移动端 Bearer Token）签发一次性票据；
 * - POST /auth/preview-ticket-exchange：H5 运行态壳以票据兑换会话凭证（公开端点，票据本身即凭证）。
 *
 * 鉴权模式：Bearer Token（响应体返回）。
 * 历史背景：原本设置 HttpOnly Cookie（SameSite=Strict），仅适用于「壳与 H5 同源部署」场景。
 * 现 H5 iframe 改为直连远程 8080 壳（跨源），浏览器会把 SameSite=Strict Cookie 视为第三方
 * Cookie 拦截 → 壳内所有 API 401。改用 Bearer 后，壳内 axios 注入 `Authorization` 头，
 * `JwtStrategy` 已支持从该头取 token（见 jwt.strategy.ts `extractJwtFromRequest`）。
 */
@ApiTags('认证')
@Controller('auth')
export class PreviewTicketController {
  private readonly logger = new Logger(PreviewTicketController.name);

  constructor(private readonly previewTicketService: PreviewTicketService) {}

  @Post('preview-ticket')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: PreviewTicketIssueDto })
  @ApiOperation({
    summary: '签发一次性预览票据（移动端 Bearer 会话 → 票据 + 完整壳 URL，供 H5 运行态壳兑换 Bearer 会话）',
  })
  async issuePreviewTicket(
    @Req() request: Request,
    @Body() previewTicketIssueDto: PreviewTicketIssueDto,
  ): Promise<{ previewTicket: string; previewUrl?: string }> {
    const user = (request as Request & { user: { id: string } }).user;
    const previewTicket = this.previewTicketService.issuePreviewTicket(user.id);
    // 方案 C：后端按 SCADA_SHELL_BASE_URL 拼装完整壳 URL；未配置时为 undefined，前端回退本地拼接
    const previewUrl = this.previewTicketService.buildPreviewUrl(previewTicket, previewTicketIssueDto);
    return { previewTicket, previewUrl };
  }

  @Post('preview-ticket-exchange')
  @HttpCode(HttpStatus.OK)
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiBody({ type: PreviewTicketExchangeDto })
  @ApiOperation({ summary: '兑换预览票据为 Bearer 会话（H5 运行态壳启动时调用，票据一次性消费，响应体返回 Token 对）' })
  async exchangePreviewTicket(
    @Body() previewTicketExchangeDto: PreviewTicketExchangeDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenPair = await this.previewTicketService.consumePreviewTicket(
      previewTicketExchangeDto.previewTicket,
    );
    this.logger.log('[预览票据] 兑换完成 | 响应体返回 Bearer Token 对（壳内 axios 注入 Authorization 头）');
    return tokenPair;
  }
}
