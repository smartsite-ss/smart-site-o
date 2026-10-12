// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// packages/core/src/__tests__/mocks/data-source.mock.ts

export enum QualityCode {
  GOOD = 0,
  UNCERTAIN = 1,
  BAD = 2,
  STALE = 3,
  DISCONNECTED = 4
}

export interface TagValue {
  value: any;
  quality: QualityCode;
  timestamp: number;
}

export interface DataSourceConfig {
  type: string;
  config: any;
}

export class MockDataSourceManager {
  private sources: Map<string, MockDataSource> = new Map();
  private subscriptions: Map<string, Set<(v: TagValue) => void>> = new Map();

  createSource(config: DataSourceConfig): string {
    const id = `ds-${Date.now()}`;
    this.sources.set(id, new MockDataSource(config));
    return id;
  }

  /** 模拟数据源推送值 */
  simulateTagValue(tagPath: string, value: TagValue): void {
    const callbacks = this.subscriptions.get(tagPath);
    if (callbacks) {
      callbacks.forEach((cb) => cb(value));
    }
  }

  subscribe(tagPath: string, callback: (v: TagValue) => void): () => void {
    if (!this.subscriptions.has(tagPath)) {
      this.subscriptions.set(tagPath, new Set());
    }
    this.subscriptions.get(tagPath)!.add(callback);
    return () => this.subscriptions.get(tagPath)?.delete(callback);
  }

  getTagValue(_tagPath: string): TagValue | null {
    return {
      value: Math.random() * 100,
      quality: QualityCode.GOOD,
      timestamp: Date.now(),
    };
  }
}

class MockDataSource {
  constructor(_config: DataSourceConfig) {}
}

// Mock WebSocket Server
export class MockWebSocketServer {
  private clients: Set<(msg: any) => void> = new Set();

  connect(): {
    send: (msg: any) => void;
    onMessage: (cb: (msg: any) => void) => void;
  } {
    return {
      send: (msg) => this.broadcast(msg),
      onMessage: (cb) => this.clients.add(cb),
    };
  }

  broadcast(msg: any): void {
    this.clients.forEach((cb) => cb(msg));
  }

  disconnect(): void {
    this.clients.clear();
  }
}

// Mock OPC-UA Server
export class MockOpcuaServer {
  private addressSpace: Map<string, { value: any; type: string }> = new Map();

  addVariable(nodeId: string, initialValue: any, type: string): void {
    this.addressSpace.set(nodeId, { value: initialValue, type });
  }

  readValue(nodeId: string): any {
    return this.addressSpace.get(nodeId)?.value;
  }

  writeValue(nodeId: string, value: any): void {
    const node = this.addressSpace.get(nodeId);
    if (node) node.value = value;
  }

  simulateValueChange(nodeId: string, newValue: any): void {
    const node = this.addressSpace.get(nodeId);
    if (node) node.value = newValue;
  }
}

// Mock Modbus Slave
export class MockModbusSlave {
  private coils: boolean[] = new Array(10000).fill(false);
  private holdingRegisters: number[] = new Array(10000).fill(0);
  private inputRegisters: number[] = new Array(10000).fill(0);

  setCoil(address: number, value: boolean): void {
    this.coils[address] = value;
  }
  getCoil(address: number): boolean {
    return this.coils[address];
  }
  setHoldingRegister(address: number, value: number): void {
    this.holdingRegisters[address] = value;
  }
  getHoldingRegister(address: number): number {
    return this.holdingRegisters[address];
  }
  getInputRegister(address: number): number {
    return this.inputRegisters[address];
  }
}

// Mock Alarm Manager
export class MockAlarmManager {
  private alarms: any[] = [];
  private configurations: any[] = [];

  configure(config: any): void {
    this.configurations.push(config);
  }

  getActiveAlarms(): any[] {
    return this.alarms;
  }
}
