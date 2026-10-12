// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * collector-worker.js — 采集隔离 Worker 脚本
 *
 * 兼容 worker_threads 和 child_process 两种模式。
 * 在 Worker 线程中使用 worker_threads 的 parentPort，
 * 在子进程中使用 process.send / process.on('message')。
 *
 * 不依赖 NestJS，仅依赖采集适配器自身的包。
 */

'use strict';

const { parentPort, workerData } = (() => {
  try { return require('worker_threads'); } catch { return {}; }
})();

const { protocol, adapterModule } = workerData || {
  protocol: process.env.COLLECTOR_PROTOCOL,
  adapterModule: process.env.COLLECTOR_ADAPTER_MODULE,
};

// 设置进程标题，便于在系统进程列表中区分不同协议的采集子进程
if (protocol && process.title !== undefined) {
  process.title = `ss-collector-${protocol}`;
  // 示例：ss-collector-modbus_tcp、ss-collector-opcua、ss-collector-mqtt
}

let adapter = null;
const connections = new Map();

/**
 * 动态加载适配器模块
 *
 * 扫描模块导出查找实现了 IProtocolAdapter 接口（readTag 方法）或
 * BaseCollectorService 子类（doReadTag 方法）的类，并尝试实例化。
 *
 * 实例化策略：
 * 1. 优先无参实例化（适用于无依赖的采集器，如 ModbusRTUService）
 * 2. 失败时从同模块查找无参可实例化的类作为依赖候选，
 *    按顺序尝试注入（适用于有依赖的采集器，如 VirtualProtocolAdapter 需要 SimulatorFactory）
 */
async function loadAdapter() {
  let mod;
  try {
    mod = require(adapterModule);
  } catch (e) {
    // 降级：从 cwd/node_modules 解析（子进程 cwd 继承自父进程，包含 workspace 依赖）
    const path = require('path');
    const modPath = path.resolve(process.cwd(), 'node_modules', adapterModule);
    try {
      mod = require(modPath);
    } catch (e2) {
      throw new Error(
        `Cannot find module '${adapterModule}' (tried direct require and ${modPath}): ${e2.message}`,
      );
    }
  }

  // 1. 查找 adapter 类（优先 readTag，兼容 doReadTag）
  let AdapterClass = null;
  let adapterKey = null;
  for (const key of Object.keys(mod)) {
    const cls = mod[key];
    if (!cls || !cls.prototype) continue;
    if (typeof cls.prototype.readTag === 'function') {
      AdapterClass = cls;
      adapterKey = key;
      break;
    }
  }
  // 兼容 BaseCollectorService 子类
  if (!AdapterClass) {
    for (const key of Object.keys(mod)) {
      const cls = mod[key];
      if (!cls || !cls.prototype) continue;
      if (typeof cls.prototype.doReadTag === 'function') {
        AdapterClass = cls;
        adapterKey = key;
        break;
      }
    }
  }
  if (!AdapterClass) {
    throw new Error(`No adapter class (readTag/doReadTag) found in ${adapterModule}`);
  }

  // 2. 尝试无参实例化
  try {
    adapter = new AdapterClass();
    log('info', `Adapter loaded: ${adapterModule} (${adapterKey})`);
    return;
  } catch (e) {
    log('info', `Direct instantiation failed, resolving deps: ${e.message}`);
  }

  // 3. 收集同模块中无参可实例化的类作为依赖候选
  const depCandidates = [];
  for (const key of Object.keys(mod)) {
    if (mod[key] === AdapterClass) continue;
    const cls = mod[key];
    if (typeof cls !== 'function') continue;
    try {
      const instance = new cls();
      depCandidates.push(instance);
      log('info', `Dependency candidate: ${key}`);
    } catch {
      // 跳过无法无参实例化的类
    }
  }

  // 4. 尝试用依赖实例化（逐个增加参数数量）
  for (let n = 1; n <= depCandidates.length; n++) {
    const args = depCandidates.slice(0, n);
    try {
      adapter = new AdapterClass(...args);
      log('info', `Adapter loaded: ${adapterModule} (${adapterKey}) with ${n} dep(s)`);
      return;
    } catch {
      // 继续尝试更多依赖
    }
  }

  throw new Error(
    `Failed to instantiate ${adapterKey} from ${adapterModule}: cannot resolve constructor deps (tried ${depCandidates.length} candidates)`,
  );
}

const handlers = {
  async connect({ device }) {
    const client = await adapter.connect(device);
    const connectionId = device.id || `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    connections.set(connectionId, client);
    return { connectionId, protocol };
  },

  async read_tag({ connectionId, tag }) {
    const client = connections.get(connectionId);
    if (!client) throw new Error(`Connection not found: ${connectionId}`);
    return adapter.readTag(client, tag);
  },

  async write_tag({ connectionId, tag, value }) {
    const client = connections.get(connectionId);
    if (!client) throw new Error(`Connection not found: ${connectionId}`);
    return adapter.writeTag(client, tag, value);
  },

  async disconnect({ connectionId }) {
    const client = connections.get(connectionId);
    if (client) {
      await adapter.disconnect(client);
      connections.delete(connectionId);
    }
    return { ok: true };
  },

  async validate({ config }) {
    if (typeof adapter.validateChannelConfig === 'function') {
      return adapter.validateChannelConfig(config);
    }
    return { valid: true };
  },

  health() {
    return {
      status: adapter ? 'healthy' : 'starting',
      connectionCount: connections.size,
      mode: workerData ? 'worker_thread' : 'child_process',
      pid: typeof process !== 'undefined' && process.pid ? process.pid : undefined,
      uptime: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime() * 1000) : 0,
      requestCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      restartCount: 0,
    };
  },

  async shutdown() {
    const closePromises = [];
    for (const [, client] of connections) {
      closePromises.push(adapter.disconnect(client).catch(() => {}));
    }
    await Promise.all(closePromises);
    connections.clear();
    process.exit(0);
  },
};

function send(msg) {
  if (parentPort) {
    parentPort.postMessage(msg);
  } else if (typeof process !== 'undefined' && typeof process.send === 'function') {
    process.send(msg);
  } else {
    // Fallback: no IPC channel available
  }
}

function log(level, message) {
  send({ type: 'log', level, message: `${message}` });
}

/**
 * 消息收发 —— 兼容 worker_threads 的 parentPort.on 和 child_process 的 process.on
 */
function setupReceiver() {
  const receiver = parentPort || process;
  receiver.on('message', async (msg) => {
    if (!msg || !msg.type) return;

    try {
      const handler = handlers[msg.type];
      if (!handler) {
        log('warn', `Unknown message type: ${msg.type}`);
        return;
      }
      const result = await handler(msg);
      if (msg.requestId) {
        send({ type: 'result', requestId: msg.requestId, payload: result });
      }
    } catch (err) {
      if (msg.requestId) {
        send({ type: 'error', requestId: msg.requestId, error: { message: err.message } });
      } else {
        log('error', `Handler [${msg.type}] error: ${err.message}`);
      }
    }
  });
}

// 未捕获异常兜底（子进程模式关键保护）
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    console.error(`[${protocol}] Uncaught exception:`, err);
    send({ type: 'fatal', error: { message: err.message, stack: err.stack } });
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`[${protocol}] Unhandled rejection:`, reason);
  });
}

// === 启动 ===
(async () => {
  try {
    await loadAdapter();
    setupReceiver();
    send({ type: 'ready', protocol });
  } catch (err) {
    console.error(`[${protocol}] Failed to start worker:`, err);
    send({ type: 'fatal', error: { message: err.message, stack: err.stack } });
    process.exit(1);
  }
})();
