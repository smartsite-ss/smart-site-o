<template>
  <div
    v-if="visible"
    class="script-monitor-panel"
    @click.stop
  >
    <div class="panel-header">
      <span class="panel-title">
        <span class="panel-icon">📜</span>
        {{ t('runtime.scriptMonitor.title') }}
      </span>
      <div class="header-actions">
        <button
          class="btn-header-action"
          @click="toggleAutoUpdate"
        >
          {{ autoUpdate ? t('runtime.scriptMonitor.stopUpdate') : t('runtime.scriptMonitor.startUpdate') }}
        </button>
        <button
          class="btn-header-action"
          @click="copyLogs"
        >
          {{ t('runtime.scriptMonitor.copyLog') }}
        </button>
        <button
          class="btn-header-action btn-clear"
          @click="clearLogs"
        >
          {{ t('runtime.scriptMonitor.clearLog') }}
        </button>
        <button
          class="btn-close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="panel-body">
      <!-- 无定时器 -->
      <div
        v-if="timerList.length === 0"
        class="empty-state"
      >
        {{ t('runtime.scriptMonitor.noTimers') }}
      </div>

      <!-- 定时器列表 -->
      <div
        v-for="timer in timerList"
        :key="timer.id"
        class="timer-card"
      >
        <div class="timer-header">
          <div class="timer-name-row">
            <span
              class="status-dot"
              :class="timer.running ? 'running' : 'stopped'"
            />
            <span class="timer-name">{{ timer.name }}</span>
            <span
              class="timer-status"
              :class="timer.running ? 'running' : 'stopped'"
            >
              {{ timer.running ? t('runtime.scriptMonitor.running') : t('runtime.scriptMonitor.stopped') }}
            </span>
          </div>
          <div class="timer-meta">
            <span class="meta-item">
              {{ t('runtime.scriptMonitor.executeCount') }}: {{ timer.executeCount }}
            </span>
            <span class="meta-sep">|</span>
            <span class="meta-item">
              {{ t('runtime.scriptMonitor.lastExecute') }}: {{ timer.lastExecuteTime || '-' }}
            </span>
            <span class="meta-sep">|</span>
            <span class="meta-item">
              {{ t('runtime.scriptMonitor.interval') }}: {{ timer.interval }}
            </span>
          </div>
        </div>

        <!-- 执行日志列表 -->
        <div class="log-section">
          <div class="log-label">
            {{ t('runtime.scriptMonitor.latestLog') }}
          </div>
          <div class="log-list">
            <div
              v-for="(log, idx) in timer.recentLogs"
              :key="idx"
              class="log-entry"
              :class="{ 'log-success': log.success, 'log-error': !log.success }"
            >
              <span class="log-icon">{{ log.success ? '✅' : '❌' }}</span>
              <div class="log-body">
                <div class="log-time">
                  {{ formatTime(log.timestamp) }}
                </div>
                <div class="log-text">
                  {{ log.output || log.error || t('runtime.scriptMonitor.noLog') }}
                </div>
              </div>
            </div>
            <div
              v-if="timer.recentLogs.length === 0"
              class="log-empty"
            >
              {{ t('runtime.scriptMonitor.noLog') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <transition name="fade">
      <div
        v-if="showCopyTip"
        class="copy-tip"
      >
        {{ t('runtime.scriptMonitor.copySuccess') }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { usePageStore, i18n } from '@scada-editor/core';

const { t } = i18n.global;
const pageStore = usePageStore();

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close']);

interface TimerLogInfo {
  id: string;
  success: boolean;
  output?: string;
  error?: string;
  timestamp: number;
}

interface TimerDisplayInfo {
  id: string;
  name: string;
  running: boolean;
  executeCount: number;
  lastExecuteTime: string;
  interval: string;
  recentLogs: TimerLogInfo[];
}

const timerList = ref<TimerDisplayInfo[]>([]);
const autoUpdate = ref(true);
const showCopyTip = ref(false);
let updateInterval: number | null = null;

const MAX_DISPLAY_LOGS = 10;

function formatTime(ts: number): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatInterval(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)} s`;
  }
  return `${ms} ms`;
}

function fetchTimerData() {
  const currentPage = pageStore.currentPage as any;
  if (!currentPage) {
    timerList.value = [];
    return;
  }

  const timerManager = currentPage.timerManager;
  if (!timerManager || typeof timerManager.getAllTimers !== 'function') {
    timerList.value = [];
    return;
  }

  const allTimers = timerManager.getAllTimers() as any[];
  const isRunning = (id: string) => typeof timerManager.isTimerRunning === 'function' && timerManager.isTimerRunning(id);
  const getLogs = (id: string) => typeof timerManager.getExecutionLogs === 'function' ? timerManager.getExecutionLogs(id) : [];

  timerList.value = allTimers.map((timer: any) => {
    const logs = getLogs(timer.id);
    // 取最近 N 条日志（从后往前）
    const recentLogs: TimerLogInfo[] = logs.slice(-MAX_DISPLAY_LOGS).reverse().map((log: any) => ({
      id: log.timestamp.toString(),
      success: log.success,
      output: log.output || '',
      error: log.error || '',
      timestamp: log.timestamp,
    }));
    const _lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    return {
      id: timer.name || timer.id,
      name: timer.name || timer.id,
      running: isRunning(timer.id),
      executeCount: timer.executeCount ?? 0,
      lastExecuteTime: timer.lastExecuteTime ? formatTime(timer.lastExecuteTime) : '-',
      interval: formatInterval(timer.interval ?? 1000),
      recentLogs,
    };
  });
}

function toggleAutoUpdate() {
  autoUpdate.value = !autoUpdate.value;
  if (autoUpdate.value) {
    fetchTimerData();
    updateInterval = window.setInterval(fetchTimerData, 1000);
  } else {
    if (updateInterval !== null) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }
}

function copyLogs() {
  const lines: string[] = [];
  timerList.value.forEach((timer) => {
    const status = timer.running ? `[${t('runtime.scriptMonitor.running')}]` : `[${t('runtime.scriptMonitor.stopped')}]`;
    lines.push(`=== ${timer.name} ${status} | ${t('runtime.scriptMonitor.executeCount')}: ${timer.executeCount} ===`);
    timer.recentLogs.forEach((log) => {
      const timeStr = formatTime(log.timestamp);
      const icon = log.success ? '✅' : '❌';
      const content = log.output || log.error || '';
      lines.push(`  ${timeStr} ${icon} ${content}`);
    });
    if (timer.recentLogs.length === 0) {
      lines.push(`  ${t('runtime.scriptMonitor.noLog')}`);
    }
  });

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showCopyTip.value = true;
    setTimeout(() => { showCopyTip.value = false; }, 2000);
  }).catch(() => {
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopyTip.value = true;
    setTimeout(() => { showCopyTip.value = false; }, 2000);
  });
}

function clearLogs() {
  const currentPage = pageStore.currentPage as any;
  if (!currentPage) return;
  const timerManager = currentPage.timerManager;
  if (!timerManager || typeof timerManager.clearExecutionLogs !== 'function') return;
  // 清除所有定时器的执行日志
  timerManager.clearExecutionLogs();
  // 立即刷新显示
  fetchTimerData();
}

function start() {
  fetchTimerData();
  if (autoUpdate.value) {
    updateInterval = window.setInterval(fetchTimerData, 1000);
  }
}

function stop() {
  if (updateInterval !== null) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

watch(
  () => props.visible,
  (vis) => {
    if (vis) {
      start();
    } else {
      stop();
    }
  }
);

onUnmounted(() => {
  stop();
});
</script>

<style scoped>
.script-monitor-panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--surface, #18181c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  box-shadow: var(--shadow-modal, 0 8px 40px rgba(0, 0, 0, 0.3));
  z-index: 9999;
  color: var(--text, #e0e0e0);
  font-size: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  background: var(--header-background, rgba(255, 255, 255, 0.03));
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #ffffff);
  white-space: nowrap;
}

.panel-icon {
  font-size: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-header-action {
  padding: 4px 10px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #ccc);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-header-action:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
  border-color: var(--primary, #63e2b7);
}

.btn-clear {
  color: var(--text-warning, #e6a23c);
  border-color: rgba(230, 162, 60, 0.3);
}

.btn-clear:hover {
  border-color: var(--text-warning, #e6a23c);
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.btn-close {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #999);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
}

.panel-body {
  padding: 12px 16px;
}

.empty-state {
  text-align: center;
  padding: 32px 0;
  color: var(--text-secondary, #666);
  font-size: 13px;
}

.timer-card {
  margin-bottom: 12px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  overflow: hidden;
  background: var(--elevated, rgba(255, 255, 255, 0.02));
}

.timer-card:last-child {
  margin-bottom: 0;
}

.timer-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
}

.timer-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.running {
  background-color: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
}

.status-dot.stopped {
  background-color: #888;
}

.timer-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #e0e0e0);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timer-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.timer-status.running {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.timer-status.stopped {
  background: rgba(136, 136, 136, 0.15);
  color: #aaa;
}

.timer-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-left: 16px;
}

.meta-sep {
  color: var(--border, rgba(255, 255, 255, 0.15));
}

.log-section {
  padding: 8px 12px;
}

.log-label {
  font-size: 10px;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  border-radius: 4px;
  background: var(--surface, rgba(0, 0, 0, 0.2));
  padding: 4px;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;
}

.log-entry:last-child {
  margin-bottom: 0;
}

.log-entry.log-success {
  background: rgba(76, 175, 80, 0.08);
}

.log-entry.log-error {
  background: rgba(244, 67, 54, 0.08);
}

.log-icon {
  flex-shrink: 0;
  font-size: 12px;
  margin-top: 1px;
}

.log-body {
  flex: 1;
  min-width: 0;
}

.log-time {
  font-size: 10px;
  color: var(--text-secondary, #666);
  margin-bottom: 2px;
}

.log-text {
  color: var(--text, #ccc);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-empty {
  text-align: center;
  padding: 16px 0;
  color: var(--text-secondary, #555);
  font-size: 11px;
}

.copy-tip {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  background: var(--primary, #63e2b7);
  color: #000;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>