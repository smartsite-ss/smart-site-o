// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ExecutorHealth } from '../../events/plugin-events.types';
import { IDeviceContext, ITagContext } from '../../types';

/**
 * 连接分片引用 —— 隔离体内部维护连接的引用句柄
 * 主进程不持有实际的 client 对象，只持有此引用
 */
export interface ShardRef {
  /** 隔离体内部维护的连接 ID */
  connectionId: string;
  /** 所属协议 */
  protocol: string;
}

/** 隔离执行器工厂配置 */
export interface RequiredIsolationConfig {
  maxParallel: number;
  requestTimeoutMs: number;
  autoRestart: boolean;
  startupTimeoutMs: number;
  idleTimeoutMs: number;
  maxRestarts: number;
  entryScript?: string;
}

export const DEFAULT_ISOLATION_CONFIG: RequiredIsolationConfig = {
  maxParallel: 50,
  requestTimeoutMs: 10000,
  autoRestart: true,
  startupTimeoutMs: 30000,
  idleTimeoutMs: 300000,
  maxRestarts: 5,
};

/** 隔离执行器接口 */
export interface IIsolationExecutor {
  /** 执行器名称 */
  readonly name: string;

  /** 初始化（启动 Worker/子进程等） */
  init(
    protocol: string,
    adapterClass: any,
    config: Partial<RequiredIsolationConfig>,
  ): Promise<void>;

  /** 连接设备，返回连接的引用 ID */
  connect(device: IDeviceContext): Promise<ShardRef>;

  /** 读取标签 */
  readTag(shard: ShardRef, tag: ITagContext): Promise<any>;

  /** 写入标签 */
  writeTag(shard: ShardRef, tag: ITagContext, value: any): Promise<void>;

  /** 断开连接 */
  disconnect(shard: ShardRef): Promise<void>;

  /** 获取健康状态 */
  getHealth(): Promise<ExecutorHealth>;

  /** 销毁（停止 Worker/子进程等） */
  destroy(): Promise<void>;
}
