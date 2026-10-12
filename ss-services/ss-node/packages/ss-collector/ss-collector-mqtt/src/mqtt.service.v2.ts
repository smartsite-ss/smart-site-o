// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import * as mqtt from 'mqtt';
import {
  BaseCollectorService,
  CollectorPlugin,
  ConfigValidator,
  JsonPathUtil,
  PluginCategory,
  type CollectorReadResult,
  type ITagContext,
} from '@ss-node/ss-collector-sdk';

export interface MqttConfig {
  host: string;
  port?: number;
  protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  clientId?: string;
  username?: string;
  password?: string;
  clean?: boolean;
  keepalive?: number;
  reconnectPeriod?: number;
  qos?: 0 | 1 | 2;
  will?: {
    topic: string;
    payload: string;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  };
}

export interface MqttReadResult extends CollectorReadResult {
  value: any;
}

/**
 * MQTT Protocol Adapter
 *
 * 支持主题订阅与发布，适用于物联网场景
 */
@Injectable()
@CollectorPlugin({
  protocol: 'mqtt',
  displayName: 'MQTT',
  version: '0.1.0',
  description: 'MQTT 物联网协议采集插件，支持主题订阅与发布',
  category: PluginCategory.IOT,
  transport: 'tcp',
  connectionSchema: {
    type: 'object',
    required: ['host'],
    properties: {
      host: { type: 'string', title: 'Broker 地址', default: 'mqtt://localhost' },
      port: { type: 'number', title: '端口号', default: 1883 },
      clientId: { type: 'string', title: '客户端ID' },
      username: { type: 'string', title: '用户名' },
      password: { type: 'string', title: '密码' },
      qos: { type: 'number', title: 'QoS', default: 0, enum: [0, 1, 2] },
    },
  },
  defaultConnection: { host: 'mqtt://localhost', port: 1883, qos: 0 },
  supportedDataTypes: ['string', 'number', 'json'],
  enabledByDefault: false,
  tags: ['mqtt', 'iot', 'subscribe', 'publish'],
})
export class MqttService extends BaseCollectorService {
  private messageHandlers = new Map<string, (topic: string, message: Buffer) => void>();

  /** 获取所有设备的连接状态（与 ModbusService/S7Service 保持一致） */
  getAllConnectionStatus(): Map<string, boolean> {
    const result = new Map<string, boolean>();
    for (const [deviceId] of this.getClientEntries()) {
      result.set(deviceId, this.getConnectionStatus(deviceId));
    }
    return result;
  }

  /** 检查指定设备是否已连接 */
  isConnected(deviceId: string): boolean {
    return this.getConnectionStatus(deviceId);
  }

