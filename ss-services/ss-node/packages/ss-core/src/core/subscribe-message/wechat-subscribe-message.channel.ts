// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 微信小程序订阅消息通道（10 模块）
 *
 * 配置驱动 + 未配置降级：
 *   - 模板 ID：WECHAT_SUBSCRIBE_TEMPLATE_ALARM（微信后台外部申请项，未配置时跳过发送并告警日志）
 *   - 字段映射：WECHAT_SUBSCRIBE_TEMPLATE_FIELDS（JSON，载荷字段 → 模板字段名），缺省走默认映射
 *   - 限频：WECHAT_SUBSCRIBE_RATE_LIMIT_PER_HOUR（每用户每小时上限，默认 20）
 *
 * 配额模型：一次性订阅，授权 accept +1 / 成功下发 -1；43101（用户拒收）清零。
 * Mock 模式（WECHAT_MOCK=true）：仅记录日志不实际调用微信 API。
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { httpRequest } from '../../ai/http-client.util';
import {
  WechatSubscribeAuthorization,
} from './entities/wechat-subscribe-authorization.entity';
import {
  ALARM_LEVEL_SEVERITY,
  MinimumAlarmLevel,
  WechatNotificationPreference,
} from './entities/wechat-notification-preference.entity';

/** 订阅消息载荷（与 ss-alarm 通道载荷形状一致；ss-core 不反向依赖，独立声明） */
export interface SubscribeMessagePayload {
  title: string;
  message: string;
  level: string;
  deviceName?: string;
  /** 报警记录 ID（二期 10 #7：随跳转页携带，供小程序冷启动直达报警详情） */
  alarmRecordId?: string;
  timestamp: Date;
}

/** 设备状态订阅消息载荷（二期 10 #6：仅离线/故障推送） */
export interface DeviceStatusSubscribePayload {
  deviceName: string;
  /** 设备状态（DeviceStatus 枚举值，如 offline/error） */
  status: string;
  projectId?: string;
  timestamp: Date;
}

/** 模板字段映射：载荷字段 → 微信模板字段名 */
interface TemplateFieldMapping {
  title: string;
  message: string;
  level: string;
  time: string;
}

/** 设备状态模板字段映射 */
interface DeviceStatusTemplateFieldMapping {
  device: string;
  status: string;
  time: string;
}

const DEFAULT_FIELD_MAPPING: TemplateFieldMapping = {
  title: 'thing1',
  message: 'thing2',
  level: 'phrase3',
  time: 'time4',
};

const DEFAULT_DEVICE_STATUS_FIELD_MAPPING: DeviceStatusTemplateFieldMapping = {
  device: 'thing1',
  status: 'phrase2',
  time: 'time3',
};

/** Mock 模式下设备状态模板占位 ID（未配置真实模板时仍可走通流程） */
export const MOCK_DEVICE_STATUS_TEMPLATE_ID = 'mock-device-status-template';

/** 微信字段长度约束（thing 20 字 / phrase 5 字，超限截断） */
const THING_FIELD_MAX_LENGTH = 20;
const PHRASE_FIELD_MAX_LENGTH = 5;

