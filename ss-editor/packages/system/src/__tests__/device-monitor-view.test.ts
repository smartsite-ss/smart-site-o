// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock i18n ========================
// formatPeriod 依赖的 i18n 消息模板（与 zh-CN.json 保持一致）
const I18N_TEMPLATES: Record<string, string> = {
  'system.deviceMonitor.durationMs': '{n}ms',
  'system.deviceMonitor.durationSec': '{n}s',
  'system.deviceMonitor.durationMin': '{n}min',
};
const t = vi.fn((key: string, params?: any) => {
  const tpl = I18N_TEMPLATES[key];
  if (tpl && params && typeof params === 'object') {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
  }
  if (params && typeof params === 'object') {
    return key + JSON.stringify(params);
  }
  return key;
});
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t, locale: { value: 'zh-CN' } }),
  i18n: { global: { t } },
}));

// ======================== Mock SsLoading ========================
vi.mock('@scada-editor/shared', () => ({
  SsLoading: {
    name: 'SsLoading',
    props: ['text', 'size'],
    template: '<div class="ss-loading-mock">{{ text }}</div>',
  },
}));

// ======================== Mock deviceApi ========================
const mockDeviceApi = {
  getById: vi.fn(),
  getLatestValues: vi.fn(),
  getGroupTree: vi.fn(),
};

vi.mock('../api/modules/device.api', () => ({
  deviceApi: mockDeviceApi,
}));

// ======================== Mock alarmApi ========================
const mockAlarmApi = {
  getRules: vi.fn(),
};

vi.mock('../api/modules/alarm.api', () => ({
  alarmApi: mockAlarmApi,
}));

// ======================== Mock useProjectContext ========================
vi.mock('../composables/useProjectContext', () => ({
  useProjectContext: () => ({
    defaultProjectId: { value: null },
    loadDefault: vi.fn().mockResolvedValue(null),
    setDefaultProject: vi.fn().mockResolvedValue(undefined),
    clearDefaultProject: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ======================== Mock stores ========================
const mockDeviceStore = {
  groupTree: [] as any[],
  rootDevices: [] as any[],
  fetchGroupTree: vi.fn().mockResolvedValue(undefined),
  fetchDevices: vi.fn().mockResolvedValue(undefined),
  fetchDevice: vi.fn().mockResolvedValue(undefined),
  fetchLatestValues: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../stores/device.store', () => ({
  useDeviceStore: () => mockDeviceStore,
}));

const mockProjectStore = {
  projects: [
    { projectId: 'proj-1', projectName: '测试项目1' },
    { projectId: 'proj-2', projectName: '测试项目2' },
  ],
  fetchProjects: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../stores/project.store', () => ({
  useProjectStore: () => mockProjectStore,
}));

const mockWsStore = {
  isConnected: false,
  connectionStatus: 'disconnected',
  tagValues: new Map(),
  connect: vi.fn().mockResolvedValue(undefined),
  subscribeTags: vi.fn(),
  unsubscribeTags: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../stores/ws.store', () => ({
  useWsStore: () => mockWsStore,
}));

// ======================== Helpers ========================
const mockDevice = (overrides: Record<string, any> = {}) => ({
  id: 'dev-1',
  deviceCode: 'device-001',
  deviceName: '测试设备1',
  nameAlias: '设备别名',
  description: '测试描述',
  type: 'modbus_tcp',
  driver: 'modbus',
  status: 'online',
  groupId: 'group-1',
  scanRate: 1000,
  errorCount: 0,
  lastOnlineAt: '2026-07-16T10:00:00.000Z',
  lastDataAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T12:00:00.000Z',
  connection: { host: '192.168.1.1', port: 502, unitId: 1 },
  tags: [
    { id: 'tag-1', name: '温度', address: '40001', dataType: 'float32' },
    { id: 'tag-2', name: '湿度', address: '40002', dataType: 'float32' },
  ],
  ...overrides,
});

