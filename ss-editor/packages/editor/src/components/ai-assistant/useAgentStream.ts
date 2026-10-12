// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * useAgentStream — P1-T04 Agent SSE 流 + 前端工具执行 Composable
 *
 * 负责后端 ReAct 编排的 SSE 流消费，并自动处理前端工具委托：
 *   1. POST /api/v1/ai/agent/execute → 开始 SSE 流
 *   2. 解析 AgentStep chunks（thought / action / observation / pending / answer / error）
 *   3. 遇到 delegateToFrontend 的 action：调用 ToolExecutor 执行真实工具
 *   4. 遇到 pending：POST 工具结果回 /api/v1/ai/agent/execute（sessionId + toolResultPayload）
 *   5. 循环直至 answer 或 error
 *
 * 用法:
 *   const { execute, abort } = useAgentStream({
 *     onThought: (step) => { ... },
 *     onAnswer: (step) => { ... },
 *     onError: (step) => { ... },
 *   });
 *   await execute('帮我创建泵站页面');
 */

import { ref, readonly } from 'vue';
import {
  type ChatMessage,
} from '@scada-editor/core';
import { toolExecutor } from '@scada-editor/core';

const TOKEN_KEY = 'scada_access_token';
const API_BASE = '/api/v1/ai';

/**
 * S-C03: Token 通过 HttpOnly Cookie 传输，getToken() 仅用于兼容回退。
 * 认证依赖 fetch 的 credentials: 'include'（见 execute() 中的 fetch 调用）。
 */
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Agent 执行步骤（对应后端 AgentStep）
export interface AgentStreamStep {
  type: 'thought' | 'action' | 'observation' | 'answer' | 'error' | 'pending';
  content: string;
  step: number;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  toolResult?: string;
  delegateToFrontend?: boolean;
  sessionId?: string;
  timestamp: number;
  /** 对话持久化会话 ID（answer/error 步骤由后端注入） */
  conversationId?: string;
}

export interface AgentStreamCallbacks {
  onThought?: (step: AgentStreamStep) => void;
  onAction?: (step: AgentStreamStep) => void;
  onObservation?: (step: AgentStreamStep) => void;
  onPending?: (step: AgentStreamStep) => void;
  onAnswer?: (step: AgentStreamStep) => void;
  onError?: (step: AgentStreamStep) => void;
}

export interface AgentStreamOptions extends AgentStreamCallbacks {
  /** 最大工具执行轮次（默认 30） */
  maxRoundtrips?: number;
}

/** Agent 执行请求体 */
interface AgentExecuteBody {
  userInput: string;
  context?: string;
  intent?: string;
  complexity?: 'simple' | 'complex';
  history?: ChatMessage[];
  sessionId?: string;
  toolResultPayload?: { toolName: string; result: string };
  /** 对话持久化会话 ID（缺省时后端自动创建） */
  conversationId?: string;
  /** 项目 ID（创建新会话时使用） */
  projectId?: string;
}

