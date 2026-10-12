// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { ChannelConfigService } from '../channel/channel-config.service';
import { I18nService } from '@ss-node/ss-i18n';
import { ConflictException } from '@nestjs/common';
import type {
  ModbusTcpChannel,
  ModbusRtuChannel,
  OpcUaChannel,
} from '../channel/channel-config.interface';

describe('ChannelConfigService', () => {
  let service: ChannelConfigService;
  let mockI18nService: Partial<I18nService>;

  beforeEach(async () => {
    mockI18nService = {
      tSync: jest.fn().mockImplementation((key: string, args?: any) => {
        if (args?.detail) return `Validation failed: ${args.detail}`;
        if (args?.deviceType) return `Protocol mismatch: ${args.deviceType} vs ${args.protocol}`;
        return key;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChannelConfigService, { provide: I18nService, useValue: mockI18nService }],
    }).compile();

    service = module.get<ChannelConfigService>(ChannelConfigService);
  });

  describe('TC-DEV-020: validate Modbus TCP channel config', () => {
    it('should accept valid Modbus TCP config', () => {
      const config: ModbusTcpChannel = {
        protocol: 'modbus_tcp',
        host: '192.168.1.100',
        port: 502,
      };

      const result = service.validate(config) as any;

      expect(result.protocol).toBe('modbus_tcp');
      expect(result.host).toBe('192.168.1.100');
      expect(result.port).toBe(502);
    });

    it('should accept valid Modbus TCP config with hostname', () => {
      const config: ModbusTcpChannel = {
        protocol: 'modbus_tcp',
        host: 'plc-gateway.local',
        port: 502,
      };

      expect(() => service.validate(config)).not.toThrow();
    });
  });

  describe('TC-DEV-021: validate Modbus RTU channel config', () => {
    it('should accept valid Modbus RTU config', () => {
      const config: ModbusRtuChannel = {
        protocol: 'modbus_rtu',
        serialPort: 'COM3',
        baudRate: 9600,
      };

      const result = service.validate(config) as any;

      expect(result.protocol).toBe('modbus_rtu');
      expect(result.serialPort).toBe('COM3');
      expect(result.baudRate).toBe(9600);
    });

    it('should accept Modbus RTU with baud rate 115200', () => {
      const config: ModbusRtuChannel = {
        protocol: 'modbus_rtu',
        serialPort: '/dev/ttyUSB0',
        baudRate: 115200,
      };

      expect(() => service.validate(config)).not.toThrow();
    });
  });

  describe('TC-DEV-022: validate OPC UA channel config', () => {
    it('should accept valid OPC UA config', () => {
      const config: OpcUaChannel = {
        protocol: 'opc_ua',
        endpoint: 'opc.tcp://192.168.1.200:4840',
      };

      const result = service.validate(config) as any;

      expect(result.protocol).toBe('opc_ua');
      expect(result.endpoint).toBe('opc.tcp://192.168.1.200:4840');
    });
  });

  describe('TC-DEV-023: reject invalid IP address', () => {
    it('should throw for empty host', () => {
      const config = {
        protocol: 'modbus_tcp',
        host: '',
        port: 502,
      } as ModbusTcpChannel;

      expect(() => service.validate(config)).toThrow(ConflictException);
    });

    it('should throw for invalid IP format', () => {
      const config = {
        protocol: 'modbus_tcp',
        host: 'not-a-valid-host!@#',
        port: 502,
      } as ModbusTcpChannel;

      expect(() => service.validate(config)).toThrow(ConflictException);
    });
  });

  describe('TC-DEV-024: reject invalid port range', () => {
    it('should throw for port 0', () => {
      const config = {
        protocol: 'modbus_tcp',
        host: '192.168.1.1',
        port: 0,
      } as ModbusTcpChannel;

      expect(() => service.validate(config)).toThrow(ConflictException);
    });

    it('should throw for port 65536', () => {
      const config = {
        protocol: 'modbus_tcp',
        host: '192.168.1.1',
        port: 65536,
      } as ModbusTcpChannel;

      expect(() => service.validate(config)).toThrow(ConflictException);
    });

    it('should accept port 65535 (max valid)', () => {
      const config = {
        protocol: 'modbus_tcp',
        host: '192.168.1.1',
        port: 65535,
      } as ModbusTcpChannel;

      expect(() => service.validate(config)).not.toThrow();
    });
  });

  describe('TC-DEV-025: reject invalid baud rate', () => {
    it('should throw for unsupported baud rate 1200', () => {
      const config = {
        protocol: 'modbus_rtu',
        serialPort: 'COM1',
        baudRate: 1200,
      } as ModbusRtuChannel;

      expect(() => service.validate(config)).toThrow(ConflictException);
    });
  });

  describe('TC-DEV-026: fill defaults for missing optional fields', () => {
    it('should fill Modbus TCP defaults', () => {
      const config: ModbusTcpChannel = {
        protocol: 'modbus_tcp',
        host: '192.168.1.1',
      };

      const result = service.validate(config) as any;

      expect(result.port).toBe(502);
      expect(result.unitId).toBe(1);
      expect(result.timeout).toBe(5000);
      expect(result.retryInterval).toBe(3000);
      expect(result.maxRetries).toBe(3);
    });

    it('should fill Modbus RTU defaults', () => {
      const config: ModbusRtuChannel = {
        protocol: 'modbus_rtu',
        serialPort: 'COM3',
        baudRate: 9600,
      };

      const result = service.validate(config) as any;

      expect(result.dataBits).toBe(8);
      expect(result.parity).toBe('even');
      expect(result.stopBits).toBe(1);
      expect(result.timeout).toBe(5000);
      expect(result.unitId).toBe(1);
    });

    it('should fill OPC UA defaults', () => {
      const config: OpcUaChannel = {
        protocol: 'opc_ua',
        endpoint: 'opc.tcp://192.168.1.1:4840',
      };

      const result = service.validate(config) as any;

      expect(result.securityMode).toBe('None');
      expect(result.securityPolicy).toBe('None');
      expect(result.authentication).toEqual({ type: 'anonymous' });
      expect(result.sessionTimeout).toBe(60000);
      expect(result.autoReconnect).toBe(true);
    });
  });

  describe('TC-DEV-027: protocol mismatch detection', () => {
    it('should throw when device type does not match channel protocol', () => {
      expect(() => service.checkProtocolMatch('modbus_tcp', 'opc_ua')).toThrow(ConflictException);
    });

    it('should not throw when device type matches channel protocol', () => {
      expect(() => service.checkProtocolMatch('modbus_tcp', 'modbus_tcp')).not.toThrow();
    });

    it('should not throw for unknown device type', () => {
      expect(() => service.checkProtocolMatch('unknown_type', 'modbus_tcp')).not.toThrow();
    });
  });
});
