// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 对话与会话消息实体 — P2-T08 对话持久化
 *
 * sys_ai_conversations：会话列表（按项目+用户隔离）
 * sys_ai_messages：    会话内消息（含 role/content/tool_calls）
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_ai_conversations')
export class AiConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 会话标题（自动生成或用户自定义） */
  @Column({ type: 'varchar', length: 200, default: '新对话' })
  title: string;

  /** 关联项目 ID（按项目隔离） */
  @Column({ name: 'project_id', type: 'varchar', length: 64 })
  projectId: string;

  /** 创建用户 ID */
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  /** 任务类型（chat/codegen/scene_create/analysis） */
  @Column({ name: 'task_type', type: 'varchar', length: 32, default: 'chat' })
  taskType: string;

  /** 使用的模型（如 deepseek-chat） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  model: string;

  /** 统计：消息数 */
  @Column({ name: 'message_count', type: 'integer', default: 0 })
  messageCount: number;

  /** 统计：总 Token 消耗 */
  @Column({ name: 'total_tokens', type: 'integer', default: 0 })
  totalTokens: number;

  /** 是否归档 */
  @Column({ type: 'integer', default: 0 })
  archived: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('sys_ai_messages')
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联会话 ID */
  @Column({ name: 'conversation_id', type: 'varchar', length: 36 })
  conversationId: string;

  /** 消息角色（system/user/assistant/tool） */
  @Column({ type: 'varchar', length: 16 })
  role: string;

  /** 消息内容 */
  @Column({ type: 'text', nullable: true })
  content: string;

  /** 工具调用记录（JSON 字符串） */
  @Column({ name: 'tool_calls', type: 'text', nullable: true })
  toolCalls: string;

  /** 工具调用 ID（tool 角色时） */
  @Column({ name: 'tool_call_id', type: 'varchar', length: 64, nullable: true })
  toolCallId: string;

  /** 工具名（tool 角色时） */
  @Column({ name: 'tool_name', type: 'varchar', length: 64, nullable: true })
  toolName: string;

  /** Token 消耗 */
  @Column({ type: 'integer', default: 0 })
  tokens: number;

  /** 消息序号（会话内排序） */
  @Column({ name: 'seq', type: 'integer', default: 0 })
  seq: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
