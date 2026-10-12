// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// Mock @scada-editor/core i18n
vi.mock('@scada-editor/core', () => ({
  i18n: {
    global: {
      t: (key: string) => {
        const translations: Record<string, string> = {
          'operations.clear': 'Clear',
          'settings.confirm': 'Confirm',
        };
        return translations[key] || key;
      },
    },
  },
}));

import ColorPicker from '../ColorPicker.vue';

describe('ColorPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // Rendering
  // ================================================================
  describe('rendering', () => {
    // TC-COLORPICKER-001
    it('should render the color picker trigger', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');
      expect(trigger.exists()).toBe(true);
    });

    // TC-COLORPICKER-002
    it('should render the main container with class color-picker', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      expect(wrapper.find('.color-picker').exists()).toBe(true);
    });

    // TC-COLORPICKER-003
    it('should display the color preview element', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const preview = wrapper.find('.color-preview');
      expect(preview.exists()).toBe(true);
    });

    // TC-COLORPICKER-004
    it('should show is-transparent class when modelValue is empty', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '' },
      });

      const preview = wrapper.find('.color-preview');
      expect(preview.classes()).toContain('is-transparent');
    });

    // TC-COLORPICKER-005
    it('should not show color picker content initially', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const content = wrapper.find('.color-picker-content');
      expect(content.exists()).toBe(false);
    });
  });

  // ================================================================
  // Props
  // ================================================================
  describe('props', () => {
    // TC-COLORPICKER-006
    it('should accept modelValue prop', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#64A479' },
      });

      const preview = wrapper.find('.color-preview');
      expect(preview.attributes('style')).toContain('rgb(100, 164, 121)');
    });

    // TC-COLORPICKER-007
    it('should use default modelValue of #64A479', () => {
      const wrapper = mount(ColorPicker);

      const preview = wrapper.find('.color-preview');
      expect(preview.attributes('style')).toContain('rgb(100, 164, 121)');
    });

    // TC-COLORPICKER-008
    it('should accept direction prop', () => {
      const wrapper = mount(ColorPicker, {
        props: {
          modelValue: '#FF0000',
          direction: 'top',
        },
      });

      expect(wrapper.props('direction')).toBe('top');
    });

    // TC-COLORPICKER-009
    it('should use default direction of bottom', () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      expect(wrapper.props('direction')).toBe('bottom');
    });
  });

  // ================================================================
  // Events
  // ================================================================
  describe('events', () => {
    // TC-COLORPICKER-010
    it('should open color picker content on trigger click', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      const content = wrapper.find('.color-picker-content');
      expect(content.exists()).toBe(true);
    });

    // TC-COLORPICKER-011
    it('should close color picker on confirm button click', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      // Open first
      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');
      expect(wrapper.find('.color-picker-content').exists()).toBe(true);

      // Click confirm
      const confirmBtn = wrapper.find('.color-picker-button.confirm');
      await confirmBtn.trigger('click');

      expect(wrapper.find('.color-picker-content').exists()).toBe(false);
    });

    // TC-COLORPICKER-012
    it('should emit colorChange on confirm', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      // Open
      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      // Click confirm
      const confirmBtn = wrapper.find('.color-picker-button.confirm');
      await confirmBtn.trigger('click');

      const emitted = wrapper.emitted('colorChange');
      expect(emitted).toBeTruthy();
    });

    // TC-COLORPICKER-013
    it('should emit colorChange with empty string on clear', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      // Open
      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      // Click clear
      const clearBtn = wrapper.find('.color-picker-button.clear');
      await clearBtn.trigger('click');

      const emitted = wrapper.emitted('colorChange');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['']);
    });

    // TC-COLORPICKER-014
    it('should emit update:modelValue with empty string on clear', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      // Open
      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      // Click clear
      const clearBtn = wrapper.find('.color-picker-button.clear');
      await clearBtn.trigger('click');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['']);
    });

    // TC-COLORPICKER-015
    it('should emit events on preset color click', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      // Open
      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      // Click first preset color
      const firstPreset = wrapper.find('.preset-color');
      await firstPreset.trigger('click');

      const emitted = wrapper.emitted('colorChange');
      expect(emitted).toBeTruthy();
    });

    // TC-COLORPICKER-016
    it('should toggle color picker on repeated trigger clicks', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');

      // Open
      await trigger.trigger('click');
      expect(wrapper.find('.color-picker-content').exists()).toBe(true);

      // Close
      await trigger.trigger('click');
      expect(wrapper.find('.color-picker-content').exists()).toBe(false);
    });
  });

  // ================================================================
  // Preset colors
  // ================================================================
  describe('preset colors', () => {
    // TC-COLORPICKER-017
    it('should render preset colors when opened', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      const presets = wrapper.findAll('.preset-color');
      expect(presets.length).toBe(20);
    });
  });

  // ================================================================
  // Footer actions
  // ================================================================
  describe('footer', () => {
    // TC-COLORPICKER-018
    it('should render clear and confirm buttons', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      expect(wrapper.find('.color-picker-button.clear').exists()).toBe(true);
      expect(wrapper.find('.color-picker-button.confirm').exists()).toBe(true);
    });

    // TC-COLORPICKER-019
    it('should render color value input', async () => {
      const wrapper = mount(ColorPicker, {
        props: { modelValue: '#FF0000' },
      });

      const trigger = wrapper.find('.color-picker-trigger');
      await trigger.trigger('click');

      expect(wrapper.find('.color-value-input').exists()).toBe(true);
    });
  });
});