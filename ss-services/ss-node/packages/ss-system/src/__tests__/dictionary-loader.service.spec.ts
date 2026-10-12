// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import { PathResolverService } from '@ss-node/ss-core';
import { DictionaryLoaderService, DictTable } from '../dict/dictionary-loader.service';

// Mock fs module
jest.mock('fs');
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  };
});

describe('DictionaryLoaderService - CRUD', () => {
  let service: DictionaryLoaderService;
  const basePath = '/mock/dicts';

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'DICTS_PATH') return basePath;
      return defaultValue;
    }),
  };

  const sampleTable: DictTable = {
    dictId: 'protocolType',
    dictName: '协议类型',
    category: 'basic-data',
    description: '通信协议类型',
    version: '1.0',
    sortOrder: 1,
    items: [
      { value: 'modbus_tcp', label: 'Modbus TCP', sortOrder: 1, description: '' },
      { value: 'modbus_rtu', label: 'Modbus RTU', sortOrder: 2, description: '' },
    ],
  };

  const sampleJsonString = JSON.stringify(sampleTable);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: nothing exists, read returns sample JSON, write succeeds
    // @ts-expect-error - testing error case
    fs.existsSync.mockReturnValue(false);
    // @ts-expect-error - testing error case
    fs.mkdirSync.mockReturnValue(undefined);
    // @ts-expect-error - testing error case
    fs.renameSync.mockReturnValue(undefined);
    // @ts-expect-error - testing error case
    fs.rmSync.mockReturnValue(undefined);
    // @ts-expect-error - testing error case
    fs.unlinkSync.mockReturnValue(undefined);
    // @ts-expect-error - testing error case
    fs.writeFileSync.mockReturnValue(undefined);
    // Return STRING (not Buffer) since readFileSync with 'utf-8' returns string
    // @ts-expect-error - testing error case
    fs.readFileSync.mockReturnValue(sampleJsonString);
    // @ts-expect-error - testing error case
    fs.readdirSync.mockReturnValue([]);

    const mockPathResolverService = {
      resolve: jest.fn((p: string) => p),
      getProjectRoot: jest.fn().mockReturnValue('/fake/project-root'),
    };
    service = new DictionaryLoaderService(mockConfigService as any, mockPathResolverService as any);
  });

  // ==================== 分类 CRUD ====================

  describe('createCategory()', () => {
    it('should create a directory for the new category', () => {
      service.createCategory('zh-CN', 'new-category');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('new-category'), {
        recursive: true,
      });
    });

    it('should throw when category already exists', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);

      expect(() => service.createCategory('zh-CN', 'existing-cat')).toThrow('已存在');
    });
  });

  describe('renameCategory()', () => {
    it('should rename the directory', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockImplementation((p: string) => p.includes('old-name'));

      service.renameCategory('zh-CN', 'old-name', 'new-name');

      expect(fs.renameSync).toHaveBeenCalledWith(
        expect.stringContaining('old-name'),
        expect.stringContaining('new-name'),
      );
    });

    it('should throw when the old category does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      expect(() => service.renameCategory('zh-CN', 'nonexistent', 'new-name')).toThrow('不存在');
    });

    it('should throw when the new category name already exists', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockImplementation((p: string) => {
        // Both old and new paths should exist
        if (p.includes('old-name')) return true;
        if (p.includes('existing-name')) return true;
        return false;
      });

      expect(() => service.renameCategory('zh-CN', 'old-name', 'existing-name')).toThrow('已存在');
    });
  });

  describe('deleteCategory()', () => {
    it('should delete the directory recursively', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);

      service.deleteCategory('zh-CN', 'to-delete');

      expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('to-delete'), {
        recursive: true,
        force: true,
      });
    });

    it('should throw when the category does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      expect(() => service.deleteCategory('zh-CN', 'nonexistent')).toThrow('不存在');
    });
  });

  // ==================== 字典表 CRUD ====================

  describe('createTable()', () => {
    it('should create a JSON file for the new table', () => {
      // toFileName('protocolType') → 'protocol-type'
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      service.createTable('zh-CN', 'basic-data', sampleTable);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('protocol-type.json'),
        expect.any(String),
        'utf-8',
      );
      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictId).toBe('protocolType');
      expect(parsed.items).toHaveLength(2);
    });

    it('should throw when the table already exists', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);

      expect(() => service.createTable('zh-CN', 'basic-data', sampleTable)).toThrow('已存在');
    });

    it('should create the category directory when it does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      service.createTable('zh-CN', 'new-category', sampleTable);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('new-category'), {
        recursive: true,
      });
    });
  });

  describe('updateTable()', () => {
    it('should merge updates into existing table and write back', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(sampleJsonString); // string with 'utf-8'

      service.updateTable('zh-CN', 'basic-data', 'protocolType', {
        dictName: 'Updated Protocol Types',
        description: 'Updated description',
      });

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictName).toBe('Updated Protocol Types');
      expect(parsed.description).toBe('Updated description');
      expect(parsed.dictId).toBe('protocolType');
      expect(parsed.items).toHaveLength(2);
      expect(parsed.version).toBe('1.0');
    });

    it('should update items array', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(sampleJsonString);

      const newItems = [
        { value: 'new_proto', label: 'New Protocol', sortOrder: 3, description: '' },
      ];

      service.updateTable('zh-CN', 'basic-data', 'protocolType', { items: newItems } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.items).toEqual(newItems);
    });

    it('should keep original dictId even if table body tries to change it', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(sampleJsonString);

      service.updateTable('zh-CN', 'basic-data', 'protocolType', { dictId: 'newId' } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictId).toBe('protocolType');
    });

    it('should throw when table file does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      expect(() =>
        service.updateTable('zh-CN', 'basic-data', 'nonexistent', { dictName: 'x' }),
      ).toThrow('不存在');
    });
  });

  describe('deleteTable()', () => {
    it('should delete the JSON file', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);

      service.deleteTable('zh-CN', 'basic-data', 'protocolType');

      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('protocol-type.json'));
    });

    it('should throw when the table file does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      expect(() => service.deleteTable('zh-CN', 'basic-data', 'nonexistent')).toThrow('不存在');
    });
  });

  describe('exportTable()', () => {
    it('should return parsed table data', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(sampleJsonString);

      const result = service.exportTable('zh-CN', 'basic-data', 'protocolType');

      expect(result.dictId).toBe('protocolType');
      expect(result.items).toHaveLength(2);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('protocol-type.json'),
        'utf-8',
      );
    });

    it('should handle BOM in JSON file', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      const bom = '\uFEFF';
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(bom + sampleJsonString);

      const result = service.exportTable('zh-CN', 'basic-data', 'protocolType');

      expect(result.dictId).toBe('protocolType');
      expect(result.items).toHaveLength(2);
    });

    it('should throw when table file does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      expect(() => service.exportTable('zh-CN', 'basic-data', 'nonexistent')).toThrow('不存在');
    });
  });

  describe('importTable()', () => {
    it('should write the table JSON file', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      service.importTable('zh-CN', 'imported-cat', 'newDict', sampleTable);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('new-dict.json'),
        expect.any(String),
        'utf-8',
      );
      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictId).toBe('protocolType');
    });

    it('should create the category directory if it does not exist', () => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(false);

      service.importTable('zh-CN', 'brand-new-cat', 'testDict', sampleTable);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('brand-new-cat'), {
        recursive: true,
      });
    });
  });

  // ==================== toFileName 边界测试（通过 updateTable 间接测试） ====================

  describe('toFileName (via updateTable — camelCase to kebab-case)', () => {
    beforeEach(() => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(sampleJsonString);
    });

    it('TC-DICT-FN-001: deviceType → device-type.json', () => {
      service.updateTable('zh-CN', 'basic-data', 'deviceType', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('device-type.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('TC-DICT-FN-002: deviceTypes → device-types.json', () => {
      service.updateTable('zh-CN', 'basic-data', 'deviceTypes', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('device-types.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('TC-DICT-FN-003: simpleword → simpleword.json (no camelCase)', () => {
      service.updateTable('zh-CN', 'basic-data', 'simpleword', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('simpleword.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('TC-DICT-FN-004: ABC → abc.json (all uppercase)', () => {
      service.updateTable('zh-CN', 'basic-data', 'ABC', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('abc.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('TC-DICT-FN-005: myCustomDictName → my-custom-dict-name.json', () => {
      service.updateTable('zh-CN', 'basic-data', 'myCustomDictName', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-custom-dict-name.json'),
        expect.any(String),
        'utf-8',
      );
    });

    it('TC-DICT-FN-006: deviceType with en-US locale', () => {
      service.updateTable('en-US', 'basic-data', 'deviceType', { dictName: 'Test' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('device-type.json'),
        expect.any(String),
        'utf-8',
      );
    });
  });

  // ==================== updateTable 完整流程测试 ====================

  describe('updateTable — full flow with deviceType scenario', () => {
    const deviceTypeTable: DictTable = {
      dictId: 'deviceType',
      dictName: '设备类型',
      category: 'basic-data',
      description: '设备类型字典',
      version: '1.0',
      sortOrder: 1,
      items: [
        { value: 'modbus_tcp', label: 'Modbus TCP', sortOrder: 1, description: '' },
        { value: 'opc_ua', label: 'OPC UA', sortOrder: 2, description: '' },
      ],
    };

    beforeEach(() => {
      // @ts-expect-error - testing error case
      fs.existsSync.mockReturnValue(true);
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(JSON.stringify(deviceTypeTable));
    });

    it('TC-DICT-FLOW-001: should update dictName and preserve items', () => {
      service.updateTable('zh-CN', 'basic-data', 'deviceType', {
        dictName: '设备类型(更新)',
      });

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictId).toBe('deviceType');
      expect(parsed.dictName).toBe('设备类型(更新)');
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].value).toBe('modbus_tcp');
    });

    it('TC-DICT-FLOW-002: should add a new item', () => {
      const newItem = { value: 'mqtt', label: 'MQTT', sortOrder: 3, description: '' };
      const newItems = [...deviceTypeTable.items, newItem];

      service.updateTable('zh-CN', 'basic-data', 'deviceType', { items: newItems } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items[2].value).toBe('mqtt');
    });

    it('TC-DICT-FLOW-003: should update an existing item', () => {
      const updatedItems = deviceTypeTable.items.map((item) =>
        item.value === 'modbus_tcp' ? { ...item, label: 'Modbus TCP (Updated)' } : item,
      );

      service.updateTable('zh-CN', 'basic-data', 'deviceType', { items: updatedItems } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.items[0].label).toBe('Modbus TCP (Updated)');
    });

    it('TC-DICT-FLOW-004: should delete an item', () => {
      const filteredItems = deviceTypeTable.items.filter((item) => item.value !== 'opc_ua');

      service.updateTable('zh-CN', 'basic-data', 'deviceType', { items: filteredItems } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].value).toBe('modbus_tcp');
    });

    it('TC-DICT-FLOW-005: should not allow dictId to change in update', () => {
      service.updateTable('zh-CN', 'basic-data', 'deviceType', { dictId: 'newDeviceType' } as any);

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      // dictId in file always equals the route param dictId
      expect(parsed.dictId).toBe('deviceType');
    });

    it('TC-DICT-FLOW-006: should handle BOM in existing file', () => {
      const bom = '\uFEFF';
      // @ts-expect-error - testing error case
      fs.readFileSync.mockReturnValue(bom + JSON.stringify(deviceTypeTable));

      service.updateTable('zh-CN', 'basic-data', 'deviceType', { description: 'With BOM' });

      const writeArg = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writeArg);
      expect(parsed.dictId).toBe('deviceType');
      expect(parsed.description).toBe('With BOM');
    });
  });
});
