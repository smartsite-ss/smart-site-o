// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeviceSimulationService, SimulationConfig } from '../simulation/device-simulation.service';

describe('DeviceSimulationService', () => {
  let service: DeviceSimulationService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    service = new DeviceSimulationService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
    return {
      enabled: true,
      mode: 'random',
      minValue: 0,
      maxValue: 100,
      interval: 1000,
      tagIds: ['tag-001'],
      ...overrides,
    };
  }

  // ==================== start ====================
  describe('start', () => {
    it('should begin simulation', () => {
      const config = makeConfig();

      service.startSimulation('device-001', config);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should restart if already running', () => {
      const config = makeConfig();
      service.startSimulation('device-001', config);

      const newConfig = makeConfig({ mode: 'sine' });
      service.startSimulation('device-001', newConfig);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should generate data at configured interval', () => {
      const config = makeConfig({ interval: 1000 });
      service.startSimulation('device-001', config);

      // Advance time by 3 intervals
      jest.advanceTimersByTime(3000);

      // Simulation should still be running
      expect(service.isSimulating('device-001')).toBe(true);
    });
  });

  // ==================== stop ====================
  describe('stop', () => {
    it('should stop simulation', () => {
      const config = makeConfig();
      service.startSimulation('device-001', config);

      service.stopSimulation('device-001');

      expect(service.isSimulating('device-001')).toBe(false);
    });

    it('should handle stopping non-running simulation gracefully', () => {
      expect(() => service.stopSimulation('non-existent')).not.toThrow();
      expect(service.isSimulating('non-existent')).toBe(false);
    });
  });

  // ==================== isRunning ====================
  describe('isSimulating', () => {
    it('should return true when simulation is running', () => {
      service.startSimulation('device-001', makeConfig());

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should return false when simulation is not running', () => {
      expect(service.isSimulating('device-001')).toBe(false);
    });

    it('should return false after stopping', () => {
      service.startSimulation('device-001', makeConfig());
      service.stopSimulation('device-001');

      expect(service.isSimulating('device-001')).toBe(false);
    });
  });

  // ==================== setSimulationConfig ====================
  describe('setSimulationConfig', () => {
    it('should update config by restarting simulation', () => {
      service.startSimulation('device-001', makeConfig({ mode: 'random' }));

      const newConfig = makeConfig({ mode: 'sine', minValue: 10, maxValue: 50 });
      service.startSimulation('device-001', newConfig);

      expect(service.isSimulating('device-001')).toBe(true);
    });
  });

  // ==================== simulation modes ====================
  describe('simulation modes', () => {
    it('should generate random values', () => {
      const config = makeConfig({ mode: 'random', minValue: 0, maxValue: 100 });
      service.startSimulation('device-001', config);

      // Advance several intervals
      jest.advanceTimersByTime(5000);

      // Simulation should still be running
      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should generate sine values', () => {
      const config = makeConfig({ mode: 'sine', minValue: 0, maxValue: 100 });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(3000);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should generate step values', () => {
      const config = makeConfig({ mode: 'step', minValue: 0, maxValue: 100 });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(3000);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should generate ramp values', () => {
      const config = makeConfig({ mode: 'ramp', minValue: 0, maxValue: 100 });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(3000);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should default to random for unknown mode', () => {
      const config = makeConfig({ mode: 'unknown' as any });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(1000);

      expect(service.isSimulating('device-001')).toBe(true);
    });
  });

  // ==================== multiple devices ====================
  describe('multiple devices', () => {
    it('should manage multiple simulations independently', () => {
      service.startSimulation('device-001', makeConfig({ mode: 'random' }));
      service.startSimulation('device-002', makeConfig({ mode: 'sine' }));

      expect(service.isSimulating('device-001')).toBe(true);
      expect(service.isSimulating('device-002')).toBe(true);

      service.stopSimulation('device-001');

      expect(service.isSimulating('device-001')).toBe(false);
      expect(service.isSimulating('device-002')).toBe(true);
    });
  });

  // ==================== default values ====================
  describe('default values', () => {
    it('should use default min/max when not provided', () => {
      const config = makeConfig({ minValue: undefined, maxValue: undefined });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(1000);

      expect(service.isSimulating('device-001')).toBe(true);
    });

    it('should use default interval when not provided', () => {
      const config = makeConfig({ interval: undefined });
      service.startSimulation('device-001', config);

      jest.advanceTimersByTime(1000);

      expect(service.isSimulating('device-001')).toBe(true);
    });
  });
});
