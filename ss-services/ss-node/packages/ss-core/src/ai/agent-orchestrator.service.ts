// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Agent Orchestrator — P1-T03 后端 ReAct 编排器
 *
 * 实现 ReAct（Reasoning + Acting）循环：
 *   Thought → Action → Observation（循环，上限 12 次）
 *
 * P1-T04 增强：场景工具（scene.*）委托给前端执行，通过会话机制支持暂停/恢复。
 *
 * 前端通过 POST /api/v1/ai/agent/execute 调用。
 * 响应：SSE 流式输出（每个步骤以 JSON chunk 推送）。
 *
 * 关联决策：
 *   - D-005 混合模式（复杂意图 → 后端 ReAct）
 *   - D-009 SSE 流式输出
 *   - D-013 MCP 工具协议
 *
 * 用法:
 *   const generator = orchestrator.execute({ userInput, context });
 *   for await (const step of generator) { // 按 step 推送SSE }
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProxyService } from './llm-proxy.service';
import { ChatMessage, LLMRequest } from './llm.types';
import { FeatureFlagService, AI_FEATURE_FLAGS } from './feature-flag.service';
import { getSceneCreationSystemPrompt, isSceneCreationIntent } from './scene-creator-agent';

/** 需要委托前端执行的工具名前缀 */
const FRONTEND_TOOL_PREFIXES = ['scene_', 'layout_', 'datatag_'];

/** Agent 执行步骤（SSE chunk） */
export interface AgentStep {
  /** 步骤类型 */
  type: 'thought' | 'action' | 'observation' | 'answer' | 'error' | 'pending';
  /** 步骤内容 */
  content: string;
  /** 步骤序号（1-based） */
  step: number;
  /** 关联的工具名（action 类型时） */
  toolName?: string;
  /** 工具参数（action 类型时） */
  toolParams?: Record<string, unknown>;
  /** 工具结果（observation 类型时） */
  toolResult?: string;
  /** 是否需要前端执行（action 类型时） */
  delegateToFrontend?: boolean;
  /** 会话 ID（delegateToFrontend 为 true 时，前端需携带此 ID 回传结果） */
  sessionId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 对话持久化会话 ID（由 Controller 在 answer/error 步骤注入，前端据此更新 currentConversationId） */
  conversationId?: string;
}

/** Agent 执行请求 */
export interface AgentExecuteRequest {
  /** 用户输入 */
  userInput: string;
  /** 编辑器/运行时上下文 */
  context?: string;
  /** 意图类型 */
  intent?: string;
  /** 复杂度 */
  complexity?: 'simple' | 'complex';
  /** 对话历史 */
  history?: ChatMessage[];
  /** 会话 ID（恢复执行时传入） */
  sessionId?: string;
  /** 工具执行结果（前端回传） */
  toolResultPayload?: { toolName: string; result: string };
  /** 对话持久化会话 ID（缺省时由 Controller 自动创建新会话） */
  conversationId?: string;
  /** 项目 ID（创建新会话时使用，缺省 'default'） */
  projectId?: string;
}

/** Agent 执行选项 */
export interface AgentExecuteOptions {
  /** 最大 ReAct 循环次数 */
  maxIterations: number;
  /** 是否流式输出 */
  stream: boolean;
}

/** 暂挂的 Agent 会话 */
interface PendingSession {
  req: AgentExecuteRequest;
  messages: ChatMessage[];
  step: number;
  iteration: number;
  activeToolName: string;
  /** 原始 tool_call_id（来自 LLM 响应），续执行时需与 assistant 消息中的 tool_calls[].id 匹配 */
  toolCallId: string;
  createdAt: number;
}

const DEFAULT_OPTIONS: AgentExecuteOptions = {
  maxIterations: 12,
  stream: true,
};