  async connect(deviceConfig: Record<string, any>): Promise<any> {
    const { deviceId: clientId, alreadyConnected } = this.preConnect(
      { id: deviceConfig.id, connection: deviceConfig } as any,
      'mqtt',
    );

    const config: MqttConfig = {
      host: deviceConfig.host || '127.0.0.1',
      port: deviceConfig.port || 1883,
      protocol: deviceConfig.protocol || 'mqtt',
      clientId: deviceConfig.clientId || `ss-data-${clientId}`,
      username: deviceConfig.username,
      password: deviceConfig.password,
      clean: deviceConfig.clean !== false,
      keepalive: deviceConfig.keepalive || 60,
      reconnectPeriod: deviceConfig.reconnectPeriod || 5000,
      qos: deviceConfig.qos || 1,
      will: deviceConfig.will,
    };

    // 已连接且客户端仍然 connected 则直接返回
    if (alreadyConnected) {
      const entries = this.getClientEntries();
      const entry = entries.get(clientId);
      if (entry?.client?.connected) {
        this.logger.log(`MQTT client ${clientId} already connected`);
        return { type: 'mqtt', clientId, config };
      }
      // 客户端已断开，继续重新连接
    }

    try {
      const brokerUrl = `${config.protocol}://${config.host}:${config.port}`;
      this.logger.log(`Connecting to MQTT broker: ${brokerUrl}`);

      const options: mqtt.IClientOptions = {
        clientId: config.clientId,
        clean: config.clean,
        keepalive: config.keepalive,
        reconnectPeriod: config.reconnectPeriod,
        connectTimeout: 10000,
        ...(config.username && { username: config.username }),
        ...(config.password && { password: config.password }),
        ...(config.will && {
          will: {
            topic: config.will.topic,
            payload: config.will.payload,
            qos: config.will.qos ?? 1,
            retain: config.will.retain ?? false,
          },
        }),
      };

      const client = await mqtt.connectAsync(brokerUrl, options);

      client.on('connect', () => {
        this.logger.log(`MQTT client ${clientId} connected to ${brokerUrl}`);
      });

      client.on('error', (error) => {
        this.logger.error(`MQTT error for client ${clientId}: ${error.message}`);
        this.markDisconnected(clientId);
      });

      client.on('reconnect', () => {
        this.logger.warn(`MQTT client ${clientId} reconnecting...`);
      });

      client.on('message', (topic, message) => {
        const handler = this.messageHandlers.get(clientId);
        if (handler) {
          handler(topic, message);
        }
      });

      this.postConnect(clientId, client);

      return { type: 'mqtt', clientId, config };
    } catch (error) {
      this.logger.error(`Failed to connect MQTT client ${clientId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /** 带错误捕获的标签读取（覆盖基类的重试版本） */
  async readTag(client: any, tagConfig: Record<string, any>): Promise<MqttReadResult> {
    const tagId = tagConfig.id || 'unknown-tag';
    const topic = tagConfig.topic;

    if (!topic) {
      throw new Error(`Topic not specified for tag ${tagId}`);
    }

    const result: MqttReadResult = {
      tagId,
      value: null,
      timestamp: new Date(),
      quality: 'good',
    };

    try {
      return (await this.doReadTag(client, tagConfig)) as MqttReadResult;
    } catch (error) {
      result.quality = 'bad';
      result.error = (error as Error).message;
      this.logger.warn(
        `Failed to read tag ${tagId} from topic ${topic}: ${(error as Error).message}`,
      );
      return result;
    }
  }

  /** 带错误捕获的标签写入 */
  async writeTag(client: any, tagConfig: Record<string, any>, value: any): Promise<void> {
    const tagId = tagConfig.id || 'unknown-tag';
    const topic = tagConfig.topic;

    if (!topic) {
      throw new Error(`Topic not specified for tag ${tagId}`);
    }

    try {
      await this.doWriteTag(client, tagConfig, value);
    } catch (error) {
      this.logger.error(
        `Failed to write tag ${tagId} to topic ${topic}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  protected async doReadTag(
    client: any,
    tagConfig: Record<string, any>,
  ): Promise<CollectorReadResult> {
    const tagId = tagConfig.id || 'unknown-tag';
    const topic = tagConfig.topic;
    const qos = tagConfig.qos || 1;

    const message = await new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MQTT subscribe timeout'));
      }, 5000);

      const tempTopic = `${topic}/response/${Date.now()}`;

      client.subscribe(tempTopic, { qos }, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }
      });

      client.once('message', (receivedTopic, msg) => {
        if (receivedTopic === tempTopic) {
          clearTimeout(timeout);
          resolve(msg);
          client.unsubscribe(tempTopic);
        }
      });

