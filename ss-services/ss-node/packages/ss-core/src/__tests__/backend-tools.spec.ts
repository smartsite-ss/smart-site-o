// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 后端 MCP 工具 — 字典管理工具单元测试
 *
 * 覆盖 5 个字典工具：
 *   dict_list, dict_detail, dict_create, dict_addItems, dict_search
 */

import {
  createDictListTool,
  createDictDetailTool,
  createDictCreateTool,
  createDictAddItemsTool,
  createDictSearchTool,
  createAllBackendTools,
  BackendToolServices,
} from '../ai/backend-tools';

// 模拟字典数据
const mockDictItems = [
  { value: 'modbus_tcp', label: 'Modbus TCP', sortOrder: 1, description: 'Modbus TCP 协议' },
  { value: 'opc_ua', label: 'OPC UA', sortOrder: 2, description: 'OPC UA 协议' },
  { value: 'mqtt', label: 'MQTT', sortOrder: 3, description: 'MQTT 协议' },
];

const mockCategories = [
  {
    category: 'system',
    tables: [
      { dictId: 'protocolType', dictName: '协议类型', version: '1.0', itemCount: 3 },
      { dictId: 'alarmLevel', dictName: '报警级别', version: '1.0', itemCount: 3 },
    ],
  },
  {
    category: 'device',
    tables: [{ dictId: 'dataType', dictName: '数据类型', version: '1.0', itemCount: 5 }],
  },
];

const mockDict = {
  dictId: 'protocolType',
  dictName: '协议类型',
  category: 'system',
  description: '工业采集协议类型定义',
  version: '1.0',
  items: mockDictItems,
};

function makeMockServices(overrides?: Partial<BackendToolServices>): BackendToolServices {
  return {
    dictService: {
      getAllCategories: jest.fn().mockReturnValue(mockCategories),
      getDict: jest.fn().mockImplementation((dictId: string) => {
        if (dictId === 'protocolType') return mockDict;
        return undefined;
      }),
      createTable: jest.fn(),
      updateTable: jest.fn(),
      getAllDicts: jest.fn().mockReturnValue([mockDict]),
    },
    ...overrides,
  };
}

