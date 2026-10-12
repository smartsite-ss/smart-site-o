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
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceService } from '../device.service';
import { Device } from '../entities/device.entity';
import { DataTag } from '../entities/data-tag.entity';
import { DeviceGroup } from '../entities/device-group.entity';
import { I18nService } from '@ss-node/ss-i18n';
import { DataSource } from 'typeorm';
import { DeviceStatus, DeviceType } from '@ss-node/ss-sdk';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataPointCacheService, ProjectDatabaseService } from '@ss-node/ss-core';
import { ChannelConfigService } from '../channel/channel-config.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo<T>(): MockRepository<T> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };
}

describe('DeviceService', () => {
  let service: DeviceService;
  let deviceRepo: MockRepository<Device>;
  let dataTagRepo: MockRepository<DataTag>;
  let deviceGroupRepo: MockRepository<DeviceGroup>;
  let mockDataSource: Partial<DataSource>;
  let mockProjectDbService: Partial<ProjectDatabaseService>;
  let mockI18nService: Partial<I18nService>;

  const projectId = 'proj-001';

  const mockDevice: Device = {
    id: 'dev-001',
    deviceCode: 'temp-hum-001',
    deviceName: '温湿度001',
    nameAlias: '一楼大厅',
    description: '测试设备',
    type: DeviceType.MODBUS_TCP,
    config: {},
    status: DeviceStatus.OFFLINE,
    projectId,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lastOnlineAt: null,
    errorCount: 0,
    lastErrorAt: null,
    lastErrorMsg: '',
    templateId: 'tpl-001',
    templateVersion: '1.0.0',
    templateAppliedAt: new Date('2025-01-01'),
    connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
    groupId: null,
    driver: 'modbus',
  };

  beforeEach(async () => {
    deviceRepo = createMockRepo<Device>();
    dataTagRepo = createMockRepo<DataTag>();
    // findOne() 在 templateId 存在时会访问 tags.length，find 必须返回数组
    dataTagRepo.find!.mockResolvedValue([]);
    deviceGroupRepo = createMockRepo<DeviceGroup>();

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        if (entity === Device) return deviceRepo;
        if (entity === DataTag) return dataTagRepo;
        if (entity === DeviceGroup) return deviceGroupRepo;
        return null;
      }),
    };

    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue(mockDataSource),
      getLoadedSystemDb: jest.fn().mockReturnValue(mockDataSource),
    };

    mockI18nService = {
      tSync: jest.fn().mockImplementation((key: string, args?: any) => {
        if (key === 'error.device.DEV_001') return `Device ${args?.id || ''} not found`;
        if (key === 'error.device.DEV_002') return `TID ${args?.tid || ''} already exists`;
        return key;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: getRepositoryToken(Device), useValue: deviceRepo },
        { provide: getRepositoryToken(DataTag), useValue: dataTagRepo },
        { provide: getRepositoryToken(DeviceGroup), useValue: deviceGroupRepo },
        { provide: I18nService, useValue: mockI18nService },
        { provide: ProjectDatabaseService, useValue: mockProjectDbService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('unified') } },
        { provide: DataPointCacheService, useValue: { updateLatestValue: jest.fn() } },
        { provide: ChannelConfigService, useValue: { validate: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  describe('TC-DEV-001: create device with valid data', () => {
    it('should create a device and return it', async () => {
      const dto = {
        deviceCode: 'temp-hum-001',
        deviceName: '温湿度001',
        templateId: 'tpl-001',
        driver: 'modbus' as any,
        connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
      };

      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockReturnValue(mockDevice);
      deviceRepo.save!.mockResolvedValue(mockDevice);

      const result = await service.create(dto, projectId);

      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { deviceCode: 'temp-hum-001', projectId },
      });
      expect(deviceRepo.create).toHaveBeenCalled();
      expect(deviceRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockDevice);
      expect(result.deviceCode).toBe('temp-hum-001');
    });
  });

  describe('TC-DEV-002: reject duplicate tid in same project', () => {
    it('should throw ConflictException when tid already exists', async () => {
      const dto = {
        deviceCode: 'temp-hum-001',
        deviceName: '温湿度001',
        templateId: 'tpl-001',
        driver: 'modbus' as any,
        connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
      };

      deviceRepo.findOne!.mockResolvedValue(mockDevice);

      await expect(service.create(dto, projectId)).rejects.toThrow(ConflictException);
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { deviceCode: 'temp-hum-001', projectId },
      });
    });
  });

  describe('TC-DEV-003: find all devices with pagination', () => {
    it('should return paginated devices with default pagination', async () => {
      const devices = [mockDevice, { ...mockDevice, id: 'dev-002', deviceCode: 'temp-hum-002' }];
      deviceRepo.findAndCount!.mockResolvedValue([devices, 2]);

      const result = await service.findAll(projectId);

      expect(deviceRepo.findAndCount).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should respect custom pagination parameters', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.findAll(projectId, { page: 2, pageSize: 10 });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.skip).toBe(10);
      expect(callArgs.take).toBe(10);
    });
  });

  describe('TC-DEV-004: find device by id', () => {
    it('should return a device when found', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);

      const result = await service.findOne('dev-001', projectId);

      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'dev-001', projectId },
      });
      expect(result).toEqual(mockDevice);
    });

    it('should throw NotFoundException when device not found', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne('dev-999', projectId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('TC-DEV-005: update device name', () => {
    it('should update device name successfully', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      // save 需将变更同步回原始 mock 对象，模拟数据库持久化
      // （findOne 内部 desensitizeDevice 会创建副本，Object.assign 修改的是副本，
      // 需通过 save 回写到原始对象，使 update 末尾的 findOne 能返回更新后的数据）
      deviceRepo.save!.mockImplementation((d: any) => {
        Object.assign(mockDevice, d);
        return Promise.resolve(d);
      });

      const result = await service.update('dev-001', { deviceName: '温湿度002' }, projectId);

      expect(result.deviceName).toBe('温湿度002');
    });
  });

  describe('TC-DEV-006: update device status', () => {
    it('should update device status', async () => {
      const updatedDevice = { ...mockDevice, status: DeviceStatus.ONLINE };
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue(updatedDevice);

      const result = await service.update('dev-001', { config: { status: 'online' } }, projectId);

      expect(deviceRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('TC-DEV-007: delete device', () => {
    it('should delete device successfully', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.remove!.mockResolvedValue(mockDevice);
      dataTagRepo.find!.mockResolvedValue([]); // no tags to cascade

      await service.remove('dev-001', projectId);

      expect(deviceRepo.remove).toHaveBeenCalledWith(mockDevice);
    });

    it('should cascade delete device tags', async () => {
      const mockTag = { id: 'tag-001', name: 'tag1', deviceId: 'dev-001' };
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.remove!.mockResolvedValue(mockDevice);
      dataTagRepo.find!.mockResolvedValue([mockTag]);
      dataTagRepo.remove!.mockResolvedValue([mockTag]);

      await service.remove('dev-001', projectId);

      expect(dataTagRepo.find).toHaveBeenCalledWith({ where: { deviceId: 'dev-001' } });
      expect(dataTagRepo.remove).toHaveBeenCalledWith([mockTag]);
      expect(deviceRepo.remove).toHaveBeenCalledWith(mockDevice);
    });

    it('should throw NotFoundException when deleting non-existent device', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('dev-999', projectId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('TC-DEV-008: search devices by name', () => {
    it('should find devices matching name search', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      const result = await service.findAll(projectId, { search: '温湿度' });

      expect(deviceRepo.findAndCount).toHaveBeenCalled();
      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ deviceName: expect.objectContaining({ _type: 'like' }) }),
        ]),
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('TC-DEV-009: search devices by tid', () => {
    it('should find devices by tid using search', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      const result = await service.findAll(projectId, { search: 'temp-hum' });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('TC-DEV-010: search devices by nameAlias', () => {
    it('should find devices by nameAlias using search', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      const result = await service.findAll(projectId, { search: '一楼大厅' });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('TC-DEV-011: filter devices by status', () => {
    it('should filter devices by status', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { status: DeviceStatus.ONLINE });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('status', 'online');
    });

    it('should not filter when status is "all"', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { status: 'all' as any });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where.status).toBeUndefined();
    });
  });

  describe('TC-DEV-012: filter devices by type', () => {
    it('should filter devices by type', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { type: DeviceType.MODBUS_TCP });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('type', 'modbus_tcp');
    });
  });

  describe('TC-DEV-013: sort devices by name', () => {
    it('should sort devices by name ascending', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { sortBy: 'deviceName', sortOrder: 'ASC' });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.order).toEqual({ deviceName: 'ASC' });
    });
  });

  describe('TC-DEV-014: sort devices by createdAt', () => {
    it('should sort devices by createdAt descending', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { sortBy: 'createdAt', sortOrder: 'DESC' });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.order).toEqual({ createdAt: 'DESC' });
    });
  });

  describe('TC-DEV-015: combine search and filter', () => {
    it('should combine search with status filter', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, {
        search: '温湿度',
        status: DeviceStatus.OFFLINE,
        type: DeviceType.MODBUS_TCP,
      });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where).toBeInstanceOf(Array);
      expect(callArgs.where[0]).toHaveProperty('status', 'offline');
      expect(callArgs.where[0]).toHaveProperty('type', 'modbus_tcp');
    });
  });

  // ==================== 新增测试：分组管理 ====================

  describe('TC-DEV-016: create device group', () => {
    it('should create a device group', async () => {
      const groupDto = { name: '一楼设备', projectId };
      const mockGroup = { id: 'grp-001', ...groupDto, parentId: null, sortOrder: 0, children: [] };
      deviceGroupRepo.create!.mockReturnValue(mockGroup);
      deviceGroupRepo.save!.mockResolvedValue(mockGroup);

      const result = await service.createGroup(groupDto, projectId);

      expect(deviceGroupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: '一楼设备' }),
      );
      expect(deviceGroupRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('一楼设备');
    });
  });

  describe('TC-DEV-017: get all groups for project', () => {
    it('should return groups sorted by sortOrder', async () => {
      const groups = [
        { id: 'grp-001', name: 'A组', sortOrder: 0, projectId },
        { id: 'grp-002', name: 'B组', sortOrder: 1, projectId },
      ];
      deviceGroupRepo.find!.mockResolvedValue(groups);

      const result = await service.findAllGroups(projectId);

      expect(deviceGroupRepo.find).toHaveBeenCalledWith({
        where: { projectId },
        order: { sortOrder: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('TC-DEV-018: get group tree', () => {
    it('should return project device tree structure', async () => {
      deviceGroupRepo.find!.mockResolvedValue([]);
      deviceRepo.find!.mockResolvedValue([]);

      const result = await service.getGroupTree(projectId, '测试项目');

      expect(result.projectId).toBe(projectId);
      expect(result.projectName).toBe('测试项目');
      expect(result.groups).toEqual([]);
    });

    it('should build tree with root groups', async () => {
      const rootGroup = {
        id: 'grp-001',
        name: '根分组',
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      const childGroup = {
        id: 'grp-002',
        name: '子分组',
        parentId: 'grp-001',
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.find!.mockResolvedValue([rootGroup, childGroup]);
      deviceRepo.find!.mockResolvedValue([]);

      const result = await service.getGroupTree(projectId);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].group.name).toBe('根分组');
    });
  });

  // ==================== 新增测试：密码脱敏 ====================

  describe('TC-DEV-019: desensitize devices connection', () => {
    it('should mask password in connection config', () => {
      const devices = [
        {
          ...mockDevice,
          connection: {
            protocol: 'modbus_tcp',
            host: '192.168.1.1',
            port: 502,
            authentication: { password: 'secret123' },
          },
        },
      ];
      const result = service.desensitizeDevices(devices);

      expect(result[0].connection.authentication.password).toBe('***');
      expect(result[0].connection.host).toBe('192.168.1.1'); // non-sensitive field preserved
    });

    it('should mask certificate paths', () => {
      const devices = [
        {
          ...mockDevice,
          connection: {
            protocol: 'opc_ua',
            endpoint: 'opc.tcp://1.2.3.4:4840',
            certificatePath: '/path/to/cert.pem',
          },
        },
      ];
      const result = service.desensitizeDevices(devices);

      expect(result[0].connection.certificatePath).toBe('***');
      expect(result[0].connection.endpoint).toBe('opc.tcp://1.2.3.4:4840');
    });

    it('should handle device without connection', () => {
      const devices = [{ ...mockDevice, connection: null as any }];
      const result = service.desensitizeDevices(devices);

      expect(result[0].connection).toBeNull();
    });
  });

  // ==================== 新增测试：模板应用 ====================

  describe('TC-DEV-020: apply template to device', () => {
    it('should apply template and create tags', async () => {
      // Reset mock and inject templateLoader mock
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue(mockDevice);
      dataTagRepo.create!.mockImplementation((dto: any) => ({ id: 'tag-new', ...dto }));
      dataTagRepo.save!.mockResolvedValue([]);

      // templateLoaderService is mocked at module level via jest.mock('@ss-node/ss-system')
      const result = await service.applyTemplate('dev-001', 'tpl-001', projectId);

      expect(deviceRepo.save).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('TC-DEV-021: update device group', () => {
    it('should update group name', async () => {
      const group = {
        id: 'grp-001',
        name: '旧名称',
        projectId,
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(group);
      deviceGroupRepo.save!.mockResolvedValue({ ...group, name: '新名称' });

      const result = await service.updateGroup('grp-001', { name: '新名称' }, projectId);

      expect(result.name).toBe('新名称');
    });
  });

  describe('TC-DEV-022: remove group with child reassignment', () => {
    it('should reassign children to parent on delete', async () => {
      const child = { id: 'grp-002', name: '子分组', parentId: 'grp-001', sortOrder: 0 };
      const parent = {
        id: 'grp-001',
        name: '父分组',
        parentId: 'grp-root',
        projectId,
        sortOrder: 0,
        children: [child],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(parent);
      deviceGroupRepo.save!.mockResolvedValue({ ...child, parentId: 'grp-root' });
      deviceGroupRepo.remove!.mockResolvedValue(parent);

      await service.removeGroup('grp-001', projectId);

      expect(deviceGroupRepo.remove).toHaveBeenCalled();
      expect(deviceGroupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'grp-root' }),
      );
    });
  });

  // ==================== 新增测试：多级分组（深度测试） ====================

  describe('TC-DEV-023: create multi-level group hierarchy', () => {
    it('should create child group with parentId', async () => {
      const childDto = { name: '二楼设备', parentId: 'grp-001', projectId };
      const mockChild = { id: 'grp-003', ...childDto, sortOrder: 0, children: [] };
      deviceGroupRepo.create!.mockReturnValue(mockChild);
      deviceGroupRepo.save!.mockResolvedValue(mockChild);

      const result = await service.createGroup(childDto, projectId);

      expect(deviceGroupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '二楼设备',
          parentId: 'grp-001',
        }),
      );
      expect(result.parentId).toBe('grp-001');
      expect(result.name).toBe('二楼设备');
    });

    it('should create group with sortOrder', async () => {
      const dto = { name: '排序分组', sortOrder: 5, projectId };
      const mockGroup = { id: 'grp-010', ...dto, parentId: null, children: [] };
      deviceGroupRepo.create!.mockReturnValue(mockGroup);
      deviceGroupRepo.save!.mockResolvedValue(mockGroup);

      const result = await service.createGroup(dto, projectId);

      expect(result.sortOrder).toBe(5);
    });
  });

  describe('TC-DEV-024: get group tree with multi-level hierarchy', () => {
    it('should build 3-level tree structure', async () => {
      const rootGroup = {
        id: 'grp-001',
        name: '一级分组',
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      const childGroup = {
        id: 'grp-002',
        name: '二级分组',
        parentId: 'grp-001',
        sortOrder: 0,
        children: [],
      };
      const grandChildGroup = {
        id: 'grp-003',
        name: '三级分组',
        parentId: 'grp-002',
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.find!.mockResolvedValue([rootGroup, childGroup, grandChildGroup]);
      deviceRepo.find!.mockResolvedValue([]);

      const result = await service.getGroupTree(projectId);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].group.name).toBe('一级分组');
      expect(result.groups[0].children).toHaveLength(1);
      expect(result.groups[0].children[0].group.name).toBe('二级分组');
      expect(result.groups[0].children[0].children).toHaveLength(1);
      expect(result.groups[0].children[0].children[0].group.name).toBe('三级分组');
    });

    it('should include devices in tree nodes', async () => {
      const rootGroup = {
        id: 'grp-001',
        name: '根分组',
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.find!.mockResolvedValue([rootGroup]);
      deviceRepo.find!.mockResolvedValue([
        {
          id: 'dev-001',
          deviceCode: 'd1',
          deviceName: '设备1',
          type: 'modbus_tcp',
          status: 'online',
          groupId: 'grp-001',
        },
        {
          id: 'dev-002',
          deviceCode: 'd2',
          deviceName: '设备2',
          type: 'opc_ua',
          status: 'offline',
          groupId: 'grp-001',
        },
      ]);

      const result = await service.getGroupTree(projectId);

      expect(result.groups[0].devices).toHaveLength(2);
      expect(result.groups[0].devices[0].deviceName).toBe('设备1');
      expect(result.groups[0].devices[1].deviceName).toBe('设备2');
    });

    it('should include devices without group in root', async () => {
      deviceGroupRepo.find!.mockResolvedValue([]);
      deviceRepo.find!.mockResolvedValue([
        {
          id: 'dev-001',
          deviceCode: 'd1',
          deviceName: '未分组设备',
          type: 'modbus_tcp',
          status: 'online',
          groupId: null,
        },
      ]);

      const result = await service.getGroupTree(projectId);

      // 未分组设备挂载在 rootDevices 中
      expect(result.groups).toEqual([]);
      expect(result.rootDevices).toHaveLength(1);
      expect(result.rootDevices[0].deviceName).toBe('未分组设备');
    });
  });

  describe('TC-DEV-025: update group parentId (move group)', () => {
    it('should update group parentId to move to another parent', async () => {
      const group = {
        id: 'grp-002',
        name: '移动分组',
        projectId,
        parentId: 'grp-001',
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(group);
      deviceGroupRepo.save!.mockResolvedValue({ ...group, parentId: 'grp-003' });

      const result = await service.updateGroup('grp-002', { parentId: 'grp-003' }, projectId);

      expect(result.parentId).toBe('grp-003');
    });

    it('should update group sortOrder', async () => {
      const group = {
        id: 'grp-001',
        name: '排序分组',
        projectId,
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(group);
      deviceGroupRepo.save!.mockResolvedValue({ ...group, sortOrder: 10 });

      const result = await service.updateGroup('grp-001', { sortOrder: 10 }, projectId);

      expect(result.sortOrder).toBe(10);
    });
  });

  // ==================== 新增测试：设备创建 - 不同驱动类型 ====================

  describe('TC-DEV-026: create device with different driver types', () => {
    const baseDto = {
      deviceCode: 'test-dev-001',
      deviceName: '测试设备',
      templateId: 'tpl-001',
      connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
    };

    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({ id: 'dev-new', ...dto }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should create device with modbus driver', async () => {
      const result = await service.create({ ...baseDto, driver: 'modbus' as any }, projectId);

      expect(result.driver).toBe('modbus');
      expect(result.type).toBe('modbus_tcp');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create device with opc_ua driver', async () => {
      const result = await service.create(
        {
          ...baseDto,
          deviceCode: 'opc-dev-001',
          driver: 'opc_ua' as any,
          connection: { endpoint: 'opc.tcp://192.168.1.1:4840' },
        },
        projectId,
      );

      expect(result.driver).toBe('opc_ua');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create device with mqtt driver', async () => {
      const result = await service.create(
        {
          ...baseDto,
          deviceCode: 'mqtt-dev-001',
          driver: 'mqtt' as any,
          connection: { broker: 'mqtt://192.168.1.1:1883', topic: 'sensors/#' },
        },
        projectId,
      );

      expect(result.driver).toBe('mqtt');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create device with siemens_s7 driver', async () => {
      const result = await service.create(
        {
          ...baseDto,
          deviceCode: 's7-dev-001',
          driver: DeviceType.SIEMENS_S7,
          connection: { host: '192.168.1.1', rack: 0, slot: 1 },
        },
        projectId,
      );

      expect(result.driver).toBe('siemens_s7');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create device with virtual driver', async () => {
      const result = await service.create(
        {
          ...baseDto,
          deviceCode: 'virtual-dev-001',
          driver: DeviceType.VIRTUAL,
          connection: { mode: 'random' },
        },
        projectId,
      );

      expect(result.driver).toBe('virtual');
      expect(deviceRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== 新增测试：设备创建 - 不同模板 ====================

  describe('TC-DEV-027: create device with different templates', () => {
    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({ id: 'dev-new', ...dto }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should create device with templateId and derive type from template', async () => {
      const result = await service.create(
        {
          deviceCode: 'tpl-dev-001',
          deviceName: '模板设备',
          templateId: 'tpl-temp-hum',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.templateId).toBe('tpl-temp-hum');
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it('should create device with templateVersion', async () => {
      const result = await service.create(
        {
          deviceCode: 'tpl-ver-001',
          deviceName: '版本设备',
          templateId: 'tpl-001',
          templateVersion: '2.0.0',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.templateVersion).toBe('2.0.0');
    });
  });

  // ==================== 新增测试：设备创建 - 不同项目隔离 ====================

  describe('TC-DEV-028: create device in different projects (project isolation)', () => {
    const projectA = 'proj-a';
    const projectB = 'proj-b';

    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({ id: 'dev-new', ...dto }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should create device with specific projectId', async () => {
      const result = await service.create(
        {
          deviceCode: 'proj-dev-001',
          deviceName: '项目A设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectA,
      );

      expect(result.projectId).toBe(projectA);
    });

    it('should allow same tid in different projects', async () => {
      // 项目A创建设备
      await service.create(
        {
          deviceCode: 'same-tid',
          deviceName: '项目A设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectA,
      );

      // 项目B查询时tid不存在（隔离）
      deviceRepo.findOne!.mockResolvedValue(null);

      const result = await service.create(
        {
          deviceCode: 'same-tid',
          deviceName: '项目B设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.2', port: 502 },
        },
        projectB,
      );

      expect(result.projectId).toBe(projectB);
      expect(result.deviceCode).toBe('same-tid');
    });
  });

  // ==================== 新增测试：设备创建 - 分配到分组 ====================

  describe('TC-DEV-029: create device with group assignment', () => {
    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({ id: 'dev-new', ...dto }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should create device with groupId', async () => {
      const result = await service.create(
        {
          deviceCode: 'group-dev-001',
          deviceName: '分组设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
          groupId: 'grp-001',
        },
        projectId,
      );

      expect(result.groupId).toBe('grp-001');
    });

    it('should create device without groupId (null)', async () => {
      const result = await service.create(
        {
          deviceCode: 'no-group-dev',
          deviceName: '无分组设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.groupId).toBeUndefined();
    });
  });

  // ==================== 新增测试：设备创建 - 默认值验证 ====================

  describe('TC-DEV-030: create device with default values', () => {
    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({
        id: 'dev-new',
        ...dto,
        offlinePeriod: dto.offlinePeriod ?? 30000,
        scanRate: dto.scanRate ?? 1000,
      }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should use default offlinePeriod of 30000ms', async () => {
      const result = await service.create(
        {
          deviceCode: 'default-dp-001',
          deviceName: '默认周期设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.offlinePeriod).toBe(30000);
    });

    it('should use default scanRate of 1000ms', async () => {
      const result = await service.create(
        {
          deviceCode: 'default-sr-001',
          deviceName: '默认采集周期设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.scanRate).toBe(1000);
    });

    it('should accept custom offlinePeriod', async () => {
      const result = await service.create(
        {
          deviceCode: 'custom-dp-001',
          deviceName: '自定义周期设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
          offlinePeriod: 5000,
        },
        projectId,
      );

      expect(result.offlinePeriod).toBe(5000);
    });

    it('should accept custom scanRate', async () => {
      const result = await service.create(
        {
          deviceCode: 'custom-sr-001',
          deviceName: '自定义采集周期设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
          scanRate: 2000,
        },
        projectId,
      );

      expect(result.scanRate).toBe(2000);
    });
  });

  // ==================== 新增测试：设备创建 - 带描述和别名 ====================

  describe('TC-DEV-031: create device with description and nameAlias', () => {
    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockImplementation((dto: any) => ({ id: 'dev-new', ...dto }));
      deviceRepo.save!.mockImplementation((d: any) => Promise.resolve(d));
    });

    it('should create device with description', async () => {
      const result = await service.create(
        {
          deviceCode: 'desc-dev-001',
          deviceName: '带描述设备',
          description: '这是一台测试设备',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.description).toBe('这是一台测试设备');
    });

    it('should create device with nameAlias', async () => {
      const result = await service.create(
        {
          deviceCode: 'alias-dev-001',
          deviceName: '别名设备',
          nameAlias: '一楼大厅温湿度',
          templateId: 'tpl-001',
          driver: 'modbus' as any,
          connection: { protocol: 'modbus_tcp', host: '192.168.1.1', port: 502 },
        },
        projectId,
      );

      expect(result.nameAlias).toBe('一楼大厅温湿度');
    });
  });

  // ==================== 新增测试：分组查询含设备数量 ====================

  describe('TC-DEV-032: find all groups with child relations', () => {
    it('should return groups with children relation', async () => {
      deviceGroupRepo.find!.mockResolvedValue([
        { id: 'grp-001', name: '父分组', projectId, parentId: null, sortOrder: 0 },
        { id: 'grp-002', name: '子分组', projectId, parentId: 'grp-001', sortOrder: 0 },
      ]);

      const result = await service.findAllGroups(projectId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('父分组');
      expect(result[1].parentId).toBe('grp-001');
    });
  });

  // ==================== 新增测试：findOneGroup含children ====================

  describe('TC-DEV-033: find one group with children', () => {
    it('should return group with children relation loaded', async () => {
      const group = {
        id: 'grp-001',
        name: '父分组',
        projectId,
        parentId: null,
        sortOrder: 0,
        children: [{ id: 'grp-002', name: '子分组', parentId: 'grp-001' }],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(group);

      const result = await service.findOneGroup('grp-001', projectId);

      expect(result.children).toHaveLength(1);
      expect(result.children[0].name).toBe('子分组');
    });

    it('should throw NotFoundException for non-existent group', async () => {
      deviceGroupRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOneGroup('grp-999', projectId)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 新增测试：removeGroup 无子分组 ====================

  describe('TC-DEV-034: remove group without children', () => {
    it('should remove group with no children', async () => {
      const group = {
        id: 'grp-001',
        name: '空分组',
        projectId,
        parentId: null,
        sortOrder: 0,
        children: [],
      };
      deviceGroupRepo.findOne!.mockResolvedValue(group);
      deviceGroupRepo.remove!.mockResolvedValue(group);

      await service.removeGroup('grp-001', projectId);

      expect(deviceGroupRepo.remove).toHaveBeenCalledWith(group);
      expect(deviceGroupRepo.save).not.toHaveBeenCalled();
    });
  });

  // ==================== 新增测试：设备查询含分组过滤 ====================

  describe('TC-DEV-035: filter devices by groupId', () => {
    it('should filter devices by groupId', async () => {
      deviceRepo.findAndCount!.mockResolvedValue([[mockDevice], 1]);

      await service.findAll(projectId, { groupId: 'grp-001' });

      const callArgs = deviceRepo.findAndCount!.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('groupId', 'grp-001');
    });
  });
});
