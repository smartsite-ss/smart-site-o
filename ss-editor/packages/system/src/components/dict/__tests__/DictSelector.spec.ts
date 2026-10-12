// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

// ======================== Mock i18n ========================
const t = vi.fn((key: string, _params?: any) => key);
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t }),
  i18n: { global: { t } },
}));

// ======================== Mock useDict ========================
const mockLoadDict = vi.fn();
const mockGetOptions = vi.fn();
const mockGetLabel = vi.fn();
const mockLoading = ref(false);

const mockUseDict = {
  loadDict: mockLoadDict,
  getOptions: mockGetOptions,
  getLabel: mockGetLabel,
  loading: mockLoading,
};

vi.mock('../../../composables/useDict', () => ({
  useDict: () => mockUseDict,
}));

// ======================== Test data ========================
const mockOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

// ======================== Import after mocks ========================
async function mountComponent(props: any = {}) {
  const mod = await import('../DictSelector.vue');
  return mount(mod.default, {
    props: {
      dictId: 'priority',
      modelValue: '',
      ...props,
    },
    global: {
      mocks: {
        $t: t,
      },
    },
    attachTo: document.body,
  });
}

describe('DictSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDict.mockResolvedValue(undefined);
    mockGetOptions.mockReturnValue(mockOptions);
    mockGetLabel.mockImplementation((_dictId: string, value: string) => {
      const found = mockOptions.find((o: any) => o.value === value);
      return found?.label ?? value;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('component rendering', () => {
    it('should render the component wrapper', async () => {
      const wrapper = await mountComponent();
      await flushPromises();

      expect(wrapper.find('.dict-selector').exists()).toBe(true);
      expect(wrapper.find('.dict-selector-wrapper').exists()).toBe(true);
    });

    it('should show placeholder when no value is selected', async () => {
      const wrapper = await mountComponent({ placeholder: '请选择' });
      await flushPromises();

      const trigger = wrapper.find('.dict-selector-trigger');
      expect(trigger.find('.dict-selector-placeholder').text()).toBe('请选择');
    });

    it('should show selected label when value is provided', async () => {
      const wrapper = await mountComponent({ modelValue: 'high' });
      await flushPromises();

      const trigger = wrapper.find('.dict-selector-trigger');
      expect(trigger.find('.dict-selector-selected').text()).toBe('高');
    });

    it('should call loadDict on mount', async () => {
      await mountComponent({ dictId: 'priority', locale: 'zh-CN' });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('priority', 'zh-CN');
    });
  });

  describe('value selection', () => {
    it('should emit update:modelValue when an option is selected', async () => {
      const wrapper = await mountComponent();
      await flushPromises();

      // Open the dropdown
      await wrapper.find('.dict-selector-trigger').trigger('click');
      await flushPromises();

      // Find and click the first option
      const options = document.querySelectorAll('.dict-selector-option');
      expect(options.length).toBe(3);

      (options[0] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await flushPromises();

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['high']);
    });

    it('should not open dropdown when disabled', async () => {
      const wrapper = await mountComponent({ disabled: true });
      await flushPromises();

      await wrapper.find('.dict-selector-trigger').trigger('click');
      await flushPromises();

      const panel = document.querySelector('.dict-selector-panel');
      expect(panel).toBeNull();
    });
  });

  describe('search/filter functionality', () => {
    it('should render filterable input when filterable is true', async () => {
      const wrapper = await mountComponent({ filterable: true });
      await flushPromises();

      expect(wrapper.find('.dict-selector-input').exists()).toBe(true);
    });

    it('should filter options based on filter text', async () => {
      mockGetOptions.mockReturnValue(mockOptions);

      const wrapper = await mountComponent({ filterable: true });
      await flushPromises();

      const input = wrapper.find('.dict-selector-input');
      await input.setValue('高');
      await flushPromises();

      const options = document.querySelectorAll('.dict-selector-option');
      expect(options.length).toBe(1);
      expect(options[0].textContent).toContain('高');
    });

    it('should show empty state when no options match filter', async () => {
      mockGetOptions.mockReturnValue(mockOptions);

      const wrapper = await mountComponent({ filterable: true, emptyText: '暂无数据' });
      await flushPromises();

      const input = wrapper.find('.dict-selector-input');
      await input.setValue('nonexistent');
      await flushPromises();

      const empty = document.querySelector('.dict-selector-empty');
      expect(empty).not.toBeNull();
      expect(empty!.textContent).toBe('暂无数据');
    });
  });

  describe('disabled state', () => {
    it('should apply disabled attribute to filterable input', async () => {
      const wrapper = await mountComponent({ filterable: true, disabled: true });
      await flushPromises();

      const input = wrapper.find('.dict-selector-input');
      expect(input.attributes('disabled')).toBeDefined();
    });

    it('should not toggle dropdown when disabled in non-filterable mode', async () => {
      const wrapper = await mountComponent({ disabled: true });
      await flushPromises();

      await wrapper.find('.dict-selector-trigger').trigger('click');
      await flushPromises();

      const panel = document.querySelector('.dict-selector-panel');
      expect(panel).toBeNull();
    });
  });

  describe('clear functionality', () => {
    it('should show clear button when allowClear is true and value is set', async () => {
      const wrapper = await mountComponent({ allowClear: true, modelValue: 'high' });
      await flushPromises();

      expect(wrapper.find('.dict-selector-clear').exists()).toBe(true);
    });

    it('should emit empty string when clear button is clicked', async () => {
      const wrapper = await mountComponent({ allowClear: true, modelValue: 'high' });
      await flushPromises();

      await wrapper.find('.dict-selector-clear').trigger('click');
      await flushPromises();

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['']);
    });
  });

  describe('loading state', () => {
    it('should show loading text when loading is true', async () => {
      mockLoading.value = true;

      const wrapper = await mountComponent();
      await flushPromises();

      await wrapper.find('.dict-selector-trigger').trigger('click');
      await flushPromises();

      const loading = document.querySelector('.dict-selector-loading');
      expect(loading).not.toBeNull();
      expect(loading!.textContent).toBe('common.loading');

      mockLoading.value = false;
    });
  });
});