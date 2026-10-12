// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { datatagApi } from '../api/modules/datatag.api';
import { useProjectStore } from './project.store';
import { useWsStore, TagValueEntry } from './ws.store';
import type { DataTag } from '../api/types/api';
import type { TagValueResult } from '../api/modules/datatag.api';

export interface TagWithValue extends DataTag {
  currentValue?: any;
  quality?: string;
  lastUpdate?: number;
}

export const useTagStore = defineStore('tag', () => {
  const tags = ref<TagWithValue[]>([]);
  const searchResults = ref<TagWithValue[]>([]);
  const searchPagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const loading = ref(false);
  const tagsLoaded = ref(false);

  const tagMapById = computed(() => {
    const map = new Map<string, TagWithValue>();
    tags.value.forEach((tag: TagWithValue) => map.set(tag.id, tag));
    searchResults.value.forEach((tag: TagWithValue) => map.set(tag.id, tag));
    return map;
  });

  const enabledTags = computed(() => tags.value.filter((t: TagWithValue) => t.enabled !== false));

  function mergeWsValues(): void {
    const wsStore = useWsStore();
    const allTags = [...tags.value, ...searchResults.value];
    const updatedIds = new Set<string>();

    wsStore.tagValues.forEach((_tv: TagValueEntry, tagId: string) => {
      updatedIds.add(tagId);
    });

    for (const tag of allTags) {
      const wsValue = wsStore.tagValues.get(tag.id);
      if (wsValue) {
        tag.currentValue = wsValue.value;
        tag.quality = wsValue.quality;
        tag.lastUpdate = wsValue.timestamp;
      }
    }

    if (updatedIds.size > 0) {
      tags.value = [...tags.value];
      searchResults.value = [...searchResults.value];
    }
  }

  async function fetchTags(projectId?: string): Promise<void> {
    const projectStore = useProjectStore();
    const pid = projectId || projectStore.currentProject?.projectId;
    if (!pid) return;

    loading.value = true;
    try {
      const response = await datatagApi.search(pid, { limit: 100 });
      const tagData = response.data || [];
      const wsStore = useWsStore();

      tags.value = tagData.map((tag) => ({
        ...tag,
        currentValue: wsStore.tagValues.get(tag.id)?.value ?? null,
        quality: wsStore.tagValues.get(tag.id)?.quality ?? 'unknown',
        lastUpdate: wsStore.tagValues.get(tag.id)?.timestamp ?? 0,
      }));

      tagsLoaded.value = true;

      const tagIds = tags.value.map((t: TagWithValue) => t.id);
      if (tagIds.length > 0) {
        wsStore.subscribeTags(tagIds);
      }
    } finally {
      loading.value = false;
    }
  }

  async function searchTags(projectId: string, query: string, tagType?: string): Promise<void> {
    loading.value = true;
    try {
      const response = await datatagApi.search(projectId, {
        q: query,
        type: tagType,
        limit: 20,
      });
      const data = response.data || [];
      const pagination = response.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };

      const wsStore = useWsStore();
      searchResults.value = data.map((tag) => ({
        ...tag,
        currentValue: wsStore.tagValues.get(tag.id)?.value ?? null,
        quality: wsStore.tagValues.get(tag.id)?.quality ?? 'unknown',
        lastUpdate: wsStore.tagValues.get(tag.id)?.timestamp ?? 0,
      }));
      searchPagination.value = pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchBatchValues(projectId: string, tagIds: string[]): Promise<Record<string, TagValueResult>> {
    try {
      const response = await datatagApi.batchGetLatest(projectId, tagIds);
      return response.data || {};
    } catch {
      return {};
    }
  }

  function getTagValue(tagId: string): any {
    return tagMapById.value.get(tagId)?.currentValue ?? null;
  }

  function getTagInfo(tagId: string): TagWithValue | undefined {
    return tagMapById.value.get(tagId);
  }

  function clearSearch(): void {
    searchResults.value = [];
    searchPagination.value = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  }

  return {
    tags,
    searchResults,
    searchPagination,
    loading,
    tagsLoaded,
    tagMapById,
    enabledTags,
    fetchTags,
    searchTags,
    fetchBatchValues,
    getTagValue,
    getTagInfo,
    mergeWsValues,
    clearSearch,
  };
});