<template>
  <div class="fetch-panel">
    <div class="fetch-toolbar">
      <div class="btn-group">
        <button
          type="button"
          class="btn-primary"
          :disabled="isLoading"
          @click="handleFetchAll"
        >
          <span
            v-if="isLoading"
            class="btn-spinner"
          />
          {{ $t('dataPanel.fetchAll') }}
        </button>
      </div>
      <span
        v-if="lastFetchTime"
        class="text-secondary fetch-time"
      >
        {{ $t('dataPanel.lastFetch') }}: {{ lastFetchTime }}
      </span>
    </div>

    <div
      v-if="fetchError"
      class="fetch-error"
    >
      {{ fetchError }}
    </div>

    <div
      v-if="fetchResults.length > 0"
      class="fetch-results"
    >
      <div class="results-title">
        {{ $t('dataPanel.fetchResult') }}
        <span class="results-source">— {{ sourceLabel }}</span>
      </div>
      <div class="results-list">
        <div
          v-for="item in fetchResults"
          :key="item.tagId"
          class="result-item"
        >
          <span class="result-tag-id">{{ item.tagId }}</span>
          <span class="result-arrow">▶</span>
          <span class="result-value">{{ item.value }}</span>
          <span
            class="quality-dot"
            :style="{ backgroundColor: getQualityColor(item.quality) }"
          />
          <span class="result-quality">{{ item.quality }}</span>
          <span class="result-time">{{ item.time }}</span>
        </div>
      </div>

      <div
        v-if="rawDataJson"
        class="raw-data-section"
      >
        <div
          class="raw-data-toggle"
          @click="showRawData = !showRawData"
        >
          <span class="toggle-icon">{{ showRawData ? '▼' : '▶' }}</span>
          <span class="toggle-label">{{ $t('dataPanel.rawData') }}</span>
        </div>
        <pre
          v-show="showRawData"
          class="raw-data-content"
        >{{ rawDataJson }}</pre>
      </div>
    </div>

    <div
      v-if="isLoading && fetchResults.length === 0"
      class="fetch-loading"
    >
      <div class="spinner" />
    </div>

    <div
      v-if="!isLoading && fetchResults.length === 0 && !fetchError"
      class="fetch-empty"
    >
      <span class="text-secondary">
        {{ $t('dataPanel.fetchHint') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n, i18n } from '@scada-editor/core';
import { usePageDataSourceStore } from '../../../../../../system/src/stores/pageDataSource.store';
import { getQualityColor } from './sourceMeta';

defineProps<{
  dataSourceId?: string;
}>();

const emit = defineEmits<{
  (e: 'fetch'): void;
}>();

useI18n();

const pageDsStore = usePageDataSourceStore();

const showRawData = ref(false);

const isLoading = computed(() => pageDsStore.fetchLoading);

const fetchResults = computed(() => {
  const result = pageDsStore.currentFetchResult;
  if (!result || !result.items) return [];
  return result.items.map((item) => ({
    tagId: item.tagId,
    value: formatValue(item.value),
    quality: item.quality,
    time: item.time,
  }));
});

const rawDataJson = computed(() => {
  const result = pageDsStore.currentFetchResult;
  if (!result?.rawData) return null;
  try {
    return JSON.stringify(result.rawData, null, 2);
  } catch {
    return null;
  }
});

const sourceLabel = computed(() => {
  const result = pageDsStore.currentFetchResult;
  if (!result) return '';
  const t = (k: string) => i18n.global.t(k);
  const labels: Record<string, string> = { static: t('dataPanel.sourceTypeStatic'), tag: t('dataPanel.sourceTypeTag'), api: 'API', sql: t('dataPanel.sourceTypeDb') };
  return `${result.sourceName} (${labels[result.sourceType] ?? result.sourceType})`;
});

const fetchError = computed(() => pageDsStore.fetchError);
const lastFetchTime = computed(() => {
  const result = pageDsStore.currentFetchResult;
  if (!result?.timestamp) return null;
  return new Date(result.timestamp).toLocaleTimeString();
});

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '[Object]';
    }
  }
  return String(v);
}

function handleFetchAll() {
  emit('fetch');
}
</script>

<style scoped>
.fetch-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fetch-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fetch-time {
  font-size: 11.5px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.fetch-error {
  color: var(--color-error, #ef4444);
  font-size: 11.5px;
  padding: 7px 10px;
  background-color: color-mix(in srgb, #ef4444 6%, transparent);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, #ef4444 15%, transparent);
  font-weight: 500;
}

.fetch-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.results-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.results-source {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 8px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--background) 50%, transparent), transparent);
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 7px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  transition: background-color 0.1s ease;

  &:hover { background-color: color-mix(in srgb, var(--primary) 3%, transparent); }

  &:last-child { border-bottom: none; }
}

.result-tag-id {
  font-weight: 600;
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11.5px;
  min-width: 80px;
}

.result-arrow {
  color: var(--text-tertiary);
  font-size: 9px;
}

.result-value {
  color: var(--primary, #2080f0);
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11.5px;
}

.quality-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.result-quality {
  color: var(--text-secondary);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-time {
  color: var(--text-tertiary);
  font-size: 10.5px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.raw-data-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}

.raw-data-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11.5px;
  color: var(--text-secondary);
  user-select: none;
  transition: color 0.12s ease;

  &:hover { color: var(--primary); }
}

.toggle-icon { font-size: 10px; transition: transform 0.15s ease; }
.toggle-label { font-size: 11.5px; }

.raw-data-content {
  margin-top: 6px;
  padding: 10px 12px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 60%, var(--background)), var(--surface));
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11.5px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace;
  line-height: 1.55;
  max-height: 200px;
  overflow: auto;
  white-space: pre;
  color: var(--text);

  &::-webkit-scrollbar { width: 4px; height: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
}

.fetch-loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.fetch-empty {
  padding: 16px 0;
  text-align: center;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.btn-primary {
  background: linear-gradient(135deg, #2080f0, #4098fc);
  color: #fff;
  border: none;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 2px 6px rgba(32, 128, 240, 0.25);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.text-secondary { color: var(--text-secondary); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>