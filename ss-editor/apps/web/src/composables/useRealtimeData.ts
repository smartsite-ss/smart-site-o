// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, watch, onUnmounted } from 'vue';
import { useWsStore } from '@scada-editor/system';

export function useRealtimeData(projectId: string) {
  const wsStore = useWsStore() as any;
  const tagValues = ref<Map<string, any>>(new Map());

  function connect() {
    wsStore.connect(projectId);
  }

  function subscribeTags(tagIds: string[]) {
    wsStore.subscribeTags(tagIds);
  }

  function disconnect() {
    wsStore.disconnect();
  }

  watch(
    () => wsStore.tagValues,
    (newValues) => {
      const map = new Map<string, any>();
      newValues.forEach((tv: { value: any }, tagId: string) => {
        map.set(tagId, tv.value);
      });
      tagValues.value = map;
    },
    { deep: true },
  );

  onUnmounted(() => {
    disconnect();
  });

  return {
    tagValues,
    isConnected: wsStore.isConnected,
    connectionStatus: wsStore.connectionStatus,
    connect,
    subscribeTags,
    disconnect,
    getTagValue: (tagId: string) => wsStore.getTagValue(tagId),
  };
}