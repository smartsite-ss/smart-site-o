// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface CachedDataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number;
  timestamp: number;
  quality: string;
  cachedAt: number;
}
export interface CacheConfig {
  l1Enabled: boolean;
  l2Enabled: boolean;
  l1MaxSize: number;
  l2TtlMs: number;
  l3TtlMs: number;
}
export interface DeviceConnectionCache {
  deviceId: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'degraded';
  connection?: any;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  errorCount: number;
}
export interface AlarmRuleCache {
  ruleId: string;
  tagId: string;
  condition: string;
  value: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  enabled: boolean;
}
