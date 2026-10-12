// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as winston from 'winston';
import { PathResolverService, getLogConfig, createPluginLogger, LogConfig } from '@ss-node/ss-core';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface ProcessMetrics {
  /** 堆内存已使用 (MB) */
  heapUsed: number;
  /** 堆内存总大小 (MB) */
  heapTotal: number;
  /** 进程常驻内存 (MB) */
  rss: number;
  /** 进程CPU使用时间 (微秒) */
  cpuUser: number;
  cpuSystem: number;
  /** 系统CPU使用率 (%，基于两次调用的差值估算) */
  cpuUsage: number;
  /** 进程运行秒数 */
  uptime: number;
}

export interface MonitorData {
  protocol: string;
  /** 进程性能指标 */
  metrics: ProcessMetrics;
  /** 进程信息 */
  processName: string;
  processId: number;
  /** 线程 ID（仅 worker_thread 模式） */
  threadId?: number;
  isolationMode: string;
  /** 最近采集日志（最多 MAX_LOG_LINES 行） */
  logs: string[];
  /** 日志文件路径 */
  logFilePath: string;
}

export interface ClearLogsResult {
  cleared: boolean;
  logFilePath: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

/**
 * 插件监控服务
 *
 * - 获取 Node.js 进程的内存/CPU 指标
 * - 按插件协议分目录、分日期记录采集日志
 * - 日志文件格式: {logsDir}/plugins/{protocol}/{protocol}-{YYYY-MM-DD}.log
 *
 * 日志写入采用 Winston DailyRotateFile transport（由 LoggerFactory 创建）：
 * - 按天 + 按大小轮转（LOG_MAX_SIZE）
 * - 历史文件自动 gzip 压缩（zippedArchive）
 * - 超过 LOG_MAX_FILES 自动删除最旧文件
 */
@Injectable()
export class PluginMonitorService {
  private readonly logger = new Logger(PluginMonitorService.name);

  /** 统一日志配置（LOG_DIR / LOG_MAX_SIZE / LOG_MAX_FILES / LOG_LEVEL） */
  private readonly logConfig: LogConfig;

  /** 按协议懒创建的 Winston logger 缓存 */
  private readonly pluginLoggers = new Map<string, winston.Logger>();

  /** 监控中返回的最大日志行数 */
  private readonly MAX_LOG_LINES = 200;

  /** 上次 CPU 快照，用于计算使用率变化 */
  private lastCpuSnapshot: { timestamp: number; usage: NodeJS.CpuUsage } | null = null;

  constructor(private readonly pathResolver: PathResolverService) {
    this.logConfig = getLogConfig();
  }

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径（用于 fallback）
   * 与 plugin-config.service.ts、plugin-discovery.service.ts 保持一致。
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  // -----------------------------------------------------------------------
  //  进程指标
  // -----------------------------------------------------------------------

  getProcessMetrics(): ProcessMetrics {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    // CPU 使用率：基于时间差计算占比
    let cpuUsage = 0;
    const now = Date.now();
    if (this.lastCpuSnapshot) {
      const elapsedMs = now - this.lastCpuSnapshot.timestamp;
      if (elapsedMs > 0) {
        const cpuDiffUser = cpu.user - this.lastCpuSnapshot.usage.user;
        const cpuDiffSystem = cpu.system - this.lastCpuSnapshot.usage.system;
        const totalCpuUs = cpuDiffUser + cpuDiffSystem;
        // 转换为百分比（elapsedMs 是毫秒，cpu 是微秒）
        cpuUsage = (totalCpuUs / 1000 / elapsedMs / os.cpus().length) * 100;
      }
    }
    this.lastCpuSnapshot = { timestamp: now, usage: cpu };

    return {
      heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      cpuUser: cpu.user,
      cpuSystem: cpu.system,
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      uptime: Math.round(process.uptime()),
    };
  }

  // -----------------------------------------------------------------------
  //  采集日志（按插件分目录、分时间）
  // -----------------------------------------------------------------------

  /** 获取（或懒创建）指定协议的 Winston logger */
  private getPluginLogger(protocol: string): winston.Logger {
    let logger = this.pluginLoggers.get(protocol);
    if (!logger) {
      logger = createPluginLogger(this.logConfig, protocol);
      this.pluginLoggers.set(protocol, logger);
    }
    return logger;
  }

  /** 获取日志目录路径 */
  getPluginLogDir(protocol: string): string {
    return path.join(this.logConfig.logDir, 'plugins', protocol);
  }

  /** 获取当天日志文件路径 */
  getPluginLogFile(protocol: string): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dir = this.getPluginLogDir(protocol);
    return path.join(dir, `${protocol}-${yyyy}-${mm}-${dd}.log`);
  }

  /**
   * 写入一条采集日志
   *
   * 改用 Winston DailyRotateFile：按天 + 按大小轮转，历史文件 gzip 压缩。
   * 文件路径：{logDir}/plugins/{protocol}/{protocol}-{YYYY-MM-DD}.log
   */
  writeLog(protocol: string, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string): void {
    try {
      const winstonLevel =
        level.toLowerCase() === 'debug'
          ? 'debug'
          : level.toLowerCase() === 'warn'
            ? 'warn'
            : level.toLowerCase() === 'error'
              ? 'error'
              : 'info';
      this.getPluginLogger(protocol).log(winstonLevel, message);
    } catch (err) {
      this.logger.error(`Failed to write log [${protocol}]: ${(err as Error).message}`);
    }
  }

  /**
   * 读取最近 N 行日志
   */
  readLogs(protocol: string, tail?: number): string[] {
    const limit = tail || this.MAX_LOG_LINES;
    const filePath = this.getPluginLogFile(protocol);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim() !== '');
      return lines.slice(-limit);
    } catch (err) {
      this.logger.error(`Failed to read logs [${protocol}]: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * 清空当前日志文件
   */
  clearLogs(protocol: string): ClearLogsResult {
    const filePath = this.getPluginLogFile(protocol);

    if (!fs.existsSync(filePath)) {
      return { cleared: true, logFilePath: filePath, message: '日志文件不存在或已清空' };
    }

    try {
      // 不移除文件，只清空内容（保留文件句柄）
      fs.writeFileSync(filePath, '', 'utf-8');
      this.logger.log(`Logs cleared for plugin: ${protocol}`);
      return { cleared: true, logFilePath: filePath, message: '日志已清空' };
    } catch (err) {
      return {
        cleared: false,
        logFilePath: filePath,
        message: `清空失败: ${(err as Error).message}`,
      };
    }
  }

  /** 获取完整监控数据 */
  getMonitorData(protocol: string, isolationMode: string = 'in_process'): MonitorData {
    return {
      protocol,
      metrics: this.getProcessMetrics(),
      processName: `node (main: ${protocol})`,
      processId: process.pid,
      isolationMode,
      logs: this.readLogs(protocol),
      logFilePath: this.getPluginLogFile(protocol),
    };
  }
}
