// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { CircuitBreakerService } from '@ss-node/ss-core';
import { Logger } from '@nestjs/common';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new CircuitBreakerService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getState', () => {
    it('should return closed for new breaker', () => {
      expect(service.getState('device-1')).toBe('closed');
    });

    it('should return open after threshold failures', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }

      expect(service.getState('device-1')).toBe('open');
    });

    it('should return half-open after reset timeout', () => {
      service.setConfig({ resetTimeoutMs: 0 });
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }

      // resetTimeoutMs is 0, so it should transition immediately
      // But getState is called first which checks the timeout
      // After failures, state is open. With resetTimeoutMs=0, next getState should return half-open
      expect(service.getState('device-1')).toBe('half-open');
    });
  });

  describe('isOpen', () => {
    it('should return false for new breaker', () => {
      expect(service.isOpen('device-1')).toBe(false);
    });

    it('should return true after threshold failures', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      expect(service.isOpen('device-1')).toBe(true);
    });

    it('should return false after reset', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      service.reset('device-1');
      expect(service.isOpen('device-1')).toBe(false);
    });
  });

  describe('isClosed', () => {
    it('should return true for new breaker', () => {
      expect(service.isClosed('device-1')).toBe(true);
    });

    it('should return false after threshold failures', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      expect(service.isClosed('device-1')).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      service.recordFailure('device-1');
      service.recordFailure('device-1');

      // After 2 failures, state should still be closed (threshold is 5)
      expect(service.getState('device-1')).toBe('closed');
    });

    it('should open circuit after reaching threshold', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      expect(service.isOpen('device-1')).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset failure count in closed state', () => {
      service.recordFailure('device-1');
      service.recordFailure('device-1');
      service.recordSuccess('device-1');

      // Failure count should be reset
      for (let i = 0; i < 4; i++) {
        service.recordFailure('device-1');
      }
      // Still only 4 failures after reset, should be closed
      expect(service.isOpen('device-1')).toBe(false);
    });

    it('should close circuit after half-open success threshold', () => {
      // Open the circuit
      service.setConfig({ resetTimeoutMs: 0 });
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }

      // Trigger half-open transition by calling getState
      service.getState('device-1');

      // Now in half-open, record enough successes
      service.recordSuccess('device-1');
      service.recordSuccess('device-1');
      service.recordSuccess('device-1');

      expect(service.isClosed('device-1')).toBe(true);
    });

    it('should re-open circuit after max half-open attempts', () => {
      service.setConfig({ resetTimeoutMs: 0, halfOpenMaxAttempts: 2, halfOpenSuccessThreshold: 5 });
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }

      // Trigger half-open transition
      service.getState('device-1');

      // Record success but not enough to close, reaches max attempts
      service.recordSuccess('device-1');
      service.recordSuccess('device-1');

      // After re-open due to max attempts, circuit should not be closed
      expect(service.isClosed('device-1')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear state for specific breaker', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      expect(service.isOpen('device-1')).toBe(true);

      service.reset('device-1');
      expect(service.isClosed('device-1')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all breakers', () => {
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-1');
      }
      for (let i = 0; i < 5; i++) {
        service.recordFailure('device-2');
      }

      service.clearAll();

      expect(service.isClosed('device-1')).toBe(true);
      expect(service.isClosed('device-2')).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should update failure threshold', () => {
      service.setConfig({ failureThreshold: 3 });

      service.recordFailure('device-1');
      service.recordFailure('device-1');
      service.recordFailure('device-1');

      expect(service.isOpen('device-1')).toBe(true);
    });
  });
});
