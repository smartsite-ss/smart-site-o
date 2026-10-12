// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * alarm-commands.ts — 报警管理命令
 *
 *   alarm list — 列出报警，支持按严重级别和确认状态过滤
 *   alarm get  — 查看报警详情
 *   alarm ack  — 确认报警
 */

import { ApiError } from '../core/ApiClient';
import type { CommandParser } from '../core/CommandParser';

/** 创建报警管理子命令组 */
export function registerCommands(parser: CommandParser): void {
  const program = parser.getProgram();

  const alarm = program.command('alarm').description('Alarm management commands');

  // alarm list
  alarm
    .command('list')
    .description('List alarms')
    .requiredOption('-p, --project <projectId>', 'Project ID')
    .option('-s, --severity <severity>', 'Filter by severity (info, warning, critical, emergency)')
    .option('-a, --acknowledged <acknowledged>', 'Filter by acknowledged status (true/false)')
    .action(async (options: { project: string; severity?: string; acknowledged?: string }) => {
      const apiClient = parser.createApiClient();
      try {
        const params = new URLSearchParams();
        if (options.severity) params.set('severity', options.severity);
        if (options.acknowledged) params.set('acknowledged', options.acknowledged);
        const query = params.toString();
        const result = await apiClient.get<unknown>(
          `/api/v1/projects/${options.project}/alarms${query ? '?' + query : ''}`,
        );
        printAlarmList(result);
      } catch (err) {
        handleError('Failed to list alarms', err);
      }
    });

  // alarm get
  alarm
    .command('get')
    .description('Get alarm details')
    .requiredOption('-p, --project <projectId>', 'Project ID')
    .requiredOption('--id <alarmId>', 'Alarm ID')
    .action(async (options: { project: string; id: string }) => {
      const apiClient = parser.createApiClient();
      try {
        const result = await apiClient.get<unknown>(
          `/api/v1/projects/${options.project}/alarms/${options.id}`,
        );
        console.log('\n--- Alarm Details ---');
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        handleError('Failed to get alarm', err);
      }
    });

  // alarm ack
  alarm
    .command('ack')
    .description('Acknowledge an alarm')
    .requiredOption('-p, --project <projectId>', 'Project ID')
    .requiredOption('--id <alarmId>', 'Alarm ID')
    .option('--reason <reason>', 'Reason for acknowledgment')
    .action(async (options: { project: string; id: string; reason?: string }) => {
      const apiClient = parser.createApiClient();
      try {
        const payload: Record<string, unknown> = {};
        if (options.reason) {
          payload.reason = options.reason;
        }
        const result = await apiClient.post<unknown>(
          `/api/v1/projects/${options.project}/alarms/${options.id}/ack`,
          payload,
        );
        console.log('Alarm acknowledged successfully.');
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        handleError('Failed to acknowledge alarm', err);
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

/** 格式化输出报警列表 */
function printAlarmList(data: unknown): void {
  const list = extractList<Record<string, unknown>>(data);
  if (list.length === 0) {
    console.log('No alarms found.');
    return;
  }
  console.log(`\nTotal: ${list.length} alarm(s)\n`);
  const rows = list.map((a) => ({
    ID: a.id,
    Rule: a.ruleName ?? a.name ?? '-',
    Severity: a.severity ?? '-',
    Status: a.status ?? (a.acknowledged ? 'acknowledged' : 'active'),
    Time: a.triggeredAt ?? a.createdAt ?? a.time ?? '-',
    Message: typeof a.message === 'string' ? a.message.substring(0, 60) : '-',
  }));
  console.table(rows);
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
