// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 后端连接状态监控
 *
 * 通过定时探测健康检查端点维护连接状态机：
 *   online → offline → recovering → online
 *
 * - 请求拦截器在 Network Error 时调用 markOffline()
 * - offline 状态下每 5s 探测 GET /api/v1/system/health
 * - 探测成功 → recovering → 触发 RequestQueue.flush()
 * - 连续成功 → online → 停止轮询
 */

export type ConnectionStatus = 'online' | 'offline' | 'recovering';

type StatusChangeListener = (status: ConnectionStatus) => void;
type RecoverListener = () => void;

const POLL_INTERVAL = 5000; // 5 秒探测一次
const PROBE_TIMEOUT = 3000; // 探测超时 3 秒
const HEALTH_URL = '/api/v1/system/health';

export class ConnectionMonitor {
  private status: ConnectionStatus = 'online';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statusListeners: StatusChangeListener[] = [];
  private recoverListeners: RecoverListener[] = [];

  /** 当前状态 */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** 是否离线 */
  isOffline(): boolean {
    return this.status === 'offline';
  }

  /** 标记为离线（由请求拦截器在 Network Error 时调用） */
  markOffline(): void {
    if (this.status !== 'offline') {
      this.setStatus('offline');
      this.startPolling();
    }
  }

  /** 标记为在线（由成功请求触发） */
  markOnline(): void {
    if (this.status !== 'online') {
      this.setStatus('online');
      this.stopPolling();
    }
  }

  /** 注册状态变更监听 */
  onStatusChange(cb: StatusChangeListener): void {
    this.statusListeners.push(cb);
  }

  /** 注册恢复监听（状态变为 recovering 时触发，用于触发队列刷新） */
  onRecover(cb: RecoverListener): void {
    this.recoverListeners.push(cb);
  }

  /** 启动健康检查轮询 */
  startPolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = setInterval(() => this.probe(), POLL_INTERVAL);
    // 立即探测一次
    this.probe();
  }

  /** 停止轮询 */
  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** 探测后端健康检查端点 */
  private async probe(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

      const response = await fetch(HEALTH_URL, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        // 探测成功 → recovering → 通知恢复
        if (this.status === 'offline') {
          this.setStatus('recovering');
          this.notifyRecover();
          // recovering 后短暂等待再切回 online
          setTimeout(() => this.setStatus('online'), 1000);
        }
      }
    } catch {
      // 探测失败，保持当前状态
      if (this.status === 'recovering') {
        this.setStatus('offline');
      }
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  private notifyRecover(): void {
    this.recoverListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // 忽略恢复监听器错误
      }
    });
  }

  /** 销毁（清理定时器和监听器） */
  destroy(): void {
    this.stopPolling();
    this.statusListeners = [];
    this.recoverListeners = [];
  }
}

/** 全局单例 */
export const connectionMonitor = new ConnectionMonitor();
