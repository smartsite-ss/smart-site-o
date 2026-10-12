// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { DeadbandFilterService } from '../filter/deadband-filter.service';
import { DeadbandMode } from '../entities/data-tag.entity';

describe('DeadbandFilterService', () => {
  let service: DeadbandFilterService;

  beforeEach(() => {
    service = new DeadbandFilterService();
  });

  afterEach(() => {
    service.clearAll();
  });

  // ==================== shouldReport ====================
  describe('shouldReport', () => {
    describe('first report (no previous value)', () => {
      it('TC-DBFS-001: should return true when previousValue is undefined', () => {
        const result = service.shouldReport(42, undefined, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('first_report');
      });

      it('TC-DBFS-002: should return true when previousValue is null', () => {
        const result = service.shouldReport(42, null as any, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('first_report');
      });
    });

    describe('mode: none', () => {
      it('TC-DBFS-010: should always return true', () => {
        service.updateState('tag-001', 100);

        const result = service.shouldReport(100, 100, {
          deadbandMode: DeadbandMode.NONE,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('none_mode');
      });

      it('TC-DBFS-011: should pass even with large deadband values', () => {
        const result = service.shouldReport(100, 100, {
          deadbandMode: DeadbandMode.NONE,
          deadbandValue: 999,
          deadbandPercent: 50,
        });

        expect(result.shouldReport).toBe(true);
      });

      it('TC-DBFS-012: should default to none mode when mode is undefined', () => {
        const result = service.shouldReport(100, 100, {});

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('none_mode');
      });
    });

    describe('mode: absolute', () => {
      it('TC-DBFS-020: should return true when change exceeds deadband', () => {
        const result = service.shouldReport(110, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.delta).toBe(10);
      });

      it('TC-DBFS-021: should return false when change is within deadband', () => {
        const result = service.shouldReport(104, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(false);
        expect(result.delta).toBe(4);
        expect(result.reason).toContain('absolute_deadband');
      });

      it('TC-DBFS-022: should return false when values are equal', () => {
        const result = service.shouldReport(100, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(false);
        expect(result.delta).toBe(0);
      });

      it('TC-DBFS-023: should handle negative change exceeding threshold', () => {
        const result = service.shouldReport(90, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.delta).toBe(10);
      });

      it('TC-DBFS-024: should pass on any change when deadbandValue is 0', () => {
        const result = service.shouldReport(100.0001, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 0,
        });

        expect(result.shouldReport).toBe(true);
      });

      it('TC-DBFS-025: should handle exact deadbandValue boundary', () => {
        const result = service.shouldReport(105, 100, {
          deadbandMode: DeadbandMode.ABSOLUTE,
          deadbandValue: 5,
        });

        expect(result.shouldReport).toBe(false);
      });
    });

    describe('mode: percent', () => {
      it('TC-DBFS-030: should return true when percent change exceeds deadbandPercent', () => {
        const result = service.shouldReport(120, 100, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 10,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.deltaPercent).toBe(20);
      });

      it('TC-DBFS-031: should return false when percent change is within deadbandPercent', () => {
        const result = service.shouldReport(105, 100, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 10,
        });

        expect(result.shouldReport).toBe(false);
        expect(result.deltaPercent).toBe(5);
      });

      it('TC-DBFS-032: should bypass when previous value is near zero', () => {
        const result = service.shouldReport(10, 0, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 10,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('zero_base_bypass');
      });

      it('TC-DBFS-033: should handle negative percent change', () => {
        const result = service.shouldReport(70, 100, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 20,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.deltaPercent).toBe(30);
      });

      it('TC-DBFS-034: should pass on any change when deadbandPercent is 0', () => {
        const result = service.shouldReport(100.001, 100, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 0,
        });

        expect(result.shouldReport).toBe(true);
      });

      it('TC-DBFS-035: should handle exact percent boundary', () => {
        const result = service.shouldReport(110, 100, {
          deadbandMode: DeadbandMode.PERCENT,
          deadbandPercent: 10,
        });

        expect(result.shouldReport).toBe(false);
      });
    });

    describe('mode: time', () => {
      it('TC-DBFS-040: should delegate to pipeline for time deadband', () => {
        const result = service.shouldReport(100, 100, {
          deadbandMode: DeadbandMode.TIME,
          deadbandTime: 5000,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('time_deadband_delegated');
      });

      it('TC-DBFS-041: should pass when deadbandTime is 0', () => {
        const result = service.shouldReport(100, 100, {
          deadbandMode: DeadbandMode.TIME,
          deadbandTime: 0,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('time_deadband_disabled');
      });
    });

    describe('unknown mode', () => {
      it('TC-DBFS-050: should default to passing for unknown mode', () => {
        const result = service.shouldReport(100, 100, {
          deadbandMode: 'unknown' as any,
        });

        expect(result.shouldReport).toBe(true);
        expect(result.reason).toBe('unknown_mode');
      });
    });
  });

  // ==================== absoluteDeadband ====================
  describe('absoluteDeadband', () => {
    it('TC-DBFS-060: should return true when delta exceeds deadband', () => {
      const result = service.absoluteDeadband(110, 100, 5);

      expect(result.shouldReport).toBe(true);
      expect(result.delta).toBe(10);
    });

    it('TC-DBFS-061: should return false when delta is within deadband', () => {
      const result = service.absoluteDeadband(103, 100, 5);

      expect(result.shouldReport).toBe(false);
      expect(result.delta).toBe(3);
    });

    it('TC-DBFS-062: should handle default deadbandValue of 0', () => {
      const result = service.absoluteDeadband(110, 100, 0);

      expect(result.shouldReport).toBe(true);
    });
  });

  // ==================== percentageDeadband ====================
  describe('percentageDeadband', () => {
    it('TC-DBFS-070: should return true when percent change exceeds threshold', () => {
      const result = service.percentageDeadband(130, 100, 20);

      expect(result.shouldReport).toBe(true);
      expect(result.deltaPercent).toBe(30);
    });

    it('TC-DBFS-071: should return false when percent change is within threshold', () => {
      const result = service.percentageDeadband(110, 100, 20);

      expect(result.shouldReport).toBe(false);
      expect(result.deltaPercent).toBe(10);
    });

    it('TC-DBFS-072: should bypass when previous value is zero', () => {
      const result = service.percentageDeadband(10, 0, 10);

      expect(result.shouldReport).toBe(true);
      expect(result.reason).toBe('zero_base_bypass');
    });
  });

  // ==================== state management ====================
  describe('state management', () => {
    it('TC-DBFS-080: should update and retrieve state', () => {
      service.updateState('tag-001', 42);

      const state = service.getState('tag-001');
      expect(state).toBeDefined();
      expect(state!.lastValue).toBe(42);
      expect(state!.skipCount).toBe(0);
    });

    it('TC-DBFS-081: should return undefined for non-existent tag', () => {
      expect(service.getState('non-existent')).toBeUndefined();
    });

    it('TC-DBFS-082: should get last value', () => {
      service.updateState('tag-001', 42);

      expect(service.getLastValue('tag-001')).toBe(42);
    });

    it('TC-DBFS-083: should record skip count', () => {
      service.updateState('tag-001', 100);
      service.recordSkip('tag-001');
      service.recordSkip('tag-001');

      const state = service.getState('tag-001');
      expect(state!.skipCount).toBe(2);
    });

    it('TC-DBFS-084: should reset state for a tag', () => {
      service.updateState('tag-001', 42);
      service.reset('tag-001');

      expect(service.getState('tag-001')).toBeUndefined();
    });

    it('TC-DBFS-085: should clear all states', () => {
      service.updateState('tag-001', 42);
      service.updateState('tag-002', 99);
      service.clearAll();

      expect(service.getState('tag-001')).toBeUndefined();
      expect(service.getState('tag-002')).toBeUndefined();
    });

    it('TC-DBFS-086: should not throw when recording skip for non-existent tag', () => {
      expect(() => service.recordSkip('non-existent')).not.toThrow();
    });

    it('TC-DBFS-087: should not throw when resetting non-existent tag', () => {
      expect(() => service.reset('non-existent')).not.toThrow();
    });
  });

  // ==================== getSkipStatistics ====================
  describe('getSkipStatistics', () => {
    it('TC-DBFS-090: should return skip statistics for all tags', () => {
      service.updateState('tag-001', 100);
      service.updateState('tag-002', 200);
      service.recordSkip('tag-001');
      service.recordSkip('tag-001');
      service.recordSkip('tag-002');

      const stats = service.getSkipStatistics();

      expect(stats.size).toBe(2);
      expect(stats.get('tag-001')!.skipCount).toBe(2);
      expect(stats.get('tag-002')!.skipCount).toBe(1);
    });

    it('TC-DBFS-091: should return empty map when no states', () => {
      const stats = service.getSkipStatistics();

      expect(stats.size).toBe(0);
    });
  });

  // ==================== integration with shouldReport and state ====================
  describe('shouldReport with state', () => {
    it('TC-DBFS-100: should integrate with updateState for tracking', () => {
      service.updateState('tag-001', 100);

      const result1 = service.shouldReport(104, 100, {
        deadbandMode: DeadbandMode.ABSOLUTE,
        deadbandValue: 5,
      });
      expect(result1.shouldReport).toBe(false);

      const result2 = service.shouldReport(110, 100, {
        deadbandMode: DeadbandMode.ABSOLUTE,
        deadbandValue: 5,
      });
      expect(result2.shouldReport).toBe(true);
    });

    it('TC-DBFS-101: should handle multiple tags independently', () => {
      const r1 = service.shouldReport(110, 100, {
        deadbandMode: DeadbandMode.ABSOLUTE,
        deadbandValue: 5,
      });

      const r2 = service.shouldReport(104, 100, {
        deadbandMode: DeadbandMode.ABSOLUTE,
        deadbandValue: 5,
      });

      expect(r1.shouldReport).toBe(true);
      expect(r2.shouldReport).toBe(false);
    });
  });
});