      client.publish(topic, JSON.stringify({ action: 'read', tagId }), { qos });
    });

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(message.toString());
    } catch {
      parsedValue = message.toString();
    }

    let value: unknown;
    const jsonPath = tagConfig.jsonPath as string | undefined;
    if (jsonPath && typeof parsedValue === 'object' && parsedValue !== null) {
      value = JsonPathUtil.extract(parsedValue, jsonPath);
    } else if (
      typeof parsedValue === 'object' &&
      parsedValue !== null &&
      (parsedValue as Record<string, unknown>).value !== undefined
    ) {
      value = (parsedValue as Record<string, unknown>).value;
    } else {
      value = parsedValue;
    }

    const timestamp = new Date(
      typeof parsedValue === 'object' && parsedValue !== null
        ? ((parsedValue as Record<string, unknown>).timestamp as string | number | undefined) ||
            Date.now()
        : Date.now(),
    );

    return {
      tagId,
      value,
      timestamp,
      quality: 'good',
    };
  }

  protected async doWriteTag(
    client: any,
    tagConfig: Record<string, any>,
    value: any,
  ): Promise<void> {
    const tagId = tagConfig.id || 'unknown-tag';
    const topic = tagConfig.topic;
    const qos = tagConfig.qos || 1;

    const payload = JSON.stringify({
      action: 'write',
      tagId,
      value,
      timestamp: new Date().toISOString(),
    });

    await client.publishAsync(topic, payload, { qos });
    this.logger.debug(`Wrote tag ${tagId} to topic ${topic}: ${value}`);
  }

  protected async doDisconnect(client: any): Promise<void> {
    if (!client) return;
    await client.end();
  }

  async validateChannelConfig(config: Record<string, any>) {
    const errors: { field: string; message: string }[] = [];

    const urlError = ConfigValidator.validateUrlPrefix(
      config.host,
      ['mqtt://', 'mqtts://', 'ws://', 'wss://'],
      'host',
      'Broker URL',
    );
    if (urlError) errors.push(urlError);

    const portError = ConfigValidator.validatePort(config.port, 'port', '端口号');
    if (portError) errors.push(portError);

    const qosError = ConfigValidator.validateEnum(config.qos, [0, 1, 2], 'qos', 'QoS');
    if (qosError) errors.push(qosError);

    return { valid: errors.length === 0, errors };
  }

  // ---- MQTT 特有方法 ----

  async publish(
    client: any,
    topic: string,
    message: any,
    options?: { qos?: number; retain?: boolean },
  ): Promise<void> {
    if (!client || !client.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      const qos = options?.qos || 1;
      const retain = options?.retain || false;

      await client.publishAsync(topic, payload, { qos, retain });
      this.logger.debug(`Published to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish to topic ${topic}: ${(error as Error).message}`);
      throw error;
    }
  }

  async subscribe(
    client: any,
    topic: string,
    callback: (topic: string, message: Buffer) => void,
    options?: { qos?: number },
  ): Promise<void> {
    if (!client || !client.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      const qos = options?.qos || 1;
      await client.subscribeAsync(topic, { qos });

      const clientId = this.getClientId(client);
      this.messageHandlers.set(clientId, callback);

      this.logger.debug(`Subscribed to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}: ${(error as Error).message}`);
      throw error;
    }
  }

  async unsubscribe(client: any, topic: string): Promise<void> {
    if (!client || !client.connected) return;

    try {
      await client.unsubscribeAsync(topic);
      this.logger.debug(`Unsubscribed from topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}: ${(error as Error).message}`);
    }
  }

  /**
   * 处理订阅收到的 MQTT 消息，按标签的 jsonPath 配置提取值。
   *
   * 适用于一条 MQTT 消息包含多个标签数据的场景：
   * 消息体为 JSON，每个标签通过自身的 `jsonPath` 从中提取对应字段。
   *
   * @param tags     订阅该 topic 的标签列表（需包含 jsonPath 配置）
   * @param _topic   接收到消息的 topic
   * @param message  MQTT 消息体
   * @returns 每个配置了 jsonPath 的标签对应的读取结果数组
   */
  processMessage(tags: ITagContext[], _topic: string, message: Buffer): MqttReadResult[] {
    const results: MqttReadResult[] = [];
    const timestamp = new Date();

    let parsed: unknown;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      // 非 JSON 消息，所有 jsonPath 标签均提取失败
      for (const tag of tags) {
        if (!tag.jsonPath) continue;
        results.push({
          tagId: tag.id,
          value: undefined,
          timestamp,
          quality: 'bad',
          error: `Message is not valid JSON, cannot apply jsonPath '${tag.jsonPath}'`,
        });
      }
      return results;
    }

    for (const tag of tags) {
      const jsonPath = tag.jsonPath as string | undefined;
      if (!jsonPath) continue;

      const value = JsonPathUtil.extract(parsed, jsonPath);
      results.push({
        tagId: tag.id,
        value,
        timestamp,
        quality: value !== undefined ? 'good' : 'bad',
        error: value === undefined ? `JSONPath '${jsonPath}' not found in message` : undefined,
      });
    }

    return results;
  }

  private getClientId(client: mqtt.MqttClient): string {
    for (const [id, entry] of this.getClientEntries()) {
      if (entry.client === client) return id;
    }
    return 'unknown';
  }
}
