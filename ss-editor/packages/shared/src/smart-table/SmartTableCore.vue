<template>
  <div class="smart-table-core-wrapper">
    <div
      :class="['smart-table-scroll', { 'virtual-scroll-on': virtualEnabled }]"
      :style="scrollContainerStyle"
      @scroll="onScroll"
    >
      <table
        class="smart-table"
        :class="{ 'smart-table-loading-mask': loading, 'tree-table': tree }"
      >
        <thead>
          <tr>
            <th
              v-for="col in headerColumns"
              :key="col.key"
              :class="[col.headerClassName, { 'col-fixed-left': col.fixed === 'left', 'col-fixed-right': col.fixed === 'right' }]"
              :style="colStyle(col)"
            >
              <span class="th-title">{{ resolveTitle(col) }}</span>
              <span
                v-if="col.sortable"
                class="sort-icon"
                @click.stop="onSortClick(col)"
              > ⇅</span>
            </th>
            <th
              v-if="editable"
              class="row-actions-header"
            >
              <span class="th-title">{{ actionColumnTitle }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="!loading">
            <tr v-if="renderRows.length === 0">
              <td :colspan="columnCount">
                <SmartTableEmpty
                  :text="emptyText"
                  :error="!!error"
                  @retry="$emit('retry')"
                />
              </td>
            </tr>
            <!-- 顶部虚拟占位 -->
            <tr
              v-if="virtualEnabled && topSpacerHeight > 0"
              aria-hidden="true"
              class="virtual-spacer-row"
            >
              <td
                :colspan="columnCount"
                :style="{ height: topSpacerHeight + 'px', padding: 0, margin: 0, border: 'none' }"
              />
            </tr>
            <tr
              v-for="(item, renderIdx) in renderRows"
              :key="resolveRowKey(item.row, item.rawIndex)"
              class="data-row"
              :class="{
                clickable: $attrs.onRowClick !== undefined,
                'editing-row': isEditingRow(item.row),
                'tree-row': tree,
              }"
              :style="rowStyle(item)"
              @click="$emit('row-click', item.row, item.rawIndex)"
            >
              <template
                v-for="(col, colIdx) in visibleColumns"
                :key="col.key"
              >
                <td
                  v-if="!isCellSkipped(renderIdx, colIdx)"
                  :class="[col.className, { 'col-fixed-left': col.fixed === 'left', 'col-fixed-right': col.fixed === 'right' }]"
                  :style="cellStyle(col, item.level)"
                  :colspan="getColspan(renderIdx, colIdx)"
                  :rowspan="getRowspan(renderIdx, colIdx)"
                >
                  <!-- 树形展开/折叠图标（仅首列） -->
                  <span
                    v-if="tree && colIdx === 0"
                    class="tree-toggle"
                    :class="{ 'is-leaf': !item.hasChildren }"
                    @click.stop="item.hasChildren ? toggleExpand(item) : null"
                  >
                    <svg
                      v-if="item.hasChildren"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      class="tree-toggle-icon"
                      :class="{ expanded: isExpanded(item.row) }"
                    >
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </span>
                  <!-- 编辑模式 -->
                  <template v-if="isEditingRow(item.row) && col.editable">
                    <input
                      v-if="resolveEditor(col) === 'text'"
                      class="cell-editor"
                      type="text"
                      :value="getBufferValue(col)"
                      @input="setBufferValue(col, ($event.target as HTMLInputElement).value)"
                      @click.stop
                    >
                    <input
                      v-else-if="resolveEditor(col) === 'number'"
                      class="cell-editor"
                      type="number"
                      :value="getBufferValue(col)"
                      @input="setBufferValue(col, Number(($event.target as HTMLInputElement).value))"
                      @click.stop
                    >
                    <input
                      v-else-if="resolveEditor(col) === 'date'"
                      class="cell-editor"
                      type="date"
                      :value="getBufferValue(col)"
                      @input="setBufferValue(col, ($event.target as HTMLInputElement).value)"
                      @click.stop
                    >
                    <select
                      v-else-if="resolveEditor(col) === 'select'"
                      class="cell-editor"
                      :value="getBufferValue(col)"
                      @change="setBufferValue(col, resolveSelectValue(col, ($event.target as HTMLSelectElement).value))"
                      @click.stop
                    >
                      <option
                        v-for="opt in col.editorOptions || []"
                        :key="String(opt.value)"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </template>
                  <!-- 普通渲染 -->
                  <template v-else>
                    <slot
                      :name="`cell-${col.key}`"
                      :row="item.row"
                      :value="getRowValue(item.row, col)"
                      :index="item.rawIndex"
                    >
                      <template v-if="col.formatter === 'status'">
                        <span
                          class="status-badge"
                          :class="'status-' + getRowValue(item.row, col)"
                        >
                          {{ formatCellValue(item.row, col, item.rawIndex) }}
                        </span>
                      </template>
                      <template v-else>
                        {{ formatCellValue(item.row, col, item.rawIndex) }}
                      </template>
                    </slot>
                  </template>
                </td>
              </template>
              <!-- 行编辑操作列 -->
              <td
                v-if="editable"
                class="row-actions-cell"
              >
                <template v-if="isEditingRow(item.row)">
                  <button
                    class="row-action-btn save-btn"
                    title="保存"
                    @click.stop="saveEdit(item.row)"
                  >
                    保存
                  </button>
                  <button
                    class="row-action-btn cancel-btn"
                    title="取消"
                    @click.stop="cancelEdit(item.row)"
                  >
                    取消
                  </button>
                </template>
                <button
                  v-else
                  class="row-action-btn edit-btn"
                  title="编辑"
                  @click.stop="startEdit(item.row)"
                >
                  编辑
                </button>
              </td>
            </tr>
            <!-- 底部虚拟占位 -->
            <tr
              v-if="virtualEnabled && bottomSpacerHeight > 0"
              aria-hidden="true"
              class="virtual-spacer-row"
            >
              <td
                :colspan="columnCount"
                :style="{ height: bottomSpacerHeight + 'px', padding: 0, margin: 0, border: 'none' }"
              />
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref, watch } from 'vue';
import type { SmartTableColumn, ColumnEditor, CellSpan } from './types';
import { getNestedValue, applyFormatter } from './utils/formatters';
import SmartTableEmpty from './SmartTableEmpty.vue';

