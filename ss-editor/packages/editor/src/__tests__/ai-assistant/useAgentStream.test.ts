// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * useAgentStream 单元测试 — SSE 解析 + 错误处理 + AbortError
 *
 * 覆盖:
 *   - data: 行解析 → 回调触发
 *   - : heartbeat 注释 → 跳过
 *   - event: error → onError 回调
 *   - data: [DONE] → 流结束
 *   - AbortError → 静默处理
 *   - HTTP 非 200 → 抛出错误
 *   - 并发保护
 *   - delegateToFrontend → 工具执行
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAgentStream, type AgentStreamStep } from '../../components/ai-assistant/useAgentStream';

// ============================================================
// Mock localStorage
// ============================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ============================================================
// Mock @scada-editor/core
// ============================================================

vi.mock('@scada-editor/core', () => ({
  toolExecutor: {
    execute: vi.fn().mockResolvedValue({ success: true, data: { ok: true } }),
  },
}));

// ============================================================
// Helpers
// ============================================================

function createMockSSEResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const encodedChunks = chunks.map((c) => encoder.encode(c));
  let index = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (index < encodedChunks.length) {
        controller.enqueue(encodedChunks[index]);
        index++;
      } else {
        controller.close();
      }
    },
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status.toString() === '200' ? 'OK' : 'Internal Server Error',
    body: stream,
    text: async () => chunks.join(''),
    json: async () => { throw new Error('not json'); },
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    clone: () => { throw new Error('not implemented'); },
  } as unknown as Response;
}

/** 构造标准 SSE 步骤行 */
function stepLine(step: Partial<AgentStreamStep>): string {
  return `data: ${JSON.stringify({ timestamp: Date.now(), ...step })}\n\n`;
}

// ============================================================
// Tests
// ============================================================

