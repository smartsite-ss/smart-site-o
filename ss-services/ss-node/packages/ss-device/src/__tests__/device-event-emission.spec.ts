// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Mock ss-system module to avoid broken import path
jest.mock('@ss-node/ss-system', () => ({
  TemplateLoaderService: jest.fn().mockImplementation(() => ({
    getTemplate: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DeviceService } from '../device.service';
import { Device } from '../entities/device.entity';
import { DataTag } from '../entities/data-tag.entity';
import { DeviceGroup } from '../entities/device-group.entity';
import { I18nService } from '@ss-node/ss-i18n';
import { ConfigService } from '@nestjs/config';
import { DataPointCacheService, EventBusService, ProjectDatabaseService } from '@ss-node/ss-core';
import { ChannelConfigService } from '../channel/channel-config.service';
import { DeviceStatus, DeviceType } from '@ss-node/ss-sdk';
import { BadRequestException } from '@nestjs/common';

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

describe('DeviceService - 事件发布', () => {
  let service: DeviceService;
  let deviceRepo: MockRepository<Device>;
  let dataTagRepo: MockRepository<DataTag>;
  let deviceGroupRepo: MockRepository<DeviceGroup>;
  let eventBus: { emit: jest.Mock };

  const projectId = 'proj-001';

  const mockDevice: Device = {
    id: 'dev-001',
    deviceCode: 'temp-hum-001',
    deviceName: '温湿度001',
    nameAlias: '',
    description: '',
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
    driver: 'modbus_tcp',
    scanRate: 1000,
  } as any;

  beforeEach(async () => {
    deviceRepo = createMockRepo<Device>();
    dataTagRepo = createMockRepo<DataTag>();
    // findOne() 在 templateId 存在时会访问 tags.length，find 必须返回数组
    dataTagRepo.find!.mockResolvedValue([]);
    deviceGroupRepo = createMockRepo<DeviceGroup>();

    const mockDataSource: Partial<DataSource> = {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        if (entity === Device) return deviceRepo;
        if (entity === DataTag) return dataTagRepo;
        if (entity === DeviceGroup) return deviceGroupRepo;
        return null;
      }),
    };

    const mockProjectDbService: Partial<ProjectDatabaseService> = {
      getSystemDb: jest.fn().mockResolvedValue(mockDataSource),
      getLoadedSystemDb: jest.fn().mockReturnValue(mockDataSource),
    };

    const mockI18nService: Partial<I18nService> = {
      tSync: jest.fn().mockImplementation((key: string, args?: any) => {
        if (key === 'error.device.DEV_001') return `Device ${args?.id || ''} not found`;
        if (key === 'error.device.DEV_002') return `TID ${args?.tid || ''} already exists`;
        return key;
      }),
    };

    eventBus = { emit: jest.fn() };

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
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  describe('create - device.created 事件', () => {
    it('创建设备后应当发布 device.created 事件', async () => {
      const dto = {
        deviceCode: 'temp-hum-001',
        deviceName: '温湿度001',
        templateId: 'tpl-001',
        driver: 'modbus_tcp' as any,
        connection: { host: '192.168.1.1', port: 502 },
        scanRate: 1000,
      };

      deviceRepo.findOne!.mockResolvedValue(null);
      deviceRepo.create!.mockReturnValue(mockDevice);
      deviceRepo.save!.mockResolvedValue(mockDevice);

      await service.create(dto, projectId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.created',
        expect.objectContaining({
          deviceId: 'dev-001',
          projectId: 'proj-001',
          protocol: 'modbus_tcp',
          connection: expect.any(Object),
          scanRate: 1000,
          templateId: 'tpl-001',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('创建失败（TID 冲突）时不应发布事件', async () => {
      const dto = {
        deviceCode: 'temp-hum-001',
        deviceName: '温湿度001',
        templateId: 'tpl-001',
        driver: 'modbus_tcp' as any,
        connection: { host: '192.168.1.1', port: 502 },
      };

      deviceRepo.findOne!.mockResolvedValue(mockDevice);

      await expect(service.create(dto, projectId)).rejects.toThrow();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('update - device.updated 事件', () => {
    it('变更 connection 后应当发布 device.updated 事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({ ...mockDevice, connection: { host: '10.0.0.1' } });

      await service.update(
        'dev-001',
        {
          connection: { host: '10.0.0.1' },
        },
        projectId,
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.updated',
        expect.objectContaining({
          deviceId: 'dev-001',
          projectId: 'proj-001',
          changedFields: expect.arrayContaining(['connection']),
          connection: { host: '10.0.0.1' },
          timestamp: expect.any(Number),
        }),
      );
    });

    it('变更 scanRate 后应当发布 device.updated 事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({ ...mockDevice, scanRate: 500 });

      await service.update('dev-001', { scanRate: 500 }, projectId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.updated',
        expect.objectContaining({
          deviceId: 'dev-001',
          changedFields: expect.arrayContaining(['scanRate']),
          scanRate: 500,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('变更 deviceName 后应当发布 device.updated 事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({ ...mockDevice, deviceName: '新名称' });

      await service.update('dev-001', { deviceName: '新名称' }, projectId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.updated',
        expect.objectContaining({
          deviceId: 'dev-001',
          changedFields: expect.arrayContaining(['deviceName']),
          timestamp: expect.any(Number),
        }),
      );
    });

    it('变更 groupId 后应当发布 device.updated 事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({ ...mockDevice, groupId: 'grp-1' });

      await service.update('dev-001', { groupId: 'grp-1' }, projectId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.updated',
        expect.objectContaining({
          deviceId: 'dev-001',
          changedFields: expect.arrayContaining(['groupId']),
          timestamp: expect.any(Number),
        }),
      );
    });

    it('无字段变更时不应发布事件', async () => {
      // 使用无 templateId 的设备，避免空 DTO 触发 templateId 隐式置空
      const deviceWithoutTemplate = { ...mockDevice, templateId: null };
      deviceRepo.findOne!.mockResolvedValue(deviceWithoutTemplate);
      deviceRepo.save!.mockResolvedValue(deviceWithoutTemplate);

      await service.update('dev-001', {}, projectId);

      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('同时变更多个字段应当包含所有变更字段', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({ ...mockDevice, deviceName: '新名称', scanRate: 200 });

      await service.update('dev-001', { deviceName: '新名称', scanRate: 200 }, projectId);

      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      const payload = eventBus.emit.mock.calls[0][1];
      expect(payload.changedFields).toEqual(
        expect.arrayContaining(['deviceName', 'scanRate', 'tags']),
      );
      expect(payload.changedFields).toHaveLength(3);
      expect(payload.changes).toHaveProperty('deviceName');
      expect(payload.changes).toHaveProperty('scanRate');
      expect(payload.changes.deviceName).toEqual({ old: '温湿度001', new: '新名称' });
      expect(payload.changes.scanRate).toEqual({ old: 1000, new: 200 });
    });
  });

  describe('remove - device.deleted 事件', () => {
    it('删除设备后应当发布 device.deleted 事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      dataTagRepo.find!.mockResolvedValue([]);
      deviceRepo.remove!.mockResolvedValue(undefined);

      await service.remove('dev-001', projectId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.deleted',
        expect.objectContaining({
          deviceId: 'dev-001',
          projectId: 'proj-001',
          protocol: 'modbus_tcp',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('删除设备时应当级联删除关联标签', async () => {
      const tags = [{ id: 'tag-1' }, { id: 'tag-2' }];
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      dataTagRepo.find!.mockResolvedValue(tags);
      deviceRepo.remove!.mockResolvedValue(undefined);

      await service.remove('dev-001', projectId);

      expect(dataTagRepo.find).toHaveBeenCalledWith({ where: { deviceId: 'dev-001' } });
      expect(dataTagRepo.remove).toHaveBeenCalledWith(tags);
    });

    it('删除不存在的设备应当抛出异常且不发布事件', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('unknown', projectId)).rejects.toThrow();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('unbindTemplate - 解绑模板', () => {
    beforeEach(() => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      deviceRepo.save!.mockResolvedValue({
        ...mockDevice,
        templateId: null,
        templateVersion: null,
      });
    });

    it('解绑模板（不删除标签）应当清空 templateId 并返回原模板ID', async () => {
      const result = await service.unbindTemplate('dev-001', projectId, false);

      expect(result.templateId).toBe('tpl-001');
      expect(result.tagsDeleted).toBe(0);
      expect(deviceRepo.save).toHaveBeenCalled();
      const savedDevice = deviceRepo.save.mock.calls[0][0];
      expect(savedDevice.templateId).toBeNull();
      expect(savedDevice.templateVersion).toBeNull();
      expect(savedDevice.templateAppliedAt).toBeNull();
    });

    it('解绑模板（删除标签）应当删除关联标签并返回删除数量', async () => {
      const tags = [{ id: 'tag-1' }, { id: 'tag-2' }, { id: 'tag-3' }];
      dataTagRepo.find!.mockResolvedValue(tags);

      const result = await service.unbindTemplate('dev-001', projectId, true);

      expect(result.tagsDeleted).toBe(3);
      expect(dataTagRepo.remove).toHaveBeenCalledWith(tags);
    });

    it('设备未绑定模板时应当抛出 BadRequestException', async () => {
      deviceRepo.findOne!.mockResolvedValue({ ...mockDevice, templateId: null });

      await expect(service.unbindTemplate('dev-001', projectId, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('设备不存在时应当抛出异常', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.unbindTemplate('unknown', projectId, false)).rejects.toThrow();
    });
  });
});
