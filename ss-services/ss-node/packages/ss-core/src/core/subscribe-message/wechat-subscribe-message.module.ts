// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { WechatSubscribeAuthorization } from './entities/wechat-subscribe-authorization.entity';
import { WechatNotificationPreference } from './entities/wechat-notification-preference.entity';
import { WechatSubscribeMessageChannel } from './wechat-subscribe-message.channel';
import { SubscribeMessageService } from './subscribe-message.service';
import { SubscribeMessageController } from './subscribe-message.controller';

/**
 * 微信小程序订阅消息模块（10 模块）
 *
 * 注册方式：在 app.module.ts 的 sharedModules 中注册（@Global）。
 * @Global 使 ss-alarm 的 AlarmNotificationService 可通过 @Optional() 注入
 * WechatSubscribeMessageChannel，无需在 AlarmModule 显式 import（未注入时安全降级）。
 *
 * 依赖关系：
 *   - imports: TypeOrmModule.forFeature —— User（解析 wechatMpOpenId）、
 *             订阅授权记录、通知偏好（实体经 DatabaseModule synchronize 建表）
 *   - providers: WechatSubscribeMessageChannel（发送通道）、SubscribeMessageService
 *   - controllers: SubscribeMessageController（/wechat/subscribe/*）
 *   - exports: 通道与服务（供跨模块注入）
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, WechatSubscribeAuthorization, WechatNotificationPreference]),
  ],
  controllers: [SubscribeMessageController],
  providers: [WechatSubscribeMessageChannel, SubscribeMessageService],
  exports: [WechatSubscribeMessageChannel, SubscribeMessageService],
})
export class WechatSubscribeMessageModule {}
