// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI 对话持久化 Service — P2-T08
 *
 * 提供：
 *   1. 会话 CRUD（创建/列表/详情/归档/删除）
 *   2. 消息 CRUD（追加/批量保存/查询）
 *   3. 上下文窗口管理（FIFO/Sliding/Summary 三种截断策略）
 *   4. 会话历史恢复（ChatMessage[] 格式，供 LLM 直接消费）
 *
 * 数据按项目隔离，按用户过滤。
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation, AiMessage } from './entities/ai-conversation.entity';
import { ChatMessage } from './llm.types';

/** 上下文窗口截断策略 */
export type TruncationStrategy = 'fifo' | 'sliding' | 'summary';

/** 上下文窗口配置 */
export interface ContextWindowConfig {
  /** 截断策略 */
  strategy: TruncationStrategy;
  /** 最大消息数 */
  maxMessages: number;
  /** 最大 Token 数（约，按 1 token ≈ 4 字符估算） */
  maxTokens: number;
  /** 摘要比例（summary 模式，保留开头消息的比例 0-1） */
  summaryRatio: number;
}

const DEFAULT_WINDOW_CONFIG: ContextWindowConfig = {
  strategy: 'sliding',
  maxMessages: 50,
  maxTokens: 8000,
  summaryRatio: 0.3,
};

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(AiConversation)
    private readonly convRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly msgRepo: Repository<AiMessage>,
  ) {}

  // ============================================================
  //  会话 CRUD
  // ============================================================

  /** 创建新会话 */
  async createConversation(data: {
    title?: string;
    projectId: string;
    userId: string;
    taskType?: string;
    model?: string;
  }): Promise<AiConversation> {
    const conv = this.convRepo.create({
      title: data.title || '新对话',
      projectId: data.projectId,
      userId: data.userId,
      taskType: data.taskType || 'chat',
      model: data.model,
    });
    return this.convRepo.save(conv);
  }

  /** 获取用户的会话列表（projectId 可选，缺省时返回该用户所有项目的会话） */
  async listConversations(userId: string, projectId?: string): Promise<AiConversation[]> {
    return this.convRepo.find({
      where: projectId
        ? { userId, projectId, archived: 0 }
        : { userId, archived: 0 },
      order: { updatedAt: 'DESC' },
    });
  }

  /** 获取会话详情 */
  async getConversation(id: string): Promise<AiConversation | null> {
    return this.convRepo.findOne({ where: { id } });
  }

  /** 更新会话标题 */
  async updateTitle(id: string, title: string): Promise<void> {
    await this.convRepo.update(id, { title });
  }

  /** 归档/取消归档会话 */
  async archiveConversation(id: string, archived: boolean): Promise<void> {
    await this.convRepo.update(id, { archived: archived ? 1 : 0 });
  }

  /** 删除会话及其消息 */
  async deleteConversation(id: string): Promise<void> {
    await this.msgRepo.delete({ conversationId: id });
    await this.convRepo.delete(id);
  }

  // ============================================================
  //  消息 CRUD
  // ============================================================

  /** 追加一条消息到会话 */
  async appendMessage(
    conversationId: string,
    msg: {
      role: string;
      content?: string;
      toolCalls?: string;
      toolCallId?: string;
      toolName?: string;
      tokens?: number;
    },
  ): Promise<AiMessage> {
    // 获取当前最大 seq
    const maxSeq = (await this.msgRepo.maximum('seq', { conversationId })) || 0;
    const message = this.msgRepo.create({
      conversationId,
      role: msg.role,
      content: msg.content || null,
      toolCalls: msg.toolCalls || null,
      toolCallId: msg.toolCallId || null,
      toolName: msg.toolName || null,
      tokens: msg.tokens || 0,
      seq: (maxSeq as number) + 1,
    });
    const saved = await this.msgRepo.save(message);

    // 更新会话统计
    await this.convRepo.increment({ id: conversationId }, 'messageCount', 1);
    if (msg.tokens) {
      await this.convRepo.increment({ id: conversationId }, 'totalTokens', msg.tokens);
    }

    return saved;
  }

  /** 批量保存消息（用于首次保存或恢复） */
  async saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    let seq = 0;
    const entities = messages.map((m) => {
      seq++;
      return this.msgRepo.create({
        conversationId,
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        toolCalls: m.toolCalls ? JSON.stringify(m.toolCalls) : null,
        toolCallId: null,
        tokens: 0,
        seq,
      });
    });
    await this.msgRepo.save(entities);
    await this.convRepo.update(conversationId, { messageCount: seq });
  }

  /** 获取会话的所有消息 */
  async getMessages(conversationId: string): Promise<AiMessage[]> {
    return this.msgRepo.find({
      where: { conversationId },
      order: { seq: 'ASC' },
    });
  }

  /** 获取会话的最近 N 条消息 */
  async getRecentMessages(conversationId: string, limit: number): Promise<AiMessage[]> {
    return this.msgRepo
      .find({
        where: { conversationId },
        order: { seq: 'DESC' },
        take: limit,
      })
      .then((msgs) => msgs.reverse());
  }

  // ============================================================
  //  上下文窗口管理
  // ============================================================

  /**
   * 获取会话历史（ChatMessage[] 格式），应用上下文窗口截断
   *
   * @param conversationId 会话 ID
   * @param config 窗口配置（可选，默认 sliding/50 条/8000 tokens）
   * @returns ChatMessage[]（可直接传入 LLM API）
   */
  async getConversationHistory(
    conversationId: string,
    config?: Partial<ContextWindowConfig>,
  ): Promise<ChatMessage[]> {
    const cfg = { ...DEFAULT_WINDOW_CONFIG, ...config };
    const allMessages = await this.getMessages(conversationId);

    if (allMessages.length <= cfg.maxMessages) {
      return this.toChatMessages(allMessages);
    }

    switch (cfg.strategy) {
      case 'sliding':
        return this.slidingWindow(allMessages, cfg);
      case 'summary':
        return this.summaryWindow(allMessages, cfg);
      case 'fifo':
      default:
        return this.fifoWindow(allMessages, cfg);
    }
  }

  /** FIFO 策略：保留最近的消息 */
  private fifoWindow(messages: AiMessage[], config: ContextWindowConfig): ChatMessage[] {
    return this.toChatMessages(messages.slice(-config.maxMessages));
  }

  /** Sliding 策略：保留开头 N/5 条 + 最近 4N/5 条 */
  private slidingWindow(messages: AiMessage[], config: ContextWindowConfig): ChatMessage[] {
    const keepHead = Math.ceil(config.maxMessages / 5);
    const keepTail = config.maxMessages - keepHead;
    const head = messages.slice(0, keepHead);
    const tail = messages.slice(-keepTail);
    return this.toChatMessages([...head, ...tail]);
  }

  /** Summary 策略：保留比例的开头 + 最近（需有摘要能力，当前简化） */
  private summaryWindow(messages: AiMessage[], config: ContextWindowConfig): ChatMessage[] {
    const headCount = Math.ceil(config.maxMessages * config.summaryRatio);
    const tailCount = config.maxMessages - headCount;
    const head = messages.slice(0, headCount);
    const tail = messages.slice(-tailCount);
    return this.toChatMessages([...head, ...tail]);
  }

  /** AiMessage[] → ChatMessage[] */
  private toChatMessages(messages: AiMessage[]): ChatMessage[] {
    return messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content || '',
      ...(m.toolCalls ? { toolCalls: JSON.parse(m.toolCalls) } : {}),
      ...(m.toolCallId ? { toolCallId: m.toolCallId } : {}),
    }));
  }

  /**
   * 根据 Token 预算截断（简化版：按字符数估算）
   */
  truncateByTokens(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    let tokenCount = 0;
    const result: ChatMessage[] = [];
    // 从后往前保留（保留最近的）
    for (let i = messages.length - 1; i >= 0; i--) {
      const contentStr =
        typeof messages[i].content === 'string'
          ? messages[i].content
          : JSON.stringify(messages[i].content);
      const estimatedTokens = Math.ceil(contentStr.length / 4);
      if (tokenCount + estimatedTokens > maxTokens && result.length > 0) {
        break;
      }
      tokenCount += estimatedTokens;
      result.unshift(messages[i]);
    }
    return result;
  }

  /** 根据对话内容自动生成标题 */
  async autoGenerateTitle(conversationId: string, firstUserMessage: string): Promise<void> {
    // 使用用户首条消息的前 30 个字符作为标题
    const title =
      firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + '...' : firstUserMessage;
    await this.convRepo.update(conversationId, { title });
  }
}
