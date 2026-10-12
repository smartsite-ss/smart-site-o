<template>
  <div class="chart-data-source-editor">
    <label class="cds-field">
      <span class="cds-label">数据源类型</span>
      <select
        :value="modelValue.type"
        @change="onTypeChange"
      >
        <option value="static">静态</option>
        <option value="api">API</option>
        <option value="database">数据库（变量）</option>
      </select>
    </label>

    <template v-if="modelValue.type === 'static'">
      <label class="cds-field">
        <span class="cds-label">维度（逗号分隔）</span>
        <input
          type="text"
          :value="staticDimensionsText"
          @change="onDimensionsChange"
        >
      </label>
      <label class="cds-field">
        <span class="cds-label">数据（JSON 数组）</span>
        <textarea
          :value="staticSourceText"
          rows="6"
          @change="onSourceChange"
        />
      </label>
      <p
        v-if="staticError"
        class="cds-error"
      >{{ staticError }}</p>
    </template>

    <template v-else-if="modelValue.type === 'api'">
      <label class="cds-field">
        <span class="cds-label">请求地址</span>
        <input
          type="text"
          :value="apiConfig.url"
          @change="onApiFieldChange('url', $event)"
        >
      </label>
      <label class="cds-field">
        <span class="cds-label">请求方法</span>
        <select
          :value="apiConfig.method"
          @change="onApiFieldChange('method', $event)"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </label>
      <label class="cds-field">
        <span class="cds-label">数据路径（如 data.list）</span>
        <input
          type="text"
          :value="apiConfig.dataPath || ''"
          @change="onApiFieldChange('dataPath', $event)"
        >
      </label>
      <label class="cds-field">
        <span class="cds-label">分类字段</span>
        <input
          type="text"
          :value="apiConfig.mapping?.categoryField || 'name'"
          @change="onApiMappingChange('categoryField', $event)"
        >
      </label>
      <label class="cds-field">
        <span class="cds-label">数值字段</span>
        <input
          type="text"
          :value="apiConfig.mapping?.valueField || 'value'"
          @change="onApiMappingChange('valueField', $event)"
        >
      </label>
    </template>

    <p
      v-else
      class="cds-hint"
    >数据库（变量）数据源请在「变量绑定」区域选择标签变量。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  ChartDataSourceConfig,
  StaticSourceConfig,
  ApiSourceConfig,
} from './data-source';

const props = defineProps<{ modelValue: ChartDataSourceConfig }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: ChartDataSourceConfig): void }>();

const staticError = ref('');

const staticConfig = computed<StaticSourceConfig>(
  () => props.modelValue.staticConfig ?? { dimensions: ['name', 'value'], source: [] },
);
const apiConfig = computed<ApiSourceConfig>(
  () =>
    props.modelValue.apiConfig ?? {
      url: '',
      method: 'GET',
      mapping: { dimensions: ['name', 'value'], categoryField: 'name', valueField: 'value' },
    },
);

const staticDimensionsText = computed(() => staticConfig.value.dimensions.join(', '));
const staticSourceText = computed(() => JSON.stringify(staticConfig.value.source, null, 2));

function emitStatic(next: StaticSourceConfig) {
  emit('update:modelValue', { ...props.modelValue, type: 'static', staticConfig: next });
}

function onTypeChange(event: Event) {
  const type = (event.target as HTMLSelectElement).value as ChartDataSourceConfig['type'];
  if (type === 'static') {
    emit('update:modelValue', {
      ...props.modelValue,
      type,
      staticConfig: staticConfig.value,
    });
  } else if (type === 'api') {
    emit('update:modelValue', { ...props.modelValue, type, apiConfig: apiConfig.value });
  } else {
    emit('update:modelValue', { ...props.modelValue, type });
  }
}

function onDimensionsChange(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  const dimensions = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  emitStatic({ ...staticConfig.value, dimensions });
}

function onSourceChange(event: Event) {
  const raw = (event.target as HTMLTextAreaElement).value;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      staticError.value = '数据必须是 JSON 数组';
      return;
    }
    staticError.value = '';
    emitStatic({ ...staticConfig.value, source: parsed });
  } catch (error) {
    staticError.value = error instanceof Error ? error.message : String(error);
  }
}

function onApiFieldChange(field: 'url' | 'method' | 'dataPath', event: Event) {
  const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'api',
    apiConfig: { ...apiConfig.value, [field]: value },
  });
}

function onApiMappingChange(field: 'categoryField' | 'valueField', event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', {
    ...props.modelValue,
    type: 'api',
    apiConfig: {
      ...apiConfig.value,
      mapping: { ...apiConfig.value.mapping, [field]: value },
    },
  });
}
</script>

<style scoped>
.chart-data-source-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.cds-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
}

.cds-label {
  color: var(--text-secondary, #666666);
  font-size: 11px;
}

.cds-field input,
.cds-field select,
.cds-field textarea {
  width: 100%;
  padding: 4px 6px;
  box-sizing: border-box;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-primary, #333333);
}

.cds-field textarea {
  font-family: Consolas, Monaco, monospace;
  resize: vertical;
}

.cds-error {
  margin: 0;
  font-size: 11px;
  color: var(--status-error, #d03050);
}

.cds-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}
</style>
