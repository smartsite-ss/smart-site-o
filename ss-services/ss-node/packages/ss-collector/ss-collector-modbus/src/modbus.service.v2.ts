// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
const ModbusRTU = require('modbus-serial').ModbusRTU || require('modbus-serial').default;
import {
  BaseCollectorService,
  CollectorPlugin,
  ConfigValidator,
  PluginCategory,
  ValueTransformUtil,
  type CollectorReadResult,
  type IDeviceContext,
  type ITagContext,
  type ChannelValidationResult,
} from '@ss-node/ss-collector-sdk';

export interface ModbusConfig {
  host: string;
  port: number;
  unitId?: number;
  timeout?: number;
  reconnectInterval?: number;
}

@Injectable()
@CollectorPlugin({
  protocol: 'modbus_tcp',
  displayName: 'Modbus TCP',
  version: '0.1.0',
  description:
    'Modbus TCP/IP 协议采集插件，支持线圈、离散输入、保持寄存器、输入寄存器四大类寄存器读写',
  category: PluginCategory.INDUSTRIAL_BUS,
  transport: 'tcp',
  connectionSchema: {
    type: 'object',
    required: ['host', 'port'],
    properties: {
      host: { type: 'string', title: '设备IP地址', default: '127.0.0.1' },
      port: { type: 'number', title: '端口号', default: 502 },
      unitId: { type: 'number', title: '从站地址', default: 1 },
      timeout: { type: 'number', title: '请求超时(ms)', default: 3000 },
      minRequestInterval: { type: 'number', title: '最小请求间隔(ms)', default: 50 },
    },
  },
  defaultConnection: {
    host: '127.0.0.1',
    port: 502,
    unitId: 1,
    timeout: 3000,
    minRequestInterval: 50,
  },
  supportedDataTypes: ['uint16', 'int16', 'uint32', 'int32', 'float32', 'bool', 'string'],
  enabledByDefault: true,
  tags: ['modbus', 'tcp', 'industrial', 'plc'],
})
export class ModbusService extends BaseCollectorService {
  async connect(device: IDeviceContext): Promise<any> {
    const { deviceId, alreadyConnected } = this.preConnect(device, 'modbus');

    const config: ModbusConfig = {
      host: device.connection.host || '127.0.0.1',
      port: device.connection.port || 502,
      unitId: device.connection.unitId || 1,
      timeout: device.connection.timeout || 5000,
      reconnectInterval: device.connection.reconnectInterval || 30000,
    };

    if (alreadyConnected) {
      // 检查底层客户端是否仍然打开，若已断开则继续重新连接
      const entries = this.getClientEntries();
      const entry = entries.get(deviceId);
      if (entry?.client?.isOpen) {
        return { type: 'modbus', deviceId, config };
      }
      // 客户端已断开，继续重新连接
    }

    this.logger.log(
      `Connecting to Modbus TCP://${config.host}:${config.port} (Unit ID: ${config.unitId})`,
    );

    const client = new ModbusRTU() as any;

    await new Promise<void>((resolve, reject) => {
      client.connectTCP(config.host, { port: config.port }, (err: Error) => {
        if (err) {
          reject(new Error(`Modbus connect failed: ${err.message}`));
          return;
        }
        resolve();
      });

      setTimeout(() => reject(new Error('Connection timeout')), config.timeout);
    });

    client.setID(config.unitId);
    client.setTimeout(config.timeout);

    this.postConnect(deviceId, client);

    return { type: 'modbus', deviceId, config };
  }

  protected async doReadTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    const address = parseInt(tag.address, 10);

    if (isNaN(address)) {
      throw new Error(`Invalid address for tag ${tagId}: ${tag.address}`);
    }

    const dataType = (tag.dataType || 'holding').toLowerCase();
    const result: CollectorReadResult = {
      tagId,
      value: null,
      rawValue: null,
      timestamp: new Date(),
      quality: 'good',
    };

    let data: any;

    switch (dataType) {
      case 'holding':
        data = await this.readHoldingRegisters(client, address, 1);
        result.rawValue = data.data[0];
        result.value = ValueTransformUtil.applyFromConfig(result.rawValue, tag);
        break;

      case 'input':
        data = await this.readInputRegisters(client, address, 1);
        result.rawValue = data.data[0];
        result.value = ValueTransformUtil.applyFromConfig(result.rawValue, tag);
        break;

      case 'coil':
        data = await this.readCoils(client, address, 1);
        result.rawValue = data.data[0] ? 1 : 0;
        result.value = Boolean(data.data[0]);
        break;

      case 'discrete':
        data = await this.readDiscreteInputs(client, address, 1);
        result.rawValue = data.data[0] ? 1 : 0;
        result.value = Boolean(data.data[0]);
        break;

      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    return result;
  }

