<template>
  <div class="filter-preview-panel">
    <div class="comparison-section">
      <div class="comparison-panel">
        <div class="comparison-title">
          {{ $t('dataPanel.beforeFilter') }}
        </div>
        <div class="comparison-content">
          <pre v-if="inputData !== null">{{ formatJson(inputData) }}</pre>
          <span
            v-else
            class="empty-text"
          >—</span>
        </div>
      </div>
      <div class="comparison-arrow">
        ═══▶
      </div>
      <div class="comparison-panel">
        <div class="comparison-title">
          {{ $t('dataPanel.afterFilter') }}
        </div>
        <div class="comparison-content">
          <pre v-if="outputData !== null">{{ formatJson(outputData) }}</pre>
          <span
            v-else
            class="empty-text"
          >—</span>
        </div>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="test-error"
    >
      {{ errorMessage }}
    </div>
    <div
      v-if="successMessage"
      class="test-success"
    >
      ✅ {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@scada-editor/core';

defineProps<{
  inputData: any;
  outputData: any;
  errorMessage?: string | null;
  successMessage?: string | null;
}>();

useI18n();

function formatJson(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
</script>

<style scoped>
.filter-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comparison-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.comparison-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.comparison-title {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--border);
}

.comparison-content {
  padding: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.comparison-content pre {
  margin: 0;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  white-space: pre-wrap;
}

.comparison-arrow {
  display: flex;
  align-items: center;
  padding-top: 24px;
  font-size: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 13px;
}

.test-error {
  color: var(--status-error);
  font-size: 12px;
  padding: 4px 8px;
  background-color: color-mix(in srgb, var(--status-error) 6%, transparent);
  border-radius: 4px;
}

.test-success {
  color: var(--status-success);
  font-size: 12px;
}
</style>