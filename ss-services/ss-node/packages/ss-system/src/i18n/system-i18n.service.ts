// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';

@Injectable()
export class SystemI18nService {
  constructor(private readonly i18nService: I18nService) {}

  /** 翻译系统消息 */
  translate(key: string, lang?: string): string {
    return this.i18nService.tSync(key, undefined, lang);
  }

  /** 翻译带参数的消息 */
  translateWithArgs(key: string, args: Record<string, any>, lang?: string): string {
    return this.i18nService.tSync(key, args, lang);
  }

  /** 获取支持的语言 */
  getSupportedLanguages(): string[] {
    return this.i18nService.getSupportedLanguages();
  }

  /** 获取当前语言 */
  getCurrentLanguage(): string {
    return this.i18nService.getFallbackLanguage();
  }
}

/** 多语言异常类 */
export class I18nAuthError extends Error {
  public readonly i18nKey: string;
  public readonly i18nArgs?: Record<string, any>;
  public readonly statusCode: number;

  constructor(key: string, statusCode: number = 400, args?: Record<string, any>) {
    super(key);
    this.name = 'I18nAuthError';
    this.i18nKey = key;
    this.i18nArgs = args;
    this.statusCode = statusCode;
  }

  getLocalizedMessage(i18nService: SystemI18nService, lang?: string): string {
    try {
      return i18nService.translateWithArgs(this.i18nKey, this.i18nArgs || {}, lang);
    } catch {
      return this.i18nKey;
    }
  }
}