export function useAgentStream(callbacks: AgentStreamCallbacks = {}) {
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const currentStep = ref(0);

  let abortController: AbortController | null = null;

  /**
   * 执行 Agent 编排（含自动工具回传循环）
   *
   * 持久化策略（P2-T08）：
   *   - 首次执行时传入 conversationId（若有）+ projectId，后端据此创建/复用会话
   *   - 后端在 answer/error 步骤注入 conversationId，前端据此更新 currentConversationId
   *   - 续执行（工具回传）时同样携带 conversationId，确保后端不重复创建会话
   *
   * @param userInput 用户输入
   * @param intent 意图类型
   * @param context 编辑器上下文
   * @param conversationId 对话持久化会话 ID（缺省时后端自动创建）
   * @param projectId 项目 ID（创建新会话时使用）
   * @returns 最终 AgentStep（answer 或 error，含 conversationId）
   */
  async function execute(
    userInput: string,
    intent?: string,
    context?: string,
    conversationId?: string,
    projectId?: string,
  ): Promise<AgentStreamStep> {
    if (isStreaming.value) {
      throw new Error('Agent is already running');
    }

    error.value = null;
    isStreaming.value = true;
    currentStep.value = 0;
    abortController = new AbortController();

    let body: AgentExecuteBody = {
      userInput,
      intent,
      complexity: 'complex',
      context,
      conversationId,
      projectId,
    };

    let roundtrip = 0;
    const maxRoundtrips = 30;

    try {
      // 循环：每次遇到 pending 步骤，前端执行工具并回传结果
      while (roundtrip < maxRoundtrips) {
        roundtrip++;

        // 调用后端 agent/execute
        // S-C03: Token 通过 HttpOnly Cookie 自动传输（credentials: 'include'）
        const token = getToken();
        if (!token) {
          console.debug('[useAgentStream] Token not in localStorage (using HttpOnly Cookie auth)');
        }

        const resp = await fetch(
          `${API_BASE}/agent/execute`,
          {
            method: 'POST',
            // S-C03: 携带 HttpOnly Cookie 凭证
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              ...authHeaders(),
            },
            body: JSON.stringify(body),
            signal: abortController.signal,
          },
        );

        if (!resp.ok) {
          const errText = await resp.text().catch(() => 'Unknown error');
          console.error(`[useAgentStream] Agent request failed: ${resp.status} ${resp.statusText}`, errText);
          throw new Error(`Agent 请求失败 (${resp.status}): ${errText.substring(0, 200)}`);
        }

        // 解析 SSE 流
        const reader = resp.body?.getReader();
        if (!reader) {
          throw new Error('SSE response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let nextBody: AgentExecuteBody | null = null;
        let currentEvent = ''; // 跟踪 SSE event: 行

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log(`[useAgentStream] Raw chunk (${chunk.length} chars):`, chunk.substring(0, 500));
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留未完成的行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              currentEvent = ''; // 空行标志 SSE 事件结束，重置 event
              continue;
            }
            if (trimmed === 'data: [DONE]') {
              console.log('[useAgentStream] Received [DONE]');
              continue;
            }

            // 跟踪 event: 行
            if (trimmed.startsWith('event: ')) {
              currentEvent = trimmed.slice(7).trim();
              console.log(`[useAgentStream] SSE event type: "${currentEvent}"`);
              continue;
            }

            // SSE 注释行（如 heartbeat），跳过
            if (trimmed.startsWith(':')) continue;

            if (!trimmed.startsWith('data: ')) continue;

            // 处理后端发送的 event: error
            if (currentEvent === 'error') {
              try {
                const errData = JSON.parse(trimmed.slice(6));
                const errStep: AgentStreamStep = {
                  type: 'error',
                  content: errData.message || 'Unknown error',
                  step: currentStep.value + 1,
                  timestamp: Date.now(),
                };
                error.value = errStep.content;
                callbacks.onError?.(errStep);
                currentEvent = '';
                return errStep;
              } catch {
                // JSON 解析失败，继续尝试正常解析
              }
            }

            currentEvent = '';

            try {
              const step: AgentStreamStep = JSON.parse(trimmed.slice(6));
              console.log(`[useAgentStream] Parsed step type="${step.type}" step=${step.step}`);
              currentStep.value = step.step;

              // 触发回调
              switch (step.type) {
                case 'thought':
                  callbacks.onThought?.(step);
                  break;
                case 'action':
                  callbacks.onAction?.(step);
                  // 如果标记了前端委托，执行真实工具
                  if (step.delegateToFrontend && step.toolName && step.toolParams && step.sessionId) {
                    let resultText: string;
                    try {
                      const result = await toolExecutor.execute(step.toolName, step.toolParams);
                      resultText = result.success
                        ? JSON.stringify(result.data || { ok: true })
                        : `Error: ${result.error}`;
                    } catch (err) {
                      resultText = `工具执行错误: ${(err as Error).message}`;
                    }

                    // 准备回传体（携带 conversationId/projectId 确保续执行不重复创建会话）
                    nextBody = {
                      userInput,
                      intent,
                      sessionId: step.sessionId,
                      toolResultPayload: {
                        toolName: step.toolName,
                        result: resultText,
                      },
                      conversationId,
                      projectId,
                    };
                  }
                  break;
                case 'observation':
                  callbacks.onObservation?.(step);
                  break;
                case 'pending':
                  callbacks.onPending?.(step);
                  break;
                case 'answer':
                  callbacks.onAnswer?.(step);
                  return step;
                case 'error':
                  callbacks.onError?.(step);
                  return step;
              }
            } catch {
              // 忽略解析错误（无效 JSON 行）
            }
          }
        }

        // 处理工具回传
        if (nextBody) {
          body = nextBody;
          continue;
        }

        // 没有 pending → 结束
        return {
          type: 'error',
          content: 'Agent 流意外结束',
          step: currentStep.value,
          timestamp: Date.now(),
        };
      }

      // 达到最大轮次
      return {
        type: 'error',
        content: `工具执行轮次达到上限 (${maxRoundtrips})`,
        step: currentStep.value,
        timestamp: Date.now(),
      };
    } catch (err) {
      // AbortError：用户主动中止或组件卸载，不展示为错误
      if (err instanceof DOMException && err.name === 'AbortError') {
        isStreaming.value = false;
        abortController = null;
        return {
          type: 'error',
          content: '',
          step: currentStep.value,
          timestamp: Date.now(),
        };
      }
      const errStep: AgentStreamStep = {
        type: 'error',
        content: err instanceof Error ? err.message : String(err),
        step: currentStep.value,
        timestamp: Date.now(),
      };
      error.value = errStep.content;
      callbacks.onError?.(errStep);
      return errStep;
    } finally {
      isStreaming.value = false;
      abortController = null;
    }
  }

  /** 中止当前流 */
  function abort(): void {
    if (abortController) {
      abortController.abort();
    }
  }

  return {
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    currentStep: readonly(currentStep),
    execute,
    abort,
  };
}
