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
import { Repository, DataSource } from 'typeorm';
import { DeviceService } from '../device.service';
import { Device } from '../entities/device.entity';
import { DataTag } from '../entities/data-tag.entity';
import { DeviceGroup } from '../entities/device-group.entity';
import { I18nService } from '@ss-node/ss-i18n';
import { DeviceStatus, DeviceType } from '@ss-node/ss-sdk';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataPointCacheService, ProjectDatabaseService } from '@ss-node/ss-core';
import { ChannelConfigService } from '../channel/channel-config.service';
import { TemplateLoaderService } from '@ss-node/ss-system';

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

function makeMockDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: overrides.id || 'dev-001',
    deviceCode: overrides.deviceCode || 'temp-hum-001',
    deviceName: overrides.deviceName || '温湿度001',
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
    templateId: overrides.templateId || null,
    templateVersion: overrides.templateVersion || null,
    templateAppliedAt: overrides.templateAppliedAt || null,
    connection: overrides.connection || { host: '192.168.1.1', port: 502 },
    groupId: overrides.groupId || null,
    driver: overrides.driver || 'modbus_tcp',
    scanRate: overrides.scanRate ?? 1000,
    offlinePeriod: overrides.offlinePeriod ?? 30000,
    lastDataAt: overrides.lastDataAt || null,
    updatedBy: overrides.updatedBy || null,
  };
}

function makeMockTemplate(overrides: any = {}) {
  return {
    id: overrides.id || 'tpl-001',
    name: overrides.name || '温湿度模板',
    deviceType: overrides.deviceType || 'modbus_tcp',
    version: overrides.version || '1.0.0',
    variables: overrides.variables || [
      { name: 'temperature', address: 'HR40001', dataType: 'float', unit: '°C' },
      { name: 'humidity', address: 'HR40003', dataType: 'float', unit: '%' },
    ],
  };
}

