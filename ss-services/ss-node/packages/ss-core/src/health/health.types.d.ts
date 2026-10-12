// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
  timestamp: number;
}
export interface HealthReport {
  overallStatus: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: number;
  uptime: number;
}
export interface HealthChecker {
  name: string;
  check(): Promise<HealthCheckResult>;
}
export interface RecoveryAction {
  checkName: string;
  action: () => Promise<boolean>;
  retryDelayMs: number;
  maxRetries: number;
  currentRetry: number;
}
