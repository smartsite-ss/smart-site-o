<template>
  <div class="binding-panel">
    <div
      v-if="hasBinding"
      class="binding-summary"
    >
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">{{ sourceTypeIcon }}</span>
          <span class="summary-source-name">{{ boundDataSourceName }}</span>
          <span
            class="ds-tag"
            :class="'tag-' + boundDataSourceType"
          >{{ typeLabel }}</span>
          <span
            class="status-dot"
            :class="'status-' + connectionStatus"
          />
          <span class="status-text">{{ connectionStatusLabel }}</span>
        </div>
        <div class="summary-body">
          <div class="summary-row">
            <span class="summary-label">{{ $t('dataPanel.dataSourceIdLabel') }}:</span>
            <span class="summary-value">{{ dsId }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">{{ $t('dataPanel.containsVariables') }}:</span>
            <span class="summary-value">{{ variablesCount }} {{ $t('dataPanel.unitItems') }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">{{ $t('dataPanel.fetchResultLabel') }}:</span>
            <span class="summary-value result-format">{{ resultDescription }}</span>
          </div>
          <div
            v-if="boundDataSourceUrl"
            class="summary-row"
          >
            <span class="summary-label">{{ $t('dataPanel.dataSourceLabel') }}:</span>
            <span class="summary-value summary-url">{{ boundDataSourceUrl }}</span>
          </div>
          <div
            v-if="boundDataSourceMeta"
            class="summary-row"
          >
            <span class="summary-label">{{ $t('dataPanel.requestMethodLabel') }}:</span>
            <span class="summary-value">{{ boundDataSourceMeta.method }}</span>
            <span
              v-if="boundDataSourceMeta.interval"
              class="summary-meta"
            >{{ $t('dataPanel.refreshLabel') }}: {{ boundDataSourceMeta.interval }}ms</span>
          </div>
        </div>
        <div class="summary-actions">
          <button
            type="button"
            class="ds-btn"
            @click="$emit('changeBinding')"
          >
            {{ $t('dataPanel.changeBinding') }}
          </button>
          <button
            type="button"
            class="ds-btn"
            @click="$emit('viewDataSource')"
          >
            {{ $t('dataPanel.viewDataSource') }}
          </button>
          <button
            type="button"
            class="ds-btn"
            @click="$emit('manualFetch')"
          >
            {{ $t('dataPanel.manualFetch') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="showCreateForm"
      class="create-form-wrapper"
    >
      <NewDataSourceForm
        @create="handleCreateDataSource"
        @cancel="showCreateForm = false"
      />
    </div>

    <div
      v-else
      class="no-binding"
    >
      <div class="no-binding-hint">
        <span class="hint-icon">📋</span>
        <span>{{ $t('dataPanel.noBindingHint') }}</span>
      </div>
      <div class="no-binding-actions">
        <button
          type="button"
          class="ds-btn ds-btn--primary"
          @click="$emit('selectVariable')"
        >
          {{ $t('dataPanel.selectDataSource') }}
        </button>
        <button
          type="button"
          class="ds-btn"
          @click="showCreateForm = true"
        >
          {{ $t('dataPanel.newDataSource') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n, i18n } from '@scada-editor/core';
import { usePageDataSourceStore } from '../../../../../../system/src/stores/pageDataSource.store';
import type { DataSourceRecord } from '../../../../../../system/src/api/modules/dataSource.api';
import NewDataSourceForm from './NewDataSourceForm.vue';

const props = defineProps<{
  graphicProperties: Record<string, any>;
}>();

const emit = defineEmits<{
  changeBinding: [];
  viewDataSource: [];
  manualFetch: [];
  selectVariable: [];
  createDataSource: [data: { name: string; type: string; pollingInterval: number; timeout: number; retryCount: number }];
}>();

const { t } = useI18n();
const pageDsStore = usePageDataSourceStore();

const showCreateForm = ref(false);

function handleCreateDataSource(data: { name: string; type: string; pollingInterval: number; timeout: number; retryCount: number }) {
  showCreateForm.value = false;
  emit('createDataSource', data);
}

const _graphicId = computed(() => props.graphicProperties?.config?.id ?? '');

const graphicDataSource = computed(() => props.graphicProperties?.dataSource);

const dataSourceId = computed(() => graphicDataSource.value?.dataSource ?? '');

const hasBinding = computed(() => !!dataSourceId.value);

const dsId = computed(() => dataSourceId.value);

const boundDataSource = computed((): DataSourceRecord | undefined => {
  if (!dsId.value) return undefined;
  return pageDsStore.getDataSourceById(dsId.value) ?? undefined;
});

const boundDataSourceName = computed(() => boundDataSource.value?.name ?? dsId.value);

const boundDataSourceType = computed(() => boundDataSource.value?.type ?? 'unknown');

const variablesCount = computed(() => {
  if (!dsId.value) return 0;
  return pageDsStore.variables.filter((v) => v.dataSourceId === dsId.value).length;
});

const typeLabel = computed(() => {
  const labels: Record<string, string> = { static: i18n.global.t('dataPanel.sourceTypeStatic'), tag: i18n.global.t('dataPanel.sourceTypeTag'), api: 'API', sql: i18n.global.t('dataPanel.sourceTypeDb') };
  return labels[boundDataSourceType.value] ?? boundDataSourceType.value;
});

const resultDescription = computed(() => {
  const descriptions: Record<string, string> = {
    static: i18n.global.t('dataPanel.completeStaticJsonData'),
    tag: i18n.global.t('dataPanel.deviceTagJsonData'),
    api: i18n.global.t('dataPanel.apiReturnJsonData'),
    sql: i18n.global.t('dataPanel.dbQueryResultJsonData'),
  };
  return descriptions[boundDataSourceType.value] ?? i18n.global.t('dataPanel.defaultDataDesc');
});

const boundDataSourceUrl = computed(() => {
  const ds = boundDataSource.value;
  if (!ds || !ds.url) return null;
  return ds.url;
});

const boundDataSourceMeta = computed(() => {
  const ds = boundDataSource.value;
  if (!ds) return null;
  return {
    method: ds.method ?? 'GET',
    interval: ds.pollingInterval ?? null,
  };
});

const sourceTypeIcon = computed(() => {
  const icons: Record<string, string> = {
    static: '📝',
    tag: '📡',
    api: '🌐',
    sql: '🗄️',
  };
  const ds = boundDataSource.value;
  return icons[ds?.type ?? ''] ?? '📡';
});

const connectionStatus = computed(() => {
  const ds = boundDataSource.value;
  return ds?.status ?? 'disconnected';
});

const connectionStatusLabel = computed(() => {
  const labels: Record<string, string> = {
    connected: t('dataPanel.statusConnected'),
    connecting: t('dataPanel.statusConnecting'),
    error: t('dataPanel.statusError'),
    disconnected: t('dataPanel.statusDisconnected'),
  };
  return labels[connectionStatus.value] ?? connectionStatus.value;
});
</script>

<style scoped>
@import '../../../../panels/styles/data-panel-theme.scss';

.binding-panel {
  display: flex;
  flex-direction: column;
}

.binding-summary {
  padding: 6px 0;
}

.summary-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--background) 40%, var(--surface)) 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.summary-icon { font-size: 16px; }

.summary-source-name { font-weight: 600; color: var(--text); }

.ds-tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  color: #fff;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.tag-static { background: linear-gradient(135deg, #64748b, #94a3b8); }
.tag-tag { background: linear-gradient(135deg, #2080f0, #4098fc); }
.tag-api { background: linear-gradient(135deg, #18a058, #36ad6a); }
.tag-sql { background: linear-gradient(135deg, #f59e0b, #fbbf24); }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.status-connected { background-color: var(--ds-status-connected); animation: dot-pulse 2s ease-in-out infinite; }
.status-disconnected { background-color: var(--ds-status-disconnected); }
.status-connecting { background-color: var(--ds-status-connecting); animation: dot-pulse 1s ease-in-out infinite; }
.status-error { background-color: var(--ds-status-error); }

@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.status-text { font-size: 11.5px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }

.summary-body { font-size: 12px; }

.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.summary-label { color: var(--text-secondary); min-width: 64px; flex-shrink: 0; font-size: 11.5px; }
.summary-value { color: var(--text); font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 11.5px; }
.summary-url { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.summary-meta { font-size: 11px; color: var(--text-secondary); margin-left: auto; }
.result-format { font-size: 11.5px; color: var(--primary); font-family: inherit; font-weight: 500; }

.summary-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.no-binding {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 0;
}

.no-binding-hint { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.hint-icon { font-size: 20px; opacity: 0.6; }
.no-binding-actions { display: flex; gap: 8px; }
.create-form-wrapper { padding: 4px 0; }
</style>