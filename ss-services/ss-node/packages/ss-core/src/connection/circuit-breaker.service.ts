// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStateData,
} from './connection.types';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenSuccessThreshold: 3,
  halfOpenMaxAttempts: 5,
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakerStates = new Map<string, CircuitBreakerStateData>();
  private config: CircuitBreakerConfig = DEFAULT_CONFIG;

  setConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(breakerId: string): CircuitBreakerState {
    const state = this.breakerStates.get(breakerId);
    if (!state) {
      return 'closed';
    }

    if (state.state === 'open') {
      const now = Date.now();
      if (state.lastFailureTime && now - state.lastFailureTime >= this.config.resetTimeoutMs) {
        this.breakerStates.set(breakerId, {
          ...state,
          state: 'half-open',
          halfOpenAttempts: 0,
          halfOpenSuccessCount: 0,
        });
        return 'half-open';
      }
    }

    return state.state;
  }

  isOpen(breakerId: string): boolean {
    return this.getState(breakerId) === 'open';
  }

  isClosed(breakerId: string): boolean {
    return this.getState(breakerId) === 'closed';
  }

  recordFailure(breakerId: string): void {
    const state = this.breakerStates.get(breakerId) || {
      state: 'closed',
      failureCount: 0,
      halfOpenAttempts: 0,
      halfOpenSuccessCount: 0,
    };

    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.state === 'closed' && state.failureCount >= this.config.failureThreshold) {
      this.logger.warn(
        `Circuit breaker opened for ${breakerId} after ${state.failureCount} failures`,
      );
      state.state = 'open';
    }

    this.breakerStates.set(breakerId, state);
  }

  recordSuccess(breakerId: string): void {
    const state = this.breakerStates.get(breakerId) || {
      state: 'closed',
      failureCount: 0,
      halfOpenAttempts: 0,
      halfOpenSuccessCount: 0,
    };

    if (state.state === 'half-open') {
      state.halfOpenAttempts++;
      state.halfOpenSuccessCount++;

      if (state.halfOpenSuccessCount >= this.config.halfOpenSuccessThreshold) {
        this.logger.log(`Circuit breaker closed for ${breakerId} after successful attempts`);
        state.state = 'closed';
        state.failureCount = 0;
        state.halfOpenAttempts = 0;
        state.halfOpenSuccessCount = 0;
      } else if (state.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.logger.warn(`Circuit breaker re-opened for ${breakerId} after max attempts`);
        state.state = 'open';
        state.failureCount = 0;
        state.halfOpenAttempts = 0;
        state.halfOpenSuccessCount = 0;
      }
    } else {
      state.failureCount = 0;
    }

    this.breakerStates.set(breakerId, state);
  }

  reset(breakerId: string): void {
    this.breakerStates.delete(breakerId);
    this.logger.log(`Circuit breaker reset for ${breakerId}`);
  }

  clearAll(): void {
    this.breakerStates.clear();
  }
}
