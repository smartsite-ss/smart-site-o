// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('多因素认证')
@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '启用MFA，返回二维码URI' })
  async enableMfa(@Req() req: any) {
    const userId = req.user.id;

    if (this.mfaService.isMfaEnabled(userId)) {
      throw new BadRequestException('MFA已启用');
    }

    const secret = this.mfaService.generateSecret();
    const qrCodeUri = this.mfaService.generateQrCodeUri(secret, req.user.username);

    return {
      secret,
      qrCodeUri,
      message: '请使用验证器应用扫描二维码，然后调用 /verify 接口验证',
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证MFA令牌并启用' })
  async verifyMfa(@Req() req: any, @Body() body: { secret: string; token: string }) {
    const userId = req.user.id;

    if (!body.secret || !body.token) {
      throw new BadRequestException('缺少secret或token参数');
    }

    const isValid = this.mfaService.verifyToken(body.secret, body.token);
    if (!isValid) {
      throw new BadRequestException('MFA令牌验证失败');
    }

    const { recoveryCodes } = this.mfaService.enableMfa(userId, body.secret);

    return {
      message: 'MFA已成功启用',
      recoveryCodes,
      warning: '请妥善保存恢复码，每个恢复码只能使用一次',
    };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '禁用MFA' })
  async disableMfa(@Req() req: any, @Body() body: { token: string }) {
    const userId = req.user.id;

    if (!this.mfaService.isMfaEnabled(userId)) {
      throw new BadRequestException('MFA未启用');
    }

    if (!body.token) {
      throw new BadRequestException('缺少token参数');
    }

    const isValid = this.mfaService.verifyMfaToken(userId, body.token);
    if (!isValid) {
      throw new BadRequestException('MFA令牌验证失败');
    }

    this.mfaService.disableMfa(userId);
    return { message: 'MFA已禁用' };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询MFA状态' })
  async getMfaStatus(@Req() req: any) {
    const userId = req.user.id;
    const status = this.mfaService.getMfaStatus(userId);
    return status;
  }

  @Post('recovery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用恢复码' })
  async useRecoveryCode(@Req() req: any, @Body() body: { recoveryCode: string }) {
    const userId = req.user.id;

    if (!body.recoveryCode) {
      throw new BadRequestException('缺少recoveryCode参数');
    }

    const success = this.mfaService.useRecoveryCode(userId, body.recoveryCode);
    if (!success) {
      throw new BadRequestException('恢复码无效或已被使用');
    }

    const remaining = this.mfaService.getRemainingRecoveryCodes(userId);
    return {
      message: '恢复码验证成功',
      remainingRecoveryCodes: remaining,
    };
  }
}
