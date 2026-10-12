// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import type { PaginationConfig, PageChangeEvent } from '../types';

export function usePagination(
  config: () => PaginationConfig | undefined,
  totalCount: () => number,
  emit: (evt: 'page-change', payload: PageChangeEvent) => void,
) {
  const pageSizes = [10, 20, 50, 100];

  const currentPage = computed(() => {
    const c = config();
    return c?.page ?? 1;
  });

  const currentPageSize = computed(() => {
    const c = config();
    return c?.pageSize ?? 20;
  });

  const total = computed(() => {
    const c = config();
    if (c && c.total > 0) return c.total;
    return totalCount();
  });

  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(total.value / currentPageSize.value));
  });

  const slicedData = <T>(data: T[]): T[] => {
    const c = config();
    if (!c || c.mode === 'server' || c.total === 0) return data;
    const start = (c.page - 1) * c.pageSize;
    return data.slice(start, start + c.pageSize);
  };

  const showingFrom = computed(() => {
    return Math.min((currentPage.value - 1) * currentPageSize.value + 1, total.value);
  });

  const showingTo = computed(() => {
    return Math.min(currentPage.value * currentPageSize.value, total.value);
  });

  function goToPage(page: number) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) return;
    emit('page-change', { page, pageSize: currentPageSize.value });
  }

  function changePageSize(size: number) {
    if (size === currentPageSize.value) return;
    const newPage = 1;
    emit('page-change', { page: newPage, pageSize: size });
  }

  function goToInputPage(inputVal: string) {
    const p = parseInt(inputVal, 10);
    if (!isNaN(p)) goToPage(p);
  }

  return {
    pageSizes,
    currentPage,
    currentPageSize,
    total,
    totalPages,
    slicedData,
    showingFrom,
    showingTo,
    goToPage,
    changePageSize,
    goToInputPage,
  };
}
