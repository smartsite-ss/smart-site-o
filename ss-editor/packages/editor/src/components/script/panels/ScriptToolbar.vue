<template>
  <div class="script-toolbar">
    <button
      class="toolbar-btn"
      :title="$t('system.scriptEditor.toolbar.formatTitle')"
      @click="$emit('format')"
    >
      {{ $t('system.scriptEditor.toolbar.format') }}
    </button>
    <button
      class="toolbar-btn"
      :title="$t('system.scriptEditor.toolbar.commentTitle')"
      @click="$emit('toggleComment')"
    >
      {{ $t('system.scriptEditor.toolbar.comment') }}
    </button>
    <div class="toolbar-divider" />
    <select
      v-model="templateValue"
      class="toolbar-select"
      :title="$t('system.scriptEditor.toolbar.templateTitle')"
    >
      <option value="">
        {{ $t('system.scriptEditor.toolbar.template') }}
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
      v-model="apiValue"
      class="toolbar-select"
      :title="$t('system.scriptEditor.toolbar.apiTitle')"
    >
      <option value="">
        {{ $t('system.scriptEditor.toolbar.api') }}
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
          :title="getApiTooltip(item)"
        >
          {{ item.label }}
        </option>
      </optgroup>
    </select>
    <button
      class="toolbar-btn"
      :class="{ 'toolbar-btn--active': showKnowledge }"
      :title="$t('system.scriptEditor.toolbar.knowledgeTitle')"
      @click="$emit('toggleKnowledge')"
    >
      📚 {{ $t('system.scriptEditor.toolbar.knowledge') }}
    </button>
    <div class="toolbar-divider" />
    <button
      class="toolbar-btn toolbar-btn-save"
      :title="$t('system.scriptEditor.toolbar.saveTitle')"
      @click="$emit('save')"
    >
      {{ $t('system.scriptEditor.toolbar.save') }}
    </button>
    <span
      v-if="mode"
      class="toolbar-hint"
    >{{ modeLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { i18n } from '@scada-editor/core';
import type { ScriptEditorMode } from '../ScriptEditor.types';
import { useScriptTemplates } from '../composables/useScriptTemplates';
import { getApiByName } from '../rules/script-api-registry';

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

/** 获取 API 的详细 tooltip 文本 */
function getApiTooltip(item: { name: string; label: string }): string {
  const api = getApiByName(item.name);
  if (!api) return item.label;
  const parts = [api.signature, '', api.description];
  if (api.notes) parts.push('', `${i18n.global.t('system.scriptEditor.toolbar.apiNote')}${api.notes}`);
  return parts.join('\n');
}

const modeLabel = computed(() => i18n.global.t(`system.scriptEditor.toolbar.mode.${props.mode}`));

// ── 模板 & API 选择：使用 v-model 替代原生 @change + DOM 操作 ──
const templateValue = ref('');
const apiValue = ref('');

watch(templateValue, (code) => {
  if (code) {
    emit('insertSnippet', code);
    nextTick(() => { templateValue.value = ''; });
  }
});

watch(apiValue, (code) => {
  if (code) {
    emit('insertSnippet', code);
    nextTick(() => { apiValue.value = ''; });
  }
});
</script>

<style scoped>
.script-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--background);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}
.toolbar-btn {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 3px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
.toolbar-btn:hover {
  background: var(--elevated);
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}
.toolbar-select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  min-width: 0;
}
.toolbar-select:last-of-type {
  max-width: 220px;
}
.toolbar-hint {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}
.toolbar-btn--active {
  background: var(--accent);
  color: var(--button-text);
  border-color: var(--accent);
}
.toolbar-btn-save {
  background: var(--status-success);
  color: var(--button-text);
  border-color: var(--status-success);
}
.toolbar-btn-save:hover {
  background: var(--button-hover, color-mix(in srgb, var(--status-success) 80%, black));
}

/* ── 响应式优化 ── */
/* 窗口缩小时，增大操作按钮便于点击，缩小 API 选择器宽度 */
@media (max-width: 1200px) {
  .toolbar-select:last-of-type {
    max-width: 160px;
  }
  .toolbar-hint {
    display: none;
  }
}

@media (max-width: 1000px) {
  .toolbar-btn {
    padding: 4px 12px;
    font-size: 13px;
  }
  .toolbar-select {
    font-size: 11px;
    padding: 3px 6px;
  }
  .toolbar-select:last-of-type {
    max-width: 120px;
  }
  .toolbar-divider {
    margin: 0 2px;
  }
}

@media (max-width: 700px) {
  .toolbar-btn {
    padding: 5px 14px;
  }
  .toolbar-select:first-of-type {
    max-width: 80px;
  }
  .toolbar-select:last-of-type {
    max-width: 90px;
  }
}
</style>