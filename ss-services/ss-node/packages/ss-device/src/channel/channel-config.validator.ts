// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type {
  DeviceChannelConfig,
  ModbusTcpChannel,
  ModbusRtuChannel,
  OpcUaChannel,
  MqttChannel,
  SiemensS7Channel,
} from './channel-config.interface';

interface ValidationError {
  field: string;
  message: string;
}

/**
 * 校验通道配置，按协议类型校验必填字段
 * @returns 错误列表，空数组表示校验通过
 */
export function validateChannelConfig(config: DeviceChannelConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config) {
    errors.push({ field: 'config', message: '通道配置不能为空' });
    return errors;
  }

  const protocol = (config as any).protocol;
  if (!protocol) {
    errors.push({ field: 'protocol', message: '协议类型不能为空' });
    return errors;
  }

  switch (protocol) {
    case 'modbus_tcp':
      validateModbusTcp(config as ModbusTcpChannel, errors);
      break;
    case 'modbus_rtu':
      validateModbusRtu(config as ModbusRtuChannel, errors);
      break;
    case 'opc_ua':
      validateOpcUa(config as OpcUaChannel, errors);
      break;
    case 'mqtt':
      validateMqtt(config as MqttChannel, errors);
      break;
    case 'siemens_s7':
      validateSiemensS7(config as SiemensS7Channel, errors);
      break;
    case 'virtual':
      // 虚拟设备通道无需必填校验
      break;
    default:
      errors.push({ field: 'protocol', message: `不支持的协议类型: ${protocol}` });
  }

  return errors;
}

function validateModbusTcp(config: ModbusTcpChannel, errors: ValidationError[]): void {
  if (!config.host || config.host.trim() === '') {
    errors.push({ field: 'host', message: 'Modbus TCP 主机地址不能为空' });
  } else if (!isValidHost(config.host)) {
    errors.push({ field: 'host', message: `无效的主机地址: ${config.host}` });
  }
  if (config.port !== undefined && config.port !== null) {
    if (config.port < 1 || config.port > 65535) {
      errors.push({ field: 'port', message: '端口号必须在 1-65535 之间' });
    }
  }
  if (config.unitId !== undefined && config.unitId !== null) {
    if (config.unitId < 0 || config.unitId > 255) {
      errors.push({ field: 'unitId', message: 'unitId 必须在 0-255 之间' });
    }
  }
}

function validateModbusRtu(config: ModbusRtuChannel, errors: ValidationError[]): void {
  if (!config.serialPort || config.serialPort.trim() === '') {
    errors.push({ field: 'serialPort', message: 'Modbus RTU 串口号不能为空' });
  }
  if (!config.baudRate) {
    errors.push({ field: 'baudRate', message: '波特率不能为空' });
  } else if (![9600, 19200, 38400, 57600, 115200].includes(config.baudRate)) {
    errors.push({
      field: 'baudRate',
      message: '波特率不支持，支持: 9600/19200/38400/57600/115200',
    });
  }
}

function validateOpcUa(config: OpcUaChannel, errors: ValidationError[]): void {
  if (!config.endpoint || config.endpoint.trim() === '') {
    errors.push({ field: 'endpoint', message: 'OPC UA 端点地址不能为空' });
  } else if (!config.endpoint.startsWith('opc.tcp://')) {
    errors.push({ field: 'endpoint', message: 'OPC UA 端点必须以 opc.tcp:// 开头' });
  }
}

function validateMqtt(config: MqttChannel, errors: ValidationError[]): void {
  if (!config.brokerUrl || config.brokerUrl.trim() === '') {
    errors.push({ field: 'brokerUrl', message: 'MQTT Broker 地址不能为空' });
  } else if (!/^(mqtt|mqtts|tcp|ssl|ws|wss):\/\//.test(config.brokerUrl)) {
    errors.push({
      field: 'brokerUrl',
      message: 'MQTT Broker 地址必须以 mqtt://、mqtts://、tcp://、ssl://、ws:// 或 wss:// 开头',
    });
  }
  if (!config.clientId || config.clientId.trim() === '') {
    errors.push({ field: 'clientId', message: 'MQTT Client ID 不能为空' });
  }
}

function validateSiemensS7(config: SiemensS7Channel, errors: ValidationError[]): void {
  if (!config.host || config.host.trim() === '') {
    errors.push({ field: 'host', message: 'Siemens S7 主机地址不能为空' });
  } else if (!isValidHost(config.host)) {
    errors.push({ field: 'host', message: `无效的主机地址: ${config.host}` });
  }
  if (config.rack !== undefined && config.rack !== null) {
    if (config.rack < 0 || config.rack > 31) {
      errors.push({ field: 'rack', message: '机架号必须在 0-31 之间' });
    }
  }
  if (config.slot !== undefined && config.slot !== null) {
    if (config.slot < 0 || config.slot > 31) {
      errors.push({ field: 'slot', message: '槽位号必须在 0-31 之间' });
    }
  }
}

/** 简单的主机地址校验（IP 或 域名） */
function isValidHost(host: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostnameRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return ipRegex.test(host) || hostnameRegex.test(host) || host === 'localhost';
}
