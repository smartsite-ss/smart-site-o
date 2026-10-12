<template>
  <div
    class="script-editor"
    :style="{ height: normalizedHeight }"
    @keydown="handleKeydown"
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
 * 使用 setTimeout 延迟，确保浏览器完全处理完 click 事件后再操作编辑器。
 * 注意：不使用 requestAnimationFrame，因为原生 select 下拉关闭期间 rAF 可能被阻塞。
 */
function deferEditorOp(fn: () => void, delayMs: number = 100) {
  setTimeout(fn, delayMs);
}

function insertSnippet(snippet: string): void {
  // 直接操作 Monaco 底层文本模型（ITextModel），完全绕过编辑管线。
  // executeEdits / trigger('type') / setPosition 都走的是编辑器管线，
  // 涉及：语法重解析 → 视图重排 → 滚动计算 → 装饰器更新 → 撤销栈 → Marker 更新
  // 这些步骤在当前组件 + lint + completion 的叠加下会导致主线程阻塞。
  //
  // model.applyEdits() 仅触发模型变更和 onDidChangeModelContent，
  // 不触发视图更新、不移动光标。撤销行为由 applyEdits 自身管理。
  const editor = editorRef.value;
  if (!editor) return;

  const model = editor.getModel();
  if (!model) return;

  const existingCode = model.getValue().trim();
  const snippetWithSemicolon = snippet.endsWith(';') ? snippet : snippet + ';';

  let textToInsert: string;
  let insertRange: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };

  if (existingCode.length > 0) {
    // 已有代码：在最后一行末尾补 ";" 后换行插入新代码
    const lastLine = model.getLineCount();
    const lastColumn = model.getLineMaxColumn(lastLine);
    const lastLineContent = model.getLineContent(lastLine).trimEnd();
    const needsSemicolon = !lastLineContent.endsWith(';');

    textToInsert = (needsSemicolon ? ';' : '') + '\n' + snippetWithSemicolon;
    insertRange = {
      startLineNumber: lastLine,
      startColumn: lastColumn,
      endLineNumber: lastLine,
      endColumn: lastColumn,
    };
  } else {
    // 空编辑器：直接插入
    textToInsert = snippetWithSemicolon;
    insertRange = {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    };
  }

  model.applyEdits([
    {
      range: insertRange,
      text: textToInsert,
    },
  ]);
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

/**
 * Ctrl+S 保存脚本 — 阻止浏览器默认的"保存网页"对话框
 */
function handleKeydown(event: KeyboardEvent): void {
  const isCtrlS = (event.ctrlKey || event.metaKey) && event.key === 's';
  if (isCtrlS) {
    event.preventDefault();
    handleSave();
  }
}

function handleSave(): void {
  // 延迟执行保存，避免在 click 事件处理中同步调用 getValue() 导致浏览器卡死
  deferEditorOp(() => {
    const value = getValue();
    emit('save', value);
  });
}

function handleTestReset(): void {
  debug.testResult.value = null;
  debug.error.value = null;
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
  transition: width 0.15s;
}

.knowledge-side-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  transition: width 0.15s;
}

.debug-side-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  transition: width 0.15s;
}

/* ── 响应式侧面板 ── */
@media (max-width: 1200px) {
  .api-side-panel {
    width: 180px;
  }
  .knowledge-side-panel {
    width: 260px;
  }
  .debug-side-panel {
    width: 220px;
  }
}

@media (max-width: 1000px) {
  .api-side-panel {
    width: 160px;
  }
  .knowledge-side-panel {
    width: 220px;
  }
  .debug-side-panel {
    width: 200px;
  }
}

@media (max-width: 700px) {
  .api-side-panel {
    display: none;
  }
  .knowledge-side-panel {
    display: none;
  }
  .debug-side-panel {
    width: 180px;
  }
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