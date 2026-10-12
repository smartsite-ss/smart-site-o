// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DeviceConnection, ConnectionPoolConfig } from './connection.types';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EventBusService } from '../event-bus/event-bus.service';
export declare class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly circuitBreakerService;
  private readonly eventBusService;
  private readonly logger;
  private connections;
  private config;
  constructor(circuitBreakerService: CircuitBreakerService, eventBusService: EventBusService);
  onModuleInit(): void;
  onModuleDestroy(): void;
  setConfig(config: Partial<ConnectionPoolConfig>): void;
  getConnection(deviceId: string): Promise<DeviceConnection | null>;
  releaseConnection(deviceId: string): Promise<void>;
  disconnectDevice(deviceId: string): Promise<void>;
  reconnectDevice(deviceId: string): Promise<boolean>;
  getConnectionStatus(deviceId: string): DeviceConnection['status'] | undefined;
  getAllConnections(): DeviceConnection[];
  getActiveConnectionsCount(): number;
  private createConnection;
  private reconnect;
  private closeConnection;
  private closeAllConnections;
  private isConnected;
  private emitStatusChange;
}
