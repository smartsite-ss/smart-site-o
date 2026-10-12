// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { I18nService } from '../i18n.service';

/**
 * Parameter decorator for easy translation in controllers.
 * Usage: @Translate('error.auth.AUTH_001') msg: string
 */
export const Translate = createParamDecorator((key: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const i18nService: I18nService = request.i18nService;
  if (i18nService) {
    return i18nService.translate(key);
  }
  return key;
});

/**
 * Decorator for passing params to translation.
 * Usage: @TranslateParam() params: Record<string, string | number>
 */
export const TranslateParam = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.i18nParams || {};
});

/**
 * Legacy decorator - returns the i18nService instance from request.
 * Usage: @I18nParam() i18n: I18nService
 */
export const I18nParam = createParamDecorator(
  (_data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.i18nService;
  },
);
