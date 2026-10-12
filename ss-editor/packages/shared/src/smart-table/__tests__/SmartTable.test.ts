// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SmartTable from '../SmartTable.vue';
import type { SmartTableColumn } from '../types';

function makeCols(count: number): SmartTableColumn[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `col-${i}`,
    title: `Column ${i}`,
    dataKey: `col${i}`,
  }));
}

function makeRows(count: number, prefix = ''): Record<string, any>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    col0: `${prefix}name-${i + 1}`,
    col1: `tid-${i + 1}`,
    col2: i % 2 === 0 ? 'online' : 'offline',
    col3: 1000 * (i + 1),
  }));
}

describe('SmartTable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('rendering', () => {
    it('TC-TBL-001: renders table with headers', () => {
      const cols = makeCols(3);
      const data = makeRows(2);
      const wrapper = mount(SmartTable, {
        props: { data, columns: cols, tableId: 'test-1' },
      });

      expect(wrapper.find('table').exists()).toBe(true);
      expect(wrapper.findAll('th')).toHaveLength(3);
    });

    it('TC-TBL-002: renders data rows', () => {
      const cols = makeCols(2);
      const data = makeRows(3);
      const wrapper = mount(SmartTable, {
        props: { data, columns: cols, tableId: 'test-2' },
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBeGreaterThanOrEqual(3);
    });

    it('TC-TBL-003: shows empty state when data is empty', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: [], columns: cols, tableId: 'test-3' },
      });

      expect(wrapper.text()).toContain('暂无数据');
    });

    it('TC-TBL-004: shows custom empty text', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: [], columns: cols, tableId: 'test-4', emptyText: '没有设备' },
      });

      expect(wrapper.text()).toContain('没有设备');
    });

    it('TC-TBL-005: shows loading skeleton', () => {
      const cols = makeCols(4);
      const wrapper = mount(SmartTable, {
        props: { data: [], columns: cols, tableId: 'test-5', loading: true },
      });

      expect(wrapper.find('.smart-table-loading').exists()).toBe(true);
    });

    it('TC-TBL-006: does not show table rows while loading', () => {
      const cols = makeCols(2);
      const data = makeRows(2);
      const wrapper = mount(SmartTable, {
        props: { data, columns: cols, tableId: 'test-6', loading: true },
      });

      expect(wrapper.find('tbody').exists()).toBe(false);
    });
  });

  describe('pagination', () => {
    it('TC-TBL-007: shows pagination when enablePagination=true', () => {
      const cols = makeCols(2);
      const data = makeRows(50);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-7',
          enablePagination: true,
          pagination: { page: 1, pageSize: 20, total: 50, mode: 'client' },
        },
      });

      expect(wrapper.find('.smart-table-pagination').exists()).toBe(true);
    });

    it('TC-TBL-008: hides pagination when enablePagination=false', () => {
      const cols = makeCols(2);
      const data = makeRows(50);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-8',
          enablePagination: false,
        },
      });

      expect(wrapper.find('.smart-table-pagination').exists()).toBe(false);
    });

    it('TC-TBL-009: emit page-change on pagination action', async () => {
      const cols = makeCols(2);
      const data = makeRows(30);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-9',
          enablePagination: true,
          pagination: { page: 1, pageSize: 10, total: 30, mode: 'client' },
        },
      });

      const nextButtons = wrapper.findAll('.page-btn:not(:disabled)');
      const nextBtn = nextButtons[nextButtons.length - 1];
      if (nextBtn) {
        await nextBtn.trigger('click');
      }
      expect(wrapper.emitted('page-change')).toBeTruthy();
    });
  });

  describe('column toggle', () => {
    it('TC-TBL-010: shows column toggle button when enabled', () => {
      const cols = makeCols(3);
      const data = makeRows(2);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-10',
          showColumnToggle: true,
        },
      });

      expect(wrapper.text()).toContain('列配置');
    });

    it('TC-TBL-011: hides column toggle when disabled', () => {
      const cols = makeCols(3);
      const data = makeRows(2);
      const wrapper = mount(SmartTable, {
        props: { data, columns: cols, tableId: 'test-11', showColumnToggle: false },
      });

      expect(wrapper.text()).not.toContain('列配置');
    });
  });

  describe('export', () => {
    it('TC-TBL-012: shows export button when enabled', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: makeRows(2), columns: cols, tableId: 'test-12', showExport: true },
      });

      expect(wrapper.text()).toContain('导出');
    });

    it('TC-TBL-013: hides export button when disabled', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: makeRows(2), columns: cols, tableId: 'test-13', showExport: false },
      });

      expect(wrapper.text()).not.toContain('导出');
    });

    it('TC-TBL-014: export button disabled when data empty', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: [], columns: cols, tableId: 'test-14', showExport: true },
      });

      const exportBtn = wrapper.find('.toolbar-btn[disabled]');
      expect(exportBtn.exists()).toBe(true);
    });
  });

  describe('slots', () => {
    it('TC-TBL-015: renders toolbar-left slot content', () => {
      const cols = makeCols(2);
      const wrapper = mount(SmartTable, {
        props: { data: makeRows(2), columns: cols, tableId: 'test-15', showColumnToggle: true },
        slots: { 'toolbar-left': '<span class="custom">Filter</span>' },
      });

      expect(wrapper.find('.custom').exists()).toBe(true);
    });

    it('TC-TBL-016: renders cell slot override', () => {
      const cols = [{ key: 'col0', title: 'Name', dataKey: 'col0' }];
      const wrapper = mount(SmartTable, {
        props: { data: [{ col0: 'Alice' }], columns: cols, tableId: 'test-16' },
        slots: { 'cell-col0': '<b class="custom-name">Alice</b>' },
      });

      expect(wrapper.find('.custom-name').exists()).toBe(true);
    });
  });

  // ============================================================
  // 虚拟滚动
  // ============================================================
  describe('virtual scroll', () => {
    it('TC-TBL-VS-001: renders only visible rows when data > 100', () => {
      const cols = makeCols(2);
      const data = makeRows(200);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-vs-1',
          enablePagination: false,
          virtualScroll: true,
          rowHeight: 40,
          visibleRows: 20,
        },
      });

      const dataRows = wrapper.findAll('tbody tr.data-row');
      // 20 visible + 2*5 buffer = 30
      expect(dataRows.length).toBe(30);
      // 不应渲染全部 200 行
      expect(dataRows.length).toBeLessThan(200);
      // 首行应包含 name-1
      expect(dataRows[0].text()).toContain('name-1');
    });

    it('TC-TBL-VS-002: does not enable virtual scroll when data <= 100', () => {
      const cols = makeCols(2);
      const data = makeRows(80);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-vs-2',
          enablePagination: false,
          virtualScroll: true,
          rowHeight: 40,
          visibleRows: 20,
        },
      });

      const dataRows = wrapper.findAll('tbody tr.data-row');
      expect(dataRows.length).toBe(80);
      expect(wrapper.find('.virtual-spacer-row').exists()).toBe(false);
    });

    it('TC-TBL-VS-003: updates rendered range after scroll', async () => {
      const cols = makeCols(2);
      const data = makeRows(200);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-vs-3',
          enablePagination: false,
          virtualScroll: true,
          rowHeight: 40,
          visibleRows: 20,
        },
        attachTo: document.body,
      });

      // 初始：首行包含 name-1，不包含 name-100
      const initialRows = wrapper.findAll('tbody tr.data-row');
      expect(initialRows[0].text()).toContain('name-1');
      expect(wrapper.text()).not.toContain('name-100');

      // 滚动到 scrollTop = 4000 → startIndex = floor(4000/40) - 5 = 95
      const scrollEl = wrapper.find('.smart-table-scroll');
      (scrollEl.element as HTMLElement).scrollTop = 4000;
      await scrollEl.trigger('scroll');

      const dataRows = wrapper.findAll('tbody tr.data-row');
      expect(dataRows.length).toBe(30);
      // 滚动后首行应为 name-96（index 95），不再是 name-1
      expect(dataRows[0].text()).toContain('name-96');
      expect(dataRows[0].text()).not.toContain('name-1');

      wrapper.unmount();
    });

    it('TC-TBL-VS-004: renders spacer rows to maintain scroll height', () => {
      const cols = makeCols(2);
      const data = makeRows(200);
      const wrapper = mount(SmartTable, {
        props: {
          data,
          columns: cols,
          tableId: 'test-vs-4',
          enablePagination: false,
          virtualScroll: true,
          rowHeight: 40,
          visibleRows: 20,
        },
      });

      // 顶部 spacer 在 startIndex=0 时不渲染，底部 spacer 应存在
      const spacers = wrapper.findAll('.virtual-spacer-row');
      expect(spacers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // 行编辑
  // ============================================================
  describe('row editing', () => {
    const editCols: SmartTableColumn[] = [
      { key: 'name', title: 'Name', dataKey: 'name', editable: true, editor: 'text' },
      { key: 'age', title: 'Age', dataKey: 'age', editable: true, editor: 'number' },
    ];
    const editData = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
    ];

    it('TC-TBL-RE-001: shows edit button when editable=true', () => {
      const wrapper = mount(SmartTable, {
        props: { data: editData, columns: editCols, tableId: 'test-re-1', enablePagination: false, editable: true },
      });

      expect(wrapper.findAll('.edit-btn').length).toBe(2);
    });

    it('TC-TBL-RE-002: clicking edit emits row-edit-start and update:editingRowId', async () => {
      const wrapper = mount(SmartTable, {
        props: { data: editData, columns: editCols, tableId: 'test-re-2', enablePagination: false, editable: true },
      });

      await wrapper.findAll('.edit-btn')[0].trigger('click');

      expect(wrapper.emitted('update:editingRowId')).toBeTruthy();
      expect(wrapper.emitted('update:editingRowId')![0]).toEqual([1]);
      expect(wrapper.emitted('row-edit-start')).toBeTruthy();
      const payload = wrapper.emitted('row-edit-start')![0];
      expect(payload[1]).toBe(1);
    });

    it('TC-TBL-RE-003: renders inputs when editingRowId matches a row', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: editData,
          columns: editCols,
          tableId: 'test-re-3',
          enablePagination: false,
          editable: true,
          editingRowId: 1,
        },
      });

      const inputs = wrapper.findAll('input.cell-editor');
      expect(inputs.length).toBe(2);
      // text 输入框包含 Alice
      const textInput = inputs.find((i) => i.attributes('type') === 'text');
      expect((textInput?.element as HTMLInputElement).value).toBe('Alice');
      // 编辑行应显示保存/取消按钮
      expect(wrapper.find('.save-btn').exists()).toBe(true);
      expect(wrapper.find('.cancel-btn').exists()).toBe(true);
    });

    it('TC-TBL-RE-004: save emits row-edit-save with changes', async () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: editData,
          columns: editCols,
          tableId: 'test-re-4',
          enablePagination: false,
          editable: true,
          editingRowId: 1,
        },
      });

      const textInput = wrapper.findAll('input.cell-editor').find((i) => i.attributes('type') === 'text');
      await textInput!.setValue('Alicia');
      await wrapper.find('.save-btn').trigger('click');

      expect(wrapper.emitted('row-edit-save')).toBeTruthy();
      const payload = wrapper.emitted('row-edit-save')![0] as any;
      expect(payload[0].rowId).toBe(1);
      expect(payload[0].changes.name).toBe('Alicia');
      expect(payload[0].changes.age).toBeUndefined();
      // 保存后退出编辑模式
      expect(wrapper.emitted('update:editingRowId')![0]).toEqual([null]);
    });

    it('TC-TBL-RE-005: cancel emits row-edit-cancel and exits edit mode', async () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: editData,
          columns: editCols,
          tableId: 'test-re-5',
          enablePagination: false,
          editable: true,
          editingRowId: 1,
        },
      });

      await wrapper.find('.cancel-btn').trigger('click');

      expect(wrapper.emitted('row-edit-cancel')).toBeTruthy();
      const cancelPayload = wrapper.emitted('row-edit-cancel')![0];
      expect(cancelPayload[1]).toBe(1);
      expect(wrapper.emitted('update:editingRowId')![0]).toEqual([null]);
    });

    it('TC-TBL-RE-006: renders select editor when editor=select', () => {
      const cols: SmartTableColumn[] = [
        {
          key: 'status',
          title: 'Status',
          dataKey: 'status',
          editable: true,
          editor: 'select',
          editorOptions: [
            { label: 'Online', value: 'online' },
            { label: 'Offline', value: 'offline' },
          ],
        },
      ];
      const wrapper = mount(SmartTable, {
        props: {
          data: [{ id: 1, status: 'online' }],
          columns: cols,
          tableId: 'test-re-6',
          enablePagination: false,
          editable: true,
          editingRowId: 1,
        },
      });

      const select = wrapper.find('select.cell-editor');
      expect(select.exists()).toBe(true);
      expect(select.findAll('option').length).toBe(2);
    });
  });

  // ============================================================
  // 树形表格
  // ============================================================
  describe('tree table', () => {
    const treeCols: SmartTableColumn[] = [
      { key: 'name', title: 'Name', dataKey: 'name' },
    ];
    const treeData = [
      {
        id: 1,
        name: 'root1',
        children: [
          { id: 2, name: 'child1', children: [] },
          { id: 3, name: 'child2', children: [] },
        ],
      },
      { id: 4, name: 'root2', children: [] },
    ];

    it('TC-TBL-TT-001: renders only top-level rows when collapsed', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-1',
          enablePagination: false,
          tree: true,
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      expect(rows.length).toBe(2);
      expect(wrapper.text()).toContain('root1');
      expect(wrapper.text()).toContain('root2');
      expect(wrapper.text()).not.toContain('child1');
    });

    it('TC-TBL-TT-002: shows expand icon for rows with children', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-2',
          enablePagination: false,
          tree: true,
        },
      });

      const toggles = wrapper.findAll('.tree-toggle');
      expect(toggles.length).toBe(2);
      // root1 有子节点，应有 svg 图标；root2 无子节点，无 svg
      const root1Toggle = toggles[0];
      expect(root1Toggle.find('svg').exists()).toBe(true);
      const root2Toggle = toggles[1];
      expect(root2Toggle.find('svg').exists()).toBe(false);
      expect(root2Toggle.classes()).toContain('is-leaf');
    });

    it('TC-TBL-TT-003: clicking expand emits tree-expand and updates keys', async () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-3',
          enablePagination: false,
          tree: true,
        },
      });

      await wrapper.findAll('.tree-toggle')[0].trigger('click');

      expect(wrapper.emitted('update:expandedRowKeys')).toBeTruthy();
      expect(wrapper.emitted('update:expandedRowKeys')![0]).toEqual([[1]]);
      expect(wrapper.emitted('tree-expand')).toBeTruthy();
      const payload = wrapper.emitted('tree-expand')![0] as any;
      expect(payload[0].rowKey).toBe(1);
      expect(payload[0].level).toBe(0);
    });

    it('TC-TBL-TT-004: renders child rows when expandedRowKeys set', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-4',
          enablePagination: false,
          tree: true,
          expandedRowKeys: [1],
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      expect(rows.length).toBe(4);
      expect(wrapper.text()).toContain('child1');
      expect(wrapper.text()).toContain('child2');
    });

    it('TC-TBL-TT-005: indents child rows by level', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-5',
          enablePagination: false,
          tree: true,
          expandedRowKeys: [1],
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      // root1 (level 0) → padding-left: 12px; child1 (level 1) → padding-left: 32px
      const rootCellStyle = rows[0].find('td').attributes('style') || '';
      const childCellStyle = rows[1].find('td').attributes('style') || '';
      expect(rootCellStyle).toContain('padding-left: 12px');
      expect(childCellStyle).toContain('padding-left: 32px');
    });

    it('TC-TBL-TT-006: collapsing emits tree-collapse', async () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: treeData,
          columns: treeCols,
          tableId: 'test-tt-6',
          enablePagination: false,
          tree: true,
          expandedRowKeys: [1],
        },
      });

      await wrapper.findAll('.tree-toggle')[0].trigger('click');

      expect(wrapper.emitted('update:expandedRowKeys')![0]).toEqual([[]]);
      expect(wrapper.emitted('tree-collapse')).toBeTruthy();
      const payload = wrapper.emitted('tree-collapse')![0] as any;
      expect(payload[0].rowKey).toBe(1);
    });
  });

  // ============================================================
  // 合并单元格
  // ============================================================
  describe('merged cells', () => {
    const spanCols: SmartTableColumn[] = [
      { key: 'name', title: 'Name', dataKey: 'name' },
      { key: 'type', title: 'Type', dataKey: 'type' },
      { key: 'value', title: 'Value', dataKey: 'value' },
    ];
    const spanData = [
      { id: 1, name: 'A', type: 't1', value: 'v1' },
      { id: 2, name: 'B', type: 't2', value: 'v2' },
      { id: 3, name: 'C', type: 't3', value: 'v3' },
    ];

    it('TC-TBL-MC-001: applies colspan via spanMethod and skips covered cell', () => {
      const spanMethod = (_row: any, _col: any, rowIdx: number, colIdx: number) => {
        if (rowIdx === 0 && colIdx === 0) return { colspan: 2, rowspan: 1 };
        return { colspan: 1, rowspan: 1 };
      };
      const wrapper = mount(SmartTable, {
        props: {
          data: spanData,
          columns: spanCols,
          tableId: 'test-mc-1',
          enablePagination: false,
          spanMethod: spanMethod as any,
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      // 第一行：第一个 td colspan=2，第二个 td 被跳过，第三个 td 正常 → 2 个 td
      const firstRowTds = rows[0].findAll('td');
      expect(firstRowTds.length).toBe(2);
      expect(firstRowTds[0].attributes('colspan')).toBe('2');
      // 其他行应为 3 个 td
      expect(rows[1].findAll('td').length).toBe(3);
    });

    it('TC-TBL-MC-002: applies rowspan via spanMethod and skips covered cell in next row', () => {
      const spanMethod = (_row: any, _col: any, rowIdx: number, colIdx: number) => {
        if (rowIdx === 0 && colIdx === 0) return { colspan: 1, rowspan: 2 };
        return { colspan: 1, rowspan: 1 };
      };
      const wrapper = mount(SmartTable, {
        props: {
          data: spanData,
          columns: spanCols,
          tableId: 'test-mc-2',
          enablePagination: false,
          spanMethod: spanMethod as any,
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      // 第一行第一个 td rowspan=2
      const firstRowFirstTd = rows[0].findAll('td')[0];
      expect(firstRowFirstTd.attributes('rowspan')).toBe('2');
      // 第二行第一个 td 被跳过 → 只有 2 个 td（type、value）
      expect(rows[1].findAll('td').length).toBe(2);
    });

    it('TC-TBL-MC-003: supports column-level colspan function', () => {
      const cols: SmartTableColumn[] = [
        { key: 'name', title: 'Name', dataKey: 'name', colspan: () => 3 },
        { key: 'type', title: 'Type', dataKey: 'type' },
        { key: 'value', title: 'Value', dataKey: 'value' },
      ];
      const wrapper = mount(SmartTable, {
        props: {
          data: spanData,
          columns: cols,
          tableId: 'test-mc-3',
          enablePagination: false,
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      // 每行第一个 td colspan=3，后两个 td 被跳过 → 1 个 td
      const firstRowTds = rows[0].findAll('td');
      expect(firstRowTds.length).toBe(1);
      expect(firstRowTds[0].attributes('colspan')).toBe('3');
    });

    it('TC-TBL-MC-004: no span config renders all cells normally', () => {
      const wrapper = mount(SmartTable, {
        props: {
          data: spanData,
          columns: spanCols,
          tableId: 'test-mc-4',
          enablePagination: false,
        },
      });

      const rows = wrapper.findAll('tbody tr.data-row');
      rows.forEach((row) => {
        expect(row.findAll('td').length).toBe(3);
      });
    });
  });
});
