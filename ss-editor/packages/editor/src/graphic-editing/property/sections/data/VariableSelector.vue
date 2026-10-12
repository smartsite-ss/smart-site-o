<template>
  <div
    v-if="visible"
    class="modal-overlay"
    @click.self="emit('update:visible', false)"
  >
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">{{ $t('dataPanel.selectVariableTitle') }}</span>
        <div class="modal-header-actions">
          <button
            type="button"
            class="btn-confirm"
            :disabled="!selectedDataSourceId"
            @click="confirmSelection"
          >
            {{ $t('dataPanel.confirmSelection') }}
          </button>
          <button
            type="button"
            class="btn-new-ds"
            @click="handleOpenSourceConfig"
          >
            {{ $t('dataPanel.newDataSourceLabel') }}
          </button>
          <button
            type="button"
            class="modal-close"
            @click="emit('update:visible', false)"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="variable-selector-body">
        <div
          v-if="pageDsStore.dataSources.length === 0"
          class="empty-state"
        >
          <span class="text-tertiary">
            {{ $t('dataPanel.emptyDataSourceHint') }}
          </span>
        </div>

        <div v-else>
          <div
            v-for="ds in pageDsStore.dataSources"
            :key="ds.id"
            class="property-group"
            :class="{ 'property-group--selected': selectedDataSourceId === ds.id }"
          >
            <div
              class="property-group-header"
              @click="toggleGroup(ds.id)"
            >
              <div
                class="ds-radio"
                @click.stop="selectDataSource(ds.id)"
              >
                <span
                  class="radio-circle"
                  :class="{ 'radio-checked': selectedDataSourceId === ds.id }"
                />
              </div>
              <span class="ds-icons">{{ sourceIcon(ds.type) }}</span>
              <span class="ds-name">{{ ds.name }}</span>
              <span
                class="ds-tag"
                :class="'tag-' + ds.type"
              >{{ typeLabel(ds.type) }}</span>
              <span class="group-arrow">{{ expandedGroupId === ds.id ? '▼' : '▶' }}</span>
            </div>
            <div
              v-show="expandedGroupId === ds.id"
              class="property-group-body"
            >
              <div class="ds-meta-section">
                <div
                  v-if="ds.url"
                  class="ds-meta-row"
                >
                  <span class="meta-label">URL:</span>
                  <span class="meta-value">{{ ds.url }}</span>
                </div>
                <div
                  v-if="ds.pollingInterval"
                  class="ds-meta-row"
                >
                  <span class="meta-label">{{ $t('dataPanel.pollingIntervalLabel') }}</span>
                  <span class="meta-value">{{ ds.pollingInterval }}ms</span>
                </div>
                <div
                  v-if="ds.timeout"
                  class="ds-meta-row"
                >
                  <span class="meta-label">{{ $t('dataPanel.timeoutLabel') }}</span>
                  <span class="meta-value">{{ ds.timeout }}ms</span>
                </div>
                <div
                  v-if="ds.retryCount !== undefined"
                  class="ds-meta-row"
                >
                  <span class="meta-label">{{ $t('dataPanel.retryCountLabel') }}</span>
                  <span class="meta-value">{{ ds.retryCount }}</span>
                </div>
                <div class="ds-meta-row">
                  <span class="meta-label">{{ $t('dataPanel.status') }}</span>
                  <span
                    class="status-dot-sm"
                    :class="'status-' + (ds.status || 'disconnected')"
                  />
                  <span class="meta-value">{{ statusLabel(ds.status) }}</span>
                </div>
              </div>

              <div class="ds-variables-header">
                <span class="variables-title">{{ $t('dataPanel.variableList', { count: getVariableCount(ds.id) }) }}</span>
                <span class="result-hint">{{ $t('dataPanel.result') }}: {{ getResultDescription(ds.type) }}</span>
              </div>
              <div class="variable-list">
                <div
                  v-for="v in getVariables(ds.id)"
                  :key="v.tagId"
                  class="variable-item"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ v.tagName }}</span>
                    <span class="variable-id">{{ v.tagId }}</span>
                    <span
                      class="tag"
                      :class="v.dataType === 'float' || v.dataType === 'int' ? 'tag-info' : 'tag-default'"
                    >
                      {{ v.dataType }}
                    </span>
                  </div>
                  <div class="variable-value">
                    <span class="current-value">{{ formatValue(v.currentValue) }}</span>
                    <span
                      class="quality-dot"
                      :style="{ backgroundColor: getQualityColor(v.quality) }"
                    />
                    <span class="update-time">{{ formatTime(v.lastUpdate) }}</span>
                  </div>
                </div>
                <div
                  v-if="getVariableCount(ds.id) === 0"
                  class="no-vars"
                >
                  <template v-if="ds.type === 'static'">
                    <div
                      v-if="getDsJsonPreview(ds.id)"
                      class="no-vars-static"
                    >
                      <div class="no-vars-static-hint">
                        {{ $t('dataPanel.staticJsonHint') }}
                      </div>
                      <pre class="no-vars-json">{{ getDsJsonPreview(ds.id) }}</pre>
                    </div>
                    <div
                      v-else
                      class="no-vars-hint"
                    >
                      {{ $t('dataPanel.noJsonDataHint') }}
                    </div>
                  </template>
                  <template v-else-if="ds.type === 'tag' || ds.type === 'device'">
                    <div class="no-vars-hint">
                      {{ $t('dataPanel.noTagConfigHint') }}
                    </div>
                  </template>
                  <template v-else-if="ds.type === 'api'">
                    <div class="no-vars-hint">
                      {{ $t('dataPanel.noReturnFieldsHint') }}
                    </div>
                  </template>
                  <template v-else>
                    <div class="no-vars-hint">
                      {{ $t('dataPanel.noVariablesHint') }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import { usePageDataSourceStore } from '../../../../../../system/src/stores/pageDataSource.store';
import { getQualityColor } from './sourceMeta';

interface VariableItem {
  tagId: string;
  tagName: string;
  dataType: string;
  currentValue?: unknown;
  quality?: string;
  lastUpdate?: number;
  path?: string;
}

const props = defineProps<{
  visible: boolean;
  currentDataSourceId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'selected', dataSourceId: string): void;
  (e: 'openSourceConfig'): void;
}>();