describe('BackendTools — 字典管理', () => {
  describe('createDictListTool', () => {
    const services = makeMockServices();

    it('TC-DICT-TOOL-001: 无 dictService 时返回 null', () => {
      const tool = createDictListTool({});
      expect(tool).toBeNull();
    });

    it('TC-DICT-TOOL-002: 返回分类树结构', async () => {
      const tool = createDictListTool(services)!;
      expect(tool).not.toBeNull();
      expect(tool.name).toBe('dict_list');
      expect(tool.category).toBe('dict');
      expect(tool.frontend).toBe(false);

      const result = await tool.execute({ locale: 'zh-CN' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.total).toBe(3);
      expect(parsed.categories).toHaveLength(2);
      expect(parsed.categories[0].tables[0].dictId).toBe('protocolType');
    });

    it('TC-DICT-TOOL-003: 默认语言为 zh-CN', async () => {
      const tool = createDictListTool(services)!;
      const result = await tool.execute({});
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('createDictDetailTool', () => {
    const services = makeMockServices();

    it('TC-DICT-TOOL-004: 无 dictService 时返回 null', () => {
      const tool = createDictDetailTool({});
      expect(tool).toBeNull();
    });

    it('TC-DICT-TOOL-005: 查询存在的字典表详情', async () => {
      const tool = createDictDetailTool(services)!;
      const result = await tool.execute({ dictId: 'protocolType' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.dict.dictId).toBe('protocolType');
      expect(parsed.dict.dictName).toBe('协议类型');
      expect(parsed.dict.items).toHaveLength(3);
      expect(parsed.dict.items[0].value).toBe('modbus_tcp');
    });

    it('TC-DICT-TOOL-006: 查询不存在的字典表返回错误', async () => {
      const tool = createDictDetailTool(services)!;
      const result = await tool.execute({ dictId: 'nonexistent' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('不存在');
    });
  });

  describe('createDictCreateTool', () => {
    const services = makeMockServices();

    it('TC-DICT-TOOL-007: 无 dictService 时返回 null', () => {
      const tool = createDictCreateTool({});
      expect(tool).toBeNull();
    });

    it('TC-DICT-TOOL-008: 创建新字典表成功', async () => {
      const tool = createDictCreateTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'priorityLevel',
        dictName: '优先级',
        category: 'system',
        description: '报警优先级定义',
        items: [
          { value: 'high', label: '高', sortOrder: 1, description: '高优先级' },
          { value: 'low', label: '低', sortOrder: 2, description: '低优先级' },
        ],
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.dict.dictId).toBe('priorityLevel');
      expect(parsed.dict.itemCount).toBe(2);
      expect(parsed.message).toBe('字典表已创建');
      expect(services.dictService!.createTable).toHaveBeenCalled();
    });

    it('TC-DICT-TOOL-009: items 为空数组时返回错误', async () => {
      const tool = createDictCreateTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'empty',
        dictName: '空字典',
        category: 'system',
        items: [],
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('非空数组');
    });

    it('TC-DICT-TOOL-010: items 缺失时返回错误', async () => {
      const tool = createDictCreateTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'noItems',
        dictName: '无条目',
        category: 'system',
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
    });
  });

  describe('createDictAddItemsTool', () => {
    const services = makeMockServices();

    it('TC-DICT-TOOL-011: 无 dictService 时返回 null', () => {
      const tool = createDictAddItemsTool({});
      expect(tool).toBeNull();
    });

    it('TC-DICT-TOOL-012: 向现有字典追加条目成功', async () => {
      const tool = createDictAddItemsTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'protocolType',
        category: 'system',
        items: [{ value: 'bacnet', label: 'BACnet', sortOrder: 4, description: 'BACnet 协议' }],
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.addedCount).toBe(1);
      expect(parsed.totalCount).toBe(4); // 3 existing + 1 new
      expect(services.dictService!.updateTable).toHaveBeenCalled();
    });

    it('TC-DICT-TOOL-013: 向不存在的字典追加条目返回错误', async () => {
      const tool = createDictAddItemsTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'nonexistent',
        category: 'system',
        items: [{ value: 'test', label: '测试' }],
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('不存在');
    });

    it('TC-DICT-TOOL-014: items 为空数组时返回错误', async () => {
      const tool = createDictAddItemsTool(services)!;
      const result = await tool.execute({
        locale: 'zh-CN',
        dictId: 'protocolType',
        category: 'system',
        items: [],
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
    });
  });

  describe('createDictSearchTool', () => {
    const services = makeMockServices();

    it('TC-DICT-TOOL-015: 无 dictService 时返回 null', () => {
      const tool = createDictSearchTool({});
      expect(tool).toBeNull();
    });

    it('TC-DICT-TOOL-016: 按 label 搜索匹配到条目', async () => {
      const tool = createDictSearchTool(services)!;
      const result = await tool.execute({ keyword: 'TCP' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.results[0].dictId).toBe('protocolType');
      expect(parsed.results[0].item.value).toBe('modbus_tcp');
    });

    it('TC-DICT-TOOL-017: 按 value 搜索匹配到条目', async () => {
      const tool = createDictSearchTool(services)!;
      const result = await tool.execute({ keyword: 'opc_ua' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.results[0].item.label).toBe('OPC UA');
    });

    it('TC-DICT-TOOL-018: 关键词不匹配时返回空结果', async () => {
      const tool = createDictSearchTool(services)!;
      const result = await tool.execute({ keyword: 'xyz_unknown' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.results).toHaveLength(0);
      expect(parsed.total).toBe(0);
    });

    it('TC-DICT-TOOL-019: 限定分类搜索', async () => {
      const tool = createDictSearchTool(services)!;
      const result = await tool.execute({ keyword: 'TCP', category: 'device' });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      // device 分类下没有 TCP 相关条目，应为空
      expect(parsed.results).toHaveLength(0);
    });

    it('TC-DICT-TOOL-020: 限制 pageSize', async () => {
      // 使用包含多个匹配项的 dict
      const multiItemServices = makeMockServices();
      (multiItemServices.dictService!.getAllDicts as jest.Mock).mockReturnValue([
        {
          ...mockDict,
          items: [
            { value: 'a_tcp', label: 'A TCP', sortOrder: 1, description: '' },
            { value: 'b_tcp', label: 'B TCP', sortOrder: 2, description: '' },
            { value: 'c_tcp', label: 'C TCP', sortOrder: 3, description: '' },
            { value: 'd_tcp', label: 'D TCP', sortOrder: 4, description: '' },
          ],
        },
      ]);
      const tool = createDictSearchTool(multiItemServices)!;
      const result = await tool.execute({ keyword: 'TCP', pageSize: 2 });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('createAllBackendTools — 集成', () => {
    it('TC-DICT-TOOL-021: 包含字典服务的批量创建应包含 dict 工具', () => {
      const services = makeMockServices();
      const tools = createAllBackendTools(services);
      const dictTools = tools.filter((t) => t.category === 'dict');
      expect(dictTools).toHaveLength(5);
      expect(dictTools.map((t) => t.name).sort()).toEqual([
        'dict_addItems',
        'dict_create',
        'dict_detail',
        'dict_list',
        'dict_search',
      ]);
    });

    it('TC-DICT-TOOL-022: 无字典服务时不应包含 dict 工具', () => {
      const tools = createAllBackendTools({});
      const dictTools = tools.filter((t) => t.category === 'dict');
      expect(dictTools).toHaveLength(0);
    });
  });
});
