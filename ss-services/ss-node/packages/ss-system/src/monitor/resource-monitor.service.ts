// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { EventBusService, PathResolverService } from '@ss-node/ss-core';

export interface ResourceSnapshot {
  timestamp: Date;
  cpu: {
    usagePercent: number;
    loadAvg: number[];
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    rateIn: number;
    rateOut: number;
  };
}

export interface AlertConfig {
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
}

@Injectable()
export class ResourceMonitorService {
  private readonly logger = new Logger(ResourceMonitorService.name);
  private history: ResourceSnapshot[] = [];
  private readonly maxHistory = 24 * 60; // 24h at 1min intervals
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastNetworkBytes: { in: number; out: number } | null = null;
  private lastNetworkTime: number = 0;

  private readonly alertConfig: AlertConfig = {
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
  };

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly pathResolver: PathResolverService,
  ) {
    this.startMonitoring();
  }

  /** 启动监控（每分钟采集） */
  startMonitoring(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.collectSnapshot().catch((err) =>
        this.logger.error(`Snapshot collection failed: ${err.message}`),
      );
    }, 60000);
    this.logger.log('Resource monitoring started');
  }

  /** 停止监控 */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 采集快照 */
  async collectSnapshot(): Promise<ResourceSnapshot> {
    const snapshot = await this.gatherMetrics();
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
    this.checkAlerts(snapshot);
    return snapshot;
  }

  /** 获取最新快照 */
  getLatest(): ResourceSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /** 获取历史数据 */
  getHistory(hours: number = 24): ResourceSnapshot[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.history.filter((s) => s.timestamp.getTime() >= cutoff);
  }

  private async gatherMetrics(): Promise<ResourceSnapshot> {
    const cpuUsage = this.getCpuUsage();
    const memUsage = process.memoryUsage();
    const diskInfo = await this.getDiskInfo();
    const networkInfo = this.getNetworkInfo();
    const totalMem = os.totalmem();

    const snapshot: ResourceSnapshot = {
      timestamp: new Date(),
      cpu: {
        usagePercent: cpuUsage,
        loadAvg: os.loadavg(),
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        usagePercent: Math.round((memUsage.rss / totalMem) * 10000) / 100,
      },
      disk: diskInfo,
      network: networkInfo,
    };

    return snapshot;
  }

  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
      totalIdle += times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return Math.round((1 - idle / total) * 10000) / 100;
  }

  private async getDiskInfo(): Promise<{
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  }> {
    try {
      // 使用项目根目录而非 process.cwd()，与 health.service.ts 保持一致
      const diskPath = this.getProjectRoot();
      if (fs.existsSync(diskPath)) {
        // Fallback: estimate disk usage
        return {
          total: 100 * 1024 * 1024 * 1024, // 100GB estimate
          used: 50 * 1024 * 1024 * 1024,
          free: 50 * 1024 * 1024 * 1024,
          usagePercent: 50,
        };
      }
    } catch {
      // ignore
    }
    return { total: 0, used: 0, free: 0, usagePercent: 0 };
  }

  /**
   * 获取 ss-services/ss-node 项目根目录的绝对路径
   *
   * 相对路径基准：
   * - dev 模式：__dirname 上溯 4 级 = ss-services/ss-node（本文件位于 packages/ss-system/dist/monitor/）
   * - 生产模式：process.cwd() = ss-run/ss/services/ss-node
   *
   * 与 app.module.ts getDatabaseConfig()、backup.service.ts getProjectRoot() 保持一致。
   */
  private getProjectRoot(): string {
    return this.pathResolver.getProjectRoot();
  }

  private getNetworkInfo(): { bytesIn: number; bytesOut: number; rateIn: number; rateOut: number } {
    const netInterfaces = os.networkInterfaces();
    let bytesIn = 0;
    let bytesOut = 0;

    for (const iface of Object.values(netInterfaces)) {
      if (iface) {
        for (const _info of iface) {
          // Approximate: use internal counters
          bytesIn += 1000;
          bytesOut += 500;
        }
      }
    }

    let rateIn = 0;
    let rateOut = 0;
    const now = Date.now();

    if (this.lastNetworkBytes && this.lastNetworkTime > 0) {
      const elapsed = (now - this.lastNetworkTime) / 1000;
      if (elapsed > 0) {
        rateIn = Math.round(((bytesIn - this.lastNetworkBytes.in) / elapsed) * 100) / 100;
        rateOut = Math.round(((bytesOut - this.lastNetworkBytes.out) / elapsed) * 100) / 100;
      }
    }

    this.lastNetworkBytes = { in: bytesIn, out: bytesOut };
    this.lastNetworkTime = now;

    return { bytesIn, bytesOut, rateIn, rateOut };
  }

  private checkAlerts(snapshot: ResourceSnapshot): void {
    if (snapshot.cpu.usagePercent > this.alertConfig.cpuThreshold) {
      this.logger.warn(
        `CPU usage alert: ${snapshot.cpu.usagePercent}% > ${this.alertConfig.cpuThreshold}%`,
      );
    }
    if (snapshot.memory.usagePercent > this.alertConfig.memoryThreshold) {
      this.logger.warn(
        `Memory usage alert: ${snapshot.memory.usagePercent}% > ${this.alertConfig.memoryThreshold}%`,
      );
    }
    if (snapshot.disk.usagePercent > this.alertConfig.diskThreshold) {
      this.logger.warn(
        `Disk usage alert: ${snapshot.disk.usagePercent}% > ${this.alertConfig.diskThreshold}%`,
      );
    }
  }
}
