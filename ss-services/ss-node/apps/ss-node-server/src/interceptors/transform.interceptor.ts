// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface WrappedResponse<T> {
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, WrappedResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse<T> | T> {
    const request = context.switchToHttp().getRequest();

    // 跳过健康检查等基础端点，直接返回原始数据
    if (request.url.startsWith('/api/v1/system/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 已包含标准包装字段（data + message + timestamp）的响应不再重复包装
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'message' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // 分页查询响应
        if (data && typeof data === 'object' && 'pagination' in data) {
          return {
            data: data.data,
            pagination: data.pagination,
            message: '查询成功',
            timestamp: new Date().toISOString(),
          };
        }

        // 文件下载等非 JSON 响应
        if (Buffer.isBuffer(data)) return data as any;

        return this.wrapResponse(data);
      }),
    );
  }

  private wrapResponse(data: any): WrappedResponse<any> {
    return {
      data: data ?? null,
      message: '操作成功',
      timestamp: new Date().toISOString(),
    };
  }
}
