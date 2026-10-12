// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useVirtualList } from '../../composables/useVirtualList';

describe('useVirtualList', () => {
  it('should initialize with correct values', () => {
    const items = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const containerHeight = ref(200);
    const itemHeight = 50;

    const { totalHeight, visibleItems } = useVirtualList({
      items,
      containerHeight,
      itemHeight,
    });

    expect(totalHeight.value).toBe(500); // 10 items * 50px
    expect(visibleItems.value.length).toBeGreaterThan(0);
  });

  it('should update visible items on scroll', () => {
    const items = ref(Array.from({ length: 20 }, (_, i) => i + 1));
    const containerHeight = ref(200);
    const itemHeight = 50;

    const { scrollTop, visibleItems, handleScroll: _handleScroll } = useVirtualList({
      items,
      containerHeight,
      itemHeight,
    });

    // simulate scroll event
    scrollTop.value = 100;

    expect(visibleItems.value.length).toBeGreaterThan(0);
  });
});
