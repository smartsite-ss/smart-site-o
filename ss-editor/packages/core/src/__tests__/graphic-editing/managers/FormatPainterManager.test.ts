// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormatPainterManager } from '../../../graphic-editing/managers/FormatPainterManager';

/**
 * Mock graphic object for testing FormatPainterManager
 * Simulates the core behavior of BaseGraphic.update():
 *   - style → Object.assign(config.style, style)
 *   - properties → Object.assign(config.customProps, properties)
 */
function createMockGraphic(overrides: {
  id?: string;
  type?: string;
  style?: Record<string, any>;
  customProps?: Record<string, any>;
} = {}) {
  const id = overrides.id ?? 'graphic-1';
  const type = overrides.type ?? 'Pump';
  const style = overrides.style ?? { backgroundColor: '#fff', color: '#000', opacity: 1 };
  const customProps = overrides.customProps ?? { strokeWidth: 2, fillStyle: 'solid' };

  const config = {
    type,
    style: { ...style },
    customProps: { ...customProps },
  };

  const update = vi.fn((properties: Record<string, any>) => {
    if (properties.style) {
      Object.assign(config.style, properties.style);
    }
    if (properties.properties) {
      Object.assign(config.customProps, properties.properties);
    }
    if (properties.config) {
      Object.assign(config, properties.config);
    }
    if (properties.geometry) {
      Object.assign(config, { geometry: properties.geometry });
    }
    if (properties.visible !== undefined) {
      (config as any).visible = properties.visible;
    }
    if (properties.locked !== undefined) {
      (config as any).locked = properties.locked;
    }
    if (properties.zIndex !== undefined) {
      (config as any).zIndex = properties.zIndex;
    }
  });

  const getStyle = vi.fn(() => ({ ...config.style }));

  return { id, config, update, getStyle };
}

