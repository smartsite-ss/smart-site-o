// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

const DEFAULT_PROTOCOL_POOL_CONFIG: ProtocolPoolConfig = {
  maxPerProtocol: 50,
  maxTotal: 200,
  idleTimeoutMs: 300000,
  healthCheckIntervalMs: 60000,
  reconnectOnFailure: true,
};

@Injectable()
export class ProtocolConnectionPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(ProtocolConnectionPoolService.name);
  private pools = new Map<string, Map<string, ProtocolConnection>>();
  private config: ProtocolPoolConfig = DEFAULT_PROTOCOL_POOL_CONFIG;

  constructor(
    private readonly connectionPoolService: ConnectionPoolService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly eventBusService: EventBusService,
  ) {}

  onModuleDestroy() {
    this.closeAll();
  }

  setConfig(config: Partial<ProtocolPoolConfig>) {
    this.config = { ...this.config, ...config };
  }

  async getConnection(
    deviceId: string,
    protocol: ProtocolConnection['protocol'],
    connectFn: () => Promise<any>,
    config?: Record<string, any>,
  ): Promise<ProtocolConnection> {
    if (!this.pools.has(protocol)) {
      this.pools.set(protocol, new Map());
    }

    const pool = this.pools.get(protocol)!;

    if (this.getTotalConnections() >= this.config.maxTotal) {
      throw new Error(`Connection pool exhausted: max ${this.config.maxTotal}`);
    }

    if (pool.size >= this.config.maxPerProtocol) {
      throw new Error(`Protocol pool ${protocol} exhausted: max ${this.config.maxPerProtocol}`);
    }

    const breakerId = `${protocol}:${deviceId}`;
    if (this.circuitBreakerService.isOpen(breakerId)) {
      throw new Error(`Circuit breaker open for ${breakerId}`);
    }

    let conn = pool.get(deviceId);

    if (conn && conn.status === 'online') {
      return conn;
    }

    try {
      conn = {
        deviceId,
        protocol,
        client: null,
        status: 'connecting',
        connectedAt: 0,
        errorCount: 0,
        metadata: config,
      };

      conn.client = await connectFn();
      conn.status = 'online';
      conn.connectedAt = Date.now();
      conn.errorCount = 0;

      pool.set(deviceId, conn);
      this.circuitBreakerService.recordSuccess(breakerId);

      this.logger.log(`[${protocol.toUpperCase()}] Connected device ${deviceId}`);

      return conn;
    } catch (error) {
      if (conn) {
        conn.status = 'error';
        conn.errorCount = (conn.errorCount || 0) + 1;
        conn.lastError = error.message;
      }
      this.circuitBreakerService.recordFailure(breakerId);
      this.logger.error(
        `[${protocol.toUpperCase()}] Connection failed for ${deviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  releaseConnection(deviceId: string, protocol: ProtocolConnection['protocol']): void {
    const pool = this.pools.get(protocol);
    if (!pool) return;

    const conn = pool.get(deviceId);
    if (conn) {
      try {
        if (conn.client?.close) {
          conn.client.close();
        }
      } catch (error) {
        this.logger.warn(`Error closing connection for ${deviceId}: ${error.message}`);
      }
      pool.delete(deviceId);
      this.logger.debug(`[${protocol.toUpperCase()}] Released connection ${deviceId}`);
    }
  }

  getPoolStats(): {
    protocol: string;
    total: number;
    online: number;
    offline: number;
    error: number;
  }[] {
    const stats: {
      protocol: string;
      total: number;
      online: number;
      offline: number;
      error: number;
    }[] = [];

    for (const [protocol, pool] of this.pools) {
      let online = 0,
        offline = 0,
        error = 0;
      for (const conn of pool.values()) {
        if (conn.status === 'online') online++;
        else if (conn.status === 'offline') offline++;
        else if (conn.status === 'error') error++;
      }
      stats.push({ protocol, total: pool.size, online, offline, error });
    }

    return stats;
  }

  getTotalConnections(): number {
    let total = 0;
    for (const pool of this.pools.values()) {
      total += pool.size;
    }
    return total;
  }

  closeAll(): void {
    for (const [_protocol, pool] of this.pools) {
      for (const [deviceId, conn] of pool) {
        try {
          if (conn.client?.close) {
            conn.client.close();
          }
        } catch (error) {
          this.logger.warn(`Error closing connection for ${deviceId}`);
        }
      }
      pool.clear();
    }
    this.pools.clear();
    this.logger.log('All protocol connections closed');
  }
}
