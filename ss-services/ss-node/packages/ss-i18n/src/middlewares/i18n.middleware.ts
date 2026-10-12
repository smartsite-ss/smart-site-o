// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { I18nService } from '../i18n.service';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const acceptLanguage = req.headers['accept-language'] as string;
    const queryLang = req.query['lang'] as string;

    let preferredLang = queryLang || '';

    if (!preferredLang && acceptLanguage) {
      const langs = acceptLanguage.split(',');
      const firstLang = langs[0]?.trim();
      if (firstLang) {
        const [langCode] = firstLang.split(';');
        preferredLang = langCode.trim();
      }
    }

    const supported = this.i18nService.getSupportedLanguages();
    const langCode = this.normalizeLang(preferredLang);

    (req as any).i18nLang = supported.includes(langCode)
      ? langCode
      : this.i18nService.getFallbackLanguage();

    (req as any).i18nService = this.i18nService;

    next();
  }

  private normalizeLang(lang: string): string {
    if (!lang) return '';
    const normalized = lang.toLowerCase();
    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('en')) return 'en-US';
    return lang;
  }
}
