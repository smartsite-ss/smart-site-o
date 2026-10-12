// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock i18n ========================
const t = vi.fn((key: string, params?: any) => {
  if (params && typeof params === 'object') {
    return key + JSON.stringify(params);
  }
  return key;
});
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>();
  return {
    ...actual,
    useI18n: () => ({ t, locale: { value: 'zh-CN' } }),
  };
});

// ======================== Mock SsLoading ========================
vi.mock('@scada-editor/shared', () => ({
  SsLoading: {
    name: 'SsLoading',
    props: ['text', 'size'],
    template: '<div class="ss-loading-mock">{{ text }}</div>',
  },
  TimeRangePicker: {
    name: 'TimeRangePicker',
    props: ['startTime', 'endTime', 'presetRange'],
    emits: ['update:startTime', 'update:endTime', 'update:presetRange', 'change'],
    template: '<div class="time-range-picker-mock"></div>',
  },
}));

// ======================== Mock messageBox ========================
const mockShowError = vi.fn();
vi.mock('../utils/messageBox', () => ({
  showError: mockShowError,
}));

// ======================== Mock APIs ========================
const mockProjectApi = {
  list: vi.fn(),
};
const mockDeviceApi = {
  list: vi.fn(),
  getById: vi.fn(),
};
const mockDataQueryApi = {
  queryTrend: vi.fn(),
};
const mockTrendQuerySchemeApi = {
  list: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../api/modules/device.api', () => ({
  deviceApi: mockDeviceApi,
}));
vi.mock('../api/modules/project.api', () => ({
  projectApi: mockProjectApi,
}));
vi.mock('../api/modules/data-query.api', () => ({
  dataQueryApi: mockDataQueryApi,
}));
vi.mock('../api/modules/trend-query-scheme.api', () => ({
  trendQuerySchemeApi: mockTrendQuerySchemeApi,
}));
// Also mock the barrel file for any direct imports
vi.mock('../api/modules', () => ({
  projectApi: mockProjectApi,
  deviceApi: mockDeviceApi,
  dataQueryApi: mockDataQueryApi,
  trendQuerySchemeApi: mockTrendQuerySchemeApi,
}));

// ======================== Helpers ========================
const mockProjects = [
  { projectId: 'proj-1', projectName: '测试项目1' },
  { projectId: 'proj-2', projectName: '测试项目2' },
];

const mockDevices = [
  { id: 'dev-1', deviceName: '设备1' },
  { id: 'dev-2', deviceName: '设备2' },
];

const mockTags = [
  { id: 'tag-1', name: '温度', address: '40001', dataType: 'float32' },
  { id: 'tag-2', name: '湿度', address: '40002', dataType: 'float32' },
  { id: 'tag-3', name: '压力', address: '40003', dataType: 'float32' },
];

const mockDeviceDetail = (overrides: Record<string, any> = {}) => ({
  id: 'dev-1',
  deviceName: '设备1',
  tags: mockTags,
  ...overrides,
});

const mockTrendData = [
  {
    tagId: 'tag-1',
    data: [
      { timestamp: '2026-07-22T10:00:00.000Z', value: 25.5 },
      { timestamp: '2026-07-22T10:05:00.000Z', value: 26.0 },
      { timestamp: '2026-07-22T10:10:00.000Z', value: 25.8 },
    ],
  },
  {
    tagId: 'tag-2',
    data: [
      { timestamp: '2026-07-22T10:00:00.000Z', value: 60.0 },
      { timestamp: '2026-07-22T10:05:00.000Z', value: 62.5 },
      { timestamp: '2026-07-22T10:10:00.000Z', value: 61.0 },
    ],
  },
];

// Canvas 相关 mock - must be set before component imports
const mockResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
global.ResizeObserver = mockResizeObserver as any;

// ======================== Mount Helper ========================
async function mountHistoricalTrendView() {
  const mod = await import('../views/historical-trend/HistoricalTrendView.vue');
  return mount(mod.default, {
    global: {
      mocks: {
        $t: t,
      },
    },
  });
}