const pageDsStore = usePageDataSourceStore();

const selectedDataSourceId = ref<string | null>(null);

const expandedGroupId = ref<string | null>(null);

const dataSourceRecords = computed(() => pageDsStore.dataSources);

function toggleGroup(dsId: string) {
  expandedGroupId.value = expandedGroupId.value === dsId ? null : dsId;
}

function selectDataSource(dsId: string) {
  selectedDataSourceId.value = selectedDataSourceId.value === dsId ? null : dsId;
}

function confirmSelection() {
  if (selectedDataSourceId.value) {
    emit('selected', selectedDataSourceId.value);
    emit('update:visible', false);
  }
}

function handleOpenSourceConfig() {
  emit('openSourceConfig');
  emit('update:visible', false);
}

function getDataSourceById(dsId: string) {
  return dataSourceRecords.value.find((ds) => ds.id === dsId);
}

function getVariables(dsId: string): VariableItem[] {
  const ds = getDataSourceById(dsId);
  if (!ds) return [];

  const props = ds.properties ?? ({} as Record<string, any>);
  const runtimeVars = pageDsStore.variables.filter((v) => v.dataSourceId === dsId);

  switch (ds.type) {
    case 'static': {
      const vars = props.variables as any[] | undefined;
      if (!vars || vars.length === 0) {
        const raw = props.jsonContent;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const flat = parsed?.variables ?? parsed;
            if (Array.isArray(flat)) {
              return flat.map((v: any, i: number) => ({
                tagId: v.tagId ?? `var_${i}`,
                tagName: v.tagName ?? v.tagId ?? `var_${i}`,
                dataType: v.dataType ?? typeof v.value,
                currentValue: v.value,
              }));
            }
            if (flat && typeof flat === 'object') {
              return Object.entries(flat as Record<string, any>).map(([key, value]) => ({
                tagId: key,
                tagName: key,
                dataType: typeof value,
                currentValue: value,
              }));
            }
          } catch { /* ignore parse errors */ }
        }
        return [];
      }
      return vars.map((v: any) => ({
        tagId: v.tagId,
        tagName: v.tagName ?? v.tagId,
        dataType: v.dataType ?? 'string',
        currentValue: v.value,
      }));
    }

    case 'tag':
    case 'device': {
      const tagIds = props.tagIds ?? ds.tags ?? [];
      return tagIds.map((tagId: string) => {
        const rv = runtimeVars.find((rv) => rv.tagId === tagId);
        return {
          tagId,
          tagName: rv?.tagName ?? tagId,
          dataType: rv?.dataType ?? 'string',
          currentValue: rv?.currentValue,
          quality: rv?.quality,
          lastUpdate: rv?.lastUpdate,
        };
      });
    }

    default:
      return runtimeVars.map((v) => ({
        tagId: v.tagId,
        tagName: v.tagName ?? v.tagId,
        dataType: v.dataType ?? 'string',
        currentValue: v.currentValue,
        quality: v.quality,
        lastUpdate: v.lastUpdate,
      }));
  }
}

