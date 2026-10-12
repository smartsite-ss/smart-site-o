// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as os from 'os';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ScadaWebSocketGateway } from '@ss-node/ss-core';

function readBuildInfo(): { version: string; buildTime: string } {
  try {
    const buildInfoPath = join(
      __dirname,
      '..',
      '..',
      'apps',
      'ss-data-server',
      'dist',
      'build-info.json',
    );
    if (existsSync(buildInfoPath)) {
      return JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
    }
  } catch {
    /* ignore */
  }
  return { version: '0.0.0', buildTime: '' };
}

export interface SystemInfo {
  appName: string;
  version: string;
  buildTime: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string;
  totalMem: number;
  freeMem: number;
  networkInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
  pid: number;
  uptime: number;
  env: string;
  timezone: string;
  startTime: string;
  apiUrl: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  database: {
    type: string;
    tables: number;
    recordCount: number;
  };
  connections: {
    wsConnections: number;
    devicesOnline: number;
  };
}

@Injectable()
export class SystemInfoService {
  private readonly logger = new Logger(SystemInfoService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(ScadaWebSocketGateway)
    private readonly wsGateway: ScadaWebSocketGateway,
  ) {}

  async getInfo(): Promise<SystemInfo> {
    const buildInfo = readBuildInfo();
    const memUsage = process.memoryUsage();
    const dbInfo = await this.getDatabaseInfo();

    const port = process.env.PORT || 4000;
    const apiUrl = `http://localhost:${port}`;

    return {
      appName: 'ss-data-server',
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
      apiUrl,
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      database: dbInfo,
      connections: {
        wsConnections: this.wsGateway?.getConnectionCount() || 0,
        devicesOnline: 0,
      },
    };
  }

  private async getDatabaseInfo(): Promise<{ type: string; tables: number; recordCount: number }> {
    try {
      const dbType = this.dataSource.options.type;
      let tables = 0;
      let recordCount = 0;

      if (dbType === 'sqlite') {
        const tableResult = await this.dataSource.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );
        tables = tableResult.length;
        for (const row of tableResult) {
          try {
            const countResult = await this.dataSource.query(
              `SELECT COUNT(*) as cnt FROM "${row.name}"`,
            );
            recordCount += countResult[0]?.cnt || 0;
          } catch {
            // skip
          }
        }
      }

      return { type: dbType, tables, recordCount };
    } catch (error) {
      this.logger.error(`Failed to get DB info: ${error.message}`);
      return { type: 'unknown', tables: 0, recordCount: 0 };
    }
  }
}
