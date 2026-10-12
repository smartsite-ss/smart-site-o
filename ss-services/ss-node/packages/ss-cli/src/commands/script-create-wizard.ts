// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Script Create Wizard — 交互式脚本创建向导
 *
 * 步骤：选择项目 → 选择触发类型 → 输入脚本名称 → 选择模板（可选）→
 *       输入脚本代码 → 配置触发参数 → 确认创建
 */

import * as readline from 'readline';
import { InteractivePrompts } from '../core/InteractivePrompts';
import { ApiClient, ApiError } from '../core/ApiClient';

/** 脚本触发类型 */
type TriggerType = 'manual' | 'scheduled' | 'event' | 'pipeline';

/** 触发类型选项 */
interface TriggerOption {
  name: string;
  value: TriggerType;
  description: string;
}

/** 脚本模板 */
interface ScriptTemplate {
  name: string;
  value: string;
  code: string;
  description: string;
}

/** 项目信息 */
interface ProjectInfo {
  id: string;
  name: string;
}

/** 支持的触发类型 */
const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    name: 'Manual',
    value: 'manual',
    description: 'Execute on demand via API or UI',
  },
  {
    name: 'Scheduled (Cron)',
    value: 'scheduled',
    description: 'Execute on a cron schedule',
  },
  {
    name: 'Event',
    value: 'event',
    description: 'Execute when an event occurs (alarm, tag change, etc.)',
  },
  {
    name: 'Pipeline',
    value: 'pipeline',
    description: 'Execute within the data pipeline',
  },
];

/** 事件类型选项 */
const EVENT_TYPES: { name: string; value: string }[] = [
  { name: 'Alarm Triggered', value: 'alarm.triggered' },
  { name: 'Alarm Cleared', value: 'alarm.cleared' },
  { name: 'Tag Change', value: 'tag.change' },
];

/** 内置脚本模板 */
const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    name: 'Empty (no template)',
    value: 'empty',
    description: 'Start from scratch',
    code: '// Enter your script code here\n',
  },
  {
    name: 'Basic Manual Script',
    value: 'basic-manual',
    description: 'A simple script with logging',
    code: [
      '// Basic manual script',
      '// Available APIs: log, tag, device, http, storage',
      '',
      'log.info("Script started");',
      '',
      '// Read a tag value',
      'const value = await tag.read("device-001.temperature");',
      'log.info("Current value:", value);',
      '',
      '// Write a tag value',
      'await tag.write("device-001.setpoint", 50);',
      '',
      'log.info("Script completed");',
    ].join('\n'),
  },
  {
    name: 'Scheduled (Cron) Script',
    value: 'scheduled-template',
    description: 'Template for scheduled execution',
    code: [
      '// Scheduled script template',
      '// This script runs on a cron schedule',
      '',
      'log.info("Scheduled script triggered at:", new Date().toISOString());',
      '',
      '// Query all devices',
      'const devices = await device.list();',
      'log.info(`Found ${devices.length} devices`);',
      '',
      '// Process each device',
      'for (const dev of devices) {',
      '  log.info(`Checking device: ${dev.name}`);',
      '  // Add your logic here',
      '}',
      '',
      'log.info("Scheduled script completed");',
    ].join('\n'),
  },
  {
    name: 'Event Handler Script',
    value: 'event-template',
    description: 'Template for event-driven execution',
    code: [
      '// Event handler script template',
      '// This script runs when an event occurs',
      '// Available context: event (the triggering event)',
      '',
      'log.info("Event received:", JSON.stringify(event));',
      '',
      '// Handle alarm event',
      'if (event.type === "alarm.triggered") {',
      '  log.warn(`Alarm triggered: ${event.data.ruleName}`);',
      '  // Add your alarm handling logic here',
      '}',
      '',
      '// Handle tag change event',
      'if (event.type === "tag.change") {',
      '  log.info(`Tag changed: ${event.data.tagName} = ${event.data.value}`);',
      '  // Add your tag change logic here',
      '}',
      '',
      'log.info("Event handler completed");',
    ].join('\n'),
  },
];

/** 从 API 响应中提取项目列表 */
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

/** 向导选项 */
export interface ScriptWizardOptions {
  apiClient: ApiClient;
}