function getVariableCount(dsId: string): number {
  return getVariables(dsId).length;
}

function getDsJsonPreview(dsId: string): string | null {
  const ds = getDataSourceById(dsId);
  if (!ds || ds.type !== 'static') return null;
  const raw = (ds.properties as any)?.jsonContent;
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw.length > 200 ? raw.substring(0, 200) + '...' : raw;
  }
}

function sourceIcon(type: string): string {
  const icons: Record<string, string> = {
    static: '📝',
    tag: '📡',
    api: '🌐',
    sql: '🗄️',
  };
  return icons[type] ?? '📡';
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    static: i18n.global.t('dataPanel.sourceTypeStatic'),
    tag: i18n.global.t('dataPanel.sourceTypeTag'),
    api: 'API',
    sql: i18n.global.t('dataPanel.sourceTypeDb'),
  };
  return labels[type] ?? type;
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = {
    connected: i18n.global.t('dataPanel.statusConnected'),
    disconnected: i18n.global.t('dataPanel.statusDisconnected'),
    connecting: i18n.global.t('dataPanel.statusConnecting'),
    error: i18n.global.t('dataPanel.statusError'),
  };
  return map[status ?? ''] ?? status ?? i18n.global.t('dataPanel.statusDisconnected');
}

function getResultDescription(type: string): string {
  const descriptions: Record<string, string> = {
    static: i18n.global.t('dataPanel.staticDataDesc'),
    tag: i18n.global.t('dataPanel.tagDataDesc'),
    api: i18n.global.t('dataPanel.apiDataDesc'),
    sql: i18n.global.t('dataPanel.dbDataDesc'),
  };
  return descriptions[type] ?? i18n.global.t('dataPanel.defaultDataDesc');
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function formatTime(t: number | undefined): string {
  if (!t) return '';
  return new Date(t).toLocaleTimeString();
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedDataSourceId.value = props.currentDataSourceId ?? null;
      if (pageDsStore.dataSources.length > 0) {
        expandedGroupId.value = pageDsStore.dataSources[0].id;
      }
    } else {
      selectedDataSourceId.value = null;
    }
  },
);
</script>

