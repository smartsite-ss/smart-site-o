// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { DeviceDiagnosticService } from '../device-diagnostic.service';

describe('DeviceDiagnosticService', () => {
  let service: DeviceDiagnosticService;

  // The setup.ts uses jest.useFakeTimers() globally. Tests that mock net.Socket
  // need real timers so setImmediate fires the connect/error/timeout callbacks.
  beforeEach(async () => {
    jest.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceDiagnosticService],
    }).compile();

    service = module.get<DeviceDiagnosticService>(DeviceDiagnosticService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useFakeTimers();
  });

  describe('TC-DEV-040: ping reachable device', () => {
    it('should return reachable=true when TCP connection succeeds', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._connectCallback) this._connectCallback();
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'connect') {
            this._connectCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.ping('192.168.1.1', 502, 3000);

      expect(result.reachable).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TC-DEV-041: ping unreachable device', () => {
    it('should return reachable=false when connection fails', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._errorCallback) this._errorCallback(new Error('ECONNREFUSED'));
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'error') {
            this._errorCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.ping('192.168.1.254', 502, 1000);

      expect(result.reachable).toBe(false);
      expect(result.latencyMs).toBe(-1);
    });

    it('should return unreachable on timeout', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._timeoutCallback) this._timeoutCallback();
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'timeout') {
            this._timeoutCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.ping('10.0.0.1', 502, 500);

      expect(result.reachable).toBe(false);
      expect(result.latencyMs).toBe(-1);
    });
  });

  describe('TC-DEV-042: read tag value', () => {
    it('should read tag value successfully', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._connectCallback) this._connectCallback();
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'connect') {
            this._connectCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.readTag({
        id: 'dev-001',
        address: '40001',
        dataType: 'holding',
        host: '192.168.1.1',
        port: 502,
      });

      expect(result.address).toBe('40001');
      expect(result.dataType).toBe('holding');
      expect(result.quality).toBe('good');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return bad quality when connection fails', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._errorCallback) this._errorCallback(new Error('ECONNREFUSED'));
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'error') {
            this._errorCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.readTag({
        id: 'dev-001',
        address: '40001',
        dataType: 'holding',
        host: '10.0.0.99',
        port: 502,
      });

      expect(result.quality).toBe('bad');
      expect(result.error).toBeDefined();
    });
  });

  describe('TC-DEV-043: write tag value', () => {
    it('should write tag value successfully', async () => {
      const result = await service.writeTag({
        id: 'dev-001',
        tagId: 'tag-001',
        address: '40001',
        dataType: 'holding',
        value: 100,
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should use address as fallback tagId', async () => {
      const result = await service.writeTag({
        id: 'dev-001',
        address: '40002',
        dataType: 'coil',
        value: true,
      });

      expect(result.tagId).toBe('40002');
      expect(result.success).toBe(true);
    });
  });

  describe('TC-DEV-044: run full diagnostic', () => {
    it('should return diagnostic result when device is reachable', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._connectCallback) this._connectCallback();
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'connect') {
            this._connectCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.runDiagnostic({
        id: 'dev-001',
        deviceName: '温湿度001',
        type: 'modbus_tcp',
        host: '192.168.1.1',
        port: 502,
      });

      expect(result.deviceId).toBe('dev-001');
      expect(result.reachable).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details.deviceName).toBe('温湿度001');
      expect(result.details.deviceType).toBe('modbus_tcp');
    });

    it('should return unreachable diagnostic when device is not reachable', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._errorCallback) this._errorCallback(new Error('ENOTFOUND'));
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'error') {
            this._errorCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const result = await service.runDiagnostic({
        id: 'dev-002',
        deviceName: '离线设备',
        type: 'modbus_tcp',
        host: '192.168.99.99',
        port: 502,
      });

      expect(result.reachable).toBe(false);
      expect(result.latencyMs).toBe(-1);
      expect(result.protocolStatus).toBe('error');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain('检查设备网络连接和电源状态');
    });

    it('should test protocol layer when adapter is provided and ping succeeds', async () => {
      const net = require('net');
      const mockSocket = {
        setTimeout: jest.fn(),
        destroy: jest.fn(),
        connect: jest.fn().mockImplementation(function (this: any, _port: number, _host: string) {
          setImmediate(() => {
            if (this._connectCallback) this._connectCallback();
          });
        }),
        on: jest.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'connect') {
            this._connectCallback = cb;
          }
          return this;
        }),
      };

      jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket);

      const mockAdapter = {
        connect: jest.fn().mockResolvedValue({}),
        readTag: jest.fn().mockResolvedValue({ value: 25, quality: 'good' }),
        disconnect: jest.fn().mockResolvedValue(undefined),
        getConnectionStatus: jest.fn().mockReturnValue('connected'),
      };

      const result = await service.runDiagnostic(
        {
          id: 'dev-001',
          deviceName: '温湿度001',
          type: 'modbus_tcp',
          host: '192.168.1.1',
          port: 502,
        },
        mockAdapter,
      );

      expect(result.protocolStatus).toBe('ok');
      expect(result.details.protocolTest).toBe('Passed');
      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.readTag).toHaveBeenCalled();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });
  });
});
