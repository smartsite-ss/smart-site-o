// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockDataSourceManager, QualityCode } from '../mocks/data-source-mock';

describe('DataSourceManager', () => {
  let dsManager: MockDataSourceManager;

  beforeEach(() => {
    dsManager = new MockDataSourceManager();
  });

  describe('静态数据源', () => {
    it('should create static data source', () => {
      const id = dsManager.createSource({
        type: "static",
        config: { value: 42 },
      });
      expect(id).toBeTruthy();
    });

    it('should read static value', () => {
      const id = dsManager.createSource({
        type: "static",
        config: { value: 99.5 },
      });
      const val = dsManager.getTagValue(`static:${id}`);
      expect(val?.value).toBeDefined();
      expect(val?.quality).toBe(QualityCode.GOOD);
    });
  });

  describe('表达式数据源', () => {
    it('should create expression data source with dependencies', () => {
      const id = dsManager.createSource({
        type: "expression",
        config: {
          expression: "${temp} > 80 ? 1 : 0",
          dependencies: ["temp"],
        },
      });
      expect(id).toBeTruthy();
    });
  });

  describe('数据源生命周期', () => {
    it('should subscribe to tag changes', () => {
      const callback = vi.fn();
      dsManager.subscribe("temp.sensor1", callback);

      dsManager.simulateTagValue("temp.sensor1", {
        value: 75.5,
        quality: QualityCode.GOOD,
        timestamp: Date.now(),
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ value: 75.5 }),
      );
    });

    it('should unsubscribe from tag changes', () => {
      const callback = vi.fn();
      const unsubscribe = dsManager.subscribe("temp.sensor1", callback);
      unsubscribe();

      dsManager.simulateTagValue("temp.sensor1", {
        value: 99,
        quality: QualityCode.GOOD,
        timestamp: Date.now(),
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers for same tag', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      dsManager.subscribe("tag.x", cb1);
      dsManager.subscribe("tag.x", cb2);

      dsManager.simulateTagValue("tag.x", {
        value: 100,
        quality: QualityCode.GOOD,
        timestamp: Date.now(),
      });

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  describe('8种数据源类型', () => {
    describe.each([
      ["static", { value: 42 }],
      ["expression", { expression: "1+1", dependencies: [] }],
      ["opcua", { endpoint: "opc.tcp://localhost", nodeId: "ns=1;s=test" }],
      [
        "modbus",
        { host: "localhost", port: 502, address: 40001, type: "holding" },
      ],
      ["mqtt", { broker: "mqtt://localhost", topic: "test/topic" }],
      ["sql", { connection: "sqlite::memory:", query: "SELECT 1" }],
      [
        "api",
        { url: "http://localhost/api/data", method: "GET", interval: 1000 },
      ],
      ["websocket", { url: "ws://localhost/data", protocol: "json" }],
    ])("%s data source", (type, config) => {
      it(`should create ${type} data source`, () => {
        const id = dsManager.createSource({ type: type as any, config } as any);
        expect(id).toBeTruthy();
      });

      it(`should read value from ${type} data source`, () => {
        const id = dsManager.createSource({ type: type as any, config } as any);
        const value = dsManager.getTagValue(`${type}:${id}`);
        expect(value).not.toBeNull();
        expect(value).toHaveProperty("quality");
        expect(value).toHaveProperty("timestamp");
      });
    });
  });
});