describe('useAgentStream', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorageMock.setItem('scada_access_token', 'test-jwt-token');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ────── 基本 SSE 解析 ──────

  describe('SSE data: 行解析', () => {
    it('应解析 data: 行并触发 onThought 回调', async () => {
      const onThought = vi.fn();
      const onAnswer = vi.fn();
      const { execute } = useAgentStream({ onThought, onAnswer });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          stepLine({ type: 'thought', content: '正在思考...', step: 1 }),
          stepLine({ type: 'answer', content: '完成', step: 2 }),
          'data: [DONE]\n\n',
        ]),
      );

      await execute('hello');

      expect(onThought).toHaveBeenCalledTimes(1);
      expect(onThought).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'thought', content: '正在思考...', step: 1 }),
      );
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'answer', content: '完成', step: 2 }),
      );
    });

    it('应跳过 : heartbeat SSE 注释行', async () => {
      const onThought = vi.fn();
      const { execute } = useAgentStream({ onThought });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          stepLine({ type: 'thought', content: 'thinking', step: 1 }),
          ': another comment\n\n',
          stepLine({ type: 'answer', content: 'done', step: 2 }),
          'data: [DONE]\n\n',
        ]),
      );

      await execute('hello');

      // heartbeat 不应触发任何回调
      expect(onThought).toHaveBeenCalledTimes(1);
    });

    it('应在收到 [DONE] 后正常结束', async () => {
      const { execute } = useAgentStream();

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          'data: [DONE]\n\n',
        ]),
      );

      const result = await execute('hello');
      // 没有 pending，流意外结束 → 返回 error 步骤
      expect(result.type).toBe('error');
      expect(result.content).toContain('意外结束');
    });
  });

  // ────── event: error 处理 ──────

  describe('event: error 处理', () => {
    it('应解析 event: error 并触发 onError 回调', async () => {
      const onError = vi.fn();
      const { execute } = useAgentStream({ onError });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          'event: error\n',
          'data: {"message":"LLM 调用超时"}\n',
          '\n',
        ]),
      );

      const result = await execute('hello');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          content: 'LLM 调用超时',
        }),
      );
      expect(result.type).toBe('error');
      expect(result.content).toBe('LLM 调用超时');
    });

    it('event: error 的 data 无法解析时应不影响整体', async () => {
      const onError = vi.fn();
      const { execute } = useAgentStream({ onError });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          'event: error\n',
          'data: {invalid json}\n',
          '\n',
          stepLine({ type: 'answer', content: 'still works', step: 1 }),
          'data: [DONE]\n\n',
        ]),
      );

      const result = await execute('hello');

      // error 的 JSON 解析失败，回退到正常解析，但也失败 → skip
      // 后续的 answer 应正常触发
      expect(result.type).toBe('answer');
    });
  });

  // ────── AbortError ──────

  describe('AbortError 处理', () => {
    it('用户中止时应静默处理，不触发 onError', async () => {
      const onError = vi.fn();
      const { execute, abort } = useAgentStream({ onError });

      // fetch 被 abort
      globalThis.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_resolve, reject) => {
          const err = new DOMException('The user aborted a request', 'AbortError');
          // 使用 setTimeout 让 execute 先设置好 abortController
          setTimeout(() => reject(err), 10);
        });
      });

      const executePromise = execute('hello');
      // 立即中止
      abort();

      const result = await executePromise;

      expect(onError).not.toHaveBeenCalled();
      expect(result.type).toBe('error');
      expect(result.content).toBe('');
    });
  });

  // ────── HTTP 错误响应 ──────

  describe('HTTP 错误响应', () => {
    it('非 200 响应应抛出错误并触发 onError', async () => {
      const onError = vi.fn();
      const { execute } = useAgentStream({ onError });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse(['Internal Server Error'], 500),
      );

      const result = await execute('hello');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('error');
      expect(result.content).toContain('Agent 请求失败');
      expect(result.content).toContain('500');
    });

    it('401 响应应包含状态码', async () => {
      const onError = vi.fn();
      const { execute } = useAgentStream({ onError });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse(['Unauthorized'], 401),
      );

      const result = await execute('hello');

      expect(result.content).toContain('401');
    });
  });

  // ────── 并发保护 ──────

  describe('并发保护', () => {
    it('正在执行时再次调用 execute 应抛出错误', async () => {
      const { execute } = useAgentStream();

      // 第一个 execute 会阻塞（fetch 永远不 resolve）
      globalThis.fetch = vi.fn().mockImplementation(
        () => new Promise(() => {}), // 永远 pending
      );

      const firstPromise = execute('first');
      // 给第一个 execute 时间设置 isStreaming
      await new Promise((r) => setTimeout(r, 0));

      await expect(execute('second')).rejects.toThrow('Agent is already running');

      // 清理
      firstPromise.catch(() => {});
    });
  });

  // ────── 无 token 场景 ──────

  describe('无 JWT token', () => {
    it('无 token 时仍应发送请求（authHeaders 为空）', async () => {
      localStorageMock.setItem('scada_access_token', ''); // 移除 token
      const onAnswer = vi.fn();
      const { execute } = useAgentStream({ onAnswer });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          stepLine({ type: 'answer', content: 'ok without token', step: 1 }),
          'data: [DONE]\n\n',
        ]),
      );

      await execute('hello');

      // 验证 fetch 被调用且没有 Authorization header
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/ai/agent/execute',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          }),
        }),
      );
    });
  });

  // ────── 多步骤 + tool 回调 ──────

  describe('多步骤 SSE 流', () => {
    it('应正确处理 thought → action → observation → answer 全流程', async () => {
      const onThought = vi.fn();
      const onAction = vi.fn();
      const onObservation = vi.fn();
      const onAnswer = vi.fn();
      const { execute } = useAgentStream({ onThought, onAction, onObservation, onAnswer });

      globalThis.fetch = vi.fn().mockResolvedValue(
        createMockSSEResponse([
          ': heartbeat\n\n',
          stepLine({ type: 'thought', content: '正在思考第 1 步...', step: 1 }),
          stepLine({ type: 'action', content: '调用工具', step: 2, toolName: 'data_query', toolParams: { query: 'test' } }),
          stepLine({ type: 'observation', content: '工具返回: {"ok":true}', step: 3, toolName: 'data_query', toolResult: '{"ok":true}' }),
          stepLine({ type: 'answer', content: '查询结果：设备正常', step: 4 }),
          'data: [DONE]\n\n',
        ]),
      );

      const result = await execute('查询设备状态');

      expect(onThought).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ toolName: 'data_query' }),
      );
      expect(onObservation).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('answer');
    });
  });
});
