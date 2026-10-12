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
const mockGetDict = vi.fn();

const mockUseDict = {
  loadDict: mockLoadDict,
  getLabel: mockGetLabel,
  getDict: mockGetDict,
};

vi.mock('../../../composables/useDict', () => ({
  useDict: () => mockUseDict,
}));

// ======================== Test data ========================
const mockPriorityDict: any = {
  dictId: 'priority',
  dictName: '优先级',
  category: 'common',
  items: [
    { value: 'high', label: '高', sortOrder: 1, description: '' },
    { value: 'medium', label: '中', sortOrder: 2, description: '' },
    { value: 'low', label: '低', sortOrder: 3, description: '' },
  ],
};

// ======================== Import after mocks ========================
async function mountComponent(props: any = {}) {
  const mod = await import('../DictTag.vue');
  return mount(mod.default, {
    props: {
      dictId: 'priority',
      value: 'high',
      ...props,
    },
  });
}

describe('DictTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDict.mockResolvedValue(undefined);
    mockGetLabel.mockImplementation((_dictId: string, value: string) => {
      const labelMap: Record<string, string> = {
        high: '高',
        medium: '中',
        low: '低',
        active: '活跃',
        acknowledged: '已确认',
        cleared: '已清除',
        shelved: '搁置',
        good: '良好',
        bad: '差',
        uncertain: '不确定',
        stale: '陈旧',
        draft: '草稿',
        published: '已发布',
        deprecated: '已废弃',
      };
      return labelMap[value] ?? value;
    });
    mockGetDict.mockReturnValue(mockPriorityDict);
  });

  // ==================== TC-DICT-TAG-001: Tag rendering ====================
  describe('tag rendering (type="tag")', () => {
    it('should render tag element with correct class', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag').exists()).toBe(true);
    });

    it('should display the translated label text', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag').text()).toBe('高');
    });

    it('should set title attribute with value and label when they differ', async () => {
      // label '高' differs from value 'high'
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag').attributes('title')).toBe('high — 高');
    });

    it('should apply small size class when size is "small"', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
        size: 'small',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag--small').exists()).toBe(true);
    });

    it('should call loadDict on mount with correct parameters', async () => {
      await mountComponent({
        dictId: 'priority',
        value: 'high',
        locale: 'zh-CN',
      });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('priority', 'zh-CN');
    });
  });

  // ==================== TC-DICT-TAG-002: Badge rendering ====================
  describe('badge rendering (type="badge")', () => {
    it('should render badge dot element', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'badge',
      });
      await flushPromises();

      expect(wrapper.find('.dict-badge').exists()).toBe(true);
      expect(wrapper.find('.dict-tag').exists()).toBe(false);
    });

    it('should render tag element when type is not specified (default)', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
      });
      await flushPromises();

      // Default type is 'tag'
      expect(wrapper.find('.dict-tag').exists()).toBe(true);
      expect(wrapper.find('.dict-badge').exists()).toBe(false);
    });

    it('should apply small size class for badge', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'badge',
        size: 'small',
      });
      await flushPromises();

      expect(wrapper.find('.dict-badge--small').exists()).toBe(true);
    });

    it('should not display text content in badge mode', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'badge',
      });
      await flushPromises();

      expect(wrapper.find('.dict-badge').text()).toBe('');
    });
  });

  // ==================== TC-DICT-TAG-003: Custom colorMap ====================
  describe('custom colorMap', () => {
    it('should apply custom color from colorMap prop', async () => {
      const wrapper = await mountComponent({
        dictId: 'deviceType',
        value: 'modbus_tcp',
        type: 'tag',
        colorMap: { modbus_tcp: '#06b6d4', opc_ua: '#8b5cf6' },
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(6, 182, 212)');
    });

    it('should fallback to palette when value not in colorMap', async () => {
      const wrapper = await mountComponent({
        dictId: 'deviceType',
        value: 'unknown_type',
        type: 'tag',
        colorMap: { modbus_tcp: '#06b6d4' },
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      // Should have some color style applied (from palette fallback)
      expect(tag.attributes('style')).toContain('color');
    });
  });

  // ==================== TC-DICT-TAG-004: Preset color mappings ====================
  describe('preset color mappings', () => {
    it('should use preset red color for active alarm', async () => {
      const wrapper = await mountComponent({
        dictId: 'alarmStatus',
        value: 'active',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(245, 34, 45)');
    });

    it('should use preset orange color for acknowledged alarm', async () => {
      const wrapper = await mountComponent({
        dictId: 'alarmStatus',
        value: 'acknowledged',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(250, 140, 22)');
    });

    it('should use preset green color for cleared alarm', async () => {
      const wrapper = await mountComponent({
        dictId: 'alarmStatus',
        value: 'cleared',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(82, 196, 26)');
    });

    it('should use preset gray color for shelved alarm', async () => {
      const wrapper = await mountComponent({
        dictId: 'alarmStatus',
        value: 'shelved',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(217, 217, 217)');
    });

    it('should use preset colors for dataQuality dict', async () => {
      const wrapper = await mountComponent({
        dictId: 'dataQuality',
        value: 'good',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(82, 196, 26)');
    });

    it('should use preset colors for templateStatus dict', async () => {
      const wrapper = await mountComponent({
        dictId: 'templateStatus',
        value: 'published',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      expect(tag.attributes('style')).toContain('color: rgb(24, 144, 255)');
    });
  });

  // ==================== TC-DICT-TAG-005: Color palette fallback ====================
  describe('color palette fallback', () => {
    it('should assign color from palette based on item index', async () => {
      // priority dict has 3 items, each gets a palette color by index
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      // First item in palette is '#1890ff' → rgb(24, 144, 255)
      expect(tag.attributes('style')).toContain('color: rgb(24, 144, 255)');
    });

    it('should assign consistent color for same dictId and value', async () => {
      const wrapper1 = await mountComponent({
        dictId: 'priority',
        value: 'medium',
        type: 'tag',
      });
      await flushPromises();

      const wrapper2 = await mountComponent({
        dictId: 'priority',
        value: 'medium',
        type: 'tag',
      });
      await flushPromises();

      const style1 = wrapper1.find('.dict-tag').attributes('style');
      const style2 = wrapper2.find('.dict-tag').attributes('style');
      expect(style1).toBe(style2);
    });

    it('should use color from palette hash when dict is not loaded', async () => {
      // Return undefined for getDict to trigger hash-based fallback
      mockGetDict.mockReturnValue(undefined);

      const wrapper = await mountComponent({
        dictId: 'unknownDict',
        value: 'someValue',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      // Should still get a valid color from the hash-based fallback
      expect(tag.attributes('style')).toContain('color');
    });
  });

  // ==================== TC-DICT-TAG-006: Style application ====================
  describe('style application', () => {
    it('should apply background color with transparency for tags', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      const tag = wrapper.find('.dict-tag');
      const style = tag.attributes('style');
      expect(style).toContain('background-color');
      expect(style).toContain('border-color');
    });

    it('should apply solid background color for badges', async () => {
      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'badge',
      });
      await flushPromises();

      const badge = wrapper.find('.dict-badge');
      expect(badge.attributes('style')).toContain('background-color');
    });
  });

  // ==================== TC-DICT-TAG-007: Locale handling ====================
  describe('locale handling', () => {
    it('should use default locale zh-CN when not specified', async () => {
      await mountComponent({
        dictId: 'priority',
        value: 'high',
      });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('priority', 'zh-CN');
    });

    it('should load dict with specified locale', async () => {
      await mountComponent({
        dictId: 'priority',
        value: 'high',
        locale: 'en-US',
      });
      await flushPromises();

      expect(mockLoadDict).toHaveBeenCalledWith('priority', 'en-US');
    });
  });

  // ==================== TC-DICT-TAG-008: Title attribute ====================
  describe('title attribute', () => {
    it('should set title = "value — label" when they differ', async () => {
      const wrapper = await mountComponent({
        dictId: 'alarmStatus',
        value: 'active',
        type: 'tag',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag').attributes('title')).toBe('active — 活跃');
    });

    it('should set title = value when label equals value', async () => {
      mockGetLabel.mockImplementation((_dictId: string, value: string) => value);

      const wrapper = await mountComponent({
        dictId: 'priority',
        value: 'high',
        type: 'tag',
      });
      await flushPromises();

      expect(wrapper.find('.dict-tag').attributes('title')).toBe('high');
    });
  });
});
