// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable } from '@nestjs/common';
import * as opcua from 'node-opcua';
import {
  BaseCollectorService,
  CollectorPlugin,
  ConfigValidator,
  PluginCategory,
  type CollectorReadResult,
} from '@ss-node/ss-collector-sdk';

/** OPC UA 安全模式 */
export type OpcUaSecurityMode = 'None' | 'Sign' | 'SignAndEncrypt';

/** OPC UA 安全策略 */
export type OpcUaSecurityPolicy = 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';

export interface OpcUaConfig {
  endpointUrl: string;
  securityMode?: OpcUaSecurityMode;
  securityPolicy?: OpcUaSecurityPolicy;
  username?: string;
  password?: string;
  requestedSessionTimeout?: number;
}

export interface OpcUaReadResult extends CollectorReadResult {
  value: any;
}

export interface OpcUaNodeInfo {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: string;
  dataType?: string;
}

@Injectable()
@CollectorPlugin({
  protocol: 'opc_ua',
  displayName: 'OPC UA',
  version: '0.1.0',
  description: 'OPC Unified Architecture 协议采集插件，支持浏览节点树、订阅与读写',
  category: PluginCategory.INDUSTRIAL_BUS,
  transport: 'tcp',
  connectionSchema: {
    type: 'object',
    required: ['endpointUrl'],
    properties: {
      endpointUrl: { type: 'string', title: '端点URL', default: 'opc.tcp://localhost:4840' },
      securityMode: {
        type: 'string',
        title: '安全模式',
        default: 'None',
        enum: ['None', 'Sign', 'SignAndEncrypt'],
      },
      securityPolicy: {
        type: 'string',
        title: '安全策略',
        default: 'None',
        enum: ['None', 'Basic128Rsa15', 'Basic256', 'Basic256Sha256'],
      },
      username: { type: 'string', title: '用户名' },
      password: { type: 'string', title: '密码' },
    },
  },
  defaultConnection: {
    endpointUrl: 'opc.tcp://localhost:4840',
    securityMode: 'None',
    securityPolicy: 'None',
  },
  supportedDataTypes: ['int16', 'uint16', 'int32', 'uint32', 'float', 'double', 'bool', 'string'],
  enabledByDefault: false,
  tags: ['opcua', 'industrial', 'server'],
})
export class OpcUaService extends BaseCollectorService {
  private subscriptions = new Map<string, opcua.ClientSubscription>();

  /** 获取所有设备的连接状态（与 ModbusService/S7Service/MqttService 保持一致） */
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
    const { deviceId: sessionId, alreadyConnected } = this.preConnect(
      { id: deviceConfig.id, connection: deviceConfig } as any,
      'opcua',
    );

    const config: OpcUaConfig = {
      endpointUrl: deviceConfig.endpointUrl || 'opc.tcp://localhost:4840',
      securityMode: deviceConfig.securityMode || 'None',
      securityPolicy: deviceConfig.securityPolicy || opcua.SecurityPolicy.None,
      username: deviceConfig.username,
      password: deviceConfig.password,
      requestedSessionTimeout: deviceConfig.requestedSessionTimeout || 60000,
    };

    // 已连接则直接返回
    if (alreadyConnected) {
      return { type: 'opcua', sessionId, config };
    }

