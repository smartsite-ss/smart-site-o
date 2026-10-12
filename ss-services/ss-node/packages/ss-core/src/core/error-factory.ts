// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import type { I18nService } from '@ss-node/ss-i18n';

/**
 * 统一 i18n 错误工厂
 *
 * 封装常见 HTTP 异常与 i18n 翻译的绑定，减少 Service 中重复的
 * `throw new XxxException(this.i18nService.tSync(...))` 模式。
 *
 * 使用方式：
 * ```typescript
 * constructor(private i18nService: I18nService) {
 *   this.err = new ErrorFactory(i18nService);
 * }
 * private readonly err: ErrorFactory;
 *
 * // 使用
 * this.err.notFound('error.device.DEV_001', { id });
 * this.err.badRequest('error.validation.VAL_001', { field: 'name' });
 * this.err.conflict('error.device.DEV_002', { name });
 * ```
 */
export class ErrorFactory {
  constructor(private readonly i18n: I18nService) {}

  /**
   * 抛出 404 NotFoundException（带 i18n 翻译）
   */
  notFound(key: string, params?: Record<string, any>): never {
    throw new NotFoundException(params ? this.i18n.tSync(key, params) : this.i18n.tSync(key));
  }

  /**
   * 抛出 400 BadRequestException（带 i18n 翻译）
   */
  badRequest(key: string, params?: Record<string, any>): never {
    throw new BadRequestException(params ? this.i18n.tSync(key, params) : this.i18n.tSync(key));
  }

  /**
   * 抛出 409 ConflictException（带 i18n 翻译）
   */
  conflict(key: string, params?: Record<string, any>): never {
    throw new ConflictException(params ? this.i18n.tSync(key, params) : this.i18n.tSync(key));
  }
}
