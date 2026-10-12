// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * useStreamChat — P1-T04 AI 助手流式聊天 Composable
 *
 * 职责：
 *   1. 管理聊天消息列表（user/assistant 交替）
 *   2. 调用 aiClient.streamChat() 进行流式对话
 *   3. 实时更新最后一条 assistant 消息内容
 *   4. 提供加载/错误状态、中止能力
 *   5. 支持任务类型路由（codegen/chat/intent/analysis）
 *
 * 用法：
 *   const { messages, sendMessage, isStreaming, abort, error } = useStreamChat();
 *   await sendMessage('帮我创建一个按钮图元', 'codegen');
 */

import { ref, readonly, computed, type Ref } from 'vue';
import {
  aiClient,
  i18n,
  type ChatMessage,
  type TaskType,
  type ChatStreamChunk,
  type AiStatusState,
  type ConversationSummary,
  type ConversationMessage,
} from '@scada-editor/core';

const { t } = i18n.global;

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 是否正在流式接收 */
  streaming?: boolean;
  /** 关联的任务类型（用于渲染特定操作按钮） */
  taskType?: TaskType;
  /** 元数据 */
  provider?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  /** 创建时间戳 */
  createdAt: number;
}

let msgIdCounter = 0;
function genId(): string {
  msgIdCounter += 1;
  return `msg-${Date.now()}-${msgIdCounter}`;
}

