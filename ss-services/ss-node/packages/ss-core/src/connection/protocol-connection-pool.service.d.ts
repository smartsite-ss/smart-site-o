// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleDestroy } from '@nestjs/common';
import { ConnectionPoolService } from './connection-pool.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EventBusService } from '../event-bus/event-bus.service';
export interface ProtocolConnection {
  deviceId: string;
  protocol: 'modbus-tcp' | 'modbus-rtu' | 'opcua' | 'mqtt' | 's7';
  client: any;
  status: 'online' | 'offline' | 'connecting' | 'error';
  connectedAt: number;
  errorCount: number;
  lastError?: string;
  metadata?: Record<string, any>;
}
export interface ProtocolPoolConfig {
  maxPerProtocol: number;
  maxTotal: number;
  idleTimeoutMs: number;
  healthCheckIntervalMs: number;
  reconnectOnFailure: boolean;
}
export declare class ProtocolConnectionPoolService implements OnModuleDestroy {
  private readonly connectionPoolService;
  private readonly circuitBreakerService;
  private readonly eventBusService;
  private readonly logger;
  private pools;
  private config;
  constructor(
    connectionPoolService: ConnectionPoolService,
    circuitBreakerService: CircuitBreakerService,
    eventBusService: EventBusService,
  );
  onModuleDestroy(): void;
  setConfig(config: Partial<ProtocolPoolConfig>): void;
  getConnection(
    deviceId: string,
    protocol: ProtocolConnection['protocol'],
    connectFn: () => Promise<any>,
    config?: Record<string, any>,
  ): Promise<ProtocolConnection>;
  releaseConnection(deviceId: string, protocol: ProtocolConnection['protocol']): void;
  getPoolStats(): {
    protocol: string;
    total: number;
    online: number;
    offline: number;
    error: number;
  }[];
  getTotalConnections(): number;
  closeAll(): void;
}
