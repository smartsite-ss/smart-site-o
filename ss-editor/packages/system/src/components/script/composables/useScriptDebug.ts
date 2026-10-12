// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';
import type { ScriptEditorMode, TestRunResult } from '../ScriptEditor.types';
import { executeInWorker } from '../utils/scriptWorker';
import { usePageStore } from '@scada-editor/core';

export function useScriptDebug(mode: ScriptEditorMode) {
  const testResult = ref<TestRunResult | null>(null);
  const isRunning = ref(false);
  const error = ref<string | null>(null);
  const pageStore = usePageStore();

  async function runTest(
    code: string,
    mockData: Record<string, any> = {},
    mockContext: Record<string, any> = {},
  ): Promise<TestRunResult> {
    isRunning.value = true;
    error.value = null;

    // 使用 setTimeout(0) 让 Vue 响应式更新先渲染到 DOM，
    // 确保按钮状态切换为"运行中..."后再执行脚本
    await new Promise<void>((r) => setTimeout(r, 0));

    const wrappedCode = wrapScript(code, mode);
    const startTime = performance.now();

    try {
      // 使用 Web Worker 在后台线程执行脚本，真正实现非阻塞执行
      // 超时后 Worker 会被 terminate，主线程不会卡死
      const workerResult = await executeInWorker(
        {
          script: wrappedCode,
          tagValues: mockData ?? {},
          graphicId: mockContext?.graphicId ?? 'test-graphic',
          event: mockContext?.event ?? undefined,
        },
        5000,
        // 实时 API 回调：将 Worker 中的图元操作同步到页面
        (method, args) => {
          const page = pageStore.currentPage;
          if (!page) return;
          switch (method) {
            case 'moveGraphic':
              page.moveGraphic(args[0], args[1], args[2]);
              break;
            case 'setGraphicProps':
              page.updateGraphic(args[0], args[1]);
              break;
            case 'showGraphic':
              page.updateGraphic(args[0], { visible: true });
              break;
            case 'hideGraphic':
              page.updateGraphic(args[0], { visible: false });
              break;
          }
        },
      );

      const executionTime = workerResult.executionTime > 0
        ? workerResult.executionTime
        : performance.now() - startTime;

      const result: TestRunResult = {
        success: workerResult.success,
        output: workerResult.output,
        error: workerResult.error,
        executionTime,
        apiCalls: workerResult.apiCalls,
        timestamp: Date.now(),
      };

      testResult.value = result;
      if (!result.success) {
        error.value = result.error ?? null;
      }
      return result;
    } catch (e: any) {
      const result: TestRunResult = {
        success: false,
        error: e.message ?? String(e),
        apiCalls: [],
        executionTime: performance.now() - startTime,
        timestamp: Date.now(),
      };
      testResult.value = result;
      error.value = e.message;
      return result;
    } finally {
      isRunning.value = false;
    }
  }

  function wrapScript(code: string, editorMode: ScriptEditorMode): string {
    switch (editorMode) {
      case 'filter':
        return `function filter(data, res) {\n${code}\n}\nconst result = filter(context.tagValues, {});\nresult;`;
      case 'driver':
        return code;
      case 'interaction':
        return code;
      case 'timer':
        return code;
      case 'expression':
        return code;
      default:
        return code;
    }
  }

  return { testResult, isRunning, error, runTest };
}