const mockGroupTree = (overrides: any[] = []) => {
  if (overrides.length > 0) return overrides;
  return [
    {
      group: { id: 'group-1', name: '分组1', projectId: 'proj-1' },
      devices: [mockDevice()],
      children: [
        {
          group: { id: 'group-1-1', name: '子分组1-1', projectId: 'proj-1' },
          devices: [mockDevice({ id: 'dev-2', deviceCode: 'device-002', deviceName: '测试设备2' })],
          children: [],
        },
      ],
    },
  ];
};

async function mountMonitorView() {
  // Reset mocks before each mount
  mockDeviceStore.fetchGroupTree.mockClear();
  mockDeviceStore.fetchGroupTree.mockResolvedValue(undefined);
  mockProjectStore.fetchProjects.mockClear();
  mockProjectStore.fetchProjects.mockResolvedValue(undefined);

  // Dynamic import to ensure mocks are applied
  const mod = await import('../views/device/DeviceMonitorView.vue');
  return mount(mod.default, {
    global: {
      mocks: {
        $t: t,
      },
      stubs: {
        MonitorGroupTreeNode: true,
      },
    },
  });
}

// ======================== Tests ========================
describe('DeviceMonitorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // 默认 mock 返回值
    mockDeviceApi.getById.mockResolvedValue({ data: mockDevice() });
    mockDeviceApi.getLatestValues.mockResolvedValue({ data: {} });
    mockDeviceApi.getGroupTree.mockResolvedValue({ data: mockGroupTree() });
    mockAlarmApi.getRules.mockResolvedValue({ data: [] });
    mockDeviceStore.groupTree = mockGroupTree();
  });

  describe('初始渲染', () => {
    it('应正确渲染左侧设备树标题', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      expect(wrapper.find('.sidebar-title').text()).toContain('system.deviceMonitor.deviceTree');
    });

    it('应显示空状态提示（未选中设备时）', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-state h3').text()).toContain('system.deviceMonitor.selectDeviceHint');
    });

    it('应加载项目列表并显示项目节点', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      // 项目节点应被渲染
      const projectNodes = wrapper.findAll('.project-node');
      expect(projectNodes.length).toBeGreaterThan(0);
      expect(projectNodes[0].text()).toContain('测试项目1');
    });

    it('应在挂载时自动展开第一个项目', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      expect(mockDeviceStore.fetchGroupTree).toHaveBeenCalledWith('proj-1');
      expect(wrapper.find('.project-node.expanded').exists()).toBe(true);
    });
  });

  describe('设备树交互', () => {
    it('点击项目节点应展开/收起', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const projectNode = wrapper.find('.project-node');
      expect(projectNode.classes()).toContain('expanded');

      // 点击收起
      await projectNode.trigger('click');
      // 注意：selectProject 会在已展开时收起
      await flushPromises();
      // 再次点击展开
      await projectNode.trigger('click');
      await flushPromises();
      expect(mockDeviceStore.fetchGroupTree).toHaveBeenCalled();
    });

    it('点击刷新按钮应重新加载项目列表', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const refreshBtn = wrapper.find('.btn-refresh');
      await refreshBtn.trigger('click');
      await flushPromises();
      expect(mockProjectStore.fetchProjects).toHaveBeenCalled();
    });

    it('无项目时应显示空提示', async () => {
      mockProjectStore.projects = [];
      const wrapper = await mountMonitorView();
      await flushPromises();
      expect(wrapper.find('.tree-empty').text()).toContain('system.devices.noProjects');
      // 恢复
      mockProjectStore.projects = [
        { projectId: 'proj-1', projectName: '测试项目1' },
      ];
    });
  });

  describe('设备详情 - 基本信息', () => {
    it('选中设备后应显示设备头部信息', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      // 模拟选中设备
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await flushPromises();

      expect(wrapper.find('.device-header').exists()).toBe(true);
      expect(wrapper.find('.device-name').text()).toContain('测试设备1');
    });

    it('基本信息 Tab 应显示设备信息网格', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      vm.activeTab = 'basic';
      await vm.loadDeviceDetail();
      await flushPromises();

      const infoGrid = wrapper.find('.info-grid');
      expect(infoGrid.exists()).toBe(true);
      const infoItems = wrapper.findAll('.info-item');
      expect(infoItems.length).toBeGreaterThan(0);
    });

    it('应显示通道配置（当存在 connection 时）', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      vm.activeTab = 'basic';
      await vm.loadDeviceDetail();
      await flushPromises();

      expect(wrapper.find('.channel-grid').exists()).toBe(true);
      expect(wrapper.find('.driver-tag').text()).toBe('modbus');
    });

    it('应掩码敏感字段', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      // 调用 maskSensitive 函数
      const result = vm.maskSensitive('password', 'secret123');
      expect(result).toBe('***');
      const normalResult = vm.maskSensitive('host', '192.168.1.1');
      expect(normalResult).toBe('192.168.1.1');
    });
  });

  describe('设备详情 - 实时数据', () => {
    it('实时数据 Tab 应加载标签数据', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await vm.refreshRealtimeData();
      await flushPromises();

      expect(mockDeviceApi.getById).toHaveBeenCalledWith('proj-1', 'dev-1');
      expect(mockDeviceApi.getLatestValues).toHaveBeenCalledWith('proj-1', 'dev-1');
      expect(vm.tagDataList.length).toBe(2); // 两个标签
    });

    it('自动刷新应定时调用 refreshRealtimeData', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      vm.activeTab = 'realtime';

      vm.toggleAutoRefresh();
      expect(vm.autoRefresh).toBe(true);

      vm.toggleAutoRefresh();
      expect(vm.autoRefresh).toBe(false);
    });

    it('WebSocket 已连接时应显示连接状态', async () => {
      mockWsStore.isConnected = true;
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      vm.activeTab = 'realtime';
      await vm.loadDeviceDetail();
      await flushPromises();

      expect(wrapper.find('.ws-status.ws-connected').exists()).toBe(true);
      mockWsStore.isConnected = false;
    });
  });

  describe('设备详情 - 报警规则', () => {
    it('切换到报警 Tab 应加载报警规则', async () => {
      const alarmRules = [
        {
          id: 'rule-1',
          name: '高温报警',
          level: 'critical',
          condition: '>',
          conditionValue: '80',
          enabled: true,
          tagId: 'tag-1',
          projectId: 'proj-1',
        },
      ];
      mockAlarmApi.getRules.mockResolvedValue({ data: alarmRules });

      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      vm.activeTab = 'alarms';
      await vm.loadAlarmRules();
      await flushPromises();

      expect(mockAlarmApi.getRules).toHaveBeenCalledWith('proj-1');
      expect(vm.deviceAlarmRules.length).toBe(1);
      expect(vm.deviceAlarmRules[0].name).toBe('高温报警');
    });

    it('无关联报警规则时应显示空提示', async () => {
      mockAlarmApi.getRules.mockResolvedValue({ data: [] });
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      vm.activeTab = 'alarms';
      await vm.loadAlarmRules();
      await flushPromises();

      expect(vm.deviceAlarmRules.length).toBe(0);
    });

    it('应按设备标签 ID 过滤报警规则', async () => {
      const allRules = [
        { id: 'rule-1', name: '规则1', tagId: 'tag-1', level: 'warning', condition: '>', conditionValue: '50', enabled: true, projectId: 'proj-1' },
        { id: 'rule-2', name: '规则2', tagId: 'tag-other', level: 'error', condition: '<', conditionValue: '10', enabled: false, projectId: 'proj-1' },
      ];
      mockAlarmApi.getRules.mockResolvedValue({ data: allRules });

      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      // 设备有 tag-1 和 tag-2
      await vm.loadDeviceDetail();
      await vm.loadAlarmRules();
      await flushPromises();

      // 只应保留 tagId 为 tag-1 的规则
      expect(vm.deviceAlarmRules.length).toBe(1);
      expect(vm.deviceAlarmRules[0].id).toBe('rule-1');
    });
  });

  describe('工具函数', () => {
    it('formatTime 应正确格式化 ISO 日期', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      const result = vm.formatTime('2026-07-17T10:00:00.000Z');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('formatTime 应处理 SQLite 日期格式', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      const result = vm.formatTime('2026-07-17 10:00:00');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('formatTime 应对空值返回 "-"', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      expect(vm.formatTime(null)).toBe('-');
      expect(vm.formatTime(undefined)).toBe('-');
      expect(vm.formatTime('')).toBe('-');
    });

    it('formatPeriod 应正确格式化周期', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      expect(vm.formatPeriod(500)).toBe('500ms');
      expect(vm.formatPeriod(1000)).toBe('1.0s');
      expect(vm.formatPeriod(5000)).toBe('5.0s');
      expect(vm.formatPeriod(60000)).toBe('1.0min');
      expect(vm.formatPeriod(0)).toBe('-');
      expect(vm.formatPeriod(null)).toBe('-');
    });

    it('deviceTypeLabel 应返回类型标签', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      expect(vm.deviceTypeLabel('modbus_tcp')).toContain('modbus_tcp');
      expect(vm.deviceTypeLabel('unknown')).toBe('unknown');
    });

    it('deviceStatusLabel 应返回状态标签', async () => {
      const wrapper = await mountMonitorView();
      const vm = wrapper.vm as any;
      expect(vm.deviceStatusLabel('online')).toContain('statusOnline');
      expect(vm.deviceStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('Tab 切换', () => {
    it('应渲染三个 Tab 按钮', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await flushPromises();

      const tabs = wrapper.findAll('.tab-item');
      expect(tabs.length).toBe(3);
      expect(tabs[0].text()).toContain('system.deviceMonitor.tabRealtime');
      expect(tabs[1].text()).toContain('system.deviceMonitor.tabBasic');
      expect(tabs[2].text()).toContain('system.deviceMonitor.tabAlarms');
    });

    it('默认 Tab 应为 realtime', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      expect(vm.activeTab).toBe('realtime');
    });

    it('点击 Tab 应切换激活状态', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await flushPromises();

      const tabs = wrapper.findAll('.tab-item');
      await tabs[1].trigger('click');
      expect(vm.activeTab).toBe('basic');
      expect(tabs[1].classes()).toContain('active');
    });
  });

  describe('WebSocket 订阅', () => {
    it('选中设备后应订阅 WebSocket 标签', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await vm.subscribeWsTags();
      await flushPromises();

      expect(mockWsStore.connect).toHaveBeenCalledWith('proj-1');
      expect(mockWsStore.subscribeTags).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });

    it('切换设备应取消旧订阅并建立新订阅', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      await vm.subscribeWsTags();
      await flushPromises();

      // 取消订阅
      vm.unsubscribeWsTags();
      expect(mockWsStore.unsubscribeTags).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });
  });

  describe('组件卸载', () => {
    it('卸载时应停止自动刷新和取消 WS 订阅', async () => {
      const wrapper = await mountMonitorView();
      await flushPromises();
      const vm = wrapper.vm as any;
      vm.selectedDeviceId = 'dev-1';
      vm.projectId = 'proj-1';
      await vm.loadDeviceDetail();
      vm.startAutoRefresh();
      await vm.subscribeWsTags();
      await flushPromises();

      wrapper.unmount();
      // 验证 unsubscribeTags 被调用
      expect(mockWsStore.unsubscribeTags).toHaveBeenCalled();
    });
  });
});
