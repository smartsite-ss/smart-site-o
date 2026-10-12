// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { PermissionAuditLog } from './entities/permission-audit-log.entity';

/**
 * 审计日志查询参数
 */
export interface AuditLogQueryDto {
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 操作人 ID */
  operatorId?: string;
  /** 操作类型 */
  action?: string;
  /** 目标类型 */
  targetType?: string;
  /** 目标 ID */
  targetId?: string;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

/**
 * 审计日志创建参数
 */
export interface CreateAuditLogDto {
  operatorId: string;
  operatorName: string;
  action: string;
  targetType: string;
  targetId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string;
}

/**
 * 权限变更审计服务 — v7.0 新增
 *
 * 记录所有权限相关变更操作：
 *   - 角色创建/删除
 *   - 角色权限码修改
 *   - 数据授权变更（项目/分组/设备）
 *   - 用户角色分配/撤销
 */
@Injectable()
export class PermissionAuditService {
  constructor(
    @Inject(getRepositoryToken(PermissionAuditLog))
    private readonly auditRepo: Repository<PermissionAuditLog>,
  ) {}

  /**
   * 记录一条审计日志
   */
  async log(dto: CreateAuditLogDto): Promise<PermissionAuditLog> {
    const log = this.auditRepo.create({
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      action: dto.action,
      targetType: dto.targetType,
      targetId: dto.targetId,
      changes: dto.changes ?? null,
      ipAddress: dto.ipAddress ?? null,
    });
    return this.auditRepo.save(log);
  }

  /**
   * 查询审计日志（支持分页和筛选）
   */
  async findAll(
    query: AuditLogQueryDto = {},
  ): Promise<{ items: PermissionAuditLog[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const where: FindOptionsWhere<PermissionAuditLog> = {};

    if (query.operatorId) {
      where.operatorId = query.operatorId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.targetType) {
      where.targetType = query.targetType;
    }
    if (query.targetId) {
      where.targetId = query.targetId;
    }

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  /**
   * 按操作人查询审计日志
   */
  async findByOperator(
    operatorId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: PermissionAuditLog[]; total: number }> {
    return this.findAll({ operatorId, page, pageSize });
  }

  /**
   * 按目标查询审计日志
   */
  async findByTarget(
    targetType: string,
    targetId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: PermissionAuditLog[]; total: number }> {
    return this.findAll({ targetType, targetId, page, pageSize });
  }

  /**
   * 按时间范围查询审计日志
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: PermissionAuditLog[]; total: number }> {
    const _where: FindOptionsWhere<PermissionAuditLog> = {};
    if (startDate && endDate) {
      // Use a simpler approach — filter in service layer for SQLite compatibility
    }

    const [items, _total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Filter by date range in memory (TypeORM date filtering varies by DB)
    let filtered = items;
    if (startDate) {
      filtered = filtered.filter((item) => item.createdAt >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((item) => item.createdAt <= new Date(endDate));
    }

    return { items: filtered, total: filtered.length };
  }

  /**
   * 获取最新的 N 条审计日志
   */
  async findRecent(limit = 50): Promise<PermissionAuditLog[]> {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