const props = defineProps<{
  columns: SmartTableColumn<T>[];
  data: T[];
  rowKey?: string;
  loading?: boolean;
  emptyText?: string;
  error?: string | null;
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
}>();

const emit = defineEmits<{
  'row-click': [row: T, index: number];
  'sort-change': [key: string];
  retry: [];
  'update:editingRowId': [id: string | number | null];
  'row-edit-start': [row: T, rowId: any];
  'row-edit-save': [payload: { row: T; rowId: any; changes: Partial<T> }];
  'row-edit-cancel': [row: T, rowId: any];
  'update:expandedRowKeys': [keys: Array<string | number>];
  'tree-expand': [payload: { row: T; rowKey: any; level: number }];
  'tree-collapse': [payload: { row: T; rowKey: any; level: number }];
}>();

const visibleColumns = computed(() => props.columns);

const rowKeyField = computed(() => props.rowKey || 'id');
const childrenField = computed(() => props.childrenField || 'children');

// ============================================================
// 树形扁平化
// ============================================================

interface FlatRow<T> {
  row: T;
  level: number;
  hasChildren: boolean;
  rawIndex: number;
}

const flatRows = computed<FlatRow<T>[]>(() => {
  if (!props.tree) {
    return props.data.map((row, idx) => ({
      row,
      level: 0,
      hasChildren: false,
      rawIndex: idx,
    }));
  }
  const result: FlatRow<T>[] = [];
  const expanded = props.expandedRowKeys || [];
  const walk = (nodes: T[], level: number) => {
    for (const node of nodes) {
      const children = (node as any)[childrenField.value] as T[] | undefined;
      const hasChildren = Array.isArray(children) && children.length > 0;
      result.push({ row: node, level, hasChildren, rawIndex: result.length });
      if (hasChildren && expanded.includes(getRowKeyValue(node))) {
        walk(children!, level + 1);
      }
    }
  };
  walk(props.data, 0);
  return result;
});

