// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi } from 'vitest';
import { BasePlugin, DrawContext } from '../index';
import { Graphic } from '@scada-editor/plugin-sdk';

interface TestPluginProps {
  label: string;
  color: string;
  size: number;
  enabled: boolean;
}

const defaultTestProps: TestPluginProps = {
  label: 'Test',
  color: '#FF0000FF',
  size: 100,
  enabled: true,
};

@Graphic({
  type: 'test-plugin',
  name: 'TestPlugin',
  category: 'test',
  defaultProps: defaultTestProps,
  defaultWidth: 100,
  defaultHeight: 80,
})
class TestPlugin extends BasePlugin<TestPluginProps> {
  renderCalls: Array<DrawContext> = [];

  constructor(x = 0, y = 0, w = 100, h = 80) {
    super('test-plugin', x, y, w, h);
    this.setDefaultProps({ ...defaultTestProps });
  }

  protected render(dc: DrawContext): void {
    this.renderCalls.push(dc);
    dc.ctx.fillRect(0, 0, 100, 80);
  }
}

class TestPluginWithLifecycle extends BasePlugin<TestPluginProps> {
  onMountedCalled = false;
  onUnmountedCalled = false;
  onPropertyChangedLog: Array<Record<string, any>> = [];
  onDataChangedLog: any[] = [];
  previousColor = '';

  constructor(x = 0, y = 0) {
    super('test-plugin-lifecycle', x, y, 100, 80);
    this.setDefaultProps({ ...defaultTestProps });
  }

  onMounted(): void {
    this.onMountedCalled = true;
  }

  onUnmounted(): void {
    this.onUnmountedCalled = true;
  }

  onPropertyChanged(changes: any): void {
    this.onPropertyChangedLog.push(changes);
    if (changes.customProps && changes.customProps.color) {
      this.previousColor = changes.customProps.color;
    }
  }

  onDataChanged(data: any): void {
    this.onDataChangedLog.push(data);
  }

  protected render(_dc: DrawContext): void {}
}

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    ellipse: vi.fn(),
    clip: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    font: '14px Arial',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    textDecoration: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    shadowColor: '#00000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    setTransform: vi.fn(),
    transform: vi.fn(),
    resetTransform: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100), width: 10, height: 10 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100), width: 10, height: 10 })),
    putImageData: vi.fn(),
    drawFocusIfNeeded: vi.fn(),
    scrollPathIntoView: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

