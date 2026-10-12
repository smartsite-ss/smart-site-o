// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * WebSocket 服务地址解析
 *
 * Web 版（同源）：直接使用页面 origin，开发态由 Vite proxy（/socket.io ws:true）
 * 转发到后端，生产态由反向代理转发。
 *
 * 桌面端（Tauri，origin = https://tauri.localhost）：页面源与后端跨源，
 * HTTP 拦截器（proxy-setup）只改写 fetch/XHR，不覆盖 socket.io 自建连接；
 * 因此必须显式使用拦截器注册的后端地址（globalThis.__SS_BACKEND_URL__），
 * 否则 socket.io 会连接 https://tauri.localhost/socket.io（无服务，静默失败，
 * 表现为设备监控实时数据不更新）。
 */
export function getWsServerUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin.includes('tauri.localhost')) {
    const backendUrl = (globalThis as Record<string, unknown>).__SS_BACKEND_URL__;
    if (typeof backendUrl === 'string' && backendUrl) {
      return backendUrl;
    }
  }
  return origin;
}
