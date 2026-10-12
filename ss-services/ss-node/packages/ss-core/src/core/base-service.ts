// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger, NotFoundException } from '@nestjs/common';
import { Repository, FindOptionsWhere } from 'typeorm';
import { PaginationDto, PaginationUtil, PaginatedResult } from '@ss-node/ss-sdk';

/**
 * 通用业务服务基类
 *
 * 提供各业务 Service 共用的工具方法：
 * - Logger 实例
 * - 分页参数计算
 * - 分页结果构建
 * - findOneOrThrow（查询并自动抛出 NotFoundException）
 *
 * 使用方式：
 * ```typescript
 * export class DeviceService extends BaseService<Device> {
 *   constructor(
 *     @Inject(getRepositoryToken(Device)) private deviceRepo: Repository<Device>,
 *   ) {
 *     super(DeviceService.name);
 *   }
 * }
 * ```
 */
export abstract class BaseService<T> {
  protected readonly logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * 计算分页参数（skip + take）
   */
  protected getPaginationParams(query?: PaginationDto): { skip: number; take: number } {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    return PaginationUtil.buildQuery(page, pageSize);
  }

  /**
   * 构建分页结果
   */
  protected buildPaginatedResult(
    items: T[],
    total: number,
    query?: PaginationDto,
  ): PaginatedResult<T> {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    return PaginationUtil.buildResult(items, total, page, pageSize);
  }

  /**
   * 按条件查询单个实体，不存在时抛出 NotFoundException
   *
   * @param repo TypeORM Repository
   * @param where 查询条件
   * @param entityName 实体名称（用于错误消息）
   * @param relations 可选的关联加载
   */
  protected async findOneOrThrow(
    repo: Repository<T>,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    entityName: string = 'entity',
    relations?: string[],
  ): Promise<T> {
    const entity = await repo.findOne({ where, relations });
    if (!entity) {
      throw new NotFoundException(`${entityName} not found`);
    }
    return entity;
  }
}
