// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 组件级请求取消 composable
 *
 * 在组件 onUnmounted 时自动取消所有未完成的请求，防止内存泄漏和状态更新错误。
 *
 * 使用方式：
 *   const { signal, cancelAll } = useRequestCancel();
 *   onMounted(() => {
 *     fetchProjects(signal).then(data => projects.value = data);
 *   });
 *   // 组件卸载时自动调用 cancelAll()
 */

import { onUnmounted } from 'vue';

export function useRequestCancel() {
  const controller = new AbortController();
  const { signal } = controller;

  onUnmounted(() => {
    controller.abort();
  });

  return { signal, controller };
}