// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock ss-system module to avoid broken import path in ss-system
jest.mock('@ss-node/ss-system', () => ({
  TemplateLoaderService: jest.fn().mockImplementation(() => ({
    getTemplate: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { DeviceImportExportService } from '../device-import-export.service';
import { DeviceService } from '../../device.service';
import { DeviceType, DeviceStatus } from '@ss-node/ss-sdk';

describe('DeviceImportExportService', () => {
  let service: DeviceImportExportService;
  let deviceService: Partial<DeviceService>;

  const projectId = 'proj-001';

  const mockDevices = [
    {
      id: 'dev-001',
      deviceCode: 'temp-hum-001',
      deviceName: '温湿度001',
      nameAlias: '一楼大厅',
      description: '测试设备',
      type: DeviceType.MODBUS_TCP,
      status: DeviceStatus.OFFLINE,
      driver: 'modbus',
      templateId: 'tpl-001',
      groupId: 'grp-001',
      connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
    },
    {
      id: 'dev-002',
      deviceCode: 'temp-hum-002',
      deviceName: '温湿度002',
      nameAlias: '二楼大厅',
      description: '测试设备2',
      type: DeviceType.OPC_UA,
      status: DeviceStatus.ONLINE,
      driver: 'opcua',
      templateId: 'tpl-002',
      groupId: 'grp-002',
      connection: { endpoint: 'opc.tcp://192.168.1.2:4840' },
    },
  ] as any[];

  beforeEach(async () => {
    deviceService = {
      findAll: jest.fn().mockResolvedValue({
        data: mockDevices,
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      }),
      create: jest.fn().mockResolvedValue(mockDevices[0]),
      update: jest.fn().mockResolvedValue(mockDevices[0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceImportExportService, { provide: DeviceService, useValue: deviceService }],
    }).compile();

    service = module.get<DeviceImportExportService>(DeviceImportExportService);
  });

  describe('exportToCsv', () => {
    it('should export devices as CSV with headers', async () => {
      const csv = await service.exportToCsv(projectId);

      expect(deviceService.findAll).toHaveBeenCalledWith(projectId, {
        page: 1,
        pageSize: 9999,
      });

      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'deviceCode,deviceName,nameAlias,description,type,driver,templateId,groupId,status',
      );
      expect(lines.length).toBe(3); // header + 2 devices
      expect(lines[1]).toContain('temp-hum-001');
      expect(lines[2]).toContain('temp-hum-002');
    });

    it('should handle empty device list', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      const csv = await service.exportToCsv(projectId);

      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // only header
      expect(lines[0]).toBe(
        'deviceCode,deviceName,nameAlias,description,type,driver,templateId,groupId,status',
      );
    });
  });

  describe('exportToJson', () => {
    it('should export devices as JSON array', async () => {
      const json = await service.exportToJson(projectId);

      expect(deviceService.findAll).toHaveBeenCalledWith(projectId, {
        page: 1,
        pageSize: 9999,
      });
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBe(2);
      expect(json[0].deviceCode).toBe('temp-hum-001');
      expect(json[0].deviceName).toBe('温湿度001');
      expect(json[0].connection).toEqual({
        protocol: 'modbus_tcp',
        host: '192.168.1.1',
        port: 502,
      });
      expect(json[1].deviceCode).toBe('temp-hum-002');
    });

    it('should handle empty device list', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      });

      const json = await service.exportToJson(projectId);
      expect(json).toEqual([]);
    });
  });

  describe('importFromCsv', () => {
    it('should create new devices from CSV', async () => {
      (deviceService.findAll as jest.Mock)
        .mockResolvedValueOnce({ data: [], pagination: {} })
        .mockResolvedValueOnce({ data: [], pagination: {} });

      (deviceService.create as jest.Mock).mockResolvedValue({
        id: 'dev-003',
        deviceCode: 'temp-hum-003',
      });

      const csvContent = `deviceCode,deviceName,type,driver\n"temp-hum-003","温湿度003","modbus_tcp","modbus"\n"temp-hum-004","温湿度004","opcua","opcua"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it('should update existing devices by tid', async () => {
      const existingDevice = { id: 'dev-001', deviceCode: 'temp-hum-001' };
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({
        data: [existingDevice],
        pagination: {},
      });

      (deviceService.update as jest.Mock).mockResolvedValue(existingDevice);

      const csvContent = `deviceCode,deviceName,type,driver\n"temp-hum-001","温湿度001更新","modbus_tcp","modbus"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(deviceService.update).toHaveBeenCalled();
    });

    it('should handle empty CSV', async () => {
      const result = await service.importFromCsv(projectId, '');

      expect(result.success).toBe(false);
      expect(result.total).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('empty');
    });

    it('should handle CSV with only headers', async () => {
      const csvContent = 'deviceCode,deviceName,type,driver';
      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.total).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('empty');
    });

    it('should handle missing tid', async () => {
      const csvContent = `deviceCode,deviceName,type,driver\n,"无TID设备","modbus_tcp","modbus"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Missing deviceCode field');
    });

    it('should handle CSV with quoted fields', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({ data: [], pagination: {} });

      (deviceService.create as jest.Mock).mockResolvedValue({
        id: 'dev-005',
        deviceCode: 'quoted-dev',
      });

      const csvContent = `deviceCode,deviceName,type,driver\n"quoted-dev","设备,含逗号","modbus_tcp","modbus"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.created).toBe(1);
      expect(deviceService.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceName: '设备,含逗号' }),
        projectId,
      );
    });

    it('should handle CSV with special characters', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({ data: [], pagination: {} });

      (deviceService.create as jest.Mock).mockResolvedValue({
        id: 'dev-006',
        deviceCode: 'special-dev',
      });

      const csvContent = `deviceCode,deviceName,type,driver\n"special-dev","设备""引号""测试","modbus_tcp","modbus"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.created).toBe(1);
      expect(deviceService.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceName: '设备"引号"测试' }),
        projectId,
      );
    });

    it('should handle import errors gracefully', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({ data: [], pagination: {} });
      (deviceService.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const csvContent = `deviceCode,deviceName,type,driver\n"error-dev","错误设备","modbus_tcp","modbus"`;

      const result = await service.importFromCsv(projectId, csvContent);

      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Database error');
      expect(result.success).toBe(false);
    });
  });

  describe('importFromJson', () => {
    it('should create new devices from JSON', async () => {
      (deviceService.findAll as jest.Mock)
        .mockResolvedValueOnce({ data: [], pagination: {} })
        .mockResolvedValueOnce({ data: [], pagination: {} });

      (deviceService.create as jest.Mock).mockResolvedValue({
        id: 'dev-007',
        deviceCode: 'json-dev-1',
      });

      const jsonData = [
        {
          deviceCode: 'json-dev-1',
          deviceName: 'JSON设备1',
          type: 'modbus_tcp',
          driver: 'modbus',
          templateId: 'tpl-001',
          groupId: 'grp-001',
          description: 'JSON导入设备',
          nameAlias: '别名1',
          connection: { host: '192.168.1.1', port: 502 },
        },
        {
          deviceCode: 'json-dev-2',
          deviceName: 'JSON设备2',
          type: 'opcua',
          driver: 'opcua',
          templateId: 'tpl-002',
          groupId: 'grp-002',
        },
      ];

      const result = await service.importFromJson(projectId, jsonData);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should update existing devices by tid', async () => {
      const existingDevice = { id: 'dev-001', deviceCode: 'json-dev-1' };
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({
        data: [existingDevice],
        pagination: {},
      });
      (deviceService.update as jest.Mock).mockResolvedValue(existingDevice);

      const jsonData = [
        {
          deviceCode: 'json-dev-1',
          deviceName: 'JSON设备1更新',
          type: 'modbus_tcp',
          driver: 'modbus',
        },
      ];

      const result = await service.importFromJson(projectId, jsonData);

      expect(result.total).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(deviceService.update).toHaveBeenCalled();
    });

    it('should handle missing tid', async () => {
      const jsonData = [
        {
          deviceCode: '',
          deviceName: '无TID',
          type: 'modbus_tcp',
          driver: 'modbus',
        } as any,
      ];

      const result = await service.importFromJson(projectId, jsonData);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toBe('Missing deviceCode field');
    });

    it('should handle invalid data', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({ data: [], pagination: {} });
      (deviceService.create as jest.Mock).mockRejectedValue(new Error('Invalid data'));

      const jsonData = [
        {
          deviceCode: 'bad-dev',
          deviceName: '错误设备',
          type: 'invalid_type',
          driver: 'unknown',
        },
      ];

      const result = await service.importFromJson(projectId, jsonData);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].message).toBe('Invalid data');
      expect(result.success).toBe(false);
    });

    it('should handle empty JSON array', async () => {
      const result = await service.importFromJson(projectId, []);

      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should use tid as fallback name when name is empty', async () => {
      (deviceService.findAll as jest.Mock).mockResolvedValueOnce({ data: [], pagination: {} });
      (deviceService.create as jest.Mock).mockResolvedValue({
        id: 'dev-008',
        deviceCode: 'fallback-dev',
      });

      const jsonData = [
        {
          deviceCode: 'fallback-dev',
          deviceName: '',
          type: 'modbus_tcp',
          driver: 'modbus',
        },
      ];

      const result = await service.importFromJson(projectId, jsonData);

      expect(result.created).toBe(1);
      expect(deviceService.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceName: 'fallback-dev' }),
        projectId,
      );
    });
  });
});