export function useStreamChat() {
  const messages = ref<ChatMessageItem[]>([]) as Ref<ChatMessageItem[]>;
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  /** AI 状态三态（D-015）：null=未检测；区分 disabled/unauthorized/unreachable */
  const aiStatus = ref<AiStatusState | null>(null);
  /** 兼容布尔视图：null=未检测，true=可用，false=不可用（含故障态） */
  const aiEnabled = computed<boolean | null>(() => {
    if (aiStatus.value === null) return null;
    return aiStatus.value === 'enabled';
  });

  // ============================================================
  // 会话管理状态（P2-T08 对话持久化）
  // ============================================================
  /** 当前会话 ID（null=未关联会话，下一次发送将创建新会话） */
  const currentConversationId = ref<string | null>(null);
  /** 当前项目 ID（用于创建新会话时传入） */
  const currentProjectId = ref<string | null>(null);
  /** 会话列表（侧边栏展示） */
  const conversations = ref<ConversationSummary[]>([]) as Ref<ConversationSummary[]>;
  /** 会话列表加载中 */
  const conversationsLoading = ref(false);

  let abortController: AbortController | null = null;

  /** 状态对应的 i18n 提示键 */
  const STATUS_HINT_KEYS: Record<Exclude<AiStatusState, 'enabled'>, string> = {
    disabled: 'editor.aiAssistant.disabledHint',
    unauthorized: 'editor.aiAssistant.unauthorizedHint',
    unreachable: 'editor.aiAssistant.unreachableHint',
  };

  /** 检查 AI 功能状态（getAiStatus 不抛异常，错误映射为状态） */
  async function checkStatus(): Promise<AiStatusState> {
    const status = await aiClient.getStatus();
    aiStatus.value = status.state;
    return status.state;
  }

  /**
   * 发送消息并接收流式回复
   *
   * 持久化策略（P2-T08）：
   *   - 当 currentConversationId 存在时，仅向服务器发送当前消息 + conversationId，
   *     由服务器从数据库恢复完整历史（避免前端累积发送大量上下文）
   *   - 当 currentConversationId 为 null 时，发送本地全部历史并允许服务器创建新会话
   *   - 服务器在 done=true 的最终 chunk 中回传 conversationId，前端据此更新状态
   *
   * @param text 用户输入文本
   * @param taskType 任务类型（决定后端路由）
   * @param systemPrompt 可选的系统提示词
   * @param model 可选的模型名称（用户从下拉选择，覆盖路由默认模型）
   * @param providerId 可选的供应商 ID（用户选定具体模型时一并传入，覆盖任务类型路由，
   *   确保请求发往该模型所属供应商，而非路由默认供应商）
   */
  async function sendMessage(
    text: string,
    taskType: TaskType = 'chat',
    systemPrompt?: string,
    model?: string,
    providerId?: string,
  ): Promise<void> {
    if (isStreaming.value) return;
    if (!text.trim()) return;

    error.value = null;

    // 检查 AI 状态（区分未启用/认证失败/服务不可达）
    if (aiStatus.value === null) {
      await checkStatus();
    }
    if (aiStatus.value !== 'enabled') {
      const state = aiStatus.value ?? 'unreachable';
      error.value = t(STATUS_HINT_KEYS[state as Exclude<AiStatusState, 'enabled'>]);
      return;
    }

    // 构造消息列表：
    // - 已有会话：仅发送当前用户消息，服务器从 DB 恢复历史
    // - 无会话：发送本地历史（含 system prompt），让服务器创建新会话
    const hasExistingConversation = !!currentConversationId.value;
    const history: ChatMessage[] = hasExistingConversation
      ? [{ role: 'user', content: text }]
      : messages.value.map((m) => ({
          role: m.role,
          content: m.content,
        }));
    if (!hasExistingConversation && systemPrompt) {
      history.unshift({ role: 'system', content: systemPrompt });
    }
    if (!hasExistingConversation) {
      history.push({ role: 'user', content: text });
    }

    // 添加用户消息到 UI
    messages.value.push({
      id: genId(),
      role: 'user',
      content: text,
      taskType,
      createdAt: Date.now(),
    });

    // 添加空的 assistant 消息（占位）
    const assistantMsg: ChatMessageItem = {
      id: genId(),
      role: 'assistant',
      content: '',
      streaming: true,
      taskType,
      createdAt: Date.now(),
    };
    messages.value.push(assistantMsg);

    isStreaming.value = true;
    abortController = new AbortController();

    try {
      const stream = aiClient.streamChat(
        {
          messages: history,
          taskType,
          model,
          providerId,
          conversationId: currentConversationId.value || undefined,
          projectId: currentProjectId.value || undefined,
        },
        abortController.signal,
      );

      for await (const chunk of stream as AsyncGenerator<ChatStreamChunk>) {
        if (chunk.delta) {
          assistantMsg.content += chunk.delta;
        }
        if (chunk.done) {
          assistantMsg.streaming = false;
          if (chunk.finishReason) {
            assistantMsg.finishReason = chunk.finishReason;
          }
          if (chunk.usage) {
            assistantMsg.usage = chunk.usage;
          }
          // 服务器在 done chunk 回传 conversationId，更新本地状态
          if (chunk.conversationId) {
            currentConversationId.value = chunk.conversationId;
          }
        }
      }

      // 确保结束
      assistantMsg.streaming = false;
    } catch (err) {
      assistantMsg.streaming = false;
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户主动中止，不算错误
        if (assistantMsg.content === '') {
          // 如果中止时没有任何内容，移除占位消息
          messages.value = messages.value.filter((m) => m.id !== assistantMsg.id);
        }
      } else {
        error.value = err instanceof Error ? err.message : String(err);
        // 如果没有任何内容，移除占位消息
        if (assistantMsg.content === '') {
          messages.value = messages.value.filter((m) => m.id !== assistantMsg.id);
        }
      }
    } finally {
      isStreaming.value = false;
      abortController = null;
    }
  }

  /** 中止当前流式请求 */
  function abort(): void {
    if (abortController) {
      abortController.abort();
    }
  }

  /** 清空消息列表（前端 UI 清空，不影响后端会话记录） */
  function clear(): void {
    messages.value = [];
    error.value = null;
    // 重置会话关联：下一次发送将创建新会话
    currentConversationId.value = null;
  }

  // ============================================================
  // 会话管理方法（P2-T08 对话持久化）
  // ============================================================

  /**
   * 设置当前项目 ID（在切换项目时调用，用于创建新会话时传入）
   * 注意：切换项目不会自动清除当前会话，需显式调用 clearConversation
   */
  function setCurrentProject(projectId: string | null): void {
    currentProjectId.value = projectId;
  }

  /**
   * 刷新会话列表（侧边栏展示用）
   * 按 projectId 过滤；若未设置 projectId，则查询当前用户所有会话
   */
  async function refreshConversations(): Promise<void> {
    conversationsLoading.value = true;
    try {
      conversations.value = await aiClient.listConversations(
        currentProjectId.value || undefined,
      );
    } catch (err) {
      // 列表加载失败不应阻塞对话主流程，仅记录到 error
      error.value = err instanceof Error ? err.message : String(err);
      conversations.value = [];
    } finally {
      conversationsLoading.value = false;
    }
  }

  /**
   * 加载指定会话到当前消息列表
   * 从数据库恢复完整消息历史，并设置为当前会话
   * @param conversationId 会话 ID
   */
  async function loadConversation(conversationId: string): Promise<void> {
    if (isStreaming.value) {
      error.value = t('editor.aiAssistant.cannotLoadWhileStreaming');
      return;
    }
    error.value = null;
    try {
      const history = await aiClient.getConversationMessages(conversationId);
      // 转换后端消息为前端 ChatMessageItem
      messages.value = history
        .filter((m: ConversationMessage) => m.role === 'user' || m.role === 'assistant')
        .map((m: ConversationMessage) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content || '',
          taskType: undefined,
          createdAt: new Date(m.createdAt).getTime(),
          ...(m.tokens > 0
            ? {
                usage: {
                  promptTokens: 0,
                  completionTokens: 0,
                  totalTokens: m.tokens,
                },
              }
            : {}),
        }));
      currentConversationId.value = conversationId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  /**
   * 显式设置当前会话 ID（供 Agent 模式等外部路径同步会话状态使用）。
   * currentConversationId 对外为 readonly，必须通过本函数更新。
   */
  function setCurrentConversationId(conversationId: string | null): void {
    currentConversationId.value = conversationId;
  }

  /**
   * 开始新会话：清空当前消息列表并重置会话关联
   * 不删除数据库中的旧会话记录
   */
  function clearConversation(): void {
    if (isStreaming.value) {
      error.value = t('editor.aiAssistant.cannotClearWhileStreaming');
      return;
    }
    messages.value = [];
    error.value = null;
    currentConversationId.value = null;
  }

  /**
   * 删除指定会话（从数据库永久删除）
   * 如果删除的是当前会话，则同时清空 UI
   * @param conversationId 会话 ID
   */
  async function deleteConversationById(conversationId: string): Promise<void> {
    try {
      await aiClient.deleteConversation(conversationId);
      // 从本地列表中移除
      conversations.value = conversations.value.filter((c) => c.id !== conversationId);
      // 若删除的是当前会话，清空 UI
      if (currentConversationId.value === conversationId) {
        clearConversation();
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * 归档/取消归档会话
   * @param conversationId 会话 ID
   * @param archived 是否归档
   */
  async function archiveConversationById(
    conversationId: string,
    archived: boolean,
  ): Promise<void> {
    try {
      await aiClient.archiveConversation(conversationId, archived);
      // 更新本地列表中的归档状态
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId ? { ...c, archived: archived ? 1 : 0 } : c,
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * 重命名会话标题
   * @param conversationId 会话 ID
   * @param title 新标题
   */
  async function renameConversation(conversationId: string, title: string): Promise<void> {
    try {
      await aiClient.updateConversationTitle(conversationId, title);
      conversations.value = conversations.value.map((c) =>
        c.id === conversationId ? { ...c, title } : c,
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * 添加一条用户消息到列表（外部调用，如 Agent 模式）
   */
  function addUserMessage(content: string, taskType?: TaskType): ChatMessageItem {
    const msg: ChatMessageItem = {
      id: genId(),
      role: 'user',
      content,
      taskType,
      createdAt: Date.now(),
    };
    messages.value.push(msg);
    return msg;
  }

  /**
   * 添加一条 assistant 消息到列表（外部调用，如 Agent 模式）
   */
  function addAssistantMessage(content: string, taskType?: TaskType): ChatMessageItem {
    const msg: ChatMessageItem = {
      id: genId(),
      role: 'assistant',
      content,
      taskType,
      createdAt: Date.now(),
    };
    messages.value.push(msg);
    return msg;
  }

  return {
    messages: readonly(messages) as Readonly<Ref<ChatMessageItem[]>>,
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    aiStatus: readonly(aiStatus),
    aiEnabled,
    sendMessage,
    addUserMessage,
    addAssistantMessage,
    abort,
    clear,
    checkStatus,
    // P2-T08 会话管理
    currentConversationId: readonly(currentConversationId),
    currentProjectId: readonly(currentProjectId),
    conversations: readonly(conversations) as Readonly<Ref<ConversationSummary[]>>,
    conversationsLoading: readonly(conversationsLoading),
    setCurrentProject,
    setCurrentConversationId,
    refreshConversations,
    loadConversation,
    clearConversation,
    deleteConversationById,
    archiveConversationById,
    renameConversation,
  };
}
