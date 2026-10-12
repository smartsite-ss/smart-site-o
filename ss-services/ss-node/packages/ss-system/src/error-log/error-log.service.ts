// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { ErrorLog } from '../entities/system.entity';

export interface ErrorLogQuery {
  level?: string;
  module?: string;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}

export interface ErrorStats {
  total: number;
  byLevel: { level: string; count: number }[];
  byModule: { module: string; count: number }[];
  recentErrors: ErrorLog[];
}

@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(
    @Inject(getRepositoryToken(ErrorLog))
    private readonly errorLogRepo: Repository<ErrorLog>,
  ) {}

  /** 捕获并持久化错误 */
  async capture(params: {
    level: string;
    message: string;
    stack?: string;
    context?: string;
    url?: string;
    method?: string;
    userId?: string;
    ip?: string;
  }): Promise<ErrorLog> {
    try {
      const errorLog = this.errorLogRepo.create({
        level: params.level,
        message: params.message,
        stack: params.stack || null,
        context: params.context || null,
        url: params.url || null,
        method: params.method || null,
        userId: params.userId || null,
        ip: params.ip || null,
        createdAt: new Date(),
      });
      return this.errorLogRepo.save(errorLog);
    } catch (error) {
      this.logger.error(`Failed to capture error log: ${error.message}`);
      throw error;
    }
  }

  /** 查询错误日志 */
  async query(
    params: ErrorLogQuery,
  ): Promise<{ data: ErrorLog[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, level, module, startTime, endTime } = params;
    const where: any = {};

    if (level) where.level = level;
    if (module) where.context = Like(`%${module}%`);
    if (startTime && endTime) {
      where.createdAt = Between(startTime, endTime);
    } else if (startTime) {
      where.createdAt = Between(startTime, new Date());
    }

    const [data, total] = await this.errorLogRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total, page, pageSize };
  }

  /** 错误统计 */
  async getStats(): Promise<ErrorStats> {
    const allLogs = await this.errorLogRepo.find({ order: { createdAt: 'DESC' }, take: 10000 });

    const levelCounts: Record<string, number> = {};
    const moduleCounts: Record<string, number> = {};

    for (const log of allLogs) {
      levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
      if (log.context) {
        moduleCounts[log.context] = (moduleCounts[log.context] || 0) + 1;
      }
    }

    return {
      total: allLogs.length,
      byLevel: Object.entries(levelCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([level, count]) => ({ level, count })),
      byModule: Object.entries(moduleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([module, count]) => ({ module, count })),
      recentErrors: allLogs.slice(0, 10),
    };
  }

  /** 删除错误日志 */
  async delete(id: string): Promise<void> {
    await this.errorLogRepo.delete(id);
  }

  /** 清理过期错误日志 */
  async cleanupExpired(days: number = 90): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.errorLogRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
    this.logger.log(`Cleaned up ${result.affected || 0} expired error logs`);
    return result.affected || 0;
  }
}
