// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * AiController 单元测试 — agentExecute SSE 端点
 *
 * 覆盖:
 *   - SSE 响应头设置
 *   - heartbeat 立即发送
 *   - 步骤流式输出
 *   - [DONE] 终止
 *   - 异常处理
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AiController } from '../ai.controller';
import { LLMProxyService } from '../llm-proxy.service';
import { AiProviderConfigService } from '../ai-provider-config.service';
import { FeatureFlagService } from '../feature-flag.service';
import { LLMSafetyGuardService } from '../llm-safety-guard.service';
import { AgentOrchestratorService } from '../agent-orchestrator.service';
import { RAGQAService } from '../rag-qa.service';
import { Phase2FeaturesService } from '../phase2-features.service';
import { ConversationService } from '../conversation.service';
import { PromptVersionService } from '../prompt-version.service';
import { CostMonitorService } from '../cost-monitor.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Response } from 'express';

// ============================================================
// Mock response
// ============================================================

function mockResponse(): Response & { chunks: string[]; headersSent: boolean; ended: boolean } {
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  return {
    chunks,
    headersSent: false,
    ended: false,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return this as any;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    getHeaders() {
      return headers;
    },
    flushHeaders: jest.fn(),
    write(chunk: string, cb?: () => void) {
      chunks.push(chunk);
      if (cb) cb();
      return true;
    },
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    // minimal express Response shape
  } as any;
}

// ============================================================
// Mock AgentOrchestratorService
// ============================================================

function mockOrchestrator(steps: any[]): Partial<AgentOrchestratorService> {
  return {
    async *execute(_dto: any) {
      for (const step of steps) {
        yield step;
      }
    },
  } as any;
}

function mockOrchestratorThrows(error: Error): Partial<AgentOrchestratorService> {
  return {
    async *execute(_dto: any) {
      throw error;
    },
  } as any;
}

// ============================================================
// Tests
// ============================================================