describe('FormatPainterManager', () => {
  let manager: FormatPainterManager;

  beforeEach(() => {
    manager = new FormatPainterManager();
  });

  describe('State management', () => {
    it('initial state should be idle', () => {
      expect(manager.mode).toBe('idle');
      expect(manager.isActive()).toBe(false);
    });

    it('activate() without selected graphic enters pick mode', () => {
      manager.activate();
      expect(manager.mode).toBe('pick');
      expect(manager.isActive()).toBe(true);
    });

    it('activate() with selected graphic picks and enters paint mode', () => {
      const graphic = createMockGraphic();
      manager.activate(graphic);
      expect(manager.mode).toBe('paint');
      expect(manager.sourceGraphicId).toBe(graphic.id);
      expect(manager.sourceGraphicType).toBe('Pump');
    });

    it('deactivate() should reset all state', () => {
      const graphic = createMockGraphic();
      manager.activate(graphic);
      manager.deactivate();
      expect(manager.mode).toBe('idle');
      expect(manager.sourceGraphicId).toBeNull();
      expect(manager.sourceGraphicType).toBeNull();
      expect(manager.copiedStyle).toBeNull();
    });

    it('onModeChange callback should fire correctly', () => {
      const callback = vi.fn();
      manager.onModeChange(callback);
      manager.activate();
      expect(callback).toHaveBeenCalledWith('pick');
      manager.deactivate();
      expect(callback).toHaveBeenCalledWith('idle');
    });
  });

  describe('pickStyle - Pick style', () => {
    it('should copy style from source graphic', () => {
      const graphic = createMockGraphic({
        style: { backgroundColor: 'red', opacity: 0.5 }, }); manager.activate(); (manager as any).pickStyle(graphic); /* Directly call pickStyle */ expect(manager.copiedStyle).toEqual({ backgroundColor:'red', opacity: 0.5 });
      expect(manager.sourceGraphicType).toBe('Pump');
    });

    it('should copy customProps from source graphic', () => {
      const graphic = createMockGraphic({
        customProps: { strokeWidth: 5, cornerRadius: 10 },
      });
      manager.activate();
      (manager as any).pickStyle(graphic);
      expect(manager.copiedStyle).toBeDefined();
      expect(manager.sourceGraphicType).toBe('Pump');
    });

    it('pickStyle should enter paint mode', () => {
      const graphic = createMockGraphic();
      manager.activate();
      (manager as any).pickStyle(graphic);
      expect(manager.mode).toBe('paint');
    });
  });

  describe('paintStyle - Paint style (same type)', () => {
    it('should paint style to same-type graphic', () => {
      const source = createMockGraphic({
        id: 'src-1',
        type: 'Pump',
        style: { backgroundColor: 'blue', opacity: 0.8 },
      });
      const target = createMockGraphic({
        id: 'tgt-1',
        type: 'Pump',
        style: { backgroundColor: 'red', opacity: 1 },
      });

      manager.activate(source);
      manager.applyFormat(target);

      expect(target.update).toHaveBeenCalled();
      expect(target.config.style.backgroundColor).toBe('blue');
      expect(target.config.style.opacity).toBe(0.8);
    });

    it('should fully copy customProps to same-type graphic', () => {
      const source = createMockGraphic({
        id: 'src-1',
        type: 'Pump',
        customProps: { strokeWidth: 5, cornerRadius: 10, fillStyle: 'gradient' },
      });
      const target = createMockGraphic({
        id: 'tgt-1',
        type: 'Pump', customProps: { strokeWidth: 2, cornerRadius: 0 }, }); manager.activate(source); manager.applyFormat(target); /* Verify update is called with properties (not customProps) */ expect(target.update).toHaveBeenCalled(); const updateCalls = target.update.mock.calls; const propertiesCall = updateCalls.find( (call: any[]) => call[0] && call[0].properties ); expect(propertiesCall).toBeDefined(); expect(propertiesCall![0].properties.strokeWidth).toBe(5); expect(propertiesCall![0].properties.cornerRadius).toBe(10); expect(propertiesCall![0].properties.fillStyle).toBe('gradient'); /* Verify config.customProps is correctly updated */ expect(target.config.customProps.strokeWidth).toBe(5); expect(target.config.customProps.cornerRadius).toBe(10); expect(target.config.customProps.fillStyle).toBe('gradient');
    });

    it('should not delete existing customProps fields when painting same type', () => {
      const source = createMockGraphic({
        id: 'src-1',
        type: 'Pump',
        customProps: { strokeWidth: 5 },
      });
      const target = createMockGraphic({
        id: 'tgt-1',
        type: 'Pump',
        customProps: { strokeWidth: 2, cornerRadius: 10, fillStyle: 'solid'}, }); manager.activate(source); manager.applyFormat(target); expect(target.config.customProps.strokeWidth).toBe(5); /* Target's original fields should be preserved */ expect(target.config.customProps.cornerRadius).toBe(10); expect(target.config.customProps.fillStyle).toBe('solid');
    });
  });

  describe('paintStyle - Paint style (different type)', () => {
    it('should only copy customProps fields with the same name', () => {
      const source = createMockGraphic({
        id: 'src-1',
        type: 'Pump',
        customProps: { strokeWidth: 5, pumpSpeed: 100, pumpFlow: 50 },
      });
      const target = createMockGraphic({
        id: 'tgt-1',
        type: 'Valve', customProps: { strokeWidth: 2, valveAngle: 45 }, }); manager.activate(source); manager.applyFormat(target); /* Common field strokeWidth should be copied */ expect(target.config.customProps.strokeWidth).toBe(5); /* Target-specific field valveAngle should be preserved */ expect(target.config.customProps.valveAngle).toBe(45); /* Source-specific field pumpSpeed should not appear in target */ const propertiesCall = target.update.mock.calls.find( (call: any[]) => call[0] && call[0].properties ); if (propertiesCall) { expect(propertiesCall[0].properties.pumpSpeed).toBeUndefined(); expect(propertiesCall[0].properties.pumpFlow).toBeUndefined(); } }); it('should skip customProps copy when different types have no common fields', () => {
      const source = createMockGraphic({
        id: 'src-1',
        type: 'Pump',
        customProps: { pumpSpeed: 100 },
      });
      const target = createMockGraphic({
        id: 'tgt-1',
        type: 'Valve', customProps: { valveAngle: 45 }, }); manager.activate(source); manager.applyFormat(target); /* update should be called (at least style part), but no properties call expected */ expect(target.update).toHaveBeenCalled(); const propertiesCall = target.update.mock.calls.find( (call: any[]) => call[0] && call[0].properties ); expect(propertiesCall).toBeUndefined(); }); }); describe('applyFormat - Complete interaction flow', () => {
    it('should paint style to target graphic in paint mode', () => {
      const source = createMockGraphic({ id: 'src', type: 'Pump' });
      const target = createMockGraphic({ id: 'tgt', type: 'Pump'}); /* Activate and auto-pick */ manager.activate(source); expect(manager.mode).toBe('paint'); /* Paint target */ manager.applyFormat(target); expect(target.update).toHaveBeenCalled(); }); it('should maintain state after multiple paint operations in paint mode', () => {
      const source = createMockGraphic({ id: 'src', type: 'Pump' });
      const target1 = createMockGraphic({ id: 't1', type: 'Pump' });
      const target2 = createMockGraphic({ id: 't2', type: 'Pump' });

      manager.activate(source);
      manager.applyFormat(target1);
      manager.applyFormat(target2);

      expect(manager.mode).toBe('paint');
      expect(target1.update).toHaveBeenCalled();
      expect(target2.update).toHaveBeenCalled();
    });

    it('applyFormat should not work after deactivate', () => {
      const source = createMockGraphic({ id: 'src', type: 'Pump' });
      const target = createMockGraphic({ id: 'tgt', type: 'Pump' });

      manager.activate(source);
      manager.deactivate();
      manager.applyFormat(target);

      expect(manager.mode).toBe('idle'); /* applyFormat does nothing in idle mode */ }); }); describe('getSourceInfo', () => {
    it('should return source graphic info after picking style', () => {
      const graphic = createMockGraphic({ id: 'src-123', type: 'Pump' });
      manager.activate(graphic);
      const info = manager.getSourceInfo();
      expect(info).toEqual({ id: 'src-123', type: 'Pump' });
    });

    it('should return null when no style has been picked', () => {
      expect(manager.getSourceInfo()).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should reset state and clear callbacks', () => {
      const callback = vi.fn();
      manager.onModeChange(callback);
      manager.activate();
      manager.dispose();
      expect(manager.mode).toBe('idle');
      expect(manager.isActive()).toBe(false);
    });
  });
});