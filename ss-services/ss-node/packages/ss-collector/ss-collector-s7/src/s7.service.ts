// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import {
  BaseCollectorService,
  CollectorPlugin,
  ConfigValidator,
  PluginCategory,
  ValueTransformUtil,
  type CollectorReadResult,
  type ITagContext,
  type ChannelValidationResult,
} from '@ss-node/ss-collector-sdk';

export interface S7Config {
  host: string;
  rack?: number;
  slot?: number;
  port?: number;
  timeout?: number;
  localTSAP?: number;
  remoteTSAP?: number;
}

/**
 * Siemens S7 Protocol Adapter (ISO-on-TCP / RFC1006)
 *
 * 支持 S7-300/S7-400/S7-1200/S7-1500 系列 PLC
 *
 * 使用 Socket 级别的 ISO-on-TCP 协议通信，
 * 可替换为 node-snap7 等原生库以获得更高性能。
 */
@Injectable()
@CollectorPlugin({
  protocol: 'siemens_s7',
  displayName: 'Siemens S7',
  version: '0.1.0',
  description: 'Siemens S7 协议采集插件，支持 S7-300/400/1200/1500 系列 PLC',
  category: PluginCategory.INDUSTRIAL_BUS,
  transport: 'tcp',
  connectionSchema: {
    type: 'object',
    required: ['host'],
    properties: {
      host: { type: 'string', title: 'PLC IP地址', default: '192.168.0.1' },
      rack: { type: 'number', title: '机架号', default: 0 },
      slot: { type: 'number', title: '槽位号', default: 1 },
      port: { type: 'number', title: '端口号', default: 102 },
    },
  },
  defaultConnection: { host: '192.168.0.1', rack: 0, slot: 1, port: 102 },
  supportedDataTypes: ['bool', 'byte', 'word', 'dword', 'int', 'dint', 'real', 'string'],
  enabledByDefault: false,
  tags: ['siemens', 's7', 'plc', 'industrial'],
})
export class S7Service extends BaseCollectorService {
  /** 优化块读取：相邻标签间允许的最大间隔（字节），超过则拆分为新批次 */
  private readonly OPTIMIZE_READ_GAP_THRESHOLD = 8;
  /** 优化块读取：单次读取的最大字节数（S7-1200/1500 PDU 上限约 8192，保守取 512） */
  private readonly OPTIMIZE_READ_MAX_BATCH_BYTES = 512;

  async connect(device: any): Promise<any> {
    const { deviceId, alreadyConnected } = this.preConnect(device as any, 's7');

    const config: S7Config = {
      host: device.connection.host || '192.168.0.1',
      rack: device.connection.rack ?? 0,
      slot:
        device.connection.slot ??
        (device.connection.cpuType === 'S7-1200' || device.connection.cpuType === 'S7-1500'
          ? 1
          : 2),
      port: device.connection.port || 102,
      timeout: device.connection.timeout || 10000,
      localTSAP: device.connection.localTSAP ?? 0x0100,
      remoteTSAP: device.connection.remoteTSAP ?? 0x0100,
    };

    if (alreadyConnected) {
      return { type: 's7', deviceId, config };
    }

    this.logger.log(
      `Connecting to S7 PLC: ${config.host}:${config.port} (Rack ${config.rack}, Slot ${config.slot})`,
    );

    const client = this.createS7Client(config);
    await client.connect();

    this.postConnect(deviceId, client);

    this.logger.log(`Successfully connected S7 device ${deviceId}`);
    return { type: 's7', deviceId, config };
  }

  protected async doReadTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    const result: CollectorReadResult = {
      tagId,
      value: null,
      rawValue: null,
      timestamp: new Date(),
      quality: 'good',
    };

    const area = this.mapArea(tag.area || tag.dataType || 'DB');
    const dbNumber = tag.dbNumber ?? 1;
    const byteOffset = tag.byteOffset ?? (parseInt(tag.address, 10) || 0);
    const bitOffset = tag.bitOffset;
    const dataType = (tag.s7DataType || 'REAL').toUpperCase();
    const length = this.getTypeLength(dataType);

