// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, computed, Ref } from 'vue';

interface UseVirtualListOptions<T> {
  items: Ref<T[]>;
  containerHeight: Ref<number>;
  itemHeight: number;
  bufferSize?: number;
}

export function useVirtualList<T>(options: UseVirtualListOptions<T>) {
  const { items, containerHeight, itemHeight, bufferSize = 5 } = options;

  const scrollTop = ref(0);

  const totalHeight = computed(() => items.value.length * itemHeight);

  const visibleItems = computed(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferSize);
    const endIndex = Math.min(
      items.value.length,
      Math.ceil((scrollTop.value + containerHeight.value) / itemHeight) + bufferSize
    );
    return items.value.slice(startIndex, endIndex).map((item, index) => ({
      index: startIndex + index,
      item,
      style: {
        position: 'absolute',
        top: `${(startIndex + index) * itemHeight}px`,
        left: 0,
        right: 0,
        height: `${itemHeight}px`,
      },
    }));
  });

  const startOffset = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferSize) * itemHeight;
  });

  const endOffset = computed(() => {
    const endIndex = Math.ceil((scrollTop.value + containerHeight.value) / itemHeight) + bufferSize;
    return Math.max(0, items.value.length - endIndex) * itemHeight;
  });

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    scrollTop.value = target.scrollTop;
  };

  return {
    scrollTop,
    totalHeight,
    visibleItems,
    startOffset,
    endOffset,
    handleScroll,
  };
}
