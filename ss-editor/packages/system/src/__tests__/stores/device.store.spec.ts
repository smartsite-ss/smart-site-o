// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeviceStore } from '../../stores/device.store';

vi.mock('../../api/modules/device.api', () => ({
  deviceApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    listGroups: vi.fn(),
    getGroupTree: vi.fn(),
    getGroupById: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
    diagnostic: vi.fn(),
    ping: vi.fn(),
  },
}));

const mockDevice = (id: string, name: string, tags: any[] = []) => ({
  id,
  deviceName: name,
  description: '',
  type: 'modbus',
  config: {},
  projectId: 'proj-1',
  status: 'online',
  tags,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

const mockPagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 };

describe('useDeviceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty devices list', () => {
      const store = useDeviceStore();
      expect(store.devices).toEqual([]);
    });

    it('should have null currentDevice', () => {
      const store = useDeviceStore();
      expect(store.currentDevice).toBeNull();
    });

    it('should have hasDevices as false', () => {
      const store = useDeviceStore();
      expect(store.hasDevices).toBe(false);
    });

    it('should have null selectedGroupId', () => {
      const store = useDeviceStore();
      expect(store.selectedGroupId).toBeNull();
    });
  });

  describe('fetchDevices', () => {
    it('should populate devices from API', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const devices = [mockDevice('d1', 'Device 1'), mockDevice('d2', 'Device 2')];
      (deviceApi.list as any).mockResolvedValueOnce({
        data: devices,
        pagination: { ...mockPagination, total: 2 },
      });

      const store = useDeviceStore();
      await store.fetchDevices('proj-1');

      expect(store.devices).toHaveLength(2);
      expect(store.pagination.total).toBe(2);
    });

    it('should handle fetch error', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      (deviceApi.list as any).mockRejectedValueOnce(new Error('Failed'));

      const store = useDeviceStore();
      await store.fetchDevices('proj-1');

      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchDevice', () => {
    it('should set currentDevice and tags', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const device = mockDevice('d1', 'Device 1', [
        { id: 't1', name: 'Temp', address: '40001', dataType: 'float', deviceId: 'd1' },
      ]);
      (deviceApi.getById as any).mockResolvedValueOnce({ data: device });

      const store = useDeviceStore();
      const result = await store.fetchDevice('proj-1', 'd1');

      expect(result).toEqual(device);
      expect(store.currentDevice?.deviceName).toBe('Device 1');
      expect(store.currentDeviceTags).toHaveLength(1);
      expect(store.currentDeviceTags[0].name).toBe('Temp');
    });

    it('should return null on error', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      (deviceApi.getById as any).mockRejectedValueOnce(new Error('Not found'));

      const store = useDeviceStore();
      const result = await store.fetchDevice('proj-1', 'd1');

      expect(result).toBeNull();
    });
  });

  describe('createDevice', () => {
    it('should create device and prepend to list', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const newDevice = mockDevice('new', 'New Device');
      (deviceApi.create as any).mockResolvedValueOnce({ data: newDevice });

      const store = useDeviceStore();
      const result = await store.createDevice('proj-1', { deviceName: 'New Device', type: 'modbus_tcp', config: {} });

      expect(result).toEqual(newDevice);
      expect(store.devices[0]).toEqual(newDevice);
      expect(store.pagination.total).toBe(1);
    });
  });

  describe('deleteDevice', () => {
    it('should remove device from list', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const device = mockDevice('d1', 'Device 1');
      (deviceApi.list as any).mockResolvedValueOnce({
        data: [device],
        pagination: { ...mockPagination, total: 1 },
      });
      (deviceApi.delete as any).mockResolvedValueOnce(undefined);

      const store = useDeviceStore();
      await store.fetchDevices('proj-1');
      await store.deleteDevice('proj-1', 'd1');

      expect(store.devices).toHaveLength(0);
    });

    it('should clear currentDevice if deleted', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const device = mockDevice('d1', 'Device 1');
      (deviceApi.list as any).mockResolvedValueOnce({
        data: [device],
        pagination: { ...mockPagination, total: 1 },
      });
      (deviceApi.delete as any).mockResolvedValueOnce(undefined);

      const store = useDeviceStore();
      await store.fetchDevices('proj-1');
      store.currentDevice = store.devices[0];
      await store.deleteDevice('proj-1', 'd1');

      expect(store.currentDevice).toBeNull();
    });
  });

  describe('tag management', () => {
    it('should add tag to currentDeviceTags', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const device = mockDevice('d1', 'Device 1');
      (deviceApi.getById as any).mockResolvedValueOnce({ data: device });
      const newTag = { id: 't1', name: 'NewTag', address: '40001', dataType: 'float', deviceId: 'd1' };
      (deviceApi.addTag as any).mockResolvedValueOnce({ data: newTag });

      const store = useDeviceStore();
      await store.fetchDevice('proj-1', 'd1');
      const result = await store.addTag('proj-1', 'd1', { name: 'NewTag', address: '40001', dataType: 'float' });

      expect(result).toEqual(newTag);
      expect(store.currentDeviceTags).toHaveLength(1);
      expect(store.currentDeviceTags[0].name).toBe('NewTag');
    });

    it('should delete tag from currentDeviceTags', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const device = mockDevice('d1', 'Device 1', [
        { id: 't1', name: 'Tag1', address: '40001', dataType: 'float', deviceId: 'd1' },
        { id: 't2', name: 'Tag2', address: '40002', dataType: 'int', deviceId: 'd1' },
      ]);
      (deviceApi.getById as any).mockResolvedValueOnce({ data: device });
      (deviceApi.deleteTag as any).mockResolvedValueOnce(undefined);

      const store = useDeviceStore();
      await store.fetchDevice('proj-1', 'd1');
      await store.deleteTag('proj-1', 'd1', 't1');

      expect(store.currentDeviceTags).toHaveLength(1);
      expect(store.currentDeviceTags[0].id).toBe('t2');
    });
  });

  describe('group management', () => {
    it('should fetch groups', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const groups = [{ id: 'g1', name: 'Group 1', description: '', projectId: 'proj-1', sortOrder: 0 }];
      (deviceApi.listGroups as any).mockResolvedValueOnce({ data: groups });

      const store = useDeviceStore();
      await store.fetchGroups('proj-1');

      expect(store.groups).toHaveLength(1);
      expect(store.groups[0].name).toBe('Group 1');
    });

    it('should fetch group tree', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const tree = [{ id: 'g1', name: 'Root', description: '', projectId: 'proj-1', sortOrder: 0, children: [] }];
      (deviceApi.getGroupTree as any).mockResolvedValueOnce({ data: tree });

      const store = useDeviceStore();
      await store.fetchGroupTree('proj-1');

      expect(store.groupTree).toHaveLength(1);
    });

    it('should create group', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const newGroup = { id: 'g1', name: 'New Group', description: '', projectId: 'proj-1', sortOrder: 0 };
      (deviceApi.createGroup as any).mockResolvedValueOnce({ data: newGroup });

      const store = useDeviceStore();
      const result = await store.createGroup('proj-1', { name: 'New Group' });

      expect(result).toEqual(newGroup);
      expect(store.groups[0]).toEqual(newGroup);
    });

    it('should delete group', async () => {
      const { deviceApi } = await import('../../api/modules/device.api');
      const groups = [{ id: 'g1', name: 'Group 1', description: '', projectId: 'proj-1', sortOrder: 0 }];
      (deviceApi.listGroups as any).mockResolvedValueOnce({ data: groups });
      (deviceApi.deleteGroup as any).mockResolvedValueOnce(undefined);

      const store = useDeviceStore();
      await store.fetchGroups('proj-1');
      await store.deleteGroup('proj-1', 'g1');

      expect(store.groups).toHaveLength(0);
    });
  });

  describe('selectGroup', () => {
    it('should set selectedGroupId', () => {
      const store = useDeviceStore();
      store.selectGroup('g1');
      expect(store.selectedGroupId).toBe('g1');
    });

    it('should clear selectedGroupId when null', () => {
      const store = useDeviceStore();
      store.selectGroup('g1');
      store.selectGroup(null);
      expect(store.selectedGroupId).toBeNull();
    });
  });
});

