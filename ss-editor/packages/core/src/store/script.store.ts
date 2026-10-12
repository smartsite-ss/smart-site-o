// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ScriptDefinition, ScheduledTask, ScriptLog } from '../scada-data/types/script.types';
import { ScriptEngine } from '../scada-data/engine/ScriptEngine';

export const useScriptRuntimeStore = defineStore('scriptRuntime', () => {
  const engine = ScriptEngine.getInstance();

  // ─── 状态 ───
  const registeredScripts = ref<ScriptDefinition[]>([]);
  const scheduledTasks = ref<ScheduledTask[]>([]);
  const executionLogs = ref<ScriptLog[]>([]);
  const lastExecutionResult = ref<{ scriptId: string; success: boolean; output?: any } | null>(null);

  const activeScriptCount = computed(() => registeredScripts.value.filter((s) => s.enabled).length);
  const totalExecutionCount = computed(() => registeredScripts.value.reduce((sum, s) => sum + s.executeCount, 0));

  // ─── 脚本管理 ───

  function registerScript(definition: ScriptDefinition): void {
    engine.registerScript(definition);
    const existing = registeredScripts.value.findIndex((s) => s.id === definition.id);
    if (existing >= 0) {
      registeredScripts.value[existing] = definition;
    } else {
      registeredScripts.value.push(definition);
    }
  }

  function unregisterScript(scriptId: string): void {
    engine.unregisterScript(scriptId);
    registeredScripts.value = registeredScripts.value.filter((s) => s.id !== scriptId);
  }

  function loadPageScripts(scripts: ScriptDefinition[]): void {
    for (const script of scripts) {
      registerScript(script);
    }
  }

  function clearPageScripts(pageId: string): void {
    const toRemove = registeredScripts.value.filter((s) => {
      // 假设脚本按页面组织，通过 id 前缀判断
      return s.id.startsWith(pageId);
    });
    for (const script of toRemove) {
      unregisterScript(script.id);
    }
  }

  // ─── 执行 ───

  async function executeScript(scriptId: string): Promise<void> {
    const result = await engine.executeAsync(scriptId, 'manual');
    lastExecutionResult.value = { scriptId, success: result.success, output: result.output };
    executionLogs.value = engine.getLogs();
  }

  // ─── 日志 ───

  function refreshLogs(): void {
    executionLogs.value = engine.getLogs();
  }

  function clearLogs(): void {
    executionLogs.value = [];
  }

  return {
    registeredScripts,
    scheduledTasks,
    executionLogs,
    lastExecutionResult,
    activeScriptCount,
    totalExecutionCount,
    registerScript,
    unregisterScript,
    loadPageScripts,
    clearPageScripts,
    executeScript,
    refreshLogs,
    clearLogs,
  };
});