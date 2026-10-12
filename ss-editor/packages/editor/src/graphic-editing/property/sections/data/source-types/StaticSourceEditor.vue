<template>
  <div class="static-source-editor">
    <div class="form-item">
      <label>{{ $t('sourceEditor.dataContent') }}</label>
      <textarea
        v-model="jsonContent"
        placeholder="{&quot;variables&quot;: [{&quot;tagId&quot;: &quot;st_001&quot;, &quot;tagName&quot;: &quot;Default Threshold&quot;, &quot;value&quot;: 80, &quot;dataType&quot;: &quot;float&quot;}]}"
        :rows="8"
        @input="onJsonChange"
      />
    </div>

    <div class="btn-row">
      <button
        type="button"
        @click="formatJson"
      >
        {{ $t('sourceEditor.formatJson') }}
      </button>
      <button
        type="button"
        @click="validateJson"
      >
        {{ $t('sourceEditor.validateJson') }}
      </button>
    </div>

    <div
      v-if="jsonError"
      class="json-error"
    >
      {{ jsonError }}
    </div>

    <div
      v-if="parsedVariables.length > 0"
      class="preview-section"
    >
      <span class="preview-title">
        {{ $t('sourceEditor.parseResult') }}
      </span>
      <table>
        <thead>
          <tr>
            <th>{{ $t('sourceEditor.tagId') }}</th>
            <th>{{ $t('sourceEditor.tagName') }}</th>
            <th>{{ $t('sourceEditor.value') }}</th>
            <th>{{ $t('sourceEditor.type') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="v in parsedVariables"
            :key="v.tagId"
          >
            <td>{{ v.tagId }}</td>
            <td>{{ v.tagName }}</td>
            <td>{{ displayValue(v.value) }}</td>
            <td>{{ v.dataType }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { showSuccess, showError } from '../../../../../utils/messageBox';
import type { DataSourceConfig } from '../../../../../../../system/src/api/modules/dataSource.api';
import { useSourceEditor } from './useSourceEditor';

interface StaticVariable {
  tagId: string;
  tagName: string;
  value: string | number | boolean;
  dataType: 'int' | 'float' | 'string' | 'bool';
}

function mapJsTypeToStaticType(jsType: string): StaticVariable['dataType'] {
  switch (jsType) {
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'string':
    default:
      return 'string';
  }
}

const props = defineProps<{
  form: DataSourceConfig;
  typeData: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update', data: Record<string, any>): void;
}>();

const { t, syncedRef, emitUpdate } = useSourceEditor();

const jsonContent = syncedRef(() => props.typeData, { getValue: (td) => td?.jsonContent, fallback: '' });
const jsonError = ref<string | null>(null);
const parsedVariables = syncedRef(() => props.typeData, { getValue: (td) => td?.variables, fallback: [] });

function onJsonChange() {
  jsonError.value = null;
  parseJson();
  syncData();
}

function parseJson() {
  if (!jsonContent.value.trim()) {
    parsedVariables.value = [];
    return;
  }
  try {
    const parsed = JSON.parse(jsonContent.value);
    const vars = parsed?.variables ?? parsed;
    if (Array.isArray(vars)) {
      parsedVariables.value = vars.map((v: any) => ({
        tagId: v.tagId ?? '',
        tagName: v.tagName ?? '',
        value: v.value,
        dataType: v.dataType ?? 'string',
      }));
    } else {
      if (vars !== null && typeof vars === 'object' && !Array.isArray(vars)) {
        parsedVariables.value = Object.entries(vars as Record<string, any>).map(([key, value]) => ({
          tagId: key,
          tagName: key,
          value,
          dataType: mapJsTypeToStaticType(typeof value),
        }));
      } else {
        parsedVariables.value = [];
      }
    }
  } catch (e: any) {
    parsedVariables.value = [];
    jsonError.value = `${t('sourceEditor.jsonFormatError')} ${e.message}`;
  }
}

function formatJson() {
  try {
    const parsed = JSON.parse(jsonContent.value || '{}');
    jsonContent.value = JSON.stringify(parsed, null, 2);
    showSuccess(t('sourceEditor.formatSuccess') || '格式化成功');
  } catch {
    jsonError.value = t('sourceEditor.cannotFormat');
    showError(t('sourceEditor.cannotFormat') || '无法格式化：JSON 格式错误');
  }
}

function validateJson() {
  jsonError.value = null;
  try {
    JSON.parse(jsonContent.value || '{}');
    parseJson();
    showSuccess(t('sourceEditor.validationSuccess') || 'JSON 校验通过');
  } catch (e: any) {
    jsonError.value = `${t('sourceEditor.jsonValidationFailed')} ${e.message}`;
    showError(`${t('sourceEditor.jsonValidationFailed') || 'JSON 校验失败:'} ${e.message}`);
  }
}

function syncData() {
  emitUpdate(emit, {
    jsonContent: jsonContent.value,
    variables: parsedVariables.value,
  });
}

function displayValue(v: any): string {
  if (v === null || v === undefined) return '--';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

parseJson();
syncData();
</script>

<style scoped src="./source-editor-shared.css"></style>
<style scoped>
.static-source-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.json-error {
  color: var(--status-error, #d03050);
  font-size: 12px;
  padding: 4px 8px;
  background-color: color-mix(in srgb, var(--status-error, #d03050) 8%, transparent);
  border-radius: 4px;
}

.preview-section {
  margin-top: 4px;
}

.preview-title {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>