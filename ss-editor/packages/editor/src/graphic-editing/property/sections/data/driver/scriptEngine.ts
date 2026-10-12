// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScriptResult, ScriptContext } from '@scada-editor/core';
import { ScriptEngine } from '@scada-editor/core';

export interface TestRunResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
}

function createScriptEngine(): ScriptEngine {
  try {
    return ScriptEngine.getInstance();
  } catch {
    return new (ScriptEngine as any)();
  }
}

export async function testRunScript(
  script: string,
  contextOverrides?: Partial<ScriptContext>,
): Promise<TestRunResult> {
  const engine = createScriptEngine();

  const context: ScriptContext = {
    graphicId: contextOverrides?.graphicId ?? 'test_graphic',
    tagValues: contextOverrides?.tagValues ?? { temp: 25.5, pressure: 1.2 },
    triggerType: contextOverrides?.triggerType ?? 'manual',
  };

  const result: ScriptResult = engine.executeScript(script, context);

  return {
    success: result.success,
    output: result.output,
    error: result.error,
    executionTime: result.executionTime,
  };
}

export async function executeDriverScript(
  script: string,
  graphicId: string,
  tagValues: Record<string, any>,
  _api: unknown,
): Promise<TestRunResult> {
  const engine = createScriptEngine();

  const context: ScriptContext = {
    graphicId,
    tagValues,
    triggerType: 'dataChange',
  };

  const result: ScriptResult = engine.executeScript(script, context);

  return {
    success: result.success,
    output: result.output,
    error: result.error,
    executionTime: result.executionTime,
  };
}

export function validateDriverScript(script: string): { valid: boolean; error?: string } {
  const engine = createScriptEngine();
  return engine.validateScript(script);
}