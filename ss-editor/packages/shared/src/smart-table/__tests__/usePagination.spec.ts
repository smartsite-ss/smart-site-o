// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { usePagination } from '../composables/usePagination';
import type { PaginationConfig } from '../types';

describe('usePagination', () => {
  let emit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emit = vi.fn();
  });

  describe('client mode', () => {
    const makeConfig = (page = 1, pageSize = 20, total = 100): PaginationConfig => ({
      page, pageSize, total, mode: 'client',
    });

    it('TC-PAG-001: calculates totalPages correctly', () => {
      const config = ref(makeConfig());
      const data = ref<any[]>([]);
      const { totalPages, total } = usePagination(() => config.value, () => data.value.length, emit);

      expect(total.value).toBe(100);
      expect(totalPages.value).toBe(5);
    });

    it('TC-PAG-002: shows correct showingFrom / showingTo on page 1', () => {
      const config = ref(makeConfig(1, 20, 45));
      const data = ref<any[]>([]);
      const { showingFrom, showingTo } = usePagination(() => config.value, () => data.value.length, emit);

      expect(showingFrom.value).toBe(1);
      expect(showingTo.value).toBe(20);
    });

    it('TC-PAG-003: shows correct showingFrom / showingTo on last page', () => {
      const config = ref(makeConfig(3, 20, 45));
      const data = ref<any[]>([]);
      const { showingFrom, showingTo } = usePagination(() => config.value, () => data.value.length, emit);

      expect(showingFrom.value).toBe(41);
      expect(showingTo.value).toBe(45);
    });

    it('TC-PAG-004: slices data correctly for page 1', () => {
      const config = ref(makeConfig(1, 5, 25));
      const source = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const { slicedData } = usePagination(() => config.value, () => source.length, emit);

      const page = slicedData(source);
      expect(page).toHaveLength(5);
      expect(page[0].id).toBe(1);
      expect(page[4].id).toBe(5);
    });

    it('TC-PAG-005: slices data for page 3', () => {
      const config = ref(makeConfig(3, 5, 25));
      const source = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const { slicedData } = usePagination(() => config.value, () => source.length, emit);

      const page = slicedData(source);
      expect(page).toHaveLength(5);
      expect(page[0].id).toBe(11);
    });

    it('TC-PAG-006: goToPage emits page-change', () => {
      const config = ref(makeConfig());
      const data = ref<any[]>([]);
      const { goToPage } = usePagination(() => config.value, () => data.value.length, emit);

      goToPage(3);
      expect(emit).toHaveBeenCalledWith('page-change', { page: 3, pageSize: 20 });
    });

    it('TC-PAG-007: goToPage ignores same page', () => {
      const config = ref(makeConfig(1, 20, 100));
      const data = ref<any[]>([]);
      const { goToPage } = usePagination(() => config.value, () => data.value.length, emit);

      goToPage(1);
      expect(emit).not.toHaveBeenCalled();
    });

    it('TC-PAG-008: goToPage ignores page 0', () => {
      const config = ref(makeConfig());
      const data = ref<any[]>([]);
      const { goToPage } = usePagination(() => config.value, () => data.value.length, emit);

      goToPage(0);
      expect(emit).not.toHaveBeenCalled();
    });

    it('TC-PAG-009: goToPage ignores out-of-range page', () => {
      const config = ref(makeConfig(1, 20, 100));
      const data = ref<any[]>([]);
      const { goToPage } = usePagination(() => config.value, () => data.value.length, emit);

      goToPage(10);
      expect(emit).not.toHaveBeenCalled();
    });

    it('TC-PAG-010: changePageSize emits page-change with reset to page 1', () => {
      const config = ref(makeConfig(3, 20, 100));
      const data = ref<any[]>([]);
      const { changePageSize } = usePagination(() => config.value, () => data.value.length, emit);

      changePageSize(50);
      expect(emit).toHaveBeenCalledWith('page-change', { page: 1, pageSize: 50 });
    });

    it('TC-PAG-011: changePageSize ignores same size', () => {
      const config = ref(makeConfig(1, 20, 100));
      const data = ref<any[]>([]);
      const { changePageSize } = usePagination(() => config.value, () => data.value.length, emit);

      changePageSize(20);
      expect(emit).not.toHaveBeenCalled();
    });

    it('TC-PAG-012: totalPages = 1 when data is empty with client total=0', () => {
      const config = ref(makeConfig(1, 20, 0));
      const data = ref<any[]>([]);
      const { totalPages } = usePagination(() => config.value, () => data.value.length, emit);

      expect(totalPages.value).toBe(1);
    });

    it('TC-PAG-013: uses data length as total when config.total is 0', () => {
      const config = ref(makeConfig(1, 10, 0));
      const data = ref([{}, {}, {}]);
      const { total, totalPages } = usePagination(() => config.value, () => data.value.length, emit);

      expect(total.value).toBe(3);
      expect(totalPages.value).toBe(1);
    });

    it('TC-PAG-014: goToInputPage navigates to valid page', () => {
      const config = ref(makeConfig());
      const data = ref<any[]>([]);
      const { goToInputPage } = usePagination(() => config.value, () => data.value.length, emit);

      goToInputPage('4');
      expect(emit).toHaveBeenCalledWith('page-change', { page: 4, pageSize: 20 });
    });
  });

  describe('server mode', () => {
    it('TC-PAG-015: does not slice data in server mode', () => {
      const config: PaginationConfig = { page: 1, pageSize: 20, total: 100, mode: 'server' };
      const configRef = ref(config);
      const source = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
      const { slicedData } = usePagination(() => configRef.value, () => 100, emit);

      const page = slicedData(source);
      expect(page).toHaveLength(20); // same as input
    });
  });
});
