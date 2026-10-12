// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { HealthCheckerService } from '../health/health-checker.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { HealthChecker, HealthCheckResult } from '../health/health.types';
import { Logger } from '@nestjs/common';

type MockEventBus = Partial<Record<keyof EventBusService, jest.Mock>>;

function createMockEventBus(): MockEventBus {
  return {
    emit: jest.fn(),
    emitHealthRecovered: jest.fn(),
    emitHealthDegraded: jest.fn(),
    emitDataPointChanged: jest.fn(),
    emitDeviceStatusChanged: jest.fn(),
    emitAlarmTriggered: jest.fn(),
    emitAlarmAcknowledged: jest.fn(),
    emitConfigChanged: jest.fn(),
    emitProcessingError: jest.fn(),
    emitPluginDiscovered: jest.fn(),
    emitPluginRegistered: jest.fn(),
    emitPluginActivated: jest.fn(),
    emitPluginDeactivated: jest.fn(),
    emitPluginError: jest.fn(),
    emitPluginUnregistered: jest.fn(),
    emitPluginUpdated: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    getListenerCount: jest.fn(),
  };
}

function makeHealthCheckResult(overrides: Partial<HealthCheckResult> = {}): HealthCheckResult {
  return {
    name: 'test-checker',
    status: 'healthy',
    latency: 10,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeHealthyChecker(name: string = 'test-checker'): HealthChecker {
  return {
    name,
    check: jest.fn().mockResolvedValue(makeHealthCheckResult({ name })),
  };
}

function makeUnhealthyChecker(name: string = 'test-checker'): HealthChecker {
  return {
    name,
    check: jest
      .fn()
      .mockResolvedValue(makeHealthCheckResult({ name, status: 'unhealthy', error: 'error' })),
  };
}

function makeFailingChecker(name: string = 'test-checker'): HealthChecker {
  return {
    name,
    check: jest.fn().mockRejectedValue(new Error('check failed')),
  };
}

describe('HealthCheckerService', () => {
  let service: HealthCheckerService;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockEventBus = createMockEventBus();
    // Prevent periodic health check from starting
    jest.spyOn(HealthCheckerService.prototype as any, 'startPeriodicCheck').mockImplementation();
    service = new HealthCheckerService(mockEventBus as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerChecker', () => {
    it('should add a checker', () => {
      const checker = makeHealthyChecker();
      service.registerChecker(checker);

      // verify by checking that check runs the checker
      service.checkHealth().then(() => {
        expect(checker.check).toHaveBeenCalled();
      });
    });
  });

  describe('check', () => {
    it('should run all registered checkers', async () => {
      const checker1 = makeHealthyChecker('checker-1');
      const checker2 = makeHealthyChecker('checker-2');
      service.registerChecker(checker1);
      service.registerChecker(checker2);

      const report = await service.checkHealth();

      expect(checker1.check).toHaveBeenCalled();
      expect(checker2.check).toHaveBeenCalled();
      expect(report.checks).toHaveLength(2);
    });

    it('should return healthy status when all pass', async () => {
      const checker = makeHealthyChecker();
      service.registerChecker(checker);

      const report = await service.checkHealth();

      expect(report.overallStatus).toBe('healthy');
      expect(report.checks[0].status).toBe('healthy');
    });

    it('should return unhealthy status when any fails', async () => {
      const checker = makeUnhealthyChecker();
      service.registerChecker(checker);

      const report = await service.checkHealth();

      expect(report.overallStatus).toBe('unhealthy');
    });

    it('should return degraded status when some are unhealthy', async () => {
      const healthy = makeHealthyChecker('checker-1');
      const unhealthy = makeUnhealthyChecker('checker-2');
      service.registerChecker(healthy);
      service.registerChecker(unhealthy);

      const report = await service.checkHealth();

      expect(report.overallStatus).toBe('degraded');
    });

    it('should handle checker that throws an error', async () => {
      const failing = makeFailingChecker();
      service.registerChecker(failing);

      const report = await service.checkHealth();

      expect(report.checks[0].status).toBe('unhealthy');
      expect(report.checks[0].error).toBe('check failed');
    });
  });

  describe('getReport', () => {
    it('should return formatted report with uptime', async () => {
      const checker = makeHealthyChecker();
      service.registerChecker(checker);

      const report = await service.checkHealth();

      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('uptime');
      expect(report.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('notifyStatusChange', () => {
    it('should emit health degraded event on status change to unhealthy', async () => {
      const checker = makeUnhealthyChecker();
      service.registerChecker(checker);

      await service.checkHealth();

      expect(mockEventBus.emitHealthDegraded).toHaveBeenCalled();
    });

    it('should not emit event when status unchanged', async () => {
      const checker = makeHealthyChecker();
      service.registerChecker(checker);

      // First check - status stays healthy
      await service.checkHealth();
      // Second check - still healthy
      await service.checkHealth();

      // emitHealthRecovered should not be called on first check (status was already healthy)
      expect(mockEventBus.emitHealthRecovered).not.toHaveBeenCalled();
    });
  });

  describe('tryRecovery', () => {
    it('should attempt recovery actions', async () => {
      const checker = makeUnhealthyChecker();
      service.registerChecker(checker);

      await expect(service.attemptRecovery()).resolves.not.toThrow();
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const sleep = (service as any).sleep;
      const promise = sleep(10);
      jest.advanceTimersByTime(10);
      await promise;
      // If we get here without throwing, sleep resolved successfully
      expect(true).toBe(true);
    }, 5000);
  });
});