// ==================== 新增测试：多级分组树 ====================

describe('useDeviceStore - multi-level group tree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should parse 3-level group tree from API response', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const treeData = {
      projectId: 'proj-1',
      projectName: '测试项目',
      groups: [
        {
          group: { id: 'g1', name: '一级分组', sortOrder: 0, parentId: undefined },
          children: [
            {
              group: { id: 'g2', name: '二级分组', sortOrder: 0, parentId: 'g1' },
              children: [
                {
                  group: { id: 'g3', name: '三级分组', sortOrder: 0, parentId: 'g2' },
                  children: [],
                  devices: [],
                },
              ],
              devices: [],
            },
          ],
          devices: [],
        },
      ],
    };
    (deviceApi.getGroupTree as any).mockResolvedValueOnce({ data: treeData });

    const store = useDeviceStore();
    await store.fetchGroupTree('proj-1');

    expect(store.groupTree).toHaveLength(1);
    const root = store.groupTree[0] as any;
    expect(root.group.name).toBe('一级分组');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].group.name).toBe('二级分组');
    expect(root.children[0].children).toHaveLength(1);
    expect(root.children[0].children[0].group.name).toBe('三级分组');
  });

  it('should handle group tree with devices in nodes', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const treeData = {
      projectId: 'proj-1',
      projectName: '测试项目',
      groups: [
        {
          group: { id: 'g1', name: '分组1', sortOrder: 0, parentId: undefined },
          children: [],
          devices: [
            { id: 'd1', deviceCode: 'dev-1', deviceName: '设备1', type: 'modbus_tcp', status: 'online' },
            { id: 'd2', deviceCode: 'dev-2', deviceName: '设备2', type: 'opc_ua', status: 'offline' },
          ],
        },
      ],
    };
    (deviceApi.getGroupTree as any).mockResolvedValueOnce({ data: treeData });

    const store = useDeviceStore();
    await store.fetchGroupTree('proj-1');

    const root = store.groupTree[0] as any;
    expect(root.devices).toHaveLength(2);
    expect(root.devices[0].deviceName).toBe('设备1');
    expect(root.devices[1].deviceName).toBe('设备2');
  });

  it('should handle group tree fetch error', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.getGroupTree as any).mockRejectedValueOnce(new Error('Network error'));

    const store = useDeviceStore();
    await store.fetchGroupTree('proj-1');

    expect(store.error).toBeTruthy();
    expect(store.groupTree).toEqual([]);
  });

  it('should handle empty group tree response', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.getGroupTree as any).mockResolvedValueOnce({ data: { projectId: 'proj-1', groups: [] } });

    const store = useDeviceStore();
    await store.fetchGroupTree('proj-1');

    expect(store.groupTree).toEqual([]);
  });
});

