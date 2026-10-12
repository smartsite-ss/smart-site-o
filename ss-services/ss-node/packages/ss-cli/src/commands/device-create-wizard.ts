// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Device Create Wizard — 交互式设备创建向导
 *
 * 步骤：选择项目 → 选择驱动类型 → 输入设备标识 → 输入设备名称 →
 *       输入模板ID → 输入连接参数 → 确认创建
 */

import { InteractivePrompts } from '../core/InteractivePrompts';
import { ApiClient, ApiError } from '../core/ApiClient';

/** 设备驱动选项 */
interface DriverOption {
  name: string;
  value: string;
  connectionFields: ConnectionField[];
}

/** 连接参数字段定义 */
interface ConnectionField {
  key: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}

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

/** 项目信息 */
interface ProjectInfo {
  id: string;
  name: string;
}

/** 支持的设备驱动 */
const DRIVER_OPTIONS: DriverOption[] = [
  {
    name: 'Modbus TCP',
    value: 'modbus_tcp',
    connectionFields: [
      { key: 'host', label: 'Host / IP', defaultValue: '127.0.0.1', required: true },
      { key: 'port', label: 'Port', defaultValue: '502', required: true },
      { key: 'unitId', label: 'Unit ID', defaultValue: '1' },
    ],
  },
  {
    name: 'Modbus RTU',
    value: 'modbus_rtu',
    connectionFields: [
      { key: 'serialPort', label: 'Serial Port', defaultValue: 'COM1', required: true },
      { key: 'baudRate', label: 'Baud Rate', defaultValue: '9600' },
      { key: 'dataBits', label: 'Data Bits', defaultValue: '8' },
      { key: 'parity', label: 'Parity', defaultValue: 'none' },
      { key: 'stopBits', label: 'Stop Bits', defaultValue: '1' },
    ],
  },
  {
    name: 'OPC UA',
    value: 'opcua',
    connectionFields: [
      {
        key: 'endpointUrl',
        label: 'Endpoint URL',
        defaultValue: 'opc.tcp://localhost:4840',
        required: true,
      },
      { key: 'securityMode', label: 'Security Mode', defaultValue: 'None' },
    ],
  },
  {
    name: 'MQTT',
    value: 'mqtt',
    connectionFields: [
      {
        key: 'brokerUrl',
        label: 'Broker URL',
        defaultValue: 'mqtt://localhost:1883',
        required: true,
      },
      { key: 'clientId', label: 'Client ID', defaultValue: 'ss-cli-' + Date.now() },
      { key: 'username', label: 'Username (optional)' },
      { key: 'password', label: 'Password (optional)' },
    ],
  },
  {
    name: 'S7 (Siemens)',
    value: 's7',
    connectionFields: [
      { key: 'host', label: 'Host / IP', defaultValue: '127.0.0.1', required: true },
      { key: 'port', label: 'Port', defaultValue: '102' },
      { key: 'rack', label: 'Rack', defaultValue: '0' },
      { key: 'slot', label: 'Slot', defaultValue: '1' },
    ],
  },
  {
    name: 'Virtual (模拟设备)',
    value: 'virtual',
    connectionFields: [],
  },
];

/** 向导选项 */
export interface DeviceWizardOptions {
  apiClient: ApiClient;
}

/** 运行设备创建向导 */
export async function runDeviceCreateWizard(options: DeviceWizardOptions): Promise<void> {
  const { apiClient } = options;

  console.log('\n=== Device Create Wizard ===\n');

  // Step 1: 选择项目
  const projectId = await selectProject(apiClient);
  if (!projectId) {
    console.log('Cancelled.');
    return;
  }

  // Step 2: 选择驱动类型
  const driverChoices = DRIVER_OPTIONS.map((d) => ({ name: d.name, value: d.value }));
  const driverValue = await InteractivePrompts.select('Select device driver:', driverChoices);
  const driverOpt = DRIVER_OPTIONS.find((d) => d.value === driverValue);
  if (!driverOpt) {
    console.log('Invalid driver selection.');
    return;
  }

  // Step 3: 输入设备编码 (deviceCode)
  const deviceCode = await InteractivePrompts.input(
    'Enter device code (lowercase letters, numbers, hyphens):',
    undefined,
    (v: string): string | null => {
      if (!v) return 'Device code is required';
      if (!/^[a-z][a-z0-9-]{0,62}$/.test(v)) {
        return 'Device code must start with a letter, only lowercase letters, numbers, and hyphens';
      }
      return null;
    },
  );

  // Step 4: 输入设备名称
  const deviceName = await InteractivePrompts.input(
    'Enter device name:',
    undefined,
    (v: string): string | null => {
      if (!v) return 'Device name is required';
      return null;
    },
  );

  // Step 5: 输入模板ID
  const templateId = await InteractivePrompts.input(
    'Enter template ID:',
    undefined,
    (v: string): string | null => {
      if (!v) return 'Template ID is required';
      return null;
    },
  );

  // Step 6: 输入连接参数
  const connection = await collectConnectionParams(driverOpt);

  // Step 7: 采集周期（可选）
  const scanRateStr = await InteractivePrompts.input(
    'Scan rate (ms, optional):',
    '1000',
    (v: string): string | null => {
      const n = parseInt(v, 10);
      if (Number.isNaN(n) || n < 1) return 'Scan rate must be a positive number';
      return null;
    },
  );
  const scanRate = parseInt(scanRateStr, 10);

  // Step 8: 确认
  console.log('\n--- Device Summary ---');
  console.log(`  Project:   ${projectId}`);
  console.log(`  Code:      ${deviceCode}`);
  console.log(`  Name:      ${deviceName}`);
  console.log(`  Driver:    ${driverOpt.name} (${driverOpt.value})`);
  console.log(`  Template:  ${templateId}`);
  console.log(`  Scan Rate: ${scanRate}ms`);
  console.log(`  Connection: ${JSON.stringify(connection)}`);
  console.log('');

  const confirmed = await InteractivePrompts.confirm('Create this device?', true);
  if (!confirmed) {
    console.log('Cancelled.');
    return;
  }

  // Step 9: 调用 API 创建
  try {
    const payload = {
      deviceCode,
      deviceName,
      templateId,
      driver: driverOpt.value,
      connection,
      scanRate,
    };

    const result = await apiClient.post<Record<string, unknown>>(
      `/api/v1/projects/${projectId}/devices`,
      payload,
    );

    console.log('\nDevice created successfully!');
    const resultId = (result as Record<string, unknown>).id;
    if (typeof resultId === 'string') {
      console.log(`  Device ID: ${resultId}`);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      console.error(`\nFailed to create device: ${err.message}`);
      console.error(`  Status: ${err.statusCode}`);
      console.error(`  Response: ${err.responseBody}`);
    } else {
      console.error(
        `\nFailed to create device: ${err instanceof Error ? err.message : String(err)}`,
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

/** 收集连接参数 */
async function collectConnectionParams(driverOpt: DriverOption): Promise<Record<string, string>> {
  const connection: Record<string, string> = {};

  if (driverOpt.connectionFields.length === 0) {
    console.log(`\nNo connection parameters needed for ${driverOpt.name}.`);
    return connection;
  }

  console.log(`\n--- Connection Parameters (${driverOpt.name}) ---`);

  for (const field of driverOpt.connectionFields) {
    const value = await InteractivePrompts.input(
      field.label,
      field.defaultValue,
      (v: string): string | null => {
        if (field.required && !v) return `${field.label} is required`;
        return null;
      },
    );
    connection[field.key] = value;
  }

  return connection;
}
