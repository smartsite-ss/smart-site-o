// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed, watch, type Ref } from 'vue';
import type { SmartTableColumn, ColumnPersist } from '../types';

const STORAGE_PREFIX = 'smart-table:';
const STORAGE_SUFFIX = ':columns';

export function useColumnConfig(tableId: () => string, columnsRef: Ref<SmartTableColumn[]>) {
  const hiddenKeys = ref<string[]>([]);
  const dropdownVisible = ref(false);

  const storageKey = computed(() => `${STORAGE_PREFIX}${tableId()}${STORAGE_SUFFIX}`);

  /** 加载持久化配置 */
  function loadFromStorage(): ColumnPersist | null {
    if (!tableId()) return null;
    try {
      const raw = localStorage.getItem(storageKey.value);
      if (!raw) return null;
      return JSON.parse(raw) as ColumnPersist;
    } catch {
      return null;
    }
  }

  /** 持久化到 localStorage */
  function persist() {
    if (!tableId()) return;
    try {
      const data: ColumnPersist = {
        hiddenKeys: hiddenKeys.value,
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey.value, JSON.stringify(data));
    } catch {
      // localStorage may be full or disabled
    }
  }

  /** 初始化隐藏列 */
  function init() {
    const columns = columnsRef.value;
    const persisted = loadFromStorage();
    if (persisted) {
      hiddenKeys.value = persisted.hiddenKeys.filter(
        (k) => columns.some((c) => c.key === k),
      );
    } else {
      hiddenKeys.value = columns
        .filter((c) => c.defaultVisible === false && !c.required)
        .map((c) => c.key);
    }
  }

  // 当 tableId 或 columns 变化时重新初始化
  watch(
    [tableId, columnsRef],
    () => {
      init();
    },
    { immediate: true },
  );

  /** 可见列 */
  const visibleColumns = computed(() => {
    return columnsRef.value.filter((c) => !hiddenKeys.value.includes(c.key));
  });

  /** 可配置列（非 required） */
  const configurableColumns = computed(() => {
    return columnsRef.value.filter((c) => !c.required);
  });

  /** 切换某列的显示/隐藏 */
  function toggleColumn(key: string) {
    const col = columnsRef.value.find((c) => c.key === key);
    if (!col || col.required) return;

    const idx = hiddenKeys.value.indexOf(key);
    if (idx >= 0) {
      hiddenKeys.value.splice(idx, 1);
    } else {
      hiddenKeys.value.push(key);
    }
    persist();
  }

  /** 重置为默认 */
  function resetToDefault() {
    hiddenKeys.value = columnsRef.value
      .filter((c) => c.defaultVisible === false && !c.required)
      .map((c) => c.key);
    persist();
    dropdownVisible.value = false;
  }

  function toggleDropdown() {
    dropdownVisible.value = !dropdownVisible.value;
  }

  function closeDropdown() {
    dropdownVisible.value = false;
  }

  return {
    hiddenKeys,
    visibleColumns,
    configurableColumns,
    dropdownVisible,
    toggleColumn,
    resetToDefault,
    toggleDropdown,
    closeDropdown,
  };
}
