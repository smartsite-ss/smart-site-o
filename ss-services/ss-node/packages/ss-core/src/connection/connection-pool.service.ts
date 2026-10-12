// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { DeviceConnection, ConnectionPoolConfig } from './connection.types';
import { CircuitBreakerService } from './circuit-breaker.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { DeviceStatusChangedEvent } from '../event-bus/event-bus.types';

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  maxConnections: 100,
  connectionTimeoutMs: 30000,
  retryDelayBaseMs: 1000,
  retryDelayMaxMs: 30000,
  maxRetries: 5,
};

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private connections = new Map<string, DeviceConnection>();
  private config: ConnectionPoolConfig = DEFAULT_CONFIG;

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly eventBusService: EventBusService,
  ) {}

  onModuleInit(): void {
    this.logger.log('ConnectionPoolService initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('ConnectionPoolService destroyed');
    this.closeAllConnections();
  }

  setConfig(config: Partial<ConnectionPoolConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async getConnection(deviceId: string): Promise<DeviceConnection | null> {
    const breakerId = `device:${deviceId}`;

    if (this.circuitBreakerService.isOpen(breakerId)) {
      this.logger.warn(`Circuit breaker open for device: ${deviceId}`);
      return null;
    }

    try {
      let connection = this.connections.get(deviceId);

      if (!connection) {
        connection = await this.createConnection(deviceId);
        this.connections.set(deviceId, connection);
      } else if (!this.isConnected(connection)) {
        connection = await this.reconnect(connection);
        this.connections.set(deviceId, connection);
      }

      this.circuitBreakerService.recordSuccess(breakerId);
      return connection;
    } catch (error) {
      this.circuitBreakerService.recordFailure(breakerId);
      this.logger.error(`Failed to get connection for ${deviceId}: ${error.message}`);
      return null;
    }
  }

  async releaseConnection(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      await this.closeConnection(connection);
      this.connections.delete(deviceId);
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.status = 'offline';
      connection.lastDisconnectedAt = Date.now();
      await this.closeConnection(connection);
      this.emitStatusChange(connection);
    }
  }

  async reconnectDevice(deviceId: string): Promise<boolean> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      try {
        const reconnected = await this.reconnect(connection);
        this.connections.set(deviceId, reconnected);
        return reconnected.status === 'online';
      } catch (error) {
        this.logger.error(`Failed to reconnect device ${deviceId}: ${error.message}`);
        return false;
      }
    }
    return false;
  }

  getConnectionStatus(deviceId: string): DeviceConnection['status'] | undefined {
    return this.connections.get(deviceId)?.status;
  }

  getAllConnections(): DeviceConnection[] {
    return Array.from(this.connections.values());
  }

  getActiveConnectionsCount(): number {
    return Array.from(this.connections.values()).filter((c) => c.status === 'online').length;
  }

  private async createConnection(deviceId: string): Promise<DeviceConnection> {
    const connection: DeviceConnection = {
      deviceId,
      projectId: '',
      protocol: '',
      status: 'connecting',
      errorCount: 0,
      config: {},
    };

    try {
      this.logger.log(`Creating connection for device: ${deviceId}`);
      connection.status = 'online';
      connection.lastConnectedAt = Date.now();
      this.emitStatusChange(connection);
      return connection;
    } catch (error) {
      connection.status = 'error';
      connection.errorCount = 1;
      connection.lastErrorMessage = error.message;
      connection.lastDisconnectedAt = Date.now();
      this.emitStatusChange(connection);
      throw error;
    }
  }

  private async reconnect(connection: DeviceConnection): Promise<DeviceConnection> {
    connection.status = 'connecting';
    this.emitStatusChange(connection);

    try {
      this.logger.log(`Reconnecting device: ${connection.deviceId}`);
      connection.status = 'online';
      connection.lastConnectedAt = Date.now();
      connection.errorCount = 0;
      this.emitStatusChange(connection);
      return connection;
    } catch (error) {
      connection.status = 'error';
      connection.errorCount++;
      connection.lastErrorMessage = error.message;
      connection.lastDisconnectedAt = Date.now();
      this.emitStatusChange(connection);
      throw error;
    }
  }

  private async closeConnection(connection: DeviceConnection): Promise<void> {
    if (connection.connection) {
      try {
        if (typeof connection.connection.close === 'function') {
          await connection.connection.close();
        }
      } catch (error) {
        this.logger.error(`Error closing connection for ${connection.deviceId}: ${error.message}`);
      }
    }
  }

  private async closeAllConnections(): Promise<void> {
    for (const connection of this.connections.values()) {
      await this.closeConnection(connection);
    }
    this.connections.clear();
  }

  private isConnected(connection: DeviceConnection): boolean {
    return connection.status === 'online' && !!connection.lastConnectedAt;
  }

  private emitStatusChange(connection: DeviceConnection): void {
    const event: DeviceStatusChangedEvent = {
      deviceId: connection.deviceId,
      projectId: connection.projectId,
      status: connection.status,
      previousStatus: undefined,
      errorMessage: connection.lastErrorMessage,
      timestamp: Date.now(),
    };
    this.eventBusService.emitDeviceStatusChanged(event);
  }
}
