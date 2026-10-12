// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, LessThan, Like } from 'typeorm';
import { OperationLog } from '../entities/system.entity';
import { EventBusService } from '@ss-node/ss-core';

export interface OperationLogQuery {
  userId?: string;
  username?: string;
  action?: string;
  resource?: string;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}

export interface OperationLogStats {
  totalActions: number;
  successRate: number;
  topActions: { action: string; count: number }[];
  topUsers: { userId: string; username: string; count: number }[];
  dailyStats: { date: string; count: number }[];
}

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  constructor(
    @Inject(getRepositoryToken(OperationLog))
    private readonly operationLogRepo: Repository<OperationLog>,
    private readonly eventBusService: EventBusService,
  ) {}

  /** 记录操作日志 */
  async record(entry: Partial<OperationLog>): Promise<OperationLog> {
    try {
      const operationLog = this.operationLogRepo.create({
        action: entry.action || 'unknown',
        resource: entry.resource || 'unknown',
        resourceId: entry.resourceId || null,
        userId: entry.userId || null,
        username: entry.username || null,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
        details: entry.details ? JSON.stringify(entry.details).slice(0, 1000) : null,
        status: entry.status || 'success',
        createdAt: new Date(),
      });
      return this.operationLogRepo.save(operationLog);
    } catch (error) {
      this.logger.error(`Failed to record operation log: ${error.message}`);
      throw error;
    }
  }

  /** 查询操作日志 */
  async query(
    params: OperationLogQuery,
  ): Promise<{ items: OperationLog[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, startTime, endTime, ...filters } = params;
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.username) where.username = Like(`%${filters.username}%`);
    if (filters.action) where.action = Like(`%${filters.action}%`);
    if (filters.resource) where.resource = Like(`%${filters.resource}%`);
    if (filters.status) where.status = filters.status;
    if (startTime && endTime) {
      where.createdAt = Between(startTime, endTime);
    } else if (startTime) {
      where.createdAt = Between(startTime, new Date());
    }

    const [items, total] = await this.operationLogRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /** 操作统计 */
  async getStats(): Promise<OperationLogStats> {
    const allLogs = await this.operationLogRepo.find({ order: { createdAt: 'DESC' }, take: 10000 });

    const totalActions = allLogs.length;
    const successCount = allLogs.filter((l) => l.status === 'success').length;
    const successRate =
      totalActions > 0 ? Math.round((successCount / totalActions) * 10000) / 100 : 0;

    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, { userId: string; username: string; count: number }> = {};
    const dailyCounts: Record<string, number> = {};

    for (const log of allLogs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      if (log.userId) {
        const key = log.userId;
        if (!userCounts[key]) {
          userCounts[key] = { userId: log.userId, username: log.username || 'unknown', count: 0 };
        }
        userCounts[key].count++;
      }
      const dateKey = log.createdAt.toISOString().slice(0, 10);
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }

    return {
      totalActions,
      successRate,
      topActions: Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([action, count]) => ({ action, count })),
      topUsers: Object.values(userCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      dailyStats: Object.entries(dailyCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
    };
  }

  /** 清理过期日志（默认按环境变量 OPERATION_LOG_RETENTION_DAYS，可传参覆盖） */
  async cleanupExpired(retentionDays?: number): Promise<number> {
    const days = retentionDays ?? parseInt(process.env.OPERATION_LOG_RETENTION_DAYS || '365', 10);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.operationLogRepo.delete({ createdAt: LessThan(cutoff) } as any);
    this.logger.log(
      `Cleaned up ${result.affected || 0} expired operation logs (cutoff: ${cutoff.toISOString()}, retention: ${days}d)`,
    );
    return result.affected || 0;
  }

  /** 清空全部操作日志 */
  async cleanAll(): Promise<number> {
    const result = await this.operationLogRepo.delete({} as any);
    this.logger.log(`Cleaned all operation logs: ${result.affected || 0} entries removed`);
    return result.affected || 0;
  }

  /** 获取单条操作日志 */
  async findById(id: string): Promise<OperationLog | null> {
    return this.operationLogRepo.findOne({ where: { id } as any });
  }
}