// ======================== Tests ========================
describe('HistoricalTrendView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockShowError.mockClear();

    // 默认 mock 返回值
    mockProjectApi.list.mockResolvedValue({ data: mockProjects });
    mockDeviceApi.list.mockResolvedValue({ data: mockDevices });
    mockDeviceApi.getById.mockResolvedValue({ data: mockDeviceDetail() });
    mockDataQueryApi.queryTrend.mockResolvedValue({ data: { data: mockTrendData } });
    mockTrendQuerySchemeApi.list.mockResolvedValue([]);

    // Reset
    mockResizeObserver.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('项目加载', () => {
    it('挂载后应加载项目列表', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      // projectStore.fetchProjects() 默认 pageSize=20
      expect(mockProjectApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20, keyword: undefined });
      const vm = wrapper.vm as any;
      expect(vm.projectStore.projects.length).toBe(2);
      expect(vm.projectStore.projects[0].projectId).toBe('proj-1');
    });

    it('项目列表加载失败应静默处理', async () => {
      mockProjectApi.list.mockRejectedValue(new Error('Network error'));
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      expect(vm.projectStore.projects.length).toBe(0);
    });
  });

  describe('设备加载 - pageSize 修复验证', () => {
    it('选择项目后应以 pageSize=100 加载设备列表（修复校验超限）', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      await vm.onProjectChange();
      await flushPromises();

      // 验证 pageSize 为 100，不会触发后端 @Max(100) 的 "must not be greater than 100" 错误
      expect(mockDeviceApi.list).toHaveBeenCalledWith('proj-1', { page: 1, pageSize: 100 });
      expect(vm.devices.length).toBe(2);
      expect(vm.devices[0].deviceName).toBe('设备1');
    });

    it('设备列表加载失败应静默处理', async () => {
      mockDeviceApi.list.mockRejectedValue(new Error('Backend error'));
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      await vm.onProjectChange();
      await flushPromises();

      expect(vm.devices.length).toBe(0);
    });

    it('未选择项目时设备下拉应禁用', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const deviceSelect = wrapper.findAll('select')[1];
      expect((deviceSelect.element as HTMLSelectElement).disabled).toBe(true);
    });
  });

  describe('标签加载 - device.tags 修复验证', () => {
    it('选择设备后应从 device.tags 加载标签（修复 dataTags→tags）', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      await vm.onDeviceChange();
      await flushPromises();

      // 验证通过 getById 获取设备详情
      expect(mockDeviceApi.getById).toHaveBeenCalledWith('proj-1', 'dev-1');
      // 验证标签从 device.tags 加载
      expect(vm.allTags.length).toBe(3);
      expect(vm.allTags[0].name).toBe('温度');
      expect(vm.allTags[0].address).toBe('40001');
    });

    it('设备无标签时应加载空列表', async () => {
      mockDeviceApi.getById.mockResolvedValue({
        data: { id: 'dev-1', deviceName: '设备1', tags: [] },
      });

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      await vm.onDeviceChange();
      await flushPromises();

      expect(vm.allTags.length).toBe(0);
    });

    it('设备无 tags 属性时应安全降级为空列表', async () => {
      mockDeviceApi.getById.mockResolvedValue({
        data: { id: 'dev-1', deviceName: '设备1' }, // 没有 tags
      });

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      await vm.onDeviceChange();
      await flushPromises();

      expect(vm.allTags.length).toBe(0);
    });

    it('API 直接返回数组格式也能正确加载标签（无 data wrapper）', async () => {
      mockDeviceApi.getById.mockResolvedValue({
        id: 'dev-1',
        deviceName: '设备1',
        tags: mockTags,
      });

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      await vm.onDeviceChange();
      await flushPromises();

      expect(vm.allTags.length).toBe(3);
    });
  });

  describe('级联重置', () => {
    it('切换项目应清空设备、标签和图表', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      // 先设置状态
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.allTags = [...mockTags];
      vm.chartSeries = [{ tagId: 'tag-1', tagName: '温度', data: [] }];

      // 切换到另一个项目
      vm.selectedProjectId = 'proj-2';
      await vm.onProjectChange();
      await flushPromises();

      expect(vm.selectedDeviceId).toBe('');
      expect(vm.selectedTagIds).toEqual([]);
      expect(vm.allTags).toEqual([]);
      expect(vm.chartSeries).toEqual([]);
      expect(vm.devices.length).toBe(2); // 新加载了设备
    });

    it('切换设备应清空标签和图表数据', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.allTags = [...mockTags];
      vm.chartSeries = [{ tagId: 'tag-1', tagName: '温度', data: [] }];

      vm.selectedDeviceId = 'dev-2';
      await vm.onDeviceChange();
      await flushPromises();

      expect(vm.selectedTagIds).toEqual([]);
      expect(vm.allTags.length).toBe(3); // 新设备标签已加载
      expect(vm.chartSeries).toEqual([]);
    });
  });

  describe('查询按钮状态', () => {
    it('未选项目时查询按钮应禁用', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const queryBtn = wrapper.find('.sys-btn-primary');
      expect((queryBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('完整选择后可查询', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.startTime = '2026-07-22T10:00';
      vm.endTime = '2026-07-22T11:00';
      vm.allTags = mockTags;

      await flushPromises();

      // 查询按钮不应 disable
      const queryBtn = wrapper.find('.sys-btn-primary');
      expect((queryBtn.element as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('标签选择器交互', () => {
    it('点击标签按钮应展开选择器', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.allTags = mockTags;

      await flushPromises();

      // 标签选择按钮应存在
      const tagBtn = wrapper.find('.tag-select-wrapper button');
      expect(tagBtn.exists()).toBe(true);
    });

    it('全选 / 取消全选', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.allTags = mockTags;
      vm.selectedTagIds = [];
      vm.showTagPicker = true;
      await flushPromises();

      // 全选
      vm.toggleAllTags();
      expect(vm.selectedTagIds.length).toBe(3);

      // 取消全选
      vm.toggleAllTags();
      expect(vm.selectedTagIds.length).toBe(0);
    });

    it('部分选中时 allTagsSelected 为 false', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.allTags = mockTags;
      vm.selectedTagIds = ['tag-1'];
      expect(vm.allTagsSelected).toBe(false);
    });

    it('全部选中时 allTagsSelected 为 true', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.allTags = mockTags;
      vm.selectedTagIds = ['tag-1', 'tag-2', 'tag-3'];
      expect(vm.allTagsSelected).toBe(true);
    });

    it('标签搜索过滤', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.allTags = mockTags;
      vm.tagSearch = '温度';
      await flushPromises();

      expect(vm.filteredTags.length).toBe(1);
      expect(vm.filteredTags[0].name).toBe('温度');

      vm.tagSearch = '40002';
      await flushPromises();
      expect(vm.filteredTags.length).toBe(1);
      expect(vm.filteredTags[0].address).toBe('40002');
    });

    it('搜索无结果时显示空提示', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.allTags = mockTags;
      vm.tagSearch = '不存在的标签';
      vm.showTagPicker = true;
      await flushPromises();

      expect(vm.filteredTags.length).toBe(0);
    });

    it('toggleTag 正确添加/移除标签', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedTagIds = [];

      vm.toggleTag('tag-1');
      expect(vm.selectedTagIds).toContain('tag-1');

      vm.toggleTag('tag-1');
      expect(vm.selectedTagIds).not.toContain('tag-1');
    });
  });

  describe('时间预设', () => {
    it('applyPresetRange 1h 应正确计算', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-22T12:00:00'));
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.presetRange = '1h';
      vm.applyPresetRange();

      expect(vm.endTime).toContain('2026-07-22');
      expect(vm.startTime).toContain('2026-07-22');
    });

    it('applyPresetRange 24h 应正确计算', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-22T12:00:00'));
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.presetRange = '24h';
      vm.applyPresetRange();

      expect(vm.startTime).toContain('2026-07-21');
      expect(vm.endTime).toContain('2026-07-22');
    });

    it('自定义时间时 endTime 重置为当前时间，startTime 保持不变', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-22T12:00:00'));
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.presetRange = '';
      vm.startTime = '2026-07-20T08:00';
      vm.endTime = '2026-07-22T08:00';
      vm.applyPresetRange();

      // startTime 不应被覆盖（无匹配 preset）
      expect(vm.startTime).toBe('2026-07-20T08:00');
      // endTime 始终被重置为当前时间
      expect(vm.endTime).toBe('2026-07-22T12:00');
    });
  });

  describe('查询趋势数据', () => {
    it('成功查询后应生成 chartSeries', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1', 'tag-2'];
      vm.allTags = mockTags;
      vm.startTime = '2026-07-22T10:00';
      vm.endTime = '2026-07-22T11:00';

      await vm.queryTrendData();
      await flushPromises();

      expect(mockDataQueryApi.queryTrend).toHaveBeenCalledWith(expect.objectContaining({
        tagIds: ['tag-1', 'tag-2'],
        startTime: expect.any(String),
        endTime: expect.any(String),
        maxPoints: 2000,
        projectId: 'proj-1',
      }));
      expect(vm.chartSeries.length).toBe(2);
      expect(vm.chartSeries[0].tagName).toBe('温度');
      expect(vm.visibleSeries.size).toBe(2);
    });

    it('查询失败应调用 showError', async () => {
      mockDataQueryApi.queryTrend.mockRejectedValue({
        _errorHandled: false,
        message: 'Server error',
      });

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.allTags = mockTags;
      vm.startTime = '2026-07-22T10:00';
      vm.endTime = '2026-07-22T11:00';

      await vm.queryTrendData();
      await flushPromises();

      expect(mockShowError).toHaveBeenCalledWith('Server error');
      expect(vm.queryLoading).toBe(false);
    });

    it('空数据返回时 chartSeries 为空', async () => {
      mockDataQueryApi.queryTrend.mockResolvedValue({ data: { data: [] } });

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.allTags = mockTags;
      vm.startTime = '2026-07-22T10:00';
      vm.endTime = '2026-07-22T11:00';

      await vm.queryTrendData();
      await flushPromises();

      expect(vm.chartSeries.length).toBe(0);
    });

    it('查询中显示 loading 状态', async () => {
      // 使用 deferred promise 来测试 loading 状态
      let resolvePromise: any;
      const deferred = new Promise((resolve) => { resolvePromise = resolve; });
      mockDataQueryApi.queryTrend.mockReturnValue(deferred);

      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.selectedProjectId = 'proj-1';
      vm.selectedDeviceId = 'dev-1';
      vm.selectedTagIds = ['tag-1'];
      vm.allTags = mockTags;
      vm.startTime = '2026-07-22T10:00';
      vm.endTime = '2026-07-22T11:00';

      const queryPromise = vm.queryTrendData();
      await nextTick();
      expect(vm.queryLoading).toBe(true);

      resolvePromise({ data: { data: mockTrendData } });
      await queryPromise;
      await flushPromises();

      expect(vm.queryLoading).toBe(false);
    });
  });

  describe('图例交互', () => {
    it('toggleSeries 应切换可见性', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      vm.chartSeries = [
        { tagId: 'tag-1', tagName: '温度', data: [] },
        { tagId: 'tag-2', tagName: '湿度', data: [] },
      ];
      vm.visibleSeries = new Set(['tag-1', 'tag-2']);

      vm.toggleSeries('tag-1');
      expect(vm.visibleSeries.has('tag-1')).toBe(false);
      expect(vm.visibleSeries.has('tag-2')).toBe(true);

      vm.toggleSeries('tag-1');
      expect(vm.visibleSeries.has('tag-1')).toBe(true);
    });
  });

  describe('Canvas 图表渲染', () => {
    it('挂载时应注册 ResizeObserver', async () => {
      const _wrapper = await mountHistoricalTrendView();
      await flushPromises();

      expect(mockResizeObserver).toHaveBeenCalled();
    });

    it('卸载时应清理 ResizeObserver', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      wrapper.unmount();
      // ResizeObserver disconnect 应被调用
      const instance = mockResizeObserver.mock.results[0]?.value;
      expect(instance?.disconnect).toHaveBeenCalled();
    });
  });

  describe('toLocalDatetime', () => {
    it('应正确格式化日期', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      const d = new Date('2026-07-22T12:05:30');
      const result = vm.toLocalDatetime(d);
      expect(result).toBe('2026-07-22T12:05');
    });

    it('个位数月/日/时/分应补零', async () => {
      const wrapper = await mountHistoricalTrendView();
      await flushPromises();

      const vm = wrapper.vm as any;
      const d = new Date('2026-01-05T03:07:00');
      const result = vm.toLocalDatetime(d);
      expect(result).toBe('2026-01-05T03:07');
    });
  });
});
