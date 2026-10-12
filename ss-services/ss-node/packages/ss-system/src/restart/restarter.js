// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 系统重启脚本（独立运行）
 *
 * 作为 detached 子进程运行：
 * 1. 等待旧进程退出（最长 10 秒）
 * 2. 超时则强制 kill
 * 3. 执行 bin/start.bat 或 bin/start.sh 启动新服务
 *
 * 使用方式：node restarter.js <oldPid>
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const oldPid = parseInt(process.argv[2], 10);
const MAX_WAIT_MS = 10000;
const POLL_INTERVAL = 200;

if (!oldPid || Number.isNaN(oldPid)) {
  console.error('[restarter] Missing or invalid oldPid argument');
  process.exit(1);
}

console.log(`[restarter] Started, waiting for PID ${oldPid} to exit...`);

const startTime = Date.now();

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0); // signal 0 仅检查进程存在
    return true;
  } catch (e) {
    return false;
  }
}

function waitForExit(pid, callback) {
  const check = () => {
    if (!isProcessAlive(pid)) {
      console.log(`[restarter] PID ${pid} exited gracefully`);
      callback();
      return;
    }

    if (Date.now() - startTime > MAX_WAIT_MS) {
      console.warn(`[restarter] Timeout after ${MAX_WAIT_MS}ms, force killing PID ${pid}`);
      try {
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        console.warn(`[restarter] Force kill failed: ${e.message}`);
      }
      // 等待 500ms 让进程完全退出
      setTimeout(callback, 500);
      return;
    }

    setTimeout(check, POLL_INTERVAL);
  };
  check();
}

function startNewProcess() {
  console.log('[restarter] Starting new process...');

  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const isWindows = process.platform === 'win32';
  const startScript = isWindows
    ? path.join(projectRoot, 'bin', 'start.bat')
    : path.join(projectRoot, 'bin', 'start.sh');

  if (!fs.existsSync(startScript)) {
    console.error(`[restarter] Start script not found: ${startScript}`);
    process.exit(1);
  }

  try {
    const child = spawn(
      isWindows ? 'cmd' : 'sh',
      [isWindows ? '/c' : '-c', startScript],
      {
        detached: true,
        stdio: 'ignore',
        cwd: projectRoot,
      },
    );
    child.unref();
    console.log(`[restarter] New process spawned (PID: ${child.pid})`);
    process.exit(0);
  } catch (err) {
    console.error(`[restarter] Failed to start new process: ${err.message}`);
    process.exit(1);
  }
}

// 入口
waitForExit(oldPid, startNewProcess);

// 防止意外退出
process.on('SIGTERM', () => {
  console.log('[restarter] Received SIGTERM, ignoring (waiting for oldPid exit)');
});
process.on('SIGINT', () => {
  console.log('[restarter] Received SIGINT, ignoring (waiting for oldPid exit)');
});
