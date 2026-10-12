// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionService } from './session/session.service';
import { SessionController } from './session/session.controller';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { PreviewTicketService } from './preview-ticket/preview-ticket.service';
import { PreviewTicketController } from './preview-ticket/preview-ticket.controller';

/**
 * 使用 JwtModule.registerAsync 而非 register，原因：
 *
 * JwtModule.register 在 @Module 装饰器阶段同步执行，此时 ConfigModule
 * 尚未加载 .env 文件，process.env.JWT_SECRET 为 undefined，导致 secret
 * 回退为 'your-secret-key'，与 JwtStrategy 中读取的 process.env.JWT_SECRET
 * 不一致（JwtStrategy 构造函数在依赖注入阶段才执行，此时 .env 已加载），
 * 造成 token 签名验证失败（401 Unauthorized）。
 *
 * registerAsync 通过 useFactory + inject:[ConfigService]，确保 secret 在
 * ConfigModule 加载 .env 之后才被读取。
 */
@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, SessionController, MfaController, PreviewTicketController],
  providers: [AuthService, JwtStrategy, LocalStrategy, SessionService, MfaService, PreviewTicketService],
  exports: [AuthService, SessionService, MfaService],
})
export class AuthModule {}
