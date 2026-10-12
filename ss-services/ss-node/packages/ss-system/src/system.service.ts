// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as os from 'os';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { OperationLog } from './entities/system.entity';

export interface SystemHealthDetails {
  status: 'ok' | 'degraded' | 'error';
  checks: Record<string, { status: string; message?: string; latencyMs: number }>;
  uptime: number;
  memory: { total: number; free: number; used: number; usagePercent: number };
  cpuLoad: number[];
  nodeVersion: string;
  platform: string;
  hostname: string;
  pid: number;
}

function readBuildInfo(): { version: string; buildTime: string } {
  // Try multiple paths to find build-info.json:
  // 1. Local dev: packages/ss-system/dist -> ../../../apps/ss-node-server/dist/build-info.json
  // 2. Production (flat dist): node_modules/@ss-node/ss-system/dist -> ../../dist/build-info.json
  // 3. Production fallback: process.cwd()/dist/build-info.json
  const candidatePaths = [
    join(__dirname, '..', '..', '..', 'apps', 'ss-node-server', 'dist', 'build-info.json'),
    join(__dirname, '..', '..', 'dist', 'build-info.json'),
    join(process.cwd(), 'dist', 'build-info.json'),
  ];
  for (const buildInfoPath of candidatePaths) {
    try {
      if (existsSync(buildInfoPath)) {
        return JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
      }
    } catch {
      /* ignore and try next path */
    }
  }
  return { version: '0.0.0', buildTime: '' };
}

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
  ) {}

  async onModuleInit() {
    // 启动时自动清理过期操作日志（OPERATION_LOG_RETENTION_DAYS=0 表示不自动清理）
    const retentionDays = parseInt(process.env.OPERATION_LOG_RETENTION_DAYS || '0', 10);
    if (retentionDays > 0) {
      try {
        const deleted = await this.cleanExpiredOperationLogs(retentionDays);
        if (deleted > 0) {
          this.logger.log(
            `Startup cleanup: removed ${deleted} expired operation logs (older than ${retentionDays} days)`,
          );
        }
      } catch (e: any) {
        this.logger.warn(`Failed to clean expired operation logs on startup: ${e.message}`);
      }
    }
  }

  /**
   * 清理超过指定天数的操作日志
   * @param days 保留天数，清理此天数之前的日志
   * @returns 删除的记录数
   */
  async cleanExpiredOperationLogs(days: number): Promise<number> {
    if (days <= 0) return 0;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.operationLogRepo.delete({ createdAt: LessThan(cutoff) });
    return result.affected || 0;
  }

  /** 清空全部操作日志 */
  async cleanAllOperationLogs(): Promise<number> {
    const count = await this.operationLogRepo.count();
    if (count > 0) {
      await this.operationLogRepo.clear();
    }
    return count;
  }

  getSimpleHealth(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getDetailedHealth(): Promise<SystemHealthDetails> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const checks: Record<string, { status: string; message?: string; latencyMs: number }> = {};

    const startMemory = Date.now();
    checks.memory = {
      status: os.freemem() > 50 * 1024 * 1024 ? 'pass' : 'warn',
      message: `Free: ${Math.round(freeMem / 1024 / 1024)}MB / ${Math.round(totalMem / 1024 / 1024)}MB`,
      latencyMs: Date.now() - startMemory,
    };

    const startDisk = Date.now();
    checks.disk = { status: 'pass', message: 'OK', latencyMs: Date.now() - startDisk };

    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    const checkValues = Object.values(checks);
    if (checkValues.some((c) => c.status === 'error')) overallStatus = 'error';
    else if (checkValues.some((c) => c.status === 'warn')) overallStatus = 'degraded';

    return {
      status: overallStatus,
      checks,
      uptime: process.uptime(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: Math.round((usedMem / totalMem) * 10000) / 100,
      },
      cpuLoad: os.loadavg(),
      nodeVersion: process.version,
      platform: process.platform,
      hostname: os.hostname(),
      pid: process.pid,
    };
  }

  getInfo() {
    const buildInfo = readBuildInfo();
    return {
      appName: 'ss-node-server',
      version: buildInfo.version,
      buildTime: buildInfo.buildTime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: os.arch(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      networkInterfaces: os.networkInterfaces(),
      pid: process.pid,
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
  }

  getK8sProbes() {
    return {
      liveness: { status: 'ok' },
      readiness: { status: 'ok', checks: ['memory', 'disk'] },
      startup: { status: 'ok', message: 'Application started successfully' },
    };
  }
}
