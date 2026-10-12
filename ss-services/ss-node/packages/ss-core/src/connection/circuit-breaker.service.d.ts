// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { CircuitBreakerState, CircuitBreakerConfig } from './connection.types';
export declare class CircuitBreakerService {
  private readonly logger;
  private breakerStates;
  private config;
  setConfig(config: Partial<CircuitBreakerConfig>): void;
  getState(breakerId: string): CircuitBreakerState;
  isOpen(breakerId: string): boolean;
  isClosed(breakerId: string): boolean;
  recordFailure(breakerId: string): void;
  recordSuccess(breakerId: string): void;
  reset(breakerId: string): void;
  clearAll(): void;
}
