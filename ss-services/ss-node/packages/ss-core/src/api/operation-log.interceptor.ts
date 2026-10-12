// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Repository } from 'typeorm';

export interface OperationLogEntity {
  id?: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  details?: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);

  private operationLogRepo: Repository<any> | null = null;

  constructor() {}

  setRepository(repo: Repository<any>): void {
    this.operationLogRepo = repo;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // CODE-01: GET 请求为只读操作，审计意义低，跳过操作日志写入以避免每个 API 请求
    // 都触发一次 SQLite INSERT（在 swap/IO 受限服务器上放大所有 GET 延迟）
    const isReadOperation = request.method === 'GET';

    const logEntry: OperationLogEntity = {
      action: `${request.method} ${request.route?.path || request.url}`,
      resource: request.route?.path || request.url,
      resourceId: request.params?.id,
      userId: request.user?.id,
      username: request.user?.username,
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
      details:
        request.method !== 'GET' ? JSON.stringify(request.body || {}).slice(0, 500) : undefined,
      status: 'pending',
      createdAt: new Date(),
    };

    return next.handle().pipe(
      tap({
        next: () => {
          if (isReadOperation) return; // GET 跳过
          logEntry.status = 'success';
          const duration = `${Date.now() - startTime}ms`;
          // 保留已捕获的请求体，末尾追加耗时
          logEntry.details = logEntry.details
            ? `${logEntry.details} | Duration: ${duration}`
            : `Duration: ${duration}`;
          void this.saveOperationLog(logEntry);
        },
        error: (error) => {
          if (isReadOperation) return; // GET 错误也跳过（避免错误风暴放大 IO）
          logEntry.status = 'error';
          const errInfo = `${error.message || 'Unknown error'} (${Date.now() - startTime}ms)`;
          // 保留已捕获的请求体，末尾追加错误信息
          logEntry.details = logEntry.details
            ? `${logEntry.details} | Error: ${errInfo}`
            : `Error: ${errInfo}`;
          void this.saveOperationLog(logEntry);
        },
      }),
    );
  }

  /**
   * CODE-01: 异步保存操作日志。
   * - 使用 void + .catch 捕获异步拒绝（原实现 save() 未 await 且 try/catch 无法捕获 Promise 拒绝）
   * - 不阻塞主请求响应（fire-and-forget），但确保异常被吞掉并记录，不产生 unhandledRejection
   */
  private saveOperationLog(entry: OperationLogEntity): Promise<void> {
    if (!this.operationLogRepo) return Promise.resolve();
    return this.operationLogRepo.save(entry).catch((error: Error) => {
      this.logger.error(`Failed to save operation log: ${error.message}`);
    });
  }
}
