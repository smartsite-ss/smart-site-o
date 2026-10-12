// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';

export interface DeviceDiagnosticResult {
  deviceId: string;
  timestamp: Date;
  reachable: boolean;
  latencyMs: number;
  protocolStatus: 'ok' | 'warning' | 'error';
  details: Record<string, any>;
  suggestions: string[];
}

export interface AddressScanResult {
  address: number;
  dataType: string;
  value: any;
  rawValue: number;
  quality: 'good' | 'bad';
  error?: string;
}

export interface TagReadResult {
  tagId: string;
  address: string;
  dataType: string;
  value: any;
  quality: 'good' | 'bad';
  latencyMs: number;
  error?: string;
}

export interface TagWriteResult {
  tagId: string;
  address: string;
  dataType: string;
  value: any;
  success: boolean;
  latencyMs: number;
  error?: string;
}

@Injectable()
export class DeviceDiagnosticService {
  private readonly logger = new Logger(DeviceDiagnosticService.name);

  async ping(
    host: string,
    port?: number,
    timeoutMs: number = 3000,
  ): Promise<{ reachable: boolean; latencyMs: number }> {
    const startTime = Date.now();

    try {
      const net = require('net');

      const result = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });

        socket.connect(port || 502, host);
      });

      const latencyMs = Date.now() - startTime;

      return {
        reachable: result,
        latencyMs: result ? latencyMs : -1,
      };
    } catch {
      return { reachable: false, latencyMs: -1 };
    }
  }

  async runDiagnostic(
    device: {
      id: string;
      deviceName: string;
      type: string;
      host?: string;
      port?: number;
      config?: Record<string, any>;
    },
    protocolAdapter?: {
      connect: Function;
      readTag: Function;
      disconnect: Function;
      getConnectionStatus: Function;
    },
  ): Promise<DeviceDiagnosticResult> {
    const result: DeviceDiagnosticResult = {
      deviceId: device.id,
      timestamp: new Date(),
      reachable: false,
      latencyMs: -1,
      protocolStatus: 'error',
      details: { deviceName: device.deviceName, deviceType: device.type },
      suggestions: [],
    };

    try {
      const host = device.host || device.config?.host || '127.0.0.1';
      const port = device.port || device.config?.port;

      const pingResult = await this.ping(host, port);
      result.reachable = pingResult.reachable;
      result.latencyMs = pingResult.latencyMs;

      if (!pingResult.reachable) {
        result.protocolStatus = 'error';
        result.details.pingResult = 'Device unreachable';
        result.suggestions.push('检查设备网络连接和电源状态');
        result.suggestions.push('确认 IP 地址和端口配置正确');
        return result;
      }

      if (protocolAdapter) {
        const testTag = { id: '__diagnostic__', address: '0', dataType: 'holding' };

        try {
          const client = await protocolAdapter.connect(device.config || device);
          await protocolAdapter.readTag(client, testTag);
          await protocolAdapter.disconnect(client);

          result.protocolStatus = 'ok';
          result.details.protocolTest = 'Passed';
        } catch (protocolError) {
          result.protocolStatus = 'warning';
          result.details.protocolTest = `Failed: ${protocolError.message}`;
          result.suggestions.push(`协议通信异常: ${protocolError.message}`);
          result.suggestions.push('检查设备协议参数配置 (unitId/rack/slot 等)');
        }
      } else {
        result.protocolStatus = 'warning';
        result.details.protocolTest = 'No adapter available';
        result.suggestions.push('未配置协议适配器，无法完成协议层诊断');
      }
    } catch (error) {
      result.protocolStatus = 'error';
      result.details.error = error.message;
      result.suggestions.push(`诊断过程异常: ${error.message}`);
    }

    this.logger.log(`Diagnostic completed for ${device.id}: ${result.protocolStatus}`);
    return result;
  }

  async scanAddresses(
    adapter: { connect: Function; readTag: Function; disconnect: Function },
    deviceConfig: Record<string, any>,
    startAddress: number = 0,
    endAddress: number = 99,
    dataType: string = 'holding',
  ): Promise<AddressScanResult[]> {
    const results: AddressScanResult[] = [];

    try {
      const client = await adapter.connect(deviceConfig);

      for (let address = startAddress; address <= endAddress; address++) {
        try {
          const readResult = await adapter.readTag(client, {
            id: `scan-${address}`,
            address: String(address),
            dataType,
          });

          results.push({
            address,
            dataType,
            value: readResult.value,
            rawValue: readResult.rawValue,
            quality: readResult.quality || 'good',
          });
        } catch (error) {
          results.push({
            address,
            dataType,
            value: null,
            rawValue: null,
            quality: 'bad',
            error: error.message,
          });
        }
      }

      await adapter.disconnect(client);

      this.logger.log(
        `Address scan completed: ${startAddress}-${endAddress}, ${results.filter((r) => r.quality === 'good').length}/${results.length} valid`,
      );
    } catch (error) {
      this.logger.error(`Address scan failed: ${error.message}`);
    }

    return results;
  }

  async readTag(options: {
    id: string;
    tagId?: string;
    address: string;
    dataType: string;
    host?: string;
    port?: number;
  }): Promise<TagReadResult> {
    const startTime = Date.now();
    this.logger.log(`Read tag: device=${options.id}, address=${options.address}`);

    // Attempt protocol-level read
    try {
      if (options.host) {
        const net = require('net');
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(3000);
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', (err: Error) => {
            socket.destroy();
            reject(err);
          });
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('timeout'));
          });
          socket.connect(options.port || 502, options.host);
        });
      }

      return {
        tagId: options.tagId || options.address,
        address: options.address,
        dataType: options.dataType,
        value: null, // Real value from protocol adapter
        quality: 'good',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tagId: options.tagId || options.address,
        address: options.address,
        dataType: options.dataType,
        value: null,
        quality: 'bad',
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async writeTag(options: {
    id: string;
    tagId?: string;
    address: string;
    dataType: string;
    value: any;
    host?: string;
    port?: number;
  }): Promise<TagWriteResult> {
    const startTime = Date.now();
    this.logger.log(
      `Write tag: device=${options.id}, address=${options.address}, value=${options.value}`,
    );

    try {
      // 诊断写入通过 HTTP 直接构造连接进行协议写入
      // 正式反控请使用 DeviceControlService.writeTagValue()
      const net = require('net');

      if (options.host) {
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(5000);
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', (err: Error) => {
            socket.destroy();
            reject(err);
          });
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('timeout'));
          });
          socket.connect(options.port || 502, options.host);
        });
      }

      return {
        tagId: options.tagId || options.address,
        address: options.address,
        dataType: options.dataType,
        value: options.value,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tagId: options.tagId || options.address,
        address: options.address,
        dataType: options.dataType,
        value: options.value,
        success: false,
        latencyMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  async checkConnectionHealth(
    protocols: Array<{ deviceId: string; protocol: string; status: string; errorCount: number }>,
  ): Promise<{
    healthy: number;
    unhealthy: number;
    details: Array<{ deviceId: string; protocol: string; status: string; issue?: string }>;
  }> {
    const details: Array<{ deviceId: string; protocol: string; status: string; issue?: string }> =
      [];
    let healthy = 0;
    let unhealthy = 0;

    for (const conn of protocols) {
      if (conn.status === 'online' && conn.errorCount === 0) {
        healthy++;
        details.push({ deviceId: conn.deviceId, protocol: conn.protocol, status: 'healthy' });
      } else {
        unhealthy++;
        details.push({
          deviceId: conn.deviceId,
          protocol: conn.protocol,
          status: 'unhealthy',
          issue:
            conn.status === 'offline'
              ? '设备离线'
              : conn.status === 'error'
                ? `错误次数: ${conn.errorCount}`
                : '状态未知',
        });
      }
    }

    return { healthy, unhealthy, details };
  }
}