/** 运行脚本创建向导 */
export async function runScriptCreateWizard(options: ScriptWizardOptions): Promise<void> {
  const { apiClient } = options;

  console.log('\n=== Script Create Wizard ===\n');

  // Step 1: 选择项目
  const projectId = await selectProject(apiClient);
  if (!projectId) {
    console.log('Cancelled.');
    return;
  }

  // Step 2: 选择触发类型
  const triggerChoices = TRIGGER_OPTIONS.map((t) => ({
    name: `${t.name} — ${t.description}`,
    value: t.value,
  }));
  const triggerType = (await InteractivePrompts.select(
    'Select trigger type:',
    triggerChoices,
  )) as TriggerType;

  // Step 3: 输入脚本名称
  const scriptName = await InteractivePrompts.input(
    'Enter script name:',
    undefined,
    (v: string): string | null => {
      if (!v) return 'Script name is required';
      return null;
    },
  );

  // Step 4: 输入描述（可选）
  const description = await InteractivePrompts.input('Enter description (optional):');

  // Step 5: 选择模板
  const templateChoices = SCRIPT_TEMPLATES.map((t) => ({
    name: `${t.name} — ${t.description}`,
    value: t.value,
  }));
  const templateValue = await InteractivePrompts.select(
    'Select a template:',
    templateChoices,
    'empty',
  );
  const template = SCRIPT_TEMPLATES.find((t) => t.value === templateValue);

  // Step 6: 输入/编辑代码
  console.log('\n--- Script Code ---');
  console.log('(Enter your code. Type "EOF" on a new line to finish.)');
  if (template && template.value !== 'empty') {
    console.log(`\nTemplate "${template.name}" pre-filled:\n`);
    console.log(template.code);
    console.log('\nPress Enter to keep this code, or type new code below.');
  }

  const code = await collectScriptCode(template?.code ?? '');

  // Step 7: 配置触发参数
  const triggerConfig = await collectTriggerConfig(triggerType);

  // Step 8: 高级选项（可选）
  const timeoutStr = await InteractivePrompts.input(
    'Timeout (ms, optional):',
    '5000',
    (v: string): string | null => {
      const n = parseInt(v, 10);
      if (Number.isNaN(n) || n < 1) return 'Timeout must be a positive number';
      return null;
    },
  );
  const timeoutMs = parseInt(timeoutStr, 10);

  const allowNetwork = await InteractivePrompts.confirm('Allow network access?', false);

  // Step 9: 确认
  console.log('\n--- Script Summary ---');
  console.log(`  Project:      ${projectId}`);
  console.log(`  Name:         ${scriptName}`);
  console.log(`  Trigger Type: ${triggerType}`);
  if (description) {
    console.log(`  Description:  ${description}`);
  }
  if (triggerConfig) {
    console.log(`  Trigger Config: ${triggerConfig}`);
  }
  console.log(`  Timeout:      ${timeoutMs}ms`);
  console.log(`  Allow Network: ${allowNetwork}`);
  console.log(`  Code Length:   ${code.length} chars`);
  console.log('');

  const confirmed = await InteractivePrompts.confirm('Create this script?', true);
  if (!confirmed) {
    console.log('Cancelled.');
    return;
  }

  // Step 10: 调用 API 创建
  try {
    const payload: Record<string, unknown> = {
      name: scriptName,
      code,
      triggerType,
      timeoutMs,
      allowNetwork,
    };

    if (description) {
      payload.description = description;
    }
    if (triggerConfig) {
      payload.triggerConfig = triggerConfig;
    }

    const result = await apiClient.post<Record<string, unknown>>(
      `/api/v1/projects/${projectId}/scripts`,
      payload,
    );

    console.log('\nScript created successfully!');
    const resultId = (result as Record<string, unknown>).id;
    if (typeof resultId === 'string') {
      console.log(`  Script ID: ${resultId}`);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      console.error(`\nFailed to create script: ${err.message}`);
      console.error(`  Status: ${err.statusCode}`);
      console.error(`  Response: ${err.responseBody}`);
    } else {
      console.error(
        `\nFailed to create script: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    process.exitCode = 1;
  }
}

/** 选择项目 */
async function selectProject(apiClient: ApiClient): Promise<string | null> {
  try {
    const response = await apiClient.get<unknown>('/api/v1/projects');
    const projects = extractList<ProjectInfo>(response);

    if (projects.length === 0) {
      console.log('No projects available. Please create a project first.');
      return null;
    }

    const choices = projects.map((p) => ({ name: p.name, value: p.id }));
    return InteractivePrompts.select('Select project:', choices);
  } catch (err) {
    console.error(`Failed to fetch projects: ${err instanceof Error ? err.message : String(err)}`);
    console.log('Tip: Ensure the ss-data server is running (default: http://localhost:4000)');
    return null;
  }
}

/** 收集脚本代码（多行输入） */
async function collectScriptCode(defaultCode: string): Promise<string> {
  if (defaultCode) {
    const useTemplate = await InteractivePrompts.confirm('Use the template code as-is?', true);
    if (useTemplate) {
      return defaultCode;
    }
  }

  console.log('Enter script code (type "EOF" on a new line to finish):');

  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const lines: string[] = [];

    rl.on('line', (line: string) => {
      if (line.trim() === 'EOF') {
        rl.close();
        resolve(lines.join('\n'));
        return;
      }
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}

/** 收集触发配置 */
async function collectTriggerConfig(triggerType: TriggerType): Promise<string | null> {
  if (triggerType === 'manual') {
    return null;
  }

  if (triggerType === 'scheduled') {
    const cron = await InteractivePrompts.input(
      'Enter cron expression (e.g., "*/5 * * * *" for every 5 minutes):',
      '*/5 * * * *',
      (v: string): string | null => {
        if (!v) return 'Cron expression is required for scheduled scripts';
        return null;
      },
    );
    return JSON.stringify({ cron });
  }

  if (triggerType === 'event') {
    const eventType = await InteractivePrompts.select('Select event type:', EVENT_TYPES);
    return JSON.stringify({ event: eventType });
  }

  if (triggerType === 'pipeline') {
    const step = await InteractivePrompts.input(
      'Enter pipeline step (e.g., "afterCollect"):',
      'afterCollect',
    );
    return JSON.stringify({ step });
  }

  return null;
}
