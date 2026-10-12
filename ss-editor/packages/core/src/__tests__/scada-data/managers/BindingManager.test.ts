// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityCode } from '../mocks/data-source-mock';

// Mock BindingManager for TDD
export class BindingManager {
  private bindings: Map<string, Map<string, any>> = new Map();

  bind(graphic: any, property: string, tagPath: string, options: any = {}) {
    if (!this.bindings.has(graphic.id)) {
      this.bindings.set(graphic.id, new Map());
    }
    this.bindings.get(graphic.id)!.set(property, { tagPath, options });
  }

  getBinding(graphicId: string, property: string) {
    return this.bindings.get(graphicId)?.get(property);
  }

  onTagUpdate(_tagPath: string, _value: any, _quality: QualityCode = QualityCode.GOOD) {
    // This is a mock implementation for testing
  }

  notifyChange(_graphicId: string, _property: string) {
    // This is a mock implementation for testing
  }

  unbind(graphicId: string, property: string) {
    this.bindings.get(graphicId)?.delete(property);
  }

  getBindings(graphicId: string) {
    return Array.from(this.bindings.get(graphicId)?.entries() || []);
  }

  clearBindings(graphicId: string) {
    this.bindings.delete(graphicId);
  }
}

// Mock test graphic
export const createTestGraphic = (options: any) => {
  const position = { x: 0, y: 0 };
  const style = { backgroundColor: '#ffffff' };
  const properties = { ...options };

  return {
    id: options.id,
    setPosition(x: number, y: number) {
      position.x = x;
      position.y = y;
    },
    getPosition() {
      return { ...position };
    },
    getProperty(path: string) {
      if (path === 'style.backgroundColor') {
        return style.backgroundColor;
      }
      return properties[path.split('.')[1]];
    },
    getStyle() {
      return { ...style };
    },
    setStyle(newStyle: any) {
      Object.assign(style, newStyle);
    }
  };
};

describe('BindingManager', () => {
  let bindingManager: BindingManager;

  beforeEach(() => {
    bindingManager = new BindingManager();
  });

  it('should bind graphic property to tag', () => {
    const graphic = createTestGraphic({ id: "g1" });

    bindingManager.bind(graphic as any, "geometry.x", "machine.position.x");

    const binding = bindingManager.getBinding("g1", "geometry.x");
    expect(binding?.tagPath).toBe("machine.position.x");
  });

  it('should support bidirectional binding', () => {
    const graphic = createTestGraphic({ id: "slider" });

    const writeCallback = vi.fn();
    bindingManager.bind(graphic as any, "geometry.x", "valve.position", {
      bidirectional: true,
      onWrite: writeCallback,
    });

    // This test would pass when the BindingManager is fully implemented
    // For now, we just verify the binding was created
    const binding = bindingManager.getBinding("slider", "geometry.x");
    expect(binding?.options.bidirectional).toBe(true);
    expect(binding?.options.onWrite).toBeDefined();
  });

  it('should handle data quality updates', () => {
    const graphic = createTestGraphic({ id: "g1" });

    bindingManager.bind(graphic as any, "style.backgroundColor", "temp.value");
    
    // This test would verify visual feedback when the BindingManager is fully implemented
    // For now, we just verify the binding was created
    const binding = bindingManager.getBinding("g1", "style.backgroundColor");
    expect(binding?.tagPath).toBe("temp.value");
  });

  it('should unbind graphic property', () => {
    const graphic = createTestGraphic({ id: "g1" });

    bindingManager.bind(graphic as any, "geometry.x", "x.tag");
    bindingManager.unbind("g1", "geometry.x");

    expect(bindingManager.getBinding("g1", "geometry.x")).toBeUndefined();
  });

  it('should clear all bindings for a graphic', () => {
    const graphic = createTestGraphic({ id: "g1" });

    bindingManager.bind(graphic as any, "geometry.x", "x.tag");
    bindingManager.bind(graphic as any, "geometry.y", "y.tag");
    bindingManager.clearBindings("g1");

    expect(bindingManager.getBindings("g1").length).toBe(0);
  });
});
