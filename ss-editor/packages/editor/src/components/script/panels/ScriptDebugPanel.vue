<template>
  <div class="script-debug-panel">
    <div class="debug-header">
      <span class="debug-title">{{ $t('system.scriptEditor.debug.title') }}</span>
      <div class="debug-header-actions">
        <button
          class="btn-run"
          :disabled="isRunning"
          @click="handleRunTest"
        >
          {{ isRunning ? $t('system.scriptEditor.debug.running') : $t('system.scriptEditor.debug.runTest') }}
        </button>
        <button
          class="btn-reset"
          @click="handleReset"
        >
          {{ $t('system.scriptEditor.debug.reset') }}
        </button>
      </div>
      <button
        class="debug-close"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <!-- 语法检查状态 -->
    <div class="debug-section">
      <div class="section-title">
        {{ $t('system.scriptEditor.debug.syntaxCheck') }}
      </div>
      <div
        class="syntax-status"
        :class="{ error: !valid }"
      >
        <span v-if="valid">{{ $t('system.scriptEditor.debug.syntaxValid') }}</span>
        <span v-else>❌ {{ errors[0]?.message }}</span>
      </div>
    </div>

    <!-- 执行结果 -->
    <div
      v-if="result"
      class="debug-section"
    >
      <div class="section-title">
        {{ $t('system.scriptEditor.debug.result') }}
      </div>
      <div
        class="result-card"
        :class="result.success ? 'success' : 'error'"
      >
        <div class="result-header">
          {{ result.success ? $t('system.scriptEditor.debug.execSuccess') : $t('system.scriptEditor.debug.execFailed') }}
          | {{ $t('system.scriptEditor.debug.elapsed', { time: result.executionTime.toFixed(1) }) }}
        </div>
        <div class="result-body">
          <div
            v-if="result.success && result.output !== undefined"
            class="result-output"
          >
            <div class="result-label">
              {{ $t('system.scriptEditor.debug.output') }}
            </div>
            <pre>{{ formatOutput(result.output) }}</pre>
          </div>
          <div
            v-if="!result.success && result.error"
            class="result-error"
          >
            <div class="result-label">
              {{ $t('system.scriptEditor.debug.error') }}
            </div>
            <pre>{{ result.error }}</pre>
          </div>
          <div
            v-if="result.apiCalls?.length"
            class="result-api-calls"
          >
            <div class="result-label">
              {{ $t('system.scriptEditor.debug.apiCalls') }}
            </div>
            <div
              v-for="(call, i) in result.apiCalls"
              :key="i"
              class="api-call-item"
            >
              [{{ i + 1 }}] {{ call.method }}({{ call.args.map(a => JSON.stringify(a)).join(', ') }})
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 测试输入 -->
    <div class="debug-section">
      <div class="section-title">
        {{ $t('system.scriptEditor.debug.testInput') }}
      </div>
      <textarea
        v-model="testInputJson"
        class="test-input"
        rows="4"
        :placeholder="$t('system.scriptEditor.debug.testInputPlaceholder')"
        :disabled="isRunning"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { TestRunResult, EditorDiagnostic } from '../ScriptEditor.types';

const _props = defineProps<{
  valid: boolean;
  errors: EditorDiagnostic[];
  isRunning: boolean;
  result: TestRunResult | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'runTest', testData: Record<string, any>): void;
  (e: 'reset'): void;
}>();

const testInputJson = ref('');

function handleRunTest() {
  let testData: Record<string, any> = {};
  try {
    testData = JSON.parse(testInputJson.value || '{}');
  } catch {
    testData = {};
  }
  emit('runTest', testData);
}

function handleReset() {
  testInputJson.value = '';
  emit('reset');
}

function formatOutput(output: any): string {
  if (typeof output === 'object') {
    return JSON.stringify(output, null, 2);
  }
  return String(output);
}
</script>

<style scoped>
.script-debug-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  font-size: 13px;
}
.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.debug-header-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
  margin-right: 8px;
}
.debug-title {
  font-weight: 600;
  color: var(--text);
}
.debug-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 16px;
}
.debug-section {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.debug-section:last-of-type {
  flex: 1;
  overflow-y: auto;
}
.section-title {
  color: var(--text-secondary);
  font-size: 12px;
  margin-bottom: 4px;
  font-weight: 600;
}
.syntax-status {
  color: var(--status-success);
}
.syntax-status.error {
  color: var(--status-error);
}
.test-input {
  width: 100%;
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px;
  border-radius: var(--radius-md);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  resize: vertical;
}
.test-input:focus {
  outline: none;
  border-color: var(--border-focus);
}
.btn-run {
  background: var(--button-background);
  color: var(--button-text);
  border: none;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
}
.btn-run:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-reset {
  background: var(--elevated);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
}
.result-card {
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid;
}
.result-card.success {
  border-color: var(--status-success);
  background: var(--surface);
}
.result-card.error {
  border-color: var(--status-error);
  background: var(--surface);
}
.result-header {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text);
}
.result-body {
  color: var(--text-secondary);
}
.result-label {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 4px 0 2px;
}
.result-output pre,
.result-error pre {
  margin: 0;
  padding: 4px 8px;
  background: var(--background);
  border-radius: var(--radius-md);
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.result-api-calls {
  margin-top: 4px;
}
.api-call-item {
  font-size: 12px;
  padding: 2px 8px;
  color: var(--text-secondary);
}
</style>