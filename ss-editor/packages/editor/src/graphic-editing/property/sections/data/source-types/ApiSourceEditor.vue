<template>
  <div class="api-source-editor">
    <div class="section-header">
      {{ $t('sourceEditor.requestConfig') }}
    </div>

    <div class="form-row">
      <div class="form-item form-item-flex">
        <label class="required">{{ $t('sourceEditor.apiUrl') }}</label>
        <input
          v-model="localUrl"
          placeholder="https://api.example.com/v1/points"
          @input="syncData"
        >
      </div>

      <div class="form-item form-item-method">
        <label>{{ $t('sourceEditor.requestMethod') }}</label>
        <select
          v-model="localMethod"
          @change="syncData"
        >
          <option
            v-for="opt in methodOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="section-header">
      {{ $t('sourceEditor.requestHeaders') }}
    </div>

    <div class="kv-list">
      <div
        v-for="(h, idx) in headersList"
        :key="idx"
        class="kv-row"
      >
        <input
          v-model="h.key"
          placeholder="Header Key"
          @input="syncData"
        >
        <input
          v-model="h.value"
          placeholder="Header Value"
          @input="syncData"
        >
        <button
          type="button"
          class="btn-remove"
          @click="removeHeader(idx)"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        class="btn-add"
        @click="addHeader"
      >
        {{ $t('sourceEditor.addHeader') }}
      </button>
    </div>

    <div class="section-header">
      {{ $t('sourceEditor.queryParams') }}
    </div>

    <div class="kv-list">
      <div
        v-for="(p, idx) in queryParamsList"
        :key="idx"
        class="kv-row"
      >
        <input
          v-model="p.key"
          placeholder="Key"
          @input="syncData"
        >
        <input
          v-model="p.value"
          placeholder="Value"
          @input="syncData"
        >
        <button
          type="button"
          class="btn-remove"
          @click="removeQueryParam(idx)"
        >
          ×
        </button>
      </div>
      <button
        type="button"
        class="btn-add"
        @click="addQueryParam"
      >
        {{ $t('sourceEditor.addParam') }}
      </button>
    </div>

    <template v-if="localMethod === 'POST'">
      <div class="section-header">
        {{ $t('sourceEditor.requestBody') }}
      </div>
      <div class="form-item">
        <textarea
          v-model="localBody"
          placeholder="{&quot;tagIds&quot;: [&quot;temp_001&quot;, &quot;press_001&quot;]}"
          :rows="4"
          @input="syncData"
        />
      </div>
    </template>

    <div class="section-header">
      {{ $t('sourceEditor.responseMapping') }}
    </div>

    <div class="form-item">
      <label>{{ $t('sourceEditor.dataPath') }}</label>
      <input
        v-model="localDataPath"
        placeholder="data.values (JSONPath)"
        @input="syncData"
      >
    </div>

    <div class="field-mapping-table">
      <table>
        <thead>
          <tr>
            <th>{{ $t('sourceEditor.tagId') }}</th>
            <th>{{ $t('sourceEditor.responseFieldPath') }}</th>
            <th>{{ $t('sourceEditor.dataType') }}</th>
            <th>{{ $t('sourceEditor.scale') }}</th>
            <th>{{ $t('sourceEditor.operation') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(m, idx) in fieldMappings"
            :key="idx"
          >
            <td>
              <input
                v-model="m.tagId"
                placeholder="tag_001"
                @input="syncData"
              >
            </td>
            <td>
              <input
                v-model="m.jsonPath"
                placeholder="temperature"
                @input="syncData"
              >
            </td>
            <td>
              <select
                v-model="m.dataType"
                @change="syncData"
              >
                <option
                  v-for="opt in dataTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td>
              <input
                v-model.number="m.scale"
                type="number"
                :min="0.01"
                :step="0.1"
                class="input-narrow"
                @input="syncData"
              >
            </td>
            <td>
              <button
                type="button"
                class="btn-remove"
                @click="removeFieldMapping(idx)"
              >
                ×
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        class="btn-add add-mapping-btn"
        @click="addFieldMapping"
      >
        {{ $t('sourceEditor.addFieldMapping') }}
      </button>
    </div>

    <div class="btn-row action-row">
      <button
        type="button"
        class="btn-primary"
        :disabled="previewLoading"
        @click="previewResponse"
      >
        {{ previewLoading ? $t('sourceEditor.loading') : $t('sourceEditor.previewResponse') }}
      </button>
      <button
        type="button"
        :disabled="resolvedPreview === null"
        @click="autoGenerateMappings"
      >
        {{ $t('sourceEditor.autoGenerateMapping') }}
      </button>
      <button
        type="button"
        @click="testConnection"
      >
        {{ $t('sourceEditor.testConnection') }}
      </button>
    </div>

    <div
      v-if="previewError"
      class="json-error"
    >
      {{ previewError }}
    </div>

    <div
      v-if="responsePreview"
      class="response-preview"
    >
      <div class="section-header">
        {{ $t('sourceEditor.responsePreview') }}
      </div>
      <pre>{{ responsePreview }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { showSuccess, showError } from '../../../../../utils/messageBox';
import type { DataSourceConfig } from '../../../../../../../system/src/api/modules/dataSource.api';
import { useSourceEditor } from './useSourceEditor';

interface HeaderRow {
  key: string;
  value: string;
}

interface FieldMapping {
  tagId: string;
  tagName: string;
  jsonPath: string;
  dataType: 'int' | 'float' | 'string' | 'bool';
  scale: number;
  offset: number;
}

const props = defineProps<{
  form: DataSourceConfig;
  typeData: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update', data: Record<string, any>): void;
}>();

const { t, syncedRef, emitUpdate } = useSourceEditor();

const localUrl = syncedRef(() => props.typeData, {
  getValue: (td) => td?.url ?? props.form?.url,
  fallback: '',
});
const localMethod = syncedRef(() => props.typeData, {
  getValue: (td) => td?.method ?? props.form?.method,
  fallback: 'GET',
});
const localBody = syncedRef(() => props.typeData, { getValue: (td) => td?.body, fallback: '' });
const localDataPath = syncedRef(() => props.typeData, { getValue: (td) => td?.dataPath, fallback: '' });

const headersList = ref<HeaderRow[]>(
  props.typeData?.headersList
    ?? Object.entries(props.form?.headers ?? {}).map(([k, v]) => ({ key: k, value: String(v) }))
    ?? [],
);

const queryParamsList = ref<HeaderRow[]>(props.typeData?.queryParams ?? []);
const fieldMappings = ref<FieldMapping[]>(props.typeData?.fieldMappings ?? []);

const previewLoading = ref(false);
const previewError = ref<string | null>(null);
const responsePreview = ref('');
const resolvedPreview = ref<unknown>(null);

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
];

const dataTypeOptions = [
  { label: 'int', value: 'int' },
  { label: 'float', value: 'float' },
  { label: 'string', value: 'string' },
  { label: 'bool', value: 'bool' },
];

function addHeader() {
  headersList.value.push({ key: '', value: '' });
  syncData();
}

function removeHeader(idx: number) {
  headersList.value.splice(idx, 1);
  syncData();
}

function addQueryParam() {
  queryParamsList.value.push({ key: '', value: '' });
  syncData();
}

function removeQueryParam(idx: number) {
  queryParamsList.value.splice(idx, 1);
  syncData();
}

function addFieldMapping() {
  fieldMappings.value.push({
    tagId: '',
    tagName: '',
    jsonPath: '',
    dataType: 'float',
    scale: 1,
    offset: 0,
  });
  syncData();
}

function removeFieldMapping(idx: number) {
  fieldMappings.value.splice(idx, 1);
  syncData();
}

function syncData() {
  const headers: Record<string, string> = {};
  for (const h of headersList.value) {
    if (h.key) headers[h.key] = h.value;
  }
  emitUpdate(emit, {
    url: localUrl.value,
    method: localMethod.value,
    headers,
    headersList: headersList.value,
    body: localBody.value,
    dataPath: localDataPath.value,
    queryParams: queryParamsList.value,
    fieldMappings: fieldMappings.value,
  });
}

function buildRequest(): { url: string; options: RequestInit } {
  const headers: Record<string, string> = {};
  for (const h of headersList.value) {
    if (h.key) headers[h.key] = h.value;
  }
  const query: Record<string, string> = {};
  for (const p of queryParamsList.value) {
    if (p.key) query[p.key] = p.value;
  }
  const url = new URL(localUrl.value);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  const options: RequestInit = { method: localMethod.value, headers };
  if (localMethod.value === 'POST' && localBody.value) {
    options.body = localBody.value;
  }
  return { url: url.toString(), options };
}

async function testConnection() {
  if (!localUrl.value) {
    showError(t('sourceEditor.apiUrlRequired') || '请输入接口地址');
    return;
  }
  try {
    const { url, options } = buildRequest();
    const res = await fetch(url, options);
    if (res.ok) {
      showSuccess(t('sourceEditor.testConnectionSuccess') || '连接成功');
    } else {
      showError((t('sourceEditor.testConnectionFailed') || '连接失败') + `: HTTP ${res.status}`);
    }
  } catch (err: any) {
    showError((t('sourceEditor.testConnectionFailed') || '连接失败') + ': ' + err.message);
  }
}

function resolvePath(data: unknown, path: string): unknown {
  if (!path || data === null || typeof data !== 'object') return data;
  let current: any = data;
  for (const part of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function inferDataType(value: unknown): FieldMapping['dataType'] {
  if (typeof value === 'number') return 'float';
  if (typeof value === 'boolean') return 'bool';
  return 'string';
}

function flattenLeaves(obj: unknown, prefix = ''): Array<{ path: string; value: unknown }> {
  const result: Array<{ path: string; value: unknown }> = [];
  if (obj === null || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenLeaves(value, path));
    } else {
      result.push({ path, value });
    }
  }
  return result;
}

async function previewResponse() {
  if (!localUrl.value) {
    showError(t('sourceEditor.apiUrlRequired') || '请输入接口地址');
    return;
  }
  previewLoading.value = true;
  previewError.value = null;
  try {
    const { url, options } = buildRequest();
    const res = await fetch(url, options);
    const text = await res.text();
    responsePreview.value = text;
    if (!res.ok) {
      previewError.value = `HTTP ${res.status}`;
      resolvedPreview.value = null;
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      previewError.value = t('sourceEditor.responseNotJson') || '响应不是合法 JSON';
      resolvedPreview.value = null;
      return;
    }
    resolvedPreview.value = localDataPath.value ? resolvePath(json, localDataPath.value) : json;
  } catch (err: any) {
    previewError.value = err.message;
    resolvedPreview.value = null;
  } finally {
    previewLoading.value = false;
  }
}

function autoGenerateMappings() {
  const data = resolvedPreview.value;
  let source: unknown = data;
  if (Array.isArray(data)) {
    source = data.length > 0 ? data[0] : null;
  }
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    showError(t('sourceEditor.noMappingGenerated') || '未解析出可映射的字段');
    return;
  }
  const leaves = flattenLeaves(source);
  if (leaves.length === 0) {
    showError(t('sourceEditor.noMappingGenerated') || '未解析出可映射的字段');
    return;
  }
  const existingPaths = new Set(fieldMappings.value.map((m) => m.jsonPath));
  let added = 0;
  for (const leaf of leaves) {
    if (existingPaths.has(leaf.path)) continue;
    fieldMappings.value.push({
      tagId: leaf.path.replace(/\./g, '_'),
      tagName: leaf.path,
      jsonPath: leaf.path,
      dataType: inferDataType(leaf.value),
      scale: 1,
      offset: 0,
    });
    existingPaths.add(leaf.path);
    added++;
  }
  syncData();
  showSuccess(`${t('sourceEditor.autoGenerateSuccess') || '已生成字段映射'} (${added})`);
}

syncData();
</script>

<style scoped src="./source-editor-shared.css"></style>
<style scoped>
.api-source-editor {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

select {
  cursor: pointer;
}

.input-narrow {
  width: 70px;
}

.btn-add {
  padding: 2px 8px;
  font-size: 11px;
  border-style: dashed;
}

.btn-remove {
  padding: 0 6px;
  font-size: 14px;
  line-height: 1;
  border: none;
  background: transparent;
  color: var(--status-error, #d03050);
  flex-shrink: 0;
}

.btn-remove:hover {
  background: color-mix(in srgb, var(--status-error, #d03050) 12%, transparent);
}

.kv-row {
  align-items: center;
  gap: 6px;
}

.kv-row > :first-child,
.kv-row > :nth-child(2) {
  flex: 1;
  min-width: 0;
}

.field-mapping-table {
  margin-top: 4px;
}

.json-error {
  color: var(--status-error, #d03050);
  font-size: 12px;
  padding: 4px 8px;
  background-color: color-mix(in srgb, var(--status-error, #d03050) 8%, transparent);
  border-radius: 4px;
}

.response-preview {
  margin-top: 4px;
  max-height: 200px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px;
  background: var(--background);
}

.response-preview pre {
  margin: 0;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-secondary);
}
</style>