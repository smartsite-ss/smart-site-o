// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Provider 配置实体 — 全局数据库表 sys_ai_providers
 *
 * 存储各 LLM 供应商的配置（API Key、模型、开关等），
 * 供 LLMProxyService 在运行时读取并初始化 Provider。
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 供应商类型 */
export type AiProviderType = 'deepseek' | 'zhipu' | 'openai' | 'custom';

@Entity('sys_ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 供应商类型标识 */
  @Column({ name: 'provider_id', type: 'varchar', length: 32 })
  providerId: string;

  /** 显示名称 */
  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** API Key（加密存储，ENC: 前缀） */
  @Column({ name: 'api_key', type: 'text' })
  apiKey: string;

  /** API 基础地址 */
  @Column({ name: 'api_base', type: 'varchar', length: 256 })
  apiBase: string;

  /** 默认模型 */
  @Column({ name: 'default_model', type: 'varchar', length: 64 })
  defaultModel: string;

  /** 可用模型列表（JSON 数组字符串） */
  @Column({ type: 'text', default: '[]' })
  models: string;

  /** 是否启用 */
  @Column({ type: 'integer', default: 1 })
  enabled: number;

  /** 排序序号 */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /** 扩展配置（JSON 字符串：timeout、maxRetries、codegenModel 等） */
  @Column({ type: 'text', default: '{}' })
  config: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
