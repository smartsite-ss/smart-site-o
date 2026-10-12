<template>
  <div class="filter-script-editor">
    <div class="editor-header">
      <span class="hint-text">
        {{ $t('dataPanel.availableVariables') }}: <code>data</code>(原始数据), <code>res</code>({ tagId, tagName, quality, dataType, unit, ... })
      </span>
      <div class="btn-row">
        <button
          type="button"
          class="ds-btn ds-btn--xs"
          @click="loadTemplate"
        >
          {{ $t('dataPanel.loadExample') }}
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--xs ds-btn--primary"
          @click="testFilter"
        >
          {{ $t('dataPanel.testFilter') }}
        </button>
      </div>
    </div>

    <div class="code-block">
      <pre class="code-prefix"><code>{{ SKELETON_PREFIX }}</code></pre>
      <textarea
        v-model="localBody"
        class="code-body"
        rows="5"
        spellcheck="false"
        @input="onBodyChange"
      />
      <pre class="code-suffix"><code>{{ SKELETON_SUFFIX }}</code></pre>
    </div>

    <FilterPreviewPanel
      v-if="false"
      :input-data="testInput"
      :output-data="testOutput"
      :error-message="testError"
      :success-message="testSuccess ? $t('dataPanel.filterTestPassed', { elapsed: testElapsed }) : null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import FilterPreviewPanel from './FilterPreviewPanel.vue';
import type { DataSourceFetchResult } from '../../../../../../../system/src/stores/pageDataSource.store';

const SKELETON_PREFIX = `function filter(data, res) {`;

const DEFAULT_BODY = `  return data;`;

const SKELETON_SUFFIX = `}`;

const exampleBody = `  const num = Number(data);
  if (isNaN(num)) {
    return {
      number: 0,
      unit: res.unit || '',
      color: '#909399',
      text: String(data),
      raw: data
    };
  }

  return {
    number: num,
    unit: res.unit || '℃',
    color: num > 80 ? '#d03050'
         : num > 50 ? '#f0a020'
         : '#18a058',
    text: num.toFixed(1) + (res.unit || '℃'),
    raw: data
  };`;

const props = defineProps<{
  modelValue: string;
  fetchResult?: DataSourceFetchResult | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const localBody = ref(DEFAULT_BODY);
const testInput = ref<any>(null);
const testOutput = ref<any>(null);
const testError = ref<string | null>(null);
const testSuccess = ref(false);
const testElapsed = ref(0);

const fullScript = computed(() => SKELETON_PREFIX + '\n' + localBody.value + '\n' + SKELETON_SUFFIX);

function extractBody(script: string): string {
  if (!script || !script.includes('function filter')) return DEFAULT_BODY;

  const prefixLen = SKELETON_PREFIX.length;
  const remainder = script.slice(prefixLen);
  const lastBraceIdx = remainder.lastIndexOf('}');
  if (lastBraceIdx >= 0) {
    return remainder.slice(0, lastBraceIdx).trimEnd();
  }
  return DEFAULT_BODY;
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && val !== fullScript.value) {
      localBody.value = extractBody(val);
    }
  },
  { immediate: true },
);

function onBodyChange() {
  emit('update:modelValue', fullScript.value);
}

function loadTemplate() {
  localBody.value = exampleBody;
  emit('update:modelValue', fullScript.value);
}

// 当 fetchResult（手动获取 / 获取全部）更新时，自动运行过滤测试
watch(
  () => props.fetchResult?.timestamp,
  (newTs) => {
    if (newTs && localBody.value.trim()) {
      testFilter();
    }
  },
);

function testFilter() {
  testError.value = null;
  testSuccess.value = false;
  testInput.value = null;
  testOutput.value = null;

  if (!localBody.value.trim()) {
    testError.value = i18n.global.t('dataPanel.pleaseInputFilterScript');
    return;
  }

  // 优先使用 fetchResult（手动获取 / 获取全部 驱动）中的真实数据
  const items = props.fetchResult?.items;
  const hasRealData = items && items.length > 0;

  let testCases: Array<{ data: any; res: Record<string, any> }>;

  if (hasRealData) {
    testCases = items!.map((item) => ({
      data: item.value,
      res: {
        tagId: item.tagId,
        quality: item.quality,
        dataType: item.dataType,
      },
    }));
  } else {
    // 无真实数据时回退到模拟数据
    const testRes = {
      tagId: 'tag_001',
      tagName: '温度传感器1',
      quality: 'good',
      dataType: 'float64',
      unit: '℃',
      minValue: 0,
      maxValue: 100,
    };
    testCases = [{ data: 25.5, res: testRes }];
  }

  const start = performance.now();
  try {
    const code = fullScript.value;
    const fnBody = code;
    let filterFn: (...args: any[]) => any;

    if (fnBody.includes('function filter')) {
      const fullCode = `${fnBody}\nreturn filter;`;
      filterFn = new Function(fullCode)();
    } else {
      filterFn = new Function('data', 'res', fnBody) as (...args: any[]) => any;
    }

    const results = testCases.map(({ data, res }) => {
      try {
        return filterFn(data, res);
      } catch (e: any) {
        return { __error: e.message, __input: { data, res } };
      }
    });

    testInput.value = testCases;
    testOutput.value = results.length === 1 ? results[0] : results;
    testSuccess.value = true;
    testElapsed.value = Math.round(performance.now() - start);
  } catch (e: any) {
    testError.value = i18n.global.t('dataPanel.scriptExecutionError', { message: e.message });
  }
}
</script>

<style scoped>
@import '../../../../../panels/styles/data-panel-theme.scss';

.filter-script-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.hint-text {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.hint-text code {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10.5px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.btn-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.code-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.code-prefix,
.code-suffix {
  margin: 0;
  padding: 7px 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--text-secondary) 4%, var(--surface)), color-mix(in srgb, var(--text-secondary) 2%, var(--surface)));
  color: var(--text-secondary);
  white-space: pre;
  overflow-x: auto;
  user-select: none;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  line-height: 1.55;
}

.code-suffix {
  border-bottom: none;
  border-top: 1px solid var(--border);
}

.code-prefix code,
.code-suffix code {
  background: transparent;
  padding: 0;
  font-size: inherit;
  color: inherit;
}

.code-body {
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 0;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  resize: vertical;
  min-height: 60px;
  background: var(--surface);
  color: var(--text);
  tab-size: 2;

  &:focus {
    background: color-mix(in srgb, var(--primary) 2%, var(--surface));
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 8%, transparent);
  }
}
</style>