function getRowKeyValue(row: T): any {
  return (row as any)[rowKeyField.value];
}

function resolveRowKey(row: T, fallbackIdx: number): any {
  const v = getRowKeyValue(row);
  return v != null ? v : fallbackIdx;
}

function isExpanded(row: T): boolean {
  const keys = props.expandedRowKeys || [];
  return keys.includes(getRowKeyValue(row));
}

function toggleExpand(item: FlatRow<T>) {
  const key = getRowKeyValue(item.row);
  const current = [...(props.expandedRowKeys || [])];
  const idx = current.indexOf(key);
  if (idx >= 0) {
    current.splice(idx, 1);
    emit('update:expandedRowKeys', current);
    emit('tree-collapse', { row: item.row, rowKey: key, level: item.level });
  } else {
    current.push(key);
    emit('update:expandedRowKeys', current);
    emit('tree-expand', { row: item.row, rowKey: key, level: item.level });
  }
}

// ============================================================
// 虚拟滚动
// ============================================================

const BUFFER = 5;
const scrollTop = ref(0);

const virtualEnabled = computed(() => {
  return !!props.virtualScroll && flatRows.value.length > 100;
});

const containerHeight = computed(() => {
  const total = flatRows.value.length * (props.rowHeight || 40);
  const max = (props.visibleRows || 20) * (props.rowHeight || 40);
  return Math.min(total, max);
});

const scrollContainerStyle = computed(() => {
  if (!virtualEnabled.value) return {};
  return {
    maxHeight: `${containerHeight.value}px`,
    overflowY: 'auto' as const,
  };
});

const startIndex = computed(() => {
  if (!virtualEnabled.value) return 0;
  const idx = Math.floor(scrollTop.value / (props.rowHeight || 40)) - BUFFER;
  return Math.max(0, idx);
});

const endIndex = computed(() => {
  if (!virtualEnabled.value) return flatRows.value.length;
  const visibleCount = Math.ceil(containerHeight.value / (props.rowHeight || 40)) + BUFFER * 2;
  return Math.min(flatRows.value.length, startIndex.value + visibleCount);
});

const renderRows = computed<FlatRow<T>[]>(() => {
  if (!virtualEnabled.value) return flatRows.value;
  return flatRows.value.slice(startIndex.value, endIndex.value);
});

const topSpacerHeight = computed(() => startIndex.value * (props.rowHeight || 40));
const bottomSpacerHeight = computed(() => {
  const total = flatRows.value.length;
  return Math.max(0, (total - endIndex.value) * (props.rowHeight || 40));
});

function onScroll(e: Event) {
  if (!virtualEnabled.value) return;
  scrollTop.value = (e.target as HTMLElement).scrollTop;
}

// ============================================================
// 合并单元格
// ============================================================

const hasSpanConfig = computed(() => {
  if (props.spanMethod) return true;
  return props.columns.some((c) => typeof c.colspan === 'function' || typeof c.rowspan === 'function');
});

/** 预计算每个渲染行的单元格 span 信息 */
const spanMap = computed<Array<Array<{ skip: boolean; colspan: number; rowspan: number }>>>(() => {
  if (!hasSpanConfig.value) {
    return renderRows.value.map(() =>
      visibleColumns.value.map(() => ({ skip: false, colspan: 1, rowspan: 1 })),
    );
  }
  const rows = renderRows.value;
  const cols = visibleColumns.value;
  // 记录被上方 rowspan 覆盖的列
  const skipSets: Set<number>[] = rows.map(() => new Set<number>());
  const map = rows.map((item, rowIdx) => {
    return cols.map((col, colIdx) => {
      if (skipSets[rowIdx].has(colIdx)) {
        return { skip: true, colspan: 0, rowspan: 0 };
      }
      let colspan = 1;
      let rowspan = 1;
      if (props.spanMethod) {
        const span = props.spanMethod(item.row, col, rowIdx, colIdx);
        colspan = span.colspan ?? 1;
        rowspan = span.rowspan ?? 1;
      } else {
        if (typeof col.colspan === 'function') colspan = Math.max(1, col.colspan(item.row, item.rawIndex));
        if (typeof col.rowspan === 'function') rowspan = Math.max(1, col.rowspan(item.row, item.rawIndex));
      }
      // 标记被覆盖的后续单元格
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          if (r === 0 && c === 0) continue;
          const tr = rowIdx + r;
          const tc = colIdx + c;
          if (rows[tr]) skipSets[tr].add(tc);
        }
      }
      return { skip: false, colspan, rowspan };
    });
  });
  return map;
});

