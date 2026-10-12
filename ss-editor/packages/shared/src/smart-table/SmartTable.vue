<template>
  <div class="smart-table-root">
    <!-- 工具栏 -->
    <div
      v-if="showToolbar"
      class="smart-table-toolbar"
    >
      <div class="toolbar-left">
        <slot name="toolbar-left" />
      </div>
      <div class="toolbar-right">
        <!-- 刷新 -->
        <button
          v-if="showRefresh"
          class="smart-table-toolbar-btn refresh-btn"
          :disabled="loading"
          title="刷新"
          @click="$emit('refresh')"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            :class="{ spinning: loading }"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span v-if="showRefreshLabel">刷新</span>
        </button>
        <!-- 列配置 -->
        <SmartTableColumnToggle
          v-if="showColumnToggle"
          :show="showColumnToggle"
          :configurable-columns="configurableColumns"
          :hidden-keys="hiddenKeys"
          :dropdown-visible="colDropdownVisible"
          @toggle-column="toggleColumn"
          @reset-to-default="resetToDefault"
          @update:dropdown-visible="(v: boolean) => colDropdownVisible = v"
        />
        <!-- 导出 -->
        <SmartTableExport
          v-if="showExport"
          v-model:dropdown-visible="exportDropdownVisible"
          :show="showExport"
          :disabled="data.length === 0"
          @export="(f: string) => handleExport(f as ExportFormat)"
        />
      </div>
    </div>

    <!-- 加载骨架 -->
    <SmartTableLoading
      v-if="loading"
      :loading="loading"
      :columns="visibleColumns.length"
    />

    <!-- 核心表格 -->
    <SmartTableCore
      v-else
      :ref="(el: any) => tableCoreRef = el"
      :columns="visibleColumns"
      :data="displayRows"
      :row-key="rowKey"
      :loading="loading"
      :empty-text="emptyText"
      :error="error ?? null"
      :virtual-scroll="virtualScroll"
      :row-height="rowHeight"
      :visible-rows="visibleRows"
      :editable="editable"
      :editing-row-id="editingRowId"
      :tree="tree"
      :children-field="childrenField"
      :expanded-row-keys="expandedRowKeys"
      :span-method="spanMethod"
      @row-click="(row: any, idx: number) => $emit('row-click', row, idx)"
      @retry="() => $emit('retry')"
      @update:editing-row-id="(v: any) => $emit('update:editingRowId', v)"
      @row-edit-start="(row: any, id: any) => $emit('row-edit-start', row, id)"
      @row-edit-save="(p: any) => $emit('row-edit-save', p)"
      @row-edit-cancel="(row: any, id: any) => $emit('row-edit-cancel', row, id)"
      @update:expanded-row-keys="(v: any) => $emit('update:expandedRowKeys', v)"
      @tree-expand="(p: any) => $emit('tree-expand', p)"
      @tree-collapse="(p: any) => $emit('tree-collapse', p)"
    >
      <!-- 透传所有 slots -->
      <template
        v-for="(_, slotName) in $slots"
        :key="slotName"
        #[slotName]="scope"
      >
        <slot
          :name="slotName"
          v-bind="scope || {}"
        />
      </template>
    </SmartTableCore>

    <!-- 分页 -->
    <SmartTablePagination
      v-if="enablePagination && paginationState"
      :current-page="paginationState.currentPage"
      :total-pages="paginationState.totalPages"
      :total="paginationState.total"
      :showing-from="paginationState.showingFrom"
      :showing-to="paginationState.showingTo"
      :page-size="paginationState.currentPageSize"
      :page-sizes="pageSizes"
      @go="paginationState.goToPage"
      @go-input="paginationState.goToInputPage"
      @size-change="paginationState.changePageSize"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed, toRef } from 'vue';
import type { SmartTableColumn, PaginationConfig, PageChangeEvent, SortConfig, ExportFormat, CellSpan, RowEditEvent, TreeExpandEvent } from './types';
import SmartTableCore from './SmartTableCore.vue';
import SmartTableLoading from './SmartTableLoading.vue';
import SmartTablePagination from './SmartTablePagination.vue';
import SmartTableColumnToggle from './SmartTableColumnToggle.vue';
import SmartTableExport from './SmartTableExport.vue';
import { usePagination } from './composables/usePagination';
import { useColumnConfig } from './composables/useColumnConfig';
import { exportToXlsx } from './utils/export-xlsx';
import { exportToCsv } from './utils/export-csv';
import { exportToImage } from './utils/export-image';

