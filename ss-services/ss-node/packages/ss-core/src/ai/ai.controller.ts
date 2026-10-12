// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AI Controller — P1-T03 后端 AI 服务网关
 *
 * REST API 端点（前缀 /api/v1/ai）：
 *   - GET    /status       — AI 功能开关状态
 *   - GET    /health       — Provider 健康状态（触发实时检查）
 *   - GET    /routing      — 当前路由策略
 *   - POST   /chat          — 非流式对话
 *   - POST   /chat/stream   — 流式对话（SSE）
 *   - POST   /embed         — 文本嵌入（向量化）
 *
 * 鉴权：
 *   - 所有端点要求 JWT 认证（继承现有 JwtAuthGuard）
 *   - embed 端点要求 ADMIN 角色（D-008 权限模型）
 *
 * 关联决策：
 *   - D-008 继承用户权限 + 高危操作人工确认
 *   - D-009 SSE 流式输出
 *   - D-012 Feature Flag（AI_ENABLED）
 */

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsOptional, IsString, IsNumber } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { UserRole } from '../core/user/entities/user.entity';
import { LLMProxyService } from './llm-proxy.service';
import {
  AiProviderConfigService,
  CreateAiProviderDto,
  UpdateAiProviderDto,
} from './ai-provider-config.service';
import { ChatMessage, EmbeddingRequest, LLMRequest, LLMResponse, TaskType } from './llm.types';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { FeatureFlagService, AI_FEATURE_FLAGS } from './feature-flag.service';
import { FeatureFlagGuard, RequireFeatureFlag } from './feature-flag.guard';
import { LLMSafetyGuardService } from './llm-safety-guard.service';
import { AgentOrchestratorService, AgentExecuteRequest } from './agent-orchestrator.service';
import { RAGQAService, KnowledgeItem } from './rag-qa.service';
import {
  Phase2FeaturesService,
  BindingRecommendRequest,
  LayoutOptimizeRequest,
  ContextHelpRequest,
  SmartSearchRequest,
  CommandParseRequest,
} from './phase2-features.service';
import { ConversationService } from './conversation.service';
import {
  PromptVersionService,
  CreatePromptDto,
  CreateVersionDto,
} from './prompt-version.service';
import { CostMonitorService } from './cost-monitor.service';

class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  messages!: ChatMessage[];

  /** 任务类型，决定路由 */
  @IsOptional()
  @IsString()
  taskType?: TaskType;

  /** 指定供应商（覆盖任务类型路由，优先使用该供应商） */
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsArray()
  tools?: any[];

  @IsOptional()
  toolChoice?: any;

  @IsOptional()
  @IsArray()
  stop?: string[];

  @IsOptional()
  @IsString()
  user?: string;

  /** 会话 ID（缺省时自动创建新会话） */
  @IsOptional()
  @IsString()
  conversationId?: string;

  /** 项目 ID（创建新会话时使用，缺省 'default'） */
  @IsOptional()
  @IsString()
  projectId?: string;
}

class EmbedDto {
  @IsArray()
  @ArrayMinSize(1)
  inputs!: string[];

  @IsOptional()
  @IsString()
  model?: string;
}

