// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// ======================== Mock i18n ========================
const t = vi.fn((key: string, _params?: any) => key);
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t }),
  i18n: { global: { t } },
}));

// ======================== Mock useDict ========================
const mockLoadDict = vi.fn();
const mockGetLabel = vi.fn();

const mockUseDict = {
  loadDict: mockLoadDict,
  getLabel: mockGetLabel,
};

vi.mock('../../../composables/useDict', () => ({
  useDict: () => mockUseDict,
}));

// ======================== Import after mocks ========================
async function mountComponent(props: any = {}) {
  const mod = await import('../DictLabel.vue');
  return mount(mod.default, {
    props: {
      dictId: 'priority',
      value: 'high',
      ...props,
    },
  });
}

describe('DictLabel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDict.mockResolvedValue(undefined);
    mockGetLabel.mockImplementation((_dictId: string, value: string, fallback?: string) => {
      const labelMap: Record<string, string> = {
        high: '高',
        medium: '中',
        low: '低',
      };
      return labelMap[value] ?? fallback ?? value;
    });
  });

  describe('label rendering', () => {
    it('should render the label for the given value', async () => {
      const wrapper = await mountComponent({ dictId: 'priority', value: 'high' });
      await flushPromises();

      const span = wrapper.find('.dict-label');
      expect(span.exists()).toBe(true);
      expect(span.text()).toBe('高');
    });

    it('should render the label via getLabel function', async () => {
      const wrapper = await mountComponent({ dictId: 'priority', value: 'medium' });
      await flushPromises();

      expect(mockGetLabel).toHaveBeenCalledWith('priority', 'medium', undefined);
      expect(wrapper.find('.dict-label').text()).toBe('中');
    });

    it('should call loadDict on mount', async () => {
      await mountComponent({ dictId: 'priority', value: 'high', locale: 'zh-CN' });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('priority', 'zh-CN');
    });
  });

  describe('fallback when dict not found', () => {
    it('should display fallback text when value is not found in dict', async () => {
      mockGetLabel.mockReturnValueOnce('未知');

      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'unknown',
        fallback: '未知',
      });
      await flushPromises();

      expect(wrapper.find('.dict-label').text()).toBe('未知');
      expect(mockGetLabel).toHaveBeenCalledWith('priority', 'unknown', '未知');
    });

    it('should display the value itself when no fallback is provided and not found', async () => {
      mockGetLabel.mockReturnValueOnce('unknownValue');

      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'unknownValue',
      });
      await flushPromises();

      expect(wrapper.find('.dict-label').text()).toBe('unknownValue');
    });
  });

  describe('value display', () => {
    it('should display the value directly when it is the label', async () => {
      mockGetLabel.mockReturnValueOnce('high');

      const wrapper = await mountComponent({ dictId: 'priority', value: 'high' });
      await flushPromises();

      const span = wrapper.find('.dict-label');
      expect(span.text()).toBe('high');
      expect(span.attributes('title')).toBe('high');
    });

    it('should set title attribute with value and label when they differ', async () => {
      // getLabel returns '高' for value 'high'
      mockGetLabel.mockReturnValueOnce('高');

      const wrapper = await mountComponent({ dictId: 'priority', value: 'high' });
      await flushPromises();

      const span = wrapper.find('.dict-label');
      expect(span.attributes('title')).toBe('high — 高');
    });
  });

  describe('loading state', () => {
    it('should call loadDict on mount with the correct locale', async () => {
      await mountComponent({
        dictId: 'status',
        value: 'active',
        locale: 'en',
      });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('status', 'en');
    });

    it('should use default locale zh-CN when not specified', async () => {
      await mountComponent({
        dictId: 'status',
        value: 'active',
      });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('status', 'zh-CN');
    });
  });
});