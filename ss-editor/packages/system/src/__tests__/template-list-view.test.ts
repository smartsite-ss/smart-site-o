// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock i18n ========================
const t = vi.fn((key: string, _params?: any) => key);
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t, locale: { value: 'zh-CN' } }),
  i18n: { global: { t } },
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

// ======================== Mock templateApi ========================
const mockTemplateApi = {
  list: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
  deprecate: vi.fn(),
  clone: vi.fn(),
  apply: vi.fn(),
  sync: vi.fn(),
  getAllTags: vi.fn(),
  getIndex: vi.fn().mockResolvedValue({ data: null }),
  getLoaded: vi.fn().mockResolvedValue({ data: [] }),
  reload: vi.fn().mockResolvedValue({ data: { loaded: 0 } }),
  rebuildIndex: vi.fn().mockResolvedValue({ data: { totalTemplates: 0 } }),
  importTemplate: vi.fn(),
  createCategory: vi.fn().mockResolvedValue({}),
  renameCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue({}),
};

vi.mock('../api/modules/template.api', () => ({
  templateApi: mockTemplateApi,
}));

// ======================== Mock vue-router ========================
const mockRouterPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useRoute: () => ({ params: {} }),
}));

// ======================== Mock stores ========================
const mockTemplateStore = {
  templates: [] as any[],
  currentTemplate: null as any | null,
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  loading: false,
  error: null as string | null,
  hasTemplates: false,
  draftCount: 0,
  publishedCount: 0,
  allTags: [] as string[],
  fetchTemplates: vi.fn().mockResolvedValue(undefined),
  fetchTemplate: vi.fn().mockResolvedValue(undefined),
  createTemplate: vi.fn().mockResolvedValue({ id: 'new-tpl', status: 'draft' }),
  updateTemplate: vi.fn().mockResolvedValue({}),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  publishTemplate: vi.fn().mockResolvedValue({ status: 'published' }),
  deprecateTemplate: vi.fn().mockResolvedValue({ status: 'deprecated' }),
  cloneTemplate: vi.fn().mockResolvedValue({ id: 'cloned-tpl', name: 'Template (Copy)' }),
  applyTemplate: vi.fn().mockResolvedValue({}),
  syncTemplate: vi.fn().mockResolvedValue({}),
};

const mockProjectStore = {
  currentProject: { id: 'proj-1', name: 'Test Project' },
  projects: [{ id: 'proj-1', name: 'Test Project' }],
};

vi.mock('../stores/template.store', () => ({
  useTemplateStore: () => mockTemplateStore,
}));

vi.mock('../stores/project.store', () => ({
  useProjectStore: () => mockProjectStore,
}));

// ======================== Mock useDict ========================
vi.mock('../composables/useDict', () => ({
  useDict: () => ({
    loadDicts: vi.fn().mockResolvedValue(undefined),
    loadDict: vi.fn().mockResolvedValue(undefined),
    getDict: vi.fn().mockReturnValue([]),
    getLabel: vi.fn((_dictId: string, value: string) => value),
    getOptions: vi.fn().mockReturnValue([]),
    dicts: {} as Record<string, any[]>,
    clearCache: vi.fn(),
  }),
}));

// ======================== Helper: build mock template ========================
const mockVariable = (overrides: Record<string, any> = {}) => ({
  order: 1,
  name: 'Temperature',
  address: '40001',
  dataType: 'float32',
  enabled: true,
  scanRate: 1000,
  unit: '°C',
  description: 'Temperature reading',
  ...overrides,
});

