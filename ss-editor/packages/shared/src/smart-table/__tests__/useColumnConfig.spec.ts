// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useColumnConfig } from '../composables/useColumnConfig';
import type { SmartTableColumn } from '../types';

function makeCols(partials: Partial<SmartTableColumn>[]): SmartTableColumn[] {
  return partials.map((p, i) => ({
    key: p.key ?? `col-${i}`,
    title: p.title ?? `Column ${i}`,
    defaultVisible: p.defaultVisible !== false,
    required: p.required ?? false,
  }));
}

describe('useColumnConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('TC-COL-001: all columns visible by default', async () => {
    const cols = makeCols([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    const colsRef = ref(cols);
    const { visibleColumns } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    expect(visibleColumns.value).toHaveLength(3);
  });

  it('TC-COL-002: columns with defaultVisible=false are hidden initially', async () => {
    const cols = makeCols([
      { key: 'a' },
      { key: 'b', defaultVisible: false },
      { key: 'c', defaultVisible: false },
    ]);
    const colsRef = ref(cols);
    const { visibleColumns, hiddenKeys } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    expect(visibleColumns.value).toHaveLength(1);
    expect(hiddenKeys.value).toEqual(['b', 'c']);
  });

  it('TC-COL-003: required columns stay visible even if defaultVisible=false', async () => {
    const cols = makeCols([
      { key: 'name', required: true, defaultVisible: false },
      { key: 'b' },
    ]);
    const colsRef = ref(cols);
    const { visibleColumns } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    expect(visibleColumns.value).toHaveLength(2);
  });

  it('TC-COL-004: toggleColumn hides a visible column', async () => {
    const cols = makeCols([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);
    const colsRef = ref(cols);
    const { visibleColumns, hiddenKeys, toggleColumn } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    toggleColumn('b');
    await nextTick();
    expect(hiddenKeys.value).toContain('b');
    expect(visibleColumns.value).toHaveLength(2);
  });

  it('TC-COL-005: toggleColumn shows a hidden column', async () => {
    const cols = makeCols([
      { key: 'a' },
      { key: 'b', defaultVisible: false },
    ]);
    const colsRef = ref(cols);
    const { visibleColumns, toggleColumn } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    toggleColumn('b');
    await nextTick();
    expect(visibleColumns.value).toHaveLength(2);
  });

  it('TC-COL-006: toggleColumn ignores required columns', async () => {
    const cols = makeCols([
      { key: 'name', required: true },
      { key: 'b' },
    ]);
    const colsRef = ref(cols);
    const { hiddenKeys, toggleColumn } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    toggleColumn('name');
    await nextTick();
    expect(hiddenKeys.value).not.toContain('name');
  });

  it('TC-COL-007: resetToDefault restores initial visibility', async () => {
    const cols = makeCols([
      { key: 'a' },
      { key: 'b', defaultVisible: false },
    ]);
    const colsRef = ref(cols);
    const { visibleColumns, toggleColumn, resetToDefault } = useColumnConfig(() => 'test-table', colsRef);

    await nextTick();
    toggleColumn('a'); // hide
    expect(visibleColumns.value).toHaveLength(0);
    resetToDefault();
    await nextTick();
    expect(visibleColumns.value).toHaveLength(1); // only 'a'
  });

  it('TC-COL-008: persistence survives re-init', async () => {
    const cols = makeCols([{ key: 'a' }, { key: 'b' }]);
    const colsRef = ref(cols);
    const { toggleColumn } = useColumnConfig(() => 'persist-test', colsRef);
    await nextTick();
    toggleColumn('b');

    // create new instance
    const colsRef2 = ref(cols);
    const { visibleColumns: vc2 } = useColumnConfig(() => 'persist-test', colsRef2);
    await nextTick();
    expect(vc2.value).toHaveLength(1);
    expect(vc2.value[0].key).toBe('a');
  });

  it('TC-COL-009: different tableId has independent config', async () => {
    const cols = makeCols([{ key: 'a' }, { key: 'b' }]);
    const colsRef = ref(cols);

    const t1 = useColumnConfig(() => 'table-1', colsRef);
    const t2 = useColumnConfig(() => 'table-2', colsRef);
    await nextTick();

    t1.toggleColumn('b');
    await nextTick();
    expect(t1.visibleColumns.value).toHaveLength(1);
    expect(t2.visibleColumns.value).toHaveLength(2);
  });

  it('TC-COL-010: configurableColumns excludes required columns', async () => {
    const cols = makeCols([
      { key: 'name', required: true },
      { key: 'a' },
      { key: 'b', required: true },
    ]);
    const colsRef = ref(cols);
    const { configurableColumns } = useColumnConfig(() => 'test-table', colsRef);
    await nextTick();
    expect(configurableColumns.value).toHaveLength(1);
    expect(configurableColumns.value[0].key).toBe('a');
  });
});
