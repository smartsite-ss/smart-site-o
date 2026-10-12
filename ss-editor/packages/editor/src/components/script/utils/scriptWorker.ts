// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本执行 Web Worker 管理器
 *
 * 将脚本执行放入独立的后台线程，避免阻塞主线程导致浏览器 tab 卡死。
 * 支持真正的超时终止（Worker.terminate）。
 */

export interface WorkerInput {
  script: string;
  tagValues: Record<string, any>;
  graphicId: string;
  /** 交互模式的事件模拟数据（模拟 event 对象） */
  event?: Record<string, any>;
}

export interface WorkerOutput {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  apiCalls: Array<{ method: string; args: any[] }>;
}

/** 内联 Worker 脚本代码（自包含，无外部依赖） */
function getWorkerCode(): string {
  return `
// ── 简单的 Mock API（Worker 内自包含） ──
function createMockApi(apiCalls, tagValues, postApiCall) {
  return {
    readTag: function(tagId) {
      apiCalls.push({ method: 'readTag', args: [tagId] });
      // 从 tagValues 中读取模拟数据，支持嵌套路径如 'data.number'
      if (tagValues && tagValues.hasOwnProperty(tagId)) {
        return tagValues[tagId];
      }
      return null;
    },
    writeTag: function(tagId, value) {
      apiCalls.push({ method: 'writeTag', args: [tagId, value] });
    },
    getTagQuality: function(tagId) {
      apiCalls.push({ method: 'getTagQuality', args: [tagId] });
      return 'good';
    },
    setGraphicProps: function(gid, props) {
      apiCalls.push({ method: 'setGraphicProps', args: [gid, props] });
      postApiCall('setGraphicProps', [gid, props]);
    },
    showGraphic: function(gid) {
      apiCalls.push({ method: 'showGraphic', args: [gid] });
      postApiCall('showGraphic', [gid]);
    },
    hideGraphic: function(gid) {
      apiCalls.push({ method: 'hideGraphic', args: [gid] });
      postApiCall('hideGraphic', [gid]);
    },
    moveGraphic: function(gid, x, y) {
      apiCalls.push({ method: 'moveGraphic', args: [gid, x, y] });
      postApiCall('moveGraphic', [gid, x, y]);
    },
    rotateGraphic: function(gid, angle) {
      apiCalls.push({ method: 'rotateGraphic', args: [gid, angle] });
    },
    triggerAlarm: function(config) {
      apiCalls.push({ method: 'triggerAlarm', args: [config] });
    },
    acknowledgeAlarm: function(alarmId) {
      apiCalls.push({ method: 'acknowledgeAlarm', args: [alarmId] });
    },
    clearAlarm: function(alarmId) {
      apiCalls.push({ method: 'clearAlarm', args: [alarmId] });
    },
    getActiveAlarms: function() {
      apiCalls.push({ method: 'getActiveAlarms', args: [] });
      return [];
    },
    switchPage: function(pageId) {
      apiCalls.push({ method: 'switchPage', args: [pageId] });
    },
    getCurrentPageId: function() {
      apiCalls.push({ method: 'getCurrentPageId', args: [] });
      return 'test-page';
    },
    fetch: function(url, options) {
      apiCalls.push({ method: 'fetch', args: [url, options] });
      return Promise.resolve({ status: 200, data: {} });
    },
    setTimeout: function(cb, delay) {
      apiCalls.push({ method: 'setTimeout', args: [delay] });
      return 0;
    },
    setInterval: function(cb, interval) {
      apiCalls.push({ method: 'setInterval', args: [interval] });
      return 0;
    },
    clearTimeout: function(id) { apiCalls.push({ method: 'clearTimeout', args: [id] }); },
    clearInterval: function(id) { apiCalls.push({ method: 'clearInterval', args: [id] }); },
    sleep: function(ms) {
      apiCalls.push({ method: 'sleep', args: [ms] });
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    },
    notify: function(msg, level) {
      apiCalls.push({ method: 'notify', args: [msg, level || 'info'] });
    },
    log: function(level, msg) {
      apiCalls.push({ method: 'log', args: [level, msg] });
    },
    round: function(v, d) {
      apiCalls.push({ method: 'round', args: [v, d || 0] });
      var f = Math.pow(10, d || 0);
      return Math.round(v * f) / f;
    },
    clamp: function(v, min, max) {
      apiCalls.push({ method: 'clamp', args: [v, min, max] });
      return Math.max(min, Math.min(max, v));
    },
    mapRange: function(v, inMin, inMax, outMin, outMax) {
      apiCalls.push({ method: 'mapRange', args: [v, inMin, inMax, outMin, outMax] });
      return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
    },
    colorForValue: function(v, min, max) {
      apiCalls.push({ method: 'colorForValue', args: [v, min || 0, max || 100] });
      var ratio = Math.max(0, Math.min(1, (v - (min || 0)) / ((max || 100) - (min || 0))));
      var r = Math.round(ratio * 255).toString(16);
      var g = Math.round((1 - ratio) * 255).toString(16);
      return '#' + (r.length === 1 ? '0' + r : r) + (g.length === 1 ? '0' + g : g) + '00';
    },
    isAlarm: function(v, high, low) {
      apiCalls.push({ method: 'isAlarm', args: [v, high, low || 0] });
      return v >= high || v <= (low || 0);
    },
  };
}

// ── Worker 入口 ──
self.onmessage = function(e) {
  var data = e.data;
  var startTime = performance.now();
  var apiCalls = [];

  // 实时 API 调用通知：将图元操作实时发送到主线程
  var postApiCall = function(method, args) {
    self.postMessage({ type: 'apiCall', method: method, args: args });
  };

  var api = createMockApi(apiCalls, data.tagValues, postApiCall);
  // 将 API 函数注入到全局作用域，使脚本中可以直接调用 showGraphic() 等函数
  // （无需 api. 前缀），与运行态行为保持一致
  for (var key in api) {
    if (typeof api[key] === 'function') {
      self[key] = api[key];
    }
  }
  // 模拟 event 对象（交互模式），注入到全局作用域
  var mockEvent = data.event || {
    graphicId: 'test-graphic',
    x: 100,
    y: 100,
    type: 'click',
    timestamp: Date.now(),
  };
  self.event = mockEvent;

  var context = {
    graphicId: data.graphicId || 'test-graphic',
    tagValues: data.tagValues || {},
    triggerType: 'manual',
    event: mockEvent,
  };

  var sandboxConsole = {
    log: function() {},
    warn: function() {},
    error: function() {},
  };

  try {
    var fn = new Function('api', 'context', 'console', '"use strict";' + data.script);
    var output = fn(api, context, sandboxConsole);
    // 支持 async/await 脚本：如果返回值是 Promise，等待其完成
    if (output && typeof output.then === 'function') {
      output.then(function(resolved) {
        var executionTime = performance.now() - startTime;
        self.postMessage({
          success: true,
          output: resolved,
          executionTime: executionTime,
          apiCalls: apiCalls,
        });
      }).catch(function(err) {
        var executionTime = performance.now() - startTime;
        self.postMessage({
          success: false,
          error: err.message || String(err),
          executionTime: executionTime,
          apiCalls: apiCalls,
        });
      });
    } else {
      var executionTime = performance.now() - startTime;
      self.postMessage({
        success: true,
        output: output,
        executionTime: executionTime,
        apiCalls: apiCalls,
      });
    }
  } catch (err) {
    var executionTime = performance.now() - startTime;
    self.postMessage({
      success: false,
      error: err.message || String(err),
      executionTime: executionTime,
      apiCalls: apiCalls,
    });
  }
};
`;
}