    try {
      this.logger.log(
        `Connecting to OPC UA server: ${config.endpointUrl} (mode=${config.securityMode}, policy=${config.securityPolicy})`,
      );

      const connectionStrategy = {
        maxRetry: 10,
        initialDelay: 1000,
        maxDelay: 20 * 1000,
      };

      const securityMode = this.mapSecurityMode(config.securityMode);
      const securityPolicy = this.mapSecurityPolicy(config.securityPolicy);

      const client = opcua.OPCUAClient.create({
        connectionStrategy,
        securityMode,
        securityPolicy,
        endpointMustExist: false,
      });

      await client.connect(config.endpointUrl);

      let session: opcua.ClientSession;

      if (config.username && config.password) {
        session = await client.createSession({
          userIdentity: {
            type: opcua.UserTokenType.UserName,
            userName: config.username,
            password: config.password,
          },
        } as any);
      } else {
        session = await client.createSession();
      }

      this.postConnect(sessionId, session);

      this.logger.log(`Successfully connected to OPC UA server (${sessionId})`);

      return { type: 'opcua', sessionId, config, client };
    } catch (error) {
      this.logger.error(
        `Failed to connect OPC UA session ${sessionId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /** 带错误捕获的标签读取（覆盖基类的重试版本） */
  async readTag(client: any, tagConfig: Record<string, any>): Promise<OpcUaReadResult> {
    const tagId = tagConfig.id || 'unknown-tag';
    const nodeIdString = tagConfig.nodeId || tagConfig.address;

    if (!nodeIdString) {
      throw new Error(`Node ID not specified for tag ${tagId}`);
    }

    const result: OpcUaReadResult = {
      tagId,
      value: null,
      timestamp: new Date(),
      quality: 'good',
    };

    try {
      return (await this.doReadTag(client, tagConfig)) as OpcUaReadResult;
    } catch (error) {
      result.quality = 'bad';
      result.error = (error as Error).message;
      this.logger.warn(
        `Failed to read tag ${tagId} @ ${nodeIdString}: ${(error as Error).message}`,
      );
      return result;
    }
  }

  /** 带错误捕获的标签写入 */
  async writeTag(client: any, tagConfig: Record<string, any>, value: any): Promise<void> {
    const tagId = tagConfig.id || 'unknown-tag';
    const nodeIdString = tagConfig.nodeId || tagConfig.address;

    if (!nodeIdString) {
      throw new Error(`Node ID not specified for tag ${tagId}`);
    }

    try {
      await this.doWriteTag(client, tagConfig, value);
    } catch (error) {
      this.logger.error(
        `Failed to write tag ${tagId} @ ${nodeIdString}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  protected async doReadTag(
    client: any,
    tagConfig: Record<string, any>,
  ): Promise<CollectorReadResult> {
    const tagId = tagConfig.id || 'unknown-tag';
    const nodeIdString = tagConfig.nodeId || tagConfig.address;

    const nodeId = opcua.coerceNodeId(nodeIdString);
    const dataValue = await client.read({
      nodeId,
      attributeId: opcua.AttributeIds.Value,
    });

    const result: OpcUaReadResult = {
      tagId,
      value: dataValue.value.value,
      timestamp: dataValue.sourceTimestamp || new Date(),
      quality: this.mapQuality(dataValue.statusCode),
    };

    return result;
  }

  protected async doWriteTag(
    client: any,
    tagConfig: Record<string, any>,
    value: any,
  ): Promise<void> {
    const tagId = tagConfig.id || 'unknown-tag';
    const nodeIdString = tagConfig.nodeId || tagConfig.address;

    const nodeId = opcua.coerceNodeId(nodeIdString);
    const dataType = this.inferDataType(value);

    await client.write({
      nodeId,
      attributeId: opcua.AttributeIds.Value,
      value: new opcua.Variant({
        dataType,
        value,
      }),
    });

    this.logger.debug(`Wrote tag ${tagId} @ ${nodeIdString}: ${value}`);
  }

  protected async doDisconnect(client: any): Promise<void> {
    if (!client) return;

    const sessionId = this.getSessionId(client);
    if (sessionId) {
      const sub = this.subscriptions.get(sessionId);
      if (sub) {
        await sub.terminate();
        this.subscriptions.delete(sessionId);
      }
    }

    await client.close();
  }

  async onModuleDestroy(): Promise<void> {
    await super.onModuleDestroy();
    this.subscriptions.clear();
  }

  async validateChannelConfig(config: Record<string, any>) {
    const errors: { field: string; message: string }[] = [];

    const urlError = ConfigValidator.validateUrlPrefix(
      config.endpointUrl,
      ['opc.tcp://', 'https://'],
      'endpointUrl',
      '端点URL',
    );
    if (urlError) errors.push(urlError);

    const modeError = ConfigValidator.validateEnum(
      config.securityMode,
      ['None', 'Sign', 'SignAndEncrypt'],
      'securityMode',
      '安全模式',
    );
    if (modeError) errors.push(modeError);

    const policyError = ConfigValidator.validateEnum(
      config.securityPolicy,
      ['None', 'Basic128Rsa15', 'Basic256', 'Basic256Sha256'],
      'securityPolicy',
      '安全策略',
    );
    if (policyError) errors.push(policyError);

    // 安全模式与安全策略一致性校验：非 None 模式下不应使用 None 策略
    if (
      config.securityMode &&
      config.securityMode !== 'None' &&
      config.securityPolicy !== undefined &&
      config.securityPolicy === 'None'
    ) {
      errors.push({
        field: 'securityPolicy',
        message: '安全模式为 Sign/SignAndEncrypt 时，安全策略不能为 None',
      });
    }

    return { valid: errors.length === 0, errors };
  }

  // ---- OPC UA 特有方法 ----

  async browseNode(client: any, nodeIdString: string): Promise<OpcUaNodeInfo[]> {
    try {
      const nodeId = opcua.coerceNodeId(nodeIdString);
      const browseResult = await client.browse(nodeId);

      const nodes: OpcUaNodeInfo[] = [];

      for (const reference of browseResult.references) {
        try {
          const nodeInfo = await this.getNodeInfo(client, reference.nodeId.toString());
          nodes.push(nodeInfo);
        } catch (error) {
          nodes.push({
            nodeId: reference.nodeId.toString(),
            browseName: reference.browseName.name || '',
            displayName: reference.displayName.text || '',
            nodeClass:
              (reference.nodeClass as any)?.toString() || String(reference.nodeClass) || 'Unknown',
          });
        }
      }

      return nodes;
    } catch (error) {
      this.logger.error(`Failed to browse node ${nodeIdString}: ${(error as Error).message}`);
      throw error;
    }
  }

  async getNodeInfo(client: any, nodeIdString: string): Promise<OpcUaNodeInfo> {
    const nodeId = opcua.coerceNodeId(nodeIdString);

    const [browseName, displayName, nodeClass, dataType] = await Promise.all([
      client.read({ nodeId, attributeId: opcua.AttributeIds.BrowseName }),
      client.read({ nodeId, attributeId: opcua.AttributeIds.DisplayName }),
      client.read({ nodeId, attributeId: opcua.AttributeIds.NodeClass }),
      client.read({ nodeId, attributeId: opcua.AttributeIds.DataType }).catch(() => null),
    ]);

    return {
      nodeId: nodeIdString,
      browseName: browseName.value?.value?.name || '',
      displayName: displayName.value?.text || '',
      nodeClass: (nodeClass.value as any)?.toString() || 'Unknown',
      dataType: dataType?.value?.dataType ? opcua.DataType[dataType.value.dataType] : undefined,
    };
  }

  async createSubscription(
    client: any,
    sessionId: string,
    callback: (dataValue: opcua.DataValue) => void,
  ): Promise<opcua.ClientSubscription> {
    try {
      const subscription = await client.createSubscription2({
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 12,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10,
      });

      subscription.on('item_changed', (item, dataValue) => {
        callback(dataValue);
      });

      this.subscriptions.set(sessionId, subscription);
      this.logger.log(`Created OPC UA subscription for session ${sessionId}`);

      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to create subscription for session ${sessionId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async monitorItem(
    subscription: opcua.ClientSubscription,
    nodeIdString: string,
    samplingInterval: number = 1000,
  ): Promise<opcua.ClientMonitoredItem> {
    try {
      const nodeId = opcua.coerceNodeId(nodeIdString);

      const itemToMonitor = {
        nodeId,
        attributeId: opcua.AttributeIds.Value,
      };

      const monitoredItem = await subscription.monitor(
        itemToMonitor,
        { samplingInterval, discardOldest: true, queueSize: 10 },
        opcua.TimestampsToReturn.Both,
      );

      this.logger.debug(`Monitoring item ${nodeIdString}`);

      return monitoredItem;
    } catch (error) {
      this.logger.error(`Failed to monitor item ${nodeIdString}: ${(error as Error).message}`);
      throw error;
    }
  }

  private getSessionId(client: any): string | undefined {
    for (const [id, entry] of this.getClientEntries()) {
      if (entry.client === client) return id;
    }
    return undefined;
  }

  private mapQuality(statusCode: any): 'good' | 'uncertain' | 'bad' {
    if (statusCode.isGood && statusCode.isGood()) return 'good';
    if ((statusCode as any).isUncertain && (statusCode as any).isUncertain()) return 'uncertain';
    return 'bad';
  }

  /** 将配置中的安全模式字符串映射为 node-opcua MessageSecurityMode 枚举值 */
  private mapSecurityMode(
    mode: OpcUaSecurityMode | undefined,
  ): (typeof opcua.MessageSecurityMode)[keyof typeof opcua.MessageSecurityMode] {
    switch (mode) {
      case 'Sign':
        return opcua.MessageSecurityMode.Sign;
      case 'SignAndEncrypt':
        return opcua.MessageSecurityMode.SignAndEncrypt;
      case 'None':
      default:
        return opcua.MessageSecurityMode.None;
    }
  }

  /** 将配置中的安全策略字符串映射为 node-opcua SecurityPolicy 枚举值 */
  private mapSecurityPolicy(
    policy: OpcUaSecurityPolicy | undefined,
  ): (typeof opcua.SecurityPolicy)[keyof typeof opcua.SecurityPolicy] {
    switch (policy) {
      case 'Basic128Rsa15':
        return opcua.SecurityPolicy.Basic128Rsa15;
      case 'Basic256':
        return opcua.SecurityPolicy.Basic256;
      case 'Basic256Sha256':
        return opcua.SecurityPolicy.Basic256Sha256;
      case 'None':
      default:
        return opcua.SecurityPolicy.None;
    }
  }

  private inferDataType(value: any): opcua.DataType {
    if (typeof value === 'boolean') return opcua.DataType.Boolean;
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return opcua.DataType.Int32;
      return opcua.DataType.Double;
    }
    if (typeof value === 'string') return opcua.DataType.String;
    if (ArrayBuffer.isView(value)) return (opcua as any).DataType.ByteString;
    return opcua.DataType.Variant;
  }
}
