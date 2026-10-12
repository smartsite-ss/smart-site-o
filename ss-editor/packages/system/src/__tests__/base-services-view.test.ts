// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock vue-i18n ========================
const t = vi.fn((key: string, _params?: any) => key);
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t, locale: { value: 'zh-CN' } }),
  createI18n: vi.fn(() => ({ global: { t }, locale: { value: 'zh-CN' } })),
}));

// ======================== Mock messageBox ========================
const showConfirm = vi.fn().mockResolvedValue(true);
const showSuccess = vi.fn();
const showError = vi.fn();
vi.mock('../utils/messageBox', () => ({
  showConfirm,
  showSuccess,
  showError,
}));

// ======================== Mock baseServicesApi ========================
const mockServiceStatus = (overrides: Record<string, any> = {}) => ({
  id: 'svc-1',
  name: 'redis',
  displayName: 'Redis',
  status: 'stopped',
  portReachable: false,
  processRunning: false,
  binaryExists: true,
  configExists: true,
  dataDirExists: true,
  logDirExists: true,
  autoStart: false,
  processGuard: false,
  ...overrides,
});

const mockServiceConfig = (overrides: Record<string, any> = {}) => ({
  id: 'svc-1',
  name: 'redis',
  displayName: 'Redis',
  description: 'Redis 缓存服务',
  binaryPath: 'C:/redis/redis-server.exe',
  startArgs: '',
  configPath: 'C:/redis/redis.conf',
  logDir: 'C:/redis/logs',
  dataDir: 'C:/redis/data',
  processName: 'redis-server.exe',
  port: 6379,
  startScript: '',
  stopScript: '',
  enabled: true,
  autoStart: false,
  processGuard: false,
  sortOrder: 1,
  ...overrides,
});

const mockBaseServicesApi = {
  list: vi.fn().mockResolvedValue({ data: [] }),
  listConfig: vi.fn().mockResolvedValue({ data: [] }),
  create: vi.fn().mockResolvedValue({ data: {} }),
  update: vi.fn().mockResolvedValue({ data: {} }),
  remove: vi.fn().mockResolvedValue({ data: { success: true } }),
  getStatus: vi.fn(),
  start: vi.fn().mockResolvedValue({ data: { success: true, name: 'redis', action: 'start', message: 'ok', durationMs: 100 } }),
  stop: vi.fn().mockResolvedValue({ data: { success: true, name: 'redis', action: 'stop', message: 'ok', durationMs: 100 } }),
  restart: vi.fn().mockResolvedValue({ data: { success: true, name: 'redis', action: 'restart', message: 'ok', durationMs: 100 } }),
  getConfig: vi.fn().mockResolvedValue({ data: { content: 'bind 127.0.0.1', path: 'C:/redis.conf', size: 100 } }),
  saveConfig: vi.fn().mockResolvedValue({ data: { success: true, path: 'C:/redis.conf' } }),
  getLogs: vi.fn().mockResolvedValue({ data: [] }),
  clearLogs: vi.fn().mockResolvedValue({ data: { cleared: ['redis.log'] } }),
};

vi.mock('../api/modules/base-services.api', () => ({
  baseServicesApi: mockBaseServicesApi,
}));

// ======================== Helper: mount component ========================
async function mountView() {
  const mod = await import('../views/settings/BaseServicesView.vue');
  return mount(mod.default, {
    global: {
      mocks: {
        $t: t,
      },
    },
  });
}

