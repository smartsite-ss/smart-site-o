// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * 请求 ID 注入中间件
 *
 * 为每个请求注入唯一 requestId，贯穿请求-响应-日志，便于前后端联调。
 * - 优先使用客户端传入的 X-Request-Id
 * - 无则自动生成 UUID
 * - 透传到响应头，供前端日志关联
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void): void {
    const existingId = req.headers['x-request-id'] as string | undefined;
    const requestId = existingId || randomUUID();

    // 确保请求头中有 requestId（供后续 filter/interceptor 读取）
    req.headers['x-request-id'] = requestId;

    // 透传到响应头
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
