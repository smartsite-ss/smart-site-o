<template>
  <div class="app-log-page">
    <!-- 统一工具栏 -->
    <div class="toolbar">
      <h1 class="page-title">
        {{ $t('system.appLogs.title') }}
      </h1>
      <div class="toolbar-filters">
        <select
          v-model="filters.level"
          class="filter-select"
          @change="loadHistory"
        >
          <option value="">
            {{ $t('system.appLogs.allLevels') }}
          </option>
          <option value="error">
            Error
          </option>
          <option value="warn">
            Warn
          </option>
          <option value="info">
            Info
          </option>
          <option value="debug">
            Debug
          </option>
        </select>
        <input
          v-model="filters.module"
          class="filter-input"
          :placeholder="$t('system.appLogs.placeholderModule')"
          @keyup.enter="loadHistory"
        >
        <input
          v-model="filters.keyword"
          class="filter-input"
          :placeholder="$t('system.appLogs.placeholderKeyword')"
          @keyup.enter="loadHistory"
        >
        <select
          v-model="filters.lines"
          class="filter-select"
          @change="loadHistory"
        >
          <option :value="100">
            100 lines
          </option>
          <option :value="500">
            500 lines
          </option>
          <option :value="1000">
            1000 lines
          </option>
        </select>
      </div>
      <div class="toolbar-actions">
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :class="{ 'btn-active': streaming }"
          @click="toggleStream"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><circle
            cx="12"
            cy="12"
            r="3"
          />{{ streaming ? '<path d="M5 12a7 7 0 0 1 14 0"/>' : '<path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12a10 10 0 0 1 20 0"/>' }}</svg>
          {{ streaming ? $t('system.appLogs.stopStream') : $t('system.appLogs.startStream') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="loadHistory"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {{ $t('system.appLogs.refresh') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="downloadCurrent"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line
            x1="12"
            y1="15"
            x2="12"
            y2="3"
          /></svg>
          {{ $t('system.appLogs.download') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          @click="clearView"
        >
          {{ $t('system.appLogs.clear') }}
        </button>
      </div>
    </div>

    <!-- 日志文件列表 -->
    <div
      v-if="logFiles.length > 0"
      class="files-bar"
    >
      <span class="files-label">{{ $t('system.appLogs.files') }}:</span>
      <button
        v-for="file in logFiles.slice(-5)"
        :key="file"
        class="file-chip"
        @click="downloadFile(file)"
      >
        {{ file }}
      </button>
    </div>

    <!-- 日志终端 -->
    <div
      ref="logContainer"
      class="log-terminal"
    >
      <div
        v-if="entries.length === 0"
        class="log-empty"
      >
        {{ $t('system.appLogs.empty') }}
      </div>
      <div
        v-for="(entry, idx) in entries"
        :key="idx"
        class="log-line"
        :class="'log-' + entry.level"
      >
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span
          class="log-level"
          :class="'level-' + entry.level"
        >{{ entry.level }}</span>
        <span class="log-module">{{ entry.module || '-' }}</span>
        <span class="log-message">{{ entry.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, onDeactivated, onActivated, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { systemApi } from '../../api/modules/system.api';
import { getToken } from '../../api/client';
import { showError } from '../../utils/messageBox';
import type { LogEntry } from '../../api/types/api';

const { t: _t } = useI18n();

const entries = ref<LogEntry[]>([]);
const logFiles = ref<string[]>([]);
const streaming = ref(false);
const logContainer = ref<HTMLElement | null>(null);

const filters = reactive({
  level: '',
  module: '',
  keyword: '',
  lines: 500,
});

let abortController: AbortController | null = null;
const MAX_ENTRIES = 2000;

function formatTime(ts: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

async function loadHistory() {
  try {
    const res = await systemApi.getAppLogs({
      level: filters.level || undefined,
      module: filters.module || undefined,
      keyword: filters.keyword || undefined,
      lines: filters.lines,
    });
    const data = (res as any)?.data || res || [];
    entries.value = Array.isArray(data) ? data.slice(-filters.lines) : [];
    await scrollToBottom();
  } catch (e: any) {
    showError(e?.message || 'Failed to load logs');
  }
}

async function loadFiles() {
  try {
    const res = await systemApi.getLogFiles();
    const data = (res as any)?.data || res || [];
    logFiles.value = Array.isArray(data) ? data : [];
  } catch {
    // 静默失败
  }
}

function toggleStream() {
  if (streaming.value) {
    stopStream();
  } else {
    startStream();
  }
}

function startStream() {
  stopStream();
  try {
    const params = new URLSearchParams();
    if (filters.level) params.set('level', filters.level);
    if (filters.module) params.set('module', filters.module);
    if (filters.keyword) params.set('keyword', filters.keyword);
    const queryStr = params.toString();
    const url = `/api/v1/system/logs/stream${queryStr ? '?' + queryStr : ''}`;

    const token = getToken();
    abortController = new AbortController();

    fetch(url, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'text/event-stream',
      },
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }
        streaming.value = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = (): Promise<void> => {
          return reader.read().then(({ done, value }) => {
            if (done) {
              streaming.value = false;
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            // SSE 事件以双换行符分隔
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              for (const line of part.split('\n')) {
                if (line.startsWith('data:')) {
                  const data = line.slice(5).trim();
                  if (data) {
                    try {
                      const entry: LogEntry = JSON.parse(data);
                      entries.value.push(entry);
                      if (entries.value.length > MAX_ENTRIES) {
                        entries.value = entries.value.slice(-MAX_ENTRIES);
                      }
                    } catch {
                      // 忽略解析失败的行
                    }
                  }
                }
              }
            }
            scrollToBottom();
            return read();
          });
        };
        return read();
      })
      .catch((err: unknown) => {
        // AbortError 是用户主动停止流，属于正常行为
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // SSE 连接失败，降级为手动刷新模式
        streaming.value = false;
      });
  } catch {
    streaming.value = false;
  }
}

function stopStream() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  streaming.value = false;
}

async function scrollToBottom() {
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

function clearView() {
  entries.value = [];
}

async function downloadFile(filename: string) {
  const url = systemApi.getLogDownloadUrl(filename);
  const token = getToken();
  try {
    const res = await fetch(`/api/v1${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Download failed: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.split('/').pop() || filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (e: any) {
    showError(e?.message || 'Download failed');
  }
}

function downloadCurrent() {
  const content = entries.value
    .map((e) => `[${e.timestamp}] [${e.level}] [${e.module}] ${e.message}`)
    .join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `app-logs-${new Date().toISOString().slice(0, 10)}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  loadHistory();
  loadFiles();
});

onUnmounted(() => {
  stopStream();
});

// keep-alive 缓存：离开页面时停止 SSE 流
let wasStreaming = false;

onDeactivated(() => {
  wasStreaming = streaming.value;
  stopStream();
});

onActivated(() => {
  if (wasStreaming) {
    startStream();
    wasStreaming = false;
  }
  loadHistory();
});
</script>

<style scoped>
.app-log-page {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== 统一工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-shrink: 0;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-select,
.filter-input {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
}

.filter-input {
  width: 140px;
}

.files-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.files-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.file-chip {
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 11px;
  font-family: monospace;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.file-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* 终端样式 */
.log-terminal {
  flex: 1;
  min-height: 400px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.log-empty {
  color: var(--text-secondary);
  text-align: center;
  padding: 40px;
}

.log-line {
  display: flex;
  gap: 8px;
  padding: 1px 0;
  white-space: nowrap;
}

.log-line:hover {
  background: color-mix(in srgb, var(--primary) 5%, transparent);
}

.log-time {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.log-level {
  flex-shrink: 0;
  width: 50px;
  font-weight: 600;
  text-transform: uppercase;
}

.level-error,
.level-fatal {
  color: var(--status-error);
}

.level-warn,
.level-warning {
  color: var(--status-warning);
}

.level-info {
  color: var(--primary);
}

.level-debug {
  color: var(--text-secondary);
}

.log-module {
  color: var(--text-secondary);
  flex-shrink: 0;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-message {
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-error .log-message {
  color: var(--status-error);
}

.sys-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--surface);
  color: var(--text);
}

.sys-btn:hover {
  border-color: var(--primary);
}

.sys-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
}

.btn-active {
  border-color: var(--status-online);
  color: var(--status-online);
}
</style>
