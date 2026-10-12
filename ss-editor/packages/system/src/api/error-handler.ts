// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 统一错误处理器
 *
 * 在 axios 响应拦截器中统一处理所有错误，按错误类型分流。
 *
 * **过滤器模式**：网络断连时，所有请求（含 GET）自动入队等待后端恢复，
 * 不 reject 到视图层。视图层无需感知网络错误。
 * 连接状态由 ConnectionBanner 全局展示。
 *
 * 错误分流策略：
 * - 网络断连 → 标记离线 + 所有请求入队（仅 _noRetry 标记的请求立即 reject）
 * - 5xx 服务端错误 → 可重试请求（POST/PUT/PATCH/DELETE）入队
 * - 超时 → 可重试请求入队
 * - 401 认证错误 → 透传（由现有 Token 刷新逻辑处理）
 * - 4xx 业务错误 → 提取 i18n 消息展示 + reject
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { i18n } from '@scada-editor/core';
import { connectionMonitor } from './connection-monitor';
import { requestQueue } from './request-queue';
import { mapErrorCodeToI18n } from './error-codes';
import { showError } from '../utils/messageBox';

const RETRYABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** 扩展 AxiosError 上的标记字段 */
export interface ErrorHandlerMarkers {
  /** ErrorHandler 已展示过错误提示，视图层不应再次弹窗 */
  _errorHandled?: boolean;
}

/**
 * 判断网络错误：无响应 或 响应状态码为 0（部分代理/浏览器行为）
 * 同时匹配 axios 常见网络错误 message / code
 */
function isNetworkError(error: AxiosError): boolean {
  if (error.response) {
    // 部分代理在目标不可达时返回 status=0 的假响应
    return error.response.status === 0;
  }
  // 无 response 对象 → 检查 message / code
  const msg = error.message || '';
  return (
    msg === 'Network Error' ||
    msg.includes('Network Error') ||
    msg.includes('network') ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ERR_CONNECTION_REFUSED' ||
    error.code === 'ERR_PROXY_CONNECTION_FAILED'
  );
}

/**
 * 判断请求是否应被队列拦截（请求拦截器用）
 * 仅 _noRetry 标记的请求（如登录）不拦截，直接发送
 */
export function shouldQueueRequest(config?: InternalAxiosRequestConfig): boolean {
  if (!config) return false;
  return !(config as any)._noRetry;
}

export class ErrorHandler {
  /**
   * 处理 axios 错误
   *
   * **过滤器模式核心**：
   * - 网络断连时，所有请求（含 GET）入队等待恢复，不 reject 到视图层
   * - 仅 `_noRetry` 标记的请求立即 reject
   * - 连接状态由 ConnectionBanner 全局展示，无需每个视图单独处理
   */
  handle(error: AxiosError): Promise<any> {
    // 1. 网络断连 → 所有请求入队，不 reject 到视图层
    if (isNetworkError(error)) {
      connectionMonitor.markOffline();

      // 仅 _noRetry 标记的请求（如登录）立即 reject
      if (error.config && (error.config as any)._noRetry) {
        this.markHandled(error);
        showError(i18n.global.t('error.network'));
        return Promise.reject(error);
      }

      // 所有其他请求（GET/POST/PUT/DELETE）入队，等待后端恢复后自动重发
      if (error.config) {
        return this.enqueueRequest(error.config);
      }

      // 无 config 的极端情况：不 reject，标记离线等待恢复
      return new Promise(() => {});
    }

    // 2. 超时 → 可重试请求入队
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      if (this.isRetryable(error.config)) {
        return this.enqueueRequest(error.config!);
      }
      this.markHandled(error);
      showError(i18n.global.t('error.timeout'));
      return Promise.reject(error);
    }

    // 3. 服务端 5xx 错误 → 可重试请求入队
    if (error.response && error.response.status >= 500) {
      if (this.isRetryable(error.config)) {
        return this.enqueueRequest(error.config!);
      }
      const msg = this.extractMessage(error.response?.data);
      this.markHandled(error);
      showError(msg);
      return Promise.reject(error);
    }

    // 4. 认证错误 401 → 透传（由现有 Token 刷新逻辑处理）
    if (error.response?.status === 401) {
      return Promise.reject(error);
    }

    // 5. 业务错误 4xx → 展示错误消息（_silent 标记的请求静默 reject，不弹窗）
    if (error.response && error.response.status >= 400) {
      if ((error.config as any)?._silent) {
        return Promise.reject(error);
      }
      const msg = this.extractMessage(error.response?.data);
      this.markHandled(error);
      showError(msg);
      return Promise.reject(error);
    }

    // 6. 兜底：不展示原始 error.message（通常为英文技术信息），
    //    统一展示 i18n 翻译后的用户友好提示
    this.markHandled(error);
    showError(i18n.global.t('error.unknown'));
    return Promise.reject(error);
  }

  /** 判断请求是否可重试（仅 POST/PUT/PATCH/DELETE，用于超时/5xx 场景） */
  private isRetryable(config?: InternalAxiosRequestConfig): boolean {
    if (!config) return false;
    if ((config as any)._noRetry) return false;
    const method = (config.method || '').toUpperCase();
    return RETRYABLE_METHODS.includes(method);
  }

  /** 将请求入队，返回由队列控制的 Promise */
  private enqueueRequest(config: InternalAxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const enqueued = requestQueue.enqueue(config, resolve, reject);
      if (!enqueued) {
        // 队列已满
        showError(i18n.global.t('connection.queueFull'));
        reject(new Error('QUEUE_FULL'));
      }
    });
  }

  /** 从错误响应体中提取可展示的消息（优先使用错误码对应的 i18n key） */
  private extractMessage(data: any): string {
    if (!data) return i18n.global.t('error.unknown');

    // 优先使用错误码对应的 i18n key
    if (data.code) {
      const i18nKey = mapErrorCodeToI18n(data.code);
      if (i18nKey) {
        return i18n.global.t(i18nKey);
      }
    }

    // 校验错误明细
    if (Array.isArray(data.details) && data.details.length > 0) {
      const first = data.details[0];
      if (first?.message) return first.message;
    }

    return data.message || i18n.global.t('error.unknown');
  }

  /** 在 error 上标记已处理，供视图层判断是否需要再次弹窗 */
  private markHandled(error: AxiosError): void {
    (error as any)._errorHandled = true;
  }
}

/** 全局单例 */
export const errorHandler = new ErrorHandler();