@ApiTags('AI Agent')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly proxy: LLMProxyService,
    private readonly providerConfig: AiProviderConfigService,
    private readonly featureFlag: FeatureFlagService,
    private readonly safetyGuard: LLMSafetyGuardService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly ragQA: RAGQAService,
    private readonly phase2: Phase2FeaturesService,
    private readonly conversationService: ConversationService,
    private readonly promptVersionService: PromptVersionService,
    private readonly costMonitorService: CostMonitorService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: '获取 AI 功能开关状态及 Feature Flags' })
  getStatus(): { enabled: boolean; features: Record<string, boolean> } {
    return {
      enabled: this.proxy.isEnabled(),
      features: this.featureFlag.getAllFlags(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: '获取 Provider 健康状态（触发实时检查）' })
  async getHealth() {
    return { providers: await this.proxy.getHealth() };
  }

  @Get('routing')
  @ApiOperation({ summary: '获取当前任务路由策略' })
  getRouting() {
    return { routing: this.proxy.getRouting() };
  }

  @Post('chat')
  @ApiOperation({ summary: '非流式对话（按任务类型路由，自动持久化）' })
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatDto, @Request() req: any) {
    if (!dto?.messages?.length) {
      throw new HttpException('messages 不能为空', HttpStatus.BAD_REQUEST);
    }
    const userId = req.user?.id || 'anonymous';
    const projectId = dto.projectId || 'default';
    const taskType = dto.taskType || 'chat';

    // 1. 预算熔断检查
    const budgetCheck = await this.costMonitorService.canProceed(userId);
    if (!budgetCheck.allowed) {
      throw new HttpException(
        budgetCheck.reason || 'AI 预算已耗尽',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. 会话管理：复用或新建
    let conversationId = dto.conversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      const conv = await this.conversationService.createConversation({
        userId,
        projectId,
        taskType,
        model: dto.model,
      });
      conversationId = conv.id;
    }

    // 3. 组装上下文：若客户端只传当前消息 + conversationId，从 DB 恢复历史
    const lastUserMessage = dto.messages[dto.messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      throw new HttpException('messages 最后一条必须为 user 角色', HttpStatus.BAD_REQUEST);
    }

    let llmMessages: ChatMessage[];
    if (dto.messages.length === 1 && dto.conversationId) {
      const history = await this.conversationService.getConversationHistory(conversationId);
      llmMessages = [...history, lastUserMessage];
    } else {
      llmMessages = dto.messages;
    }

    // 4. 持久化 user 消息
    const userContent =
      typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage.content);
    await this.conversationService.appendMessage(conversationId, {
      role: 'user',
      content: userContent,
    });

    // 5. 新会话自动生成标题
    if (isNewConversation && typeof lastUserMessage.content === 'string') {
      await this.conversationService.autoGenerateTitle(conversationId, lastUserMessage.content);
    }

    // 6. 调用 LLM
    const llmRequest: LLMRequest = {
      messages: llmMessages,
      providerId: dto.providerId,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      tools: dto.tools,
      toolChoice: dto.toolChoice,
      stop: dto.stop,
      user: dto.user || userId,
      stream: false,
    };

    const startedAt = Date.now();
    let response: LLMResponse;
    try {
      response = await this.proxy.generate(llmRequest, taskType);
    } catch (err) {
      // 失败也记录用量日志
      this.costMonitorService
        .logUsage({
          providerId: dto.providerId || 'unknown',
          model: dto.model || 'unknown',
          taskType,
          userId,
          projectId,
          conversationId,
          promptTokens: 0,
          completionTokens: 0,
          success: false,
          errorMessage: (err as Error).message,
          latencyMs: Date.now() - startedAt,
        })
        .catch((e) => this.logger.warn(`用量日志记录失败: ${e.message}`));
      throw err;
    }

    // 7. 持久化 assistant 消息
    await this.conversationService.appendMessage(conversationId, {
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls ? JSON.stringify(response.toolCalls) : undefined,
      tokens: response.usage?.totalTokens || 0,
    });

    // 8. 记录用量日志（异步，不阻塞响应）
    this.costMonitorService
      .logUsage({
        providerId: response.provider,
        model: response.model,
        taskType,
        userId,
        projectId,
        conversationId,
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        success: true,
        latencyMs: response.latencyMs,
      })
      .catch((e) => this.logger.warn(`用量日志记录失败: ${e.message}`));

    // 9. 返回值附加 conversationId
    return { ...response, conversationId };
  }

  @Post('chat/stream')
  @ApiOperation({ summary: '流式对话（SSE，按任务类型路由，自动持久化）' })
  @UseGuards(JwtAuthGuard)
  async chatStream(@Body() dto: ChatDto, @Request() req: any, @Res() res: Response) {
    if (!dto?.messages?.length) {
      throw new HttpException('messages 不能为空', HttpStatus.BAD_REQUEST);
    }
    const userId = req.user?.id || 'anonymous';
    const projectId = dto.projectId || 'default';
    const taskType = dto.taskType || 'chat';

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 心跳：确保浏览器/proxy 感知连接已建立
    res.write(': heartbeat\n\n');

    // 1. 预算熔断检查
    const budgetCheck = await this.costMonitorService.canProceed(userId);
    if (!budgetCheck.allowed) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: budgetCheck.reason || 'AI 预算已耗尽',
          code: 'BUDGET_EXCEEDED',
        })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 2. 会话管理：复用或新建
    let conversationId = dto.conversationId;
    const isNewConversation = !conversationId;
    if (!conversationId) {
      const conv = await this.conversationService.createConversation({
        userId,
        projectId,
        taskType,
        model: dto.model,
      });
      conversationId = conv.id;
    }

    // 3. 组装上下文
    const lastUserMessage = dto.messages[dto.messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'messages 最后一条必须为 user 角色' })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    let llmMessages: ChatMessage[];
    if (dto.messages.length === 1 && dto.conversationId) {
      const history = await this.conversationService.getConversationHistory(conversationId);
      llmMessages = [...history, lastUserMessage];
    } else {
      llmMessages = dto.messages;
    }

    // 4. 持久化 user 消息
    const userContent =
      typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage.content);
    await this.conversationService.appendMessage(conversationId, {
      role: 'user',
      content: userContent,
    });

    // 5. 新会话自动生成标题
    if (isNewConversation && typeof lastUserMessage.content === 'string') {
      await this.conversationService.autoGenerateTitle(conversationId, lastUserMessage.content);
    }

    // 6. 流式调用 + 累积内容
    const llmRequest: LLMRequest = {
      messages: llmMessages,
      providerId: dto.providerId,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      tools: dto.tools,
      toolChoice: dto.toolChoice,
      stop: dto.stop,
      user: dto.user || userId,
      stream: true,
    };

    const startedAt = Date.now();
    let accumulatedContent = '';
    let finalUsage:
      | { promptTokens: number; completionTokens: number; totalTokens: number }
      | undefined;
    const providerIdUsed = dto.providerId || 'unknown';
    const modelNameUsed = dto.model || 'unknown';
    let success = true;
    let errorMessage: string | undefined;

    try {
      for await (const chunk of this.proxy.streamChat(llmRequest, taskType)) {
        if (chunk.delta) {
          accumulatedContent += chunk.delta;
        }
        if (chunk.usage) {
          finalUsage = chunk.usage;
        }
        // 在 done=true 的最终 chunk 注入 conversationId
        if (chunk.done) {
          res.write(
            `data: ${JSON.stringify({ ...chunk, conversationId })}\n\n`,
          );
        } else {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      success = false;
      errorMessage = (err as Error).message;
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: errorMessage })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
    } finally {
      res.end();
    }

    // 7. 流结束后异步持久化 assistant 消息 + 记录用量日志（不阻塞响应）
    if (accumulatedContent) {
      this.conversationService
        .appendMessage(conversationId, {
          role: 'assistant',
          content: accumulatedContent,
          tokens: finalUsage?.totalTokens || 0,
        })
        .catch((e) => this.logger.warn(`持久化 assistant 消息失败: ${e.message}`));
    }

    this.costMonitorService
      .logUsage({
        providerId: providerIdUsed,
        model: modelNameUsed,
        taskType,
        userId,
        projectId,
        conversationId,
        promptTokens: finalUsage?.promptTokens || 0,
        completionTokens: finalUsage?.completionTokens || 0,
        success,
        errorMessage,
        latencyMs: Date.now() - startedAt,
      })
      .catch((e) => this.logger.warn(`用量日志记录失败: ${e.message}`));
  }

  @Post('embed')
  @ApiOperation({ summary: '文本嵌入（向量化，固定路由到智谱）' })
  @UseGuards(JwtAuthGuard)
  async embed(@Body() dto: EmbedDto) {
    if (!dto?.inputs?.length) {
      throw new HttpException('inputs 不能为空', HttpStatus.BAD_REQUEST);
    }
    const req: EmbeddingRequest = {
      inputs: dto.inputs,
      model: dto.model,
    };
    return this.proxy.embed(req);
  }

  // ==================== Provider 配置管理 ====================

  @Get('providers')
  @ApiOperation({ summary: '获取所有 AI 供应商配置' })
  @UseGuards(JwtAuthGuard)
  async getProviders() {
    return { providers: await this.providerConfig.findAll() };
  }

  @Get('providers/presets')
  @ApiOperation({ summary: '获取所有预置供应商模板（厂家默认配置）' })
  @UseGuards(JwtAuthGuard)
  getPresets() {
    return { presets: this.providerConfig.getPresets() };
  }

  @Post('providers/from-preset')
  @ApiOperation({ summary: '按预置模板快速创建供应商（仅需 API Key）' })
  @UseGuards(JwtAuthGuard)
  async createFromPreset(@Body() body: { providerId: string; apiKey: string }) {
    if (!body?.providerId?.trim()) {
      throw new HttpException('providerId 不能为空', HttpStatus.BAD_REQUEST);
    }
    if (!body?.apiKey?.trim()) {
      throw new HttpException('apiKey 不能为空', HttpStatus.BAD_REQUEST);
    }
    const result = await this.providerConfig.createFromPreset(body.providerId, body.apiKey);
    await this.proxy.reloadProviders();
    return result;
  }

  @Post('providers')
  @ApiOperation({ summary: '创建 AI 供应商配置（完整字段）' })
  @UseGuards(JwtAuthGuard)
  async createProvider(@Body() dto: CreateAiProviderDto) {
    const result = await this.providerConfig.create(dto);
    // 创建后重新加载 Provider 配置
    await this.proxy.reloadProviders();
    return result;
  }

  @Put('providers/:providerId')
  @ApiOperation({ summary: '更新 AI 供应商配置' })
  @UseGuards(JwtAuthGuard)
  async updateProvider(@Param('providerId') providerId: string, @Body() dto: UpdateAiProviderDto) {
    const result = await this.providerConfig.update(providerId, dto);
    await this.proxy.reloadProviders();
    return result;
  }

  @Delete('providers/:providerId')
  @ApiOperation({ summary: '删除 AI 供应商配置' })
  @UseGuards(JwtAuthGuard)
  async deleteProvider(@Param('providerId') providerId: string) {
    await this.providerConfig.remove(providerId);
    await this.proxy.reloadProviders();
    return { success: true };
  }

  @Put('providers/:providerId/toggle')
  @ApiOperation({ summary: '切换 AI 供应商启用/禁用' })
  @UseGuards(JwtAuthGuard)
  async toggleProvider(@Param('providerId') providerId: string, @Body('enabled') enabled: boolean) {
    const result = await this.providerConfig.toggleEnabled(providerId, enabled);
    await this.proxy.reloadProviders();
    return result;
  }

  /**
   * 测试供应商连接
   *
   * 使用数据库中已保存的配置（解密 API Key）向供应商发起一次最小化对话请求，
   * 返回连接结果与延迟。使用独立 Provider 实例测试，避免覆盖正在服务中的配置；
   * 不限启用状态（用户可在启用前验证配置），也不受全局 AI_ENABLED 开关影响。
   */
  @Post('providers/:providerId/test')
  @ApiOperation({ summary: '测试 AI 供应商连接（最小化对话请求 + 延迟测量）' })
  @UseGuards(JwtAuthGuard)
  async testProvider(@Param('providerId') providerId: string) {
    const config = await this.providerConfig.getProviderConfigById(providerId);
    if (!config) {
      throw new HttpException(`AI Provider 不存在: ${providerId}`, HttpStatus.NOT_FOUND);
    }
    if (!config.apiKey?.trim()) {
      return {
        success: false,
        error: 'API Key 未配置',
        checkedAt: Date.now(),
      };
    }
    const tester = new OpenAICompatibleProvider(config.providerId);
    tester.initialize(config);
    const health = await tester.checkHealth();
    return {
      success: health.healthy,
      latencyMs: health.avgLatencyMs,
      error: health.lastError,
      checkedAt: health.lastCheckAt,
    };
  }

  // ============================================================
  //  P1-T09：安全防护端点
  // ============================================================

  @Get('safety/stats')
  @ApiOperation({ summary: '获取安全防护统计数据' })
  @UseGuards(JwtAuthGuard)
  getSafetyStats() {
    return this.safetyGuard.getStats();
  }

  @Post('safety/override')
  @ApiOperation({ summary: '生成安全过滤放行 Token（管理员）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  generateSafetyOverride() {
    const token = this.safetyGuard.generateOverrideToken('admin');
    return { overrideToken: token, expiresIn: '5m' };
  }

  // ============================================================
  //  P1-T03：Agent 编排端点
  // ============================================================

  @Post('agent/execute')
  @ApiOperation({ summary: '执行 AI Agent（ReAct 编排，SSE 流式输出，自动持久化）' })
  @UseGuards(JwtAuthGuard)
  async agentExecute(@Body() dto: AgentExecuteRequest, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id || 'anonymous';
    const projectId = dto.projectId || 'default';
    const isContinuation = !!(dto.sessionId && dto.toolResultPayload);

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 立即发送 heartbeat 注释行，确保浏览器/proxy 感知连接已建立，
    // 避免在 LLM 思考期间因无数据导致 net::ERR_ABORTED
    res.write(': heartbeat\n\n');

    // 1. 预算熔断检查
    const budgetCheck = await this.costMonitorService.canProceed(userId);
    if (!budgetCheck.allowed) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: budgetCheck.reason || 'AI 预算已耗尽',
          code: 'BUDGET_EXCEEDED',
        })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 2. 会话管理：仅首次执行（非续执行）时创建/复用会话 + 持久化 user 消息
    let conversationId = dto.conversationId;
    const isNewConversation = !conversationId;
    if (!isContinuation) {
      if (!conversationId) {
        const conv = await this.conversationService.createConversation({
          userId,
          projectId,
          taskType: 'chat',
          model: null,
        });
        conversationId = conv.id;
      }

      // 持久化 user 消息
      await this.conversationService.appendMessage(conversationId, {
        role: 'user',
        content: dto.userInput,
      });

      // 新会话自动生成标题
      if (isNewConversation) {
        await this.conversationService.autoGenerateTitle(conversationId, dto.userInput);
      }
    }

    // 3. 执行 Agent 编排，转发步骤到 SSE，在 answer/error 时持久化
    const startedAt = Date.now();
    let assistantContent = '';
    let success = true;
    let errorMessage: string | undefined;

    try {
      for await (const step of this.orchestrator.execute(dto)) {
        // 捕获 answer 内容用于持久化，并注入 conversationId
        if (step.type === 'answer') {
          assistantContent = step.content;
          res.write(
            `data: ${JSON.stringify({ ...step, conversationId })}\n\n`,
          );
        } else if (step.type === 'error') {
          success = false;
          errorMessage = step.content;
          res.write(
            `data: ${JSON.stringify({ ...step, conversationId })}\n\n`,
          );
        } else {
          res.write(`data: ${JSON.stringify(step)}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      success = false;
      errorMessage = (err as Error).message;
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: errorMessage,
          conversationId,
        })}\n\n`,
      );
    } finally {
      res.end();
    }

    // 4. 流结束后异步持久化 assistant 消息（不阻塞响应）
    if (assistantContent && conversationId) {
      this.conversationService
        .appendMessage(conversationId, {
          role: 'assistant',
          content: assistantContent,
        })
        .catch((e) => this.logger.warn(`Agent 模式持久化 assistant 消息失败: ${e.message}`));
    }

    // 5. 异步记录用量日志（Agent 模式内部多次调用 LLM，token 用量无法精确聚合，暂记 0）
    if (conversationId) {
      this.costMonitorService
        .logUsage({
          providerId: 'unknown',
          model: 'unknown',
          taskType: 'chat',
          userId,
          projectId,
          conversationId,
          promptTokens: 0,
          completionTokens: 0,
          success,
          errorMessage,
          latencyMs: Date.now() - startedAt,
        })
        .catch((e) => this.logger.warn(`Agent 用量日志记录失败: ${e.message}`));
    }
  }

  // ============================================================
  //  P1-T08：RAG 知识库端点
  // ============================================================

  @Post('kb/index')
  @ApiOperation({ summary: '索引知识库文档' })
  @UseGuards(JwtAuthGuard, FeatureFlagGuard)
  @RequireFeatureFlag(AI_FEATURE_FLAGS.KB)
  async indexKnowledge(@Body() dto: { items: KnowledgeItem[] }) {
    if (!dto?.items?.length) {
      throw new HttpException('知识库项不能为空', HttpStatus.BAD_REQUEST);
    }
    return this.ragQA.indexDocuments(dto.items);
  }

  @Post('kb/ask')
  @ApiOperation({ summary: 'RAG 知识库问答（同步）' })
  @UseGuards(JwtAuthGuard, FeatureFlagGuard)
  @RequireFeatureFlag(AI_FEATURE_FLAGS.KB)
  async askKnowledge(@Body() dto: { question: string; history?: any[] }) {
    if (!dto?.question) {
      throw new HttpException('问题不能为空', HttpStatus.BAD_REQUEST);
    }
    return this.ragQA.ask({ question: dto.question, history: dto.history });
  }

  @Post('kb/ask/stream')
  @ApiOperation({ summary: 'RAG 知识库问答（流式 SSE）' })
  @UseGuards(JwtAuthGuard, FeatureFlagGuard)
  @RequireFeatureFlag(AI_FEATURE_FLAGS.KB)
  async askKnowledgeStream(
    @Body() dto: { question: string; history?: any[] },
    @Res() res: Response,
  ) {
    if (!dto?.question) {
      throw new HttpException('问题不能为空', HttpStatus.BAD_REQUEST);
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      for await (const chunk of this.ragQA.askStream({
        question: dto.question,
        history: dto.history,
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
    }
    res.end();
  }

  @Get('kb/status')
  @ApiOperation({ summary: '获取知识库索引状态' })
  getKBStatus(): { indexed: boolean; chunks: number } {
    return {
      indexed: this.ragQA.isIndexed(),
      chunks: this.ragQA['vectorStore']?.size() || 0,
    };
  }

  // ============================================================
  //  Phase 2 智能功能端点（A004/A005/C002/C003/E003）
  // ============================================================

  @Post('binding/recommend')
  @ApiOperation({ summary: 'A004 智能数据绑定推荐' })
  @UseGuards(JwtAuthGuard)
  recommendBindings(@Body() dto: BindingRecommendRequest) {
    return this.phase2.recommendBindings(dto);
  }

  @Post('layout/optimize')
  @ApiOperation({ summary: 'A005 智能布局优化' })
  @UseGuards(JwtAuthGuard)
  optimizeLayout(@Body() dto: LayoutOptimizeRequest) {
    return this.phase2.optimizeLayout(dto);
  }

  @Post('context/help')
  @ApiOperation({ summary: 'C002 上下文感知帮助' })
  @UseGuards(JwtAuthGuard)
  async getContextHelp(@Body() dto: ContextHelpRequest) {
    return this.phase2.getContextHelp(dto);
  }

  @Post('search')
  @ApiOperation({ summary: 'C003 跨模块智能搜索' })
  @UseGuards(JwtAuthGuard)
  smartSearch(@Body() dto: SmartSearchRequest) {
    return this.phase2.smartSearch(dto);
  }

  @Post('command/parse')
  @ApiOperation({ summary: 'E003 自然语言命令解析' })
  @UseGuards(JwtAuthGuard)
  parseCommand(@Body() dto: CommandParseRequest) {
    return this.phase2.parseCommand(dto);
  }

  // ============================================================
  //  P2-T08：会话管理端点
  // ============================================================

  @Get('conversations')
  @ApiOperation({ summary: '获取当前用户的会话列表' })
  @UseGuards(JwtAuthGuard)
  async listConversations(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const userId = req.user?.id || 'anonymous';
    return this.conversationService.listConversations(userId, projectId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: '获取会话详情' })
  @UseGuards(JwtAuthGuard)
  async getConversation(@Request() req: any, @Param('id') id: string) {
    const conv = await this.conversationService.getConversation(id);
    if (!conv) {
      throw new HttpException('会话不存在', HttpStatus.NOT_FOUND);
    }
    if (conv.userId !== (req.user?.id || 'anonymous')) {
      throw new HttpException('无权访问该会话', HttpStatus.FORBIDDEN);
    }
    return conv;
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '获取会话消息列表（按 seq 升序）' })
  @UseGuards(JwtAuthGuard)
  async getConversationMessages(@Request() req: any, @Param('id') id: string) {
    const conv = await this.conversationService.getConversation(id);
    if (!conv) {
      throw new HttpException('会话不存在', HttpStatus.NOT_FOUND);
    }
    if (conv.userId !== (req.user?.id || 'anonymous')) {
      throw new HttpException('无权访问该会话', HttpStatus.FORBIDDEN);
    }
    const messages = await this.conversationService.getMessages(id);
    return { messages };
  }

  @Put('conversations/:id/title')
  @ApiOperation({ summary: '更新会话标题' })
  @UseGuards(JwtAuthGuard)
  async updateConversationTitle(
    @Request() req: any,
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    if (!title?.trim()) {
      throw new HttpException('title 不能为空', HttpStatus.BAD_REQUEST);
    }
    const conv = await this.conversationService.getConversation(id);
    if (!conv) {
      throw new HttpException('会话不存在', HttpStatus.NOT_FOUND);
    }
    if (conv.userId !== (req.user?.id || 'anonymous')) {
      throw new HttpException('无权访问该会话', HttpStatus.FORBIDDEN);
    }
    await this.conversationService.updateTitle(id, title);
    return { success: true };
  }

  @Put('conversations/:id/archive')
  @ApiOperation({ summary: '归档/取消归档会话' })
  @UseGuards(JwtAuthGuard)
  async archiveConversation(
    @Request() req: any,
    @Param('id') id: string,
    @Body('archived') archived: boolean,
  ) {
    const conv = await this.conversationService.getConversation(id);
    if (!conv) {
      throw new HttpException('会话不存在', HttpStatus.NOT_FOUND);
    }
    if (conv.userId !== (req.user?.id || 'anonymous')) {
      throw new HttpException('无权访问该会话', HttpStatus.FORBIDDEN);
    }
    await this.conversationService.archiveConversation(id, archived);
    return { success: true };
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: '删除会话（含消息）' })
  @UseGuards(JwtAuthGuard)
  async deleteConversation(@Request() req: any, @Param('id') id: string) {
    const conv = await this.conversationService.getConversation(id);
    if (!conv) {
      throw new HttpException('会话不存在', HttpStatus.NOT_FOUND);
    }
    if (conv.userId !== (req.user?.id || 'anonymous')) {
      throw new HttpException('无权访问该会话', HttpStatus.FORBIDDEN);
    }
    await this.conversationService.deleteConversation(id);
    return { success: true };
  }

  // ============================================================
  //  P2-T08：用量统计端点
  // ============================================================

  @Get('usage/stats')
  @ApiOperation({ summary: '获取用量统计（支持日期范围/供应商/任务类型筛选）' })
  @UseGuards(JwtAuthGuard)
  async getUsageStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('providerId') providerId?: string,
    @Query('taskType') taskType?: string,
  ) {
    const userId = req.user?.id || 'anonymous';
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.costMonitorService.getStats({
      startDate: start,
      endDate: end,
      providerId,
      taskType,
      userId,
    });
  }

  @Get('usage/budget')
  @ApiOperation({ summary: '获取月度预算状态' })
  @UseGuards(JwtAuthGuard)
  async getUsageBudget(@Request() req: any) {
    return this.costMonitorService.checkBudget(req.user?.id || 'anonymous');
  }

  // ============================================================
  //  P2-T08：Prompt 版本管理端点
  // ============================================================

  @Get('prompts')
  @ApiOperation({ summary: '获取 Prompt 模板列表' })
  @UseGuards(JwtAuthGuard)
  async listPrompts() {
    const prompts = await this.promptVersionService.listPrompts();
    return { prompts };
  }

  @Post('prompts')
  @ApiOperation({ summary: '创建 Prompt 模板' })
  @UseGuards(JwtAuthGuard)
  async createPrompt(@Body() dto: CreatePromptDto) {
    return this.promptVersionService.createPrompt(dto);
  }

  @Put('prompts/:id')
  @ApiOperation({ summary: '更新 Prompt 模板' })
  @UseGuards(JwtAuthGuard)
  async updatePrompt(@Param('id') id: string, @Body() dto: Partial<CreatePromptDto>) {
    await this.promptVersionService.updatePrompt(id, dto);
    return { success: true };
  }

  @Get('prompts/:id/versions')
  @ApiOperation({ summary: '获取 Prompt 版本列表' })
  @UseGuards(JwtAuthGuard)
  async listPromptVersions(@Param('id') id: string) {
    const versions = await this.promptVersionService.listVersions(id);
    return { versions };
  }

  @Post('prompts/:id/versions')
  @ApiOperation({ summary: '创建 Prompt 新版本（draft 状态）' })
  @UseGuards(JwtAuthGuard)
  async createPromptVersion(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Omit<CreateVersionDto, 'promptId'>,
  ) {
    return this.promptVersionService.createVersion({
      ...dto,
      promptId: id,
      createdBy: req.user?.id,
    });
  }

  @Put('prompts/versions/:versionId/publish')
  @ApiOperation({ summary: '发布 Prompt 版本（draft → active，管理员）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async publishPromptVersion(@Param('versionId') versionId: string) {
    await this.promptVersionService.publishVersion(versionId);
    return { success: true };
  }

  @Put('prompts/versions/:versionId/archive')
  @ApiOperation({ summary: '归档 Prompt 版本（active → archived，管理员）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async archivePromptVersion(@Param('versionId') versionId: string) {
    await this.promptVersionService.archiveVersion(versionId);
    return { success: true };
  }

  @Put('prompts/versions/:versionId/rollback')
  @ApiOperation({ summary: '回滚到指定 Prompt 版本（管理员）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rollbackPromptVersion(@Param('versionId') versionId: string) {
    await this.promptVersionService.rollbackToVersion(versionId);
    return { success: true };
  }
}
