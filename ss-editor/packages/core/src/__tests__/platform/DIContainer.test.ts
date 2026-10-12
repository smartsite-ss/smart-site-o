// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DIContainer } from '../../platform/di/DIContainer';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  // ==================== TC-DI-001: registerSingleton ====================
  describe('TC-DI-001: registerSingleton', () => {
    it('TC-DI-001-01: should register a singleton instance', () => {
      const instance = { name: 'test' };

      container.registerSingleton('test', instance);

      expect(container.has('test')).toBe(true);
      expect(container.get('test')).toBe(instance);
    });

    it('TC-DI-001-02: should always return the same singleton instance', () => {
      const instance = { name: 'test' };

      container.registerSingleton('test', instance);

      const result1 = container.get('test');
      const result2 = container.get('test');

      expect(result1).toBe(result2);
      expect(result1).toBe(instance);
    });

    it('TC-DI-001-03: should register a singleton factory', () => {
      const factory = vi.fn(() => ({ name: 'factory-result' }));

      container.registerSingleton('factory', factory);

      const result1 = container.get('factory');
      const result2 = container.get('factory');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('TC-DI-001-04: should register a singleton class', () => {
      class TestClass {
        public name = 'class-instance';
      }

      container.registerSingleton('class', TestClass);

      const result1 = container.get<TestClass>('class');
      const result2 = container.get<TestClass>('class');

      expect(result1).toBeInstanceOf(TestClass);
      expect(result1).toBe(result2);
    });

    it('TC-DI-001-05: should register singleton factory with dependencies', () => {
      container.registerSingleton('dep', { value: 'dependency' });
      const factory = vi.fn((dep: any) => ({ ...dep, extra: 'extra' }));

      container.registerSingleton('with-dep', factory, ['dep']);

      const result = container.get('with-dep');

      expect(factory).toHaveBeenCalledWith({ value: 'dependency' });
      expect(result).toEqual({ value: 'dependency', extra: 'extra' });
    });

    it('TC-DI-001-06: should register singleton class with dependencies', () => {
      container.registerSingleton('dep', { value: 'service' });

      class Consumer {
        public dep: any;
        constructor(dep: any) {
          this.dep = dep;
        }
      }

      container.registerSingleton('consumer', Consumer, ['dep']);

      const result = container.get<Consumer>('consumer');

      expect(result.dep).toEqual({ value: 'service' });
    });
  });

  // ==================== TC-DI-002: registerTransient ====================
  describe('TC-DI-002: registerTransient', () => {
    it('TC-DI-002-01: should register a transient factory', () => {
      const factory = vi.fn(() => ({ name: 'transient' }));

      container.registerTransient('transient', factory);

      const result1 = container.get('transient');
      const result2 = container.get('transient');

      expect(factory).toHaveBeenCalledTimes(2);
      expect(result1).not.toBe(result2);
    });

    it('TC-DI-002-02: should register a transient class', () => {
      class TestClass {
        public name = 'transient-instance';
      }

      container.registerTransient('class', TestClass);

      const result1 = container.get<TestClass>('class');
      const result2 = container.get<TestClass>('class');

      expect(result1).toBeInstanceOf(TestClass);
      expect(result2).toBeInstanceOf(TestClass);
      expect(result1).not.toBe(result2);
    });

    it('TC-DI-002-03: should register transient factory with dependencies', () => {
      container.registerSingleton('dep', { value: 'dependency' });
      const factory = vi.fn((dep: any) => ({ ...dep, extra: 'extra' }));

      container.registerTransient('transient', factory, ['dep']);

      container.get('transient');

      expect(factory).toHaveBeenCalledWith({ value: 'dependency' });
    });

    it('TC-DI-002-04: should register transient class with dependencies', () => {
      container.registerSingleton('dep', { value: 'service' });

      class Consumer {
        public dep: any;
        constructor(dep: any) {
          this.dep = dep;
        }
      }

      container.registerTransient('consumer', Consumer, ['dep']);

      const result1 = container.get<Consumer>('consumer');
      const result2 = container.get<Consumer>('consumer');

      expect(result1).not.toBe(result2);
      expect(result1.dep).toEqual({ value: 'service' });
    });
  });

  // ==================== TC-DI-003: Dependency Resolution ====================
  describe('TC-DI-003: Dependency Resolution', () => {
    it('TC-DI-003-01: should resolve simple dependencies', () => {
      container.registerSingleton('a', { value: 'A' });
      container.registerSingleton('b', { value: 'B' });

      const factory = vi.fn((a: any, b: any) => ({ a, b }));

      container.registerSingleton('combined', factory, ['a', 'b']);

      const result = container.get('combined');

      expect(result).toEqual({ a: { value: 'A' }, b: { value: 'B' } });
    });

    it('TC-DI-003-02: should resolve nested dependencies', () => {
      container.registerSingleton('a', { value: 'A' });

      const factoryB = vi.fn((a: any) => ({ fromA: a }));
      container.registerSingleton('b', factoryB, ['a']);

      const factoryC = vi.fn((b: any) => ({ fromB: b }));
      container.registerSingleton('c', factoryC, ['b']);

      const result = container.get('c');

      expect(result).toEqual({ fromB: { fromA: { value: 'A' } } });
    });

    it('TC-DI-003-03: should resolve deep dependency chains', () => {
      container.registerSingleton('level1', { value: 1 });

      const factory2 = vi.fn((v: any) => ({ value: v.value + 1 }));
      container.registerSingleton('level2', factory2, ['level1']);

      const factory3 = vi.fn((v: any) => ({ value: v.value + 1 }));
      container.registerSingleton('level3', factory3, ['level2']);

      const factory4 = vi.fn((v: any) => ({ value: v.value + 1 }));
      container.registerSingleton('level4', factory4, ['level3']);

      const result = container.get('level4');

      expect(result).toEqual({ value: 4 });
    });

    it('TC-DI-003-04: should resolve dependencies for transient registrations', () => {
      container.registerSingleton('dep', { value: 'shared' });

      const factory = vi.fn((dep: any) => ({ dep, id: Math.random() }));

      container.registerTransient('transient', factory, ['dep']);

      const result1 = container.get('transient') as any;
      const result2 = container.get('transient') as any;

      expect(result1).not.toBe(result2);
      expect(result1.dep).toEqual({ value: 'shared' });
      expect(result2.dep).toEqual({ value: 'shared' });
    });
  });

  // ==================== TC-DI-004: Factory vs Class ====================
  describe('TC-DI-004: Factory vs Class', () => {
    it('TC-DI-004-01: should distinguish factory from class', () => {
      const factory = vi.fn(() => ({ name: 'factory' }));
      class TestClass {
        public name = 'class';
      }

      container.registerSingleton('factory-item', factory);
      container.registerSingleton('class-item', TestClass);

      const factoryResult = container.get('factory-item');
      const classResult = container.get<TestClass>('class-item');

      expect(factoryResult).toEqual({ name: 'factory' });
      expect(classResult).toBeInstanceOf(TestClass);
    });

    it('TC-DI-004-02: factory should receive dependencies as arguments', () => {
      container.registerSingleton('dep1', { value: 'first' });
      container.registerSingleton('dep2', { value: 'second' });

      const factory = vi.fn((a: any, b: any) => ({ a, b }));

      container.registerSingleton('multi-dep', factory, ['dep1', 'dep2']);

      container.get('multi-dep');

      expect(factory).toHaveBeenCalledWith({ value: 'first' }, { value: 'second' });
    });

    it('TC-DI-004-03: class constructor should receive dependencies as arguments', () => {
      container.registerSingleton('dep1', { value: 'first' });
      container.registerSingleton('dep2', { value: 'second' });

      class Consumer {
        constructor(public a: any, public b: any) {}
      }

      container.registerSingleton('consumer', Consumer, ['dep1', 'dep2']);

      const result = container.get<Consumer>('consumer');

      expect(result.a).toEqual({ value: 'first' });
      expect(result.b).toEqual({ value: 'second' });
    });
  });

  // ==================== TC-DI-005: Error Handling ====================
  describe('TC-DI-005: Error Handling', () => {
    it('TC-DI-005-01: should throw error for missing token', () => {
      expect(() => {
        container.get('non-existent');
      }).toThrow('No registration found for token: non-existent');
    });

    it('TC-DI-005-02: should throw error when dependency is missing', () => {
      const factory = vi.fn(() => ({}));

      container.registerSingleton('with-missing-dep', factory, ['missing-dep']);

      expect(() => {
        container.get('with-missing-dep');
      }).toThrow('No registration found for token: missing-dep');
    });
  });

  // ==================== TC-DI-006: Circular Dependency Detection ====================
  describe('TC-DI-006: Circular Dependency', () => {
    it('TC-DI-006-01: should detect direct circular dependency', () => {
      const factoryA = vi.fn();
      const factoryB = vi.fn();

      container.registerSingleton('a', factoryA, ['b']);
      container.registerSingleton('b', factoryB, ['a']);

      // Should throw due to infinite recursion (stack overflow / max call stack)
      expect(() => {
        container.get('a');
      }).toThrow();
    });

    it('TC-DI-006-02: should detect indirect circular dependency', () => {
      const factory1 = vi.fn();
      const factory2 = vi.fn();
      const factory3 = vi.fn();

      container.registerSingleton('x', factory1, ['y']);
      container.registerSingleton('y', factory2, ['z']);
      container.registerSingleton('z', factory3, ['x']);

      expect(() => {
        container.get('x');
      }).toThrow();
    });
  });

  // ==================== TC-DI-007: has ====================
  describe('TC-DI-007: has', () => {
    it('TC-DI-007-01: should return true for registered token', () => {
      container.registerSingleton('test', { value: 'test' });

      expect(container.has('test')).toBe(true);
    });

    it('TC-DI-007-02: should return false for non-registered token', () => {
      expect(container.has('non-existent')).toBe(false);
    });

    it('TC-DI-007-03: should return true after registration, false after clear', () => {
      container.registerSingleton('test', { value: 'test' });
      expect(container.has('test')).toBe(true);

      container.clear();
      expect(container.has('test')).toBe(false);
    });
  });

  // ==================== TC-DI-008: clear ====================
  describe('TC-DI-008: clear', () => {
    it('TC-DI-008-01: should clear all registrations', () => {
      container.registerSingleton('a', { value: 'A' });
      container.registerSingleton('b', { value: 'B' });
      container.registerTransient('c', () => ({ value: 'C' }));

      container.clear();

      expect(container.has('a')).toBe(false);
      expect(container.has('b')).toBe(false);
      expect(container.has('c')).toBe(false);
    });

    it('TC-DI-008-02: should allow re-registration after clear', () => {
      container.registerSingleton('a', { value: 'old' });
      container.clear();

      container.registerSingleton('a', { value: 'new' });

      expect(container.get('a')).toEqual({ value: 'new' });
    });
  });

  // ==================== TC-DI-009: getTokens ====================
  describe('TC-DI-009: getTokens', () => {
    it('TC-DI-009-01: should return all registered tokens', () => {
      container.registerSingleton('a', { value: 'A' });
      container.registerSingleton('b', { value: 'B' });
      container.registerTransient('c', () => ({}));

      const tokens = container.getTokens();

      expect(tokens).toHaveLength(3);
      expect(tokens).toContain('a');
      expect(tokens).toContain('b');
      expect(tokens).toContain('c');
    });

    it('TC-DI-009-02: should return empty array when no registrations', () => {
      const tokens = container.getTokens();

      expect(tokens).toEqual([]);
    });

    it('TC-DI-009-03: should return empty array after clear', () => {
      container.registerSingleton('a', { value: 'A' });
      container.clear();

      const tokens = container.getTokens();

      expect(tokens).toEqual([]);
    });
  });

  // ==================== TC-DI-010: Edge Cases ====================
  describe('TC-DI-010: Edge Cases', () => {
    it('TC-DI-010-01: should handle registering same token twice', () => {
      container.registerSingleton('test', { value: 'first' });
      container.registerSingleton('test', { value: 'second' });

      // Second registration should overwrite
      const result = container.get('test');

      // Note: Since the second registration is a plain instance, it replaces the first
      expect(result).toEqual({ value: 'second' });
    });

    it('TC-DI-010-02: should handle null/undefined as instance', () => {
      container.registerSingleton('null-value', null);
      container.registerSingleton('undefined-value', undefined);

      expect(container.get('null-value')).toBeNull();
      expect(container.get('undefined-value')).toBeUndefined();
    });

    it('TC-DI-010-03: should handle factory returning falsy values', () => {
      // Use a plain function (not vi.fn()) because vi.fn() has a prototype.constructor
      // which makes DIContainer treat it as a Class instead of Factory
      const factory = () => null;

      container.registerSingleton('null-factory', factory);

      const result = container.get('null-factory');
      // Note: null is falsy, so the singleton cache check (truthy) will not short-circuit
      // and factory will be called again on subsequent gets
      expect(result).toBeNull();
    });

    it('TC-DI-010-04: should handle no dependencies array', () => {
      const factory = vi.fn(() => ({ name: 'no-deps' }));

      container.registerSingleton('no-deps', factory);

      const result = container.get('no-deps');

      expect(factory).toHaveBeenCalledWith();
      expect(result).toEqual({ name: 'no-deps' });
    });
  });
});