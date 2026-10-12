// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * collector-commands.ts — 采集管理命令
 *
 *   collector status — 查看采集状态
 */

import { ApiError } from '../core/ApiClient';
import type { CommandParser } from '../core/CommandParser';

/** 创建采集管理子命令组 */
export function registerCommands(parser: CommandParser): void {
  const program = parser.getProgram();

  const collector = program.command('collector').description('Collector management commands');

  // collector status
  collector
    .command('status')
    .description('Get collector status')
    .action(async () => {
      const apiClient = parser.createApiClient();
      try {
        const result = await apiClient.get<unknown>('/api/v1/collector/status');
        printCollectorStatus(result);
      } catch (err) {
        handleError('Failed to get collector status', err);
      }
    });
}

/** 从 API 响应中提取列表 */
function extractList<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }
  const obj = response as Record<string, unknown>;
  if (obj.data) {
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
    const nested = (obj.data as Record<string, unknown>).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }
  return [];
}

/** 格式化输出采集器状态 */
function printCollectorStatus(data: unknown): void {
  console.log('\n--- Collector Status ---');

  const obj = data as Record<string, unknown>;
  const overallStatus = (obj.status as string) ?? 'unknown';
  const icon = overallStatus === 'running' || overallStatus === 'ok' ? '✓' : '✗';
  console.log(`  Overall Status: ${icon} ${overallStatus}`);

  if (obj.activeCount !== undefined) {
    console.log(`  Active Collectors: ${obj.activeCount}`);
  }
  if (obj.totalCount !== undefined) {
    console.log(`  Total Collectors:  ${obj.totalCount}`);
  }

  // 打印各采集器详情
  if (obj.collectors) {
    const collectors = extractList<Record<string, unknown>>(obj.collectors);
    if (collectors.length > 0) {
      console.log(`\n  Collectors (${collectors.length}):`);
      const rows = collectors.map((c) => ({
        Name: c.name ?? c.id ?? '-',
        Type: c.type ?? c.driver ?? '-',
        Status: c.status ?? '-',
        Uptime: c.uptime ?? '-',
        'Last Collect': c.lastCollect ?? c.lastCollectTime ?? '-',
      }));
      console.table(rows);
    }
  }
}

/** 统一错误处理 */
function handleError(context: string, err: unknown): void {
  if (err instanceof ApiError) {
    console.error(`${context}: ${err.message}`);
    console.error(`  Status: ${err.statusCode}`);
    console.error(`  Response: ${err.responseBody}`);
  } else {
    console.error(`${context}: ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exitCode = 1;
}
