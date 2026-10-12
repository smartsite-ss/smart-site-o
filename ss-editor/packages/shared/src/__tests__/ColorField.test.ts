// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ColorField from '../ColorField.vue';

describe('ColorField', () => {
  // ================================================================
  // Rendering
  // ================================================================
  describe('rendering', () => {
    // TC-COLORFIELD-001
    it('should render an input of type color', () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#FF0000' },
      });

      const input = wrapper.find('input[type="color"]');
      expect(input.exists()).toBe(true);
    });

    // TC-COLORFIELD-002
    it('should render with #000000 as fallback for empty modelValue', () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '' },
      });

      const input = wrapper.find('input[type="color"]');
      expect(input.element.value).toBe('#000000');
    });
  });

  // ================================================================
  // Props
  // ================================================================
  describe('props', () => {
    // TC-COLORFIELD-003
    it('should accept modelValue prop and display correctly', () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#FF5733FF' },
      });

      const input = wrapper.find('input[type="color"]');
      // stripAlpha removes the alpha channel (last 2 chars)
      expect(input.element.value).toBe('#ff5733');
    });

    // TC-COLORFIELD-004
    it('should handle 7-char hex color (no alpha)', () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#64A479' },
      });

      const input = wrapper.find('input[type="color"]');
      expect(input.element.value).toBe('#64a479');
    });

    // TC-COLORFIELD-005
    it('should handle undefined modelValue', () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: undefined as unknown as string },
      });

      const input = wrapper.find('input[type="color"]');
      expect(input.element.value).toBe('#000000');
    });
  });

  // ================================================================
  // Events
  // ================================================================
  describe('events', () => {
    // TC-COLORFIELD-006
    it('should emit update:modelValue with alpha appended on input', async () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#FF0000' },
      });

      const input = wrapper.find('input[type="color"]');
      // Simulate changing the color value
      const nativeInput = input.element as HTMLInputElement;
      // Mock the value property
      Object.defineProperty(nativeInput, 'value', {
        value: '#00ff00',
        writable: true,
      });
      await input.trigger('input');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['#00ff00FF']);
    });

    // TC-COLORFIELD-007
    it('should emit update:modelValue with 7-char hex appended with FF', async () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#FF0000' },
      });

      const input = wrapper.find('input[type="color"]');
      const nativeInput = input.element as HTMLInputElement;
      Object.defineProperty(nativeInput, 'value', {
        value: '#abcdef',
        writable: true,
      });
      await input.trigger('input');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0]).toEqual(['#abcdefFF']);
    });

    // TC-COLORFIELD-008
    it('should not append FF if color already has 9 chars', async () => {
      const wrapper = mount(ColorField, {
        props: { modelValue: '#FF0000' },
      });

      const input = wrapper.find('input[type="color"]');
      const nativeInput = input.element as HTMLInputElement;
      Object.defineProperty(nativeInput, 'value', {
        value: '#11223344',
        writable: true,
      });
      await input.trigger('input');

      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0]).toEqual(['#11223344']);
    });
  });
});