    if (bitOffset !== undefined) {
      const byteData = await client.readArea(area, dbNumber, byteOffset, 1, 0x02);
      result.rawValue = byteData;
      result.value = Boolean((byteData[0] >> bitOffset) & 1);
    } else {
      const data = await client.readArea(area, dbNumber, byteOffset, length, 0x02);
      result.rawValue = data;

      switch (dataType) {
        case 'BOOL':
          result.value = data[0] !== 0;
          break;
        case 'BYTE':
        case 'WORD':
        case 'DWORD':
          result.value = this.bufferToUInt(data, dataType);
          break;
        case 'INT':
          result.value = data.readInt16BE();
          break;
        case 'DINT':
          result.value = data.readInt32BE();
          break;
        case 'REAL':
          result.value = parseFloat(data.readFloatBE().toFixed(4));
          break;
        case 'STRING':
          result.value = this.bufferToString(data);
          break;
        default:
          result.value = data.readFloatBE();
      }

      if (tag.transform) {
        result.value = ValueTransformUtil.apply(result.value as number, tag.transform);
      }
    }

    return result;
  }

  /** 覆写 readTag：添加错误捕获，返回 bad quality 而非抛出 */
  async readTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    try {
      return await this.doReadTag(client, tag);
    } catch (error) {
      this.logger.warn(`S7 read failed for tag ${tagId}: ${(error as Error).message}`);
      return {
        tagId,
        value: null,
        rawValue: null,
        timestamp: new Date(),
        quality: 'bad',
        error: (error as Error).message,
      };
    }
  }

  protected async doWriteTag(client: any, tag: ITagContext, value: any): Promise<void> {
    const tagId = tag.id || 'unknown-tag';

    const area = this.mapArea(tag.area || 'DB');
    const dbNumber = tag.dbNumber ?? 1;
    const byteOffset = tag.byteOffset ?? (parseInt(tag.address, 10) || 0);
    const dataType = (tag.s7DataType || 'REAL').toUpperCase();

    let buffer: Buffer;

    switch (dataType) {
      case 'BOOL':
        buffer = Buffer.alloc(1);
        buffer[0] = value ? 1 : 0;
        break;
      case 'INT':
        buffer = Buffer.alloc(2);
        buffer.writeInt16BE(Number(value));
        break;
      case 'DINT':
        buffer = Buffer.alloc(4);
        buffer.writeInt32BE(Number(value));
        break;
      case 'REAL':
        buffer = Buffer.alloc(4);
        buffer.writeFloatBE(Number(value));
        break;
      default:
        buffer = Buffer.alloc(4);
        buffer.writeFloatBE(Number(value));
    }

    await client.writeArea(area, dbNumber, byteOffset, buffer, 0x02);
    this.logger.debug(`S7 wrote tag ${tagId}: ${value}`);
  }

  protected async doDisconnect(client: any): Promise<void> {
    if (client?.disconnect) {
      await client.disconnect();
    }
  }

  async validateChannelConfig(config: Record<string, any>): Promise<ChannelValidationResult> {
    const errors: { field: string; message: string }[] = [];
    const hostError = ConfigValidator.validateHost(config.host, 'host', 'PLC IP地址');
    if (hostError) errors.push(hostError);
    const rackError = ConfigValidator.validateRange(config.rack, 0, 31, 'rack', '机架号');
    if (rackError) errors.push(rackError);
    const slotError = ConfigValidator.validateRange(config.slot, 0, 31, 'slot', '槽位号');
    if (slotError) errors.push(slotError);
    return { valid: errors.length === 0, errors };
  }

  getAllConnectionStatus(): Map<string, boolean> {
    const result = new Map<string, boolean>();
    for (const [deviceId] of this.getClientEntries()) {
      result.set(deviceId, this.getConnectionStatus(deviceId));
    }
    return result;
  }

  isConnected(deviceId: string): boolean {
    return this.getConnectionStatus(deviceId);
  }

  /**
   * 优化块读取：将连续地址的标签分组，以便合并为更少的读取请求。
   */
  optimizeReads(tags: ITagContext[]): ITagContext[][] {
    const dbGroups = new Map<string, ITagContext[]>();
    const nonDbTags: ITagContext[] = [];

    for (const tag of tags) {
      const area = (tag.area || 'DB').toUpperCase();
      const areaCode = this.mapArea(area);

      if (areaCode !== 0x84) {
        nonDbTags.push(tag);
        continue;
      }

      const dbNumber = tag.dbNumber ?? 1;
      const key = `${areaCode}:${dbNumber}`;

      const group = dbGroups.get(key);
      if (group) {
        group.push(tag);
      } else {
        dbGroups.set(key, [tag]);
      }
    }

    const batches: ITagContext[][] = [];

    for (const tag of nonDbTags) {
      batches.push([tag]);
    }

    for (const group of dbGroups.values()) {
      const sorted = [...group].sort((a, b) => {
        const offsetA = this.resolveByteOffset(a);
        const offsetB = this.resolveByteOffset(b);
        return offsetA - offsetB;
      });

      let batch: ITagContext[] = [];
      let batchEnd = -1;
      let batchBytes = 0;

      for (const tag of sorted) {
        const byteOffset = this.resolveByteOffset(tag);
        const dataType = (tag.s7DataType || 'REAL').toUpperCase();
        const length = this.getTypeLength(dataType);
        const tagEnd = byteOffset + length;

        if (batch.length === 0) {
          batch = [tag];
          batchEnd = tagEnd;
          batchBytes = length;
        } else {
          const gap = byteOffset - batchEnd;

          if (
            gap >= 0 &&
            gap <= this.OPTIMIZE_READ_GAP_THRESHOLD &&
            batchBytes + gap + length <= this.OPTIMIZE_READ_MAX_BATCH_BYTES
          ) {
            batch.push(tag);
            batchEnd = Math.max(batchEnd, tagEnd);
            batchBytes += gap + length;
          } else {
            batches.push(batch);
            batch = [tag];
            batchEnd = tagEnd;
            batchBytes = length;
          }
        }
      }

      if (batch.length > 0) {
        batches.push(batch);
      }
    }

    return batches;
  }

  private resolveByteOffset(tag: ITagContext): number {
    if (tag.byteOffset !== undefined) return tag.byteOffset;
    const parsed = parseInt(tag.address, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private createS7Client(config: S7Config): any {
    let S7Client: any;
    try {
      S7Client = require('nodes7');
    } catch {
      this.logger.warn('nodes7 library not found, using simulated S7 client');
      return this.createSimulatedClient(config);
    }

    const client = new S7Client({ silent: true });
    client.initiateConnection(
      {
        port: config.port,
        host: config.host,
        rack: config.rack,
        slot: config.slot,
        timeout: config.timeout,
      },
      (err: Error) => {
        if (err) throw err;
      },
    );
    return client;
  }

  private createSimulatedClient(config: S7Config): any {
    const values = new Map<string, Buffer>();

    return {
      connect: async () => {
        this.logger.log(`[SIM] S7 connected to ${config.host}`);
      },
      disconnect: async () => {
        this.logger.log('[SIM] S7 disconnected');
      },
      readArea: async (
        _area: number,
        _dbNumber: number,
        byteOffset: number,
        length: number,
        _transportCode: number,
      ) => {
        const key = `${_area}:${_dbNumber}:${byteOffset}:${length}`;
        if (!values.has(key)) {
          const buf = Buffer.alloc(length);
          buf.writeFloatBE(Math.random() * 100, 0);
          values.set(key, buf);
        }
        return values.get(key);
      },
      writeArea: async (
        _area: number,
        _dbNumber: number,
        byteOffset: number,
        buffer: Buffer,
        _transportCode: number,
      ) => {
        const key = `${_area}:${_dbNumber}:${byteOffset}:${buffer.length}`;
        values.set(key, buffer);
      },
    };
  }

  private mapArea(area: string): number {
    switch (area.toUpperCase()) {
      case 'PE':
        return 0x81;
      case 'PA':
        return 0x82;
      case 'MK':
        return 0x83;
      case 'DB':
        return 0x84;
      case 'CT':
        return 0x1c;
      case 'TM':
        return 0x1d;
      default:
        return 0x84;
    }
  }

  private getTypeLength(dataType: string): number {
    switch (dataType.toUpperCase()) {
      case 'BOOL':
      case 'BYTE':
        return 1;
      case 'INT':
      case 'WORD':
        return 2;
      case 'DINT':
      case 'DWORD':
      case 'REAL':
        return 4;
      case 'STRING':
        return 256;
      default:
        return 4;
    }
  }

  private bufferToUInt(data: Buffer, dataType: string): number {
    switch (dataType) {
      case 'BYTE':
        return data[0];
      case 'WORD':
        return data.readUInt16BE();
      case 'DWORD':
        return data.readUInt32BE();
      default:
        return data.readUInt16BE();
    }
  }

  private bufferToString(data: Buffer): string {
    let end = data.indexOf(0);
    if (end === -1) end = data.length;
    return data.slice(0, end).toString('ascii');
  }
}
