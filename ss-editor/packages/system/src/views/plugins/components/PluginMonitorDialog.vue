<template>
  <div
    class="monitor-overlay"
    @click.self="emit('close')"
  >
    <div class="monitor-dialog">
      <div class="monitor-header">
        <h2 class="monitor-title">
          {{ $t('system.plugins.monitorTitle', { name: plugin?.displayName || plugin?.protocol }) }}
        </h2>
        <button
          class="monitor-close-btn"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>

      <SsLoading
        v-if="loading"
        :text="$t('system.plugins.loading')"
        size="small"
      />

      <div
        v-else-if="data"
        class="monitor-body"
      >
        <!-- 进程性能指标 -->
        <div class="metrics-section">
          <h3 class="section-title">
            {{ $t('system.plugins.processMetrics') }}
          </h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">{{ $t('system.plugins.memoryUsage') }}</span>
              <div class="memory-bars">
                <div class="memory-bar-item">
                  <span class="memory-bar-label">Heap</span>
                  <div class="memory-bar-track">
                    <div
                      class="memory-bar-fill heap-bar"
                      :style="{ width: heapPercent + '%' }"
                    />
                  </div>
                  <span class="memory-bar-value">{{ data.metrics.heapUsed }} / {{ data.metrics.heapTotal }} MB</span>
                </div>
                <div class="memory-bar-item">
                  <span class="memory-bar-label">RSS</span>
                  <div class="memory-bar-track">
                    <div
                      class="memory-bar-fill rss-bar"
                      :style="{ width: rssPercent + '%' }"
                    />
                  </div>
                  <span class="memory-bar-value">{{ data.metrics.rss }} MB</span>
                </div>
              </div>
            </div>
            <div class="metric-card">
              <span class="metric-label">{{ $t('system.plugins.cpuUsage') }}</span>
              <span class="metric-value-large">{{ data.metrics.cpuUsage }}%</span>
              <div class="cpu-bar-wrap">
                <div class="cpu-bar">
                  <div
                    class="cpu-bar-fill"
                    :style="{ width: (data.metrics.cpuUsage || 0) + '%' }"
                  />
                </div>
              </div>
            </div>
            <div class="metric-card">
              <span class="metric-label">{{ $t('system.plugins.uptime') }}</span>
              <span class="metric-value-large">{{ formatUptime(data.metrics.uptime) }}</span>
            </div>
          </div>
        </div>

        <!-- 采集日志 -->
        <div class="logs-section">
          <div class="logs-header">
            <h3 class="section-title">
              {{ $t('system.plugins.acquisitionLogs') }}
            </h3>
            <div class="logs-actions">
              <button
                class="sys-btn sys-btn-sm sys-btn-secondary"
                :disabled="refreshing"
                @click="handleRefresh"
              >
                {{ refreshing ? $t('system.plugins.refreshing') : $t('system.plugins.refresh') }}
              </button>
              <button
                class="sys-btn sys-btn-sm sys-btn-danger"
                :disabled="clearing"
                @click="handleClearLogs"
              >
                {{ clearing ? $t('system.plugins.clearing') : $t('system.plugins.clearLogs') }}
              </button>
            </div>
          </div>
          <div class="log-file-path">
            <span class="path-label">{{ $t('system.plugins.logFile') }}:</span>
            <code class="path-value">{{ data.logFilePath }}</code>
          </div>
          <div class="logs-container">
            <div
              v-if="data.logs.length === 0"
              class="logs-empty"
            >
              {{ $t('system.plugins.noLogs') }}
            </div>
            <div
              v-else
              class="log-lines"
            >
              <div
                v-for="(line, idx) in data.logs"
                :key="idx"
                class="log-line"
                :class="logLineClass(line)"
              >
                <span class="log-num">{{ idx + 1 }}</span>
                <span class="log-text">{{ line }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="monitor-error"
      >
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { showConfirm } from '../../../utils/messageBox';
import { pluginApi } from '../../../api/modules/plugin.api';
import type { PluginInfo, PluginMonitorData } from '../../../api/types/plugin';
import { SsLoading } from '@scada-editor/shared';

const props = defineProps<{
  plugin: PluginInfo | null;
}>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const loading = ref(true);
const refreshing = ref(false);
const clearing = ref(false);
const data = ref<PluginMonitorData | null>(null);
const error = ref<string | null>(null);

async function fetchMonitor() {
  if (!props.plugin) return;
  try {
    const res = await pluginApi.getMonitor(props.plugin.protocol);
    data.value = (res as any).data ?? res;
    error.value = null;
  } catch (e: any) {
    error.value = e?.response?.data?.message || t('system.plugins.errors.fetchFailed');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await fetchMonitor();
}

async function handleClearLogs() {
  if (!props.plugin) return;
  if (!(await showConfirm(t('system.plugins.confirmClearLogs')))) return;
  clearing.value = true;
  try {
    await pluginApi.clearMonitorLogs(props.plugin.protocol);
    await fetchMonitor();
  } catch {
    // error handled silently
  } finally {
    clearing.value = false;
  }
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function logLineClass(line: string): string {
  if (line.includes('[ERROR]')) return 'log-error';
  if (line.includes('[WARN]')) return 'log-warn';
  if (line.includes('[DEBUG]')) return 'log-debug';
  return '';
}

const heapPercent = computed(() => {
  if (!data.value || data.value.metrics.heapTotal === 0) return 0;
  return Math.min((data.value.metrics.heapUsed / data.value.metrics.heapTotal) * 100, 100);
});

const rssPercent = computed(() => {
  if (!data.value) return 0;
  // Rss 相对于堆总量显示一个相对比例
  const total = data.value.metrics.heapTotal || 512;
  return Math.min((data.value.metrics.rss / total) * 100, 100);
});

onMounted(() => {
  fetchMonitor();
});
</script>

<style scoped>
.monitor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.monitor-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 800px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.monitor-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.monitor-close-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.monitor-close-btn:hover {
  color: var(--text);
}

.monitor-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: var(--text-secondary);
  gap: 12px;
}

.monitor-error {
  padding: 20px;
  color: var(--status-error);
  text-align: center;
}

.monitor-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 性能指标 */
.metrics-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric-card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
}

.metric-card .metric-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value-large {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}

.memory-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.memory-bar-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.memory-bar-label {
  font-size: 10px;
  color: var(--text-secondary);
  width: 30px;
  flex-shrink: 0;
}

.memory-bar-track {
  flex: 1;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.memory-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.heap-bar {
  background: var(--primary);
}

.rss-bar {
  background: var(--status-info);
}

.memory-bar-value {
  font-size: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}

.cpu-bar-wrap {
  margin-top: 8px;
}

.cpu-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.cpu-bar-fill {
  height: 100%;
  background: var(--status-warning);
  border-radius: 3px;
  transition: width 0.5s;
}

/* 日志 */
.logs-section {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.logs-actions {
  display: flex;
  gap: 6px;
}

.log-file-path {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 11px;
}

.path-label {
  color: var(--text-secondary);
}

.path-value {
  font-family: monospace;
  font-size: 11px;
  color: var(--primary);
  background: var(--background);
  padding: 1px 6px;
  border-radius: 3px;
}

.logs-container {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  max-height: 360px;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
}

.logs-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.log-line {
  display: flex;
  gap: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-num {
  color: var(--text-secondary);
  flex-shrink: 0;
  user-select: none;
  min-width: 28px;
  text-align: right;
}

.log-text {
  color: var(--text);
}

.log-error .log-text {
  color: var(--status-error);
}

.log-warn .log-text {
  color: var(--status-warning);
}

.log-debug .log-text {
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
