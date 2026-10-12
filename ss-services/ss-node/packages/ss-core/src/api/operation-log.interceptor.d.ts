// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
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

export declare class OperationLogInterceptor implements NestInterceptor {
  private readonly logger;
  private operationLogRepo;
  constructor();
  setRepository(repo: Repository<any>): void;
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
  private saveOperationLog;
}
