// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 防抖/节流工具模块
 */

// 防抖函数 - 返回可取消的版本
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
} {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any;
  let result: any;

  const { leading = false, trailing = true } = options;

  const invokeFunc = (time: number) => {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = null;
    lastCallTime = time;
    result = func.apply(thisArg, args!);
    return result;
  };

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeWaiting = wait - timeSinceLastCall;
    return Math.max(timeWaiting, 0);
  };

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    return lastCallTime === null || timeSinceLastCall >= wait || timeSinceLastCall < 0;
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time: number) => {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  };

  const leadingEdge = (time: number) => {
    lastCallTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const debounced = function (this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(time);
      }
      clearTimeout(timeout);
      timeout = setTimeout(timerExpired, wait);
    } else if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }

    return result;
  };

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastCallTime = null;
    lastArgs = lastThis = null;
    timeout = null;
  };

  debounced.flush = () => {
    return timeout === null ? result : trailingEdge(Date.now());
  };

  return debounced;
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const { leading = true, trailing = true } = options;

  const invokeFunc = () => {
    if (lastArgs) {
      func.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  };

  const throttled = function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      if (leading) {
        func.apply(this, args);
      }
      inThrottle = true;
      if (trailing) {
        lastArgs = args;
        lastThis = this;
      }
      timeout = setTimeout(() => {
        inThrottle = false;
        if (trailing) {
          invokeFunc();
        }
      }, limit);
    } else if (trailing) {
      lastArgs = args;
      lastThis = this;
    }
  };

  throttled.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    inThrottle = false;
    lastArgs = lastThis = null;
    timeout = null;
  };

  return throttled;
}

// 延迟执行
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试函数
export async function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < times - 1) {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}