// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type DeviceConnectionStatus = 'online' | 'offline' | 'connecting' | 'error' | 'degraded';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';
export interface DeviceConnection {
  deviceId: string;
  projectId: string;
  protocol: string;
  status: DeviceConnectionStatus;
  connection?: any;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  errorCount: number;
  lastErrorMessage?: string;
  config: Record<string, any>;
}
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenSuccessThreshold: number;
  halfOpenMaxAttempts: number;
}
export interface CircuitBreakerStateData {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: number;
  halfOpenAttempts: number;
  halfOpenSuccessCount: number;
}
export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeoutMs: number;
  retryDelayBaseMs: number;
  retryDelayMaxMs: number;
  maxRetries: number;
}
