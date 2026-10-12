// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 后端资源 URL 解析
 *
 * `<img src>`、CSS background-image 等资源请求不走 fetch/XHR，
 * 桌面端（Tauri）HTTP 拦截器无法覆盖：页面源为 https://tauri.localhost，
 * 相对路径的 API 资源 URL（如 /api/v1/projects/{projectId}/image）
 * 会解析到页面源而 404，导致项目封面/页面预览图等不显示。
 *
 * 因此相对路径需改写为后端绝对地址（拦截器安装时注册到
 * globalThis.__SS_BACKEND_URL__，与 ws-url.ts 同源机制）。
 * Web 同源场景无该全局值，保持相对路径原行为。
 *
 * 后端资源接口须为 @Public 免鉴权（<img> 无法携带 Authorization 头）。
 */
export function resolveBackendResourceUrl(url: string): string {
  if (!url) return url;

  // 绝对地址（含协议相对 //、data:、blob:）与非根相对路径保持原样
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('/')) {
    return url;
  }

  const backendUrl = (globalThis as Record<string, unknown>).__SS_BACKEND_URL__;
  if (typeof backendUrl === 'string' && backendUrl) {
    return backendUrl.replace(/\/+$/, '') + url;
  }
  return url;
}
