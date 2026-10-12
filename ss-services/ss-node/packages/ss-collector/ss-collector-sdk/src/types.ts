// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 采集插件通用类型定义
 */

/** 数据质量等级 */
export type Quality = 'good' | 'uncertain' | 'bad';

/** 值变换配置 */
export interface TransformConfig {
  /** 缩放系数，默认 1 */
  scale?: number;
  /** 偏移量，默认 0 */
  offset?: number;
  /** 小数精度，默认 2 */
  precision?: number;
}

/** 采集读取结果（统一接口） */
export interface CollectorReadResult {
  tagId: string;
  value: any;
  /** 原始未变换值（可选，用于调试和审计） */
  rawValue?: any;
  timestamp: Date;
  quality: Quality;
  error?: string;
}

/** 通道校验错误项 */
export interface FieldError {
  field: string;
  message: string;
}

/** 采集器基础连接配置（推荐各协议 Config 继承） */
export interface BaseConnectionConfig {
  /** 请求超时（ms） */
  timeout?: number;
  /** 重连间隔（ms） */
  reconnectInterval?: number;
}

/** 采集器基础设备配置（推荐各协议 DeviceConfig 继承） */
export interface BaseDeviceConfig extends BaseConnectionConfig {
  /** 设备 ID */
  id: string;
  /** 连接参数 */
  connection: Record<string, any>;
}

// ============================================================================
// 协议适配器接口（2026-07-17 从 ss-core 迁移至 ss-collector-sdk）
// ============================================================================

/** 通道校验错误项（已存在于本文件，保持原定义） */
// FieldError 已在上方定义，此处不重复

/** 通道配置校验结果 */
export interface ChannelValidationResult {
  valid: boolean;
  errors: FieldError[];
}

/**
 * 设备上下文 — connect() 时传入，携带设备完整信息。
 *
 * 从 Device 实体映射而来，是纯数据对象（无 ORM 元数据），
 * 可安全地跨 worker_thread / child_process 序列化传递。
 */
export interface IDeviceContext {
  /** 设备 ID (UUID) */
  id: string;
  /** 设备编码 (项目内唯一) */
  deviceCode?: string;
  /** 设备名称 */
  name: string;
  /** 协议标识 (如 'modbus_tcp', 'virtual') */
  protocol: string;
  /** 驱动名称 */
  driver?: string;
  /** 连接配置 (协议特有：host/port/unitId 等) */
  connection: Record<string, any>;
  /** 采集周期 (ms) */
  scanRate?: number;
  /** 离线周期 (ms) */
  offlinePeriod?: number;
  /** 设备模板 ID */
  templateId?: string;
  /** 项目 ID */
  projectId?: string;
}

/**
 * 标签上下文 — readTag()/writeTag() 时传入，携带变量完整信息。
 *
 * 从 DataTag 实体映射而来，是纯数据对象。
 */
export interface ITagContext {
  /** 标签 ID */
  id: string;
  /** 标签名称 */
  name: string;
  /** 协议地址 (如 Modbus 寄存器地址) */
  address: string;
  /** 数据类型 */
  dataType: string;
  /** 缩放系数 */
  scale?: number;
  /** 偏移量 */
  offset?: number;
  /** 采集周期 (ms) */
  scanRate?: number;
  /** 单位 */
  unit?: string;
  /** 描述 */
  description?: string;
  /** 设备 ID */
  deviceId?: string;
  /** 设备名称 (用于日志) */
  deviceName?: string;
  /** 项目 ID */
  projectId?: string;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 读写方向 */
  direction?: 'read' | 'write' | 'read-write';
  /** 额外协议特有配置 (如 S7 的 dbNumber/byteOffset/bitOffset) */
  [key: string]: any;
}

/**
 * 协议适配器接口 — 所有采集插件必须实现此接口。
 *
 * 定义了连接管理、标签读写、通道校验、生命周期钩子等标准方法。
 */
export interface IProtocolAdapter {
  connect(device: IDeviceContext): Promise<any>;
  disconnect(client: any): Promise<void>;
  readTag(client: any, tag: ITagContext): Promise<{ tagId: string; value: any; timestamp: Date }>;
  writeTag(client: any, tag: ITagContext, value: any): Promise<void>;

  /** 校验通道配置 — 协议特有语义校验（IP格式、端口范围、连通性等） */
  validateChannelConfig(config: Record<string, any>): Promise<ChannelValidationResult>;

  /**
   * 插件激活时调用（可选）
   * 用于插件自身的初始化：启动连接池、加载驱动、注册内部状态等。
   * 与设备是否加载无关 — 即使没有设备也会调用。
   */
  onActivate?(): Promise<void> | void;

  /**
   * 插件停用时调用（可选）
   * 用于清理资源：关闭连接池、释放驱动、注销状态等。
   */
  onDeactivate?(): Promise<void> | void;
}
