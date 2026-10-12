// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock @nestjs/typeorm to avoid TypeORM decorator resolution
// ============================================================
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => jest.fn(),
  TypeOrmModule: { forFeature: jest.fn(), forRoot: jest.fn() },
  getRepositoryToken: jest.fn(),
  getDataSourceToken: jest.fn(),
}));

// ============================================================
// Mock typeorm  module to avoid app-root-path dependency issue
// ============================================================
jest.mock('typeorm', () => ({
  Repository: class MockRepository {},
  In: jest.fn((_vals: any[]) => _vals),
  Not: jest.fn((_val: any) => _val),
  IsNull: jest.fn(() => Symbol('IsNull')),
  Entity: () => jest.fn(),
  Column: () => jest.fn(),
  PrimaryColumn: () => jest.fn(),
  PrimaryGeneratedColumn: () => jest.fn(),
  CreateDateColumn: () => jest.fn(),
  UpdateDateColumn: () => jest.fn(),
  ManyToOne: () => jest.fn(),
  OneToMany: () => jest.fn(),
  OneToOne: () => jest.fn(),
  JoinColumn: () => jest.fn(),
  JoinTable: () => jest.fn(),
  ManyToMany: () => jest.fn(),
  Index: () => jest.fn(),
  Unique: () => jest.fn(),
  DataSource: class MockDataSource {},
}));

// ============================================================
// Mock sqlite3 native binding to prevent load failure on Node v24
// (ss-core → database.module → project-database.service → require('sqlite3'))
// Mocking sqlite3 (instead of ss-core) preserves all ss-core exports.
// ============================================================
jest.mock('sqlite3', () => ({}));

// ============================================================
// Mock @ss-node/ss-device to avoid TypeORM decorator dependency
// ============================================================
jest.mock('@ss-node/ss-device', () => {
  class FakeDevice {
    id: string;
    name: string;
    description: string;
    type: string;
    config: Record<string, any>;
    status: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    lastOnlineAt: Date;
    errorCount: number;
    lastErrorAt: Date | null;
    lastErrorMsg: string;
    templateId: string | null;
    templateVersion: string | null;
  }

  class FakeDataTag {
    id: string;
    name: string;
    description: string;
    address: string;
    dataType: string;
    deviceId: string;
    projectId: string;
    scanRate: number;
    timeout: number;
    retryCount: number;
    priority: number;
    enabled: boolean;
    scale: number;
    offset: number;
    conversionType: string;
    conversionConfig: Record<string, any> | null;
    unit: string;
    displayFormat: string;
    minValue: number | null;
    maxValue: number | null;
    engMinValue: number | null;
    engMaxValue: number | null;
    deadbandMode: string;
    deadbandValue: number;
    deadbandPercent: number;
    deadbandTime: number;
    alarmEnabled: boolean;
    alarmHighHigh: number | null;
    alarmHigh: number | null;
    alarmLow: number | null;
    alarmLowLow: number | null;
    alarmDeviation: number | null;
    qualityCheckEnabled: boolean;
    maxAge: number;
    archiveEnabled: boolean;
    archiveInterval: number;
    retentionDays: number;
    category: string;
    tags: string[];
    templateVariableGuid: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  enum TagDataType {
    BOOLEAN = 'boolean',
    INT16 = 'int16',
    UINT16 = 'uint16',
    INT32 = 'int32',
    UINT32 = 'uint32',
    FLOAT32 = 'float32',
    FLOAT64 = 'float64',
    STRING = 'string',
  }

  enum DeadbandMode {
    NONE = 'none',
    ABSOLUTE = 'absolute',
    PERCENT = 'percent',
    TIME = 'time',
  }

  enum ConversionType {
    LINEAR = 'linear',
    POLYNOMIAL = 'polynomial',
    LOOKUP_TABLE = 'lookup_table',
    SCRIPT = 'script',
    NONE = 'none',
  }

  return {
    Device: FakeDevice,
    DataTag: FakeDataTag,
    TagDataType,
    DeadbandMode,
    ConversionType,
  };
});

import * as fs from 'fs';
import * as path from 'path';
import { DeviceTemplateService } from '../template/device-template.service';
import { DeviceTagTemplate, TemplateVariable } from '../entities/device-tag-template.entity';
import { TemplateStatus } from '../enums/template-status.enum';
import { Device } from '@ss-node/ss-device';
import { DataTag, TagDataType, DeadbandMode, ConversionType } from '@ss-node/ss-device';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ============================================================
// Mock fs for JSON file operations
// ============================================================
jest.mock('fs');
jest.mock('path');

// ============================================================
// Types
// ============================================================
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// ============================================================
// Repository mock factories
// ============================================================
function _createMockTemplateRepo(): MockRepository<DeviceTagTemplate> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
}

function createMockDeviceRepo(): MockRepository<Device> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function createMockTagRepo(): MockRepository<DataTag> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
}

// ============================================================
// Entity factories
// ============================================================
function _makeTemplate(overrides: Partial<DeviceTagTemplate> = {}): DeviceTagTemplate {
  return {
    id: 'template-001',
    name: '温度采集模板',
    description: '用于采集温度数据的模板',
    deviceType: 'modbus_tcp' as any,
    version: '1.0',
    status: TemplateStatus.DRAFT,
    isDefault: false,
    variables: [
      { order: 1, name: 'temperature', address: '40001', dataType: 'float32', scanRate: 1000 },
      { order: 2, name: 'humidity', address: '40002', dataType: 'float32', scanRate: 1000 },
    ] as TemplateVariable[],
    authorId: 'author-001',
    tags: ['temperature', 'modbus'],
    linkedDevices: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-001',
    name: '测试设备',
    description: '测试设备描述',
    type: 'modbus_tcp' as any,
    config: { ip: '192.168.1.1', port: 502 },
    status: 'online' as any,
    projectId: 'project-001',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    lastOnlineAt: new Date('2026-06-04'),
    errorCount: 0,
    lastErrorAt: null as any,
    lastErrorMsg: '',
    templateId: null as any,
    templateVersion: null as any,
    ...overrides,
  };
}

