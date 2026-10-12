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
 * 短信服务提供商类型
 */
export type SmsProvider = 'aliyun' | 'tencent';

/**
 * 短信通知通道
 *
 * 支持阿里云短信和腾讯云短信，通过系统配置 SMS_PROVIDER 切换。
 * 所需系统配置：
 * - SMS_PROVIDER: 'aliyun' | 'tencent'
 * - SMS_API_KEY: AccessKeyId / SecretId
 * - SMS_API_SECRET: AccessKeySecret / SecretKey
 * - SMS_SIGN_NAME: 短信签名
 * - SMS_TEMPLATE_CODE: 短信模板Code
 *
 * 不可用时优雅降级（仅记录日志），不影响报警主流程。
 */
@Injectable()
export class SmsNotificationChannel implements INotificationChannel {
  readonly name = 'sms';

  /** 缺省 SDK AppID（腾讯云） */
  private static readonly TENCENT_SMS_DEFAULT_SDK_APPID = '1400000000';

  private readonly logger = new StructuredLogger();

  constructor(
    @Optional()
    @Inject('SystemConfigService')
    private readonly configService?: SystemConfigServiceLike,
  ) {
    this.logger.setContext('context', 'SmsNotificationChannel');
  }

  /**
   * 发送短信通知（接口实现）
   */
  async send(targets: string[], payload: NotificationPayload): Promise<boolean> {
    const content = this.buildSmsContent(payload);
    return this.sendMessage(targets, content, payload);
  }

  /**
   * 直接发送短信内容
   * @param to 手机号列表
   * @param content 短信内容（作为模板参数透传）
   */
  async sendSms(to: string[], content: string): Promise<boolean> {
    return this.sendMessage(to, content, undefined);
  }

