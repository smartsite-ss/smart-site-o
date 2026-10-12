// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth.module';
import { WechatAuthService } from './wechat-auth.service';
import { WechatAuthController } from './wechat-auth.controller';
import { WechatMpAuthService } from './wechat-mp-auth.service';
import { WechatMpAuthController } from './wechat-mp-auth.controller';
import { WechatApiService } from './wechat-api.service';
import { WechatStateService } from './wechat-state.service';
import { ProjectAuthorization } from '../../user/entities/project-authorization.entity';

/**
 * 微信扫码登录模块
 *
 * 注册方式：在 app.module.ts 的 sharedModules 中独立注册（在 AuthModule 之后）。
 *
 * 依赖关系：
 *   - imports: [AuthModule] —— 显式导入以注入 AuthService（AuthModule 非 @Global，
 *             必须显式 import 才能在 WechatAuthService 中注入 AuthService。
 *             AuthModule 不反向导入 WechatAuthModule，故无循环依赖）
 *   - @Global 模块自动可用：RedisModule（REDIS_CLIENT_DEFAULT）、
 *     UserModule（UserService）、AuditLoggerModule（AuditLoggerService）、
 *     I18nModule（I18nService）
 *   - providers: WechatAuthService, WechatApiService, WechatStateService
 *   - controllers: WechatAuthController
 *   - exports: WechatAuthService
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ProjectAuthorization])],
  controllers: [WechatAuthController, WechatMpAuthController],
  providers: [WechatAuthService, WechatMpAuthService, WechatApiService, WechatStateService],
  exports: [WechatAuthService, WechatMpAuthService],
})
export class WechatAuthModule {}