// ==================== 新增测试：设备创建 - 不同驱动类型 ====================

describe('useDeviceStore - create device with different drivers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create device with modbus driver', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', 'Modbus设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, driver: 'modbus' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'modbus-1',
      deviceName: 'Modbus设备',
      templateId: 'tpl-001',
      driver: 'modbus',
      connection: { host: '192.168.1.1', port: 502 },
    } as any);

    expect(result.driver).toBe('modbus');
    expect(store.devices).toHaveLength(1);
  });

  it('should create device with opc_ua driver', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', 'OPC UA设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, driver: 'opc_ua' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'opc-1',
      deviceName: 'OPC UA设备',
      templateId: 'tpl-001',
      driver: 'opc_ua',
      connection: { endpoint: 'opc.tcp://1.2.3.4:4840' },
    } as any);

    expect(result.driver).toBe('opc_ua');
  });

  it('should create device with mqtt driver', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', 'MQTT设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, driver: 'mqtt' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'mqtt-1',
      deviceName: 'MQTT设备',
      templateId: 'tpl-001',
      driver: 'mqtt',
      connection: { broker: 'mqtt://broker:1883', topic: 'test/#' },
    } as any);

    expect(result.driver).toBe('mqtt');
  });

  it('should create device with siemens_s7 driver', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', 'S7设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, driver: 'siemens_s7' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 's7-1',
      deviceName: 'S7设备',
      templateId: 'tpl-001',
      driver: 'siemens_s7',
      connection: { host: '192.168.1.1', rack: 0, slot: 1 },
    } as any);

    expect(result.driver).toBe('siemens_s7');
  });

  it('should create device with virtual driver', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', '虚拟设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, driver: 'virtual' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'virtual-1',
      deviceName: '虚拟设备',
      templateId: 'tpl-001',
      driver: 'virtual',
      connection: { mode: 'random' },
    } as any);

    expect(result.driver).toBe('virtual');
  });
});

// ==================== 新增测试：设备创建 - 分配分组 ====================