const props = withDefaults(defineProps<{
  data: T[];
  columns: SmartTableColumn<T>[];
  pagination?: PaginationConfig;
  loading?: boolean;
  emptyText?: string;
  error?: string | null;
  tableId?: string;
  rowKey?: string;
  showColumnToggle?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  showRefreshLabel?: boolean;
  enablePagination?: boolean;
  sortConfig?: SortConfig | null;
  // 虚拟滚动
  virtualScroll?: boolean;
  rowHeight?: number;
  visibleRows?: number;
  // 行编辑
  editable?: boolean;
  editingRowId?: string | number | null;
  // 树形
  tree?: boolean;
  childrenField?: string;
  expandedRowKeys?: Array<string | number>;
  // 合并单元格
  spanMethod?: (row: T, column: SmartTableColumn<T>, rowIndex: number, columnIndex: number) => CellSpan;
}>(), {
  loading: false,
  emptyText: '暂无数据',
  error: null,
  tableId: 'default',
  rowKey: 'id',
  showColumnToggle: false,
  showExport: false,
  showRefresh: false,
  showRefreshLabel: false,
  enablePagination: true,
  sortConfig: null,
  virtualScroll: false,
  rowHeight: 40,
  visibleRows: 20,
  editable: false,
  editingRowId: null,
  tree: false,
  childrenField: 'children',
  expandedRowKeys: () => [],
});

const emit = defineEmits<{
  'page-change': [payload: PageChangeEvent];
  'row-click': [row: T, index: number];
  export: [format: ExportFormat, columns: SmartTableColumn<T>[], data: T[]];
  retry: [];
  refresh: [];
  'update:editingRowId': [id: string | number | null];
  'row-edit-start': [row: T, rowId: any];
  'row-edit-save': [payload: RowEditEvent<T>];
  'row-edit-cancel': [row: T, rowId: any];
  'update:expandedRowKeys': [keys: Array<string | number>];
  'tree-expand': [payload: TreeExpandEvent<T>];
  'tree-collapse': [payload: TreeExpandEvent<T>];
}>();

const PAGE_SIZES = [10, 20, 50, 100];
const pageSizes = PAGE_SIZES;

// 分页
const paginationFn = () => props.pagination;
const totalCountFn = () => props.data.length;
const paginationResult = usePagination(paginationFn, totalCountFn, (_evt, payload) => emit('page-change', payload));
const paginationState = computed(() => {
  if (!props.enablePagination) return null;
  return {
    currentPage: paginationResult.currentPage.value,
    totalPages: paginationResult.totalPages.value,
    total: paginationResult.total.value,
    showingFrom: paginationResult.showingFrom.value,
    showingTo: paginationResult.showingTo.value,
    currentPageSize: paginationResult.currentPageSize.value,
    goToPage: paginationResult.goToPage,
    goToInputPage: paginationResult.goToInputPage,
    changePageSize: paginationResult.changePageSize,
  };
});

const displayRows = computed(() => {
  if (!props.enablePagination) return props.data;
  const paginationMode = props.pagination?.mode ?? 'client';
  if (paginationMode === 'server') return props.data;
  return paginationResult.slicedData(props.data) as T[];
});

// 列配置
const tableIdFn = () => props.tableId || 'default';
const columnsRef = toRef(props, 'columns');
const columnConfig = useColumnConfig(tableIdFn, columnsRef);
const {
  visibleColumns,
  hiddenKeys,
  configurableColumns,
  dropdownVisible: colDropdownVisible,
  toggleColumn,
  resetToDefault,
} = columnConfig;

// 导出
const exportDropdownVisible = ref(false);
const tableCoreRef = ref<any>(null);

function getExportFilename(format: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${props.tableId || 'export'}-${ts}.${format}`;
}

async function handleExport(format: ExportFormat) {
  const cols = columnsRef.value.filter((c) => !c.excludeFromExport);
  const rows = format === 'xlsx' || format === 'csv' ? props.data : displayRows.value;

  try {
    switch (format) {
      case 'xlsx':
        await exportToXlsx(cols, rows, getExportFilename('xlsx'));
        break;
      case 'csv':
        exportToCsv(cols, rows, getExportFilename('csv'));
        break;
      case 'png': {
        const el = tableCoreRef.value?.$el as HTMLElement;
        if (el) await exportToImage(el, getExportFilename('png'));
        break;
      }
    }
    emit('export', format, cols, rows);
  } catch (err: any) {
    console.error('[SmartTable] export error:', err);
  }
}

const showToolbar = computed(() => props.showColumnToggle || props.showExport || props.showRefresh);
</script>

<style scoped>
.smart-table-root {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}
.smart-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
  flex-shrink: 0;
}
.toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-right { display: flex; align-items: center; gap: 8px; }

.smart-table-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: background .15s, border-color .15s;
}
.smart-table-toolbar-btn:hover {
  background: var(--hover);
  border-color: var(--primary);
  color: var(--primary);
}
.smart-table-toolbar-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.smart-table-toolbar-btn .spinning {
  animation: smart-table-spin 1s linear infinite;
}
@keyframes smart-table-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
