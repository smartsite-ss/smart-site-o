// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from './types/api';
import { errorHandler } from './error-handler';
import { connectionMonitor } from './connection-monitor';
import { requestQueue } from './request-queue';
import { shouldQueueRequest } from './error-handler';

/**
 * S-C03: Token 存储改为内存（不再使用 localStorage）
 *
 * Token 通过 HttpOnly Cookie 由后端自动管理，前端无法读取。
 * 内存中的 token 值仅用于标记认证状态和 Authorization Header 兼容回退。
 */
let memoryToken: string | null = null;
let memoryRefreshToken: string | null = null;

/**
 * Bearer Token 模式（桌面端 Tauri）：refreshToken 持久化到 localStorage，
 * 用于应用重启后恢复会话。仅桌面端（跨站，Cookie 不可用）会写入真实 token，
 * Web 端（HttpOnly Cookie 模式）不会触发持久化。
 */
const PERSISTED_REFRESH_TOKEN_KEY = 'ss_auth_refresh_token';

export function persistRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(PERSISTED_REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(PERSISTED_REFRESH_TOKEN_KEY);
    }
  } catch { /* storage 不可用时静默降级（仅本次会话有效） */ }
}

export function loadPersistedRefreshToken(): string | null {
  try {
    return localStorage.getItem(PERSISTED_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  // S-C03: 携带 Cookie（HttpOnly Token 通过 Cookie 自动传输）
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 过滤器模式：当已知后端离线时，直接将请求入队而不发送 HTTP 请求
    // 避免无意义的网络请求，视图层无需感知网络错误
    if (connectionMonitor.isOffline() && shouldQueueRequest(config)) {
      return new Promise((resolve, reject) => {
        const enqueued = requestQueue.enqueue(config, resolve, reject);
        if (!enqueued) {
          reject(new Error('QUEUE_FULL'));
        }
      });
    }

    // S-C03: Token 主要通过 Cookie 传输，Authorization Header 仅作为兼容回退
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 注入 X-Request-Id 便于前后端日志关联
    if (config.headers && !config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    // FormData 请求必须删除 Content-Type 让浏览器自动设置 multipart boundary，
    // 否则默认的 application/json 会导致后端 json() body-parser 提前消费请求流，
    // multer 无法解析上传文件（触发"缺少背景图片文件"、"缺少预览图片文件"等 400 错误）
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * S-C03: 带重试的刷新令牌请求（最多 3 次，指数退避 1s / 2s）
 *
 * - Cookie 模式（Web，同源）：refreshToken 通过 HttpOnly Cookie 自动传输，body 为空；
 * - Bearer 模式（桌面端 Tauri）：refreshToken 通过 body 传输，
 *   刷新成功后新 token 对从响应体同步到内存与持久化存储。
 */
async function refreshAccessToken(): Promise<boolean> {
  let bearerRefreshToken = memoryRefreshToken && memoryRefreshToken !== 'httpOnly'
    ? memoryRefreshToken
    : null;
  // 应用重启后内存为空：回退读取持久化的 refreshToken（仅桌面端 Bearer 模式会写入）
  if (!bearerRefreshToken) {
    bearerRefreshToken = loadPersistedRefreshToken();
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[Auth] 刷新 Token 请求 | attempt=${attempt}/3 mode=${bearerRefreshToken ? 'bearer' : 'cookie'}`);
      const response = await axios.post(
        '/api/v1/auth/refresh',
        bearerRefreshToken ? { refreshToken: bearerRefreshToken } : {},
        { withCredentials: true },
      );
      // Bearer 模式：新 token 对在响应体中，同步到内存并更新持久化存储；
      // Cookie 模式：新 Token 已通过 Set-Cookie 写入，无需额外处理。
      const data = response.data?.data ?? response.data;
      if (data?.accessToken) {
        memoryToken = data.accessToken;
        if (data.refreshToken) {
          memoryRefreshToken = data.refreshToken;
          persistRefreshToken(data.refreshToken);
        }
      }
      console.log(`[Auth] Token 刷新成功 | attempt=${attempt}/3`);
      return true;
    } catch (err) {
      const status = (err as any)?.response?.status;
      console.warn(`[Auth] Token 刷新失败 | attempt=${attempt}/3 status=${status} error="${(err as Error)?.message || 'unknown'}"`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  return false;
}

/**
 * 清除认证状态并跳转到登录页（静默，不显示错误）
 */
function logoutAndRedirect(): void {
  console.warn('[Auth] 认证失效，跳转登录页');
  clearTokens();
  persistRefreshToken(null);
  // 使用 replace 避免回退时再回到 401 页面
  if (window.location.hash !== '#/login') {
    window.location.replace('#/login');
  }
}

client.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 请求成功 → 标记后端在线
    connectionMonitor.markOnline();
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url || 'unknown';
    const requestMethod = originalRequest?.method || 'unknown';

    // 401 处理
    if (error.response?.status === 401) {
      console.warn(`[Auth] 401 未授权 | ${requestMethod.toUpperCase()} ${requestUrl} | _retry=${!!originalRequest._retry}`);

      // 已经是刷新后重试的请求又得 401 → 静默跳登录
      if (originalRequest._retry) {
        console.warn(`[Auth] 重试后仍 401，放弃 → 跳转登录 | ${requestMethod.toUpperCase()} ${requestUrl}`);
        logoutAndRedirect();
        return Promise.reject(error);
      }

      // S-C03: 尝试通过 Cookie 刷新 Token
      if (isRefreshing) {
        console.debug(`[Auth] 已有刷新进行中，排队等待 | ${requestMethod.toUpperCase()} ${requestUrl}`);
        return new Promise<AxiosResponse>((resolve) => {
          addRefreshSubscriber(() => {
            console.debug(`[Auth] 刷新完成，重试排队请求 | ${requestMethod.toUpperCase()} ${requestUrl}`);
            resolve(client(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log(`[Auth] 开始刷新 Token | 触发请求=${requestMethod.toUpperCase()} ${requestUrl}`);

      try {
        const success = await refreshAccessToken();

        if (success) {
          console.log(`[Auth] Token 刷新成功，重试原请求 | ${requestMethod.toUpperCase()} ${requestUrl}`);
          onTokenRefreshed('cookie-refreshed');
          return client(originalRequest);
        }
      } finally {
        isRefreshing = false;
      }

      // 刷新失败 → 静默跳登录
      console.warn(`[Auth] Token 刷新失败 → 跳转登录 | ${requestMethod.toUpperCase()} ${requestUrl}`);
      logoutAndRedirect();
    }

    // 非 401 错误交由统一错误处理器
    if (error.response?.status !== 401) {
      return errorHandler.handle(error);
    }

    return Promise.reject(error);
  },
);

// 后端恢复时自动刷新重试队列
connectionMonitor.onRecover(() => {
  requestQueue.flush(client);
});

/**
 * S-C03: Token 操作函数（内存存储，不再使用 localStorage）
 */
export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  // Debug 模式：localStorage 中 scada_debug_skip_auth === '1' 时自动返回 debug token，
  // 确保预览页（新标签页/窗口）直接访问时 wsStore.connect() 可正常建立 WebSocket 连接
  try {
    if (localStorage.getItem('scada_debug_skip_auth') === '1') return 'debug-mock-token';
  } catch { /* not in browser */ }
  return null;
}

export function setToken(token: string): void {
  memoryToken = token;
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken;
}

export function setRefreshToken(token: string): void {
  memoryRefreshToken = token;
}

export function clearTokens(): void {
  memoryToken = null;
  memoryRefreshToken = null;
}

export function getBaseURL(): string {
  return client.defaults.baseURL || '/api/v1';
}

export default client;