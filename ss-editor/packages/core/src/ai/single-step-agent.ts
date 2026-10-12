// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Single Step Agent — P1-T03 前端单步 Agent
 *
 * 处理简单意图（chat/alarm_query/device_query/kb_query），
 * 单次 LLM 调用 + 可选工具执行（无需 ReAct 循环）。
 *
 * 复杂意图 → 转发到后端 ReAct 编排器。
 *
 * 关联决策：D-005 混合模式
 *
 * 用法:
 *   const agent = new SingleStepAgent();
 *   const result = await agent.run(intentResult, context);
 */

import { aiClient, ChatMessage, TaskType } from './ai-client';
import { IntentResult } from './intent-parser';
import { contextManager } from './context-manager';
import { ToolExecutor, toolExecutor, ToolDefinition } from './tool-executor';

/** 单步 Agent 执行结果 */
export interface SingleStepResult {
  /** 响应文本 */
  content: string;
  /** 执行时间（毫秒） */
  latencyMs: number;
  /** 是否包含工具调用 */
  hasToolCalls: boolean;
  /** 工具执行结果 */
  toolResults?: Array<{ name: string; success: boolean; data?: unknown }>;
}

/** Agent 配置 */
export interface AgentConfig {
  /** 超时毫秒 */
  timeout: number;
  /** 最大工具调用数 */
  maxToolCalls: number;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  timeout: 60_000,
  maxToolCalls: 3,
};

export class SingleStepAgent {
  private config: AgentConfig;
  private executor: ToolExecutor;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.executor = toolExecutor;
  }

  /**
   * 运行单步 Agent
   * @param intent — 意图解析结果
   * @returns 执行结果
   */
  async run(intent: IntentResult): Promise<SingleStepResult> {
    const startTime = Date.now();
    const ctx = contextManager.collectContext();
    const systemPrompt = contextManager.buildSystemPrompt(ctx);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: intent.rawInput },
    ];

    // 获取可用工具
    const tools = this.executor.getToolSchemas();

    try {
      const response = await aiClient.chat({
        messages,
        taskType: this.mapIntentToTaskType(intent.intent),
        tools: tools.length > 0 ? tools : undefined,
      });

      const latencyMs = Date.now() - startTime;

      // 检查是否有 Tool Call
      const assistantMsg = response;
      const toolCalls = assistantMsg?.toolCalls;

      if (toolCalls && toolCalls.length > 0) {
        const toolResults = await this.executeTools(toolCalls.slice(0, this.config.maxToolCalls));
        return {
          content: assistantMsg.content || '正在执行操作...',
          latencyMs,
          hasToolCalls: true,
          toolResults,
        };
      }

      return {
        content: assistantMsg.content || '(无响应)',
        latencyMs,
        hasToolCalls: false,
      };
    } catch (err) {
      return {
        content: `抱歉，处理请求时出错：${(err as Error).message}`,
        latencyMs: Date.now() - startTime,
        hasToolCalls: false,
      };
    }
  }

  /**
   * 是否需要转发到后端 ReAct 编排器
   */
  shouldDelegate(intent: IntentResult): boolean {
    return intent.complexity === 'complex';
  }

  /**
   * 注册前端工具
   */
  registerTool(tool: ToolDefinition): void {
    this.executor.register(tool);
  }

  /**
   * 意图类型 → 任务类型映射
   */
  private mapIntentToTaskType(intent: IntentResult['intent']): TaskType {
    const map: Record<string, TaskType> = {
      chat: 'chat',
      alarm_query: 'analysis',
      device_query: 'analysis',
      kb_query: 'chat',
      script_gen: 'script-dev',
      plugin_gen: 'plugin-dev',
      page_create: 'chat',
      graphic_add: 'chat',
      layout_adjust: 'chat',
      data_bind: 'chat',
      unknown: 'chat',
    };
    return map[intent] || 'chat';
  }

  /**
   * 执行工具调用链
   */
  private async executeTools(
    toolCalls: Array<{ function: { name: string; arguments: string } }>,
  ): Promise<Array<{ name: string; success: boolean; data?: unknown }>> {
    const results = await toolExecutor.executeBatch(
      toolCalls.map((tc) => ({
        name: tc.function.name,
        params: this.safeParseJSON(tc.function.arguments),
      })),
    );
    return results.map((r, i) => ({
      name: toolCalls[i]?.function?.name || 'unknown',
      success: r.success,
      data: r.data,
    }));
  }

  private safeParseJSON(text: string): Record<string, unknown> {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }
}

/** 单例 */
export const singleStepAgent = new SingleStepAgent();
