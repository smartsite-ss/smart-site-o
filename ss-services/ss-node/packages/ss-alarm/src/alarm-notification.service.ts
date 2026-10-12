// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, Optional } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { EventBusService, WechatSubscribeMessageChannel } from '@ss-node/ss-core';
import { AlarmRecord } from './entities/alarm.entity';
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { TtsNotificationChannel } from './channels/tts-notification.channel';
import { NotificationPayload as ChannelNotificationPayload } from './channels/notification-channel.interface';

export interface NotificationChannel {
  type: 'email' | 'sound' | 'popup' | 'sms' | 'tts' | 'webhook' | 'wechatSubscribe';
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

export interface NotificationPayload {
  alarmId: string;
  ruleName: string;
  level: string;
  message: string;
  value: number;
  timestamp: Date;
  channels: string[];
}

@Injectable()
export class AlarmNotificationService {
  private readonly logger = new Logger(AlarmNotificationService.name);

  private channels: NotificationChannel[] = [
    { type: 'email', enabled: false, config: { smtpHost: '', smtpPort: 587, from: '', to: [] } },
    { type: 'sound', enabled: true, config: { volume: 0.8, repeat: 3 } },
    { type: 'popup', enabled: true, config: { duration: 10000, requireAck: true } },
    { type: 'sms', enabled: false, config: { provider: '', apiKey: '', phones: [] } },
    { type: 'tts', enabled: false, config: { provider: '', apiKey: '', phones: [] } },
    { type: 'webhook', enabled: false, config: { url: '', headers: {} } },
    // 微信小程序订阅消息：模板配置驱动，未配置（且非 Mock）时禁用；默认报警规则无需显式勾选即下发给已订阅用户（通道内部按配额/偏好过滤）
    {
      type: 'wechatSubscribe',
      enabled:
        process.env.WECHAT_MOCK === 'true' || Boolean(process.env.WECHAT_SUBSCRIBE_TEMPLATE_ALARM),
      config: {},
    },
  ];

  constructor(
    private readonly eventBusService: EventBusService,
    @Optional() private readonly smsChannel?: SmsNotificationChannel,
    @Optional() private readonly ttsChannel?: TtsNotificationChannel,
    @Optional() private readonly wechatSubscribeChannel?: WechatSubscribeMessageChannel,
  ) {}

  configureChannel(type: string, config: Partial<NotificationChannel>): void {
    const index = this.channels.findIndex((c) => c.type === type);
    if (index >= 0) {
      this.channels[index] = { ...this.channels[index], ...config };
      this.logger.log(`Notification channel ${type} configured`);
    }
  }

  getChannels(): NotificationChannel[] {
    return [...this.channels];
  }

  getEnabledChannels(): string[] {
    return this.channels.filter((c) => c.enabled).map((c) => c.type);
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const enabledChannels = this.channels.filter(
      (c) => c.enabled && payload.channels.includes(c.type),
    );

    for (const channel of enabledChannels) {
      try {
        await this.dispatchToChannel(channel.type, payload);
      } catch (error) {
        this.logger.error(`Failed to send ${channel.type} notification: ${error.message}`);
      }
    }

    this.eventBusService.emit('alarm.notification.sent', {
      alarmId: payload.alarmId,
      channels: enabledChannels.map((c) => c.type),
      timestamp: Date.now(),
    });
  }

  private async dispatchToChannel(
    channelType: string,
    payload: NotificationPayload,
  ): Promise<void> {
    switch (channelType) {
      case 'email':
        await this.sendEmail(payload);
        break;
      case 'sound':
        this.triggerSound(payload);
        break;
      case 'popup':
        this.triggerPopup(payload);
        break;
      case 'sms':
        await this.dispatchSmsNotification(payload);
        break;
      case 'tts':
        await this.dispatchTtsNotification(payload);
        break;
      case 'webhook':
        await this.callWebhook(payload);
        break;
      case 'wechatSubscribe':
        await this.dispatchWechatSubscribeNotification(payload);
        break;
    }
    this.logger.debug(`Dispatched ${channelType} notification for alarm ${payload.alarmId}`);
  }

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.find((c) => c.type === 'email');
    if (!channel?.enabled) return;

    const template = this.buildEmailTemplate(payload);

    this.logger.log(`[EMAIL] To: ${channel.config.to} | Subject: ${template.subject}`);
    this.logger.log(`[EMAIL] Body: ${template.body.substring(0, 200)}...`);

