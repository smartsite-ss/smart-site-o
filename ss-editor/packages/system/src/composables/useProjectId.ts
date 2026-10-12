// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { computed } from 'vue';
import { useProjectStore } from '../stores/project.store';

/**
 * 统一提取当前项目 ID。
 * 优先取 Pinia 当前项目，其次从编辑器路由 /editor/:projectId 兜底。
 */
export function useProjectId() {
  const projectStore = useProjectStore();
  return computed(() => {
    const fromStore = projectStore.currentProject?.projectId;
    if (fromStore) return fromStore;
    const match = window.location.pathname.match(/\/editor\/([^/]+)/);
    return match ? match[1] : '';
  });
}
