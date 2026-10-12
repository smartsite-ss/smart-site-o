// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref } from 'vue';
import { projectApi } from '../api/modules/project.api';

/** 全局默认项目 ID（模块级单例，跨组件共享） */
const defaultProjectId = ref<string | null>(null);

/** 是否已尝试加载（避免重复请求） */
let loaded = false;

/** 加载中的 promise（防止并发请求） */
let loadingPromise: Promise<void> | null = null;

export function useProjectContext() {
  /** 加载默认项目配置（幂等，仅首次触发请求） */
  async function loadDefault(): Promise<string | null> {
    if (loaded) return defaultProjectId.value;
    if (loadingPromise) {
      await loadingPromise;
      return defaultProjectId.value;
    }

    loadingPromise = (async () => {
      try {
        const res = await projectApi.getDefaultProject();
        defaultProjectId.value = res.data?.projectId || null;
      } catch {
        defaultProjectId.value = null;
      } finally {
        loaded = true;
        loadingPromise = null;
      }
    })();

    await loadingPromise;
    return defaultProjectId.value;
  }

  /** 设置默认项目并更新本地缓存 */
  async function setDefaultProject(projectId: string): Promise<void> {
    await projectApi.setDefaultProject(projectId);
    defaultProjectId.value = projectId;
  }

  /** 清除默认项目 */
  async function clearDefaultProject(): Promise<void> {
    await projectApi.clearDefaultProject();
    defaultProjectId.value = null;
  }

  return { defaultProjectId, loadDefault, setDefaultProject, clearDefaultProject };
}