function makeTag(overrides: Partial<DataTag> = {}): DataTag {
  return {
    id: 'tag-001',
    name: 'temperature',
    description: 'Temperature tag',
    address: '40001',
    dataType: TagDataType.FLOAT32,
    deviceId: 'device-001',
    projectId: 'project-001',
    scanRate: 1000,
    timeout: 5000,
    retryCount: 3,
    priority: 0,
    enabled: true,
    scale: 1.0,
    offset: 0.0,
    conversionType: ConversionType.NONE,
    conversionConfig: null,
    unit: '°C',
    displayFormat: '%.2f',
    minValue: 0,
    maxValue: 100,
    engMinValue: null,
    engMaxValue: null,
    deadbandMode: DeadbandMode.NONE,
    deadbandValue: 0,
    deadbandPercent: 0,
    deadbandTime: 0,
    alarmEnabled: false,
    alarmHighHigh: null,
    alarmHigh: null,
    alarmLow: null,
    alarmLowLow: null,
    alarmDeviation: null,
    qualityCheckEnabled: false,
    maxAge: 30000,
    archiveEnabled: false,
    archiveInterval: 60000,
    retentionDays: 90,
    category: 'AI',
    tags: [],
    templateVariableGuid: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  } as DataTag;
}

// ============================================================
// DeepPartial DTO factory for create
// ============================================================
function makeCreateDto(overrides: any = {}) {
  return {
    name: '新模板',
    description: '新模板描述',
    deviceType: 'modbus_tcp',
    version: '1.0',
    variables: [
      { order: 1, name: 'temperature', address: '40001', dataType: 'float32', scanRate: 1000 },
    ] as TemplateVariable[],
    tags: ['test'],
    ...overrides,
  };
}

function makeUpdateDto(overrides: any = {}) {
  return {
    name: '更新后的模板',
    description: '更新后的描述',
    ...overrides,
  };
}

