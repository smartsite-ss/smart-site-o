// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeviceBackupService } from '../backup/device-backup.service';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { DataTag } from '../entities/data-tag.entity';
import { DeviceGroup } from '../entities/device-group.entity';
import { ProjectDatabaseService } from '@ss-node/ss-core';
import { NotFoundException, BadRequestException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockDeviceRepo(): MockRepository<Device> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
}

function createMockDataTagRepo(): MockRepository<DataTag> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
}

function createMockDeviceGroupRepo(): MockRepository<DeviceGroup> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-001',
    deviceCode: 'test-device',
    deviceName: 'Test Device',
    nameAlias: 'Test Alias',
    description: 'test description',
    type: 'modbus_tcp' as any,
    config: { host: '192.168.1.1' },
    status: 'offline' as any,
    projectId: 'project-001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    lastOnlineAt: null,
    errorCount: 0,
    lastErrorAt: null,
    lastErrorMsg: null,
    templateId: 'tpl-001',
    templateVersion: '1.0.0',
    templateAppliedAt: new Date('2024-01-01'),
    connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
    groupId: null,
    driver: 'modbus',
    ...overrides,
  };
}

function makeTag(overrides: Partial<any> = {}): any {
  return {
    id: 'tag-001',
    name: 'test-tag',
    address: '40001',
    dataType: 'float32',
    deviceId: 'device-001',
    description: 'test tag',
    unit: 'V',
    scale: 1,
    offset: 0,
    scanRate: 1000,
    enabled: true,
    minValue: 0,
    maxValue: 100,
    deadbandMode: 'none',
    deadbandValue: 0,
    deadbandPercent: 0,
    deadbandTime: 0,
    conversionType: 'none',
    conversionConfig: {},
    alarmEnabled: false,
    alarmHighHigh: null,
    alarmHigh: null,
    alarmLow: null,
    alarmLowLow: null,
    alarmDeviation: null,
    archiveEnabled: false,
    archiveInterval: null,
    retentionDays: null,
    priority: 0,
    timeout: 5000,
    retryCount: 3,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<DeviceGroup> = {}): DeviceGroup {
  return {
    id: 'group-001',
    name: 'Test Group',
    description: 'test group',
    projectId: 'project-001',
    parentId: null,
    parent: null,
    children: [],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DeviceBackupService', () => {
  let service: DeviceBackupService;
  let mockDeviceRepo: MockRepository<Device>;
  let mockDataTagRepo: MockRepository<DataTag>;
  let mockDeviceGroupRepo: MockRepository<DeviceGroup>;
  let mockProjectDbService: ProjectDatabaseService;

  beforeEach(() => {
    mockDeviceRepo = createMockDeviceRepo();
    mockDataTagRepo = createMockDataTagRepo();
    mockDeviceGroupRepo = createMockDeviceGroupRepo();
    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue({
        getRepository: jest.fn((entity: any) => {
          if (entity === Device) return mockDeviceRepo;
          if (entity === DataTag) return mockDataTagRepo;
          if (entity === DeviceGroup) return mockDeviceGroupRepo;
          return {};
        }),
      }),
      getLoadedSystemDb: jest.fn(),
      unloadProjectDatabases: jest.fn(),
      getActiveProjects: jest.fn(),
      isConnected: jest.fn(),
      setProjectsDir: jest.fn(),
    } as any;

    service = new DeviceBackupService(
      mockDeviceRepo as any,
      mockDataTagRepo as any,
      mockDeviceGroupRepo as any,
      mockProjectDbService,
    );
  });

  // ==================== backupDevice ====================
  describe('backupDevice', () => {
    it('should backup device configuration to JSON', async () => {
      const device = makeDevice();
      const tags = [makeTag({ id: 'tag-001' }), makeTag({ id: 'tag-002', name: 'tag2' })];
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue(tags);

      const result = await service.backupDevice('device-001', 'project-001');

      expect(result).toBeDefined();
      expect(result.metadata.type).toBe('device');
      expect(result.metadata.deviceId).toBe('device-001');
      expect(result.metadata.deviceCount).toBe(1);
      expect(result.metadata.tagCount).toBe(2);
      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].deviceCode).toBe('test-device');
      expect(result.devices[0].tags).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.backupDevice('non-existent', 'project-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include all device metadata in backup', async () => {
      const device = makeDevice({
        deviceName: 'Pressure Sensor',
        driver: 'modbus',
        templateId: 'tpl-002',
        templateVersion: '2.0.0',
      });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([]);

      const result = await service.backupDevice('device-001', 'project-001');

      expect(result.devices[0].deviceName).toBe('Pressure Sensor');
      expect(result.devices[0].driver).toBe('modbus');
      expect(result.devices[0].templateId).toBe('tpl-002');
      expect(result.devices[0].templateVersion).toBe('2.0.0');
    });

    it('should include tag configuration in backup', async () => {
      const device = makeDevice();
      const tag = makeTag({
        id: 'tag-001',
        name: 'temperature',
        deadbandMode: 'absolute',
        deadbandValue: 5,
        alarmEnabled: true,
        alarmHigh: 80,
      });
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([tag]);

      const result = await service.backupDevice('device-001', 'project-001');

      const backedUpTag = result.devices[0].tags[0];
      expect(backedUpTag.name).toBe('temperature');
      expect(backedUpTag.deadbandMode).toBe('absolute');
      expect(backedUpTag.deadbandValue).toBe(5);
      expect(backedUpTag.alarmEnabled).toBe(true);
      expect(backedUpTag.alarmHigh).toBe(80);
    });
  });

  // ==================== backupProject ====================
  describe('backupProject', () => {
    it('should backup all devices in project', async () => {
      const devices = [
        makeDevice({ id: 'device-001' }),
        makeDevice({ id: 'device-002', deviceCode: 'dev2' }),
      ];
      const tags1 = [makeTag({ id: 'tag-001' })];
      const tags2 = [makeTag({ id: 'tag-002' }), makeTag({ id: 'tag-003', name: 'tag3' })];
      const groups = [makeGroup({ id: 'group-001' })];

      mockDeviceRepo.find.mockResolvedValue(devices);
      mockDeviceGroupRepo.find.mockResolvedValue(groups);
      mockDataTagRepo.find.mockResolvedValueOnce(tags1).mockResolvedValueOnce(tags2);

      const result = await service.backupProject('project-001');

      expect(result.metadata.type).toBe('project');
      expect(result.metadata.deviceCount).toBe(2);
      expect(result.metadata.tagCount).toBe(3);
      expect(result.devices).toHaveLength(2);
      expect(result.groups).toBeDefined();
      expect(result.groups).toHaveLength(1);
    });

    it('should handle empty project', async () => {
      mockDeviceRepo.find.mockResolvedValue([]);
      mockDeviceGroupRepo.find.mockResolvedValue([]);

      const result = await service.backupProject('project-001');

      expect(result.devices).toHaveLength(0);
      expect(result.metadata.deviceCount).toBe(0);
      expect(result.metadata.tagCount).toBe(0);
    });

    it('should include groups in project backup', async () => {
      const groups = [
        makeGroup({ id: 'group-001', name: 'Root Group', parentId: null }),
        makeGroup({ id: 'group-002', name: 'Child Group', parentId: 'group-001' }),
      ];
      mockDeviceRepo.find.mockResolvedValue([]);
      mockDeviceGroupRepo.find.mockResolvedValue(groups);

      const result = await service.backupProject('project-001');

      expect(result.groups).toHaveLength(2);
      expect(result.groups![0].name).toBe('Root Group');
      expect(result.groups![1].parentId).toBe('group-001');
    });
  });

  // ==================== restoreDevice ====================
  describe('restoreDevice', () => {
    const backupData = {
      metadata: {
        backupId: 'bkp_test',
        projectId: 'project-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        type: 'device' as const,
        deviceId: 'device-001',
        deviceCount: 1,
        tagCount: 2,
      },
      devices: [
        {
          id: 'device-001',
          deviceCode: 'restored-device',
          deviceName: 'Restored Device',
          type: 'modbus_tcp',
          status: 'offline',
          tags: [
            {
              id: 'tag-001',
              name: 'tag1',
              address: '40001',
              dataType: 'float32',
            },
            {
              id: 'tag-002',
              name: 'tag2',
              address: '40002',
              dataType: 'float32',
            },
          ],
        },
      ],
    };

    it('should restore device from backup (create new)', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);
      const savedDevice = makeDevice({ id: 'new-device-id', deviceCode: 'restored-device' });
      mockDeviceRepo.create.mockReturnValue(savedDevice);
      mockDeviceRepo.save.mockResolvedValue(savedDevice);
      mockDataTagRepo.findOne.mockResolvedValue(null);
      mockDataTagRepo.create.mockReturnValue({});
      mockDataTagRepo.save.mockResolvedValue({});

      const result = await service.restoreDevice(backupData, 'project-001');

      expect(result).toBeDefined();
      expect(mockDeviceRepo.create).toHaveBeenCalled();
      expect(mockDeviceRepo.save).toHaveBeenCalled();
    });

    it('should restore device from backup (update existing)', async () => {
      const existingDevice = makeDevice({
        id: 'device-001',
        deviceCode: 'restored-device',
        deviceName: 'Old Name',
      });
      mockDeviceRepo.findOne.mockResolvedValue(existingDevice);
      mockDeviceRepo.save.mockResolvedValue({ ...existingDevice, deviceName: 'Restored Device' });
      mockDataTagRepo.findOne.mockResolvedValue(null);
      mockDataTagRepo.save.mockResolvedValue({});

      const result = await service.restoreDevice(backupData, 'project-001');

      expect(result.deviceName).toBe('Restored Device');
    });

    it('should throw BadRequestException for non-device type backup', async () => {
      const projectBackup = {
        ...backupData,
        metadata: { ...backupData.metadata, type: 'project' as const, deviceId: undefined },
      };

      await expect(service.restoreDevice(projectBackup, 'project-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== restoreProject ====================
  describe('restoreProject', () => {
    const projectBackup = {
      metadata: {
        backupId: 'bkp_test',
        projectId: 'project-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        type: 'project' as const,
        deviceCount: 2,
        tagCount: 3,
      },
      devices: [
        {
          id: 'device-001',
          deviceCode: 'dev1',
          deviceName: 'Device 1',
          type: 'modbus_tcp',
          status: 'offline',
          tags: [{ id: 'tag-001', name: 'tag1', address: '40001', dataType: 'float32' }],
        },
        {
          id: 'device-002',
          deviceCode: 'dev2',
          deviceName: 'Device 2',
          type: 'opc_ua',
          status: 'offline',
          tags: [
            { id: 'tag-002', name: 'tag2', address: '40002', dataType: 'float32' },
            { id: 'tag-003', name: 'tag3', address: '40003', dataType: 'float32' },
          ],
        },
      ],
      groups: [{ id: 'group-001', name: 'Root Group', sortOrder: 0 }],
    };

    it('should restore all devices and groups', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);
      mockDeviceGroupRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.create.mockReturnValue({});
      mockDeviceGroupRepo.create.mockReturnValue({});
      mockDeviceRepo.save.mockResolvedValue({ id: 'saved-1' });
      mockDeviceGroupRepo.save.mockResolvedValue({});
      mockDataTagRepo.findOne.mockResolvedValue(null);
      mockDataTagRepo.create.mockReturnValue({});
      mockDataTagRepo.save.mockResolvedValue({});

      const result = await service.restoreProject(projectBackup, 'project-001');

      expect(result.devicesRestored).toBe(2);
      expect(result.tagsRestored).toBe(3);
      expect(result.groupsRestored).toBe(1);
    });

    it('should throw BadRequestException for non-project type backup', async () => {
      const deviceBackup = {
        ...projectBackup,
        metadata: { ...projectBackup.metadata, type: 'device' as const },
      };

      await expect(service.restoreProject(deviceBackup, 'project-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== validateBackup ====================
  describe('validateBackup', () => {
    it('should validate a valid backup', () => {
      const validBackup = {
        metadata: {
          backupId: 'bkp_001',
          projectId: 'project-001',
          version: '1.0.0',
          type: 'device',
        },
        devices: [{ deviceCode: 'dev1', deviceName: 'Device 1', type: 'modbus_tcp', tags: [] }],
      };

      const result = service.validateBackup(validBackup);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing metadata', () => {
      const result = service.validateBackup(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('备份数据为空');
    });

    it('should return errors for missing required fields', () => {
      const result = service.validateBackup({ metadata: {} });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('metadata.backupId 缺失');
      expect(result.errors).toContain('metadata.projectId 缺失');
      expect(result.errors).toContain('metadata.type 缺失');
    });

    it('should return warning for empty devices array', () => {
      const backup = {
        metadata: {
          backupId: 'bkp_001',
          projectId: 'project-001',
          type: 'device',
        },
        devices: [],
      };

      const result = service.validateBackup(backup);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('devices 数组为空');
    });

    it('should validate device entries', () => {
      const backup = {
        metadata: {
          backupId: 'bkp_001',
          projectId: 'project-001',
          type: 'device',
        },
        devices: [{ deviceName: 'No TID', tags: [] }],
      };

      const result = service.validateBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('devices[0].deviceCode 缺失');
      expect(result.errors).toContain('devices[0].type 缺失');
    });

    it('should validate tags is an array', () => {
      const backup = {
        metadata: {
          backupId: 'bkp_001',
          projectId: 'project-001',
          type: 'device',
        },
        devices: [
          { deviceCode: 'dev1', deviceName: 'Device 1', type: 'modbus_tcp', tags: 'not-array' },
        ],
      };

      const result = service.validateBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('devices[0].tags 必须是数组');
    });

    it('should warn when device type backup has multiple devices', () => {
      const backup = {
        metadata: {
          backupId: 'bkp_001',
          projectId: 'project-001',
          type: 'device',
        },
        devices: [
          { deviceCode: 'dev1', deviceName: 'Device 1', type: 'modbus_tcp', tags: [] },
          { deviceCode: 'dev2', deviceName: 'Device 2', type: 'opc_ua', tags: [] },
        ],
      };

      const result = service.validateBackup(backup);

      expect(result.warnings).toContain('设备类型备份包含多个设备');
    });
  });

  // ==================== listBackups ====================
  describe('listBackups', () => {
    it('should return empty list when no backups', () => {
      const result = service.listBackups();

      expect(result).toEqual([]);
    });

    it('should list all backups', async () => {
      // Create a backup first
      const device = makeDevice();
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([]);
      await service.backupDevice('device-001', 'project-001');

      const result = service.listBackups();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('device');
      expect(result[0].projectId).toBe('project-001');
    });

    it('should filter by projectId', async () => {
      const device = makeDevice();
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([]);
      await service.backupDevice('device-001', 'project-001');
      await service.backupDevice('device-001', 'project-002');

      const result = service.listBackups('project-001');

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('project-001');
    });
  });

  // ==================== deleteBackup ====================
  describe('deleteBackup', () => {
    it('should delete an existing backup', async () => {
      const device = makeDevice();
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([]);
      const backup = await service.backupDevice('device-001', 'project-001');

      const result = service.deleteBackup(backup.metadata.backupId);

      expect(result).toBe(true);
      expect(service.listBackups()).toHaveLength(0);
    });

    it('should return false for non-existent backup', () => {
      const result = service.deleteBackup('non-existent');

      expect(result).toBe(false);
    });
  });

  // ==================== getBackup ====================
  describe('getBackup', () => {
    it('should return backup data by id', async () => {
      const device = makeDevice();
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockDataTagRepo.find.mockResolvedValue([]);
      const backup = await service.backupDevice('device-001', 'project-001');

      const result = service.getBackup(backup.metadata.backupId);

      expect(result).toBeDefined();
      expect(result!.metadata.backupId).toBe(backup.metadata.backupId);
    });

    it('should return undefined for non-existent backup', () => {
      const result = service.getBackup('non-existent');

      expect(result).toBeUndefined();
    });
  });
});
