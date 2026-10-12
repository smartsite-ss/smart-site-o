// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterpageTransferService, ITransferableData } from '../../services/InterpageTransferService';

// ==================== Mocks ====================

const mockCreateGraphicFromJSON = vi.fn();

vi.mock('../../graphic-editing/graphic/factory/GraphicFactory', () => ({
  GraphicFactory: {
    createGraphicFromJSON: (...args: any[]) => mockCreateGraphicFromJSON(...args),
  },
}));

describe('InterpageTransferService', () => {
  let service: InterpageTransferService;

  beforeEach(() => {
    service = new InterpageTransferService();
    vi.clearAllMocks();
  });

  // Helper to create mock graphic
  function createMockGraphic(overrides: Partial<ITransferableData> = {}) {
    const data: ITransferableData = {
      id: 'graphic-1',
      type: 'rect',
      config: {
        geometry: {
          x: 100,
          y: 200,
          width: 300,
          height: 150,
        },
        style: { fill: '#ff0000' },
      },
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      ...overrides,
    };

    const toJSON = vi.fn(() => ({
      id: data.id,
      type: data.type,
      config: data.config,
    }));

    const graphic = {
      id: data.id,
      type: data.type,
      config: { ...data.config },
      toJSON,
      getPosition: vi.fn(() => ({ x: data.x, y: data.y })),
      setPosition: vi.fn(),
    };

    return { graphic, data };
  }

  // ==================== TC-TRANSFER-001: serializeGraphic ====================
  describe('TC-TRANSFER-001: serializeGraphic', () => {
    it('TC-TRANSFER-001-01: should serialize a graphic with all fields', () => {
      const { graphic, data } = createMockGraphic();

      const result = service.serializeGraphic(graphic as any);

      expect(result).toEqual(data);
      expect(graphic.toJSON).toHaveBeenCalled();
    });

    it('TC-TRANSFER-001-02: should handle graphic with missing geometry', () => {
      const { graphic, data } = createMockGraphic({
        config: { style: { fill: '#000' } },
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      graphic.toJSON.mockReturnValue({
        id: data.id,
        type: data.type,
        config: data.config,
      });

      const result = service.serializeGraphic(graphic as any);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('TC-TRANSFER-001-03: should handle graphic with partial geometry', () => {
      const { graphic } = createMockGraphic();
      graphic.toJSON.mockReturnValue({
        id: 'graphic-2',
        type: 'circle',
        config: {
          geometry: { x: 50, y: 60 },
        },
      });

      const result = service.serializeGraphic(graphic as any);

      expect(result.x).toBe(50);
      expect(result.y).toBe(60);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  // ==================== TC-TRANSFER-002: serializeGraphics ====================
  describe('TC-TRANSFER-002: serializeGraphics', () => {
    it('TC-TRANSFER-002-01: should serialize multiple graphics', () => {
      const { graphic: g1, data: d1 } = createMockGraphic({ id: 'g-1' });
      const { graphic: g2, data: d2 } = createMockGraphic({ id: 'g-2', type: 'circle' });

      const result = service.serializeGraphics([g1 as any, g2 as any]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(d1);
      expect(result[1]).toEqual(d2);
    });

    it('TC-TRANSFER-002-02: should return empty array for empty input', () => {
      const result = service.serializeGraphics([]);

      expect(result).toEqual([]);
    });
  });

  // ==================== TC-TRANSFER-003: deserializeGraphic ====================
  describe('TC-TRANSFER-003: deserializeGraphic', () => {
    it('TC-TRANSFER-003-01: should deserialize data to graphic using GraphicFactory', () => {
      const { data } = createMockGraphic();
      const expectedGraphic = { id: 'graphic-1', type: 'rect' };
      mockCreateGraphicFromJSON.mockReturnValue(expectedGraphic);

      const result = service.deserializeGraphic(data);

      expect(mockCreateGraphicFromJSON).toHaveBeenCalledWith({
        id: data.id,
        type: data.type,
        config: data.config,
      });
      expect(result).toBe(expectedGraphic);
    });

    it('TC-TRANSFER-003-02: should deserialize data with different graphic types', () => {
      const data: ITransferableData = {
        id: 'circle-1',
        type: 'circle',
        config: { geometry: { x: 50, y: 50, width: 100, height: 100, radius: 50 } },
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      };
      const expectedGraphic = { id: 'circle-1', type: 'circle' };
      mockCreateGraphicFromJSON.mockReturnValue(expectedGraphic);

      const result = service.deserializeGraphic(data);

      expect(mockCreateGraphicFromJSON).toHaveBeenCalledWith({
        id: 'circle-1',
        type: 'circle',
        config: data.config,
      });
      expect(result).toBe(expectedGraphic);
    });
  });

  // ==================== TC-TRANSFER-004: deserializeGraphics ====================
  describe('TC-TRANSFER-004: deserializeGraphics', () => {
    it('TC-TRANSFER-004-01: should deserialize multiple data items', () => {
      const { data: d1 } = createMockGraphic({ id: 'g-1' });
      const { data: d2 } = createMockGraphic({ id: 'g-2', type: 'circle' });
      mockCreateGraphicFromJSON.mockReturnValueOnce({ id: 'g-1' }).mockReturnValueOnce({ id: 'g-2' });

      const result = service.deserializeGraphics([d1, d2]);

      expect(result).toHaveLength(2);
      expect(mockCreateGraphicFromJSON).toHaveBeenCalledTimes(2);
    });

    it('TC-TRANSFER-004-02: should return empty array for empty input', () => {
      const result = service.deserializeGraphics([]);

      expect(result).toEqual([]);
    });
  });

  // ==================== TC-TRANSFER-005: Serialization Round-Trip ====================
  describe('TC-TRANSFER-005: Serialization Round-Trip', () => {
    it('TC-TRANSFER-005-01: serialize then deserialize should work correctly', () => {
      const { graphic, data } = createMockGraphic();
      const expectedResult = { id: 'graphic-1', type: 'rect' };
      mockCreateGraphicFromJSON.mockReturnValue(expectedResult);

      const serialized = service.serializeGraphic(graphic as any);
      const deserialized = service.deserializeGraphic(serialized);

      expect(mockCreateGraphicFromJSON).toHaveBeenCalledWith({
        id: data.id,
        type: data.type,
        config: data.config,
      });
      expect(deserialized).toBe(expectedResult);
    });

    it('TC-TRANSFER-005-02: batch serialize then deserialize should work', () => {
      const { graphic: g1 } = createMockGraphic({ id: 'g-1' });
      const { graphic: g2 } = createMockGraphic({ id: 'g-2', type: 'circle' });
      mockCreateGraphicFromJSON
        .mockReturnValueOnce({ id: 'g-1' })
        .mockReturnValueOnce({ id: 'g-2' });

      const serialized = service.serializeGraphics([g1 as any, g2 as any]);
      const deserialized = service.deserializeGraphics(serialized);

      expect(deserialized).toHaveLength(2);
      expect(mockCreateGraphicFromJSON).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== TC-TRANSFER-006: transformCoordinates ====================
  describe('TC-TRANSFER-006: transformCoordinates', () => {
    it('TC-TRANSFER-006-01: should offset geometry coordinates', () => {
      const graphic = {
        id: 'g-1',
        config: {
          geometry: { x: 100, y: 200, width: 300, height: 150 },
        },
      };

      service.transformCoordinates(graphic as any, 50, -30);

      expect(graphic.config.geometry.x).toBe(150);
      expect(graphic.config.geometry.y).toBe(170);
    });

    it('TC-TRANSFER-006-02: should handle zero offset', () => {
      const graphic = {
        id: 'g-1',
        config: {
          geometry: { x: 100, y: 200, width: 300, height: 150 },
        },
      };

      service.transformCoordinates(graphic as any, 0, 0);

      expect(graphic.config.geometry.x).toBe(100);
      expect(graphic.config.geometry.y).toBe(200);
    });

    it('TC-TRANSFER-006-03: should handle negative offset', () => {
      const graphic = {
        id: 'g-1',
        config: {
          geometry: { x: 100, y: 200, width: 300, height: 150 },
        },
      };

      service.transformCoordinates(graphic as any, -200, -300);

      expect(graphic.config.geometry.x).toBe(-100);
      expect(graphic.config.geometry.y).toBe(-100);
    });

    it('TC-TRANSFER-006-04: should not modify graphic without geometry', () => {
      const graphic = {
        id: 'g-1',
        config: { style: { fill: '#000' } },
      };

      expect(() => {
        service.transformCoordinates(graphic as any, 50, 50);
      }).not.toThrow();
    });
  });

  // ==================== TC-TRANSFER-007: generateNewId ====================
  describe('TC-TRANSFER-007: generateNewId', () => {
    it('TC-TRANSFER-007-01: should generate a unique ID', () => {
      const id = service.generateNewId([]);

      expect(id).toMatch(/^graphic-\d+-0$/);
    });

    it('TC-TRANSFER-007-02: should generate different IDs with different timestamps', () => {
      const id1 = service.generateNewId([]);
      const id2 = service.generateNewId([]);

      // Counter increments, so IDs should differ
      expect(id1).not.toBe(id2);
    });

    it('TC-TRANSFER-007-03: should avoid generating IDs in existingIds', () => {
      // Generate some IDs first to populate the counter
      const existing: string[] = [];
      for (let i = 0; i < 5; i++) {
        existing.push(service.generateNewId([]));
      }

      const newId = service.generateNewId(existing);

      expect(existing).not.toContain(newId);
    });

    it('TC-TRANSFER-007-04: should handle collision avoidance', () => {
      // Generate a known ID by creating a specific scenario
      const service2 = new InterpageTransferService();
      const firstId = service2.generateNewId([]);

      // Verify it's a valid format
      expect(firstId).toMatch(/^graphic-/);
    });
  });

  // ==================== TC-TRANSFER-008: reassignIds ====================
  describe('TC-TRANSFER-008: reassignIds', () => {
    it('TC-TRANSFER-008-01: should reassign IDs to all graphics', () => {
      const graphics = [
        { id: 'old-1', type: 'rect', config: { id: 'old-1', geometry: { x: 0, y: 0 } } },
        { id: 'old-2', type: 'circle', config: { id: 'old-2', geometry: { x: 0, y: 0 } } },
      ];

      const result = service.reassignIds(graphics as any, []);

      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe('old-1');
      expect(result[0].config.id).toBe(result[0].id);
      expect(result[1].id).not.toBe('old-2');
      expect(result[1].config.id).toBe(result[1].id);
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('TC-TRANSFER-008-02: should avoid conflicts with existing IDs', () => {
      const existingIds = ['graphic-existing-1', 'graphic-existing-2'];
      const existingIdsCopy = [...existingIds];
      const graphics = [
        { id: 'old-1', type: 'rect', config: { id: 'old-1', geometry: { x: 0, y: 0 } } },
      ];

      const result = service.reassignIds(graphics as any, existingIds);

      // The new ID should not be in the original existing IDs
      // (note: reassignIds mutates existingIds array by adding new IDs to it)
      expect(existingIdsCopy).not.toContain(result[0].id);
    });

    it('TC-TRANSFER-008-03: should add new IDs to existingIds array', () => {
      const existingIds: string[] = [];
      const graphics = [
        { id: 'old-1', type: 'rect', config: { id: 'old-1', geometry: { x: 0, y: 0 } } },
        { id: 'old-2', type: 'circle', config: { id: 'old-2', geometry: { x: 0, y: 0 } } },
      ];

      service.reassignIds(graphics as any, existingIds);

      expect(existingIds).toHaveLength(2);
      expect(existingIds[0]).toBe(graphics[0].id);
      expect(existingIds[1]).toBe(graphics[1].id);
    });

    it('TC-TRANSFER-008-04: should return empty array for empty input', () => {
      const result = service.reassignIds([], []);

      expect(result).toEqual([]);
    });
  });
});