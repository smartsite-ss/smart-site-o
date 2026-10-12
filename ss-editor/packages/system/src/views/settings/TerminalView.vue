<template>
  <div class="terminal-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-area">
        <h1 class="page-title">
          {{ $t('system.terminal.title') }}
        </h1>
        <p class="page-subtitle">
          {{ $t('system.terminal.subtitle') }}
        </p>
      </div>
      <div class="header-actions">
        <div
          class="connection-status"
          :class="'status-' + connectionStatus"
        >
          <span class="status-dot" />
          <span class="status-text">{{ $t('system.terminal.status.' + connectionStatus) }}</span>
        </div>
        <button
          v-if="connectionStatus !== 'connected'"
          class="sys-btn sys-btn-primary sys-btn-sm"
          @click="connect"
        >
          {{ $t('system.terminal.connect') }}
        </button>
        <button
          v-else
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="disconnect"
        >
          {{ $t('system.terminal.disconnect') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="clearOutput"
        >
          {{ $t('system.terminal.clear') }}
        </button>
      </div>
    </div>

    <!-- 安全提示 -->
    <div class="section-card security-info">
      <div class="security-info-content">
        <span class="security-icon">!</span>
        <span>{{ $t('system.terminal.securityNotice') }}</span>
      </div>
      <button
        class="link-btn"
        @click="showWhitelist = !showWhitelist"
      >
        {{ showWhitelist ? $t('system.terminal.hideWhitelist') : $t('system.terminal.showWhitelist') }}
      </button>
    </div>

    <!-- 白名单列表 -->
    <div
      v-if="showWhitelist"
      class="section-card"
    >
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.terminal.whitelistTitle') }}
        </h2>
      </div>
      <div class="whitelist-grid">
        <span
          v-for="cmd in whitelistCommands"
          :key="cmd"
          class="whitelist-tag mono-text"
        >{{ cmd }}</span>
      </div>
    </div>

    <!-- 终端输出区 -->
    <div
      ref="terminalRef"
      class="terminal-output"
    >
      <div
        v-if="outputLines.length === 0"
        class="terminal-empty"
      >
        {{ $t('system.terminal.emptyHint') }}
      </div>
      <div
        v-for="(line, idx) in outputLines"
        :key="idx"
        class="terminal-line"
        :class="'line-' + line.type"
      >
        <span
          v-if="line.type === 'command'"
          class="line-prompt"
        >{{ promptText }}&nbsp;</span>
        <span class="line-content">{{ line.text }}</span>
      </div>
      <div
        v-if="executing"
        class="terminal-line line-executing"
      >
        <span class="executing-spinner" />
        <span>{{ $t('system.terminal.executing') }}</span>
      </div>
    </div>

    <!-- 命令输入区 -->
    <div class="command-input-area">
      <span class="input-prompt mono-text">{{ promptText }}</span>
      <input
        ref="inputRef"
        v-model="currentCommand"
        type="text"
        class="command-input mono-text"
        :placeholder="$t('system.terminal.commandPlaceholder')"
        :disabled="connectionStatus !== 'connected' || executing"
        @keydown.enter="executeCommand"
        @keydown.arrow-up="navigateHistory('up')"
        @keydown.arrow-down="navigateHistory('down')"
        @keydown.ctrl.l="clearOutput"
        @keydown.ctrl.c="cancelCommand"
      >
      <button
        class="sys-btn sys-btn-primary sys-btn-sm"
        :disabled="!currentCommand.trim() || connectionStatus !== 'connected' || executing"
        @click="executeCommand"
      >
        {{ $t('system.terminal.execute') }}
      </button>
    </div>

    <!-- 历史命令 -->
    <div
      v-if="commandHistory.length > 0"
      class="section-card history-section"
    >
      <div class="section-header">
        <h2 class="section-title">
          {{ $t('system.terminal.history') }}
        </h2>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="clearHistory"
        >
          {{ $t('system.terminal.clearHistory') }}
        </button>
      </div>
      <div class="history-list">
        <div
          v-for="(cmd, idx) in commandHistory"
          :key="idx"
          class="history-item mono-text"
          :class="{ 'history-failed': cmd.exitCode !== 0 }"
          @click="reuseCommand(cmd.command)"
        >
          <span class="history-index">{{ idx + 1 }}</span>
          <span class="history-cmd">{{ cmd.command }}</span>
          <span
            class="history-status"
            :class="cmd.status"
          >{{ $t('system.terminal.statusLabel.' + cmd.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onDeactivated, onActivated, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../../api/client';
import { getWsServerUrl } from '../../utils/ws-url';
import { useAuthStore } from '../../stores/auth.store';

const { t } = useI18n();
const authStore = useAuthStore();

// ==================== 类型定义 ====================
interface OutputLine {
  type: 'command' | 'output' | 'error' | 'system';
  text: string;
}

interface HistoryEntry {
  command: string;
  status: 'completed' | 'timeout' | 'blocked' | 'error';
  exitCode: number;
}

// ==================== 响应式状态 ====================
const terminalRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const currentCommand = ref('');
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
const outputLines = reactive<OutputLine[]>([]);
const commandHistory = reactive<HistoryEntry[]>([]);
const executing = ref(false);
const showWhitelist = ref(false);
const historyIndex = ref(-1);

let socket: Socket | null = null;

const whitelistCommands = [
  'dir', 'ls', 'pwd', 'cd', 'echo', 'cat', 'head', 'tail',
  'ps', 'top', 'df', 'du', 'free', 'netstat', 'ping', 'tracert',
  'nslookup', 'node -v', 'npm -v', 'whoami', 'hostname', 'date',
  'time', 'uptime', 'type', 'find', 'wc', 'systeminfo', 'tasklist',
  'git status', 'git log', 'git branch', 'pm2 list', 'pm2 status',
];

// ==================== 计算属性 ====================
const promptText = computed(() => {
  const user = authStore.user?.username || 'admin';
  return `${user}@scada:~$`;
});

// ==================== WebSocket 连接 ====================
function connect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  connectionStatus.value = 'connecting';
  // Web 同源：页面 origin；桌面端（Tauri）：后端绝对地址（见 ws-url.ts）
  const wsUrl = getWsServerUrl();
  const token = getToken();

  socket = io(`${wsUrl}/terminal`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 3,
  });

  socket.on('connect', () => {
    connectionStatus.value = 'connected';
    addSystemLine(t('system.terminal.connected'));
  });

  socket.on('terminal:connected', (data: { message: string }) => {
    addSystemLine(data.message);
  });

  socket.on('terminal:result', (result: any) => {
    executing.value = false;
    if (result.output) {
      result.output.split('\n').forEach((line: string) => {
        if (line.trim()) addOutputLine(line);
      });
    }
    if (result.status && result.status !== 'completed') {
      addErrorLine(t('system.terminal.statusLabel.' + result.status));
    }
    if (commandHistory.length > 0) {
      const last = commandHistory[commandHistory.length - 1];
      last.status = result.status || 'completed';
      last.exitCode = result.exitCode ?? 0;
    }
    scrollToBottom();
  });

  socket.on('terminal:error', (data: { message: string }) => {
    executing.value = false;
    addErrorLine(data.message);
    if (commandHistory.length > 0) {
      const last = commandHistory[commandHistory.length - 1];
      last.status = 'error';
      last.exitCode = -1;
    }
    scrollToBottom();
  });

  socket.on('disconnect', () => {
    connectionStatus.value = 'disconnected';
    addSystemLine(t('system.terminal.disconnected'));
  });

  socket.on('connect_error', () => {
    connectionStatus.value = 'error';
    addErrorLine(t('system.terminal.connectFailed'));
  });
}

function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectionStatus.value = 'disconnected';
}

// ==================== 命令执行 ====================
function executeCommand() {
  const cmd = currentCommand.value.trim();
  if (!cmd || connectionStatus.value !== 'connected' || executing.value) return;

  addCommandLine(cmd);
  commandHistory.push({ command: cmd, status: 'completed', exitCode: 0 });
  historyIndex.value = commandHistory.length;

  executing.value = true;
  const adminUser = authStore.user?.username || 'admin';

  socket?.emit('terminal:execute', { command: cmd, adminUser });

  currentCommand.value = '';
  scrollToBottom();
}

function cancelCommand() {
  currentCommand.value = '';
  historyIndex.value = commandHistory.length;
}

function navigateHistory(direction: 'up' | 'down') {
  if (commandHistory.length === 0) return;

  if (direction === 'up') {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      currentCommand.value = commandHistory[historyIndex.value].command;
    }
  } else {
    if (historyIndex.value < commandHistory.length - 1) {
      historyIndex.value++;
      currentCommand.value = commandHistory[historyIndex.value].command;
    } else {
      historyIndex.value = commandHistory.length;
      currentCommand.value = '';
    }
  }
}

// ==================== 输出管理 ====================
function addCommandLine(text: string) {
  outputLines.push({ type: 'command', text });
}

function addOutputLine(text: string) {
  outputLines.push({ type: 'output', text });
}

function addErrorLine(text: string) {
  outputLines.push({ type: 'error', text });
}

function addSystemLine(text: string) {
  outputLines.push({ type: 'system', text });
}

function clearOutput() {
  outputLines.splice(0, outputLines.length);
}

function clearHistory() {
  commandHistory.splice(0, commandHistory.length);
  historyIndex.value = -1;
}

function reuseCommand(cmd: string) {
  currentCommand.value = cmd;
  inputRef.value?.focus();
}

function scrollToBottom() {
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
    }
  });
}

