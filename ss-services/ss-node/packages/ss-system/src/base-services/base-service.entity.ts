// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 基础服务实体 — 管理第三方软件配置
 * 存储在全局数据库 ss-data.db 中
 */
@Entity('sys_base_services')
export class BaseServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 软件唯一标识名称（用于 API 路径参数，如 redis / influxdb / nginx） */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 显示名称 */
  @Column({ type: 'varchar', length: 128 })
  displayName: string;

  /** 描述信息 */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** 可执行文件路径（运行路径） */
  @Column({ name: 'binary_path', type: 'text', nullable: true })
  binaryPath: string;

  /** 启动参数（空格分隔，如 --port 6379） */
  @Column({ name: 'start_args', type: 'text', nullable: true })
  startArgs: string;

  /** 配置文件路径 */
  @Column({ name: 'config_path', type: 'text', nullable: true })
  configPath: string;

  /** 日志目录路径 */
  @Column({ name: 'log_dir', type: 'text', nullable: true })
  logDir: string;

  /** 数据目录路径 */
  @Column({ name: 'data_dir', type: 'text', nullable: true })
  dataDir: string;

  /** 进程名称（用于状态监控，如 redis-server.exe） */
  @Column({ name: 'process_name', type: 'varchar', length: 128, nullable: true })
  processName: string;

  /** 占用端口（0 表示不检测端口） */
  @Column({ name: 'port', type: 'integer', nullable: true, default: 0 })
  port: number;

  /** 启动脚本（为空时使用 binaryPath + startArgs 启动） */
  @Column({ name: 'start_script', type: 'text', nullable: true })
  startScript: string;

  /** 停止脚本（为空时默认使用 taskkill /F /IM <processName>） */
  @Column({ name: 'stop_script', type: 'text', nullable: true })
  stopScript: string;

  /** 是否启用 */
  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  /** 是否自动启动（后端启动时自动拉起） */
  @Column({ name: 'auto_start', type: 'boolean', default: false })
  autoStart: boolean;

  /** 是否启用进程守护（定时检测，进程不存在时自动拉起） */
  @Column({ name: 'process_guard', type: 'boolean', default: false })
  processGuard: boolean;

  /** 排序权重 */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
