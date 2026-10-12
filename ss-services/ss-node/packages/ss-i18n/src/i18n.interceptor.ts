// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { I18nService } from './i18n.service';

@Injectable()
export class I18nInterceptor implements NestInterceptor {
  constructor(private readonly i18nService: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const detectedLang = this.detectLanguage(request);
    this.i18nService.setLanguage(detectedLang);

    (request as any).i18nLang = detectedLang;
    (request as any).i18nService = this.i18nService;

    return next.handle();
  }

  /**
   * Detect language from request with priority:
   * query param > cookie > Accept-Language header > default
   */
  private detectLanguage(request: any): string {
    const supported = this.i18nService.getSupportedLanguages();

    // 1. Query parameter: ?locale=zh-CN
    const queryLocale = request.query?.locale;
    if (queryLocale && supported.includes(queryLocale)) {
      return queryLocale;
    }
    if (queryLocale) {
      const normalized = this.normalizeLang(queryLocale);
      if (supported.includes(normalized)) {
        return normalized;
      }
    }

    // 2. Cookie: locale=zh-CN
    const cookieLocale = this.parseCookie(request.headers?.cookie, 'locale');
    if (cookieLocale && supported.includes(cookieLocale)) {
      return cookieLocale;
    }
    if (cookieLocale) {
      const normalized = this.normalizeLang(cookieLocale);
      if (supported.includes(normalized)) {
        return normalized;
      }
    }

    // 3. Accept-Language header
    const acceptLanguage = request.headers?.['accept-language'] as string;
    if (acceptLanguage) {
      const langs = acceptLanguage.split(',');
      for (const langEntry of langs) {
        const [langCode] = langEntry.trim().split(';');
        const trimmed = langCode.trim();
        if (supported.includes(trimmed)) {
          return trimmed;
        }
        const normalized = this.normalizeLang(trimmed);
        if (supported.includes(normalized)) {
          return normalized;
        }
      }
    }

    // 4. Default: fallback language
    return this.i18nService.getFallbackLanguage();
  }

  private parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
    if (!cookieHeader) return undefined;

    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key.trim() === name) {
        return decodeURIComponent(valueParts.join('=').trim());
      }
    }
    return undefined;
  }

  private normalizeLang(lang: string): string {
    if (!lang) return '';
    const normalized = lang.toLowerCase();
    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('en')) return 'en-US';
    return lang;
  }
}
