// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface DataPoint {
  tagId: string;
  deviceId: string;
  projectId: string;
  value: number | string | boolean;
  timestamp: Date;
  quality: number; // 0-100
  metadata?: Record<string, any>;
}

export interface QueryOptions {
  tagIds?: string[];
  deviceIds?: string[];
  /** 多项目隔离路由：指定后按项目隔离单元（bucket / database）查询，未指定时走默认隔离单元 */
  projectId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  aggregation?: {
    function: 'avg' | 'max' | 'min' | 'sum' | 'count';
    interval?: string; // '1m', '5m', '1h', '1d'
  };
  /** 插值方式：与上层 InterpolationType 对齐（raw=空窗跳过 / linear=线性 / step=前值保持） */
  interpolation?: 'raw' | 'linear' | 'step';
}

export interface WriteResult {
  success: boolean;
  written: number;
  failed: number;
  errors?: Error[];
}

/**
 * 适配器能力声明：上层（data-query.service / 报表 / 趋势 API）在调用前据此降级，
 * 避免运行期才发现不支持（如 InfluxDB 3 Core 无 compactor 不支持 delete）。
 */
export interface AdapterCapabilities {
  /** 是否支持 delete()；InfluxDB 3 Core = false（无 compactor） */
  delete: boolean;
  /** 是否原生支持插值；false 时上层回退到应用层插值或 raw */
  interpolation: boolean;
  /** 是否支持服务端聚合；false 时上层取原始点后本地聚合 */
  aggregation: boolean;
}

export interface StorageAdapter {
  readonly name: string;
  /** 引擎类型标识（'influxdb2' / 'influxdb3' / 'tdengine' / ...），用于配置与观测 */
  readonly engineType: string;
  /** 能力声明，上层按能力降级（删除/插值/聚合） */
  readonly capabilities: AdapterCapabilities;
  write(points: DataPoint[]): Promise<WriteResult>;
  read(options: QueryOptions): Promise<DataPoint[]>;
  delete(options: { tagIds?: string[]; before?: Date }): Promise<number>;
  health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }>;
  close(): Promise<void>;
}

/**
 * 能力未支持错误：适配器对 capabilities 中声明为 false 的能力，
 * 在对应方法内直接抛出本错误，上层应在调用前检查 capabilities 提前降级。
 */
export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotSupportedError';
  }
}
