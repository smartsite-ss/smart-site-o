// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Logger, OnModuleDestroy } from '@nestjs/common';
import { IProtocolAdapter, IDeviceContext, ITagContext, ChannelValidationResult } from './types';

/**
 * 采集插件基类
 *
 * 提供连接池管理、重试、超时、资源释放等通用能力。
 * 插件开发者只需实现 doConnect/doReadTag/doWriteTag/doDisconnect 四个抽象方法。
 * validateChannelConfig() 提供默认空实现，子类按需覆盖。
 */
export abstract class BaseCollectorService implements IProtocolAdapter, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  private clients = new Map<string, ClientEntry>();
  private connectionStatus = new Map<string, boolean>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  // ---- 抽象方法（子类必须实现） ----

  /** 建立协议连接，返回协议客户端对象 */
  abstract connect(device: IDeviceContext): Promise<any>;

  /** 执行单次标签读取 */
  protected abstract doReadTag(
    client: any,
    tag: ITagContext,
  ): Promise<{ tagId: string; value: any; timestamp: Date }>;

  /** 执行单次标签写入 */
  protected abstract doWriteTag(client: any, tag: ITagContext, value: any): Promise<void>;

  /** 断开协议连接 */
  protected abstract doDisconnect(client: any): Promise<void>;

  // ═══ 校验接口（子类按需覆盖）═══

  /** 校验通道配置 — 默认空实现，子类按需覆盖以添加协议特有语义校验 */
  async validateChannelConfig(_config: Record<string, any>): Promise<ChannelValidationResult> {
    return { valid: true, errors: [] };
  }

  // ---- 公共方法（带重试/超时） ----

  /** 带重试的标签读取 */
  async readTag(
    client: any,
    tag: ITagContext,
  ): Promise<{ tagId: string; value: any; timestamp: Date }> {
    const maxRetries = tag.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.doReadTag(client, tag);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }

  /** 带重试的标签写入 */
  async writeTag(client: any, tag: ITagContext, value: any): Promise<void> {
    const maxRetries = tag.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.doWriteTag(client, tag, value);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await this.sleep(200);
        }
      }
    }
    throw lastError;
  }

  /** 断开连接并清理内部状态 */
  async disconnect(client: any): Promise<void> {
    const deviceId = this.findDeviceIdByClient(client);
    try {
      await this.doDisconnect(client);
    } catch (error) {
      this.logger.warn(`Error during disconnect: ${(error as Error).message}`);
    }
    if (deviceId) {
      this.connectionStatus.set(deviceId, false);
      this.clients.delete(deviceId);
    }
  }

  /** 模块销毁时关闭所有连接 */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(`Closing all ${this.constructor.name} connections...`);
    // 停止所有重连定时器
    for (const timer of this.reconnectTimers.values()) {
      clearInterval(timer);
    }
    this.reconnectTimers.clear();

    for (const [_deviceId, entry] of this.clients) {
      try {
        await this.doDisconnect(entry.client);
      } catch {
        // 静默
      }
    }
    this.clients.clear();
    this.connectionStatus.clear();
  }

  /**
   * 连接前的通用检查：生成设备 ID、检查是否已连接
   *
   * 子类在 connect() 中调用此方法，避免重复编写设备 ID 生成和连接状态检查逻辑。
   *
   * @param device 设备上下文
   * @param protocolPrefix 协议前缀（如 'modbus', 'mqtt', 'opcua', 's7'），用于生成默认设备 ID
   * @returns { deviceId, existingResult } — 如果已连接，existingResult 非 null，调用方应直接返回
   */
  protected preConnect(
    device: IDeviceContext,
    protocolPrefix: string,
  ): { deviceId: string; alreadyConnected: boolean } {
    const deviceId = device.id || `${protocolPrefix}-${Date.now()}`;
    if (this.getConnectionStatus(deviceId)) {
      this.logger.log(`Device ${deviceId} already connected`);
      return { deviceId, alreadyConnected: true };
    }
    return { deviceId, alreadyConnected: false };
  }

  /**
   * 连接后的通用收尾：跟踪客户端、标记已连接
   *
   * 子类在 connect() 成功建立连接后调用此方法。
   *
   * @param deviceId 设备 ID
   * @param client 协议客户端对象
   */
  protected postConnect(deviceId: string, client: any): void {
    this.trackClient(deviceId, client);
    this.logger.log(`Device ${deviceId} connected successfully`);
  }

  // ---- 辅助方法 ----

  /** 跟踪客户端连接 */
  protected trackClient(deviceId: string, client: any): void {
    this.clients.set(deviceId, { client, connectedAt: new Date() });
    this.connectionStatus.set(deviceId, true);
  }

  /** 获取连接状态 */
  protected getConnectionStatus(deviceId: string): boolean {
    return this.connectionStatus.get(deviceId) ?? false;
  }

  /** 标记设备已断开连接 */
  protected markDisconnected(deviceId: string): void {
    this.connectionStatus.set(deviceId, false);
    this.clients.delete(deviceId);
  }

  /** 获取设备 ID → 客户端映射（只读） */
  protected getClientEntries(): ReadonlyMap<string, ClientEntry> {
    return this.clients;
  }

  private findDeviceIdByClient(client: any): string | undefined {
    for (const [id, entry] of this.clients) {
      if (entry.client === client) return id;
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---- 重连支持 ----

  /**
   * 启动自动重连
   *
   * 子类在 connect 失败或连接断开时调用，按固定间隔重试连接。
   *
   * @param deviceId 设备 ID
   * @param reconnectFn 重连函数（通常为 () => this.connect(device)）
   * @param interval 重连间隔（ms），默认 30000
   */
  protected startAutoReconnect(
    deviceId: string,
    reconnectFn: () => Promise<any>,
    interval: number = parseInt(process.env['DEVICE_AUTO_RECONNECT_INTERVAL_MS'] || '30000', 10),
  ): void {
    this.stopAutoReconnect(deviceId);

    const timer = setInterval(async () => {
      this.logger.log(`Attempting to reconnect device ${deviceId}...`);
      try {
        await reconnectFn();
        this.stopAutoReconnect(deviceId);
        this.logger.log(`Device ${deviceId} reconnected successfully`);
      } catch (error) {
        this.logger.warn(`Reconnect failed for device ${deviceId}: ${(error as Error).message}`);
      }
    }, interval);

    this.reconnectTimers.set(deviceId, timer);
    this.logger.log(`Auto-reconnect started for device ${deviceId} (interval: ${interval}ms)`);
  }

  /** 停止自动重连 */
  protected stopAutoReconnect(deviceId: string): void {
    const timer = this.reconnectTimers.get(deviceId);
    if (timer) {
      clearInterval(timer);
      this.reconnectTimers.delete(deviceId);
    }
  }
}

interface ClientEntry {
  client: any;
  connectedAt: Date;
}