// ======================== Tests ========================
describe('BaseServicesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // 重置默认 mock 返回值
    mockBaseServicesApi.list.mockResolvedValue({ data: [] });
    mockBaseServicesApi.listConfig.mockResolvedValue({ data: [] });
    mockBaseServicesApi.start.mockResolvedValue({ data: { success: true, name: 'redis', action: 'start', message: 'ok', durationMs: 100 } });
    mockBaseServicesApi.stop.mockResolvedValue({ data: { success: true, name: 'redis', action: 'stop', message: 'ok', durationMs: 100 } });
    mockBaseServicesApi.restart.mockResolvedValue({ data: { success: true, name: 'redis', action: 'restart', message: 'ok', durationMs: 100 } });
  });

  // ================ 渲染测试 ================
  describe('rendering', () => {
    it('TC-BSV-001: 应渲染页面标题和操作按钮', async () => {
      const wrapper = await mountView();
      await flushPromises();
      expect(wrapper.find('.page-title').text()).toContain('system.baseServices.title');
      expect(wrapper.find('.header-actions').exists()).toBe(true);
    });

    it('TC-BSV-002: 无服务时应显示空状态', async () => {
      mockBaseServicesApi.list.mockResolvedValue({ data: [] });
      const wrapper = await mountView();
      await flushPromises();
      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-state').text()).toContain('system.baseServices.noServices');
    });

    it('TC-BSV-003: 应渲染服务卡片列表', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const cards = wrapper.findAll('.service-card');
      expect(cards.length).toBe(1);
      expect(cards[0].find('.svc-name').text()).toBe('Redis');
    });

    it('TC-BSV-004: 服务卡片应显示状态徽章', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ status: 'running' })],
      });
      const wrapper = await mountView();
      await flushPromises();
      expect(wrapper.find('.status-badge').classes()).toContain('badge-running');
    });

    it('TC-BSV-005: 应渲染新增服务按钮', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      expect(addBtn).toBeDefined();
    });

    it('TC-BSV-006: 应渲染刷新按钮', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const refreshBtn = wrapper.findAll('.sys-btn-secondary').find((b) => b.text().includes('refresh'));
      expect(refreshBtn).toBeDefined();
    });

    it('TC-BSV-007: 服务卡片应包含启停/配置/日志/编辑/删除按钮', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus()],
      });
      const wrapper = await mountView();
      await flushPromises();
      const actions = wrapper.find('.card-actions');
      const btns = actions.findAll('button');
      const texts = btns.map((b) => b.text());
      expect(texts.some((t) => t.includes('start'))).toBe(true);
      expect(texts.some((t) => t.includes('stop'))).toBe(true);
      expect(texts.some((t) => t.includes('restart'))).toBe(true);
      expect(texts.some((t) => t.includes('config'))).toBe(true);
      expect(texts.some((t) => t.includes('logs'))).toBe(true);
      expect(texts.some((t) => t.includes('edit'))).toBe(true);
      expect(texts.some((t) => t.includes('delete'))).toBe(true);
    });
  });

  // ================ 新增/编辑服务模态框 ================
  describe('form modal', () => {
    it('TC-BSV-010: 点击新增按钮应打开模态框', async () => {
      const wrapper = await mountView();
      await flushPromises();
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      await addBtn!.trigger('click');
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toContain('addService');
    });

    it('TC-BSV-011: 模态框应包含所有必填字段', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      await addBtn!.trigger('click');
      const modal = wrapper.find('.modal-overlay');
      expect(modal.find('input[placeholder]').exists()).toBe(true);
      // 验证有多个 form-field
      expect(modal.findAll('.form-field').length).toBeGreaterThanOrEqual(10);
    });

    it('TC-BSV-012: 必填字段为空时保存应提示错误', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      await addBtn!.trigger('click');
      // 不填写任何内容，直接点保存
      const saveBtn = wrapper.findAll('.modal-footer button').find((b) => b.text().includes('save'));
      await saveBtn!.trigger('click');
      await flushPromises();
      expect(showError).toHaveBeenCalledWith('system.baseServices.requiredFields');
    });

    it('TC-BSV-013: 填写有效数据后保存应调用 create API', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      await addBtn!.trigger('click');

      // 填写表单
      const inputs = wrapper.findAll('.form-input');
      // name 字段
      await inputs[0].setValue('nginx');
      // displayName 字段
      await inputs[1].setValue('Nginx');

      const saveBtn = wrapper.findAll('.modal-footer button').find((b) => b.text().includes('save'));
      await saveBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'nginx', displayName: 'Nginx' }),
      );
      expect(showSuccess).toHaveBeenCalledWith('system.baseServices.createSuccess');
    });

    it('TC-BSV-014: 点击编辑按钮应加载配置并填充表单', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      mockBaseServicesApi.listConfig.mockResolvedValue({
        data: [mockServiceConfig()],
      });
      const wrapper = await mountView();
      await flushPromises();

      const editBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('edit'));
      await editBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.listConfig).toHaveBeenCalled();
      expect(wrapper.find('.modal-title').text()).toContain('editService');
    });

    it('TC-BSV-015: 编辑模式下 name 字段应禁用', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      mockBaseServicesApi.listConfig.mockResolvedValue({
        data: [mockServiceConfig()],
      });
      const wrapper = await mountView();
      await flushPromises();

      const editBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('edit'));
      await editBtn!.trigger('click');
      await flushPromises();

      const nameInput = wrapper.findAll('.form-input')[0];
      expect((nameInput.element as HTMLInputElement).disabled).toBe(true);
    });

    it('TC-BSV-015a: 编辑模式下保存应剥离 name 字段', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      mockBaseServicesApi.listConfig.mockResolvedValue({
        data: [mockServiceConfig()],
      });
      const wrapper = await mountView();
      await flushPromises();

      const editBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('edit'));
      await editBtn!.trigger('click');
      await flushPromises();

      // 修改 displayName
      const inputs = wrapper.findAll('.form-input');
      await inputs[1].setValue('Redis Updated');

      const saveBtn = wrapper.findAll('.modal-footer button').find((b) => b.text().includes('save'));
      await saveBtn!.trigger('click');
      await flushPromises();

      // 验证 update 调用未包含 name 字段
      const updateCall = mockBaseServicesApi.update.mock.calls[0];
      expect(updateCall[0]).toBe('redis'); // URL param
      expect(updateCall[1]).not.toHaveProperty('name'); // 不应在 body 中包含 name
      expect(updateCall[1]).toHaveProperty('displayName', 'Redis Updated');
    });

    it('TC-BSV-016: 取消按钮应关闭模态框', async () => {
      const wrapper = await mountView();
      await flushPromises();
      const addBtn = wrapper.findAll('.sys-btn-primary').find((b) => b.text().includes('addService'));
      await addBtn!.trigger('click');
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);

      const cancelBtn = wrapper.findAll('.modal-footer button').find((b) => b.text().includes('cancel'));
      await cancelBtn!.trigger('click');
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });
  });

  // ================ 服务操作 ================
  describe('service actions', () => {
    it('TC-BSV-020: 点击启动按钮应调用 start API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'stopped' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const startBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('start') && !b.attributes('disabled'));
      expect(startBtn).toBeDefined();
      await startBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.start).toHaveBeenCalledWith('redis');
      expect(showSuccess).toHaveBeenCalled();
    });

    it('TC-BSV-021: 启动失败应显示错误', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'stopped' })],
      });
      mockBaseServicesApi.start.mockResolvedValue({
        data: { success: false, name: 'redis', action: 'start', message: '端口被占用', durationMs: 0 },
      });
      const wrapper = await mountView();
      await flushPromises();

      const startBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('start') && !b.attributes('disabled'));
      await startBtn!.trigger('click');
      await flushPromises();

      expect(showError).toHaveBeenCalled();
    });

    it('TC-BSV-022: 点击停止按钮应弹出确认框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'running' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const stopBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('stop') && !b.attributes('disabled'));
      expect(stopBtn).toBeDefined();
      await stopBtn!.trigger('click');
      await flushPromises();

      expect(showConfirm).toHaveBeenCalled();
    });

    it('TC-BSV-023: 确认停止后应调用 stop API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'running' })],
      });
      showConfirm.mockResolvedValueOnce(true);
      const wrapper = await mountView();
      await flushPromises();

      const stopBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('stop') && !b.attributes('disabled'));
      await stopBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.stop).toHaveBeenCalledWith('redis');
    });

    it('TC-BSV-024: 取消停止确认后不应调用 stop API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'running' })],
      });
      showConfirm.mockResolvedValueOnce(false);
      const wrapper = await mountView();
      await flushPromises();

      const stopBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('stop') && !b.attributes('disabled'));
      await stopBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.stop).not.toHaveBeenCalled();
    });

    it('TC-BSV-025: 点击重启按钮应弹出确认框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', status: 'running' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const restartBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('restart') && !b.attributes('disabled'));
      await restartBtn!.trigger('click');
      await flushPromises();

      expect(showConfirm).toHaveBeenCalled();
    });

    it('TC-BSV-026: 点击删除按钮应弹出确认框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const deleteBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('delete'));
      await deleteBtn!.trigger('click');
      await flushPromises();

      expect(showConfirm).toHaveBeenCalled();
    });

    it('TC-BSV-027: 确认删除后应调用 remove API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      showConfirm.mockResolvedValueOnce(true);
      const wrapper = await mountView();
      await flushPromises();

      const deleteBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('delete'));
      await deleteBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.remove).toHaveBeenCalledWith('redis');
      expect(showSuccess).toHaveBeenCalledWith('system.baseServices.deleteSuccess');
    });
  });

  // ================ 配置文件模态框 ================
  describe('config modal', () => {
    it('TC-BSV-030: 点击配置按钮应打开配置模态框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const configBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('config'));
      await configBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.getConfig).toHaveBeenCalledWith('redis');
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toContain('configTitle');
    });

    it('TC-BSV-031: 保存配置应调用 saveConfig API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const configBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('config'));
      await configBtn!.trigger('click');
      await flushPromises();

      const saveBtn = wrapper.findAll('.modal-footer button').find((b) => b.text().includes('save'));
      await saveBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.saveConfig).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith('system.baseServices.configSaved');
    });
  });

  // ================ 日志模态框 ================
  describe('logs modal', () => {
    it('TC-BSV-040: 点击日志按钮应打开日志模态框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis', displayName: 'Redis' })],
      });
      const wrapper = await mountView();
      await flushPromises();

      const logsBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('logs'));
      await logsBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.getLogs).toHaveBeenCalledWith('redis', 200);
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-title').text()).toContain('logsTitle');
    });

    it('TC-BSV-041: 无日志时应显示空状态', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      mockBaseServicesApi.getLogs.mockResolvedValue({ data: [] });
      const wrapper = await mountView();
      await flushPromises();

      const logsBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('logs'));
      await logsBtn!.trigger('click');
      await flushPromises();

      const modal = wrapper.find('.modal-overlay');
      expect(modal.find('.empty-state').exists()).toBe(true);
    });

    it('TC-BSV-042: 有日志时应渲染日志条目', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      mockBaseServicesApi.getLogs.mockResolvedValue({
        data: [
          { filename: 'redis.log', size: 100, lines: ['line1', 'line2'], totalLines: 2 },
        ],
      });
      const wrapper = await mountView();
      await flushPromises();

      const logsBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('logs'));
      await logsBtn!.trigger('click');
      await flushPromises();

      const modal = wrapper.find('.modal-overlay');
      expect(modal.findAll('.log-tab-btn').length).toBe(1);
      expect(modal.find('.tab-filename').text()).toBe('redis.log');
      expect(modal.find('.log-content').text()).toContain('line1');
    });

    it('TC-BSV-043: 清理日志应弹出确认框', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      mockBaseServicesApi.getLogs.mockResolvedValue({
        data: [{ filename: 'redis.log', size: 100, lines: ['line1'], totalLines: 1 }],
      });
      const wrapper = await mountView();
      await flushPromises();

      const logsBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('logs'));
      await logsBtn!.trigger('click');
      await flushPromises();

      const clearBtn = wrapper.findAll('.modal-overlay button').find((b) => b.text().includes('clearLogs'));
      await clearBtn!.trigger('click');
      await flushPromises();

      expect(showConfirm).toHaveBeenCalled();
    });

    it('TC-BSV-044: 确认清理后应调用 clearLogs API', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ name: 'redis' })],
      });
      mockBaseServicesApi.getLogs.mockResolvedValue({
        data: [{ filename: 'redis.log', size: 100, lines: ['line1'], totalLines: 1 }],
      });
      showConfirm.mockResolvedValueOnce(true);
      const wrapper = await mountView();
      await flushPromises();

      const logsBtn = wrapper.findAll('.card-actions button').find((b) => b.text().includes('logs'));
      await logsBtn!.trigger('click');
      await flushPromises();

      const clearBtn = wrapper.findAll('.modal-overlay button').find((b) => b.text().includes('clearLogs'));
      await clearBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.clearLogs).toHaveBeenCalledWith('redis');
    });
  });

  // ================ 数据加载 ================
  describe('data loading', () => {
    it('TC-BSV-050: 挂载时应调用 list API', async () => {
      await mountView();
      await flushPromises();
      expect(mockBaseServicesApi.list).toHaveBeenCalled();
    });

    it('TC-BSV-051: list API 失败应显示错误', async () => {
      mockBaseServicesApi.list.mockRejectedValue(new Error('Network error'));
      await mountView();
      await flushPromises();
      expect(showError).toHaveBeenCalled();
    });

    it('TC-BSV-052: 点击刷新按钮应重新加载列表', async () => {
      mockBaseServicesApi.list.mockClear();
      const wrapper = await mountView();
      await flushPromises();
      const initialCallCount = mockBaseServicesApi.list.mock.calls.length;

      const refreshBtn = wrapper.findAll('.sys-btn-secondary').find((b) => b.text().includes('refresh'));
      await refreshBtn!.trigger('click');
      await flushPromises();

      expect(mockBaseServicesApi.list.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // ================ 状态显示 ================
  describe('status display', () => {
    it('TC-BSV-060: running 状态应显示对应徽章样式', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ status: 'running' })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const card = wrapper.find('.service-card');
      expect(card.classes()).toContain('status-running');
      expect(card.find('.status-badge').classes()).toContain('badge-running');
    });

    it('TC-BSV-061: stopped 状态应显示对应徽章样式', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ status: 'stopped' })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const card = wrapper.find('.service-card');
      expect(card.classes()).toContain('status-stopped');
    });

    it('TC-BSV-062: 应显示进程运行状态', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ processRunning: true })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const processRow = wrapper.findAll('.status-row').find((r) => r.text().includes('processRunning'));
      expect(processRow).toBeDefined();
      expect(processRow!.find('.row-value.ok').exists()).toBe(true);
    });

    it('TC-BSV-063: 应显示端口信息', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ port: 6379 })],
      });
      const wrapper = await mountView();
      await flushPromises();
      expect(wrapper.find('.svc-port').text()).toBe(':6379');
    });

    it('TC-BSV-064: 应显示文件检查结果', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ binaryExists: true, configExists: false })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const checks = wrapper.findAll('.check-item');
      expect(checks.length).toBeGreaterThanOrEqual(3);
      expect(checks[0].classes()).toContain('ok'); // binary 存在
      expect(checks[1].classes()).toContain('fail'); // config 不存在
    });

    it('TC-BSV-065: 应显示 autoStart 标志标签', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ autoStart: true, processGuard: false })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const flagRow = wrapper.findAll('.status-row').find((r) => r.text().includes('flags'));
      expect(flagRow).toBeDefined();
      expect(flagRow!.find('.flag-tag.flag-auto').exists()).toBe(true);
      expect(flagRow!.find('.flag-tag.flag-guard').exists()).toBe(false);
    });

    it('TC-BSV-066: 应显示 processGuard 标志标签', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ autoStart: false, processGuard: true })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const flagRow = wrapper.findAll('.status-row').find((r) => r.text().includes('flags'));
      expect(flagRow).toBeDefined();
      expect(flagRow!.find('.flag-tag.flag-guard').exists()).toBe(true);
      expect(flagRow!.find('.flag-tag.flag-auto').exists()).toBe(false);
    });

    it('TC-BSV-067: autoStart 和 processGuard 都为 false 时不显示标志行', async () => {
      mockBaseServicesApi.list.mockResolvedValue({
        data: [mockServiceStatus({ autoStart: false, processGuard: false })],
      });
      const wrapper = await mountView();
      await flushPromises();
      const flagRow = wrapper.findAll('.status-row').find((r) => r.text().includes('flags'));
      expect(flagRow).toBeUndefined();
    });
  });
});