// ==================== 生命周期 ====================
onMounted(() => {
  connect();
  nextTick(() => inputRef.value?.focus());
});

onUnmounted(() => {
  disconnect();
});

// keep-alive 缓存：离开页面时断开 WebSocket，返回时自动重连
onDeactivated(() => {
  disconnect();
});

onActivated(() => {
  connect();
  nextTick(() => inputRef.value?.focus());
});
</script>

<style scoped>
.terminal-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title-area {
  flex: 1;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 连接状态 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-disconnected .status-dot { background: var(--text-secondary); }
.status-connecting .status-dot { background: var(--status-warning); animation: pulse 1s infinite; }
.status-connected .status-dot { background: var(--status-success); }
.status-error .status-dot { background: var(--status-error); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-disconnected { color: var(--text-secondary); }
.status-connecting { color: var(--status-warning); }
.status-connected { color: var(--status-success); }
.status-error { color: var(--status-error); }

/* 安全提示 */
.security-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  margin-bottom: 16px;
  border-color: var(--status-warning);
}

.security-info-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--status-warning);
}

.security-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--status-warning);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 12px;
}

.link-btn:hover {
  text-decoration: underline;
}

/* 白名单 */
.whitelist-grid {
  padding: 14px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.whitelist-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-secondary);
}

