// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ScadaError } from '@ss-node/ss-sdk';

interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  error: string;
  category?: string;
  severity?: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '服务器内部错误';
    let error = 'Internal Server Error';
    let category: string | undefined;
    let severity: string | undefined;
    let details: any[] | undefined;

    if (exception instanceof ScadaError) {
      statusCode = this.mapCategoryToStatus(exception.category, exception.severity);
      code = exception.code;
      message = exception.message;
      error = exception.constructor.name;
      category = exception.category;
      severity = exception.severity;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code =
        statusCode === 401
          ? 'UNAUTHORIZED'
          : statusCode === 403
            ? 'FORBIDDEN'
            : statusCode === 404
              ? 'NOT_FOUND'
              : statusCode === 409
                ? 'CONFLICT'
                : statusCode === 422
                  ? 'VALIDATION_ERROR'
                  : statusCode >= 500
                    ? 'INTERNAL_ERROR'
                    : 'HTTP_ERROR';
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const r = res as any;
        message = r.message || exception.message;
        error = r.error || exception.name;
        // 业务错误码透传：new XxxException({ code, message }) 时优先用自定义码（如 WECHAT_CODE_INVALID）
        if (typeof r.code === 'string' && r.code.length > 0) {
          code = r.code;
        }
        if (Array.isArray(r.message)) {
          details = r.message.map((m: string) => {
            const match = m.match(/^(\w+)\s+(.+)$/);
            return match ? { field: match[1], message: match[2] } : { message: m };
          });
          message = '请求参数校验失败';
        }
      } else {
        message = String(res);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    this.logError(exception, request, statusCode);

    const requestId = request.headers['x-request-id'] as string | undefined;

    const body: ErrorResponseBody = {
      statusCode,
      code,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (requestId) body.requestId = requestId;
    if (category) body.category = category;
    if (severity) body.severity = severity;
    if (details) body.details = details;

    response.status(statusCode).json(body);
  }

  private mapCategoryToStatus(category: string, severity: string): number {
    if (severity === 'fatal') return HttpStatus.INTERNAL_SERVER_ERROR;
    if (severity === 'warn') return HttpStatus.OK;

    switch (category) {
      case 'auth':
        return HttpStatus.UNAUTHORIZED;
      case 'data':
        return HttpStatus.BAD_GATEWAY;
      case 'device':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'alarm':
        return HttpStatus.INTERNAL_SERVER_ERROR;
      case 'system':
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private logError(exception: unknown, request: Request, statusCode: number): void {
    const errorName = exception instanceof Error ? exception.name : 'UnknownError';
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const url = request?.url || 'unknown';
    const method = request?.method || 'UNKNOWN';
    const ip = request?.ip || 'unknown';

    const logLine = `${method} ${url} ${statusCode} ip=${ip} ${errorName}: ${errorMessage}`;

    if (statusCode >= 500) {
      this.logger.error(logLine, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(logLine);
    }
  }
}
