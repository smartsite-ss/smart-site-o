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

// ============================================================
// 辅助工厂函数：创建设备 DTO
// ============================================================
function makeCreateDeviceDto(
  overrides: Partial<{
    deviceCode: string;
    deviceName: string;
    templateId: string;
    driver: string;
    connection: Record<string, any>;
    groupId?: string;
    scanRate?: number;
  }> = {},
) {
  return {
    deviceCode: overrides.deviceCode || 'dev-001',
    deviceName: overrides.deviceName || '测试设备',
    templateId: overrides.templateId || 'tpl-001',
    driver: (overrides.driver || 'modbus_tcp') as any,
    connection: overrides.connection || { host: '192.168.1.1', port: 502 },
    groupId: overrides.groupId,
    scanRate: overrides.scanRate,
  };
}

function makeMockDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: overrides.id || 'dev-001',
    deviceCode: overrides.deviceCode || 'dev-001',
    deviceName: overrides.deviceName || '测试设备',
    nameAlias: overrides.nameAlias || null,
    description: overrides.description || '',
    type: overrides.type || DeviceType.MODBUS_TCP,
    config: overrides.config || {},
    status: overrides.status || DeviceStatus.OFFLINE,
    projectId: overrides.projectId || 'proj-001',
    createdAt: overrides.createdAt || new Date('2025-01-01'),
    updatedAt: overrides.updatedAt || new Date('2025-01-01'),
    lastOnlineAt: overrides.lastOnlineAt || null,
    errorCount: overrides.errorCount || 0,
    lastErrorAt: overrides.lastErrorAt || null,
    lastErrorMsg: overrides.lastErrorMsg || '',
    templateId: overrides.templateId || 'tpl-001',
    templateVersion: overrides.templateVersion || '1.0.0',
    templateAppliedAt: overrides.templateAppliedAt || new Date('2025-01-01'),
    connection: overrides.connection || { host: '192.168.1.1', port: 502 },
    groupId: overrides.groupId || null,
    driver: overrides.driver || 'modbus_tcp',
    scanRate: overrides.scanRate ?? 1000,
    offlinePeriod: overrides.offlinePeriod ?? 30000,
    lastDataAt: overrides.lastDataAt || null,
    updatedBy: overrides.updatedBy || null,
  };
}

function makeMockGroup(overrides: Partial<DeviceGroup> = {}): DeviceGroup {
  return {
    id: overrides.id || 'grp-001',
    name: overrides.name || '测试分组',
    description: overrides.description || '',
    projectId: overrides.projectId || 'proj-001',
    parentId: overrides.parentId || null,
    parent: overrides.parent || null,
    children: overrides.children || [],
    sortOrder: overrides.sortOrder || 0,
    createdAt: overrides.createdAt || new Date('2025-01-01'),
    updatedAt: overrides.updatedAt || new Date('2025-01-01'),
  };
}

