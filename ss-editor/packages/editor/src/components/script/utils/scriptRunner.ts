// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ScriptEngine, type ScriptContext, type ScriptResult } from '@scada-editor/core';
import { createMockApi } from './mockApiFactory';

/**
 * 编辑态沙箱执行器
 * 用于 ScriptDebugPanel 中的脚本测试运行
 */
export class ScriptRunner {
  private engine: ScriptEngine;

  constructor() {
    this.engine = ScriptEngine.getInstance();
  }

  /**
   * 执行脚本测试
   * @param code 脚本代码
   * @param mockData Mock 数据
   * @param mockContext Mock 上下文
   * @param timeout 超时时间（ms）
   */
  async execute(
    code: string,
    mockData: Record<string, any> = {},
    mockContext: Record<string, any> = {},
    timeout: number = 5000,
  ): Promise<{
    result: ScriptResult;
    apiCalls: Array<{ method: string; args: any[] }>;
  }> {
    const apiCalls: Array<{ method: string; args: any[] }> = [];
    createMockApi(apiCalls);

    const context: ScriptContext = {
      graphicId: mockContext?.graphicId ?? 'test-graphic',
      tagValues: mockData ?? {},
      triggerType: 'manual',
    };

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          result: { success: false, error: `Execution timeout (${timeout}ms)`, executionTime: timeout },
          apiCalls,
        });
      }, timeout);

      try {
        const result = this.engine.executeScript(code, context);
        clearTimeout(timer);
        resolve({ result, apiCalls });
      } catch (error: any) {
        clearTimeout(timer);
        resolve({
          result: { success: false, error: error?.message ?? String(error), executionTime: 0 },
          apiCalls,
        });
      }
    });
  }
}