describe('AiController — agentExecute SSE', () => {
  let controller: AiController;

  async function createController(orchestratorOverride?: Partial<AgentOrchestratorService>) {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        Reflector,
        {
          provide: LLMProxyService,
          useValue: { isEnabled: jest.fn().mockReturnValue(true) },
        },
        {
          provide: AiProviderConfigService,
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: FeatureFlagService,
          useValue: { getAllFlags: jest.fn().mockReturnValue({}) },
        },
        {
          provide: LLMSafetyGuardService,
          useValue: { check: jest.fn().mockResolvedValue({ safe: true }) },
        },
        {
          provide: AgentOrchestratorService,
          useValue: orchestratorOverride || mockOrchestrator([]),
        },
        {
          provide: RAGQAService,
          useValue: { query: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: Phase2FeaturesService,
          useValue: {
            recommendBindings: jest.fn().mockReturnValue({ recommendations: [] }),
            optimizeLayout: jest.fn().mockReturnValue({ optimized: true }),
            getContextHelp: jest.fn().mockResolvedValue({ docs: [] }),
            smartSearch: jest.fn().mockReturnValue({ results: [] }),
            parseCommand: jest.fn().mockReturnValue({ intent: 'unknown' }),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            createConversation: jest.fn().mockResolvedValue({ id: 'conv-test' }),
            appendMessage: jest.fn().mockResolvedValue(undefined),
            autoGenerateTitle: jest.fn().mockResolvedValue(undefined),
            getConversationHistory: jest.fn().mockResolvedValue([]),
            listConversations: jest.fn().mockResolvedValue([]),
            getConversation: jest.fn().mockResolvedValue({ id: 'conv-test' }),
            getMessages: jest.fn().mockResolvedValue([]),
            updateTitle: jest.fn().mockResolvedValue(undefined),
            archiveConversation: jest.fn().mockResolvedValue(undefined),
            deleteConversation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PromptVersionService,
          useValue: {
            listPrompts: jest.fn().mockResolvedValue([]),
            createPrompt: jest.fn().mockResolvedValue({}),
            updatePrompt: jest.fn().mockResolvedValue(undefined),
            listVersions: jest.fn().mockResolvedValue([]),
            createVersion: jest.fn().mockResolvedValue({}),
            publishVersion: jest.fn().mockResolvedValue(undefined),
            archiveVersion: jest.fn().mockResolvedValue(undefined),
            rollbackToVersion: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CostMonitorService,
          useValue: {
            canProceed: jest.fn().mockResolvedValue({ allowed: true }),
            logUsage: jest.fn().mockResolvedValue(undefined),
            getStats: jest.fn().mockResolvedValue({}),
            checkBudget: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    return module.get<AiController>(AiController);
  }

  // ────── SSE 响应头 ──────

  describe('SSE 响应头', () => {
    it('应设置 Content-Type 为 text/event-stream', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.getHeader('content-type')).toBe('text/event-stream');
    });

    it('应设置 Cache-Control 为 no-cache', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.getHeader('cache-control')).toBe('no-cache');
    });

    it('应设置 Connection 为 keep-alive', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.getHeader('connection')).toBe('keep-alive');
    });

    it('应设置 X-Accel-Buffering 为 no', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.getHeader('x-accel-buffering')).toBe('no');
    });

    it('应调用 flushHeaders', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.flushHeaders).toHaveBeenCalled();
    });
  });

  // ────── heartbeat ──────

  describe('heartbeat', () => {
    it('应在 flushHeaders 后立即发送 heartbeat 注释行', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      // 第一个数据块应为 heartbeat
      expect(res.chunks.length).toBeGreaterThanOrEqual(1);
      expect(res.chunks[0]).toContain(': heartbeat');
    });
  });

  // ────── 步骤流式输出 ──────

  describe('步骤流式输出', () => {
    it('应逐步骤发送 SSE data 事件', async () => {
      const steps = [
        { type: 'thought', content: 'thinking...', step: 1, timestamp: Date.now() },
        {
          type: 'action',
          content: 'calling tool',
          step: 2,
          toolName: 'test_tool',
          timestamp: Date.now(),
        },
        { type: 'answer', content: 'done', step: 3, timestamp: Date.now() },
      ];
      controller = await createController(mockOrchestrator(steps));
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      // 跳过 heartbeat，检查 data: 行
      const dataLines = res.chunks.filter((c) => c.startsWith('data:'));
      expect(dataLines.length).toBe(4); // 3 steps + [DONE]

      expect(dataLines[0]).toContain('"type":"thought"');
      expect(dataLines[0]).toContain('thinking...');
      expect(dataLines[1]).toContain('"type":"action"');
      expect(dataLines[1]).toContain('"toolName":"test_tool"');
      expect(dataLines[2]).toContain('"type":"answer"');
      expect(dataLines[3]).toBe('data: [DONE]\n\n');
    });

    it('应发送 [DONE] 终止信号', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      const lastChunk = res.chunks[res.chunks.length - 1];
      expect(lastChunk).toContain('[DONE]');
    });

    it('应在流结束后调用 res.end()', async () => {
      controller = await createController();
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.end).toHaveBeenCalled();
    });
  });

  // ────── 异常处理 ──────

  describe('异常处理', () => {
    it('应发送 SSE error 事件而非崩溃', async () => {
      controller = await createController(mockOrchestratorThrows(new Error('LLM 调用超时')));
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      // 应有 event: error 行
      const allText = res.chunks.join('');
      expect(allText).toContain('event: error');
      expect(allText).toContain('LLM 调用超时');
    });

    it('异常后仍应调用 res.end()', async () => {
      controller = await createController(mockOrchestratorThrows(new Error('test error')));
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hello' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.end).toHaveBeenCalled();
    });
  });

  // ────── 空步骤 ──────

  describe('空步骤（无工具调用场景）', () => {
    it('应发送 heartbeat + [DONE]', async () => {
      controller = await createController(mockOrchestrator([]));
      const res = mockResponse();

      await controller.agentExecute({ userInput: 'hi' }, { user: { id: 'user-1' } } as any, res as any);

      expect(res.chunks.length).toBe(2); // heartbeat + [DONE]
      expect(res.chunks[0]).toContain(': heartbeat');
      expect(res.chunks[1]).toContain('[DONE]');
    });
  });
});
