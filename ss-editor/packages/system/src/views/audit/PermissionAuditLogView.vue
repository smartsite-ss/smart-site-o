<template>
  <div class="audit-log-page">
    <!-- 统一工具栏 -->
    <div class="toolbar">
      <h1 class="page-title">
        {{ $t('system.audit.title') }}
      </h1>
      <div class="toolbar-filters">
        <select
          v-model="filters.action"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.audit.allActions') }}
          </option>
          <option value="grant_role">
            {{ $t('system.audit.actionGrant') }}
          </option>
          <option value="revoke_role">
            {{ $t('system.audit.actionRevoke') }}
          </option>
          <option value="update_permissions">
            {{ $t('system.audit.actionUpdatePerms') }}
          </option>
          <option value="update_auth">
            {{ $t('system.audit.actionUpdateAuth') }}
          </option>
        </select>
        <select
          v-model="filters.targetType"
          class="filter-select"
          @change="loadData(1)"
        >
          <option value="">
            {{ $t('system.audit.allTargets') }}
          </option>
          <option value="role">
            {{ $t('system.audit.targetRole') }}
          </option>
          <option value="user">
            {{ $t('system.audit.targetUser') }}
          </option>
          <option value="project_auth">
            {{ $t('system.audit.targetProjectAuth') }}
          </option>
          <option value="group_auth">
            {{ $t('system.audit.targetGroupAuth') }}
          </option>
          <option value="device_auth">
            {{ $t('system.audit.targetDeviceAuth') }}
          </option>
        </select>
        <TimeRangePicker
          v-model="filters.dateRange"
          mode="date"
          size="sm"
          @change="loadData(1)"
        />
        <input
          v-model="filters.operatorName"
          class="filter-input"
          :placeholder="$t('system.audit.searchOperator')"
          @keyup.enter="loadData(1)"
        >
      </div>
    </div>

    <!-- 表格 -->
    <SmartTable
      table-id="audit-log"
      :data="logs"
      :columns="auditColumns"
      :loading="loading"
      :pagination="paginationConfig"
      :empty-text="$t('system.audit.empty')"
      :show-column-toggle="true"
      :show-export="true"
      :show-refresh="true"
      @page-change="onPageChange"
      @refresh="() => loadData(page)"
    >
      <template #cell-action="{ row }">
        <span
          class="badge-action"
          :class="'action-' + row.action"
        >
          {{ actionLabel(row.action) }}
        </span>
      </template>
    </SmartTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { roleApi } from '../../api/modules/role.api';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn, PaginationConfig, PageChangeEvent } from '../../components/smart-table';
import { TimeRangePicker } from '@scada-editor/shared';
import type { TimeRange } from '@scada-editor/shared';

const { t } = useI18n();

const loading = ref(false);
const logs = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const filters = reactive({
  action: '',
  targetType: '',
  dateRange: { start: '', end: '' } as TimeRange,
  operatorName: '',
});

function actionLabel(action: string): string {
  switch (action) {
    case 'grant_role': return t('system.audit.actionGrant');
    case 'revoke_role': return t('system.audit.actionRevoke');
    case 'update_permissions': return t('system.audit.actionUpdatePerms');
    case 'update_auth': return t('system.audit.actionUpdateAuth');
    default: return action;
  }
}

function targetTypeLabel(type: string): string {
  switch (type) {
    case 'role': return t('system.audit.targetRole');
    case 'user': return t('system.audit.targetUser');
    case 'project_auth': return t('system.audit.targetProjectAuth');
    case 'group_auth': return t('system.audit.targetGroupAuth');
    case 'device_auth': return t('system.audit.targetDeviceAuth');
    default: return type;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function formatChanges(changes: any): string {
  if (typeof changes === 'string') {
    try { return JSON.stringify(JSON.parse(changes), null, 2); } catch { return changes; }
  }
  return JSON.stringify(changes, null, 2);
}

const auditColumns = computed<SmartTableColumn[]>(() => [
  {
    key: 'time',
    title: t('system.audit.time'),
    dataKey: 'createdAt',
    render: (value) => formatTime(value as string),
  },
  {
    key: 'operator',
    title: t('system.audit.operator'),
    dataKey: 'operatorName',
  },
  {
    key: 'action',
    title: t('system.audit.action'),
    dataKey: 'action',
  },
  {
    key: 'target',
    title: t('system.audit.target'),
    dataKey: 'targetId',
    render: (value, row) => `${targetTypeLabel(row.targetType)}: ${value}`,
  },
  {
    key: 'details',
    title: t('system.audit.details'),
    dataKey: 'changes',
    render: (value) => {
      if (value == null || value === '') return '-';
      return formatChanges(value);
    },
  },
]);

const paginationConfig = computed<PaginationConfig>(() => ({
  page: page.value,
  pageSize: pageSize.value,
  total: total.value,
  mode: 'server',
}));

function onPageChange(event: PageChangeEvent) {
  if (event.pageSize !== pageSize.value) {
    pageSize.value = event.pageSize;
  }
  loadData(event.page);
}

async function loadData(p: number) {
  loading.value = true;
  page.value = p;
  try {
    const res = await roleApi.getAuditLogs({
      page: p,
      pageSize: pageSize.value,
      action: filters.action || undefined,
      targetType: filters.targetType || undefined,
      startDate: filters.dateRange.start || undefined,
      endDate: filters.dateRange.end ? filters.dateRange.end + 'T23:59:59' : undefined,
    });
    const data = (res as any)?.data || res || {};
    logs.value = data.items || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData(1);
});
</script>

<style scoped>
.audit-log-page {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

/* ===== 统一工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
}

.filter-input {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
  width: 160px;
}
.badge-action {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}
.action-grant_role { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.action-revoke_role { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.action-update_permissions { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.action-update_auth { background: color-mix(in srgb, var(--status-warning) 15%, transparent); color: var(--status-warning); }
</style>
