// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 订阅消息服务（10 模块）
 *
 * 职责：授权结果上报（配额维护）/ 通知偏好读写 / 配额查询。
 * 授权上报需解析当前用户的小程序 openid（sys_users.wechat_mp_open_id）。
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import {
  SubscribeAuthorizationStatus,
  WechatSubscribeAuthorization,
} from './entities/wechat-subscribe-authorization.entity';
import {
  MinimumAlarmLevel,
  WechatNotificationPreference,
} from './entities/wechat-notification-preference.entity';
import { WechatSubscribeMessageChannel } from './wechat-subscribe-message.channel';

/** 授权上报结果（uni.requestSubscribeMessage 单模板结果） */
export interface AuthorizationReportDto {
  templateId: string;
  result: SubscribeAuthorizationStatus;
}

/** 通知偏好更新载荷 */
export interface NotificationPreferenceDto {
  alarmNotificationEnabled?: boolean;
  minimumAlarmLevel?: MinimumAlarmLevel;
}

const VALID_AUTHORIZATION_RESULTS: SubscribeAuthorizationStatus[] = ['accept', 'reject', 'ban'];
const VALID_ALARM_LEVELS: MinimumAlarmLevel[] = ['info', 'warning', 'error', 'critical'];

@Injectable()
export class SubscribeMessageService {
  private readonly logger = new Logger(SubscribeMessageService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WechatSubscribeAuthorization)
    private readonly authorizationRepo: Repository<WechatSubscribeAuthorization>,
    @InjectRepository(WechatNotificationPreference)
    private readonly preferenceRepo: Repository<WechatNotificationPreference>,
    private readonly subscribeChannel: WechatSubscribeMessageChannel,
  ) {}

  /** 订阅配置（前端授权流程使用：模板 ID 配置驱动，未配置返回空） */
  getSubscribeConfig(): {
    alarmTemplateId: string;
    deviceStatusTemplateId: string;
    configured: boolean;
  } {
    return {
      alarmTemplateId: this.subscribeChannel.getAlarmTemplateId(),
      deviceStatusTemplateId: this.subscribeChannel.getDeviceStatusTemplateId(),
      configured: this.subscribeChannel.isConfigured(),
    };
  }

  /**
   * 上报订阅授权结果：accept 累加配额，其余仅记录状态
   * @returns 最新剩余配额
   */
  async reportAuthorization(userId: string, dto: AuthorizationReportDto): Promise<{ quotaRemaining: number }> {
    if (!dto.templateId || !VALID_AUTHORIZATION_RESULTS.includes(dto.result)) {
      throw new BadRequestException('无效的订阅授权上报参数');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.wechatMpOpenId) {
      throw new NotFoundException('当前账号未绑定小程序微信身份，无法订阅');
    }

    let authorization = await this.authorizationRepo.findOne({
      where: { userId, templateId: dto.templateId },
    });
    if (!authorization) {
      authorization = this.authorizationRepo.create({
        userId,
        mpOpenId: user.wechatMpOpenId,
        templateId: dto.templateId,
        authorizationStatus: dto.result,
        quotaRemaining: 0,
        authorizedAt: new Date(),
      });
    }
    authorization.authorizationStatus = dto.result;
    authorization.authorizedAt = new Date();
    if (dto.result === 'accept') {
      authorization.quotaRemaining += 1;
    } else if (dto.result === 'ban') {
      // 用户在设置中关闭订阅 → 配额失效
      authorization.quotaRemaining = 0;
    }
    await this.authorizationRepo.save(authorization);

    this.logger.log(
      `订阅授权上报：userId=${userId} template=${dto.templateId} result=${dto.result} quota=${authorization.quotaRemaining}`,
    );
    return { quotaRemaining: authorization.quotaRemaining };
  }

  /** 查询指定模板剩余配额（无记录视为 0） */
  async getQuota(userId: string, templateId: string): Promise<{ quotaRemaining: number }> {
    const authorization = await this.authorizationRepo.findOne({
      where: { userId, templateId },
    });
    return { quotaRemaining: authorization?.quotaRemaining ?? 0 };
  }

  /** 获取通知偏好（无记录返回默认值：开启 + 全级别） */
  async getPreferences(userId: string): Promise<WechatNotificationPreference> {
    const preference = await this.preferenceRepo.findOne({ where: { userId } });
    if (preference) {
      return preference;
    }
    return this.preferenceRepo.create({
      userId,
      alarmNotificationEnabled: true,
      minimumAlarmLevel: 'info',
    });
  }

  /** 更新通知偏好（upsert） */
  async updatePreferences(
    userId: string,
    dto: NotificationPreferenceDto,
  ): Promise<WechatNotificationPreference> {
    if (dto.minimumAlarmLevel && !VALID_ALARM_LEVELS.includes(dto.minimumAlarmLevel)) {
      throw new BadRequestException('无效的报警级别');
    }

    let preference = await this.preferenceRepo.findOne({ where: { userId } });
    if (!preference) {
      preference = this.preferenceRepo.create({
        userId,
        alarmNotificationEnabled: true,
        minimumAlarmLevel: 'info',
      });
    }
    if (dto.alarmNotificationEnabled !== undefined) {
      preference.alarmNotificationEnabled = dto.alarmNotificationEnabled;
    }
    if (dto.minimumAlarmLevel !== undefined) {
      preference.minimumAlarmLevel = dto.minimumAlarmLevel;
    }
    return this.preferenceRepo.save(preference);
  }
}