  /** 覆写 readTag：添加错误捕获，返回 bad quality 而非抛出。
   *  注意：验证类错误（无效地址、不支持的数据类型）应当抛出，
   *  仅通信类错误才返回 bad quality 结果。 */
  async readTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    try {
      return await this.doReadTag(client, tag);
    } catch (error) {
      const msg = (error as Error).message;
      // 验证错误（无效地址）应当抛出，不应吞掉
      if (msg.startsWith('Invalid address')) {
        throw error;
      }
      this.logger.warn(`Failed to read tag ${tagId}: ${msg}`);
      return {
        tagId,
        value: null,
        rawValue: null,
        timestamp: new Date(),
        quality: 'bad',
        error: msg,
      };
    }
  }

  protected async doWriteTag(client: any, tag: ITagContext, value: any): Promise<void> {
    const tagId = tag.id || 'unknown-tag';
    const address = parseInt(tag.address, 10);

    if (isNaN(address)) {
      throw new Error(`Invalid address for tag ${tagId}: ${tag.address}`);
    }

    const dataType = (tag.dataType || 'holding').toLowerCase();

    switch (dataType) {
      case 'holding': {
        const writeValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
        await this.writeHoldingRegister(client, address, writeValue);
        this.logger.debug(`Wrote holding register ${tagId} @ ${address}: ${writeValue}`);
        break;
      }

      case 'coil':
        await this.writeCoil(client, address, Boolean(value));
        this.logger.debug(`Wrote coil ${tagId} @ ${address}: ${value}`);
        break;

      default:
        throw new Error(`Cannot write to data type: ${dataType}`);
    }
  }

  protected async doDisconnect(client: any): Promise<void> {
    if (!client?.isOpen) return;
    await new Promise<void>((resolve, reject) => {
      client.close((err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async validateChannelConfig(config: Record<string, any>): Promise<ChannelValidationResult> {
    const errors: { field: string; message: string }[] = [];
    const hostError = ConfigValidator.validateHost(config.host, 'host', '设备IP地址');
    if (hostError) errors.push(hostError);
    const portError = ConfigValidator.validatePort(config.port, 'port', '端口号');
    if (portError) errors.push(portError);
    const unitIdError = ConfigValidator.validateRange(config.unitId, 0, 255, 'unitId', '从站地址');
    if (unitIdError) errors.push(unitIdError);
    return { valid: errors.length === 0, errors };
  }

  async readBatch(
    client: any,
    tags: Array<{ id: string; address: string; dataType?: string }>,
  ): Promise<CollectorReadResult[]> {
    if (!tags || tags.length === 0) return [];

    const results: CollectorReadResult[] = [];

    try {
      const sortedTags = [...tags]
        .map((t) => ({ ...t, addressNum: parseInt(t.address, 10) }))
        .filter((t) => !isNaN(t.addressNum))
        .sort((a, b) => a.addressNum - b.addressNum);

      let i = 0;
      while (i < sortedTags.length) {
        const batch: typeof sortedTags = [];
        const startAddress = sortedTags[i].addressNum;

        while (
          batch.length < 64 &&
          i + batch.length < sortedTags.length &&
          sortedTags[i + batch.length].addressNum === startAddress + batch.length
        ) {
          batch.push(sortedTags[i + batch.length]);
        }

        const dataType = batch[0].dataType || 'holding';
        let data: any;

        switch (dataType) {
          case 'holding':
            data = await this.readHoldingRegisters(client, startAddress, batch.length);
            break;
          case 'input':
            data = await this.readInputRegisters(client, startAddress, batch.length);
            break;
          default:
            throw new Error(`Unsupported data type for batch read: ${dataType}`);
        }

        batch.forEach((tag, idx) => {
          const rawValue = data.data[idx];
          results.push({
            tagId: tag.id,
            value: ValueTransformUtil.applyFromConfig(rawValue, tag),
            rawValue,
            timestamp: new Date(),
            quality: 'good',
          });
        });

        i += batch.length;
      }
    } catch (error) {
      this.logger.error(
        `Batch read failed: ${(error as Error).message}, falling back to individual reads`,
      );

      for (const tag of tags) {
        try {
          const result = await this.readTag(client, tag as any);
          results.push(result);
        } catch (singleError) {
          results.push({
            tagId: tag.id,
            value: null,
            rawValue: null,
            timestamp: new Date(),
            quality: 'bad',
            error: (singleError as Error).message,
          });
        }
      }
    }

    return results;
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

  private readHoldingRegisters(client: any, address: number, length: number): Promise<any> {
    return new Promise((resolve, reject) => {
      client.readHoldingRegisters(address, length, (err: Error, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private readInputRegisters(client: any, address: number, length: number): Promise<any> {
    return new Promise((resolve, reject) => {
      client.readInputRegisters(address, length, (err: Error, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private readCoils(client: any, address: number, length: number): Promise<any> {
    return new Promise((resolve, reject) => {
      client.readCoils(address, length, (err: Error, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private readDiscreteInputs(client: any, address: number, length: number): Promise<any> {
    return new Promise((resolve, reject) => {
      client.readDiscreteInputs(address, length, (err: Error, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private writeHoldingRegister(client: any, address: number, value: number): Promise<void> {
    return new Promise((resolve, reject) => {
      client.writeRegister(address, value, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private writeCoil(client: any, address: number, value: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      client.writeCoil(address, value, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