    // 如果配置了 SMTP，通过 nodemailer 发送
    if (channel.config.smtpHost) {
      try {
        // 动态导入 nodemailer（避免硬依赖）
        const nodemailer = await this.loadNodemailer();
        if (nodemailer) {
          const transporter = nodemailer.createTransport({
            host: channel.config.smtpHost,
            port: channel.config.smtpPort || 587,
            secure: channel.config.smtpPort === 465,
            auth: channel.config.smtpUser
              ? { user: channel.config.smtpUser, pass: channel.config.smtpPass }
              : undefined,
          });

          await transporter.sendMail({
            from: channel.config.from || 'scada@localhost',
            to: Array.isArray(channel.config.to) ? channel.config.to.join(',') : channel.config.to,
            subject: template.subject,
            html: template.body,
          });
          this.logger.log(`[EMAIL] Sent successfully to ${channel.config.to}`);
        }
      } catch (error) {
        this.logger.error(`[EMAIL] Failed to send: ${(error as Error).message}`);
      }
    }
  }

  /** 构建邮件模板（支持变量替换） */
  private buildEmailTemplate(payload: NotificationPayload): { subject: string; body: string } {
    const levelLabels: Record<string, string> = {
      info: '信息',
      warning: '警告',
      error: '错误',
      critical: '紧急',
    };
    const levelLabel = levelLabels[payload.level] || payload.level;

    const subject = `[SCADA报警-${levelLabel}] ${payload.ruleName}`;

    const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 4px solid #e74c3c;">
        <h2 style="color: #e74c3c;">SCADA 报警通知</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">报警规则</td><td>${payload.ruleName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">报警级别</td><td style="color: #e74c3c; font-weight: bold;">${levelLabel}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">报警值</td><td>${payload.value}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">报警时间</td><td>${payload.timestamp.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">报警详情</td><td>${payload.message}</td></tr>
        </table>
        <p style="color: #666; margin-top: 20px;">此邮件由 SCADA 系统自动发送，请勿回复。</p>
      </div>
    `;

    return { subject, body };
  }

  /** 动态加载 nodemailer */
  private async loadNodemailer(): Promise<{
    createTransport(config: Record<string, unknown>): {
      sendMail(options: Record<string, unknown>): Promise<unknown>;
    };
  } | null> {
    try {
      // @ts-expect-error - nodemailer is an optional dependency, dynamically imported
      return await import('nodemailer');
    } catch {
      this.logger.warn('nodemailer not installed, email will be logged only');
      return null;
    }
  }

  private triggerSound(payload: NotificationPayload): void {
    const channel = this.channels.find((c) => c.type === 'sound');
    if (!channel?.enabled) return;

    this.eventBusService.emit('alarm.sound.trigger', {
      alarmId: payload.alarmId,
      level: payload.level,
      config: channel.config,
    });
  }

  private triggerPopup(payload: NotificationPayload): void {
    const channel = this.channels.find((c) => c.type === 'popup');
    if (!channel?.enabled) return;

    this.eventBusService.emit('alarm.popup.show', {
      alarmId: payload.alarmId,
      ruleName: payload.ruleName,
      level: payload.level,
      message: payload.message,
      value: payload.value,
      timestamp: payload.timestamp,
      config: channel.config,
    });
  }

  /**
   * 通过短信通道分发报警通知（内部调度）
   */
  private async dispatchSmsNotification(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.find((c) => c.type === 'sms');
    if (!channel?.enabled) return;

    const phones: string[] = Array.isArray(channel.config.phones) ? channel.config.phones : [];
    if (!phones.length) {
      this.logger.warn('[SMS] 未配置接收手机号，跳过发送');
      return;
    }

    if (this.smsChannel) {
      const channelPayload = this.toChannelPayload(payload);
      const ok = await this.smsChannel.send(phones, channelPayload);
      if (!ok) {
        this.logger.warn(`[SMS] 发送失败 -> ${phones.join(',')}`);
      }
    } else {
      this.logger.log(
        `[SMS] Alarm: ${payload.ruleName} | Level: ${payload.level} (通道未注入，仅记录日志)`,
      );
    }
  }

  /**
   * 通过 TTS 语音通道分发报警通知（内部调度）
   */
  private async dispatchTtsNotification(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.find((c) => c.type === 'tts');
    if (!channel?.enabled) return;

    const phones: string[] = Array.isArray(channel.config.phones) ? channel.config.phones : [];
    if (!phones.length) {
      this.logger.warn('[TTS] 未配置被叫号码，跳过拨打');
      return;
    }

    if (this.ttsChannel) {
      const channelPayload = this.toChannelPayload(payload);
      const ok = await this.ttsChannel.send(phones, channelPayload);
      if (!ok) {
        this.logger.warn(`[TTS] 拨打失败 -> ${phones.join(',')}`);
      }
    } else {
      this.logger.log(
        `[TTS] Alarm: ${payload.ruleName} | Level: ${payload.level} (通道未注入，仅记录日志)`,
      );
    }
  }

  /**
   * 通过微信小程序订阅消息通道分发报警通知（内部调度）
   * 通道未注入（模块未注册）时安全降级为日志；
   * 接收人由通道内部按授权配额 + 通知偏好 + 限频过滤，无需外部指定。
   */
  private async dispatchWechatSubscribeNotification(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.find((c) => c.type === 'wechatSubscribe');
    if (!channel?.enabled) return;

    if (this.wechatSubscribeChannel) {
      await this.wechatSubscribeChannel.notifySubscribedUsers({
        title: payload.ruleName,
        message: payload.message,
        level: payload.level,
        // 随跳转页携带报警记录 ID（二期 10 #7：小程序冷启动直达报警详情）
        alarmRecordId: payload.alarmId,
        timestamp: payload.timestamp,
      });
    } else {
      this.logger.log(
        `[WECHAT_SUBSCRIBE] Alarm: ${payload.ruleName} | Level: ${payload.level} (通道未注入，仅记录日志)`,
      );
    }
  }

  /**
   * 发送短信通知（直接调用）
   * @param phoneNumbers 手机号列表
   * @param alarm 报警记录
   */
  async sendSms(phoneNumbers: string[], alarm: AlarmRecord): Promise<void> {
    if (!phoneNumbers.length) {
      this.logger.warn('[SMS] 未提供手机号，跳过发送');
      return;
    }

    if (!this.smsChannel) {
      this.logger.warn('[SMS] 短信通道未注入，无法发送');
      return;
    }

    const payload = this.alarmToChannelPayload(alarm);
    const ok = await this.smsChannel.send(phoneNumbers, payload);
    if (!ok) {
      this.logger.warn(`[SMS] 发送失败 -> ${phoneNumbers.join(',')}`);
    }
  }

  /**
   * 发送 TTS 语音通知（直接调用）
   * @param phoneNumbers 被叫号码列表
   * @param alarm 报警记录
   */
  async sendTts(phoneNumbers: string[], alarm: AlarmRecord): Promise<void> {
    if (!phoneNumbers.length) {
      this.logger.warn('[TTS] 未提供被叫号码，跳过拨打');
      return;
    }

    if (!this.ttsChannel) {
      this.logger.warn('[TTS] 语音通道未注入，无法拨打');
      return;
    }

    const payload = this.alarmToChannelPayload(alarm);
    const ok = await this.ttsChannel.send(phoneNumbers, payload);
    if (!ok) {
      this.logger.warn(`[TTS] 拨打失败 -> ${phoneNumbers.join(',')}`);
    }
  }

  /**
   * 将内部 NotificationPayload 转换为通道 NotificationPayload
   */
  private toChannelPayload(payload: NotificationPayload): ChannelNotificationPayload {
    return {
      title: payload.ruleName,
      message: payload.message,
      level: payload.level,
      timestamp: payload.timestamp,
    };
  }

  /**
   * 将 AlarmRecord 转换为通道 NotificationPayload
   */
  private alarmToChannelPayload(alarm: AlarmRecord): ChannelNotificationPayload {
    const ruleName = alarm.rule?.name || '报警通知';
    const deviceName = alarm.rule?.tag?.name;
    return {
      title: ruleName,
      message: alarm.message,
      level: alarm.level,
      deviceName,
      timestamp: alarm.createdAt,
    };
  }

  private async callWebhook(payload: NotificationPayload): Promise<void> {
    const channel = this.channels.find((c) => c.type === 'webhook');
    if (!channel?.enabled || !channel.config.url) return;

    const url = channel.config.url;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(channel.config.headers || {}),
    };

    const body = JSON.stringify({
      alarmId: payload.alarmId,
      ruleName: payload.ruleName,
      level: payload.level,
      message: payload.message,
      value: payload.value,
      timestamp: payload.timestamp.toISOString(),
    });

    await this.sendHttpPost(url, body, headers);
  }

  /** 发送 HTTP POST 请求（支持 http 和 https） */
  private sendHttpPost(
    urlString: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<void> {
    return new Promise((resolve, _reject) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(urlString);
      } catch {
        this.logger.error(`[WEBHOOK] Invalid URL: ${urlString}`);
        return resolve();
      }

      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body).toString(),
        },
        timeout: 10000,
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(`[WEBHOOK] Sent successfully to ${urlString}: ${res.statusCode}`);
          } else {
            this.logger.warn(
              `[WEBHOOK] Response ${res.statusCode} from ${urlString}: ${data.substring(0, 200)}`,
            );
          }
          resolve();
        });
      });

      req.on('timeout', () => {
        req.destroy();
        this.logger.error(`[WEBHOOK] Request timeout (10s) to ${urlString}`);
        resolve();
      });

      req.on('error', (err) => {
        this.logger.error(`[WEBHOOK] Request failed to ${urlString}: ${err.message}`);
        resolve();
      });

      req.write(body);
      req.end();
    });
  }
}
