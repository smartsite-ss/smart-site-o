<template>
  <div class="tag-binding-editor">
    <div class="bind-section">
      <div class="section-title">{{ labels?.title ?? $t('tagBinding.title') }}</div>

      <!-- flat：单变量平铺字段 -->
      <div
        v-if="mode === 'flat'"
        class="bind-row"
      >
        <span class="bind-value">{{ flatLabel || (labels?.unbound ?? $t('tagBinding.unbound')) }}</span>
        <button
          type="button"
          class="bind-btn"
          @click="selectorVisible = true"
        >
          {{ labels?.select ?? $t('tagBinding.selectVariable') }}
        </button>
        <button
          v-if="current?.tagId"
          type="button"
          class="bind-btn bind-btn--clear"
          @click="emit('clear')"
        >
          {{ labels?.clear ?? $t('tagBinding.clear') }}
        </button>
      </div>

      <!-- single / multiple：tags 数组 -->
      <template v-else>
        <div
          v-if="tags.length === 0"
          class="bind-empty"
        >
          {{ labels?.unbound ?? $t('tagBinding.unbound') }}
        </div>
        <div
          v-for="(item, index) in tags"
          :key="item.tagId"
          class="bind-item"
        >
          <span
            v-if="withStyle"
            class="bind-dot"
            :style="{ background: dotColor(item) }"
          />
          <span class="bind-label">{{ itemLabel(item) }}</span>
          <button
            type="button"
            class="bind-remove"
            :title="labels?.remove ?? $t('tagBinding.removeVariable')"
            @click="emit('remove', index)"
          >×</button>
        </div>
        <button
          type="button"
          class="bind-add"
          @click="selectorVisible = true"
        >
          {{ labels?.add ?? $t('tagBinding.addVariable') }}
        </button>
      </template>
    </div>

    <TagVariableSelector
      v-model:visible="selectorVisible"
      :project-id="projectId"
      @select="onSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChartTagBinding } from '@scada-editor/shared';
import type { TagBindingItem } from '../../composables/useTagBinding';
import TagVariableSelector from './TagVariableSelector.vue';
import type { SelectableVariable } from './types';

interface BindingLabels {
  title?: string;
  add?: string;
  remove?: string;
  select?: string;
  clear?: string;
  unbound?: string;
}

const props = withDefaults(
  defineProps<{
    mode: 'flat' | 'single' | 'multiple';
    projectId: string;
    tags?: TagBindingItem[];
    current?: { deviceCode?: string; deviceName?: string; tagId?: string; tagName?: string } | null;
    withStyle?: boolean;
    labels?: BindingLabels;
  }>(),
  {
    tags: () => [],
    current: null,
    withStyle: false,
    labels: undefined,
  },
);

const emit = defineEmits<{
  (e: 'add', variable: SelectableVariable): void;
  (e: 'remove', index: number): void;
  (e: 'clear'): void;
}>();

const selectorVisible = ref(false);

function itemLabel(item: { deviceName?: string; deviceCode?: string; tagName?: string; tagId?: string } | null): string {
  if (!item) return '';
  const device = item.deviceName || item.deviceCode || '';
  const tag = item.tagName || item.tagId || '';
  return device ? `${device}.${tag}` : tag;
}

const flatLabel = computed(() => itemLabel(props.current));

function dotColor(item: TagBindingItem): string {
  return (item as ChartTagBinding).style?.lineStyle?.color ?? '#4dabf7';
}

function onSelect(variable: SelectableVariable) {
  emit('add', variable);
}
</script>

<style scoped>
.tag-binding-editor {
  display: flex;
  flex-direction: column;
}

.bind-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #dddddd);
}

.section-title {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bind-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.bind-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-primary, #333333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bind-empty {
  padding: 6px 0;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}

.bind-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.bind-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bind-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-primary, #333333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bind-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-primary, #333333);
  cursor: pointer;
}

.bind-btn:hover {
  background: var(--background, #f5f5f5);
}

.bind-btn--clear {
  color: var(--status-error, #d03050);
}

.bind-btn--clear:hover {
  border-color: var(--status-error, #d03050);
}

.bind-remove {
  width: 20px;
  height: 20px;
  line-height: 1;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #666666);
  cursor: pointer;
  font-size: 16px;
}

.bind-remove:hover {
  background: var(--background, #f5f5f5);
  color: var(--status-error, #d03050);
}

.bind-add {
  margin-top: 6px;
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-primary, #333333);
  cursor: pointer;
}

.bind-add:hover {
  background: var(--background, #f5f5f5);
}
</style>