  /**
   * 构建短信内容
   */
  private buildSmsContent(payload: NotificationPayload): string {
    const levelLabel = this.getLevelLabel(payload.level);
    const devicePart = payload.deviceName ? `设备:${payload.deviceName} ` : '';
    const time = payload.timestamp.toLocaleString('zh-CN');
    return `[SCADA报警-${levelLabel}] ${devicePart}${payload.message} ${time}`;
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
   * 实际发送逻辑
   */
  private async sendMessage(
    phones: string[],
    content: string,
    payload?: NotificationPayload,
  ): Promise<boolean> {
    if (!this.configService) {
      this.logger.warn('SystemConfigService 不可用，短信通道未启用');
      return false;
    }

    if (!phones.length) {
      this.logger.warn('未提供手机号，跳过短信发送');
      return false;
    }

    try {
      const provider = (await this.configService.get('SMS_PROVIDER')) || '';
      const apiKey = await this.configService.get('SMS_API_KEY');
      const apiSecret = await this.configService.get('SMS_API_SECRET');
      const signName = await this.configService.get('SMS_SIGN_NAME');
      const templateCode = await this.configService.get('SMS_TEMPLATE_CODE');

      if (!apiKey || !apiSecret) {
        this.logger.warn('短信通道未配置 API 密钥，跳过发送');
        return false;
      }

      const phoneNumbers = phones.join(',');

      switch (provider.toLowerCase()) {
        case 'aliyun':
          return await this.sendViaAliyun({
            apiKey,
            apiSecret,
            signName: signName || '',
            templateCode: templateCode || '',
            phoneNumbers,
            content,
            payload,
          });

        case 'tencent':
          return await this.sendViaTencent({
            apiKey,
            apiSecret,
            signName: signName || '',
            templateCode: templateCode || '',
            phoneNumbers,
            content,
            payload,
          });

        default:
          this.logger.warn(`未知的短信提供商: ${provider}（支持: aliyun, tencent）`);
          return false;
      }
    } catch (error) {
      this.logger.error(`短信发送失败: ${(error as Error).message}`);
      return false;
    }
  }

  // ==================== 阿里云短信 ====================

  /**
   * 阿里云短信发送（RPC 风格，HMAC-SHA1 签名）
   */
  private async sendViaAliyun(params: {
    apiKey: string;
    apiSecret: string;
    signName: string;
    templateCode: string;
    phoneNumbers: string;
    content: string;
    payload?: NotificationPayload;
  }): Promise<boolean> {
    const endpoint = 'https://dysmsapi.aliyuncs.com';

    const templateParam = params.payload
      ? JSON.stringify({
          level: params.payload.level,
          device: params.payload.deviceName || '',
          message: params.payload.message,
          time: params.payload.timestamp.toISOString(),
        })
      : JSON.stringify({ content: params.content });

    const requestParams: Record<string, string> = {
      Action: 'SendSms',
      Version: '2017-05-25',
      Format: 'JSON',
      AccessKeyId: params.apiKey,
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: crypto.randomUUID(),
      Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      PhoneNumbers: params.phoneNumbers,
      SignName: params.signName,
      TemplateCode: params.templateCode,
      TemplateParam: templateParam,
    };

    const signature = this.signAliyunRpc(requestParams, params.apiSecret);
    requestParams.Signature = signature;

    const query = this.buildQueryString(requestParams);
    const url = `${endpoint}/?${query}`;

    const response = await fetch(url, { method: 'GET' });
    const data = (await response.json()) as { Code?: string; Message?: string };

    if (data.Code === 'OK') {
      this.logger.log(`[SMS-阿里云] 短信发送成功 -> ${params.phoneNumbers}`);
      return true;
    }

    this.logger.error(`[SMS-阿里云] 发送失败: ${data.Code || 'Unknown'} - ${data.Message || ''}`);
    return false;
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

  // ==================== 腾讯云短信 ====================

  /**
   * 腾讯云短信发送（TC3-HMAC-SHA256 签名）
   */
  private async sendViaTencent(params: {
    apiKey: string;
    apiSecret: string;
    signName: string;
    templateCode: string;
    phoneNumbers: string;
    content: string;
    payload?: NotificationPayload;
  }): Promise<boolean> {
    const endpoint = 'sms.tencentcloudapi.com';
    const action = 'SendSms';
    const version = '2021-01-11';

    const phoneNumberSet = params.phoneNumbers.split(',').map((p) => `+86${p}`);
    const templateParams = params.payload
      ? [
          params.payload.level,
          params.payload.deviceName || '',
          params.payload.message,
          params.payload.timestamp.toLocaleString('zh-CN'),
        ]
      : [params.content];

    const requestBody = JSON.stringify({
      SmsSdkAppId: SmsNotificationChannel.TENCENT_SMS_DEFAULT_SDK_APPID,
      SignName: params.signName,
      TemplateId: params.templateCode,
      PhoneNumberSet: phoneNumberSet,
      TemplateParamSet: templateParams,
    });

    const result = await this.callTencentCloudApi({
      endpoint,
      action,
      version,
      secretId: params.apiKey,
      secretKey: params.apiSecret,
      payload: requestBody,
    });

    if (result.success) {
      this.logger.log(`[SMS-腾讯云] 短信发送成功 -> ${params.phoneNumbers}`);
      return true;
    }

    this.logger.error(`[SMS-腾讯云] 发送失败: ${result.error}`);
    return false;
  }

  /**
   * 腾讯云 API 调用（TC3-HMAC-SHA256 签名）
   */
  private async callTencentCloudApi(params: {
    endpoint: string;
    action: string;
    version: string;
    secretId: string;
    secretKey: string;
    payload: string;
  }): Promise<{ success: boolean; error?: string }> {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const service = 'sms';

    // 1. 拼接规范请求串
    const hashedPayload = crypto.createHash('sha256').update(params.payload).digest('hex');
    const canonicalRequest = [
      'POST',
      '/',
      '',
      'content-type:application/json; charset=utf-8',
      `host:${params.endpoint}`,
      `x-tc-action:${params.action.toLowerCase()}`,
      '',
      'content-type;host;x-tc-action',
      hashedPayload,
    ].join('\n');

    // 2. 拼接签名串
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex');
    const stringToSign = [
      'TC3-HMAC-SHA256',
      String(timestamp),
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n');

    // 3. 计算签名
    const secretDate = crypto.createHmac('sha256', `TC3${params.secretKey}`).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    // 4. 构建 Authorization 头
    const authorization = `TC3-HMAC-SHA256 Credential=${params.secretId}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;

    // 5. 发送请求
    const url = `https://${params.endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: authorization,
        'X-TC-Action': params.action,
        'X-TC-Version': params.version,
        'X-TC-Timestamp': String(timestamp),
      },
      body: params.payload,
    });

    const data = (await response.json()) as {
      Response?: {
        Error?: { Code?: string; Message?: string };
        SendStatusSet?: Array<{ Code?: string }>;
      };
    };

    const resp = data.Response;
    if (!resp) {
      return { success: false, error: 'Empty response from Tencent Cloud' };
    }

    if (resp.Error) {
      return { success: false, error: `${resp.Error.Code || ''} ${resp.Error.Message || ''}` };
    }

    const allOk = resp.SendStatusSet?.every((s) => s.Code === 'Ok') ?? false;
    return { success: allOk, error: allOk ? undefined : 'Some messages failed' };
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
