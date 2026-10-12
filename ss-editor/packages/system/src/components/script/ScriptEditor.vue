<template>
  <div
    class="script-editor"
    :style="{ height: normalizedHeight }"
  >
    <!-- 工具栏 -->
    <ScriptToolbar
      v-if="showToolbar"
      :mode="mode"
      :show-knowledge="showKnowledgePanel"
      @format="formatCode"
      @toggle-comment="toggleComment"
      @insert-snippet="insertSnippet"
      @save="handleSave"
      @toggle-knowledge="showKnowledgePanel = !showKnowledgePanel"
    />

    <!-- 主编辑区域：编辑器 + 调试面板（左右结构） -->
    <div
      class="script-editor-body"
      :class="{ 'has-toolbar': showToolbar }"
    >
      <!-- 编辑器容器 -->
      <div
        ref="editorContainerRef"
        class="editor-container"
      />

      <!-- API 参考面板 -->
      <ScriptApiPanel
        v-if="showApiPanel"
        :mode="mode"
        class="api-side-panel"
        @insert="insertSnippet"
      />

      <!-- 知识库面板 -->
      <ScriptKnowledgePanel
        v-if="showKnowledgePanel"
        class="knowledge-side-panel"
        @insert-snippet="insertSnippet"
      />

      <!-- 调试面板（右侧） -->
      <ScriptDebugPanel
        v-if="debugPanelVisible"
        class="debug-side-panel"
        :valid="lintValid"
        :errors="lintErrors"
        :is-running="isRunning"
        :result="testResult"
        @close="debugPanelVisible = false"
        @run-test="handleTestRun"
        @reset="handleTestReset"
      />
    </div>

    <!-- 占位符覆盖 -->
    <div
      v-if="placeholder && !modelValue"
      class="editor-placeholder"
    >
      {{ placeholder }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import type { ScriptEditorProps, ScriptEditorEmits, ScriptEditorExpose, TestRunResult, EditorDiagnostic } from './ScriptEditor.types';
import { useMonacoSetup } from './composables/useMonacoSetup';
import { useScriptCompletion } from './composables/useScriptCompletion';
import { useScriptLint } from './composables/useScriptLint';
import { useScriptDebug } from './composables/useScriptDebug';
import { useScriptTemplates } from './composables/useScriptTemplates';
import ScriptToolbar from './panels/ScriptToolbar.vue';
import ScriptApiPanel from './panels/ScriptApiPanel.vue';
import ScriptKnowledgePanel from './panels/ScriptKnowledgePanel.vue';
import ScriptDebugPanel from './panels/ScriptDebugPanel.vue';

const props = withDefaults(defineProps<ScriptEditorProps>(), {
  height: '300px',
  readonly: false,
  showToolbar: true,
  showDebugPanel: true,
  showApiPanel: false,
  mockData: () => ({}),
  mockContext: () => ({}),
  engine: 'monaco',
  extraCompletions: () => [],
  editorOverrides: () => ({}),
});

const emit = defineEmits<ScriptEditorEmits>();

const editorContainerRef = ref<HTMLElement | null>(null);
const modelValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const normalizedHeight = computed(() => {
  if (typeof props.height === 'number') return `${props.height}px`;
  return props.height;
});

// Composable 实例
const valueRef = ref(props.modelValue);
watch(() => props.modelValue, (v) => { valueRef.value = v; });

const { editorRef, monacoRef, updateValue } = useMonacoSetup(
  editorContainerRef,
  props.mode,
  valueRef,
  { readonly: props.readonly, editorOverrides: props.editorOverrides },
);

const completion = useScriptCompletion(monacoRef, editorRef, props.mode);
const lint = useScriptLint(monacoRef, editorRef, props.mode);
const debug = useScriptDebug(props.mode);
const _templates = useScriptTemplates(props.mode);

const lintValid = ref(true);
const lintErrors = ref<EditorDiagnostic[]>([]);
const debugPanelVisible = ref(props.showDebugPanel);
const showKnowledgePanel = ref(false);
const isRunning = computed(() => debug.isRunning.value);
const testResult = computed(() => debug.testResult.value);

let completionDisposer: any = null;

onMounted(() => {
  // 延迟注册，等待 Monaco 就绪
  setTimeout(() => {
    if (monacoRef.value) {
      completionDisposer = completion.register();
      lint.setupLinting();
    }
  }, 500);
});

onUnmounted(() => {
  completion.dispose();
  completionDisposer?.dispose?.();
});

// ═══ 对外暴露方法 ═══

function getValue(): string {
  return editorRef.value?.getValue() ?? valueRef.value;
}

function setValue(val: string): void {
  valueRef.value = val;
  updateValue(val);
  emit('update:modelValue', val);
}

function formatCode(): void {
  editorRef.value?.getAction('editor.action.formatDocument')?.run();
}

/**
 * 安全延迟执行编辑器操作。
 * 使用 requestAnimationFrame + setTimeout 双重延迟，
 * 确保浏览器完全处理完 click 事件后再操作编辑器，避免主线程死锁。
 */
function deferEditorOp(fn: () => void, delayMs: number = 30) {
  requestAnimationFrame(() => {
    setTimeout(fn, delayMs);
  });
}

function insertSnippet(snippet: string): void {
  const editor = editorRef.value;
  if (!editor) return;

  const selection = editor.getSelection();
  editor.executeEdits('snippet', [{
    range: selection,
    text: snippet,
  }]);
  // 使用双重延迟聚焦编辑器，确保原生下拉框已完全关闭后再聚焦，
  // 避免与 select 下拉框的关闭操作产生 focus 竞态导致浏览器卡死
  deferEditorOp(() => {
    editor.focus();
  });
}

function toggleComment(): void {
  editorRef.value?.getAction('editor.action.commentLine')?.run();
}

function undo(): void {
  editorRef.value?.trigger('keyboard', 'undo', null);
}

function redo(): void {
  editorRef.value?.trigger('keyboard', 'redo', null);
}

function focus(): void {
  editorRef.value?.focus();
}

function validate(): { valid: boolean; errors: EditorDiagnostic[] } {
  const result = lint.validate();
  lintValid.value = result.valid;
  lintErrors.value = result.errors;
  return result;
}

async function testRun(mockData?: Record<string, any>): Promise<TestRunResult> {
  const code = getValue();
  const data = mockData ?? props.mockData ?? {};
  const result = await debug.runTest(code, data, props.mockContext);
  emit('execute', result);
  return result;
}

function handleTestRun(testData: Record<string, any>): void {
  // 延迟执行测试运行，避免在 click 事件处理中同步操作 Monaco Editor 导致浏览器卡死
  deferEditorOp(() => {
    testRun(testData);
  });
}

function handleTestReset(): void {
  debug.testResult.value = null;
  debug.error.value = null;
}

function handleSave(): void {
  emit('save', getValue());
}

function getEditorInstance(): any {
  return editorRef.value;
}

defineExpose<ScriptEditorExpose>({
  getValue,
  setValue,
  formatCode,
  insertSnippet,
  undo,
  redo,
  focus,
  validate,
  testRun,
  getEditorInstance,
});
</script>

<style scoped>
.script-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--background);
  min-height: 200px;
}

.script-editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.editor-container {
  flex: 1;
  min-width: 0;
}

.api-side-panel {
  width: 240px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
}

.knowledge-side-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
}

.debug-side-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  overflow-y: auto;
}

.editor-placeholder {
  position: absolute;
  top: 48px;
  left: 68px;
  color: var(--text-tertiary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  pointer-events: none;
  user-select: none;
}
</style>