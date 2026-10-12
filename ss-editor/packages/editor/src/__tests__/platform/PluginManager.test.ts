// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIPluginManager, getUIPluginManager } from '../../plugin/PluginManager';

describe('UIPluginManager', () => {
  let pluginManager: UIPluginManager;

  beforeEach(() => {
    pluginManager = new UIPluginManager();
  });

  it('should initialize with empty state', () => {
    expect(pluginManager.getPlugins().length).toBe(0);
    expect(pluginManager.getPanels().length).toBe(0);
    expect(pluginManager.getTools().length).toBe(0);
    expect(Object.keys(pluginManager.getComponents()).length).toBe(0);
  });

  it('should install a plugin', () => {
    const testPlugin = {
      name: 'test-plugin',
      install: vi.fn(),
    };

    pluginManager.install(testPlugin, {});
    
    expect(pluginManager.getPlugins().length).toBe(1);
    expect(pluginManager.getPlugins()[0].name).toBe('test-plugin');
    expect(testPlugin.install).toHaveBeenCalled();
  });

  it('should not install duplicate plugins', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const testPlugin = {
      name: 'test-plugin',
      install: vi.fn(),
    };

    pluginManager.install(testPlugin, {});
    pluginManager.install(testPlugin, {}); // Install again
    
    expect(pluginManager.getPlugins().length).toBe(1);
    expect(consoleWarn).toHaveBeenCalled();
    
    consoleWarn.mockRestore();
  });

  it('should install plugins with panels', () => {
    const testPlugin = {
      name: 'panel-plugin',
      install: vi.fn(),
      panels: [
        { id: 'panel-plugin-panel1', title: 'Panel 1', position: 'left' as const, component: {} as any },
        { id: 'panel-plugin-panel2', title: 'Panel 2', position: 'right' as const, component: {} as any },
      ],
    };

    pluginManager.install(testPlugin, {});
    
    expect(pluginManager.getPanels().length).toBe(2);
  });

  it('should install plugins with tools', () => {
    const testPlugin = {
      name: 'tool-plugin',
      install: vi.fn(),
      tools: [
        { id: 'tool-plugin-tool1', name: 'Tool 1', icon: 'icon1' },
        { id: 'tool-plugin-tool2', name: 'Tool 2', icon: 'icon2' },
      ],
    };

    pluginManager.install(testPlugin, {});
    
    expect(pluginManager.getTools().length).toBe(2);
  });

  it('should install plugins with components', () => {
    const TestComponent = { template: '<div />' };
    const testPlugin = {
      name: 'component-plugin',
      install: vi.fn(),
      components: {
        'TestComponent': TestComponent,
      },
    };

    pluginManager.install(testPlugin, {});
    
    expect(pluginManager.getComponents()['TestComponent']).toBeDefined();
  });

  it('should uninstall a plugin', () => {
    const testPlugin = {
      name: 'test-plugin',
      install: vi.fn(),
      panels: [
        { id: 'test-plugin-panel', title: 'Panel', position: 'left' as const, component: {} as any },
      ],
      tools: [
        { id: 'test-plugin-tool', name: 'Tool', icon: 'icon' },
      ],
    };

    pluginManager.install(testPlugin, {});
    expect(pluginManager.getPlugins().length).toBe(1);
    
    pluginManager.uninstall('test-plugin');
    
    expect(pluginManager.getPlugins().length).toBe(0);
    expect(pluginManager.getPanels().length).toBe(0);
    expect(pluginManager.getTools().length).toBe(0);
  });

  it('should get a singleton instance with getUIPluginManager', () => {
    const manager1 = getUIPluginManager();
    const manager2 = getUIPluginManager();
    
    expect(manager1).toBe(manager2);
  });
});