function isCellSkipped(rowIdx: number, colIdx: number): boolean {
  if (!hasSpanConfig.value) return false;
  return spanMap.value[rowIdx]?.[colIdx]?.skip ?? false;
}

function getColspan(rowIdx: number, colIdx: number): number | undefined {
  if (!hasSpanConfig.value) return undefined;
  const cell = spanMap.value[rowIdx]?.[colIdx];
  if (!cell || cell.skip) return 0;
  return cell.colspan > 1 ? cell.colspan : undefined;
}

function getRowspan(rowIdx: number, colIdx: number): number | undefined {
  if (!hasSpanConfig.value) return undefined;
  const cell = spanMap.value[rowIdx]?.[colIdx];
  if (!cell || cell.skip) return 0;
  return cell.rowspan > 1 ? cell.rowspan : undefined;
}

// ============================================================
// 行编辑
// ============================================================

const editingBuffer = ref<Record<string, any>>({});

watch(
  () => props.editingRowId,
  (newId) => {
    if (newId == null) {
      editingBuffer.value = {};
      return;
    }
    const row = flatRows.value.find((r) => getRowKeyValue(r.row) === newId);
    if (row) {
      editingBuffer.value = { ...row.row };
    } else {
      editingBuffer.value = {};
    }
  },
  { immediate: true },
);

function isEditingRow(row: T): boolean {
  if (!props.editable || props.editingRowId == null) return false;
  return getRowKeyValue(row) === props.editingRowId;
}

function resolveEditor(col: SmartTableColumn<T>): ColumnEditor {
  return col.editor || 'text';
}

function getBufferValue(col: SmartTableColumn<T>): any {
  const dataKey = col.dataKey || col.key;
  return editingBuffer.value[dataKey];
}

function setBufferValue(col: SmartTableColumn<T>, val: any) {
  const dataKey = col.dataKey || col.key;
  editingBuffer.value = { ...editingBuffer.value, [dataKey]: val };
}

function resolveSelectValue(col: SmartTableColumn<T>, raw: string): any {
  const opt = (col.editorOptions || []).find((o) => String(o.value) === raw);
  return opt ? opt.value : raw;
}

function startEdit(row: T) {
  const id = getRowKeyValue(row);
  emit('update:editingRowId', id);
  emit('row-edit-start', row, id);
}

function cancelEdit(row: T) {
  const id = getRowKeyValue(row);
  emit('update:editingRowId', null);
  emit('row-edit-cancel', row, id);
}

function saveEdit(row: T) {
  const id = getRowKeyValue(row);
  const changes: Partial<T> = {};
  for (const col of visibleColumns.value) {
    if (!col.editable) continue;
    const dataKey = col.dataKey || col.key;
    const origVal = getNestedValue(row, dataKey);
    const newVal = editingBuffer.value[dataKey];
    if (origVal !== newVal) {
      (changes as any)[dataKey] = newVal;
    }
  }
  emit('row-edit-save', { row, rowId: id, changes });
  emit('update:editingRowId', null);
}

// ============================================================
// 渲染辅助
// ============================================================

const headerColumns = computed(() => {
  return visibleColumns.value;
});

const actionColumnTitle = computed(() => '操作');

const columnCount = computed(() => {
  return visibleColumns.value.length + (props.editable ? 1 : 0);
});

function resolveTitle(col: SmartTableColumn<T>): string {
  if (typeof col.title === 'function') return col.title(col);
  return col.title;
}

function getRowValue(row: T, col: SmartTableColumn<T>): any {
  const dataKey = col.dataKey || col.key;
  return getNestedValue(row, dataKey);
}

