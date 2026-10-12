// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLogController } from './audit-log.controller';

/**
 * S-M02: 审计日志独立通道模块
 *
 * 全局模块，提供 AuditLoggerService 供所有模块注入。
 *
 * 审计日志写入 {LOG_DIR}/audit/audit-%DATE%.log，独立于应用日志和错误日志，
 * 保留 365 天（合规要求），使用哈希链防篡改。
 *
 * AuditLogController 提供 REST API：
 * - GET /system/audit-logs — 分页查询审计日志
 * - GET /system/audit-logs/verify — 验证哈希链完整性
 * - GET /system/audit-logs/stats — 审计日志统计概览
 */
@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditLoggerModule {}