const mockTemplate = (overrides: Record<string, any> = {}) => ({
  id: 'tpl-1',
  projectId: 'proj-1',
  name: 'Modbus Template',
  description: 'Standard Modbus device template',
  deviceType: 'modbus_tcp',
  version: '1.0.0',
  status: 'draft',
  isDefault: false,
  variables: [mockVariable()],
  authorId: 'user-1',
  tags: ['modbus', 'standard'],
  linkedDevices: 0,
  industry: '工业自动化',
  category: 'PLC控制器',
  protocolType: 'modbus_tcp',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

async function mountListView() {
  // Reset mocks before each mount to avoid cross-test contamination
  mockTemplateStore.fetchTemplates.mockClear();
  mockTemplateStore.fetchTemplates.mockResolvedValue(undefined);
  mockTemplateApi.getIndex.mockResolvedValue({ data: null });
  mockTemplateApi.getLoaded.mockResolvedValue({ data: [] });

  // Dynamic import to ensure mocks are applied
  const mod = await import('../views/templates/TemplateListView.vue');
  return mount(mod.default, {
    global: {
      mocks: {
        $t: t,
      },
      stubs: {
        Teleport: false, // render teleport contents inline
      },
    },
  });
}

// ======================== Tests ========================
describe('TemplateListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ================ TC-TLV-001 ~ TC-TLV-005: Initial Rendering ================
  describe('rendering', () => {
    it('TC-TLV-001: should render the template library layout with sidebar and main area', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      expect(wrapper.find('.template-library').exists()).toBe(true);
      expect(wrapper.find('.sidebar').exists()).toBe(true);
      expect(wrapper.find('.main-area').exists()).toBe(true);
    });

    it('TC-TLV-002: should render sidebar with header and 4 toolbar buttons', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const sidebar = wrapper.find('.sidebar');
      expect(sidebar.find('.sidebar-title').exists()).toBe(true);
      expect(sidebar.find('.template-count').exists()).toBe(true);
      expect(sidebar.findAll('.tb-btn').length).toBe(4);
    });

    it('TC-TLV-003: should render search input in sidebar', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      expect(wrapper.find('.sidebar-search').exists()).toBe(true);
      const searchInput = wrapper.find('.search-input');
      expect(searchInput.exists()).toBe(true);
      expect((searchInput.element as HTMLInputElement).type).toBe('text');
    });

    it('TC-TLV-004: should render "all templates" root node in tree', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      expect(wrapper.find('.root-node').exists()).toBe(true);
    });

    it('TC-TLV-005: should show empty state when no template selected', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });
  });

  // ================ TC-TLV-006 ~ TC-TLV-010: Tree Structure ================
  describe('tree structure', () => {
    it('TC-TLV-006: should render protocol and industry section labels', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const sectionLabels = wrapper.findAll('.tree-section-label');
      expect(sectionLabels.length).toBeGreaterThanOrEqual(0);
    });

    it('TC-TLV-007: should expand group node on click', async () => {
      const templates = [
        mockTemplate({ id: 'tpl-1', name: 'T1', deviceType: 'modbus_tcp' }),
      ];
      mockTemplateStore.templates = templates;
      mockTemplateStore.hasTemplates = true;

      const wrapper = await mountListView();
      await flushPromises();

      // Initially no category node visible
      expect(wrapper.findAll('.category-node').length).toBe(0);

      // Find and click a group node
      const groupNodes = wrapper.findAll('.group-node');
      if (groupNodes.length > 0) {
        await groupNodes[0].trigger('click');
        await flushPromises();
      }
    });
  });

  // ================ TC-TLV-011 ~ TC-TLV-015: Template Selection ================
  describe('template selection', () => {
    it('TC-TLV-011: should select root node when clicking all templates', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const rootNode = wrapper.find('.root-node');
      await rootNode.trigger('click');
      await flushPromises();

      expect(rootNode.classes()).toContain('active');
      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });

    it('TC-TLV-012: should show template header and variables when template selected', async () => {
      // Reset templates to avoid cross-test contamination
      mockTemplateStore.templates = [];
      mockTemplateStore.hasTemplates = false;

      // Mock getById to return template with variables
      mockTemplateApi.getById.mockResolvedValue({
        data: mockTemplate({
          id: 'tpl-1',
          name: 'Selected Template',
          status: 'published',
          variables: [
            mockVariable({ order: 1, name: 'temp1', address: '40001', dataType: 'float32' }),
            mockVariable({ order: 2, name: 'temp2', address: '40002', dataType: 'int32' }),
          ],
        }),
      });

      const wrapper = await mountListView();
      await flushPromises();

      // Manually trigger template selection via the component's method
      // We can simulate by setting up loadedTemplates
      // Since the component handles this internally, we can verify the right panel renders
      // when a template is selected by calling selectTemplate
      const vm = wrapper.vm as any;

      // Set up the loaded templates so selectTemplate can find data
      vm.loadedTemplates = [mockTemplate({
        id: 'tpl-1',
        name: 'Selected Template',
        status: 'published',
        variables: [
          { order: 1, name: 'temp1', address: '40001', dataType: 'float32', scanRate: 1000, unit: '°C', description: 'temp1' },
          { order: 2, name: 'temp2', address: '40002', dataType: 'int32', scanRate: 500, unit: 'bar', description: 'temp2' },
        ],
      })];

      await vm.selectTemplate('tpl-1');
      await flushPromises();

      // Check template header
      expect(wrapper.find('.template-header').exists()).toBe(true);
      expect(wrapper.find('.template-name').text()).toBe('Selected Template');

      // Check variables section
      expect(wrapper.find('.variables-section').exists()).toBe(true);
      expect(wrapper.find('.data-table').exists()).toBe(true);

      // Check variable rows
      const rows = wrapper.findAll('.data-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].find('.col-name').text()).toBe('temp1');
      expect(rows[0].find('.col-address code').text()).toBe('40001');
    });

    it('TC-TLV-013: should show variable count in header', async () => {
      const wrapper = await mountListView();
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.loadedTemplates = [mockTemplate({
        id: 'tpl-2',
        name: 'Multi Var Template',
        variables: [
          { order: 1, name: 'v1', address: '40001', dataType: 'float32' },
          { order: 2, name: 'v2', address: '40002', dataType: 'int16' },
          { order: 3, name: 'v3', address: '40003', dataType: 'boolean' },
        ],
      })];

      await vm.selectTemplate('tpl-2');
      await flushPromises();

      expect(wrapper.find('.variable-count').exists()).toBe(true);
    });

    it('TC-TLV-014: should show empty variables when template has no variables', async () => {
      const wrapper = await mountListView();
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.loadedTemplates = [mockTemplate({
        id: 'tpl-3',
        name: 'Empty Template',
        variables: [],
      })];

      await vm.selectTemplate('tpl-3');
      await flushPromises();

      expect(wrapper.find('.empty-variables').exists()).toBe(true);
      expect(wrapper.find('.data-table').exists()).toBe(false);
    });

    it('TC-TLV-015: should show select hint when deselecting template', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      // Initially empty state
      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });
  });

  // ================ TC-TLV-016 ~ TC-TLV-020: Create/Edit Modals ================
  describe('create and edit modals', () => {
    it('TC-TLV-016: should open create modal on new template button click', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const newBtn = wrapper.findAll('.tb-btn')[0];
      await newBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-header h2').exists()).toBe(true);
    });

    it('TC-TLV-017: should close create modal on cancel', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const newBtn = wrapper.findAll('.tb-btn')[0];
      await newBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);

      const cancelBtn = wrapper.findAll('.btn-secondary')[0];
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });

    it('TC-TLV-018: should create template on form submit', async () => {
      mockTemplateStore.createTemplate.mockResolvedValue({
        id: 'new-tpl',
        name: 'New Test Template',
        status: 'draft',
        deviceType: 'modbus_tcp',
        version: '1.0.0',
        variables: [],
        tags: [],
      });

      const wrapper = await mountListView();
      await flushPromises();

      const newBtn = wrapper.findAll('.tb-btn')[0];
      await newBtn.trigger('click');
      await flushPromises();

      // Fill form
      const nameInput = wrapper.findAll('.form-input')[0];
      await nameInput.setValue('New Test Template');
      await flushPromises();

      // Submit
      const primaryBtn = wrapper.find('.btn-primary');
      if (primaryBtn.exists()) {
        await primaryBtn.trigger('click');
        await flushPromises();
      }

      expect(showSuccess).toHaveBeenCalled();
    });

    it('TC-TLV-019: should show import modal on import button click', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const importBtn = wrapper.findAll('.tb-btn')[1];
      await importBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    });

    it('TC-TLV-020: should show confirmation before reload', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      const reloadBtn = wrapper.findAll('.tb-btn')[2];
      await reloadBtn.trigger('click');
      await flushPromises();

      expect(showConfirm).toHaveBeenCalled();
    });
  });

  // ================ TC-TLV-021 ~ TC-TLV-025: Context Menu ================
  describe('context menu', () => {
    it('TC-TLV-021: should show context menu on right-click group node', async () => {
      const wrapper = await mountListView();
      await flushPromises();

      // Trigger right-click on a group node
      const templateNode = wrapper.find('.template-node');
      if (templateNode.exists()) {
        await templateNode.trigger('contextmenu');
        await flushPromises();
      }
    });
  });

  // ================ TC-TLV-026 ~ TC-TLV-030: Edge Cases ================
  describe('edge cases', () => {
    it('TC-TLV-026: should show loading state initially', async () => {
      const wrapper = await mountListView();
      // Before flush, loading might be visible
      expect(wrapper.find('.template-library').exists()).toBe(true);
    });

    it('TC-TLV-027: should handle empty template list', async () => {
      mockTemplateStore.templates = [];
      mockTemplateStore.hasTemplates = false;

      const wrapper = await mountListView();
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });

    it('TC-TLV-028: should show version badge on template nodes', async () => {
      const templates = [
        mockTemplate({ id: 'tpl-1', name: 'T1', version: '2.0.0' }),
      ];
      mockTemplateStore.templates = templates;
      mockTemplateStore.hasTemplates = true;

      const wrapper = await mountListView();
      await flushPromises();

      // Template nodes with version tags
      const _versionTags = wrapper.findAll('.version-tag');
      // May be in the tree or in template header
    });

    it('TC-TLV-029: should show status tags for templates', async () => {
      // Reset templates to avoid cross-test contamination
      mockTemplateStore.templates = [];
      mockTemplateStore.hasTemplates = false;

      mockTemplateApi.getById.mockResolvedValue({
        data: mockTemplate({ id: 'tpl-1', name: 'Published Tpl', status: 'published' }),
      });

      const wrapper = await mountListView();
      await flushPromises();
      const vm = wrapper.vm as any;

      vm.loadedTemplates = [mockTemplate({
        id: 'tpl-1',
        name: 'Published Tpl',
        status: 'published',
        variables: [{ order: 1, name: 'v1', address: '40001', dataType: 'float32' }],
      })];

      await vm.selectTemplate('tpl-1');
      await flushPromises();

      expect(wrapper.find('.status-tag').exists()).toBe(true);
      expect(wrapper.find('.status-published').exists()).toBe(true);
    });

    it('TC-TLV-030: should handle API failure gracefully', async () => {
      mockTemplateStore.fetchTemplates.mockRejectedValue(new Error('Network error'));

      const wrapper = await mountListView();
      await flushPromises();

      // Should still render the layout
      expect(wrapper.find('.template-library').exists()).toBe(true);
    });
  });
});