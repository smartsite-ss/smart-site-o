// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 用量与成本日志实体 — P2-T08 成本监控与预算熔断
 *
 * sys_ai_usage_logs：每次 LLM 调用的 Token 与费用记录
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('sys_ai_usage_logs')
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 供应商 ID（deepseek/zhipu/openai 等） */
  @Column({ name: 'provider_id', type: 'varchar', length: 32 })
  @Index()
  providerId: string;

  /** 模型名 */
  @Column({ type: 'varchar', length: 64 })
  @Index()
  model: string;

  /** 任务类型（chat/codegen/scene_create/analysis） */
  @Column({ name: 'task_type', type: 'varchar', length: 32, default: 'chat' })
  @Index()
  taskType: string;

  /** 用户 ID */
  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  @Index()
  userId: string;

  /** 项目 ID */
  @Column({ name: 'project_id', type: 'varchar', length: 64, nullable: true })
  projectId: string;

  /** 会话 ID */
  @Column({ name: 'conversation_id', type: 'varchar', length: 36, nullable: true })
  conversationId: string;

  /** 请求 Token 数 */
  @Column({ name: 'prompt_tokens', type: 'integer', default: 0 })
  promptTokens: number;

  /** 响应 Token 数 */
  @Column({ name: 'completion_tokens', type: 'integer', default: 0 })
  completionTokens: number;

  /** 总 Token 数 */
  @Column({ name: 'total_tokens', type: 'integer', default: 0 })
  totalTokens: number;

  /** 预估费用（美元） */
  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 8, default: 0 })
  estimatedCost: number;

  /** 是否成功 */
  @Column({ type: 'integer', default: 1 })
  success: number;

  /** 错误信息 */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  /** 响应延迟（毫秒） */
  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