describe('useDeviceStore - create device with group assignment', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create device with groupId', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', '分组设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: { ...newDevice, groupId: 'g1' } });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'group-dev-1',
      deviceName: '分组设备',
      templateId: 'tpl-001',
      driver: 'modbus',
      connection: { host: '192.168.1.1', port: 502 },
      groupId: 'g1',
    } as any);

    expect(result.groupId).toBe('g1');
  });

  it('should create device without groupId', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newDevice = mockDevice('d1', '无分组设备');
    (deviceApi.create as any).mockResolvedValueOnce({ data: newDevice });

    const store = useDeviceStore();
    const result = await store.createDevice('proj-1', {
      deviceCode: 'no-group-1',
      deviceName: '无分组设备',
      templateId: 'tpl-001',
      driver: 'modbus',
      connection: { host: '192.168.1.1', port: 502 },
    } as any);

    expect(result.groupId).toBeUndefined();
  });
});

// ==================== 新增测试：设备创建 - 错误处理 ====================

describe('useDeviceStore - create device error handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should throw error when create device fails', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.create as any).mockRejectedValueOnce(new Error('Create failed'));

    const store = useDeviceStore();
    await expect(store.createDevice('proj-1', {
      deviceCode: 'fail-1',
      deviceName: '失败设备',
      templateId: 'tpl-001',
      driver: 'modbus',
      connection: { host: '192.168.1.1', port: 502 },
    } as any)).rejects.toThrow();

    expect(store.error).toBeTruthy();
  });

  it('should set loading to false after create error', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.create as any).mockRejectedValueOnce(new Error('Create failed'));

    const store = useDeviceStore();
    try {
      await store.createDevice('proj-1', {
        deviceCode: 'fail-2',
        deviceName: '失败设备2',
        templateId: 'tpl-001',
        driver: 'modbus',
        connection: { host: '192.168.1.1', port: 502 },
      } as any);
    } catch {
      // expected
    }

    expect(store.loading).toBe(false);
  });
});

// ==================== 新增测试：分组CRUD详细 ====================

describe('useDeviceStore - group CRUD details', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create group with parentId', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newGroup = { id: 'g2', name: '子分组', description: '', projectId: 'proj-1', sortOrder: 0, parentId: 'g1' };
    (deviceApi.createGroup as any).mockResolvedValueOnce({ data: newGroup });

    const store = useDeviceStore();
    const result = await store.createGroup('proj-1', { name: '子分组', parentId: 'g1' });

    expect(result.parentId).toBe('g1');
    expect(result.name).toBe('子分组');
  });

  it('should create group with description', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const newGroup = { id: 'g1', name: '带描述分组', description: '这是描述', projectId: 'proj-1', sortOrder: 0 };
    (deviceApi.createGroup as any).mockResolvedValueOnce({ data: newGroup });

    const store = useDeviceStore();
    const result = await store.createGroup('proj-1', { name: '带描述分组', description: '这是描述' });

    expect(result.description).toBe('这是描述');
  });

  it('should update group name', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const groups = [{ id: 'g1', name: '旧名称', description: '', projectId: 'proj-1', sortOrder: 0 }];
    (deviceApi.listGroups as any).mockResolvedValueOnce({ data: groups });
    (deviceApi.updateGroup as any).mockResolvedValueOnce({
      data: { id: 'g1', name: '新名称', description: '', projectId: 'proj-1', sortOrder: 0 },
    });

    const store = useDeviceStore();
    await store.fetchGroups('proj-1');
    const result = await store.updateGroup('proj-1', 'g1', { name: '新名称' });

    expect(result.name).toBe('新名称');
    expect(store.groups[0].name).toBe('新名称');
  });

  it('should handle group create error', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.createGroup as any).mockRejectedValueOnce(new Error('Create failed'));

    const store = useDeviceStore();
    await expect(store.createGroup('proj-1', { name: '失败分组' })).rejects.toThrow();
    expect(store.error).toBeTruthy();
  });

  it('should handle group delete error', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    const groups = [{ id: 'g1', name: 'Group 1', description: '', projectId: 'proj-1', sortOrder: 0 }];
    (deviceApi.listGroups as any).mockResolvedValueOnce({ data: groups });
    (deviceApi.deleteGroup as any).mockRejectedValueOnce(new Error('Delete failed'));

    const store = useDeviceStore();
    await store.fetchGroups('proj-1');
    await expect(store.deleteGroup('proj-1', 'g1')).rejects.toThrow();
  });

  it('should handle fetchGroups error', async () => {
    const { deviceApi } = await import('../../api/modules/device.api');
    (deviceApi.listGroups as any).mockRejectedValueOnce(new Error('Fetch failed'));

    const store = useDeviceStore();
    await store.fetchGroups('proj-1');

    expect(store.error).toBeTruthy();
    expect(store.groups).toEqual([]);
  });
});