// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PaginatedResult } from '../types';

/**
 * 分页工具
 *
 * 提供分页查询参数构建和分页结果构建的便捷方法。
 */
export class PaginationUtil {
  /**
   * 构建分页查询参数（用于 TypeORM/Prisma 等 ORM 的 skip/take）
   * @param page 页码（从 1 开始）
   * @param pageSize 每页条数
   * @returns `{ skip, take }` 查询参数
   */
  static buildQuery(page: number, pageSize: number): { skip: number; take: number } {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.floor(pageSize));
    return {
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    };
  }

  /**
   * 构建分页结果
   * @param items 当前页数据
   * @param total 总记录数
   * @param page 当前页码
   * @param pageSize 每页条数
   * @returns 标准化的分页结果
   */
  static buildResult<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResult<T> {
    const safePageSize = Math.max(1, Math.floor(pageSize));
    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }
}
