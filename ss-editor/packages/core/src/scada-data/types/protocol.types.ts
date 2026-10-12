// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type ProtocolType = 'modbus' | 'opc-ua' | 'opc-da' | 'mqtt' | 'bacnet' | 'iec104';

export interface IProtocolAdapter {
  connect(config: ProtocolConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  read(address: string): Promise<unknown>;
  write(address: string, value: unknown): Promise<void>;
  subscribe(addresses: string[]): void;
  getStatus(): ProtocolStatus;
  onData(callback: (packet: ProtocolDataPacket) => void): void;
}

export interface ProtocolConnectionConfig {
  host: string;
  port: number;
  timeout: number;
  retryCount: number;
  auth?: { username: string; password: string };
}

export interface ProtocolDataPoint {
  address: string;
  dataType: string;
  scale?: number;
  offset?: number;
}

export type ProtocolStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ProtocolDataPacket {
  timestamp: number;
  points: Array<{ address: string; value: unknown; quality: string }>;
}