let _workerCodeBlobUrl: string | null = null;

function getWorkerBlobUrl(): string {
  if (!_workerCodeBlobUrl) {
    const blob = new Blob([getWorkerCode()], { type: 'application/javascript' });
    _workerCodeBlobUrl = URL.createObjectURL(blob);
  }
  return _workerCodeBlobUrl;
}

/**
 * 在 Web Worker 中执行脚本，支持真正的超时终止。
 * 超时后 Worker 会被 terminate，彻底释放主线程。
 * @param onApiCall 可选回调，当 Worker 中调用图元操作 API 时实时触发，用于同步更新页面
 */
export function executeInWorker(
  input: WorkerInput,
  timeoutMs: number = 5000,
  onApiCall?: (method: string, args: any[]) => void,
): Promise<WorkerOutput> {
  return new Promise<WorkerOutput>((resolve) => {
    let worker: Worker;

    try {
      worker = new Worker(getWorkerBlobUrl());
    } catch (workerErr: any) {
      // Worker 创建失败（如 CSP 限制），直接返回错误
      resolve({
        success: false,
        error: `无法创建 Worker: ${workerErr.message || String(workerErr)}`,
        executionTime: 0,
        apiCalls: [],
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      worker.terminate();
      resolve({
        success: false,
        error: `脚本执行超时 (${timeoutMs / 1000}s)`,
        executionTime: timeoutMs,
        apiCalls: [],
      });
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      // 实时 API 调用消息：立即应用到页面
      if (data && data.type === 'apiCall') {
        onApiCall?.(data.method, data.args);
        return;
      }
      // 最终结果消息
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(data as WorkerOutput);
    };

    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      worker.terminate();
      resolve({
        success: false,
        error: err.message || 'Worker 执行异常',
        executionTime: 0,
        apiCalls: [],
      });
    };

    worker.postMessage(input);
  });
}

/**
 * 释放 Worker Blob URL（页面卸载时调用）
 */
export function releaseWorkerBlobUrl(): void {
  if (_workerCodeBlobUrl) {
    URL.revokeObjectURL(_workerCodeBlobUrl);
    _workerCodeBlobUrl = null;
  }
}