// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Prompt 版本管理实体 — P2-T08 Prompt 版本管理
 *
 * sys_ai_prompts：       Prompt 模板定义（按任务类型）
 * sys_ai_prompt_versions：Prompt 版本历史（draft→active→archived）
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Prompt 版本状态 */
export type PromptVersionStatus = 'draft' | 'active' | 'archived';

@Entity('sys_ai_prompts')
export class AiPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Prompt 标识键（如 scene_creation、plugin_gen、script_gen） */
  @Column({ type: 'varchar', length: 64, unique: true })
  key: string;

  /** 显示名称 */
  @Column({ type: 'varchar', length: 128 })
  name: string;

  /** 任务类型 */
  @Column({ name: 'task_type', type: 'varchar', length: 32, default: 'chat' })
  taskType: string;

  /** 描述 */
  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string;

  /** 当前活跃版本 ID */
  @Column({ name: 'active_version_id', type: 'varchar', length: 36, nullable: true })
  activeVersionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('sys_ai_prompt_versions')
export class AiPromptVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联 Prompt ID */
  @Column({ name: 'prompt_id', type: 'varchar', length: 36 })
  promptId: string;

  /** 版本号（如 v1.0, v1.1） */
  @Column({ type: 'varchar', length: 16 })
  version: string;

  /** 版本状态（draft/active/archived） */
  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: PromptVersionStatus;

  /** System Prompt 模板内容（支持 {{variable}} 模板语法） */
  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  /** 模板变量列表（JSON 数组字符串） */
  @Column({ type: 'text', nullable: true })
  variables: string;

  /** LLM 配置建议（JSON：model/temperature/maxTokens） */
  @Column({ type: 'text', nullable: true })
  llmConfig: string;

  /** 变更说明 */
  @Column({ type: 'varchar', length: 512, nullable: true })
  changelog: string;

  /** 评估指标（JSON：测试通过数、准确率、平均延迟等） */
  @Column({ type: 'text', nullable: true })
  metrics: string;

  /** 创建用户 ID */
  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
