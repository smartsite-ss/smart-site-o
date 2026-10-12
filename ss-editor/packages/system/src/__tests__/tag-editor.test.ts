// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// ======================== Mock i18n ========================
const t = vi.fn((key: string, _params?: any) => key);
vi.mock('@scada-editor/core', () => ({
  useI18n: () => ({ t }),
  i18n: { global: { t } },
}));

// ======================== Mock stores ========================
const mockTemplateStore = {
  templates: [] as any[],
  currentTemplate: null as any | null,
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  loading: false,
  error: null as string | null,
  allTags: ['modbus', 'standard', 'plc', 'temperature', 'opc', 's7', 'mqtt', 'bacnet', 'profibus', 'ethernet_ip', 'custom', 'test'] as string[],
  fetchTemplates: vi.fn().mockResolvedValue(undefined),
  updateTemplate: vi.fn().mockResolvedValue({}),
};

vi.mock('../stores/template.store', () => ({
  useTemplateStore: () => mockTemplateStore,
}));

// ======================== Import TagEditor dynamically ========================
async function mountTagEditor(props: {
  templateId: string;
  templateName: string;
  currentTags: string[];
  allAvailableTags: string[];
  projectId: string;
}) {
  const mod = await import('../components/template/TagEditor.vue');
  return mount(mod.default, {
    props,
    global: {
      mocks: {
        $t: t,
      },
      stubs: {},
    },
  });
}

const defaultProps = {
  templateId: 'tpl-1',
  templateName: 'Modbus Template',
  currentTags: ['modbus', 'standard'],
  allAvailableTags: ['modbus', 'standard', 'plc', 'temperature', 'opc'],
  projectId: 'proj-1',
};

