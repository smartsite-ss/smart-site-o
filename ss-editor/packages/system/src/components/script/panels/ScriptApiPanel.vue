<template>
  <div class="script-api-panel">
    <div class="api-header">
      <span class="api-title">{{ t('system.scriptEditor.api.title') }}</span>
      <input
        v-model="searchText"
        class="api-search"
        :placeholder="t('system.scriptEditor.api.searchPlaceholder')"
      >
    </div>
    <div class="api-list">
      <div
        v-for="(group, groupName) in filteredApis"
        :key="groupName"
        class="api-group"
      >
        <div class="api-group-title">
          {{ t(groupName) }}
        </div>
        <div
          v-for="api in group"
          :key="api.label"
          class="api-item"
          :title="api.documentation"
          @dblclick="$emit('insert', api.insertText)"
        >
          <span class="api-name">{{ api.label }}</span>
          <span class="api-detail">{{ api.detail }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { getCompletionsByMode } from '../utils/completionData';
import type { ScriptEditorMode, ScriptCompletionItem } from '../ScriptEditor.types';
const { t } = useI18n();

const props = defineProps<{
  mode: ScriptEditorMode;
}>();

defineEmits<{
  (e: 'insert', code: string): void;
}>();

const searchText = ref('');

const allApis = computed(() => {
  return getCompletionsByMode(props.mode);
});

const filteredApis = computed(() => {
  const groups: Record<string, ScriptCompletionItem[]> = {};

  const filtered = searchText.value
    ? allApis.value.filter((a) =>
        a.label.toLowerCase().includes(searchText.value.toLowerCase()) ||
        (a.documentation ?? '').toLowerCase().includes(searchText.value.toLowerCase()),
      )
    : allApis.value;

  for (const api of filtered) {
    const group = getGroupName(api.label);
    if (!groups[group]) groups[group] = [];
    groups[group].push(api);
  }

  return groups;
});

function getGroupName(label: string): string {
  if (label.startsWith('api.set')) return 'system.scriptEditor.api.groups.graphicOperation';
  if (label.includes('Alarm')) return 'system.scriptEditor.api.groups.alarmOperation';
  if (label.includes('Graphic')) return 'system.scriptEditor.api.groups.graphicLinkage';
  if (label.includes('http')) return 'system.scriptEditor.api.groups.httpRequest';
  if (label.includes('Tag')) return 'system.scriptEditor.api.groups.tagOperation';
  if (['api.round', 'api.clamp', 'api.mapRange', 'api.colorForValue', 'api.formatNumber', 'api.log'].includes(label)) return 'system.scriptEditor.api.groups.valueTool';
  if (['api.setTimeout', 'api.setInterval', 'api.clearTimeout', 'api.clearInterval'].includes(label)) return 'system.scriptEditor.api.groups.timer';
  if (label.startsWith('page.')) return 'system.scriptEditor.api.groups.pageOperation';
  if (label.startsWith('utils.')) return 'system.scriptEditor.api.groups.utility';
  if (label === 'data' || label === 'context' || label === 'event' || label === 'timer') return 'system.scriptEditor.api.groups.contextVar';
  if (label === 'return') return 'system.scriptEditor.api.groups.keyword';
  return 'system.scriptEditor.api.groups.other';
}
</script>

<style scoped>
.script-api-panel {
  border: 1px solid #334155;
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.api-header {
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}
.api-title {
  font-weight: 600;
  color: #e2e8f0;
  display: block;
  margin-bottom: 6px;
}
.api-search {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.api-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}
.api-group-title {
  color: #64748b;
  font-size: 11px;
  padding: 6px 8px 2px;
  font-weight: 600;
  text-transform: uppercase;
}
.api-item {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.api-item:hover {
  background: #334155;
}
.api-name {
  color: #4fc1ff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.api-detail {
  color: #64748b;
  font-size: 11px;
  margin-left: 8px;
  white-space: nowrap;
}
</style>