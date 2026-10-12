<template>
  <div class="script-toolbar">
    <button
      class="toolbar-btn"
      :title="t('system.scriptEditor.toolbar.formatTitle')"
      @click="$emit('format')"
    >
      {{ t('system.scriptEditor.toolbar.format') }}
    </button>
    <button
      class="toolbar-btn"
      :title="t('system.scriptEditor.toolbar.commentTitle')"
      @click="$emit('toggleComment')"
    >
      {{ t('system.scriptEditor.toolbar.comment') }}
    </button>
    <div class="toolbar-divider" />
    <select
      class="toolbar-select"
      :title="t('system.scriptEditor.toolbar.templateTitle')"
      @change="handleTemplateChange($event)"
    >
      <option value="">
        {{ t('system.scriptEditor.toolbar.template') }}
      </option>
      <option
        v-for="snippet in snippets"
        :key="snippet.label"
        :value="snippet.code"
      >
        {{ snippet.label }}
      </option>
    </select>
    <select
      class="toolbar-select"
      :title="t('system.scriptEditor.toolbar.apiTitle')"
      @change="handleApiChange($event)"
    >
      <option value="">
        🔧 {{ t('system.scriptEditor.toolbar.api') }}
      </option>
      <optgroup
        v-for="group in apiGroups"
        :key="group.label"
        :label="group.label"
      >
        <option
          v-for="item in group.items"
          :key="item.label"
          :value="item.code"
        >
          {{ item.label }}
        </option>
      </optgroup>
    </select>
    <button
      class="toolbar-btn"
      :class="{ 'toolbar-btn--active': showKnowledge }"
      :title="t('system.scriptEditor.toolbar.knowledgeTitle')"
      @click="$emit('toggleKnowledge')"
    >
      📚 {{ t('system.scriptEditor.toolbar.knowledge') }}
    </button>
    <div class="toolbar-divider" />
    <button
      class="toolbar-btn toolbar-btn-save"
      :title="t('system.scriptEditor.toolbar.saveTitle')"
      @click="$emit('save')"
    >
      {{ t('system.scriptEditor.toolbar.save') }}
    </button>
    <span
      v-if="mode"
      class="toolbar-hint"
    >{{ modeLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import type { ScriptEditorMode } from '../ScriptEditor.types';
import { useScriptTemplates } from '../composables/useScriptTemplates';

const { t } = useI18n();

const props = defineProps<{
  mode: ScriptEditorMode;
  showKnowledge?: boolean;
}>();

const emit = defineEmits<{
  (e: 'format'): void;
  (e: 'toggleComment'): void;
  (e: 'insertSnippet', code: string): void;
  (e: 'save'): void;
  (e: 'toggleKnowledge'): void;
}>();

const { getQuickSnippets, getApiGroups } = useScriptTemplates(props.mode);
const snippets = getQuickSnippets();
const apiGroups = getApiGroups();

const modeLabel = computed(() => {
  const key = `system.scriptEditor.toolbar.mode.${props.mode}`;
  return t(key);
});

/**
 * 安全插入代码片段。
 * 使用 requestAnimationFrame + setTimeout 双重延迟，
 * 确保原生 select 下拉框已完全关闭，避免 editor.focus() 导致浏览器卡死。
 */
function safeInsertSnippet(code: string) {
  requestAnimationFrame(() => {
    setTimeout(() => {
      emit('insertSnippet', code);
    }, 20);
  });
}

function handleTemplateChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const code = target.value;
  if (code) {
    target.blur();
    target.value = '';
    safeInsertSnippet(code);
  }
}

function handleApiChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const code = target.value;
  if (code) {
    target.blur();
    target.value = '';
    safeInsertSnippet(code);
  }
}
</script>

<style scoped>
.script-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #0f172a;
  border: 1px solid #334155;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}
.toolbar-btn {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.toolbar-btn:hover {
  background: #334155;
}
.toolbar-btn--active {
  background: #3b82f6;
  border-color: #3b82f6;
}
.toolbar-btn-save {
  background: #10b981;
  border-color: #10b981;
}
.toolbar-btn-save:hover {
  background: #059669;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #334155;
  margin: 0 4px;
}
.toolbar-select {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.toolbar-hint {
  margin-left: auto;
  color: #64748b;
  font-size: 11px;
}
</style>