function formatCellValue(row: T, col: SmartTableColumn<T>, index: number): string {
  const value = getRowValue(row, col);
  return applyFormatter(value, col.formatter, col.render as any, row, index);
}

function colStyle(col: SmartTableColumn<T>): Record<string, string> {
  const style: Record<string, string> = {};
  if (col.width) style.width = typeof col.width === 'number' ? `${col.width}px` : col.width;
  if (col.minWidth) style.minWidth = `${col.minWidth}px`;
  if (col.align) style.textAlign = col.align;
  return style;
}

function rowStyle(_item: FlatRow<T>): Record<string, string> {
  if (virtualEnabled.value && props.rowHeight) {
    return { height: `${props.rowHeight}px` };
  }
  return {};
}

function cellStyle(col: SmartTableColumn<T>, level: number): Record<string, string> {
  const style = colStyle(col);
  // 树形首列缩进
  if (props.tree && (col === visibleColumns.value[0])) {
    style.paddingLeft = `${level * 20 + 12}px`;
  }
  return style;
}

function onSortClick(col: SmartTableColumn<T>) {
  if (!col.sortable) return;
  emit('sort-change', col.key);
}
</script>

<style scoped>
.smart-table-core-wrapper {
  flex: 1;
  min-height: 0;
}
.smart-table-scroll {
  overflow: auto;
  height: 100%;
}
.smart-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.smart-table thead { position: sticky; top: 0; z-index: 2; }
.smart-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  background: var(--surface);
  border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
.smart-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.data-row { transition: background 0.12s; }
.data-row:hover { background: var(--hover, rgba(255,255,255,0.03)); }
.data-row.clickable { cursor: pointer; }
.data-row.editing-row { background: var(--hover, rgba(255,255,255,0.04)); }
.th-title { display: inline-flex; align-items: center; }
.sort-icon { cursor: pointer; margin-left: 4px; opacity: 0.5; }
.sort-icon:hover { opacity: 1; }
.col-fixed-left { position: sticky; left: 0; z-index: 1; background: var(--surface); }
.col-fixed-right { position: sticky; right: 0; z-index: 1; background: var(--surface); }
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
/* Status colors — use CSS custom properties for theming */
.status-online { background: rgba(34, 197, 94, 0.12); color: #6ee7b7; }
.status-offline { background: #1e293b; color: #64748b; }
.status-error { background: rgba(239, 68, 68, 0.12); color: #fca5a5; }
.status-active { background: rgba(34, 197, 94, 0.12); color: #6ee7b7; }
.status-inactive { background: #1e293b; color: #64748b; }
.status-connecting { background: rgba(234, 179, 8, 0.12); color: #fde047; }
.status-degraded { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
.status-unregistered { background: #1e293b; color: #64748b; }
.status-registered { background: rgba(59, 130, 246, 0.12); color: #93c5fd; }

/* 树形表格 */
.tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  margin-right: 4px;
  cursor: pointer;
  vertical-align: middle;
}
.tree-toggle.is-leaf { cursor: default; }
.tree-toggle-icon {
  transition: transform 0.15s;
  color: var(--text-secondary);
}
.tree-toggle-icon.expanded { transform: rotate(90deg); }

/* 行编辑器 */
.cell-editor {
  width: 100%;
  max-width: 180px;
  padding: 4px 8px;
  border: 1px solid var(--primary, #3b82f6);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  box-sizing: border-box;
}
.cell-editor:focus {
  outline: none;
  border-color: var(--primary, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

/* 行操作按钮 */
.row-actions-cell {
  white-space: nowrap;
  text-align: right;
}
.row-action-btn {
  padding: 3px 10px;
  margin-left: 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.row-action-btn:hover { border-color: var(--primary, #3b82f6); }
.edit-btn { color: var(--primary, #3b82f6); }
.save-btn {
  background: var(--primary, #3b82f6);
  color: var(--surface, #fff);
  border-color: var(--primary, #3b82f6);
}
.save-btn:hover { opacity: 0.9; }
.cancel-btn:hover { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }

.virtual-spacer-row { background: transparent; }
</style>