describe('BasePlugin', () => {
  describe('constructor and property management', () => {
    it('should create instance with default props', () => {
      const plugin = new TestPlugin();
      expect(plugin.config.type).toBe('test-plugin');
      expect(plugin.pluginProps.label).toBe('Test');
      expect(plugin.pluginProps.color).toBe('#FF0000FF');
      expect(plugin.pluginProps.size).toBe(100);
      expect(plugin.pluginProps.enabled).toBe(true);
    });

    it('should set default props via setDefaultProps', () => {
      const plugin = new TestPlugin();
      plugin.setDefaultProps({ label: 'New', color: '#000', size: 50, enabled: false });
      expect(plugin.pluginProps.label).toBe('New');
      expect(plugin.pluginProps.color).toBe('#000');
      expect(plugin.pluginProps.size).toBe(50);
      expect(plugin.pluginProps.enabled).toBe(false);
    });

    it('should return readonly pluginProps', () => {
      const plugin = new TestPlugin();
      const props = plugin.pluginProps;
      expect(props.label).toBe('Test');
    });

    it('should support position args in constructor', () => {
      const plugin = new TestPlugin(10, 20, 200, 150);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
      const size = plugin.getSize();
      expect(size.width).toBe(200);
      expect(size.height).toBe(150);
    });
  });

  describe('setPluginProps', () => {
    it('should update a single property', () => {
      const plugin = new TestPlugin();
      (plugin as any).setPluginProps({ label: 'Updated' });
      expect(plugin.pluginProps.label).toBe('Updated');
    });

    it('should update multiple properties', () => {
      const plugin = new TestPlugin();
      (plugin as any).setPluginProps({ label: 'Updated', color: '#00FF00', size: 200 });
      expect(plugin.pluginProps.label).toBe('Updated');
      expect(plugin.pluginProps.color).toBe('#00FF00');
      expect(plugin.pluginProps.size).toBe(200);
    });

    it('should keep other properties unchanged', () => {
      const plugin = new TestPlugin();
      (plugin as any).setPluginProps({ label: 'Updated' });
      expect(plugin.pluginProps.color).toBe('#FF0000FF');
      expect(plugin.pluginProps.size).toBe(100);
      expect(plugin.pluginProps.enabled).toBe(true);
    });

    it('should handle empty partial update', () => {
      const plugin = new TestPlugin();
      (plugin as any).setPluginProps({} as any);
      expect(plugin.pluginProps.label).toBe('Test');
    });
  });

  describe('draw / render', () => {
    it('should call render with DrawContext when draw is invoked', () => {
      const plugin = new TestPlugin();
      const ctx = createMockContext();
      plugin.draw(ctx);
      expect(plugin.renderCalls.length).toBe(1);
    });

    it('should pass the canvas context through DrawContext', () => {
      const plugin = new TestPlugin();
      const ctx = createMockContext();
      plugin.draw(ctx);
      const dc = plugin.renderCalls[0];
      expect(dc.ctx).toBe(ctx);
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 80);
    });
  });

  describe('getProps / getSize / getPosition compatibility', () => {
    it('should have working getProps from BaseGraphic', () => {
      const plugin = new TestPlugin();
      const customProps = plugin.config.customProps;
      const label = (customProps as any)?.label;
      expect(label).toBe('Test');
    });

    it('should have working getSize from BaseGraphic', () => {
      const plugin = new TestPlugin(0, 0, 200, 150);
      const size = plugin.getSize();
      expect(size.width).toBe(200);
      expect(size.height).toBe(150);
    });

    it('should have working getPosition from BaseGraphic', () => {
      const plugin = new TestPlugin(50, 100);
      const pos = plugin.getPosition();
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(100);
    });
  });

  describe('setDefaultProps', () => {
    it('should merge with existing customProps', () => {
      const plugin = new TestPlugin();
      plugin.setDefaultProps({ label: 'Merged', color: '#123456', size: 42, enabled: true });
      expect(plugin.pluginProps.label).toBe('Merged');
      expect(plugin.pluginProps.color).toBe('#123456');
    });

    it('should create a copy of props, not reference', () => {
      const plugin = new TestPlugin();
      const props: TestPluginProps = { label: 'Ref', color: '#111', size: 10, enabled: true };
      plugin.setDefaultProps(props);
      props.label = 'Changed';
      expect(plugin.pluginProps.label).toBe('Ref');
    });
  });
});

describe('BasePlugin Lifecycle', () => {
  it('onPropertyChanged should be called when setPluginProps updates customProps', () => {
    const plugin = new TestPluginWithLifecycle();
    (plugin as any).setPluginProps({ color: '#00FF00' });
    expect(plugin.onPropertyChangedLog.length).toBeGreaterThanOrEqual(1);
  });

  it('onMounted should be callable (lifecycle hook)', () => {
    const plugin = new TestPluginWithLifecycle();
    expect(plugin.onMountedCalled).toBe(false);
    plugin.onMounted();
    expect(plugin.onMountedCalled).toBe(true);
  });

  it('onUnmounted should be callable (lifecycle hook)', () => {
    const plugin = new TestPluginWithLifecycle();
    plugin.onUnmounted();
    expect(plugin.onUnmountedCalled).toBe(true);
  });

  it('onDataChanged should be callable (lifecycle hook)', () => {
    const plugin = new TestPluginWithLifecycle();
    plugin.onDataChanged({ value: 42 });
    expect(plugin.onDataChangedLog.length).toBe(1);
    expect(plugin.onDataChangedLog[0]).toEqual({ value: 42 });
  });
});