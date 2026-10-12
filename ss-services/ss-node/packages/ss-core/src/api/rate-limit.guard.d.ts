// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class RateLimitGuard implements CanActivate {
  private readonly logger;
  private readonly store;
  private readonly defaultWindowMs;
  private readonly defaultMax;
  private cleanupInterval;
  constructor();
  canActivate(context: ExecutionContext): boolean;
  private cleanup;
  onModuleDestroy(): void;
}
