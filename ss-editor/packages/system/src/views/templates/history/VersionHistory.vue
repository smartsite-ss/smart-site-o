<template>
  <div class="version-history">
    <div class="history-header">
      <h2 class="history-title">
        {{ $t('system.deviceTemplate.history.title') }}
      </h2>
      <span
        v-if="currentTemplate"
        class="current-version-badge"
      >
        {{ $t('system.deviceTemplate.history.currentVersion') }}: v{{ currentTemplate.version }}
      </span>
    </div>

    <SsLoading
      v-if="loading"
      :text="$t('system.templates.loading')"
      size="small"
    />

    <div
      v-else-if="versions.length === 0"
      class="empty-state"
    >
      {{ $t('system.deviceTemplate.history.noHistory') }}
    </div>

    <div
      v-else
      class="history-content"
    >
      <div class="version-list-panel">
        <h3 class="section-title">
          {{ $t('system.deviceTemplate.history.version') }}
          <span class="count">({{ versions.length }})</span>
        </h3>
        <div class="version-list">
          <div
            v-for="ver in versions"
            :key="ver.id"
            class="version-item"
            :class="{
              'version-item--selected': selectedVersion?.id === ver.id,
              'version-item--current': ver.id === currentTemplate?.id,
            }"
            @click="selectVersion(ver)"
          >
            <div class="version-item-header">
              <span class="version-label">v{{ ver.version }}</span>
              <span
                class="version-status"
                :class="'status-' + ver.status"
              >
                {{ $t('system.deviceTemplate.statuses.' + ver.status) }}
              </span>
            </div>
            <div class="version-item-meta">
              <span class="version-date">{{ formatDate(ver.createdAt) }}</span>
            </div>
            <div
              v-if="ver.id === currentTemplate?.id"
              class="version-current-tag"
            >
              {{ $t('system.deviceTemplate.history.currentVersion') }}
            </div>
          </div>
        </div>
      </div>

      <div class="diff-panel">
        <div
          v-if="!selectedVersion"
          class="diff-empty"
        >
          <div class="diff-empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p class="diff-empty-text">
            {{ $t('system.deviceTemplate.history.selectVersion') }}
          </p>
        </div>

        <template v-else>
          <h3 class="section-title">
            {{ $t('system.deviceTemplate.history.compare') }}
            <span class="compare-versions">
              v{{ selectedVersion.version }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                /><polyline points="12 5 19 12 12 19" />
              </svg>
              v{{ currentTemplate?.version }}
            </span>
          </h3>

          <div
            v-if="diffResult.noChanges"
            class="diff-no-changes"
          >
            {{ $t('system.deviceTemplate.history.noChanges') }}
          </div>

          <div
            v-else
            class="diff-sections"
          >
            <div
              v-if="diffResult.added.length > 0"
              class="diff-section diff-section--added"
            >
              <h4 class="diff-section-title diff-section-title--added">
                <span class="diff-badge diff-badge--added">+</span>
                {{ $t('system.deviceTemplate.history.variablesAdded', { count: diffResult.added.length }) }}
              </h4>
              <div class="table-wrapper">
                <table class="data-table diff-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{{ $t('system.deviceTemplate.varName') }}</th>
                      <th>{{ $t('system.deviceTemplate.varAddress') }}</th>
                      <th>{{ $t('system.deviceTemplate.varDataType') }}</th>
                      <th>{{ $t('system.deviceTemplate.varScanRate') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="v in diffResult.added"
                      :key="v.name"
                      class="diff-row--added"
                    >
                      <td class="text-muted">
                        {{ v.order }}
                      </td>
                      <td class="name-cell">
                        {{ v.name }}
                      </td>
                      <td><code>{{ v.address }}</code></td>
                      <td><span class="badge badge-sm">{{ v.dataType }}</span></td>
                      <td>{{ v.scanRate ? v.scanRate + 'ms' : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="diffResult.removed.length > 0"
              class="diff-section diff-section--removed"
            >
              <h4 class="diff-section-title diff-section-title--removed">
                <span class="diff-badge diff-badge--removed">-</span>
                {{ $t('system.deviceTemplate.history.variablesRemoved', { count: diffResult.removed.length }) }}
              </h4>
              <div class="table-wrapper">
                <table class="data-table diff-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{{ $t('system.deviceTemplate.varName') }}</th>
                      <th>{{ $t('system.deviceTemplate.varAddress') }}</th>
                      <th>{{ $t('system.deviceTemplate.varDataType') }}</th>
                      <th>{{ $t('system.deviceTemplate.varScanRate') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="v in diffResult.removed"
                      :key="v.name"
                      class="diff-row--removed"
                    >
                      <td class="text-muted">
                        {{ v.order }}
                      </td>
                      <td class="name-cell">
                        {{ v.name }}
                      </td>
                      <td><code>{{ v.address }}</code></td>
                      <td><span class="badge badge-sm">{{ v.dataType }}</span></td>
                      <td>{{ v.scanRate ? v.scanRate + 'ms' : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="diffResult.modified.length > 0"
              class="diff-section diff-section--modified"
            >
              <h4 class="diff-section-title diff-section-title--modified">
                <span class="diff-badge diff-badge--modified">~</span>
                {{ $t('system.deviceTemplate.history.variablesModified', { count: diffResult.modified.length }) }}
              </h4>
              <div class="table-wrapper">
                <table class="data-table diff-table diff-table--modified">
                  <thead>
                    <tr>
                      <th>{{ $t('system.deviceTemplate.varName') }}</th>
                      <th>{{ $t('system.deviceTemplate.varAddress') }}</th>
                      <th>{{ $t('system.deviceTemplate.varDataType') }}</th>
                      <th>{{ $t('system.deviceTemplate.varScanRate') }}</th>
                      <th>{{ $t('system.deviceTemplate.status') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="v in diffResult.modified"
                      :key="v.name"
                    >
                      <td class="name-cell">
                        {{ v.name }}
                      </td>
                      <td class="diff-modified-cell">
                        <div class="diff-old-value">
                          {{ v.old.address }}
                        </div>
                        <div class="diff-new-value">
                          {{ v.new.address }}
                        </div>
                      </td>
                      <td class="diff-modified-cell">
                        <div class="diff-old-value">
                          {{ v.old.dataType }}
                        </div>
                        <div class="diff-new-value">
                          {{ v.new.dataType }}
                        </div>
                      </td>
                      <td class="diff-modified-cell">
                        <div class="diff-old-value">
                          {{ v.old.scanRate ? v.old.scanRate + 'ms' : '-' }}
                        </div>
                        <div class="diff-new-value">
                          {{ v.new.scanRate ? v.new.scanRate + 'ms' : '-' }}
                        </div>
                      </td>
                      <td class="diff-modified-cell">
                        <span class="diff-change-tag">{{ getChangedFields(v) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from '@scada-editor/core';
import { templateApi } from '../../../api/modules/template.api';
import { showError } from '../../../utils/messageBox';
import type { DeviceTemplate, DeviceTemplateVariable } from '../../../api/modules/template.api';
import { SsLoading } from '@scada-editor/shared';

interface VersionSnapshot {
  id: string;
  version: string;
  status: string;
  createdAt: string;
  variables: DeviceTemplateVariable[];
  description?: string;
}

interface ModifiedVariable {
  name: string;
  old: DeviceTemplateVariable;
  new: DeviceTemplateVariable;
  changedFields: string[];
}

interface DiffResult {
  added: DeviceTemplateVariable[];
  removed: DeviceTemplateVariable[];
  modified: ModifiedVariable[];
  noChanges: boolean;
}

const props = defineProps<{
  templateId: string;
}>();

const { t } = useI18n();

const currentTemplate = ref<DeviceTemplate | null>(null);
const versions = ref<VersionSnapshot[]>([]);
const selectedVersion = ref<VersionSnapshot | null>(null);
const loading = ref(false);

const diffResult = computed<DiffResult>(() => {
  if (!selectedVersion.value || !currentTemplate.value) {
    return { added: [], removed: [], modified: [], noChanges: false };
  }

  const currentVars = currentTemplate.value.variables || [];
  const selectedVars = selectedVersion.value.variables || [];

  const currentMap = new Map(currentVars.map((v: DeviceTemplateVariable) => [v.name, v]));
  const selectedMap = new Map(selectedVars.map((v: DeviceTemplateVariable) => [v.name, v]));

  const added: DeviceTemplateVariable[] = [];
  const removed: DeviceTemplateVariable[] = [];
  const modified: ModifiedVariable[] = [];

  const compareFields: (keyof DeviceTemplateVariable)[] = [
    'address',
    'dataType',
    'scanRate',
    'description',
    'registerCount',
    'timeout',
    'retryCount',
    'enabled',
    'scale',
    'offset',
    'unit',
    'minValue',
    'maxValue',
  ];

  // Find added (in current but not in selected) and modified
  for (const v of currentVars) {
    const selectedVar = selectedMap.get(v.name);
    if (!selectedVar) {
      added.push(v);
    } else {
      const changedFields: string[] = [];
      for (const field of compareFields) {
        if (JSON.stringify(v[field]) !== JSON.stringify(selectedVar[field])) {
          changedFields.push(field);
        }
      }
      if (changedFields.length > 0) {
        modified.push({
          name: v.name,
          old: selectedVar,
          new: v,
          changedFields,
        });
      }
    }
  }

  // Find removed (in selected but not in current)
  for (const v of selectedVars) {
    if (!currentMap.has(v.name)) {
      removed.push(v);
    }
  }

  const noChanges = added.length === 0 && removed.length === 0 && modified.length === 0;

  return { added, removed, modified, noChanges };
});

function getChangedFields(mod: ModifiedVariable): string {
  const fieldLabels: Record<string, string> = {
    address: t('system.deviceTemplate.varAddress'),
    dataType: t('system.deviceTemplate.varDataType'),
    scanRate: t('system.deviceTemplate.varScanRate'),
    description: t('system.deviceTemplate.description'),
    enabled: t('system.common.enabled'),
    scale: t('system.common.scale'),
    offset: t('system.common.offset'),
    unit: t('system.common.unit'),
  };
  return mod.changedFields
    .slice(0, 3)
    .map((f: string) => fieldLabels[f] || f)
    .join(', ');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function selectVersion(ver: VersionSnapshot) {
  selectedVersion.value = ver;
}

async function loadVersions() {
  if (!props.templateId) return;
  loading.value = true;
  try {
    const res = await templateApi.getById(props.templateId);
    currentTemplate.value = (res as any).data ?? res;
    if (currentTemplate.value?.variables) {
      if (typeof currentTemplate.value.variables === 'string') {
        currentTemplate.value.variables = JSON.parse(currentTemplate.value.variables as any);
      }
    }

    // Build version history list from current template
    if (currentTemplate.value) {
      const historyVersions: VersionSnapshot[] = [
        {
          id: currentTemplate.value.id,
          version: currentTemplate.value.version,
          status: currentTemplate.value.status,
          createdAt: currentTemplate.value.createdAt,
          variables: currentTemplate.value.variables || [],
          description: currentTemplate.value.description,
        },
      ];

      // Attempt to load additional historical versions from API
      try {
        const historyRes = await (templateApi as any).getHistory?.(props.templateId);
        if (historyRes) {
          const historyData = (historyRes as any).data ?? historyRes;
          if (Array.isArray(historyData)) {
            for (const h of historyData) {
              if (h.id !== currentTemplate.value.id) {
                historyVersions.push({
                  id: h.id,
                  version: h.version,
                  status: h.status || 'deprecated',
                  createdAt: h.createdAt,
                  variables: Array.isArray(h.variables) ? h.variables : [],
                  description: h.description,
                });
              }
            }
          }
        }
      } catch {
        // No history API available yet; use current version only
      }

      versions.value = historyVersions;
    }
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.response?.data?.message || t('system.deviceTemplate.fetchFailed'));
    }
  } finally {
    loading.value = false;
  }
}

watch(() => props.templateId, () => {
  if (props.templateId) loadVersions();
});

onMounted(() => {
  if (props.templateId) loadVersions();
});
</script>

<style scoped>
.version-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.history-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.current-version-badge {
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(26, 115, 232, 0.1);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.history-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.version-list-panel {
  width: 280px;
  min-width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--surface);
  overflow-y: auto;
  padding: 16px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
}

.version-item:hover {
  border-color: var(--primary);
  background: rgba(26, 115, 232, 0.04);
}

.version-item--selected {
  border-color: var(--primary);
  background: rgba(26, 115, 232, 0.08);
}

.version-item--current {
  border-color: var(--status-online);
}

.version-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.version-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.version-status {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.status-draft {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-secondary);
}

.status-published {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-online);
}

.status-deprecated {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}

.version-item-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.version-current-tag {
  margin-top: 6px;
  font-size: 10px;
  color: var(--status-online);
  font-weight: 500;
}

.diff-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--surface);
}

.diff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 12px;
}

.diff-empty-icon {
  opacity: 0.4;
}

.diff-empty-text {
  font-size: 14px;
  margin: 0;
}

.diff-no-changes {
  padding: 40px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  font-style: italic;
}

.diff-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diff-section {
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.diff-section--added {
  border-color: color-mix(in srgb, var(--status-online) 30%, transparent);
}

.diff-section--removed {
  border-color: color-mix(in srgb, var(--status-error) 30%, transparent);
}

.diff-section--modified {
  border-color: rgba(234, 179, 8, 0.3);
}

.diff-section-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.diff-section-title--added {
  background: color-mix(in srgb, var(--status-online) 8%, transparent);
  color: var(--status-success);
}

.diff-section-title--removed {
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  color: var(--status-error);
}

.diff-section-title--modified {
  background: rgba(234, 179, 8, 0.08);
  color: var(--status-warning);
}

.diff-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.diff-badge--added {
  background: var(--status-online);
  color: var(--text);
}

.diff-badge--removed {
  background: var(--status-error);
  color: var(--text);
}

.diff-badge--modified {
  background: var(--status-warning);
  color: #000;
}

.diff-table {
  margin: 0;
}

.diff-table th {
  padding: 6px 16px;
  font-size: 11px;
}

.diff-table td {
  padding: 6px 16px;
  font-size: 12px;
}

.diff-row--added td {
  background: color-mix(in srgb, var(--status-online) 6%, transparent);
}

.diff-row--removed td {
  background: color-mix(in srgb, var(--status-error) 6%, transparent);
}

.diff-modified-cell {
  vertical-align: top;
}

.diff-old-value {
  color: var(--status-error);
  text-decoration: line-through;
  font-size: 11px;
  line-height: 1.5;
}

.diff-new-value {
  color: var(--status-success);
  font-size: 12px;
  line-height: 1.5;
}

.diff-change-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(234, 179, 8, 0.15);
  color: var(--status-warning);
  font-size: 10px;
  font-weight: 500;
}

.compare-versions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

/* Reuse existing patterns */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.data-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.name-cell {
  font-weight: 500;
}

.text-muted {
  color: var(--text-secondary);
  font-size: 12px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(26, 115, 232, 0.1);
  color: var(--primary);
  font-size: 11px;
  font-weight: 500;
  width: fit-content;
}

.badge-sm {
  font-size: 10px;
  padding: 1px 6px;
}

code {
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--background);
  font-size: 12px;
  font-family: monospace;
}
</style>