// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeviceType } from '@ss-node/ss-sdk';

/** 设备通道配置 — 一个设备仅一个通道 */
export type DeviceChannelConfig =
  | ModbusTcpChannel
  | ModbusRtuChannel
  | OpcUaChannel
  | MqttChannel
  | SiemensS7Channel
  | VirtualChannel;

/** 支持的协议类型（与 DeviceType 枚举对齐） */
export type ChannelProtocol = DeviceType;

/** Modbus TCP 通道 */
export interface ModbusTcpChannel {
  protocol: 'modbus_tcp';
  host: string;
  port?: number; // 默认 502
  unitId?: number; // 默认 1
  timeout?: number; // 默认 5000ms
  retryInterval?: number; // 默认 3000ms
  maxRetries?: number; // 默认 3
  reversedBits?: boolean; // 默认 false
  reversedWords?: boolean; // 默认 false
}

/** Modbus RTU 通道 */
export interface ModbusRtuChannel {
  protocol: 'modbus_rtu';
  serialPort: string;
  baudRate: number; // 9600/19200/38400/115200
  dataBits?: 7 | 8; // 默认 8
  parity?: 'none' | 'even' | 'odd'; // 默认 even
  stopBits?: 1 | 2; // 默认 1
  timeout?: number; // 默认 5000ms
  unitId?: number; // 默认 1
}

/** OPC UA 通道 */
export interface OpcUaChannel {
  protocol: 'opc_ua';
  endpoint: string; // opc.tcp://192.168.1.1:4840
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  authentication?: {
    type: 'anonymous' | 'username' | 'certificate';
    username?: string;
    password?: string;
    certificatePath?: string;
    privateKeyPath?: string;
  };
  sessionTimeout?: number; // 默认 60000ms
  autoReconnect?: boolean; // 默认 true
  namespaceIndex?: number;
}

/** MQTT 通道 */
export interface MqttChannel {
  protocol: 'mqtt';
  brokerUrl: string; // mqtt://broker.example.com:1883
  clientId: string;
  cleanSession?: boolean; // 默认 true
  qos?: 0 | 1 | 2; // 默认 1
  keepAlive?: number; // 默认 60s
  authentication?: {
    username?: string;
    password?: string;
  };
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
    rejectUnauthorized: boolean;
  };
  will?: {
    topic: string;
    payload: string;
    qos: 0 | 1 | 2;
    retain: boolean;
  };
  topics?: string[]; // 订阅主题列表
}

/** Siemens S7 通道 */
export interface SiemensS7Channel {
  protocol: 'siemens_s7';
  host: string; // PLC IP地址
  port?: number; // 默认 102
  rack?: number; // 默认 0
  slot?: number; // 默认 1 (S7-300: 2, S7-1200/1500: 1)
  timeout?: number; // 默认 5000ms
  putGetEnabled?: boolean; // PUT/GET 权限, 默认 true
  optimizeBlockAccess?: boolean; // 优化块访问, S7-1200/1500 需设置为 false
}

/** 虚拟设备通道（模拟数据） */
export interface VirtualChannel {
  protocol: 'virtual';
  /** 数据生成间隔 (ms)，默认 1000 */
  interval?: number;
  /** 模拟策略 */
  strategy?: 'sine' | 'random' | 'constant';
}
