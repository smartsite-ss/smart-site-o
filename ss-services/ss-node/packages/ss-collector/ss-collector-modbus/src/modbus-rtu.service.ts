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
  type ITagContext,
  type ChannelValidationResult,
} from '@ss-node/ss-collector-sdk';

export interface ModbusRTUConfig {
  serialPort: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
  stopBits?: 1 | 2;
  unitId?: number;
  timeout?: number;
  rtuMode?: 'rtu' | 'ascii';
}

@Injectable()
@CollectorPlugin({
  protocol: 'modbus_rtu',
  displayName: 'Modbus RTU',
  version: '0.1.0',
  description: 'Modbus RTU 串行协议采集插件，支持 RS-232/RS-485 串口通信',
  category: PluginCategory.INDUSTRIAL_BUS,
  transport: 'serial',
  connectionSchema: {
    type: 'object',
    required: ['serialPort', 'baudRate'],
    properties: {
      serialPort: { type: 'string', title: '串口号', default: 'COM1' },
      baudRate: {
        type: 'number',
        title: '波特率',
        default: 9600,
        enum: [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200],
      },
      dataBits: { type: 'number', title: '数据位', default: 8, enum: [7, 8] },
      parity: { type: 'string', title: '校验位', default: 'even', enum: ['none', 'even', 'odd'] },
      stopBits: { type: 'number', title: '停止位', default: 1, enum: [1, 2] },
      unitId: { type: 'number', title: '从站地址', default: 1 },
      timeout: { type: 'number', title: '请求超时(ms)', default: 3000 },
    },
  },
  defaultConnection: {
    serialPort: 'COM1',
    baudRate: 9600,
    dataBits: 8,
    parity: 'even',
    stopBits: 1,
    unitId: 1,
    timeout: 3000,
  },
  supportedDataTypes: ['uint16', 'int16', 'uint32', 'int32', 'float32', 'bool', 'string'],
  enabledByDefault: false,
  tags: ['modbus', 'rtu', 'serial', 'rs485', 'rs232', 'plc'],
})
export class ModbusRTUService extends BaseCollectorService {
  async connect(device: any): Promise<any> {
    const deviceId = device.id || `modbus-rtu-${Date.now()}`;
    const config: ModbusRTUConfig = {
      serialPort: device.connection.serialPort || device.connection.host || 'COM1',
      baudRate: device.connection.baudRate || 9600,
      dataBits: device.connection.dataBits || 8,
      parity: device.connection.parity || 'none',
      stopBits: device.connection.stopBits || 1,
      unitId: device.connection.unitId || 1,
      timeout: device.connection.timeout || 5000,
      rtuMode: device.connection.rtuMode || 'rtu',
    };

    if (this.getConnectionStatus(deviceId)) {
      this.logger.log(`RTU device ${deviceId} already connected`);
      return { type: 'modbus-rtu', deviceId, config };
    }

    this.logger.log(
      `Connecting Modbus RTU ${config.serialPort} (${config.baudRate}bps, Unit: ${config.unitId})`,
    );

    const client = new ModbusRTU() as any;

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('RTU connection timeout')),
        config.timeout,
      );

      client.connectRTUBuffered(
        config.serialPort,
        {
          baudRate: config.baudRate,
          dataBits: config.dataBits,
          parity: config.parity,
          stopBits: config.stopBits,
        },
        (err: Error) => {
          clearTimeout(timeoutId);
          if (err) reject(new Error(`Modbus RTU connect failed: ${err.message}`));
          else resolve();
        },
      );
    });

    client.setID(config.unitId);
    client.setTimeout(config.timeout);

    this.trackClient(deviceId, client);

    this.logger.log(`Successfully connected RTU device ${deviceId}`);
    return { type: 'modbus-rtu', deviceId, config };
  }

  protected async doReadTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    const address = parseInt(tag.address, 10);

    if (isNaN(address)) {
      throw new Error(`Invalid address for tag ${tagId}: ${tag.address}`);
    }

    const functionCode = tag.functionCode || tag.dataType || 'holding';
    const result: CollectorReadResult = {
      tagId,
      value: null,
      rawValue: null,
      timestamp: new Date(),
      quality: 'good',
    };

    let data: any;

    switch (functionCode) {
      case 'holding':
      case '3':
        data = await this.readHoldingRegisters(client, address, 1);
        result.rawValue = data.data[0];
        result.value = ValueTransformUtil.applyFromConfig(result.rawValue, tag);
        break;

      case 'input':
      case '4':
        data = await this.readInputRegisters(client, address, 1);
        result.rawValue = data.data[0];
        result.value = ValueTransformUtil.applyFromConfig(result.rawValue, tag);
        break;

      case 'coil':
      case '1':
        data = await this.readCoils(client, address, 1);
        result.rawValue = data.data[0] ? 1 : 0;
        result.value = Boolean(data.data[0]);
        break;

      case 'discrete':
      case '2':
        data = await this.readDiscreteInputs(client, address, 1);
        result.rawValue = data.data[0] ? 1 : 0;
        result.value = Boolean(data.data[0]);
        break;

      default:
        throw new Error(`Unsupported function code: ${functionCode}`);
    }

    return result;
  }

  /** 覆写 readTag：添加错误捕获，返回 bad quality 而非抛出 */
  async readTag(client: any, tag: ITagContext): Promise<CollectorReadResult> {
    const tagId = tag.id || 'unknown-tag';
    try {
      return await this.doReadTag(client, tag);
    } catch (error) {
      this.logger.warn(`RTU read failed for tag ${tagId}: ${(error as Error).message}`);
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
    const address = parseInt(tag.address, 10);

    if (isNaN(address)) {
      throw new Error(`Invalid address for tag ${tagId}: ${tag.address}`);
    }

    const functionCode = tag.functionCode || 'holding';

    switch (functionCode) {
      case 'holding':
      case '3': {
        const writeValue = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
        await this.writeHoldingRegister(client, address, writeValue);
        this.logger.debug(`RTU wrote holding register ${tagId} @ ${address}: ${writeValue}`);
        break;
      }

      case 'coil':
      case '1':
        await this.writeCoil(client, address, Boolean(value));
        this.logger.debug(`RTU wrote coil ${tagId} @ ${address}: ${value}`);
        break;

      default:
        throw new Error(`Cannot write to function code: ${functionCode}`);
    }
  }

  protected async doDisconnect(client: any): Promise<void> {
    if (!client?.port?.isOpen) return;
    await new Promise<void>((resolve) => client.close(resolve));
  }

  async validateChannelConfig(config: Record<string, any>): Promise<ChannelValidationResult> {
    const errors: { field: string; message: string }[] = [];
    if (!config.serialPort) {
      errors.push({ field: 'serialPort', message: '串口号不能为空' });
    }
    const baudRateError = ConfigValidator.validateEnum(
      config.baudRate,
      [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200],
      'baudRate',
      '波特率',
    );
    if (baudRateError) errors.push(baudRateError);
    const dataBitsError = ConfigValidator.validateEnum(
      config.dataBits,
      [7, 8],
      'dataBits',
      '数据位',
    );
    if (dataBitsError) errors.push(dataBitsError);
    const parityError = ConfigValidator.validateEnum(
      config.parity,
      ['none', 'even', 'odd'],
      'parity',
      '校验位',
    );
    if (parityError) errors.push(parityError);
    const stopBitsError = ConfigValidator.validateEnum(
      config.stopBits,
      [1, 2],
      'stopBits',
      '停止位',
    );
    if (stopBitsError) errors.push(stopBitsError);
    const unitIdError = ConfigValidator.validateRange(config.unitId, 0, 255, 'unitId', '从站地址');
    if (unitIdError) errors.push(unitIdError);
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
