// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../common/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const request = context.switchToHttp().getRequest();

    // 跳过健康检查等基础端点，直接返回原始数据
    if (request.url?.startsWith('/api/v1/system/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 已包含标准包装字段（code + data + message + timestamp）的响应不再重复包装
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'data' in data &&
          'message' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // 分页查询响应（兼容 data 和 items 两种字段名）
        if (data && typeof data === 'object' && 'pagination' in data) {
          const paginated = data as any;
          return {
            code: 200,
            data: paginated.data ?? paginated.items,
            pagination: paginated.pagination,
            message: 'success',
            timestamp: new Date().toISOString(),
          } as PaginatedResponse<T>;
        }

        // 文件流下载（StreamableFile）—— 交由 NestJS 内置流式响应处理，不包装
        // 否则会被 wrapResponse 序列化为 {code,data:{stream:...}} 导致下载内容错误
        if (data instanceof StreamableFile) return data;

        // 文件下载 / Stream 等非 JSON 响应
        if (Buffer.isBuffer(data)) return data as any;

        return this.wrapResponse(data);
      }),
    );
  }

  private wrapResponse(data: any): ApiResponse<any> {
    return {
      code: 200,
      data: data ?? null,
      message: 'success',
      timestamp: new Date().toISOString(),
    };
  }
}
