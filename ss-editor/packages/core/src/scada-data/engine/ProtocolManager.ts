// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventBus } from './EventBus';

export interface IProtocolAdapter {
  readonly protocol: string;
  readonly version: string;
  connect(config: ProtocolConnectionConfig): Promise<ConnectionHandle>;
  disconnect(handle: ConnectionHandle): Promise<void>;
  subscribe(handle: ConnectionHandle, points: DataPoint[]): Promise<SubscriptionHandle>;
  unsubscribe(subHandle: SubscriptionHandle): Promise<void>;
  write(handle: ConnectionHandle, point: DataPoint, value: any): Promise<void>;
  getStatus(handle: ConnectionHandle): string;
}

export interface ProtocolConnectionConfig {
  protocol: string;
  endpoint: string;
  credentials?: { username?: string; password?: string; token?: string; certPath?: string };
  options?: Record<string, any>;
  retryPolicy?: { maxRetries: number; baseDelay: number; maxDelay: number };
}

export interface ConnectionHandle {
  id: string;
  protocol: string;
  endpoint: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectedAt?: number;
  error?: string;
}

export interface SubscriptionHandle {
  id: string;
  connectionId: string;
  points: DataPoint[];
  active: boolean;
  createdAt: number;
}

export interface DataPoint {
  id: string;
  address: string;
  dataType: string;
  access: 'read' | 'write' | 'readWrite';
  samplingRate?: number;
  deadband?: number;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? 'Unknown error');
}

export class ProtocolManager {
  private static _instance: ProtocolManager | null = null;

  private _eventBus: EventBus;
  private _adapters: Map<string, IProtocolAdapter> = new Map();
  private _connections: Map<string, ConnectionHandle> = new Map();
  private _subscriptions: Map<string, SubscriptionHandle> = new Map();

  private constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  static getInstance(eventBus?: EventBus): ProtocolManager {
    if (!ProtocolManager._instance) {
      if (!eventBus) {
        throw new Error(
          'ProtocolManager: EventBus instance required for first initialization',
        );
      }
      ProtocolManager._instance = new ProtocolManager(eventBus);
    }
    return ProtocolManager._instance;
  }

  static resetInstance(): void {
    ProtocolManager._instance = null;
  }

  registerAdapter(adapter: IProtocolAdapter): void {
    if (!adapter || !adapter.protocol) {
      throw new Error('Invalid adapter: must have a protocol property');
    }
    if (this._adapters.has(adapter.protocol)) {
      throw new Error(`Adapter for protocol "${adapter.protocol}" is already registered`);
    }
    this._adapters.set(adapter.protocol, adapter);
    this._eventBus.emit('protocolAdapterRegistered', {
      protocol: adapter.protocol,
      version: adapter.version,
    });
  }

  unregisterAdapter(protocol: string): void {
    if (!this._adapters.has(protocol)) {
      throw new Error(`No adapter registered for protocol: ${protocol}`);
    }
    this._adapters.delete(protocol);
    this._eventBus.emit('protocolAdapterUnregistered', { protocol });
  }

  getSupportedProtocols(): string[] {
    return Array.from(this._adapters.keys());
  }

  async connect(config: ProtocolConnectionConfig): Promise<ConnectionHandle> {
    if (!config || !config.protocol) {
      throw new Error('Connection config must include a protocol');
    }

    const adapter = this._adapters.get(config.protocol);
    if (!adapter) {
      throw new Error(`No adapter registered for protocol: ${config.protocol}`);
    }

    const pendingHandle: ConnectionHandle = {
      id: generateId('conn'),
      protocol: config.protocol,
      endpoint: config.endpoint,
      status: 'connecting',
    };

    this._connections.set(pendingHandle.id, pendingHandle);

    try {
      const connectedHandle = await adapter.connect(config);
      connectedHandle.id = pendingHandle.id;
      this._connections.set(connectedHandle.id, connectedHandle);
      this._eventBus.emit('protocolConnected', connectedHandle);
      return connectedHandle;
    } catch (err: unknown) {
      pendingHandle.status = 'error';
      pendingHandle.error = formatError(err);
      this._connections.set(pendingHandle.id, pendingHandle);
      this._eventBus.emit('protocolConnectionError', pendingHandle);
      throw err;
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const handle = this._connections.get(connectionId);
    if (!handle) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const adapter = this._adapters.get(handle.protocol);
    if (!adapter) {
      throw new Error(`No adapter registered for protocol: ${handle.protocol}`);
    }

    try {
      await adapter.disconnect(handle);
    } finally {
      handle.status = 'disconnected';
      this._connections.set(connectionId, handle);
      this._eventBus.emit('protocolDisconnected', handle);
    }
  }

  async subscribe(connectionId: string, points: DataPoint[]): Promise<SubscriptionHandle> {
    if (!points || points.length === 0) {
      throw new Error('At least one data point is required for subscription');
    }

    const handle = this._connections.get(connectionId);
    if (!handle) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (handle.status !== 'connected') {
      throw new Error(`Connection ${connectionId} is not connected (status: ${handle.status})`);
    }

    const adapter = this._adapters.get(handle.protocol);
    if (!adapter) {
      throw new Error(`No adapter registered for protocol: ${handle.protocol}`);
    }

    const subHandle = await adapter.subscribe(handle, points);
    subHandle.id = generateId('sub');
    subHandle.connectionId = connectionId;
    subHandle.active = true;
    subHandle.createdAt = Date.now();

    this._subscriptions.set(subHandle.id, subHandle);
    this._eventBus.emit('protocolSubscriptionCreated', subHandle);

    return subHandle;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subHandle = this._subscriptions.get(subscriptionId);
    if (!subHandle) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const connectionHandle = this._connections.get(subHandle.connectionId);
    if (!connectionHandle) {
      this._subscriptions.delete(subscriptionId);
      return;
    }

    const adapter = this._adapters.get(connectionHandle.protocol);
    if (!adapter) {
      this._subscriptions.delete(subscriptionId);
      return;
    }

    try {
      await adapter.unsubscribe(subHandle);
    } finally {
      subHandle.active = false;
      this._subscriptions.delete(subscriptionId);
      this._eventBus.emit('protocolSubscriptionRemoved', subHandle);
    }
  }

  async write(connectionId: string, point: DataPoint, value: any): Promise<void> {
    const handle = this._connections.get(connectionId);
    if (!handle) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (handle.status !== 'connected') {
      throw new Error(`Connection ${connectionId} is not connected (status: ${handle.status})`);
    }

    const adapter = this._adapters.get(handle.protocol);
    if (!adapter) {
      throw new Error(`No adapter registered for protocol: ${handle.protocol}`);
    }

    await adapter.write(handle, point, value);
    this._eventBus.emit('protocolDataWritten', {
      connectionId,
      pointId: point.id,
      value,
    });
  }

  getConnectionStatus(connectionId: string): string {
    const handle = this._connections.get(connectionId);
    if (!handle) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return handle.status;
  }

  getAllConnections(): ConnectionHandle[] {
    return Array.from(this._connections.values());
  }
}