/* 通用 section-card */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

/* 终端输出区 */
.terminal-output {
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  background: var(--background);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.terminal-empty {
  color: var(--text-secondary);
  font-style: italic;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 2px;
}

.line-command {
  color: var(--primary);
}

.line-prompt {
  color: var(--primary);
  margin-right: 4px;
}

.line-output {
  color: var(--text);
}

.line-error {
  color: var(--status-error);
}

.line-system {
  color: var(--status-online);
  font-style: italic;
}

.line-executing {
  color: var(--status-warning);
  display: flex;
  align-items: center;
  gap: 8px;
}

.executing-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--status-warning);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 命令输入区 */
.command-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--background);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.input-prompt {
  color: var(--primary);
  font-size: 13px;
  white-space: nowrap;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.command-input::placeholder {
  color: var(--text-secondary);
}

.command-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 历史命令 */
.history-section {
  flex-shrink: 0;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.history-item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.02));
}

.history-item:last-child {
  border-bottom: none;
}

.history-index {
  color: var(--text-secondary);
  min-width: 28px;
  text-align: right;
}

.history-cmd {
  flex: 1;
  color: var(--text);
}

.history-failed .history-cmd {
  color: var(--status-error);
}

.history-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.history-status.completed {
  background: var(--status-success-bg, rgba(40, 167, 69, 0.12));
  color: var(--status-success);
}

.history-status.blocked,
.history-status.timeout,
.history-status.error {
  background: var(--status-error-bg, rgba(220, 53, 69, 0.12));
  color: var(--status-error);
}

/* mono-text */
.mono-text {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
