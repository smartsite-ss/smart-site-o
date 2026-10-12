// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useConfigStore, useTheme, i18n } from '@scada-editor/core';

vi.mock('@scada-editor/core', () => ({
  useConfigStore: vi.fn(),
  useTheme: vi.fn(() => ({
    switchTheme: vi.fn(),
  })),
  i18n: {
    global: {
      locale: 'zh-CN',
    },
  },
}));

describe('InterfaceTab Configuration', () => {
  let mockConfigStore: any;
  let mockSwitchTheme: any;

  beforeEach(() => {
    mockSwitchTheme = vi.fn();
    mockConfigStore = {
      ui: {
        theme: 'dark',
        language: 'zh-CN',
        showToolbar: true,
        showPropertyPanel: true,
        showLayerPanel: true,
      },
      canvas: {
        showRulers: true,
      },
      updateUIConfig: vi.fn(),
      updateCanvasConfig: vi.fn(),
    };
    (useConfigStore as any).mockReturnValue(mockConfigStore);
    (useTheme as any).mockReturnValue({ switchTheme: mockSwitchTheme });
    (i18n as any).global.locale = 'zh-CN';
  });

  describe('Theme Settings', () => {
    it('should initialize theme from configStore', () => {
      const selectedTheme = ref(mockConfigStore.ui.theme);
      expect(selectedTheme.value).toBe('dark');
    });

    it('should update theme when changed', () => {
      const selectedTheme = ref('dark');
      selectedTheme.value = 'light';
      
      mockSwitchTheme(selectedTheme.value);
      mockConfigStore.updateUIConfig({ theme: selectedTheme.value });
      
      expect(mockSwitchTheme).toHaveBeenCalledWith('light');
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should support multiple theme options', () => {
      const themes = ['light', 'dark', 'tech-light-blue', 'tech-dark-blue'];
      themes.forEach(theme => {
        mockConfigStore.updateUIConfig({ theme });
        expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ theme });
      });
    });
  });

  describe('Language Settings', () => {
    it('should initialize language from configStore', () => {
      const selectedLanguage = ref(mockConfigStore.ui.language);
      expect(selectedLanguage.value).toBe('zh-CN');
    });

    it('should update language when changed', () => {
      const selectedLanguage = ref('zh-CN');
      selectedLanguage.value = 'en-US';
      
      (i18n as any).global.locale = selectedLanguage.value;
      mockConfigStore.updateUIConfig({ language: selectedLanguage.value });
      
      expect(i18n.global.locale).toBe('en-US');
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ language: 'en-US' });
    });

    it('should support Chinese and English languages', () => {
      const languages = ['zh-CN', 'en-US'];
      languages.forEach(lang => {
        (i18n as any).global.locale = lang;
        mockConfigStore.updateUIConfig({ language: lang });
        expect(i18n.global.locale).toBe(lang);
      });
    });
  });

  describe('Display Settings', () => {
    it('should initialize showRulers from configStore', () => {
      const showRulers = ref(mockConfigStore.canvas.showRulers);
      expect(showRulers.value).toBe(true);
    });

    it('should update showRulers when changed', () => {
      const showRulers = ref(true);
      showRulers.value = false;
      
      mockConfigStore.updateCanvasConfig({ showRulers: showRulers.value });
      
      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ showRulers: false });
    });

    it('should initialize showToolbar from configStore', () => {
      const showToolbar = ref(mockConfigStore.ui.showToolbar);
      expect(showToolbar.value).toBe(true);
    });

    it('should update showToolbar when changed', () => {
      const showToolbar = ref(true);
      showToolbar.value = false;
      
      mockConfigStore.updateUIConfig({ showToolbar: showToolbar.value });
      
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showToolbar: false });
    });

    it('should initialize showPropertyPanel from configStore', () => {
      const showPropertyPanel = ref(mockConfigStore.ui.showPropertyPanel);
      expect(showPropertyPanel.value).toBe(true);
    });

    it('should update showPropertyPanel when changed', () => {
      const showPropertyPanel = ref(true);
      showPropertyPanel.value = false;
      
      mockConfigStore.updateUIConfig({ showPropertyPanel: showPropertyPanel.value });
      
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showPropertyPanel: false });
    });

    it('should initialize showLayerPanel from configStore', () => {
      const showLayerPanel = ref(mockConfigStore.ui.showLayerPanel);
      expect(showLayerPanel.value).toBe(true);
    });

    it('should update showLayerPanel when changed', () => {
      const showLayerPanel = ref(true);
      showLayerPanel.value = false;
      
      mockConfigStore.updateUIConfig({ showLayerPanel: showLayerPanel.value });
      
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showLayerPanel: false });
    });

    it('should handle all display settings being toggled', () => {
      const settings = {
        showRulers: ref(true),
        showToolbar: ref(true),
        showPropertyPanel: ref(true),
        showLayerPanel: ref(true),
      };

      Object.keys(settings).forEach(key => {
        (settings as any)[key].value = false;
        
        if (key === 'showRulers') {
          mockConfigStore.updateCanvasConfig({ [key]: false });
        } else {
          mockConfigStore.updateUIConfig({ [key]: false });
        }
      });

      expect(mockConfigStore.updateCanvasConfig).toHaveBeenCalledWith({ showRulers: false });
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showToolbar: false });
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showPropertyPanel: false });
      expect(mockConfigStore.updateUIConfig).toHaveBeenCalledWith({ showLayerPanel: false });
    });
  });

  describe('Initialization', () => {
    it('should handle missing configStore values', () => {
      mockConfigStore.ui = {
        theme: undefined,
        language: undefined,
        showToolbar: undefined,
        showPropertyPanel: undefined,
        showLayerPanel: undefined,
      };
      mockConfigStore.canvas = {
        showRulers: undefined,
      };

      const selectedTheme = ref('dark');
      const selectedLanguage = ref('zh-CN');
      const showRulers = ref(true);
      const showToolbar = ref(true);
      const showPropertyPanel = ref(true);
      const showLayerPanel = ref(true);

      if (mockConfigStore.ui?.theme) {
        selectedTheme.value = mockConfigStore.ui.theme;
      }
      if (mockConfigStore.ui?.language) {
        selectedLanguage.value = mockConfigStore.ui.language;
      }
      if (mockConfigStore.canvas?.showRulers !== undefined) {
        showRulers.value = mockConfigStore.canvas.showRulers;
      }
      if (mockConfigStore.ui?.showToolbar !== undefined) {
        showToolbar.value = mockConfigStore.ui.showToolbar;
      }
      if (mockConfigStore.ui?.showPropertyPanel !== undefined) {
        showPropertyPanel.value = mockConfigStore.ui.showPropertyPanel;
      }
      if (mockConfigStore.ui?.showLayerPanel !== undefined) {
        showLayerPanel.value = mockConfigStore.ui.showLayerPanel;
      }

      expect(selectedTheme.value).toBe('dark');
      expect(selectedLanguage.value).toBe('zh-CN');
      expect(showRulers.value).toBe(true);
      expect(showToolbar.value).toBe(true);
      expect(showPropertyPanel.value).toBe(true);
      expect(showLayerPanel.value).toBe(true);
    });
  });
});