/** 会话超时（5 分钟） */
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/** 后端可用工具注册表 */
export interface BackendTool {
  name: string;
  description: string;
  category: string;
  params: Array<{ name: string; type: string; description: string; required: boolean }>;
  /** 是否需委托前端执行（true = 仅定义 schema，执行由前端完成） */
  frontend: boolean;
  /** 执行工具（frontend=false 时生效） */
  execute?: (params: Record<string, unknown>) => Promise<string>;
}

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly tools = new Map<string, BackendTool>();

  /** 暂挂会话（sessionId → PendingSession） */
  private readonly pendingSessions = new Map<string, PendingSession>();

  constructor(
    private readonly proxy: LLMProxyService,
    private readonly featureFlag: FeatureFlagService,
    private readonly configService: ConfigService,
  ) {
    this.registerBuiltinTools();
    // 定期清理超时会话
    setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
  }

  /**
   * 执行 Agent 编排
   * @param req 请求（首次执行或携带 sessionId + toolResultPayload 续执行）
   * @returns AsyncGenerator，每个 AgentStep 为一个 chunk
   */
  async *execute(
    req: AgentExecuteRequest,
    options: AgentExecuteOptions = DEFAULT_OPTIONS,
  ): AsyncGenerator<AgentStep, void, unknown> {
    const maxIter = options.maxIterations || DEFAULT_OPTIONS.maxIterations;

    // ── 续执行模式：前端回传了工具结果 ──
    if (req.sessionId && req.toolResultPayload) {
      const session = this.pendingSessions.get(req.sessionId);
      if (!session) {
        yield this.makeStep({
          type: 'error',
          content: `会话已过期或不存在: ${req.sessionId}`,
          step: 0,
        });
        return;
      }
      this.pendingSessions.delete(req.sessionId);
      this.logger.log(
        `[Agent] 续执行 session=${req.sessionId} tool=${req.toolResultPayload.toolName}`,
      );

      // 将工具结果追加到对话历史（使用原始 tool_call_id 确保与 assistant 消息中的 tool_calls[].id 匹配）
      session.messages.push({
        role: 'tool',
        content: req.toolResultPayload.result,
        toolCallId: session.toolCallId,
      });

      // 继续 ReAct 循环
      yield* this.runReActLoop(session.messages, session.step + 1, session.iteration + 1, maxIter);
      return;
    }

    // ── 首次执行模式 ──
    this.logger.log(
      `[Agent] 首次执行 intent=${req.intent || 'chat'} input="${req.userInput.substring(0, 80)}" tools=${this.tools.size}`,
    );

    // 检查 Feature Flag
    const requiredFlag = this.getRequiredFlag(req.intent);
    if (requiredFlag && !this.featureFlag.isEnabled(requiredFlag)) {
      yield this.makeStep({ type: 'error', content: `AI 功能未启用：${requiredFlag}`, step: 0 });
      return;
    }

    // 构建初始消息
    const messages: ChatMessage[] = this.buildInitialMessages(req);

    yield* this.runReActLoop(messages, 1, 0, maxIter);
  }

  /**
   * 注册后端工具
   */
  registerTool(tool: BackendTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 批量注入后端工具（P2-T01）
   * 覆盖已注册的同名工具（如 stub 替换为真实实现）
   */
  injectBackendTools(tools: BackendTool[]): void {
    let count = 0;
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
      count++;
    }
    this.logger.log(`注入 ${count} 个后端工具`);
  }

  /**
   * 获取已注册的工具列表
   */
  getToolList(): BackendTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取暂挂的会话
   */
  hasPendingSession(sessionId: string): boolean {
    return this.pendingSessions.has(sessionId);
  }

  // ============================================================
  //  ReAct 循环核心
  // ============================================================

  /**
   * ReAct 主循环：Thought → Action → Observation
   * 支持前端工具委托（scene.* / datatag.*）：
   *   遇到 frontend=true 的工具 → 暂存会话 → 发射 pending 步骤 → 等待前端 POST /agent/execute 续执行
   */
  private async *runReActLoop(
    messages: ChatMessage[],
    startStep: number,
    startIter: number,
    maxIter: number,
  ): AsyncGenerator<AgentStep, void, unknown> {
    let step = startStep;

    try {
      for (let iter = startIter; iter < maxIter; iter++) {
        this.logger.log(`[Agent] ReAct 第 ${step} 步 (iter=${iter}/${maxIter})`);

        yield this.makeStep({
          type: 'thought',
          content: `正在思考第 ${step} 步...`,
          step,
        });

        // 调用 LLM（带工具定义）
        const llmReq: LLMRequest = {
          messages,
          stream: false,
          tools: this.getToolDefinitions(),
          toolChoice: 'auto',
        };

        const response = await this.proxy.generate(llmReq, 'chat');

        // 检查 tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolNames = response.toolCalls.map((t) => t.function.name).join(', ');
          this.logger.log(`[Agent] LLM 请求调用工具: [${toolNames}]`);

          // 判断是否包含前端工具
          const hasFrontendTool = response.toolCalls.some((tc) => {
            const t = this.tools.get(tc.function.name);
            return t?.frontend ?? this.isFrontendTool(tc.function.name);
          });

          if (!hasFrontendTool) {
            // 全部是后端工具：统一在 tool 结果之前推送 assistant(tool_calls)
            // OpenAI/DeepSeek 要求: assistant(tool_calls) → tool(response)
            messages.push({
              role: 'assistant',
              content: response.content || '',
              toolCalls: response.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
              })),
            });
          }

          for (const tc of response.toolCalls) {
            const toolName = tc.function.name;
            const toolParams = this.safeParseJSON(tc.function.arguments);
            const tool = this.tools.get(toolName);

            // 判断是否需要委托前端
            const needsFrontend = tool?.frontend ?? this.isFrontendTool(toolName);

            if (needsFrontend) {
              // 生成会话 ID
              const sessionId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

              // 追加 assistant 消息（仅含当前前端工具的 tool_call，避免后续 tool 消息数量不匹配）
              messages.push({
                role: 'assistant',
                content: response.content || '',
                toolCalls: [
                  {
                    id: tc.id,
                    type: 'function' as const,
                    function: { name: toolName, arguments: tc.function.arguments },
                  },
                ],
              });

              // 暂存会话
              this.pendingSessions.set(sessionId, {
                req: {} as AgentExecuteRequest,
                messages,
                step,
                iteration: iter,
                activeToolName: toolName,
                toolCallId: tc.id,
                createdAt: Date.now(),
              });

              // 发射 action 步骤（标记需要前端执行）
              yield this.makeStep({
                type: 'action',
                content: `调用工具: ${toolName}`,
                step,
                toolName,
                toolParams,
                delegateToFrontend: true,
                sessionId,
              });

              // 发射 pending 步骤（暂停循环，等待前端回传结果）
              yield this.makeStep({
                type: 'pending',
                content: `等待前端执行工具 ${toolName}...`,
                step,
                sessionId,
              });

              // ★ 暂停循环：由前端 POST agent/execute 携带 sessionId 和 toolResultPayload 续执行
              return;
            }

            // ── 后端原生工具：直接执行 ──
            yield this.makeStep({
              type: 'action',
              content: `调用工具: ${toolName}`,
              step,
              toolName,
              toolParams,
            });

            if (tool?.execute) {
              try {
                const t0 = Date.now();
                const toolResult = await tool.execute(toolParams);
                const elapsed = Date.now() - t0;
                this.logger.log(
                  `[Agent] 工具 ${toolName} 完成 (${elapsed}ms, result=${toolResult.length} chars)`,
                );
                yield this.makeStep({
                  type: 'observation',
                  content: `工具 ${toolName} 返回: ${toolResult.substring(0, 200)}`,
                  step,
                  toolResult,
                });
                messages.push({
                  role: 'tool',
                  content: toolResult,
                  toolCallId: tc.id,
                });
              } catch (err) {
                const errMsg = `工具执行错误: ${(err as Error).message}`;
                yield this.makeStep({
                  type: 'observation',
                  content: errMsg,
                  step,
                  toolResult: errMsg,
                });
                messages.push({ role: 'tool', content: errMsg, toolCallId: tc.id });
              }
            } else {
              this.logger.warn(
                `[Agent] 工具 "${toolName}" 未注册，可用: [${Array.from(this.tools.keys()).join(', ')}]`,
              );
              const notFoundMsg = `工具 "${toolName}" 不可用`;
              yield this.makeStep({
                type: 'observation',
                content: notFoundMsg,
                step,
                toolResult: notFoundMsg,
              });
              // ★ 必须用 role: 'tool' 配对前面的 assistant(tool_calls)，否则 DeepSeek 报 insufficient tool messages
              messages.push({ role: 'tool', content: notFoundMsg, toolCallId: tc.id });
            }

            step++;
          }
        } else {
          // 无 tool calls → 最终回答
          this.logger.log(`[Agent] 最终回答 (${(response.content || '').length} chars)`);
          yield this.makeStep({
            type: 'answer',
            content: response.content || '(无响应)',
            step,
          });
          return;
        }
      }

      // 达到最大迭代次数
      yield this.makeStep({
        type: 'answer',
        content: `已达到最大推理步骤（${maxIter}），当前结果可能不完整。请尝试简化您的问题。`,
        step,
      });
    } catch (err) {
      yield this.makeStep({
        type: 'error',
        content: `Agent 执行异常: ${(err as Error).message}`,
        step,
      });
      this.logger.error(`Agent 执行异常: ${(err as Error).message}`);
    }
  }

  // ============================================================
  //  辅助方法
  // ============================================================

  private makeStep(partial: Omit<AgentStep, 'timestamp'>): AgentStep {
    return { ...partial, timestamp: Date.now() };
  }

  /** 判断工具名是否需要前端执行（按前缀匹配） */
  private isFrontendTool(toolName: string): boolean {
    return FRONTEND_TOOL_PREFIXES.some((prefix) => toolName.startsWith(prefix));
  }

  /** 清理过期会话 */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.pendingSessions) {
      if (now - session.createdAt > SESSION_TIMEOUT_MS) {
        this.pendingSessions.delete(id);
        this.logger.warn(`清理过期会话: ${id}`);
      }
    }
  }

  private buildInitialMessages(req: AgentExecuteRequest): ChatMessage[] {
    // 场景创建意图使用专用 System Prompt（P2-T02）
    const systemPrompt = isSceneCreationIntent(req.intent)
      ? getSceneCreationSystemPrompt()
      : this.getDefaultSystemPrompt();

    const userContent = req.context
      ? `${req.context}\n\n用户输入：${req.userInput}`
      : req.userInput;

    return [
      { role: 'system', content: systemPrompt },
      ...(req.history || []),
      { role: 'user', content: userContent },
    ];
  }

  /** 默认 System Prompt（通用助手模式） */
  private getDefaultSystemPrompt(): string {
    return `你是一个智能 SCADA 系统 AI 操作助手，可以通过工具调用来执行操作。

当前你拥有以下能力：

画面操作（委托前端）：
- scene_createPage: 创建新页面
- scene_addGraphic: 添加图元（水泵/阀门/仪表/趋势图等）
- scene_autoLayout: 自动排列图元
- scene_setBinding: 将图元属性绑定到数据标签
- scene_setProperty: 修改图元属性
- scene_deleteGraphic: 删除图元
- scene_getGraphicTypes: 获取可用图元类型

数据查询（后端执行）：
- data_query: 查询数据标签历史数据
- data_aggregate: 数据聚合查询（avg/max/min/sum/count）
- datatag_search: 搜索数据标签

设备管理（后端执行）：
- device_getStatus: 设备状态总览/详情
- device_getHistory: 设备历史数据
- device_create: 在项目中创建新设备（从模板实例化）
- driver_list: 查询可用采集驱动及连接配置模板

模板管理（后端执行）：
- template_list: 查询可用设备模板列表
- template_detail: 查看模板详情（含变量定义）
- template_create: 创建新的采集变量模板

报警管理（后端执行）：
- alarm_getHistory: 报警历史/统计概览
- alarm_rule_list: 查询报警规则列表
- alarm_rule_create: 创建报警规则（条件 + 消抖 + 级别）
- alarm_suppression_add: 添加抑制规则（父子依赖/维护窗口）

知识库（后端执行）：
- knowledge_search: 知识库搜索

系统监控（后端执行）：
- system_getHealth: 系统健康检查
- system_health_detailed: 系统级详细健康状态

数据字典管理（后端执行）：
- dict_list: 查看所有字典分类和字典表列表
- dict_detail: 查看字典表详情（含所有键值对）
- dict_create: 创建新的数据字典表（含分类和条目）
- dict_addItems: 向已有字典表追加新条目
- dict_search: 跨字典表搜索条目（按 value 或 label 关键词）

外部数据库接入（后端执行）：
- db_connection_list: 查看已接入的外部数据库
- db_connection_create: 创建新的数据库连接
- db_connection_test: 测试连接是否可达
- db_connection_tables: 浏览表名和列定义
- db_connection_query: 执行 SELECT 查询

项目导入导出（后端执行）：
- project_list: 查询系统中的项目列表
- project_info: 查看项目详细信息（页面数、DB 大小等）
- project_export: 导出项目为 ZIP 文件（可选选择性导出）
- project_import: 从 ZIP 文件导入项目（支持覆盖）

趋势数据查询（后端执行）：
- tag_list: 查询项目中的标签列表
- trend_query: 查询趋势数据（支持多标签、插值、降采样）
- trend_aggregate: 聚合统计（avg/max/min/sum/count，支持时间窗口）
- trend_export: 导出为 CSV 或 JSON

项目诊断修复（后端执行）：
- project_manage_info: 查看项目概览（页面数、DB 大小、路径）
- project_diagnose: 诊断项目资源完整性（健康度 + 问题清单）
- project_init_resources: 自动修复缺失资源（子目录/数据库）

报表模板设计（后端执行）：
- report_template_list: 查询已有报表模板
- report_template_create: 创建报表模板
- report_schedule_create: 配置 Cron 定时导出
- report_generate: 立即生成报表

标签信号配置（后端执行）：
- datatag_configure: 配置单个标签参数（信号调理/工程单位/报警阈值/归档策略/采集参数）
- datatag_batch_configure: 批量配置标签参数

自动化脚本（后端执行）：
- script_api_list: 查看可用的 ScriptAPI 函数
- script_validate: 校验脚本语法
- script_dry_run: 试运行（无副作用）
- script_create: 创建脚本
- script_execute: 执行脚本

工作流程：
1. Thought: 分析用户意图，决定下一步
2. Action: 调用工具
3. Observation: 观察工具结果
4. 重复，直到任务完成，然后给出最终回答

注意事项：
- 创建页面时，先调用 scene_createPage
- 添加多个图元时，逐个调用 scene_addGraphic
- 所有图元添加完毕后，调用 scene_autoLayout 自动排版
- 最后调用 scene_setBinding 完成数据绑定
- 查询数据时，优先使用 data_aggregate 获取统计值
- 查询趋势数据时，先调用 tag_list 确认标签，再调用 trend_query 获取数据
- 查询设备状态时，使用 device_getStatus
- 查询报警时，使用 alarm_getHistory，可加 mode=summary 获取概览
- 配置报警规则时：tag_list 确认标签 → alarm_rule_create 创建规则 → alarm_suppression_add 如有抑制需求
- 搜索相关知识时，使用 knowledge_search
- 添加新设备时，按以下流程：template_list 查模板 → 如无则 template_create 创建 → driver_list 查驱动 → device_create 创建设备
- 创建模板时，需提供 name、deviceType、variables（含 name/label/address/dataType）
- 创建设备时，projectId、name、deviceCode、templateId、driver、connection 为必填参数
- 管理字典时，按以下流程：dict_list 查看现有字典 → dict_create 创建或 dict_addItems 追加 → dict_detail 确认
- 创建字典时，需提供 locale、dictId、dictName、category、items 参数
- 搜索字典条目时，使用 dict_search 按关键词跨字典表搜索
- 接入外部数据库时：db_connection_create 创建连接 → db_connection_test 验证 → db_connection_tables 浏览结构 → db_connection_query 查询数据
- 项目迁移时：project_export 导出 → project_import 导入 → project_info 验证 → project_diagnose 诊断
- 项目诊断修复时：project_diagnose 诊断 → project_init_resources 修复 → system_health_detailed 深层排查
- 报表设计时：report_template_create 创建 → report_generate 预览 → report_schedule_create 定时导出
- 标签配置时：datatag_configure 单独配置 → datatag_batch_configure 批量配置
- 脚本编写时：script_api_list 了解 API → 编写代码 → script_validate 校验 → script_dry_run 试运行 → script_create 保存 → script_execute 执行
- 工具调用最多 10 次`;
  }

  private getToolDefinitions() {
    return this.getToolList().map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            t.params.map((p) => [p.name, { type: p.type, description: p.description }] as const),
          ),
          required: t.params.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));
  }

  private getRequiredFlag(
    intent?: string,
  ): (typeof AI_FEATURE_FLAGS)[keyof typeof AI_FEATURE_FLAGS] | null {
    switch (intent) {
      case 'plugin_gen':
        return AI_FEATURE_FLAGS.CODEGEN;
      case 'script_gen':
        return AI_FEATURE_FLAGS.SCRIPT;
      case 'page_create':
      case 'graphic_add':
      case 'layout_adjust':
        return AI_FEATURE_FLAGS.SCENE;
      case 'alarm_query':
        return AI_FEATURE_FLAGS.ALARM;
      case 'kb_query':
        return AI_FEATURE_FLAGS.KB;
      default:
        return null;
    }
  }

  private safeParseJSON(text: string): Record<string, unknown> {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  // ============================================================
  //  内置工具（P1-T04：scene.* 工具标记为 frontend:true）
  // ============================================================

  private registerBuiltinTools(): void {
    // ── scene.* 工具：委托前端执行 ──
    this.tools.set('scene_createPage', {
      name: 'scene_createPage',
      description: '创建新的监控画面页面',
      category: 'scene',
      frontend: true,
      params: [
        { name: 'name', type: 'string', description: '页面名称', required: true },
        { name: 'width', type: 'number', description: '页面宽度（默认 1920）', required: false },
        { name: 'height', type: 'number', description: '页面高度（默认 1080）', required: false },
      ],
    });

    this.tools.set('scene_addGraphic', {
      name: 'scene_addGraphic',
      description: '在画布上添加一个图元（如水泵、阀门、仪表等）',
      category: 'scene',
      frontend: true,
      params: [
        { name: 'type', type: 'string', description: '图元类型', required: true },
        { name: 'name', type: 'string', description: '图元名称', required: false },
        { name: 'x', type: 'number', description: 'X 坐标', required: false },
        { name: 'y', type: 'number', description: 'Y 坐标', required: false },
        { name: 'width', type: 'number', description: '宽度', required: false },
        { name: 'height', type: 'number', description: '高度', required: false },
      ],
    });

    this.tools.set('scene_autoLayout', {
      name: 'scene_autoLayout',
      description: '自动排列画布上的图元',
      category: 'layout',
      frontend: true,
      params: [
        {
          name: 'mode',
          type: 'string',
          description: '布局模式（grid/flow/circle）',
          required: false,
        },
        { name: 'columns', type: 'number', description: '列数（grid 模式）', required: false },
        { name: 'spacing', type: 'number', description: '图元间距（默认 50）', required: false },
      ],
    });

    this.tools.set('scene_setBinding', {
      name: 'scene_setBinding',
      description: '将图元属性绑定到数据标签',
      category: 'datatag',
      frontend: true,
      params: [
        { name: 'graphicId', type: 'string', description: '图元 ID', required: true },
        { name: 'propertyPath', type: 'string', description: '属性路径', required: true },
        { name: 'tagId', type: 'string', description: '数据标签 ID', required: true },
      ],
    });

    this.tools.set('scene_setProperty', {
      name: 'scene_setProperty',
      description: '修改图元属性（位置、尺寸、文本等）',
      category: 'scene',
      frontend: true,
      params: [
        { name: 'graphicId', type: 'string', description: '目标图元 ID', required: true },
        {
          name: 'property',
          type: 'string',
          description: '属性名（x/y/width/height/rotation/opacity/text）',
          required: true,
        },
        { name: 'value', type: 'string', description: '属性值', required: true },
      ],
    });

    this.tools.set('scene_deleteGraphic', {
      name: 'scene_deleteGraphic',
      description: '从画布上删除图元',
      category: 'scene',
      frontend: true,
      params: [{ name: 'graphicId', type: 'string', description: '图元 ID', required: true }],
    });

    this.tools.set('scene_getGraphicTypes', {
      name: 'scene_getGraphicTypes',
      description: '获取所有可用的图元类型列表',
      category: 'scene',
      frontend: true,
      params: [],
    });

    // ── datatag.* 工具：委托前端执行 ──
    this.tools.set('datatag_search', {
      name: 'datatag_search',
      description: '搜索数据标签',
      category: 'datatag',
      frontend: true,
      params: [
        { name: 'keyword', type: 'string', description: '搜索关键词', required: true },
        { name: 'limit', type: 'number', description: '最大结果数', required: false },
      ],
    });

    // ── 后端原生工具：直接在服务端执行 ──
    this.tools.set('alarm_query', {
      name: 'alarm_query',
      description: '查询报警记录',
      category: 'alarm',
      frontend: false,
      params: [
        {
          name: 'status',
          type: 'string',
          description: '报警状态（active/history）',
          required: false,
        },
        { name: 'limit', type: 'number', description: '最大结果数', required: false },
      ],
      execute: async (_params) => {
        return `当前活动报警 0 条`;
      },
    });

    this.tools.set('device_query', {
      name: 'device_query',
      description: '查询设备列表或状态',
      category: 'device',
      frontend: false,
      params: [{ name: 'status', type: 'string', description: '过滤状态', required: false }],
      execute: async (_params) => {
        return `在线设备: 5 台，离线: 2 台`;
      },
    });
  }
}
