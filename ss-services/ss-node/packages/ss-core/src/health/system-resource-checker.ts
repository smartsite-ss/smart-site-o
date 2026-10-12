// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as os from 'os';
import { execSync } from 'child_process';
import { Logger } from '@nestjs/common';
import { HealthChecker, HealthCheckResult } from './health.types';

/**
 * 系统资源阈值配置
 */
export interface SystemResourceThresholds {
  /** 磁盘使用率阈值（百分比，默认 90） */
  diskUsagePercent: number;
  /** 内存使用率阈值（百分比，默认 90） */
  memoryUsagePercent: number;
  /** CPU 使用率阈值（百分比，默认 90） */
  cpuUsagePercent: number;
}

export const DEFAULT_THRESHOLDS: SystemResourceThresholds = {
  diskUsagePercent: 90,
  memoryUsagePercent: 90,
  cpuUsagePercent: 90,
};

/**
 * 获取磁盘使用情况
 */
function getDiskUsage(): { total: number; free: number; usedPercent: number } {
  try {
    if (process.platform === 'win32') {
      const result = execSync(
        'wmic logicaldisk where "Caption=\'%SystemDrive%\'" get Size,FreeSpace /format:csv',
        { encoding: 'utf8', timeout: 5000, windowsHide: true },
      );
      const lines = result.trim().split('\n');
      const [header, data] = lines;
      if (header && data) {
        const parts = data.split(',');
        // format: Node,FreeSpace,Size (3 cols)
        if (parts.length >= 3) {
          const free = parseInt(parts[1], 10);
          const total = parseInt(parts[2], 10);
          if (!isNaN(free) && !isNaN(total) && total > 0) {
            const usedPercent = ((total - free) / total) * 100;
            return { total, free, usedPercent: Math.round(usedPercent * 10) / 10 };
          }
        }
      }
    } else {
      // Linux / macOS
      const result = execSync('df -k / | tail -1', { encoding: 'utf8', timeout: 5000 });
      const parts = result.trim().split(/\s+/);
      if (parts.length >= 5) {
        const total = parseInt(parts[1], 10) * 1024;
        const used = parseInt(parts[2], 10) * 1024;
        if (!isNaN(total) && !isNaN(used) && total > 0) {
          const usedPercent = (used / total) * 100;
          return { total, free: total - used, usedPercent: Math.round(usedPercent * 10) / 10 };
        }
      }
    }
  } catch {
    // 磁盘检查失败（权限不足、命令不存在等），返回 0 表示跳过
  }
  return { total: 0, free: 0, usedPercent: 0 };
}

/**
 * 格式化字节为人类可读
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 磁盘使用率健康检查器
 */
export class DiskUsageChecker implements HealthChecker {
  name = 'disk-usage';
  private readonly logger = new Logger(DiskUsageChecker.name);

  constructor(private thresholds: SystemResourceThresholds = DEFAULT_THRESHOLDS) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const disk = getDiskUsage();

    // 磁盘检查失败（total=0），跳过不报警
    if (disk.total === 0) {
      return {
        name: this.name,
        status: 'healthy',
        timestamp,
        details: { message: 'Disk check skipped (platform not supported or command failed)' },
      };
    }

    const isUnhealthy = disk.usedPercent >= this.thresholds.diskUsagePercent;
    const result: HealthCheckResult = {
      name: this.name,
      status: isUnhealthy ? 'unhealthy' : 'healthy',
      timestamp,
      details: {
        total: formatBytes(disk.total),
        free: formatBytes(disk.free),
        usedPercent: disk.usedPercent,
        threshold: this.thresholds.diskUsagePercent,
      },
    };

    if (isUnhealthy) {
      result.error = `磁盘使用率 ${disk.usedPercent}% 超过阈值 ${this.thresholds.diskUsagePercent}%（剩余 ${formatBytes(disk.free)}）`;
      this.logger.warn(result.error);
    }

    return result;
  }
}

/**
 * 内存使用率健康检查器
 */
export class MemoryUsageChecker implements HealthChecker {
  name = 'memory-usage';
  private readonly logger = new Logger(MemoryUsageChecker.name);

  constructor(private thresholds: SystemResourceThresholds = DEFAULT_THRESHOLDS) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usedPercent = (usedMem / totalMem) * 100;

    const isUnhealthy = usedPercent >= this.thresholds.memoryUsagePercent;
    const result: HealthCheckResult = {
      name: this.name,
      status: isUnhealthy ? 'unhealthy' : 'healthy',
      timestamp,
      details: {
        total: formatBytes(totalMem),
        free: formatBytes(freeMem),
        used: formatBytes(usedMem),
        usedPercent: Math.round(usedPercent * 10) / 10,
        threshold: this.thresholds.memoryUsagePercent,
      },
    };

    if (isUnhealthy) {
      result.error = `内存使用率 ${Math.round(usedPercent * 10) / 10}% 超过阈值 ${this.thresholds.memoryUsagePercent}%（剩余 ${formatBytes(freeMem)}）`;
      this.logger.warn(result.error);
    }

    return result;
  }
}

/**
 * CPU 使用率健康检查器
 *
 * 通过两次采样（间隔 1 秒）计算 CPU 使用率差值，确保准确性。
 */
export class CpuUsageChecker implements HealthChecker {
  name = 'cpu-usage';
  private readonly logger = new Logger(CpuUsageChecker.name);

  constructor(private thresholds: SystemResourceThresholds = DEFAULT_THRESHOLDS) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = Date.now();

    // 第一次采样
    const startMeasure = os.cpus().map((cpu) => {
      const times = cpu.times;
      let total = 0;
      for (const t of Object.values(times)) total += t;
      return { idle: times.idle, total };
    });

    const coreCount = startMeasure.length;

    // 等待 1 秒后第二次采样
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const endMeasure = os.cpus().map((cpu) => {
      const times = cpu.times;
      let total = 0;
      for (const t of Object.values(times)) total += t;
      return { idle: times.idle, total };
    });

    // 计算差值
    let totalIdleDiff = 0;
    let totalDiff = 0;
    for (let i = 0; i < startMeasure.length; i++) {
      totalIdleDiff += endMeasure[i].idle - startMeasure[i].idle;
      totalDiff += endMeasure[i].total - startMeasure[i].total;
    }

    const usedPercent = totalDiff > 0 ? 100 - (totalIdleDiff / totalDiff) * 100 : 0;
    const roundedPercent = Math.round(usedPercent * 10) / 10;
    const isUnhealthy = roundedPercent >= this.thresholds.cpuUsagePercent;

    const result: HealthCheckResult = {
      name: this.name,
      status: isUnhealthy ? 'unhealthy' : 'healthy',
      timestamp,
      details: {
        cores: coreCount,
        usedPercent: roundedPercent,
        threshold: this.thresholds.cpuUsagePercent,
        loadAvg: os.loadavg(),
      },
    };

    if (isUnhealthy) {
      result.error = `CPU 使用率 ${roundedPercent}% 超过阈值 ${this.thresholds.cpuUsagePercent}%（${coreCount} 核）`;
      this.logger.warn(result.error);
    }

    return result;
  }
}