<style scoped>
@import '../../../../panels/styles/data-panel-theme.scss';
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: var(--surface); border-radius: var(--radius-md, 8px); padding: 16px; min-width: 500px; max-width: 680px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); }
.modal-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.modal-header-actions { display: flex; align-items: center; gap: 8px; }
.btn-confirm { padding: 4px 12px; border: 1px solid var(--status-success); border-radius: var(--radius-sm, 4px); background: var(--status-success); color: #fff; font-size: 13px; cursor: pointer; transition: opacity 0.15s; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-confirm:not(:disabled):hover { opacity: 0.85; }
.btn-new-ds { padding: 4px 12px; border: 1px solid var(--primary, #2080f0); border-radius: var(--radius-sm, 4px); background: transparent; color: var(--primary, #2080f0); font-size: 13px; cursor: pointer; }
.btn-new-ds:hover { background: rgba(32, 128, 240, 0.08); }
.variable-selector-body { min-height: 200px; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 40px 0; }
.text-tertiary { color: var(--text-tertiary); }
.property-group { border: 1px solid var(--border); border-radius: var(--radius-sm, 4px); overflow: hidden; }
.property-group + .property-group { margin-top: 8px; }
.property-group--selected { border-color: var(--primary, #2080f0); background: rgba(32, 128, 240, 0.03); }
.property-group-header { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: color-mix(in srgb, var(--surface) 95%, #000); cursor: pointer; user-select: none; font-size: 14px; font-weight: 500; color: var(--text-primary); }
.property-group-header:hover { background: color-mix(in srgb, var(--surface) 90%, #000); }
.ds-radio { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; }
.radio-circle { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 50%; display: inline-block; }
.radio-checked { border-color: var(--primary, #2080f0); background: var(--primary, #2080f0); box-shadow: inset 0 0 0 3px var(--surface); }
.ds-icons { flex-shrink: 0; font-size: 16px; }
.ds-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ds-tag { font-size: 11px; padding: 1px 6px; border-radius: var(--radius-xs, 3px); color: #fff; flex-shrink: 0; }
.tag-static { background: var(--ds-type-static, #909399); }
.tag-tag { background: var(--ds-type-tag, #2080f0); }
.tag-api { background: var(--ds-type-api, #18a058); }
.tag-sql { background: var(--ds-type-sql, #f0a020); }
.group-arrow { font-size: 10px; color: var(--text-secondary); flex-shrink: 0; margin-left: auto; }
.property-group-body { padding: 8px 12px 12px 38px; border-top: 1px solid var(--border); }
.ds-meta-section { margin-bottom: 8px; padding: 6px 8px; background: var(--background); border-radius: var(--radius-sm, 4px); font-size: 12px; }
.ds-meta-row { display: flex; align-items: center; gap: 6px; line-height: 1.8; }
.meta-label { color: var(--text-secondary); min-width: 60px; flex-shrink: 0; }
.meta-value { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 11px; }
.status-dot-sm { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-connected { background-color: var(--ds-status-connected, #18a058); }
.status-disconnected { background-color: var(--ds-status-disconnected, #909399); }
.status-connecting { background-color: var(--ds-status-connecting, #f0a020); }
.status-error { background-color: var(--ds-status-error, #d03050); }
.ds-variables-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.variables-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.result-hint { font-size: 11px; color: var(--primary, #2080f0); background: rgba(32, 128, 240, 0.08); padding: 1px 6px; border-radius: var(--radius-xs, 3px); }
.variable-list { max-height: 180px; overflow-y: auto; }
.no-vars { font-size: 12px; color: var(--text-tertiary); padding: 8px 0; text-align: center; }
.no-vars-hint { font-size: 12px; color: var(--text-tertiary); padding: 4px 0; }
.no-vars-static { text-align: left; }
.no-vars-static-hint { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.no-vars-json { font-size: 11px; font-family: 'Consolas', 'Courier New', monospace; line-height: 1.4; background: color-mix(in srgb, var(--surface) 50%, var(--background)); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; max-height: 120px; overflow: auto; white-space: pre; color: var(--text); }
.variable-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border-bottom: 1px solid var(--border); font-size: 13px; }
.variable-item:last-child { border-bottom: none; }
.variable-info { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.variable-name { font-weight: 500; color: var(--text-primary); white-space: nowrap; }
.variable-id { font-size: 11px; color: var(--text-secondary); font-family: monospace; white-space: nowrap; }
.tag { font-size: 11px; padding: 1px 6px; border-radius: var(--radius-xs, 3px); white-space: nowrap; }
.tag-default { background: var(--surface); color: var(--text-secondary); }
.tag-info { background: rgba(32, 128, 240, 0.1); color: var(--primary, #2080f0); }
.variable-value { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.current-value { font-family: monospace; font-size: 13px; color: var(--text); }
.quality-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.update-time { font-size: 11px; color: var(--text-tertiary); }
</style>