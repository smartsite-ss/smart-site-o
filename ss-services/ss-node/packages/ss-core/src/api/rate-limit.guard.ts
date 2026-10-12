// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * 限流配置
 * 优先级: 环境变量 > 硬编码默认值
 *
 * 读取以下环境变量：
 *   - RATE_LIMIT_MAX        窗口内最大请求数
 *   - RATE_LIMIT_WINDOW_MS  限流窗口时长(毫秒)
 *
 * 典型配置（与 .env.dev / .env.pro 保持一致）：
 *   生产 (pro): RATE_LIMIT_MAX=300    RATE_LIMIT_WINDOW_MS=60000
 *   开发 (dev): RATE_LIMIT_MAX=6000   RATE_LIMIT_WINDOW_MS=60000
 */
export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const RATE_LIMIT_DEFAULTS: RateLimitConfig = {
  max: 600,
  windowMs: 60 * 1000,
};

export const RATE_LIMIT_DEV_DEFAULT: RateLimitConfig = {
  max: 6000,
  windowMs: 60 * 1000,
};

export const RATE_LIMIT_PROD_DEFAULT: RateLimitConfig = {
  max: 300,
  windowMs: 60 * 1000,
};

export function getRateLimitConfig(): RateLimitConfig {
  const env = process.env.NODE_ENV || 'development';
  const envDefault = env === 'production' ? RATE_LIMIT_PROD_DEFAULT : RATE_LIMIT_DEV_DEFAULT;

  const max = Number.parseInt(process.env.RATE_LIMIT_MAX ?? String(envDefault.max), 10);
  const windowMs = Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS ?? String(envDefault.windowMs),
    10,
  );

  return {
    max: Number.isFinite(max) && max > 0 ? max : envDefault.max,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : envDefault.windowMs,
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitEntry>();

  private readonly config: RateLimitConfig;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(@Optional() config?: RateLimitConfig) {
    this.config = config ?? getRateLimitConfig();
    this.logger.log(
      `Rate limit configured: ${this.config.max} requests / ${this.config.windowMs}ms (env=${process.env.NODE_ENV || 'development'})`,
    );
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = this.store.get(ip);
    const windowMs = this.config.windowMs;
    const max = this.config.max;

    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= max) {
      const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
      this.logger.warn(
        `Rate limit exceeded for IP: ${ip} (${entry.count}/${max} in ${Math.round(windowMs / 1000)}s, retry after ${resetInSeconds}s)`,
      );

      const response = context.switchToHttp().getResponse();
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', String(resetInSeconds));
        response.setHeader('X-RateLimit-Limit', String(max));
        response.setHeader('X-RateLimit-Remaining', '0');
        response.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `请求过于频繁，请 ${resetInSeconds} 秒后再试`,
          retryAfter: resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