describe('DeviceService - 批量标签与模板应用 (3.7/3.8)', () => {
  let service: DeviceService;
  let deviceRepo: MockRepository<Device>;
  let dataTagRepo: MockRepository<DataTag>;
  let deviceGroupRepo: MockRepository<DeviceGroup>;
  let mockDataSource: Partial<DataSource>;
  let mockProjectDbService: Partial<ProjectDatabaseService>;
  let mockI18nService: Partial<I18nService>;
  let mockTemplateLoader: any;

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
        return key;
      }),
    };

    mockTemplateLoader = {
      getTemplate: jest.fn(),
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
        { provide: TemplateLoaderService, useValue: mockTemplateLoader },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  // ============================================================
  // 3.7 批量标签管理 — addTags
  // ============================================================
  describe('3.7 批量标签: addTags', () => {
    it('TC-TAG-001: 应成功批量创建多个标签', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      const createdTags = [
        { id: 'tag-1', name: 'temp', deviceId: 'dev-001', dataType: 'float' },
        { id: 'tag-2', name: 'humid', deviceId: 'dev-001', dataType: 'float' },
      ];
      dataTagRepo.create.mockImplementation((dto: any) => ({ ...dto, id: 'tag-new' }));
      dataTagRepo.save.mockResolvedValue(createdTags);

      const dtos = [
        { name: 'temp', address: 'HR40001', dataType: 'float' as any },
        { name: 'humid', address: 'HR40003', dataType: 'float' as any },
      ];
      const result = await service.addTags('dev-001', dtos, projectId);

      expect(result).toHaveLength(2);
      expect(dataTagRepo.create).toHaveBeenCalledTimes(2);
      expect(dataTagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'temp', deviceId: 'dev-001' }),
      );
      expect(dataTagRepo.save).toHaveBeenCalled();
    });

    it('TC-TAG-002: 设备不存在时应抛出 NotFoundException', async () => {
      deviceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addTags('dev-999', [{ name: 'temp', dataType: 'float' as any }], projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-TAG-003: 空标签数组应返回空结果', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      dataTagRepo.create.mockReturnValue([]);
      dataTagRepo.save.mockResolvedValue([]);

      const result = await service.addTags('dev-001', [], projectId);

      expect(result).toEqual([]);
      expect(dataTagRepo.create).not.toHaveBeenCalled();
    });

    it('TC-TAG-004: 应将 deviceId 注入到每个标签中', async () => {
      const device = makeMockDevice({ id: 'dev-special' });
      deviceRepo.findOne.mockResolvedValue(device);
      dataTagRepo.create.mockImplementation((dto: any) => dto);
      dataTagRepo.save.mockResolvedValue([]);

      await service.addTags(
        'dev-special',
        [
          { name: 'tag1', dataType: 'int16' as any },
          { name: 'tag2', dataType: 'int16' as any },
        ],
        projectId,
      );

      expect(dataTagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'tag1', deviceId: 'dev-special' }),
      );
      expect(dataTagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'tag2', deviceId: 'dev-special' }),
      );
    });
  });

  // ============================================================
  // 3.8 模板应用 — applyTemplate
  // ============================================================
  describe('3.8 模板应用: applyTemplate', () => {
    it('TC-TPL-001: 找到模板时应实例化变量为 DataTag', async () => {
      const device = makeMockDevice();
      const template = makeMockTemplate();
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      dataTagRepo.find.mockResolvedValue([]);
      dataTagRepo.create.mockImplementation((dto: any) => ({ id: 'tag-new', ...dto }));
      dataTagRepo.save.mockResolvedValue([
        { id: 'tag-1', name: 'temperature' },
        { id: 'tag-2', name: 'humidity' },
      ]);

      const result = await service.applyTemplate('dev-001', 'tpl-001', projectId);

      expect(mockTemplateLoader.getTemplate).toHaveBeenCalledWith('tpl-001');
      expect(dataTagRepo.create).toHaveBeenCalledTimes(2);
      expect(dataTagRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      // 验证设备被保存并设置了模板信息
      expect(deviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'tpl-001',
          templateAppliedAt: expect.any(Date),
        }),
      );
    });

    it('TC-TPL-002: 模板不存在时应保存 templateId 但返回空数组', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);
      mockTemplateLoader.getTemplate.mockReturnValue(undefined);

      const result = await service.applyTemplate('dev-001', 'tpl-unknown', projectId);

      expect(result).toEqual([]);
      expect(dataTagRepo.create).not.toHaveBeenCalled();
      expect(deviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'tpl-unknown' }),
      );
    });

    it('TC-TPL-003: 应正确映射模板变量字段到 DataTag', async () => {
      const device = makeMockDevice();
      const template = makeMockTemplate({
        variables: [
          {
            name: 'voltage',
            address: 'HR40005',
            dataType: 'float',
            unit: 'V',
            scanRate: 500,
            scale: 0.1,
            offset: 0,
            alarmEnabled: true,
            alarmHigh: 250,
            archiveEnabled: true,
          },
        ],
      });
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      dataTagRepo.find.mockResolvedValue([]);
      dataTagRepo.create.mockImplementation((dto: any) => ({ id: 'tag-1', ...dto }));
      dataTagRepo.save.mockResolvedValue([{ id: 'tag-1' }]);

      await service.applyTemplate('dev-001', 'tpl-001', projectId);

      expect(dataTagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'voltage',
          address: 'HR40005',
          dataType: 'float',
          unit: 'V',
          scanRate: 500,
          scale: 0.1,
          alarmEnabled: true,
          alarmHigh: 250,
          archiveEnabled: true,
        }),
      );
    });
  });

  // ============================================================
  // 3.8 模板同步 — syncTemplateTags
  // ============================================================
  describe('3.8 模板同步: syncTemplateTags', () => {
    it('TC-SYNC-001: TemplateLoaderService 不可用时应返回零值', async () => {
      // 重新构建无 TemplateLoaderService 的模块
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      const moduleWithoutTpl: TestingModule = await Test.createTestingModule({
        providers: [
          DeviceService,
          { provide: getRepositoryToken(Device), useValue: deviceRepo },
          { provide: getRepositoryToken(DataTag), useValue: dataTagRepo },
          { provide: getRepositoryToken(DeviceGroup), useValue: deviceGroupRepo },
          { provide: I18nService, useValue: mockI18nService },
          { provide: ProjectDatabaseService, useValue: mockProjectDbService },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('unified') } },
          { provide: DataPointCacheService, useValue: { updateLatestValue: jest.fn() } },
          {
            provide: ChannelConfigService,
            useValue: { validate: jest.fn().mockReturnValue(true) },
          },
        ],
      }).compile();
      const serviceNoTpl = moduleWithoutTpl.get<DeviceService>(DeviceService);

      const result = await serviceNoTpl.syncTemplateTags('dev-001', 'tpl-001', projectId);

      expect(result).toEqual({ updated: 0, added: 0, removed: 0 });
    });

    it('TC-SYNC-002: 模板不存在时应返回零值', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      mockTemplateLoader.getTemplate.mockReturnValue(undefined);

      const result = await service.syncTemplateTags('dev-001', 'tpl-unknown', projectId);

      expect(result).toEqual({ updated: 0, added: 0, removed: 0 });
    });

    it('TC-SYNC-003: 应更新已存在标签、新增缺失标签、删除多余标签', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);

      const template = makeMockTemplate({
        variables: [
          { name: 'temperature', address: 'HR40001-NEW', dataType: 'float' },
          { name: 'pressure', address: 'HR40010', dataType: 'float' },
        ],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      // 已有标签：temperature（将更新）+ obsolete（将删除），pressure 不存在（将新增）
      const existingTags = [
        { id: 'tag-1', name: 'temperature', deviceId: 'dev-001', address: 'HR40001-OLD' },
        { id: 'tag-2', name: 'obsolete', deviceId: 'dev-001', address: 'HR40099' },
      ];
      dataTagRepo.find.mockResolvedValue(existingTags);
      dataTagRepo.save.mockResolvedValue([]);
      dataTagRepo.create.mockImplementation((dto: any) => ({ id: 'tag-new', ...dto }));
      dataTagRepo.remove.mockResolvedValue(undefined);

      const result = await service.syncTemplateTags('dev-001', 'tpl-001', projectId);

      expect(result.updated).toBe(1);
      expect(result.added).toBe(1);
      expect(result.removed).toBe(1);
      // 验证删除了多余的 obsolete 标签
      expect(dataTagRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'obsolete' }),
      );
    });

    it('TC-SYNC-004: 全新设备（无已有标签）应全部新增', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);

      const template = makeMockTemplate();
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      dataTagRepo.find.mockResolvedValue([]);
      dataTagRepo.create.mockImplementation((dto: any) => ({ id: 'tag-new', ...dto }));
      dataTagRepo.save.mockResolvedValue([]);

      const result = await service.syncTemplateTags('dev-001', 'tpl-001', projectId);

      expect(result.added).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.removed).toBe(0);
    });

    it('TC-SYNC-005: 应更新设备模板版本信息', async () => {
      const device = makeMockDevice();
      deviceRepo.findOne.mockResolvedValue(device);
      deviceRepo.save.mockResolvedValue(device);

      const template = makeMockTemplate({ version: '2.0.0' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      dataTagRepo.find.mockResolvedValue([]);

      await service.syncTemplateTags('dev-001', 'tpl-001', projectId);

      expect(deviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          templateVersion: '2.0.0',
          templateAppliedAt: expect.any(Date),
        }),
      );
    });
  });
});
