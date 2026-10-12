// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Inject, Injectable, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { StructuredLogger } from '@ss-node/ss-core';
import { INotificationChannel, NotificationPayload } from './notification-channel.interface';

/**
 * 系统配置服务的结构化类型（避免直接导入 ss-system 造成循环依赖与测试加载问题）
 */
export interface SystemConfigServiceLike {
  get(key: string): Promise<string | null>;
}

/**
 * 语音播报（TTS）服务提供商类型
 */
export type TtsProvider = 'aliyun';

/**
 * TTS 语音播报通知通道
 *
 * 支持阿里云语音通知（SingleCallByTts）。
 * 所需系统配置：
 * - TTS_PROVIDER: 'aliyun'
 * - TTS_API_KEY: AccessKeyId
 * - TTS_API_SECRET: AccessKeySecret
 * - TTS_CALLED_NUMBER: 主叫号码（可选，默认使用目标号码）
 *
 * 不可用时优雅降级（仅记录日志），不影响报警主流程。
 */
@Injectable()
export class TtsNotificationChannel implements INotificationChannel {
  readonly name = 'tts';

  private readonly logger = new StructuredLogger();

  constructor(
    @Optional()
    @Inject('SystemConfigService')
    private readonly configService?: SystemConfigServiceLike,
  ) {
    this.logger.setContext('context', 'TtsNotificationChannel');
  }

  /**
   * 发送语音通知（接口实现）
   */
  async send(targets: string[], payload: NotificationPayload): Promise<boolean> {
    const message = this.buildTtsMessage(payload);
    return this.callInternal(targets, message, payload);
  }

  /**
   * 拨打语音电话并播报消息
   * @param to 被叫号码列表
   * @param message 播报内容
   */
  async call(to: string[], message: string): Promise<boolean> {
    return this.callInternal(to, message, undefined);
  }

  /**
   * 构建 TTS 播报消息
   */
  private buildTtsMessage(payload: NotificationPayload): string {
    const levelLabel = this.getLevelLabel(payload.level);
    const devicePart = payload.deviceName ? `${payload.deviceName}，` : '';
    return `SCADA报警，${levelLabel}级别。${devicePart}${payload.message}。`;
  }

  /**
   * 获取报警级别中文标签
   */
  private getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      info: '信息',
      warning: '警告',
      error: '错误',
      critical: '紧急',
    };
    return labels[level] || level;
  }

  /**
   * 实际拨打逻辑
   */
  private async callInternal(
    phones: string[],
    message: string,
    payload?: NotificationPayload,
  ): Promise<boolean> {
    if (!this.configService) {
      this.logger.warn('SystemConfigService 不可用，语音通道未启用');
      return false;
    }

    if (!phones.length) {
      this.logger.warn('未提供被叫号码，跳过语音拨打');
      return false;
    }

    try {
      const provider = (await this.configService.get('TTS_PROVIDER')) || '';
      const apiKey = await this.configService.get('TTS_API_KEY');
      const apiSecret = await this.configService.get('TTS_API_SECRET');
      const calledNumber = await this.configService.get('TTS_CALLED_NUMBER');

      if (!apiKey || !apiSecret) {
        this.logger.warn('语音通道未配置 API 密钥，跳过拨打');
        return false;
      }

      switch (provider.toLowerCase()) {
        case 'aliyun':
          return await this.callViaAliyun({
            apiKey,
            apiSecret,
            calledNumber: calledNumber || '',
            phones,
            message,
            payload,
          });

        default:
          this.logger.warn(`未知的语音提供商: ${provider}（支持: aliyun）`);
          return false;
      }
    } catch (error) {
      this.logger.error(`语音拨打失败: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * 阿里云语音 TTS 拨打（RPC 风格，HMAC-SHA1 签名）
   * 使用 SingleCallByTts 接口逐个拨打
   */
  private async callViaAliyun(params: {
    apiKey: string;
    apiSecret: string;
    calledNumber: string;
    phones: string[];
    message: string;
    payload?: NotificationPayload;
  }): Promise<boolean> {
    const endpoint = 'https://dyvmsapi.aliyuncs.com';
    const ttsCode = 'TTS_SCADA_ALARM';

    const templateParam = params.payload
      ? JSON.stringify({
          level: params.payload.level,
          device: params.payload.deviceName || '',
          message: params.payload.message,
        })
      : JSON.stringify({ content: params.message });

    let allSuccess = true;

    for (const phone of params.phones) {
      const requestParams: Record<string, string> = {
        Action: 'SingleCallByTts',
        Version: '2017-05-25',
        Format: 'JSON',
        AccessKeyId: params.apiKey,
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: crypto.randomUUID(),
        Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        CalledNumber: phone,
        TtsCode: ttsCode,
        TtsParam: templateParam,
      };

      if (params.calledNumber) {
        requestParams.CalledShowNumber = params.calledNumber;
      }

      const signature = this.signAliyunRpc(requestParams, params.apiSecret);
      requestParams.Signature = signature;

      const query = this.buildQueryString(requestParams);
      const url = `${endpoint}/?${query}`;

      try {
        const response = await fetch(url, { method: 'GET' });
        const data = (await response.json()) as { Code?: string; Message?: string };

        if (data.Code === 'OK') {
          this.logger.log(`[TTS-阿里云] 语音拨打成功 -> ${phone}`);
        } else {
          this.logger.error(
            `[TTS-阿里云] 拨打失败: ${data.Code || 'Unknown'} - ${data.Message || ''} -> ${phone}`,
          );
          allSuccess = false;
        }
      } catch (error) {
        this.logger.error(`[TTS-阿里云] 拨打异常: ${(error as Error).message} -> ${phone}`);
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  /**
   * 阿里云 RPC 签名算法（HMAC-SHA1 + Base64）
   */
  private signAliyunRpc(params: Record<string, string>, secret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const canonicalized = sortedKeys
      .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
      .join('&');

    const stringToSign = `GET&${this.percentEncode('/')}&${this.percentEncode(canonicalized)}`;
    const hmac = crypto.createHmac('sha1', `${secret}&`);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  /**
   * 阿里云 RFC 3986 百分号编码
   */
  private percentEncode(value: string): string {
    return encodeURIComponent(value)
      .replace(/\+/g, '%20')
      .replace(/\*/g, '%2A')
      .replace(/%7E/g, '~');
  }

  /**
   * 构建查询字符串（用于阿里云 GET 请求）
   */
  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }
}