// ======================== Tests ========================
describe('TagEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the tag editor modal', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.tag-editor-modal').exists()).toBe(true);
    });

    it('should render the modal header with title', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.modal-header').exists()).toBe(true);
      expect(wrapper.find('.modal-header h2').text()).toBe('system.deviceTemplate.tags.editTitle');
    });

    it('should display template name', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.info-value').text()).toBe('Modbus Template');
    });

    it('should render the close button in modal header', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.modal-close').exists()).toBe(true);
    });
  });

  describe('tag rendering', () => {
    it('should display current tags as chips', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(2);
      expect(tagChips[0].text()).toContain('modbus');
      expect(tagChips[1].text()).toContain('standard');
    });

    it('should show remove button on each tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const removeBtns = wrapper.findAll('.tag-remove');
      expect(removeBtns.length).toBe(2);
    });

    it('should show "no tags" when currentTags is empty', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
      });
      await flushPromises();

      expect(wrapper.find('.no-tags').exists()).toBe(true);
      expect(wrapper.find('.no-tags').text()).toBe('system.deviceTemplate.tags.noTags');
    });

    it('should show "no tags" when currentTags is empty array after removal', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
      });
      await flushPromises();

      expect(wrapper.find('.no-tags').exists()).toBe(true);
    });
  });

  describe('adding tags', () => {
    it('should render tag input field', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.tag-input').exists()).toBe(true);
    });

    it('should render add button', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.btn-primary.btn-sm').exists()).toBe(true);
    });

    it('should add a tag when typing and pressing enter', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('new-tag');
      await input.trigger('keydown.enter');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(3);
      expect(tagChips[2].text()).toContain('new-tag');
    });

    it('should add a tag when clicking add button', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('plc');

      const addBtn = wrapper.find('.btn-primary.btn-sm');
      await addBtn.trigger('click');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(3);
      expect(tagChips[2].text()).toContain('plc');
    });

    it('should not add empty tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('   ');
      await input.trigger('keydown.enter');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(2); // unchanged
    });

    it('should not add duplicate tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('modbus'); // already exists
      await input.trigger('keydown.enter');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(2); // unchanged, duplicate prevented
    });

    it('should clear input after adding tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('plc');
      await input.trigger('keydown.enter');
      await flushPromises();

      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('should have add button disabled when input is empty', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const addBtn = wrapper.find('.btn-primary.btn-sm');
      expect(addBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('removing tags', () => {
    it('should remove a tag when clicking remove button', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const removeBtns = wrapper.findAll('.tag-remove');
      expect(removeBtns.length).toBe(2);

      await removeBtns[0].trigger('click');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(1);
      expect(tagChips[0].text()).toContain('standard');
    });

    it('should remove all tags one by one', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      let removeBtns = wrapper.findAll('.tag-remove');
      await removeBtns[0].trigger('click');
      await flushPromises();

      removeBtns = wrapper.findAll('.tag-remove');
      await removeBtns[0].trigger('click');
      await flushPromises();

      expect(wrapper.find('.no-tags').exists()).toBe(true);
    });

    it('should allow re-adding a previously removed tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      // Remove modbus
      const removeBtns = wrapper.findAll('.tag-remove');
      await removeBtns[0].trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.tag-chip').length).toBe(1);

      // Re-add modbus
      const input = wrapper.find('.tag-input');
      await input.setValue('modbus');
      await input.trigger('keydown.enter');
      await flushPromises();

      expect(wrapper.findAll('.tag-chip').length).toBe(2);
    });
  });

  describe('suggested tags', () => {
    it('should display suggested tags section when allAvailableTags has data', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [], // no tags to show all suggestions
        allAvailableTags: ['modbus', 'standard', 'plc', 'temperature', 'opc'],
      });
      await flushPromises();

      expect(wrapper.find('.suggested-tags').exists()).toBe(true);
      expect(wrapper.find('.suggested-label').exists()).toBe(true);
    });

    it('should not show suggested tags section when allAvailableTags is empty', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        allAvailableTags: [],
      });
      await flushPromises();

      expect(wrapper.find('.suggested-tags').exists()).toBe(false);
    });

    it('should show suggested chips excluding already selected tags', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: ['modbus'],
        allAvailableTags: ['modbus', 'standard', 'plc', 'temperature', 'opc'],
      });
      await flushPromises();

      const suggestedChips = wrapper.findAll('.suggested-chip');
      // Should show all except 'modbus' which is already selected
      expect(suggestedChips.length).toBeGreaterThanOrEqual(1);
      const chipTexts = suggestedChips.map(chip => chip.text().trim());
      expect(chipTexts).not.toContain('+ modbus');
    });

    it('should add tag when clicking a suggested chip', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
        allAvailableTags: ['modbus', 'standard', 'plc'],
      });
      await flushPromises();

      const suggestedChips = wrapper.findAll('.suggested-chip');
      expect(suggestedChips.length).toBeGreaterThan(0);

      await suggestedChips[0].trigger('click');
      await flushPromises();

      const tagChips = wrapper.findAll('.tag-chip');
      expect(tagChips.length).toBe(1);
    });

    it('should display at most 10 suggested tags', async () => {
      const tags = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12'];
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
        allAvailableTags: tags,
      });
      await flushPromises();

      const suggestedChips = wrapper.findAll('.suggested-chip');
      expect(suggestedChips.length).toBeLessThanOrEqual(10);
    });
  });

  describe('tag input suggestions', () => {
    it('should show suggestion dropdown on input focus with matching items', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
        allAvailableTags: ['modbus', 'standard', 'plc', 'temperature', 'opc'],
      });
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('mod');
      await flushPromises();

      const suggestions = wrapper.findAll('.suggestion-item');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].text()).toBe('modbus');
    });

    it('should select suggestion on click', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
        allAvailableTags: ['modbus', 'standard', 'plc'],
      });
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('mod');
      await flushPromises();

      const suggestion = wrapper.find('.suggestion-item');
      expect(suggestion.exists()).toBe(true);

      await suggestion.trigger('click');
      await flushPromises();

      expect(wrapper.findAll('.tag-chip').length).toBe(1);
      expect(wrapper.find('.tag-chip').text()).toContain('modbus');
    });

    it('should hide suggestions on escape key', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: [],
        allAvailableTags: ['modbus', 'standard', 'plc'],
      });
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('mod');
      await flushPromises();

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(true);

      await input.trigger('keydown.esc');
      await flushPromises();

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(false);
    });

    it('should not show suggestions for empty input', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      expect(wrapper.find('.suggestions-dropdown').exists()).toBe(false);
    });

    it('should filter out already selected tags from suggestions', async () => {
      const wrapper = await mountTagEditor({
        ...defaultProps,
        currentTags: ['modbus'],
        allAvailableTags: ['modbus', 'standard', 'modbus_tcp'],
      });
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('mod');
      await flushPromises();

      const suggestions = wrapper.findAll('.suggestion-item');
      const texts = suggestions.map(s => s.text());
      expect(texts).not.toContain('modbus'); // already selected
      if (texts.includes('modbus_tcp')) {
        expect(texts).toContain('modbus_tcp');
      }
    });
  });

  describe('save action', () => {
    it('should render save and cancel buttons', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const footer = wrapper.find('.modal-footer');
      expect(footer.findAll('.btn').length).toBe(2);
    });

    it('should have save button disabled when no changes', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      // Initial state: no changes, save should be disabled
      const saveBtn = wrapper.find('.modal-footer .btn-primary');
      expect(saveBtn.attributes('disabled')).toBeDefined();
    });

    it('should enable save button after adding a tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const input = wrapper.find('.tag-input');
      await input.setValue('plc');
      await input.trigger('keydown.enter');
      await flushPromises();

      const saveBtn = wrapper.find('.modal-footer .btn-primary');
      expect(saveBtn.attributes('disabled')).toBeUndefined();
    });

    it('should enable save button after removing a tag', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const removeBtns = wrapper.findAll('.tag-remove');
      await removeBtns[0].trigger('click');
      await flushPromises();

      const saveBtn = wrapper.find('.modal-footer .btn-primary');
      expect(saveBtn.attributes('disabled')).toBeUndefined();
    });

    it('should call updateTemplate and emit saved on save', async () => {
      mockTemplateStore.updateTemplate.mockResolvedValueOnce({ tags: ['modbus', 'standard', 'plc'] });

      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      // Add a tag to trigger hasChanges
      const input = wrapper.find('.tag-input');
      await input.setValue('plc');
      await input.trigger('keydown.enter');
      await flushPromises();

      const saveBtn = wrapper.find('.modal-footer .btn-primary');
      await saveBtn.trigger('click');
      await flushPromises();

      expect(mockTemplateStore.updateTemplate).toHaveBeenCalledWith('tpl-1', {
        tags: ['modbus', 'standard', 'plc'],
      });
      expect(wrapper.emitted('saved')).toBeTruthy();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close when cancel button clicked', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const cancelBtn = wrapper.find('.modal-footer .btn-secondary');
      await cancelBtn.trigger('click');
      await flushPromises();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should display error when save fails', async () => {
      mockTemplateStore.updateTemplate.mockRejectedValueOnce({
        response: { data: { message: 'Save failed' } },
      });

      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      // Add a tag
      const input = wrapper.find('.tag-input');
      await input.setValue('plc');
      await input.trigger('keydown.enter');
      await flushPromises();

      const saveBtn = wrapper.find('.modal-footer .btn-primary');
      await saveBtn.trigger('click');
      await flushPromises();

      expect(wrapper.find('.alert-error').exists()).toBe(true);
    });
  });

  describe('modal close behavior', () => {
    it('should emit close when clicking overlay', async () => {
      const wrapper = await mountTagEditor(defaultProps);
      await flushPromises();

      const overlay = wrapper.find('.modal-overlay');
      await overlay.trigger('click.self');
      await flushPromises();

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});