describe('DeviceService - 设备分组与多项目设备管理', () => {
  let service: DeviceService;
  let deviceRepo: MockRepository<Device>;
  let dataTagRepo: MockRepository<DataTag>;
  let deviceGroupRepo: MockRepository<DeviceGroup>;
  let mockDataSource: Partial<DataSource>;
  let mockProjectDbService: Partial<ProjectDatabaseService>;
  let mockI18nService: Partial<I18nService>;

  const projectId = 'proj-001';

  beforeEach(async () => {
    deviceRepo = createMockRepo<Device>();
    dataTagRepo = createMockRepo<DataTag>();
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

  // ============================================================
  // 一、分组管理
  // ============================================================
  describe('分组管理', () => {
    describe('TC-GROUP-001: 创建分组', () => {
      it('应成功创建平级分组', async () => {
        const dto = { name: '一楼设备', projectId };
        const group = makeMockGroup({ id: 'grp-001', name: '一楼设备' });
        deviceGroupRepo.create = jest.fn().mockReturnValue(group);
        deviceGroupRepo.save = jest.fn().mockResolvedValue(group);

        const result = await service.createGroup(dto, projectId);

        expect(deviceGroupRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: '一楼设备', projectId }),
        );
        expect(result.name).toBe('一楼设备');
      });

      it('应成功创建带描述的分组', async () => {
        const dto = { name: '二楼设备', description: '二楼所有设备', projectId };
        const group = makeMockGroup({
          id: 'grp-002',
          name: '二楼设备',
          description: '二楼所有设备',
        });
        deviceGroupRepo.create = jest.fn().mockReturnValue(group);
        deviceGroupRepo.save = jest.fn().mockResolvedValue(group);

        const result = await service.createGroup(dto, projectId);

        expect(result.name).toBe('二楼设备');
        expect(result.description).toBe('二楼所有设备');
      });
    });

    describe('TC-GROUP-002: 创建多级分组（父分组+子分组）', () => {
      it('应成功创建带父分组的子分组', async () => {
        const _parentGroup = makeMockGroup({ id: 'grp-parent', name: '厂区A' });
        const childGroup = makeMockGroup({
          id: 'grp-child',
          name: '车间1',
          parentId: 'grp-parent',
        });
        deviceGroupRepo.create = jest.fn().mockReturnValue(childGroup);
        deviceGroupRepo.save = jest.fn().mockResolvedValue(childGroup);

        const result = await service.createGroup(
          { name: '车间1', parentId: 'grp-parent' },
          projectId,
        );

        expect(deviceGroupRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: '车间1', parentId: 'grp-parent' }),
        );
        expect(result.parentId).toBe('grp-parent');
      });

      it('应支持三级分组树', async () => {
        // 厂区 → 车间 → 产线
        const _l1 = makeMockGroup({ id: 'grp-l1', name: '厂区A' });
        const _l2 = makeMockGroup({ id: 'grp-l2', name: '车间1', parentId: 'grp-l1' });
        const l3 = makeMockGroup({ id: 'grp-l3', name: '产线A', parentId: 'grp-l2' });

        deviceGroupRepo.create = jest.fn().mockReturnValue(l3);
        deviceGroupRepo.save = jest.fn().mockResolvedValue(l3);

        const result = await service.createGroup({ name: '产线A', parentId: 'grp-l2' }, projectId);

        expect(result.parentId).toBe('grp-l2');
        expect(result.name).toBe('产线A');
      });
    });

    describe('TC-GROUP-003: 查询所有分组', () => {
      it('应按 sortOrder 排序返回所有分组', async () => {
        const groups = [
          makeMockGroup({ id: 'grp-1', name: 'A组', sortOrder: 0 }),
          makeMockGroup({ id: 'grp-2', name: 'B组', sortOrder: 1 }),
          makeMockGroup({ id: 'grp-3', name: 'C组', sortOrder: 2 }),
        ];
        deviceGroupRepo.find = jest.fn().mockResolvedValue(groups);

        const result = await service.findAllGroups(projectId);

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('A组');
        expect(result[2].name).toBe('C组');
      });

      it('不同项目返回不同分组', async () => {
        const groups1 = [makeMockGroup({ id: 'grp-1', name: '项目一分组', projectId: 'proj-001' })];
        const groups2 = [makeMockGroup({ id: 'grp-2', name: '项目二分组', projectId: 'proj-002' })];

        deviceGroupRepo.find = jest
          .fn()
          .mockResolvedValueOnce(groups1)
          .mockResolvedValueOnce(groups2);

        const result1 = await service.findAllGroups('proj-001');
        const result2 = await service.findAllGroups('proj-002');

        expect(result1[0].name).toBe('项目一分组');
        expect(result2[0].name).toBe('项目二分组');
      });
    });

    describe('TC-GROUP-004: 查询单个分组', () => {
      it('应返回分组及其子分组', async () => {
        const child = makeMockGroup({ id: 'grp-child', name: '子分组' });
        const parent = makeMockGroup({ id: 'grp-parent', name: '父分组', children: [child] });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(parent);

        const result = await service.findOneGroup('grp-parent', projectId);

        expect(result.name).toBe('父分组');
        expect(result.children).toHaveLength(1);
      });

      it('不存在的分组应抛出 NotFoundException', async () => {
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(null);

        await expect(service.findOneGroup('grp-999', projectId)).rejects.toThrow(NotFoundException);
      });
    });

    describe('TC-GROUP-005: 更新分组', () => {
      it('应成功更新分组名称', async () => {
        const group = makeMockGroup({ id: 'grp-001', name: '旧名称' });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(group);
        deviceGroupRepo.save = jest.fn().mockResolvedValue({ ...group, name: '新名称' });

        const result = await service.updateGroup('grp-001', { name: '新名称' }, projectId);

        expect(result.name).toBe('新名称');
      });

      it('应成功更新分组排序', async () => {
        const group = makeMockGroup({ id: 'grp-001', name: '分组', sortOrder: 0 });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(group);
        deviceGroupRepo.save = jest.fn().mockResolvedValue({ ...group, sortOrder: 99 });

        const result = await service.updateGroup('grp-001', { sortOrder: 99 }, projectId);

        expect(result.sortOrder).toBe(99);
      });

      it('应支持移动分组到新的父分组', async () => {
        const group = makeMockGroup({ id: 'grp-002', name: '子分组', parentId: 'grp-001' });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(group);
        deviceGroupRepo.save = jest.fn().mockResolvedValue({ ...group, parentId: 'grp-003' });

        const result = await service.updateGroup('grp-002', { parentId: 'grp-003' }, projectId);

        expect(result.parentId).toBe('grp-003');
      });
    });

    describe('TC-GROUP-006: 删除分组（子分组上移）', () => {
      it('应删除分组并将子分组上移到祖父级', async () => {
        const child = makeMockGroup({ id: 'grp-child', name: '子分组', parentId: 'grp-parent' });
        const parent = makeMockGroup({
          id: 'grp-parent',
          name: '父分组',
          parentId: 'grp-root',
          children: [child],
        });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(parent);
        deviceGroupRepo.save = jest.fn().mockResolvedValue({ ...child, parentId: 'grp-root' });
        deviceGroupRepo.remove = jest.fn().mockResolvedValue(parent);

        await service.removeGroup('grp-parent', projectId);

        expect(deviceGroupRepo.remove).toHaveBeenCalled();
        expect(deviceGroupRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ parentId: 'grp-root' }),
        );
      });

      it('没有子分组时直接删除', async () => {
        const group = makeMockGroup({ id: 'grp-001', name: '独立分组', children: [] });
        deviceGroupRepo.findOne = jest.fn().mockResolvedValue(group);
        deviceGroupRepo.remove = jest.fn().mockResolvedValue(group);

        await service.removeGroup('grp-001', projectId);

        expect(deviceGroupRepo.remove).toHaveBeenCalledWith(group);
      });
    });

    describe('TC-GROUP-007: 分组树结构', () => {
      it('应返回正确的项目-分组-设备三级树', async () => {
        deviceGroupRepo.find = jest.fn().mockResolvedValue([]);
        deviceRepo.find = jest.fn().mockResolvedValue([]);

        const result = await service.getGroupTree(projectId, '测试项目');

        expect(result.projectId).toBe(projectId);
        expect(result.projectName).toBe('测试项目');
        expect(result.groups).toEqual([]);
      });

      it('应构建多层分组树', async () => {
        const root = makeMockGroup({ id: 'g-root', name: '根分组', parentId: null, children: [] });
        const child = makeMockGroup({
          id: 'g-child',
          name: '子分组',
          parentId: 'g-root',
          children: [],
        });
        deviceGroupRepo.find = jest.fn().mockResolvedValue([root, child]);
        deviceRepo.find = jest.fn().mockResolvedValue([]);

        const result = await service.getGroupTree(projectId);

        expect(result.groups).toHaveLength(1);
        expect(result.groups[0].group.name).toBe('根分组');
        expect(result.groups[0].children).toHaveLength(1);
        expect(result.groups[0].children[0].group.name).toBe('子分组');
      });
    });
  });

  // ============================================================
  // 二、不同设备类型/模板/驱动插件
  // ============================================================
  describe('不同类型/模板/插件设备', () => {
    describe('TC-DEVTYPE-001: Modbus TCP 设备', () => {
      it('应创建 modbus_tcp 类型设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'modbus-tcp-001',
          deviceName: 'ModbusTCP设备',
          driver: 'modbus_tcp',
          connection: { host: '192.168.1.100', port: 502, unitId: 1 },
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.MODBUS_TCP,
          driver: 'modbus_tcp',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('modbus_tcp');
        expect(result.driver).toBe('modbus_tcp');
      });
    });

    describe('TC-DEVTYPE-002: Modbus RTU 设备', () => {
      it('应创建 modbus_rtu 类型设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'modbus-rtu-001',
          deviceName: 'ModbusRTU设备',
          driver: 'modbus_rtu',
          connection: { serialPort: 'COM1', baudRate: 9600, unitId: 1 },
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.MODBUS_RTU,
          driver: 'modbus_rtu',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('modbus_rtu');
        expect(result.driver).toBe('modbus_rtu');
      });
    });

    describe('TC-DEVTYPE-003: OPC UA 设备', () => {
      it('应创建 opc_ua 类型设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'opcua-001',
          deviceName: 'OPCUA设备',
          driver: 'opc_ua',
          connection: { endpoint: 'opc.tcp://192.168.1.100:4840', securityPolicy: 'None' },
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.OPC_UA,
          driver: 'opc_ua',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('opc_ua');
        expect(result.driver).toBe('opc_ua');
      });
    });

    describe('TC-DEVTYPE-004: MQTT 设备', () => {
      it('应创建 mqtt 类型设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'mqtt-001',
          deviceName: 'MQTT设备',
          driver: 'mqtt',
          connection: { broker: 'mqtt://broker.example.com:1883', topic: 'sensors/#' },
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.MQTT,
          driver: 'mqtt',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('mqtt');
        expect(result.driver).toBe('mqtt');
      });
    });

    describe('TC-DEVTYPE-005: Siemens S7 设备', () => {
      it('应创建 siemens_s7 类型设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 's7-001',
          deviceName: 'S7设备',
          driver: 'siemens_s7',
          connection: { host: '192.168.1.100', rack: 0, slot: 1 },
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.SIEMENS_S7,
          driver: 'siemens_s7',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('siemens_s7');
        expect(result.driver).toBe('siemens_s7');
      });
    });

    describe('TC-DEVTYPE-006: Virtual 虚拟设备', () => {
      it('应创建 virtual 类型虚拟设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'virtual-001',
          deviceName: '虚拟设备',
          driver: 'virtual',
          connection: {},
        });
        const device = makeMockDevice({
          ...dto,
          type: DeviceType.VIRTUAL,
          driver: 'virtual',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.type).toBe('virtual');
        expect(result.driver).toBe('virtual');
      });
    });

    describe('TC-DEVTYPE-007: 不同模板ID的设备', () => {
      it('应创建关联 templateId 的设备', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'tpl-dev-001',
          deviceName: '模板设备',
          templateId: 'tpl-pump-station',
          driver: 'modbus_tcp',
        });
        const device = makeMockDevice({
          ...dto,
          templateId: 'tpl-pump-station',
          templateVersion: '2.0.0',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.templateId).toBe('tpl-pump-station');
        expect(result.templateVersion).toBe('2.0.0');
      });

      it('不同设备可使用不同模板', async () => {
        const device1 = makeMockDevice({
          id: 'dev-100',
          deviceCode: 'tpl-a-001',
          templateId: 'tpl-temp',
          deviceName: '温度设备',
        });
        const device2 = makeMockDevice({
          id: 'dev-200',
          deviceCode: 'tpl-b-001',
          templateId: 'tpl-pressure',
          deviceName: '压力设备',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValueOnce(device1).mockReturnValueOnce(device2);
        deviceRepo.save = jest.fn().mockResolvedValueOnce(device1).mockResolvedValueOnce(device2);

        const r1 = await service.create(
          makeCreateDeviceDto({
            deviceCode: 'tpl-a-001',
            templateId: 'tpl-temp',
            deviceName: '温度设备',
          }),
          projectId,
        );
        const r2 = await service.create(
          makeCreateDeviceDto({
            deviceCode: 'tpl-b-001',
            templateId: 'tpl-pressure',
            deviceName: '压力设备',
          }),
          projectId,
        );

        expect(r1.templateId).toBe('tpl-temp');
        expect(r2.templateId).toBe('tpl-pressure');
      });
    });
  });

  // ============================================================
  // 三、分组与设备关联
  // ============================================================
  describe('分组与设备关联', () => {
    describe('TC-LINK-001: 创建设备时指定分组', () => {
      it('应创建设备并关联到指定分组', async () => {
        const dto = makeCreateDeviceDto({
          deviceCode: 'grouped-dev',
          deviceName: '分组设备',
          groupId: 'grp-001',
        });
        const device = makeMockDevice({ ...dto, groupId: 'grp-001' });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValue(device);
        deviceRepo.save = jest.fn().mockResolvedValue(device);

        const result = await service.create(dto, projectId);

        expect(result.groupId).toBe('grp-001');
      });
    });

    describe('TC-LINK-002: 设备查询支持按分组过滤', () => {
      it('findAll 应支持 groupId 过滤', async () => {
        const devices = [makeMockDevice({ id: 'd-1', groupId: 'grp-001' })];
        deviceRepo.findAndCount = jest.fn().mockResolvedValue([devices, 1]);

        const result = await service.findAll(projectId, { groupId: 'grp-001' });

        expect(deviceRepo.findAndCount).toHaveBeenCalled();
        const callArgs = deviceRepo.findAndCount.mock.calls[0][0];
        expect(callArgs.where).toHaveProperty('groupId', 'grp-001');
        expect(result.data).toHaveLength(1);
      });
    });

    describe('TC-LINK-003: 分组树中显示设备', () => {
      it('getGroupTree 应在分组节点下挂载设备', async () => {
        const group = makeMockGroup({
          id: 'grp-001',
          name: '生产区',
          parentId: null,
          children: [],
        });
        deviceGroupRepo.find = jest.fn().mockResolvedValue([group]);

        const devices = [
          {
            id: 'dev-1',
            deviceCode: 'd1',
            deviceName: '设备1',
            type: 'modbus_tcp',
            status: 'online',
            groupId: 'grp-001',
          },
          {
            id: 'dev-2',
            deviceCode: 'd2',
            deviceName: '设备2',
            type: 'opc_ua',
            status: 'offline',
            groupId: 'grp-001',
          },
        ];
        deviceRepo.find = jest.fn().mockResolvedValue(devices);

        const result = await service.getGroupTree(projectId);

        expect(result.groups[0].devices).toHaveLength(2);
        expect(result.groups[0].devices[0].deviceName).toBe('设备1');
        expect(result.groups[0].devices[1].type).toBe('opc_ua');
      });
    });
  });

  // ============================================================
  // 四、多项目设备管理
  // ============================================================
  describe('多项目设备管理', () => {
    describe('TC-PROJ-001: 不同项目创建不同设备', () => {
      it('项目A和设备与项目B的设备应隔离', async () => {
        const deviceA = makeMockDevice({
          id: 'dev-a',
          deviceCode: 'proj-a-dev',
          projectId: 'proj-a',
        });
        const deviceB = makeMockDevice({
          id: 'dev-b',
          deviceCode: 'proj-b-dev',
          projectId: 'proj-b',
        });

        deviceRepo.findOne = jest.fn().mockResolvedValue(null);
        deviceRepo.create = jest.fn().mockReturnValueOnce(deviceA).mockReturnValueOnce(deviceB);
        deviceRepo.save = jest.fn().mockResolvedValueOnce(deviceA).mockResolvedValueOnce(deviceB);

        const resultA = await service.create(
          makeCreateDeviceDto({ deviceCode: 'proj-a-dev', deviceName: '项目A设备' }),
          'proj-a',
        );
        const resultB = await service.create(
          makeCreateDeviceDto({ deviceCode: 'proj-b-dev', deviceName: '项目B设备' }),
          'proj-b',
        );

        expect(resultA.projectId).toBe('proj-a');
        expect(resultB.projectId).toBe('proj-b');
      });
    });

    describe('TC-PROJ-002: 同一tid在不同项目可重复', () => {
      it('不同项目可以使用相同的 tid', async () => {
        // 项目A中 tid 不存在
        deviceRepo.findOne = jest
          .fn()
          .mockResolvedValueOnce(null) // 项目A中不存在
          .mockResolvedValueOnce(null); // 项目B中也不存在

        const devA = makeMockDevice({ id: 'dev-a', deviceCode: 'same-tid', projectId: 'proj-a' });
        const devB = makeMockDevice({ id: 'dev-b', deviceCode: 'same-tid', projectId: 'proj-b' });

        deviceRepo.create = jest.fn().mockReturnValueOnce(devA).mockReturnValueOnce(devB);
        deviceRepo.save = jest.fn().mockResolvedValueOnce(devA).mockResolvedValueOnce(devB);

        const r1 = await service.create(
          makeCreateDeviceDto({ deviceCode: 'same-tid', deviceName: '设备A' }),
          'proj-a',
        );
        const r2 = await service.create(
          makeCreateDeviceDto({ deviceCode: 'same-tid', deviceName: '设备B' }),
          'proj-b',
        );

        expect(r1.deviceCode).toBe('same-tid');
        expect(r2.deviceCode).toBe('same-tid');
        expect(r1.projectId).not.toBe(r2.projectId);
      });
    });

    describe('TC-PROJ-003: 同一tid在同一项目不可重复', () => {
      it('同一项目内重复 tid 应抛出 ConflictException', async () => {
        const existing = makeMockDevice({ id: 'dev-001', deviceCode: 'dup-tid', projectId });
        deviceRepo.findOne = jest.fn().mockResolvedValue(existing);

        await expect(
          service.create(
            makeCreateDeviceDto({ deviceCode: 'dup-tid', deviceName: '重复设备' }),
            projectId,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('TC-PROJ-004: 项目级设备列表查询', () => {
      it('findAll 应只返回指定项目的设备', async () => {
        const projADevices = [
          makeMockDevice({
            id: 'a-1',
            deviceCode: 'a-1',
            projectId: 'proj-a',
            deviceName: '项目A设备1',
          }),
        ];
        deviceRepo.findAndCount = jest.fn().mockResolvedValue([projADevices, 1]);

        const result = await service.findAll('proj-a');

        expect(deviceRepo.findAndCount).toHaveBeenCalled();
        const callArgs = deviceRepo.findAndCount.mock.calls[0][0];
        expect(callArgs.where).toHaveProperty('projectId', 'proj-a');
        expect(result.data).toHaveLength(1);
      });
    });
  });

  // ============================================================
  // 五、设备扫描周期配置
  // ============================================================
  describe('设备扫描周期', () => {
    it('应支持自定义 scanRate', async () => {
      const dto = makeCreateDeviceDto({
        deviceCode: 'scan-rate-dev',
        deviceName: '高频率设备',
        scanRate: 500,
      });
      const device = makeMockDevice({ ...dto, scanRate: 500 } as any);

      deviceRepo.findOne = jest.fn().mockResolvedValue(null);
      deviceRepo.create = jest.fn().mockReturnValue(device);
      deviceRepo.save = jest.fn().mockResolvedValue(device);

      const result = await service.create(dto, projectId);

      expect(result.scanRate).toBe(500);
    });
  });
});
