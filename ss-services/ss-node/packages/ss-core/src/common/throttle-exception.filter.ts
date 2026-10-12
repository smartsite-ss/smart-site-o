// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottleExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const retryAfter = this.extractRetryAfter(exception);

    this.logger.warn(`Rate limit exceeded for ${request.ip} on ${request.method} ${request.url}`);

    response.setHeader('Retry-After', String(retryAfter));

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      code: HttpStatus.TOO_MANY_REQUESTS,
      message: '请求过于频繁，请稍后再试',
      error: 'Too Many Requests',
      retryAfter,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractRetryAfter(exception: ThrottlerException): number {
    try {
      const message = exception.message;
      const match = message.match(/(\d+)\s*(?:seconds?|s)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    } catch {
      // fall through
    }
    return 60;
  }
}
