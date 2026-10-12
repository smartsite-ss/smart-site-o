// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import * as fs from 'fs';
import { TemplateLoaderService } from '../template/template-loader.service';

// Mock fs and the logger
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

const mockIndexJson = {
  schemaVersion: '2.0',
  lastUpdated: '2026-06-09T00:00:00.000Z',
  totalTemplates: 3,
  totalIndustries: 2,
  totalCategories: 3,
  description: 'Test index',
  rootPath: '/tmp/test-templates',
  industries: [
    {
      name: '工业自动化',
      description: 'Test industry',
      icon: 'factory',
      categories: [
        {
          name: 'PLC控制器',
          description: 'PLC category',
          templates: [
            {
              id: 'tpl-s7-1200',
              name: '西门子 S7-1200',
              relativePath: '工业自动化/PLC控制器/siemens-s7-1200.json',
              deviceType: 'modbus_tcp',
              deviceModel: 'SIEMENS_S7_1200',
              version: '1.0.0',
              status: 'published',
              isDefault: true,
              variableCount: 10,
              tags: ['西门子', 'S7-1200', 'PLC'],
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
            {
              id: 'tpl-mitsubishi',
              name: '三菱 FX5U',
              relativePath: '工业自动化/PLC控制器/mitsubishi-fx5u.json',
              deviceType: 'modbus_tcp',
              deviceModel: 'MITSUBISHI_FX5U',
              version: '1.0.0',
              status: 'planned',
              isDefault: false,
              variableCount: 0,
              tags: ['三菱', 'FX5U', 'PLC'],
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
          ],
        },
      ],
    },
    {
      name: '能源电力',
      description: 'Energy industry',
      icon: 'bolt',
      categories: [
        {
          name: '电能计量',
          description: 'Power meter',
          templates: [
            {
              id: 'tpl-meter',
              name: '三相电表',
              relativePath: '能源电力/电能计量/meter.json',
              deviceType: 'opc_ua',
              deviceModel: 'THREE_PHASE_METER',
              version: '1.0.0',
              status: 'published',
              isDefault: true,
              variableCount: 12,
              tags: ['电表', '三相', 'OPC UA'],
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
          ],
        },
      ],
    },
  ],
};

// Returns different template data depending on file path
function getTemplateDataByPath(filePath: string): object {
  if (filePath.includes('siemens-s7-1200.json')) {
    return {
      name: '西门子 S7-1200 通用采集模板',
      description: '西门子 S7-1200 标准采集配置',
      variables: [
        { name: 'temperature', address: '40001', dataType: 'float32', scanRate: 1000 },
        { name: 'pressure', address: '40003', dataType: 'float32', scanRate: 1000 },
      ],
    };
  }
  if (filePath.includes('mitsubishi-fx5u.json')) {
    return {
      name: '三菱 FX5U 采集模板',
      description: '三菱 MELSEC FX5U 采集配置',
      variables: [{ name: 'speed', address: 'D100', dataType: 'int32', scanRate: 500 }],
    };
  }
  if (filePath.includes('meter.json')) {
    return {
      name: '三相电表采集模板',
      description: '三相多功能电表 Modbus 采集配置',
      variables: [
        { name: 'voltage_a', address: '30001', dataType: 'float32' },
        { name: 'current_a', address: '30003', dataType: 'float32' },
      ],
    };
  }
  return { name: '未知模板', description: '', variables: [] };
}

describe('TemplateLoaderService', () => {
  let service: TemplateLoaderService;
  let mockIndexService: any;

  const TEST_BASE_PATH = '/tmp/test-templates';

  beforeEach(() => {
    jest.clearAllMocks();

    mockIndexService = {
      getBasePath: jest.fn().mockReturnValue(TEST_BASE_PATH),
      loadIndex: jest.fn().mockReturnValue(null),
      rebuildIndex: jest.fn().mockReturnValue(mockIndexJson),
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string, _encoding?: string) => {
      if (filePath.endsWith('index.json')) {
        return JSON.stringify(mockIndexJson);
      }
      return JSON.stringify(getTemplateDataByPath(filePath));
    });
    // Mock readdirSync for loadAllLocales: return a zh-CN locale directory entry
    (fs.readdirSync as jest.Mock).mockReturnValue([{ name: 'zh-CN', isDirectory: () => true }]);
    service = new TemplateLoaderService(mockIndexService);
  });

  describe('reload', () => {
    it('TC-LOAD-001: should load templates from index.json successfully', async () => {
      await service.reload();

      const templates = service.getAllTemplates();
      expect(templates.length).toBe(3);
      // Templates are ordered by industry/category iteration order
      const ids = templates.map((t) => t.id);
      expect(ids).toContain('tpl-s7-1200');
      expect(ids).toContain('tpl-mitsubishi');
      expect(ids).toContain('tpl-meter');
    });

    it('TC-LOAD-002: should set cache statistics correctly', async () => {
      await service.reload();

      const stats = service.getCacheStats();
      expect(stats.count).toBe(3);
      expect(stats.deviceTypes).toContain('modbus_tcp');
      expect(stats.deviceTypes).toContain('opc_ua');
      expect(stats.industries).toContain('工业自动化');
      expect(stats.industries).toContain('能源电力');
    });

    it('TC-LOAD-003: should create empty index when locale index.json does not exist', async () => {
      // Mock: index.json does not exist for the locale directory
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('index.json')) return false;
        return true;
      });

      await service.reload();

      // Service creates an empty index when index.json is missing (no auto-rebuild)
      const index = service.getIndex();
      expect(index).toBeDefined();
      expect(index!.totalTemplates).toBe(0);
      expect(index!.industries).toEqual([]);
      expect(service.getAllTemplates()).toHaveLength(0);
    });

    it('TC-LOAD-004: should clear cache before reloading', async () => {
      await service.reload();
      expect(service.getAllTemplates()).toHaveLength(3);

      // Reload with no locale directories (simulating empty templates root)
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await service.reload();
      expect(service.getAllTemplates()).toHaveLength(0);
    });

    it('TC-LOAD-005: should reject when index.json contains invalid JSON', async () => {
      // Mock readFileSync to return invalid JSON for index.json
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string, _encoding?: string) => {
        if (filePath.endsWith('index.json')) {
          return 'not valid json {{{';
        }
        return JSON.stringify(getTemplateDataByPath(filePath));
      });

      await expect(service.reload()).rejects.toThrow();
    });

    it('TC-LOAD-006: should skip missing template files', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('index.json')) return true;
        // Simulate some template files missing
        return !filePath.includes('mitsubishi');
      });

      await service.reload();

      const templates = service.getAllTemplates();
      // Only the ones that exist on disk should be loaded
      expect(templates.length).toBe(2);
    });

    it('TC-LOAD-007: should handle missing template file paths', async () => {
      const indexWithMissingFile = {
        ...mockIndexJson,
        industries: [
          {
            ...mockIndexJson.industries[0],
            categories: [
              {
                ...mockIndexJson.industries[0].categories[0],
                templates: [
                  {
                    ...mockIndexJson.industries[0].categories[0].templates[0],
                    relativePath: 'nonexistent/path.json',
                  },
                ],
              },
            ],
          },
        ],
      };
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('index.json')) {
          return JSON.stringify(indexWithMissingFile);
        }
        return '{}';
      });
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('index.json')) return true;
        return false; // Template files don't exist
      });

      await service.reload();

      expect(service.getAllTemplates()).toHaveLength(0);
    });
  });

  describe('getTemplate', () => {
    it('TC-LOAD-010: should return template by id', async () => {
      await service.reload();

      const template = service.getTemplate('tpl-s7-1200');
      expect(template).toBeDefined();
      expect(template!.id).toBe('tpl-s7-1200');
      expect(template!.name).toBe('西门子 S7-1200 通用采集模板');
    });

    it('TC-LOAD-011: should return undefined for nonexistent id', async () => {
      await service.reload();

      const template = service.getTemplate('nonexistent-id');
      expect(template).toBeUndefined();
    });

    it('TC-LOAD-012: should return undefined when cache is empty', () => {
      const template = service.getTemplate('any-id');
      expect(template).toBeUndefined();
    });
  });

  describe('getAllTemplates', () => {
    it('TC-LOAD-020: should return empty array when not loaded', () => {
      expect(service.getAllTemplates()).toEqual([]);
    });

    it('TC-LOAD-021: should return all loaded templates', async () => {
      await service.reload();

      const templates = service.getAllTemplates();
      expect(templates).toHaveLength(3);
      expect(templates.map((t) => t.id)).toContain('tpl-s7-1200');
      expect(templates.map((t) => t.id)).toContain('tpl-mitsubishi');
      expect(templates.map((t) => t.id)).toContain('tpl-meter');
    });
  });

  describe('getTemplatesByIndustry', () => {
    beforeEach(async () => {
      await service.reload();
    });

    it('TC-LOAD-030: should filter by industry', () => {
      const result = service.getTemplatesByIndustry('工业自动化');
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.industry === '工业自动化')).toBe(true);
    });

    it('TC-LOAD-031: should return empty array for nonexistent industry', () => {
      const result = service.getTemplatesByIndustry('不存在的行业');
      expect(result).toHaveLength(0);
    });
  });

  describe('getTemplatesByDeviceType', () => {
    beforeEach(async () => {
      await service.reload();
    });

    it('TC-LOAD-040: should filter by deviceType', () => {
      const result = service.getTemplatesByDeviceType('modbus_tcp');
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.deviceType === 'modbus_tcp')).toBe(true);
    });

    it('TC-LOAD-041: should return empty for unknown deviceType', () => {
      const result = service.getTemplatesByDeviceType('unknown_protocol');
      expect(result).toHaveLength(0);
    });
  });

  describe('getTemplatesByProtocol', () => {
    beforeEach(async () => {
      await service.reload();
    });

    it('TC-LOAD-050: should filter by protocol (same as deviceType)', () => {
      const result = service.getTemplatesByProtocol('opc_ua');
      expect(result).toHaveLength(1);
      expect(result[0].deviceType).toBe('opc_ua');
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      await service.reload();
    });

    it('TC-LOAD-060: should search by name', () => {
      const result = service.searchTemplates('三菱');
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('三菱');
      expect(result[0].id).toBe('tpl-mitsubishi');
    });

    it('TC-LOAD-061: should search by tag', () => {
      const result = service.searchTemplates('PLC');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('TC-LOAD-062: should be case-insensitive', () => {
      const result = service.searchTemplates('plc');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('TC-LOAD-063: should return empty array for no matches', () => {
      const result = service.searchTemplates('zzz_no_match_xxx');
      expect(result).toHaveLength(0);
    });

    it('TC-LOAD-064: should search by description', () => {
      // '标准' matches the S7-1200 description "西门子 S7-1200 标准采集配置"
      const result = service.searchTemplates('标准');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tpl-s7-1200');
    });
  });

  describe('getIndex', () => {
    it('TC-LOAD-070: should return null before reload', () => {
      expect(service.getIndex()).toBeNull();
    });

    it('TC-LOAD-071: should return index after reload', async () => {
      await service.reload();

      const index = service.getIndex();
      expect(index).toBeDefined();
      expect(index!.totalTemplates).toBe(3);
      expect(index!.industries).toHaveLength(2);
    });
  });

  describe('getCacheStats', () => {
    it('TC-LOAD-080: should return zero stats before reload', () => {
      const stats = service.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.deviceTypes).toEqual([]);
      expect(stats.industries).toEqual([]);
    });

    it('TC-LOAD-081: should return unique deviceTypes and industries', async () => {
      await service.reload();

      const stats = service.getCacheStats();
      expect(stats.deviceTypes).toHaveLength(2);
      expect(stats.industries).toHaveLength(2);
    });
  });

  describe('template fields', () => {
    beforeEach(async () => {
      await service.reload();
    });

    it('TC-LOAD-090: should set industry and category on loaded templates', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.industry).toBe('工业自动化');
      expect(tpl!.category).toBe('PLC控制器');
    });

    it('TC-LOAD-091: should set isDefault field', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.isDefault).toBe(true);

      const tpl2 = service.getTemplate('tpl-mitsubishi');
      expect(tpl2!.isDefault).toBe(false);
    });

    it('TC-LOAD-092: should set tags field', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.tags).toContain('西门子');
      expect(tpl!.tags).toContain('PLC');
    });

    it('TC-LOAD-093: should set deviceType and deviceModel', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.deviceType).toBe('modbus_tcp');
      expect(tpl!.deviceModel).toBe('SIEMENS_S7_1200');
    });

    it('TC-LOAD-094: should include filePath on loaded templates', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.filePath).toContain('siemens-s7-1200.json');
    });

    it('TC-LOAD-095: should load variables from template JSON file', () => {
      const tpl = service.getTemplate('tpl-s7-1200');
      expect(tpl!.variables).toBeDefined();
      expect(tpl!.variables.length).toBe(2);
      expect(tpl!.variables[0].name).toBe('temperature');
      expect(tpl!.variables[0].address).toBe('40001');
    });
  });
});