describe('DeviceTemplateService', () => {
  let service: DeviceTemplateService;
  let mockDeviceRepo: MockRepository<Device>;
  let mockTagRepo: MockRepository<DataTag>;
  let mockTemplateLoader: Record<string, jest.Mock>;
  let mockIndexService: Record<string, jest.Mock>;
  let mockConfigService: { get: jest.Mock };
  let mockProjectDbService: { getSystemDb: jest.Mock };

  const TEST_DIR = '/tmp/test-templates';

  function makeLoadedTemplate(overrides: Partial<LoadedTemplate> = {}): LoadedTemplate {
    return {
      id: 'template-001',
      name: '温度采集模板',
      description: '用于采集温度数据的模板',
      deviceType: 'modbus_tcp',
      deviceModel: 'modbus_tcp',
      industry: '工业自动化',
      category: 'PLC控制器',
      version: '1.0',
      status: 'draft',
      isDefault: false,
      variableCount: 2,
      variables: [
        { order: 1, name: 'temperature', address: '40001', dataType: 'float32', scanRate: 1000 },
        { order: 2, name: 'humidity', address: '40002', dataType: 'float32', scanRate: 1000 },
      ] as TemplateVariable[],
      tags: ['temperature', 'modbus'],
      filePath: `${TEST_DIR}/工业自动化/PLC控制器/template-001.json`,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    mockDeviceRepo = createMockDeviceRepo();
    mockTagRepo = createMockTagRepo();

    // Mock ConfigService — 用于 resolveProjectsDir / discoverProjects
    mockConfigService = {
      get: jest.fn().mockReturnValue('/test/projects'),
    };

    // Mock ProjectDatabaseService — 项目级 DB 返回 mockDataSource
    const mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        // 根据实体类型返回对应 mock repo
        const name = entity?.name || '';
        if (name === 'Device' || name === 'FakeDevice') return mockDeviceRepo;
        if (name === 'DataTag' || name === 'FakeDataTag') return mockTagRepo;
        return {};
      }),
    };
    mockProjectDbService = {
      getSystemDb: jest.fn().mockResolvedValue(mockDataSource),
    };

    // Mock TemplateLoaderService
    mockTemplateLoader = {
      getAllTemplates: jest.fn().mockReturnValue([]),
      getTemplate: jest.fn().mockReturnValue(null),
      reload: jest.fn().mockResolvedValue(undefined),
      getIndex: jest.fn().mockReturnValue(null),
      getCacheStats: jest.fn().mockReturnValue({ count: 0, deviceTypes: [], industries: [] }),
      rebuildAndReload: jest.fn(),
      findById: jest.fn(),
      loadAllTemplates: jest.fn(),
      getTemplateById: jest.fn(),
      resolveLocale: jest.fn().mockReturnValue('zh-CN'),
    };

    // Mock TemplateIndexService
    mockIndexService = {
      getBasePath: jest.fn().mockReturnValue(TEST_DIR),
      rebuildIndex: jest.fn().mockReturnValue({ industries: [], totalTemplates: 0 }),
      loadIndex: jest.fn().mockReturnValue(null),
      getDirectoryStructure: jest.fn().mockReturnValue([]),
      createCategory: jest.fn(),
      renameCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };

    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.renameSync as jest.Mock).mockImplementation(() => undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
    (fs.readdirSync as jest.Mock).mockImplementation((_dir: string) => {
      // 模拟项目目录：大多数测试只用到 project-001
      return [
        { name: 'project-001', isDirectory: () => true },
        { name: 'some-file.txt', isDirectory: () => false },
      ] as fs.Dirent[];
    });
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));

    service = new DeviceTemplateService(
      mockConfigService as any,
      mockProjectDbService as any,
      mockTemplateLoader as any,
      mockIndexService as any,
    );
  });

  // ==================== create ====================
  describe('create', () => {
    it('TC-DTM-001: should create template successfully', async () => {
      const dto = makeCreateDto();
      const result = await service.create(dto, 'author-001');

      expect(result).toBeDefined();
      expect(result.name).toBe('新模板');
      expect(result.status).toBe(TemplateStatus.DRAFT);
      expect(result.authorId).toBe('author-001');
      expect(result.version).toBe('1.0');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.renameSync).toHaveBeenCalled();
      expect(mockTemplateLoader.reload).toHaveBeenCalled();
      expect(mockIndexService.rebuildIndex).toHaveBeenCalled();
    });

    it('TC-DTM-002: should throw BadRequestException when duplicate name exists', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([makeLoadedTemplate({ name: '新模板' })]);

      await expect(service.create(makeCreateDto({ name: '新模板' }), 'author-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(makeCreateDto({ name: '新模板' }), 'author-001')).rejects.toThrow(
        '模板名称已存在',
      );
    });

    it('TC-DTM-003: should apply default version when not provided', async () => {
      const dto = makeCreateDto({ version: undefined });
      const result = await service.create(dto, 'author-001');
      expect(result.version).toBe('1.0');
    });

    it('TC-DTM-004: should apply default empty variables and tags', async () => {
      const dto = makeCreateDto({ variables: undefined, tags: undefined });
      const result = await service.create(dto, 'author-001');
      expect(result.variables).toEqual([]);
      expect(result.tags).toEqual([]);
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('TC-DTM-010: should return paginated results with default page/pageSize', async () => {
      const templates = [makeLoadedTemplate({ id: 't-1' }), makeLoadedTemplate({ id: 't-2' })];
      mockTemplateLoader.getAllTemplates.mockReturnValue(templates);

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it('TC-DTM-011: should apply custom pagination', async () => {
      const templates = Array.from({ length: 50 }, (_, i) => makeLoadedTemplate({ id: `t-${i}` }));
      mockTemplateLoader.getAllTemplates.mockReturnValue(templates);

      const result = await service.findAll({ page: 3, pageSize: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.data).toHaveLength(10);
    });

    it('TC-DTM-012: should filter by deviceType', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 't-1', deviceType: 'opc_ua' }),
        makeLoadedTemplate({ id: 't-2', deviceType: 'modbus_tcp' }),
      ]);

      const result = await service.findAll({ deviceType: 'opc_ua' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].deviceType).toBe('opc_ua');
    });

    it('TC-DTM-013: should filter by status', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 't-1', status: 'published' }),
        makeLoadedTemplate({ id: 't-2', status: 'draft' }),
      ]);

      const result = await service.findAll({ status: 'published' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('published');
    });

    it('TC-DTM-014: should search by keyword on name and description', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 't-1', name: '温度采集模板', description: '温度传感器数据采集' }),
        makeLoadedTemplate({ id: 't-2', name: '压力模板', description: '压力传感器数据采集' }),
      ]);

      const result = await service.findAll({ keyword: '温度' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('温度采集模板');
    });

    it('TC-DTM-015: should return empty array when no results', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([]);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('TC-DTM-016: should order by updatedAt DESC', async () => {
      const older = makeLoadedTemplate({ id: 't-1', updatedAt: '2026-01-01T00:00:00.000Z' });
      const newer = makeLoadedTemplate({ id: 't-2', updatedAt: '2026-06-01T00:00:00.000Z' });
      mockTemplateLoader.getAllTemplates.mockReturnValue([older, newer]);

      const result = await service.findAll();

      expect(result.data[0].id).toBe('t-2');
      expect(result.data[1].id).toBe('t-1');
    });
  });

  // ==================== findById ====================
  describe('findById', () => {
    it('TC-DTM-020: should return template when found', async () => {
      const template = makeLoadedTemplate({ id: 'template-001' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.findById('template-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('template-001');
      expect(mockTemplateLoader.getTemplate).toHaveBeenCalledWith('template-001', undefined);
    });

    it('TC-DTM-021: should throw NotFoundException when template not found', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow('设备采集变量模板不存在');
    });
  });

  // ==================== getLinkedDevices ====================
  describe('getLinkedDevices', () => {
    it('TC-DTM-030: should return linked devices for a template', async () => {
      const template = makeLoadedTemplate({ id: 'template-001' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      const devices = [
        makeDevice({ id: 'device-001', name: '设备1' }),
        makeDevice({ id: 'device-002', name: '设备2' }),
      ];
      mockDeviceRepo.find!.mockResolvedValue(devices);

      const result = await service.getLinkedDevices('template-001');

      expect(result).toEqual(devices);
      expect(result).toHaveLength(2);
      expect(mockDeviceRepo.find).toHaveBeenCalledWith({
        where: { templateId: 'template-001' },
      });
    });

    it('TC-DTM-031: should throw NotFoundException when template not found', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(null);

      await expect(service.getLinkedDevices('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('TC-DTM-032: should return empty array when no linked devices', async () => {
      const template = makeLoadedTemplate({ id: 'template-001' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      mockDeviceRepo.find!.mockResolvedValue([]);

      const result = await service.getLinkedDevices('template-001');

      expect(result).toEqual([]);
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('TC-DTM-040: should update draft template successfully', async () => {
      const template = makeLoadedTemplate({ id: 'template-001', status: 'draft' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({ name: '更新后的模板', description: 'updated' }),
      );

      expect(result.name).toBe('更新后的模板');
      expect(result.description).toBe('updated');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-041: should update published template fields', async () => {
      const template = makeLoadedTemplate({ id: 'template-001', status: 'published' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({ name: '新名称', description: '新描述', tags: ['tag1'] }),
      );

      expect(result.name).toBe('新名称');
      expect(result.description).toBe('新描述');
      expect(result.tags).toEqual(['tag1']);
    });

    it('TC-DTM-042: should update variables on published template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32', direction: 'read-write' },
          ],
        }),
      );

      expect(result.variables).toHaveLength(1);
      expect((result.variables[0] as any).direction).toBe('read-write');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-043: should throw BadRequestException when new name conflicts', async () => {
      const template = makeLoadedTemplate({ id: 'template-001', name: 'old-name' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 'template-002', name: 'duplicate-name' }),
      ]);

      const promise = service.update('template-001', makeUpdateDto({ name: 'duplicate-name' }));

      await expect(promise).rejects.toThrow(BadRequestException);
    });

    it('TC-DTM-044: should not check duplicate when name is unchanged', async () => {
      const template = makeLoadedTemplate({ id: 'template-001', name: 'my-template' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      // name is not in dto (undefined), so it won't trigger duplicate check
      await service.update(
        'template-001',
        makeUpdateDto({ name: undefined, description: 'only desc changed' }),
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-045: should set isDefault on template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        deviceType: 'modbus_tcp',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update('template-001', makeUpdateDto({ isDefault: true }));

      expect(result.isDefault).toBe(true);
    });

    // ==================== 变量属性变更 ====================
    it('TC-DTM-046: should update variable direction (read → read-write) on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32', direction: 'read' },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32', direction: 'read-write' },
          ],
        }),
      );

      expect(result.variables).toHaveLength(1);
      expect((result.variables[0] as any).direction).toBe('read-write');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-047: should update variable direction (read → write) on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'valve', address: '00001', dataType: 'boolean', direction: 'read' },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'valve', address: '00001', dataType: 'boolean', direction: 'write' },
          ],
        }),
      );

      expect(result.variables).toHaveLength(1);
      expect((result.variables[0] as any).direction).toBe('write');
    });

    it('TC-DTM-048: should update variable enabled flag on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32', enabled: true },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temp', address: '40001', dataType: 'float32', enabled: false },
          ],
        }),
      );

      expect(result.variables).toHaveLength(1);
      expect((result.variables[0] as any).enabled).toBe(false);
    });

    it('TC-DTM-049: should update variable dataType on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32' },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temp', address: '40001', dataType: 'int16' },
          ],
        }),
      );

      expect((result.variables[0] as any).dataType).toBe('int16');
    });

    it('TC-DTM-050: should update variable scanRate on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32', scanRate: 1000 },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temp', address: '40001', dataType: 'float32', scanRate: 5000 },
          ],
        }),
      );

      expect((result.variables[0] as any).scanRate).toBe(5000);
    });

    it('TC-DTM-051: should update variable unit and description on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32', unit: '°C', description: '温度' },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temp', address: '40001', dataType: 'float32', unit: '°F', description: '华氏温度' },
          ],
        }),
      );

      expect((result.variables[0] as any).unit).toBe('°F');
      expect((result.variables[0] as any).description).toBe('华氏温度');
    });

    it('TC-DTM-052: should update variable alarm config on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32', alarmEnabled: false },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            {
              order: 1, name: 'temp', address: '40001', dataType: 'float32',
              alarmEnabled: true, alarmHigh: 100, alarmLow: 0,
            },
          ],
        }),
      );

      expect((result.variables[0] as any).alarmEnabled).toBe(true);
      expect((result.variables[0] as any).alarmHigh).toBe(100);
      expect((result.variables[0] as any).alarmLow).toBe(0);
    });

    it('TC-DTM-053: should update multiple variables with various property changes', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temp', address: '40001', dataType: 'float32', direction: 'read', enabled: true },
          { order: 2, name: 'valve', address: '00001', dataType: 'boolean', direction: 'read', enabled: true },
        ] as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({
          variables: [
            { order: 1, name: 'temp', address: '40001', dataType: 'float32', direction: 'read-write', enabled: true, scanRate: 2000 },
            { order: 2, name: 'valve', address: '00001', dataType: 'boolean', direction: 'write', enabled: false },
          ],
        }),
      );

      expect(result.variables).toHaveLength(2);
      expect((result.variables[0] as any).direction).toBe('read-write');
      expect((result.variables[0] as any).scanRate).toBe(2000);
      expect((result.variables[1] as any).direction).toBe('write');
      expect((result.variables[1] as any).enabled).toBe(false);
    });

    it('TC-DTM-054: should update with locale parameter and pass to writeTemplateFile', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      await service.update('template-001', makeUpdateDto({ description: 'updated desc' }), 'zh-CN');

      expect(mockTemplateLoader.getTemplate).toHaveBeenCalledWith('template-001', 'zh-CN');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-055: should update industry on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        industry: '工业自动化',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({ industry: '环保行业' }),
      );

      expect(result.industry).toBe('环保行业');
    });

    it('TC-DTM-056: should update category on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        category: 'PLC控制器',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({ category: '水质监测' }),
      );

      expect(result.category).toBe('水质监测');
    });

    it('TC-DTM-057: should update deviceType and version on draft template', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        deviceType: 'modbus_tcp',
        version: '1.0',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.update(
        'template-001',
        makeUpdateDto({ deviceType: 'opc_ua', version: '2.0' }),
      );

      expect(result.deviceType).toBe('opc_ua');
      expect(result.version).toBe('2.0');
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    it('TC-DTM-050: should remove template with no linked devices', async () => {
      const template = makeLoadedTemplate({ id: 'template-001' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      mockDeviceRepo.count!.mockResolvedValue(0);

      await service.remove('template-001');

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockTemplateLoader.reload).toHaveBeenCalled();
    });

    it('TC-DTM-051: should throw when template has linked devices', async () => {
      const template = makeLoadedTemplate({ id: 'template-001' });
      mockTemplateLoader.getTemplate.mockReturnValue(template);
      // findDevicesByTemplateId scans project DBs — return 5 linked devices
      mockDeviceRepo.find!.mockResolvedValue(Array(5).fill(makeDevice()));

      await expect(service.remove('template-001')).rejects.toThrow(BadRequestException);
      await expect(service.remove('template-001')).rejects.toThrow('模板已关联设备，无法删除');
    });

    it('TC-DTM-052: should throw NotFoundException when template not found', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== publish ====================
  describe('publish', () => {
    it('TC-DTM-060: should publish draft template successfully', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.publish('template-001');

      expect(result.status).toBe(TemplateStatus.PUBLISHED);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-061: should throw when template is already published', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      await expect(service.publish('template-001')).rejects.toThrow(BadRequestException);
      await expect(service.publish('template-001')).rejects.toThrow('模板已发布，不可重复发布');
    });

    it('TC-DTM-062: should throw when template has no variables', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
        variables: [],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      await expect(service.publish('template-001')).rejects.toThrow(BadRequestException);
      await expect(service.publish('template-001')).rejects.toThrow('模板没有变量定义，无法发布');
    });
  });

  // ==================== deprecate ====================
  describe('deprecate', () => {
    it('TC-DTM-070: should deprecate template successfully', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.deprecate('template-001');

      expect(result.status).toBe(TemplateStatus.DEPRECATED);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-071: should throw when template is already deprecated', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'deprecated',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      await expect(service.deprecate('template-001')).rejects.toThrow(BadRequestException);
      await expect(service.deprecate('template-001')).rejects.toThrow('模板已弃用');
    });

    it('TC-DTM-072: should deprecate draft template too', async () => {
      const template = makeLoadedTemplate({
        id: 'template-001',
        status: 'draft',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(template);

      const result = await service.deprecate('template-001');

      expect(result.status).toBe(TemplateStatus.DEPRECATED);
    });
  });

  // ==================== clone ====================
  describe('clone', () => {
    it('TC-DTM-080: should clone template with incremented version', async () => {
      const source = makeLoadedTemplate({
        id: 'template-001',
        name: '温度采集模板',
        version: '1.0',
        status: 'published',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(source);

      const result = await service.clone('template-001', 'author-002');

      expect(result.version).toBe('1.1');
      expect(result.name).toContain('v1.1');
      expect(result.status).toBe(TemplateStatus.DRAFT);
      expect(result.isDefault).toBe(false);
      expect(result.linkedDevices).toBe(0);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('TC-DTM-081: should handle default version when not set', async () => {
      const source = makeLoadedTemplate({
        id: 'template-001',
        name: '测试模板',
        version: '1.0',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(source);

      const result = await service.clone('template-001', 'author-002');

      expect(result.version).toBe('1.1');
    });

    it('TC-DTM-082: should throw NotFoundException when source template not found', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(null);

      await expect(service.clone('non-existent', 'author-001')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== apply ====================
  describe('apply', () => {
    it('TC-DTM-090: should apply template to device successfully', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        version: '1.0',
        deviceType: 'modbus_tcp',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32', scanRate: 1000 },
        ] as TemplateVariable[],
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: null as any,
        templateVersion: null as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);
      mockTagRepo.find!.mockResolvedValue([]);
      const newTag = makeTag({ id: 'tag-new', name: 'temperature', deviceId: 'device-001' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockDeviceRepo.save!.mockResolvedValue(device);
      mockDeviceRepo.count!.mockResolvedValue(1);

      const result = await service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' });

      expect(result.deviceId).toBe('device-001');
      expect(result.templateVersion).toBe('1.0');
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDeviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'template-001', templateVersion: '1.0' }),
      );
    });

    it('TC-DTM-091: should throw when applying deprecated template', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'deprecated',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);

      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        '已弃用的模板无法应用',
      );
    });

    it('TC-DTM-092: should throw when device not found', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-999' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-999' })).rejects.toThrow(
        '设备不存在',
      );
    });

    it('TC-DTM-093: should throw when device type mismatch', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        deviceType: 'modbus_tcp',
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'opc_ua' as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);

      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        '模板设备类型与目标设备不匹配',
      );
    });

    it('TC-DTM-094: should throw when device already bound to another template', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        deviceType: 'modbus_tcp',
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: 'template-other',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);

      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' })).rejects.toThrow(
        '设备已关联其他模板',
      );
    });

    it('TC-DTM-095: should replace existing tags when replaceExisting is true', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        version: '1.0',
        deviceType: 'modbus_tcp',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: null as any,
      });
      const existingTag = makeTag({
        id: 'old-tag',
        name: 'temperature',
        address: '40001',
        deviceId: 'device-001',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);
      mockTagRepo.find!.mockResolvedValue([existingTag]);
      const newTag = makeTag({ id: 'new-tag', name: 'temperature', deviceId: 'device-001' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockTagRepo.delete!.mockResolvedValue({ affected: 1 } as any);
      mockDeviceRepo.save!.mockResolvedValue(device);
      mockDeviceRepo.count!.mockResolvedValue(1);

      const result = await service.apply('template-001', {
        projectId: 'project-001',
        deviceId: 'device-001',
        replaceExisting: true,
      });

      expect(mockTagRepo.delete).toHaveBeenCalledWith('old-tag');
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('TC-DTM-096: should skip existing tags when replaceExisting is false', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        version: '1.0',
        deviceType: 'modbus_tcp',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: null as any,
      });
      const existingTag = makeTag({
        id: 'old-tag',
        name: 'temperature',
        address: '40001',
        deviceId: 'device-001',
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);
      mockTagRepo.find!.mockResolvedValue([existingTag]);
      mockDeviceRepo.save!.mockResolvedValue(device);
      mockDeviceRepo.count!.mockResolvedValue(1);

      const result = await service.apply('template-001', {
        projectId: 'project-001',
        deviceId: 'device-001',
        replaceExisting: false,
      });

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockTagRepo.delete).not.toHaveBeenCalled();
    });

    it('TC-DTM-097: should bind template to device after applying', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        version: '2.0',
        deviceType: 'modbus_tcp',
        variables: [] as TemplateVariable[],
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: null as any,
        templateVersion: null as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);
      mockTagRepo.find!.mockResolvedValue([]);
      mockDeviceRepo.save!.mockResolvedValue(device);
      mockDeviceRepo.count!.mockResolvedValue(1);

      await service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' });

      expect(mockDeviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'template-001', templateVersion: '2.0' }),
      );
    });

    it('TC-DTM-098: should handle tag creation errors gracefully', async () => {
      const loadedTemplate = makeLoadedTemplate({
        id: 'template-001',
        status: 'published',
        version: '1.0',
        deviceType: 'modbus_tcp',
        variables: [
          { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      const device = makeDevice({
        id: 'device-001',
        type: 'modbus_tcp' as any,
        templateId: null as any,
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTemplate);
      mockDeviceRepo.findOne!.mockResolvedValue(device);
      mockTagRepo.find!.mockResolvedValue([]);
      mockTagRepo.create!.mockReturnValue(makeTag({ id: 'tag-new', name: 'temperature' }));
      mockTagRepo.save!.mockRejectedValue(new Error('Database error'));
      mockDeviceRepo.save!.mockResolvedValue(device);
      mockDeviceRepo.count!.mockResolvedValue(1);

      const result = await service.apply('template-001', { projectId: 'project-001', deviceId: 'device-001' });

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].name).toBe('temperature');
      expect(result.errors[0].message).toBe('Database error');
    });
  });

  // ==================== getAllTags ====================
  describe('getAllTags', () => {
    it('TC-DTM-110: should return all unique tags sorted alphabetically', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 't-1', tags: ['modbus', 'temperature'] }),
        makeLoadedTemplate({ id: 't-2', tags: ['plc', 'temperature', 'siemens'] }),
        makeLoadedTemplate({ id: 't-3', tags: ['opc', 'plc'] }),
      ]);

      const result = await service.getAllTags();

      expect(result).toEqual(['modbus', 'opc', 'plc', 'siemens', 'temperature']);
    });

    it('TC-DTM-111: should return empty array when no templates exist', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([]);

      const result = await service.getAllTags();

      expect(result).toEqual([]);
    });

    it('TC-DTM-112: should handle templates with no tags', async () => {
      mockTemplateLoader.getAllTemplates.mockReturnValue([
        makeLoadedTemplate({ id: 't-1', tags: [] }),
        makeLoadedTemplate({ id: 't-2', tags: ['plc'] }),
        makeLoadedTemplate({ id: 't-3', tags: undefined as any }),
      ]);

      const result = await service.getAllTags();

      expect(result).toEqual(['plc']);
    });
  });

  // ==================== sync ====================
  describe('sync', () => {
    it('TC-DTM-100: should sync to all devices bound to template', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const devices = [
        makeDevice({ id: 'device-001', templateId: 'template-001' }),
        makeDevice({ id: 'device-002', templateId: 'template-001' }),
      ];
      mockDeviceRepo.find!.mockResolvedValue(devices);
      mockTagRepo.find!.mockResolvedValue([]);
      const newTag1 = makeTag({ id: 'tag-1', name: 'temperature', deviceId: 'device-001' });
      const newTag2 = makeTag({ id: 'tag-2', name: 'temperature', deviceId: 'device-002' });
      mockTagRepo.create!.mockReturnValueOnce(newTag1).mockReturnValueOnce(newTag2);
      mockTagRepo.save!.mockResolvedValue(newTag1);
      mockDeviceRepo.save!.mockResolvedValue(devices[0]);

      const result = await service.sync('template-001', {});

      expect(result.totalDevices).toBe(2);
      expect(result.synced).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('TC-DTM-101: should sync to specific devices when deviceIds provided', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([]);
      const newTag = makeTag({ id: 'tag-1', name: 'temperature', deviceId: 'device-001' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { projectId: 'project-001', deviceIds: ['device-001'] });

      expect(result.totalDevices).toBe(1);
      expect(result.synced).toBe(1);
      expect(mockDeviceRepo.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object) },
      });
    });

    it('TC-DTM-102: should force overwrite existing tags when forceOverwrite is true', async () => {
      const TEMP_GUID = 'guid-temp-001';
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: TEMP_GUID, order: 1, name: 'temperature', address: '40002', dataType: 'int32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      const existingTag = makeTag({
        id: 'tag-existing',
        name: 'temperature',
        address: '40001',
        dataType: TagDataType.FLOAT32,
        deviceId: 'device-001',
        templateVariableGuid: TEMP_GUID,
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([existingTag]);
      mockTagRepo.save!.mockResolvedValue(existingTag);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: true });

      expect(result.synced).toBe(1);
      expect(mockTagRepo.save).toHaveBeenCalled();
      // The existing tag should be updated (not created new)
      expect(mockTagRepo.create).not.toHaveBeenCalled();
    });

    it('TC-DTM-103: should not overwrite when forceOverwrite is false and tag exists', async () => {
      const TEMP_GUID = 'guid-temp-002';
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: TEMP_GUID, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      const existingTag = makeTag({
        id: 'tag-existing',
        name: 'temperature',
        address: '40001',
        deviceId: 'device-001',
        templateVariableGuid: TEMP_GUID,
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([existingTag]);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: false });

      expect(result.synced).toBe(1);
      // Should not save existing tag (no overwrite)
      expect(mockTagRepo.save).not.toHaveBeenCalled();
      expect(mockTagRepo.create).not.toHaveBeenCalled();
    });

    it('TC-DTM-104: should handle per-device errors gracefully', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const devices = [
        makeDevice({ id: 'device-001', templateId: 'template-001' }),
        makeDevice({ id: 'device-002', templateId: 'template-001' }),
      ];
      mockDeviceRepo.find!.mockResolvedValue(devices);

      // First device: tagRepo.find throws error
      mockTagRepo.find!.mockRejectedValueOnce(new Error('DB error'));
      // Second device: works fine
      mockTagRepo.find!.mockResolvedValueOnce([]);
      const newTag = makeTag({ id: 'tag-2', name: 'temperature', deviceId: 'device-002' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockDeviceRepo.save!.mockResolvedValue(devices[1]);

      const result = await service.sync('template-001', {});

      expect(result.totalDevices).toBe(2);
      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].deviceId).toBe('device-001');
      expect(result.errors[0].message).toBe('DB error');
    });

    it('TC-DTM-105: should handle empty devices list', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [] as TemplateVariable[],
        }),
      );
      mockDeviceRepo.find!.mockResolvedValue([]);

      const result = await service.sync('template-001', {});

      expect(result.totalDevices).toBe(0);
      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('TC-DTM-106: should update device templateVersion after sync', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({
        id: 'device-001',
        templateId: 'template-001',
        templateVersion: '0.9',
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([]);
      const newTag = makeTag({ id: 'tag-1', name: 'temperature', deviceId: 'device-001' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockDeviceRepo.save!.mockResolvedValue(device);

      await service.sync('template-001', {});

      expect(mockDeviceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ templateVersion: '1.0' }),
      );
    });
  });

  // ============================================================
  // P6-11: Phase 6 — GUID 匹配 + 孤儿删除 + 批量通知 + 存量迁移
  // ============================================================

  describe('sync - Phase 6: GUID matching & orphan deletion', () => {
    const G_TEMP = 'guid-550e8400-e29b-41d4-a716-446655440001';
    const G_HUM = 'guid-550e8400-e29b-41d4-a716-446655440002';

    it('TC-DTM-120: should update tag by GUID match when variable renamed', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: G_TEMP, order: 1, name: 'temperature_new', address: '40001', dataType: 'float32' },
            { guid: G_HUM, order: 2, name: 'humidity', address: '40002', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      const oldTempTag = makeTag({
        id: 'tag-1',
        name: 'temperature',
        address: '40001',
        deviceId: 'device-001',
        templateVariableGuid: G_TEMP,
      });
      const oldHumTag = makeTag({
        id: 'tag-2',
        name: 'humidity',
        address: '40002',
        deviceId: 'device-001',
        templateVariableGuid: G_HUM,
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([oldTempTag, oldHumTag]);
      mockTagRepo.save!.mockResolvedValue(oldTempTag);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: true });

      expect(result.synced).toBe(1);
      // tag-1 (temperature → temperature_new) should be updated by GUID
      expect(mockTagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-1',
          name: 'temperature_new',
        }),
      );
      // No new tags created
      expect(mockTagRepo.create).not.toHaveBeenCalled();
      // No orphans removed
      expect(mockTagRepo.remove).not.toHaveBeenCalled();
    });

    it('TC-DTM-121: should delete orphan tags when variable removed from template', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
            // humidity removed
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      const tempTag = makeTag({
        id: 'tag-1', name: 'temperature', deviceId: 'device-001',
        templateVariableGuid: G_TEMP,
      });
      const humTag = makeTag({
        id: 'tag-2', name: 'humidity', deviceId: 'device-001',
        templateVariableGuid: G_HUM, // orphan: G_HUM not in template
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([tempTag, humTag]);
      mockTagRepo.save!.mockResolvedValue(tempTag);
      mockTagRepo.remove!.mockResolvedValue(null as any);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: false });

      expect(result.synced).toBe(1);
      // Orphan tag should be removed
      expect(mockTagRepo.remove).toHaveBeenCalledWith([humTag]);
    });

    it('TC-DTM-122: should NOT affect manual tags (templateVariableGuid=null)', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      const templateTag = makeTag({
        id: 'tag-template', name: 'temperature', deviceId: 'device-001',
        templateVariableGuid: G_TEMP,
      });
      const manualTag = makeTag({
        id: 'tag-manual', name: 'manual_value', deviceId: 'device-001',
        templateVariableGuid: null, // ★ 手动创建的标签
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      // mockTagRepo.find had { where: { deviceId, templateVariableGuid: Not(IsNull()) } }
      // so it only returns tags with non-null guid
      mockTagRepo.find!.mockResolvedValue([templateTag]);
      mockTagRepo.save!.mockResolvedValue(templateTag);
      mockTagRepo.remove!.mockResolvedValue(null as any);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: false });

      expect(result.synced).toBe(1);
      // Manual tag should not be affected (not in find result, not in remove)
      expect(mockTagRepo.remove).not.toHaveBeenCalled();
    });

    it('TC-DTM-123: should add new tag when variable GUID not in existing tags', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
            { guid: G_HUM, order: 2, name: 'humidity', address: '40002', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      // Only temperature exists, humidity (G_HUM) is new
      const tempTag = makeTag({
        id: 'tag-1', name: 'temperature', deviceId: 'device-001',
        templateVariableGuid: G_TEMP,
      });
      const newHumTag = makeTag({
        id: 'tag-new', name: 'humidity', deviceId: 'device-001',
        templateVariableGuid: G_HUM,
      });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      mockTagRepo.find!.mockResolvedValue([tempTag]);
      mockTagRepo.create!.mockReturnValue(newHumTag);
      mockTagRepo.save!.mockResolvedValueOnce(tempTag).mockResolvedValueOnce(newHumTag);
      mockTagRepo.remove!.mockResolvedValue(null as any);
      mockDeviceRepo.save!.mockResolvedValue(device);

      const result = await service.sync('template-001', { forceOverwrite: false });

      expect(result.synced).toBe(1);
      expect(mockTagRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'humidity',
          templateVariableGuid: G_HUM,
        }),
      );
    });

    it('TC-DTM-124: should batch emit template.devices-synced per projectId', async () => {
      const mockEventBus = { emit: jest.fn() };
      const svc = new DeviceTemplateService(
        mockConfigService as any,
        mockProjectDbService as any,
        mockTemplateLoader as any,
        mockIndexService as any,
        mockEventBus as any,
      );

      mockTemplateLoader.getTemplate.mockReturnValue(
        makeLoadedTemplate({
          id: 'template-001',
          version: '1.0',
          variables: [
            { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
          ] as TemplateVariable[],
        }),
      );
      // 3 devices: 2 in project-A, 1 in project-B
      const dev1 = makeDevice({ id: 'device-001', templateId: 'template-001', projectId: 'project-A', type: 'modbus_tcp' as any });
      const dev2 = makeDevice({ id: 'device-002', templateId: 'template-001', projectId: 'project-A', type: 'modbus_tcp' as any });
      const dev3 = makeDevice({ id: 'device-003', templateId: 'template-001', projectId: 'project-B', type: 'modbus_tcp' as any });

      // Mock discoverProjects to return project-A and project-B
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'project-A', isDirectory: () => true },
        { name: 'project-B', isDirectory: () => true },
      ] as fs.Dirent[]);

      // Per-project device lookup
      let callIndex = 0;
      mockDeviceRepo.find!.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return Promise.resolve([dev1, dev2]); // project-A
        return Promise.resolve([dev3]); // project-B
      });

      mockTagRepo.find!.mockResolvedValue([]);
      const newTag = makeTag({ id: 'tag-new', name: 'temperature' });
      mockTagRepo.create!.mockReturnValue(newTag);
      mockTagRepo.save!.mockResolvedValue(newTag);
      mockTagRepo.remove!.mockResolvedValue(null as any);
      mockDeviceRepo.save!.mockResolvedValue(dev1);

      const result = await svc.sync('template-001', {});

      expect(result.totalDevices).toBe(3);
      expect(result.synced).toBe(3);
      // emit called twice (project-A + project-B)
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
      // project-A: 2 devices
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'template.devices-synced',
        expect.objectContaining({
          templateId: 'template-001',
          deviceIds: ['device-001', 'device-002'],
          projectId: 'project-A',
        }),
      );
      // project-B: 1 device
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'template.devices-synced',
        expect.objectContaining({
          templateId: 'template-001',
          deviceIds: ['device-003'],
          projectId: 'project-B',
        }),
      );
    });
  });

  // ============================================================
  // P6-5: 存量迁移测试
  // ============================================================

  describe('migrateTemplateGuids', () => {
    const G_TEMP = 'guid-temp-mig-001';

    it('TC-DTM-130: should match by name and backfill guid (dryRun)', async () => {
      const loadedTpl = makeLoadedTemplate({
        id: 'template-001',
        version: '1.0',
        variables: [
          { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTpl);
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      const nullTag = makeTag({
        id: 'tag-old',
        name: 'temperature',
        deviceId: 'device-001',
        templateVariableGuid: null,
      });
      mockTagRepo.find!.mockResolvedValue([nullTag]);

      const result = await service.migrateTemplateGuids({ dryRun: true });

      expect(result.matched).toBe(1);
      expect(result.errors).toHaveLength(0);
      // dryRun: should not save
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it('TC-DTM-131: should backfill guid on actual run', async () => {
      const loadedTpl = makeLoadedTemplate({
        id: 'template-001',
        version: '1.0',
        variables: [
          { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTpl);
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      const nullTag = makeTag({
        id: 'tag-old',
        name: 'temperature',
        deviceId: 'device-001',
        templateVariableGuid: null,
      });
      mockTagRepo.find!.mockResolvedValue([nullTag]);
      mockTagRepo.save!.mockResolvedValue(nullTag);

      const result = await service.migrateTemplateGuids({ dryRun: false });

      expect(result.matched).toBe(1);
      expect(mockTagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tag-old',
          templateVariableGuid: G_TEMP,
        }),
      );
    });

    it('TC-DTM-132: should be idempotent (skip already-migrated tags)', async () => {
      const loadedTpl = makeLoadedTemplate({
        id: 'template-001',
        version: '1.0',
        variables: [
          { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTpl);
      const device = makeDevice({ id: 'device-001', templateId: 'template-001' });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      // tag already has guid → Not(IsNull()) → not returned by find with IsNull()
      mockTagRepo.find!.mockResolvedValue([]);

      const result = await service.migrateTemplateGuids({ dryRun: false });

      expect(result.matched).toBe(0);
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it('TC-DTM-133: should skip device gracefully when template not found', async () => {
      mockTemplateLoader.getTemplate.mockReturnValue(null);
      const device = makeDevice({ id: 'device-001', templateId: 'template-not-found' });
      mockDeviceRepo.find!.mockResolvedValue([device]);

      const result = await service.migrateTemplateGuids({ dryRun: false });

      // template not found → device skipped without error
      expect(result.skipped).toBe(1);
      expect(result.matched).toBe(0);
    });

    it('TC-DTM-134: should filter only specific template when templateId is passed', async () => {
      const loadedTpl = makeLoadedTemplate({
        id: 'template-specific',
        version: '1.0',
        variables: [
          { guid: G_TEMP, order: 1, name: 'temperature', address: '40001', dataType: 'float32' },
        ] as TemplateVariable[],
      });
      mockTemplateLoader.getTemplate.mockReturnValue(loadedTpl);
      // Only one device matches the specific template
      const device = makeDevice({ id: 'device-001', templateId: 'template-specific' });
      mockDeviceRepo.find!.mockResolvedValue([device]);
      const nullTag = makeTag({
        id: 'tag-old', name: 'temperature', deviceId: 'device-001',
        templateVariableGuid: null,
      });
      mockTagRepo.find!.mockResolvedValue([nullTag]);
      mockTagRepo.save!.mockResolvedValue(nullTag);

      const result = await service.migrateTemplateGuids({
        templateId: 'template-specific',
        dryRun: false,
      });

      expect(result.totalDevices).toBe(1);
      expect(result.matched).toBe(1);
      // deviceRepo.find was called with the filtered templateId
      expect(mockDeviceRepo.find).toHaveBeenCalledWith({
        where: { templateId: 'template-specific' },
      });
    });
  });
});
