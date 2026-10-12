// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getLogConfig } from './logger-factory';
import {
  AuditEvent,
  AuditLogEntry,
  AuditChainVerificationResult,
  AuditLogQueryFilter,
  AuditLogQueryResult,
  AuditLogStats,
} from './audit-logger.types';

/**
 * S-M02: 审计日志独立通道
 *
 * 安全事件独立存储，支持哈希链防篡改和合规审查。
 *
 * 目录结构：{logDir}/audit/audit-%DATE%.log
 * 轮转策略：按天 + 50m 大小，历史文件 gzip 压缩，保留 365 天（合规要求）。
 *
 * 哈希链防篡改：
 *   每条记录包含 prevHash（前一条的 hash）和 hash（当前记录的 hash）。
 *   hash = SHA256(prevHash + canonical_json(timestamp+type+userId+ip+...+prevHash))
 *   创世记录的 prevHash = '0' * 64。
 *   篡改任何一条记录会导致其 hash 变化，进而导致后续所有记录的 prevHash 不匹配。
 *
 * 重启恢复：
 *   服务重启后，从当天审计日志文件的最后一行读取 hash，恢复哈希链。
 *   如果当天无日志文件，使用创世哈希重新开始。
 */
@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);
  private readonly winstonLogger: winston.Logger;
  /** 哈希链：前一条记录的 hash */
  private prevHash: string;
  /** 创世哈希（哈希链起点） */
  private static readonly GENESIS_HASH = '0'.repeat(64);

  constructor() {
    // 1. 先从当天日志恢复 prevHash（在创建 winston logger 之前，确保首条记录能接上链）
    this.prevHash = this.loadLastHashFromToday();

    // 2. 创建 winston 审计日志通道
    const config = getLogConfig();
    // 确保审计日志目录存在（DailyRotateFile 不会自动创建嵌套目录）
    const auditDir = path.join(config.logDir, 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    this.winstonLogger = winston.createLogger({
      level: 'info',
      transports: [
        new DailyRotateFile({
          filename: path.join(config.logDir, 'audit', 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          // 审计日志保留 1 年（合规要求），与 app/error 日志的 14 天不同
          maxFiles: '365d',
          zippedArchive: true,
          // 不使用 winston.format.timestamp() + format.json()：
          // winston 会将传入的对象包裹在 message 字段中，导致顶层字段丢失。
          // 改为 printf 直接输出 message（即 JSON.stringify(entry) 的结果），
          // 确保文件每行是一个完整的审计条目 JSON。
          format: winston.format.printf((info: winston.Logform.TransformableInfo) => info.message as string),
        }),
      ],
    });

    this.logger.log(
      `审计日志通道已初始化 | prevHash=${this.prevHash.slice(0, 16)}... | logDir=${path.join(config.logDir, 'audit')}`,
    );
  }

  /**
   * 记录安全审计事件
   *
   * 同步计算哈希链并写入日志文件。调用方无需 await（fire-and-forget 友好）。
   */
  logSecurityEvent(event: AuditEvent): void {
    try {
      // 0. 校验必填字段，防止写入不完整条目破坏哈希链
      if (!event.type || !event.severity) {
        this.logger.warn(
          `审计事件缺少必填字段，已跳过 | type="${event.type}" severity="${event.severity}"`,
        );
        return;
      }

      // 1. 构建审计条目（不含 hash，用于计算 hash）
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        username: event.username,
        ip: event.ip,
        userAgent: event.userAgent,
        details: event.details,
        prevHash: this.prevHash,
        hash: '', // 占位，下一步计算
      };

      // 2. 计算当前条目的 hash = SHA256(prevHash + canonical_json(entry_without_hash))
      const hashInput = this.canonicalString(entry);
      entry.hash = crypto.createHash('sha256').update(hashInput, 'utf-8').digest('hex');

      // 3. 更新内存中的 prevHash，为下一条记录准备
      this.prevHash = entry.hash;

      // 4. 写入日志文件
      // 传入 JSON 字符串作为 message，配合 printf format 直接输出
      // 确保 file 每行是一个完整的审计条目 JSON（不被 winston 包裹）
      this.winstonLogger.info(JSON.stringify(entry));
    } catch (err) {
      // 审计日志写入失败不应影响业务流程，仅记录错误
      this.logger.error(
        `审计日志写入失败 | type="${event.type}" error="${(err as Error).message}"`,
      );
    }
  }

  /**
   * 验证指定日期审计日志的哈希链完整性
   *
   * 用于安全审查时检测日志是否被篡改。
   * 如果某条记录被修改，其 hash 会变化，导致后续记录的 prevHash 不匹配。
   *
   * @param date 日期字符串（YYYY-MM-DD），默认今天
   * @returns 验证结果
   */
  verifyChain(date?: string): AuditChainVerificationResult {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const config = getLogConfig();
    const auditFile = path.join(config.logDir, 'audit', `audit-${targetDate}.log`);

    if (!fs.existsSync(auditFile)) {
      return {
        valid: true,
        totalEntries: 0,
        brokenAtIndex: null,
        date: targetDate,
      };
    }

    const content = fs.readFileSync(auditFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    // 哈希链起点：如果是当天第一条，prevHash 应为创世哈希或前一天的最后一条 hash
    // 此处简化：第一条记录的 prevHash 应该与文件中记录的一致，我们验证链式关系
    let expectedPrevHash: string | null = null;
    let entryIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      entryIndex = i + 1;
      let entry: AuditLogEntry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAtIndex: entryIndex,
          brokenReason: 'JSON 解析失败（文件可能被损坏）',
          date: targetDate,
        };
      }

      // 防御性检查：prevHash 或 hash 字段缺失时判定为损坏
      if (!entry.prevHash || !entry.hash) {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAtIndex: entryIndex,
          brokenReason: `记录缺少哈希链字段（prevHash=${entry.prevHash ? '存在' : '缺失'}, hash=${entry.hash ? '存在' : '缺失'}）`,
          date: targetDate,
        };
      }

      // 第一条记录：初始化 expectedPrevHash
      if (expectedPrevHash === null) {
        expectedPrevHash = entry.prevHash;
      }

      // 验证 prevHash 是否与上一条的 hash 匹配
      if (entry.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAtIndex: entryIndex,
          brokenReason: `prevHash 不匹配：期望 ${(expectedPrevHash || '').slice(0, 16)}...，实际 ${entry.prevHash.slice(0, 16)}...`,
          date: targetDate,
        };
      }

      // 重新计算 hash 验证
      const recomputedHash = crypto
        .createHash('sha256')
        .update(this.canonicalString({ ...entry, hash: '' }), 'utf-8')
        .digest('hex');

      if (recomputedHash !== entry.hash) {
        return {
          valid: false,
          totalEntries: lines.length,
          brokenAtIndex: entryIndex,
          brokenReason: `hash 不匹配：记录可能被篡改（期望 ${recomputedHash.slice(0, 16)}...，实际 ${entry.hash.slice(0, 16)}...）`,
          date: targetDate,
        };
      }

      // 更新 expectedPrevHash 为当前条目的 hash
      expectedPrevHash = entry.hash;
    }

    return {
      valid: true,
      totalEntries: lines.length,
      brokenAtIndex: null,
      date: targetDate,
    };
  }

  /**
   * 分页查询审计日志条目
   *
   * 支持两种查询模式：
   *   1. 时间范围模式（startTime/endTime）：扫描范围内所有日期的审计文件，按时间戳过滤
   *   2. 单日模式（date）：读取指定日期（默认今天）的审计日志文件
   *
   * 按条件筛选后分页返回（倒序，最新在前）。
   *
   * @param filter 查询筛选条件
   * @returns 分页结果
   */
  findEntries(filter: AuditLogQueryFilter = {}): AuditLogQueryResult {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? Math.min(filter.pageSize, 100) : 20;

    const config = getLogConfig();
    const auditDir = path.join(config.logDir, 'audit');

    // 确定要扫描的日期列表
    let dates: string[];
    let startDateStr: string;
    let endDateStr: string;

    if (filter.startTime || filter.endTime) {
      // 时间范围模式：解析 startTime/endTime，生成日期列表
      const today = new Date().toISOString().split('T')[0];
      startDateStr = filter.startTime ? filter.startTime.split('T')[0] : today;
      endDateStr = filter.endTime ? filter.endTime.split('T')[0] : today;
      dates = this.enumerateDates(startDateStr, endDateStr);
    } else {
      // 单日模式
      const targetDate = filter.date || new Date().toISOString().split('T')[0];
      startDateStr = endDateStr = targetDate;
      dates = [targetDate];
    }

    // 收集所有日期文件中的条目
    const filtered: AuditLogEntry[] = [];
    for (const dateStr of dates) {
      const auditFile = path.join(auditDir, `audit-${dateStr}.log`);
      if (!fs.existsSync(auditFile)) continue;

      const content = fs.readFileSync(auditFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        let entry: AuditLogEntry;
        try {
          entry = JSON.parse(line);
        } catch {
          continue; // 跳过无法解析的行
        }

        // 防御性处理：旧记录可能缺少 type/severity 字段，归一化为 'unknown'
        if (!entry.type) (entry as any).type = 'unknown';
        if (!entry.severity) (entry as any).severity = 'unknown';
        if (!entry.timestamp) entry.timestamp = 'unknown';

        // 时间范围过滤（仅时间范围模式需要，单日模式文件本身已是当天）
        if (filter.startTime || filter.endTime) {
          if (entry.timestamp !== 'unknown') {
            const entryTime = new Date(entry.timestamp).getTime();
            if (filter.startTime && entryTime < new Date(filter.startTime).getTime()) continue;
            if (filter.endTime) {
              const endMs = new Date(filter.endTime).getTime();
              // endTime 含 T00:00:00 时只到当天 0 点，需要扩展到 23:59:59
              const endTimeStr = filter.endTime.split('T')[1];
              if (!endTimeStr || endTimeStr === '00:00:00') {
                if (entryTime > endMs + 86400000 - 1) continue;
              } else {
                if (entryTime > endMs) continue;
              }
            }
          }
        }

        if (filter.type && entry.type !== filter.type) continue;
        if (filter.severity && entry.severity !== filter.severity) continue;
        if (filter.userId && entry.userId !== filter.userId) continue;
        if (filter.username && entry.username !== filter.username) continue;

        filtered.push(entry);
      }
    }

    // 倒序（最新在前）
    filtered.reverse();

    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    return { items, total, page, pageSize, date: `${startDateStr}~${endDateStr}` };
  }

  /**
   * 枚举两个日期之间的所有日期（含两端）
   */
  private enumerateDates(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [startDate];

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates.length > 0 ? dates : [startDate];
  }

  /**
   * 获取审计日志统计信息
   *
   * 统计当天审计日志的总数、按类型/严重级别分布，以及哈希链完整性状态。
   *
   * @param date 日期字符串（YYYY-MM-DD），默认今天
   * @returns 统计结果
   */
  getStats(date?: string): AuditLogStats {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const config = getLogConfig();
    const auditFile = path.join(config.logDir, 'audit', `audit-${targetDate}.log`);

    const stats: AuditLogStats = {
      total: 0,
      byType: {},
      bySeverity: {},
      chainValid: true,
      date: targetDate,
    };

    if (!fs.existsSync(auditFile)) {
      return stats;
    }

    const content = fs.readFileSync(auditFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      let entry: AuditLogEntry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      stats.total++;
      // 防御性处理：旧记录可能缺少 type/severity，归一化为 'unknown' 避免产生 "undefined" 键
      const entryType = entry.type || 'unknown';
      const entrySeverity = entry.severity || 'unknown';
      stats.byType[entryType] = (stats.byType[entryType] || 0) + 1;
      stats.bySeverity[entrySeverity] = (stats.bySeverity[entrySeverity] || 0) + 1;
    }

    // 验证哈希链完整性
    const chainResult = this.verifyChain(targetDate);
    stats.chainValid = chainResult.valid;

    return stats;
  }

  /**
   * 从当天审计日志文件的最后一行恢复 prevHash
   *
   * 服务重启后哈希链需要接续。读取当天日志文件最后一行的 hash 字段。
   * 如果当天无日志文件，使用创世哈希重新开始。
   */
  private loadLastHashFromToday(): string {
    try {
      const config = getLogConfig();
      const today = new Date().toISOString().split('T')[0];
      const auditFile = path.join(config.logDir, 'audit', `audit-${today}.log`);

      if (!fs.existsSync(auditFile)) {
        return AuditLoggerService.GENESIS_HASH;
      }

      const content = fs.readFileSync(auditFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length === 0) {
        return AuditLoggerService.GENESIS_HASH;
      }

      const lastEntry = JSON.parse(lines[lines.length - 1]) as AuditLogEntry;
      if (lastEntry?.hash && /^[0-9a-f]{64}$/.test(lastEntry.hash)) {
        return lastEntry.hash;
      }

      return AuditLoggerService.GENESIS_HASH;
    } catch (err) {
      // 恢复失败时使用创世哈希（会导致当天哈希链断裂，但优于无法写入）
      console.warn(
        `[AuditLogger] 恢复 prevHash 失败，使用创世哈希: ${(err as Error).message}`,
      );
      return AuditLoggerService.GENESIS_HASH;
    }
  }

  /**
   * 生成规范化 JSON 字符串（顶层键按字母排序），确保 hash 计算的确定性
   *
   * 排除 hash 字段本身（hash 是计算结果，不能参与自身的计算）
   *
   * 注意：不使用 JSON.stringify 的 replacer 数组（第二参数），
   * 因为 replacer 数组会递归过滤所有层级对象的键，
   * 导致 details 等嵌套对象的子键被丢弃，使不同内容产生相同 hash。
   * 改为手动构建排序后的新对象再序列化。
   */
  private canonicalString(entry: AuditLogEntry): string {
    const fields: Record<string, any> = {
      timestamp: entry.timestamp,
      type: entry.type,
      severity: entry.severity,
      userId: entry.userId,
      username: entry.username,
      ip: entry.ip,
      userAgent: entry.userAgent,
      details: entry.details,
      prevHash: entry.prevHash,
    };
    // 手动按键排序构建新对象（仅顶层排序），确保确定性
    // JSON.stringify 会自动忽略 undefined 值
    const sortedKeys = Object.keys(fields).sort();
    const sorted: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (fields[key] !== undefined) {
        sorted[key] = fields[key];
      }
    }
    return JSON.stringify(sorted);
  }

  /**
   * 关闭审计日志通道，等待所有待写入的日志落盘
   *
   * 用于：
   * 1. 应用关闭时优雅清理资源（防止日志丢失）
   * 2. 测试中等待 winston 异步写入完成后读取文件验证
   *
   * 实现说明：
   *   winston 的 end() 会触发 'finish' 事件，但 DailyRotateFile transport
   *   的底层 FileStreamRotator 可能延迟刷新。为防止极端情况下 'finish'
   *   不触发导致 await 永久挂起，增加 2s 兜底超时。
   */
  async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      const finishHandler = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        this.winstonLogger.removeListener('finish', finishHandler);
        // setImmediate 确保底层文件流完成最后一次 flush
        setImmediate(resolve);
      };
      this.winstonLogger.on('finish', finishHandler);
      this.winstonLogger.end();
      // 兜底：2s 后强制 resolve（防止 'finish' 不触发时永久挂起）
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.winstonLogger.removeListener('finish', finishHandler);
        resolve();
      }, 2000);
    });
  }
}