/** 用户级发送限频滑动窗口（毫秒） */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class WechatSubscribeMessageChannel {
  readonly name = 'wechatSubscribe';

  private readonly logger = new Logger(WechatSubscribeMessageChannel.name);
  private readonly isMock: boolean;
  private readonly mpAppId: string;
  private readonly mpAppSecret: string;
  private readonly alarmTemplateId: string;
  private readonly deviceStatusTemplateId: string;
  private readonly fieldMapping: TemplateFieldMapping;
  private readonly deviceStatusFieldMapping: DeviceStatusTemplateFieldMapping;
  private readonly rateLimitPerHour: number;

  /** 小程序全局 access_token 缓存（提前 60s 过期） */
  private cachedAccessToken: { token: string; expireAt: number } | null = null;
  /** 每用户发送时间戳窗口（限频用） */
  private readonly sentTimestampsByOpenId = new Map<string, number[]>();

  constructor(
    @InjectRepository(WechatSubscribeAuthorization)
    private readonly authorizationRepo: Repository<WechatSubscribeAuthorization>,
    @InjectRepository(WechatNotificationPreference)
    private readonly preferenceRepo: Repository<WechatNotificationPreference>,
  ) {
    this.isMock = process.env.WECHAT_MOCK === 'true';
    this.mpAppId = process.env.WECHAT_MP_APPID || process.env.WECHAT_APPID || '';
    this.mpAppSecret = process.env.WECHAT_MP_SECRET || process.env.WECHAT_SECRET || '';
    this.alarmTemplateId = process.env.WECHAT_SUBSCRIBE_TEMPLATE_ALARM || '';
    this.deviceStatusTemplateId = process.env.WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_STATUS || '';
    this.fieldMapping = this.resolveFieldMapping();
    this.deviceStatusFieldMapping = this.resolveDeviceStatusFieldMapping();
    this.rateLimitPerHour = Number(process.env.WECHAT_SUBSCRIBE_RATE_LIMIT_PER_HOUR) || 20;

    if (!this.isConfigured()) {
      this.logger.warn(
        '订阅消息通道未完整配置（模板 ID / 小程序凭证缺失），报警订阅消息将跳过发送',
      );
    }
  }

  /** 报警模板 ID（前端授权流程使用；未配置返回空字符串） */
  getAlarmTemplateId(): string {
    return this.alarmTemplateId;
  }

  /** 设备状态模板 ID（前端授权流程使用；未配置返回空字符串） */
  getDeviceStatusTemplateId(): string {
    return this.deviceStatusTemplateId;
  }

  /** 模板配置完整（或处于 Mock 模式） */
  isConfigured(): boolean {
    if (this.isMock) return true;
    return Boolean(this.alarmTemplateId && this.mpAppId && this.mpAppSecret);
  }

  /**
   * 向全部已订阅用户下发报警通知（供报警分发器调用）
   * 过滤条件：授权配额 > 0 + 通知偏好开启 + 级别达到偏好阈值 + 用户限频未超
   */
  async notifySubscribedUsers(payload: SubscribeMessagePayload): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('[SUBSCRIBE] 模板未配置，跳过报警订阅消息发送');
      return false;
    }

    const authorizations = await this.authorizationRepo.find({
      where: {
        templateId: this.alarmTemplateId,
        authorizationStatus: 'accept',
        quotaRemaining: MoreThan(0),
      },
    });
    if (authorizations.length === 0) {
      this.logger.debug('[SUBSCRIBE] 无可用订阅授权（配额为 0 或未授权），跳过发送');
      return false;
    }

    const preferences = await this.preferenceRepo.find({
      where: { alarmNotificationEnabled: true },
    });
    const preferenceByUserId = new Map(preferences.map((p) => [p.userId, p]));

    let sentCount = 0;
    for (const authorization of authorizations) {
      const preference = preferenceByUserId.get(authorization.userId);
      // 无偏好记录视为默认接收（实体默认 enabled），但仍需满足级别阈值
      if (preference) {
        if (!preference.alarmNotificationEnabled) {
          continue;
        }
        if (!this.levelMeetsThreshold(payload.level, preference.minimumAlarmLevel)) {
          continue;
        }
      }
      if (this.isRateLimited(authorization.mpOpenId)) {
        this.logger.warn(`[SUBSCRIBE] 用户限频跳过：openid=${authorization.mpOpenId.slice(0, 6)}...`);
        continue;
      }
      const sent = await this.sendToOpenId(
        authorization,
        this.alarmTemplateId,
        this.resolveAlarmNavigationPage(payload),
        this.buildTemplateData(payload),
      );
      if (sent) {
        sentCount += 1;
      }
    }

    this.logger.log(`[SUBSCRIBE] 报警订阅消息下发完成：成功 ${sentCount}/${authorizations.length}`);
    return sentCount > 0;
  }

  /**
   * 向全部已订阅用户下发设备状态通知（二期 10 #6，供 ss-device 事件订阅器调用）
   * 复用配额模型与用户限频；未配置设备状态模板时跳过并告警日志（Mock 模式走占位模板）。
   * 说明：设备状态通知不受报警偏好（开关/级别阈值）约束，为独立通知类别。
   */
  async notifyDeviceStatus(payload: DeviceStatusSubscribePayload): Promise<boolean> {
    if (!this.isDeviceStatusConfigured()) {
      this.logger.warn('[SUBSCRIBE] 设备状态模板未配置，跳过设备状态订阅消息发送');
      return false;
    }

    const templateId = this.deviceStatusTemplateId || MOCK_DEVICE_STATUS_TEMPLATE_ID;
    const authorizations = await this.authorizationRepo.find({
      where: {
        templateId,
        authorizationStatus: 'accept',
        quotaRemaining: MoreThan(0),
      },
    });
    if (authorizations.length === 0) {
      this.logger.debug('[SUBSCRIBE] 设备状态模板无可用订阅授权，跳过发送');
      return false;
    }

    let sentCount = 0;
    for (const authorization of authorizations) {
      if (this.isRateLimited(authorization.mpOpenId)) {
        this.logger.warn(`[SUBSCRIBE] 用户限频跳过：openid=${authorization.mpOpenId.slice(0, 6)}...`);
        continue;
      }
      const sent = await this.sendToOpenId(
        authorization,
        templateId,
        'pages/device/list',
        this.buildDeviceStatusTemplateData(payload),
      );
      if (sent) {
        sentCount += 1;
      }
    }

    this.logger.log(
      `[SUBSCRIBE] 设备状态订阅消息下发完成：成功 ${sentCount}/${authorizations.length} | ${payload.deviceName} → ${payload.status}`,
    );
    return sentCount > 0;
  }

  /** 设备状态模板配置完整（或处于 Mock 模式） */
  private isDeviceStatusConfigured(): boolean {
    if (this.isMock) return true;
    return Boolean(this.deviceStatusTemplateId && this.mpAppId && this.mpAppSecret);
  }

  /** 级别是否达到用户偏好阈值 */
  private levelMeetsThreshold(level: string, minimumLevel: MinimumAlarmLevel): boolean {
    const severity = ALARM_LEVEL_SEVERITY[level as MinimumAlarmLevel];
    if (severity === undefined) return true;
    return severity >= ALARM_LEVEL_SEVERITY[minimumLevel];
  }

  /** 报警订阅消息跳转页（二期 10 #7：有记录 ID 时附带参数，小程序冷启动解析后直达详情） */
  private resolveAlarmNavigationPage(payload: SubscribeMessagePayload): string {
    if (!payload.alarmRecordId) {
      return 'pages/alarm/list';
    }
    return `pages/alarm/list?alarmRecordId=${encodeURIComponent(payload.alarmRecordId)}`;
  }

  /** 用户限频检查（滑动窗口计数） */
  private isRateLimited(openId: string): boolean {
    const now = Date.now();
    const timestamps = (this.sentTimestampsByOpenId.get(openId) || []).filter(
      (sentAt) => now - sentAt < RATE_LIMIT_WINDOW_MS,
    );
    this.sentTimestampsByOpenId.set(openId, timestamps);
    return timestamps.length >= this.rateLimitPerHour;
  }

  /** 向单个授权记录下发并维护配额（模板/跳转页/数据由调用方指定，报警与设备状态共用） */
  private async sendToOpenId(
    authorization: WechatSubscribeAuthorization,
    templateId: string,
    page: string,
    templateData: Record<string, { value: string }>,
  ): Promise<boolean> {
    if (this.isMock) {
      this.logger.log(
        `[Mock] 订阅消息下发：openid=${authorization.mpOpenId} | template=${templateId}`,
      );
      authorization.quotaRemaining = Math.max(0, authorization.quotaRemaining - 1);
      await this.authorizationRepo.save(authorization);
      this.recordSent(authorization.mpOpenId);
      return true;
    }

    try {
      const accessToken = await this.getMpAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;
      const body = {
        touser: authorization.mpOpenId,
        template_id: templateId,
        page,
        data: templateData,
      };
      const resp = await httpRequest({
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 10000,
      });
      const data = JSON.parse(resp.body) as { errcode?: number; errmsg?: string };
      if (data.errcode === 0) {
        authorization.quotaRemaining = Math.max(0, authorization.quotaRemaining - 1);
        await this.authorizationRepo.save(authorization);
        this.recordSent(authorization.mpOpenId);
        return true;
      }
      // 43101：用户拒绝接受消息（授权已失效）→ 配额清零，等待前端续订
      if (data.errcode === 43101) {
        authorization.quotaRemaining = 0;
        await this.authorizationRepo.save(authorization);
      }
      this.logger.warn(
        `[SUBSCRIBE] 下发失败：[${data.errcode}] ${data.errmsg} | openid=${authorization.mpOpenId.slice(0, 6)}...`,
      );
      return false;
    } catch (error) {
      // 发送失败降级为日志，不阻塞报警主流程
      this.logger.error(`[SUBSCRIBE] 下发异常：${(error as Error).message}`);
      return false;
    }
  }

  private recordSent(openId: string): void {
    const timestamps = this.sentTimestampsByOpenId.get(openId) || [];
    timestamps.push(Date.now());
    this.sentTimestampsByOpenId.set(openId, timestamps);
  }

  /** 按字段映射构建模板 data（类型前缀约束：thing 20 字 / phrase 5 字） */
  private buildTemplateData(payload: SubscribeMessagePayload): Record<string, { value: string }> {
    const levelLabels: Record<string, string> = {
      info: '提示',
      warning: '警告',
      error: '严重',
      critical: '紧急',
    };
    const timeText = payload.timestamp.toLocaleString('zh-CN', { hour12: false });
    return {
      [this.fieldMapping.title]: { value: this.truncate(payload.title, THING_FIELD_MAX_LENGTH) },
      [this.fieldMapping.message]: {
        value: this.truncate(payload.message, THING_FIELD_MAX_LENGTH),
      },
      [this.fieldMapping.level]: {
        value: this.truncate(levelLabels[payload.level] || payload.level, PHRASE_FIELD_MAX_LENGTH),
      },
      [this.fieldMapping.time]: { value: timeText },
    };
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  /** 设备状态模板 data（设备名 thing 20 字 / 状态文案 phrase 5 字 / 时间） */
  private buildDeviceStatusTemplateData(
    payload: DeviceStatusSubscribePayload,
  ): Record<string, { value: string }> {
    const statusLabels: Record<string, string> = {
      offline: '离线',
      error: '故障',
      degraded: '异常',
    };
    const timeText = payload.timestamp.toLocaleString('zh-CN', { hour12: false });
    return {
      [this.deviceStatusFieldMapping.device]: {
        value: this.truncate(payload.deviceName, THING_FIELD_MAX_LENGTH),
      },
      [this.deviceStatusFieldMapping.status]: {
        value: this.truncate(statusLabels[payload.status] || payload.status, PHRASE_FIELD_MAX_LENGTH),
      },
      [this.deviceStatusFieldMapping.time]: { value: timeText },
    };
  }

  /** 小程序全局 access_token（7200s 有效期，提前 60s 刷新） */
  private async getMpAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessToken.expireAt > now) {
      return this.cachedAccessToken.token;
    }
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.mpAppId}&secret=${this.mpAppSecret}`;
    const resp = await httpRequest({ method: 'GET', url, timeoutMs: 10000 });
    const data = JSON.parse(resp.body) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };
    if (!data.access_token) {
      throw new Error(`获取小程序 access_token 失败：[${data.errcode}] ${data.errmsg}`);
    }
    this.cachedAccessToken = {
      token: data.access_token,
      expireAt: now + (data.expires_in || 7200) * 1000 - 60_000,
    };
    return data.access_token;
  }

  /** 字段映射解析：WECHAT_SUBSCRIBE_TEMPLATE_FIELDS JSON 覆盖默认映射 */
  private resolveFieldMapping(): TemplateFieldMapping {
    const rawMapping = process.env.WECHAT_SUBSCRIBE_TEMPLATE_FIELDS;
    if (!rawMapping) {
      return DEFAULT_FIELD_MAPPING;
    }
    try {
      const parsed = JSON.parse(rawMapping) as Partial<TemplateFieldMapping>;
      return { ...DEFAULT_FIELD_MAPPING, ...parsed };
    } catch {
      this.logger.warn('WECHAT_SUBSCRIBE_TEMPLATE_FIELDS JSON 解析失败，使用默认字段映射');
      return DEFAULT_FIELD_MAPPING;
    }
  }

  /** 设备状态字段映射解析：WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_FIELDS JSON 覆盖默认映射 */
  private resolveDeviceStatusFieldMapping(): DeviceStatusTemplateFieldMapping {
    const rawMapping = process.env.WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_FIELDS;
    if (!rawMapping) {
      return DEFAULT_DEVICE_STATUS_FIELD_MAPPING;
    }
    try {
      const parsed = JSON.parse(rawMapping) as Partial<DeviceStatusTemplateFieldMapping>;
      return { ...DEFAULT_DEVICE_STATUS_FIELD_MAPPING, ...parsed };
    } catch {
      this.logger.warn('WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_FIELDS JSON 解析失败，使用默认字段映射');
      return DEFAULT_DEVICE_STATUS_FIELD_MAPPING;
    }
  }
}
