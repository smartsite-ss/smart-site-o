// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Feature Flag Guard — P1-T07 AI Feature Flag 门控
 *
 * 与 @RequireFeatureFlag() 装饰器配合使用。
 * 在 Flag 关闭时返回 403 Forbidden。
 *
 * 用法:
 *   @UseGuards(JwtAuthGuard, FeatureFlagGuard)
 *   @RequireFeatureFlag(AI_FEATURE_FLAGS.CODEGEN)
 *   async generatePlugin() { ... }
 *
 * 关联决策：D-012（Feature Flag 门控）
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService, AiFeatureFlag } from './feature-flag.service';

/** 装饰器元数据键 */
export const FEATURE_FLAG_KEY = 'ai:feature-flag';

/**
 * Feature Flag 装饰器 — 标记端点需要的 Feature Flag
 * @param flag — 功能标志键名
 */
import { SetMetadata } from '@nestjs/common';
export const RequireFeatureFlag = (flag: AiFeatureFlag) => SetMetadata(FEATURE_FLAG_KEY, flag);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFlag = this.reflector.getAllAndOverride<AiFeatureFlag>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未标记 Flag 的端点放行
    if (!requiredFlag) {
      return true;
    }

    if (this.featureFlagService.isEnabled(requiredFlag)) {
      return true;
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: `AI 功能未启用：${requiredFlag}`,
        error: 'Feature Flag Disabled',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
