<template>
  <div
    v-if="visible"
    class="perf-panel"
    @click.stop
  >
    <div class="panel-header">
      <span class="panel-title">
        <span class="panel-icon">⚡</span>
        {{ t('performanceMonitor.title') }}
      </span>
      <button
        class="btn-close"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="panel-body">
      <!-- FPS -->
      <div class="metric-section">
        <div class="metric-label">
          {{ t('performanceMonitor.fps') }}
        </div>
        <div class="bar-container">
          <div
            class="bar"
            :class="fpsClass"
            :style="{ width: fpsPercent + '%' }"
          />
        </div>
        <div
          class="metric-value-large"
          :class="fpsClass"
        >
          {{ currentFps }} fps
        </div>
        <div class="metric-detail">
          <span>{{ t('performanceMonitor.min') }}: {{ stats.minFps }}</span>
          <span class="detail-sep">|</span>
          <span>{{ t('performanceMonitor.max') }}: {{ stats.maxFps }}</span>
          <span class="detail-sep">|</span>
          <span>{{ t('performanceMonitor.avg') }}: {{ stats.avgFps }}</span>
        </div>
      </div>

      <!-- 渲染时间 -->
      <div class="metric-section">
        <div class="metric-label">
          {{ t('performanceMonitor.renderTime') }}
        </div>
        <div class="metric-detail">
          <span>{{ t('performanceMonitor.min') }}: {{ stats.minRenderTime.toFixed(1) }}ms</span>
          <span class="detail-sep">|</span>
          <span>{{ t('performanceMonitor.max') }}: {{ stats.maxRenderTime.toFixed(1) }}ms</span>
          <span class="detail-sep">|</span>
          <span>{{ t('performanceMonitor.avg') }}: {{ stats.avgRenderTime.toFixed(1) }}ms</span>
        </div>
      </div>

      <!-- 内存使用 -->
      <div class="metric-section">
        <div class="metric-label">
          {{ t('performanceMonitor.memory') }}
        </div>
        <div class="bar-container">
          <div
            class="bar"
            :class="memoryClass"
            :style="{ width: memoryPercent + '%' }"
          />
        </div>
        <div
          class="metric-value-large"
          :class="memoryClass"
        >
          {{ memoryDisplay }}
        </div>
        <div class="metric-detail">
          <span v-if="stats.peakMemory > 0">{{ t('performanceMonitor.peak') }}: {{ formatBytes(stats.peakMemory) }}</span>
          <span v-else>{{ t('performanceMonitor.memoryNotSupported') }}</span>
        </div>
      </div>

      <!-- 图元数量 -->
      <div class="metric-section">
        <div class="metric-label">
          {{ t('performanceMonitor.graphicCount') }}
        </div>
        <div class="metric-detail">
          {{ t('performanceMonitor.current') }}: {{ stats.graphicCount }}
        </div>
      </div>

      <!-- 渲染统计 -->
      <div class="metric-section">
        <div class="metric-label">
          {{ t('performanceMonitor.renderStats') }}
        </div>
        <div class="metric-detail">
          <div>{{ t('performanceMonitor.totalFrames') }}: {{ renderStats.totalRenders.toLocaleString() }}</div>
          <div>{{ t('performanceMonitor.fullRenders') }}: {{ renderStats.fullRenders.toLocaleString() }} | {{ t('performanceMonitor.partialRenders') }}: {{ renderStats.partialRenders.toLocaleString() }}</div>
          <div>{{ t('performanceMonitor.totalTime') }}: {{ (renderStats.totalDuration / 1000).toFixed(1) }}s</div>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button
        class="btn-action"
        @click="handleReset"
      >
        {{ t('performanceMonitor.reset') }}
      </button>
      <button
        class="btn-action"
        @click="handleExport"
      >
        {{ t('performanceMonitor.exportReport') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { performanceMonitor, i18n } from '@scada-editor/core';
import type { PerformanceReport } from '@scada-editor/core';

const { t } = i18n.global;

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close']);

// FPS - 使用独立 requestAnimationFrame 计算，确保实时准确
const currentFps = ref(0);
let rafId: number | null = null;
let fpsFrameCount = 0;
let fpsLastTime = 0;

function fpsLoop() {
  fpsFrameCount++;
  const now = performance.now();
  const elapsed = now - fpsLastTime;

  if (elapsed >= 1000) {
    currentFps.value = Math.round((fpsFrameCount * 1000) / elapsed);
    fpsFrameCount = 0;
    fpsLastTime = now;
  }

  rafId = requestAnimationFrame(fpsLoop);
}

// 聚合统计数据
const stats = ref({
  minFps: 0,
  maxFps: 0,
  avgFps: 0,
  minRenderTime: 0,
  maxRenderTime: 0,
  avgRenderTime: 0,
  memoryUsage: 0,
  peakMemory: 0,
  graphicCount: 0,
});

const renderStats = ref({
  totalRenders: 0,
  fullRenders: 0,
  partialRenders: 0,
  totalDuration: 0,
});

let statsTimer: number | null = null;
let memoryTimer: number | null = null;

const fpsPercent = computed(() => Math.min((currentFps.value / 60) * 100, 100));

const fpsClass = computed(() => {
  if (currentFps.value >= 55) return 'good';
  if (currentFps.value >= 30) return 'warning';
  return 'bad';
});

const memoryPercent = computed(() => {
  if (stats.value.memoryUsage <= 0) return 0;
  const percent = (stats.value.memoryUsage / (500 * 1024 * 1024)) * 100;
  return Math.min(percent, 100);
});

const memoryClass = computed(() => {
  if (stats.value.memoryUsage <= 100 * 1024 * 1024) return 'good';
  if (stats.value.memoryUsage <= 300 * 1024 * 1024) return 'warning';
  return 'bad';
});

const memoryDisplay = computed(() => formatBytes(stats.value.memoryUsage));

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function updateStats() {
  const report: PerformanceReport = performanceMonitor.generateReport();
  const currentStats = performanceMonitor.getCurrentStats();

  stats.value = {
    minFps: Math.round(report.minFps),
    maxFps: Math.round(report.maxFps),
    avgFps: Math.round(report.averageFps),
    minRenderTime: report.minRenderTime,
    maxRenderTime: report.maxRenderTime,
    avgRenderTime: report.averageRenderTime,
    memoryUsage: report.averageMemoryUsage,
    peakMemory: report.peakMemoryUsage,
    graphicCount: Math.round(report.averageGraphicCount),
  };

  renderStats.value = {
    totalRenders: report.totalFrames,
    fullRenders: currentStats.fullRenders,
    partialRenders: currentStats.partialRenders,
    totalDuration: report.totalRenderTime,
  };
}

function collectMemory() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (performance as any).memory;
  if (mem) {
    performanceMonitor.recordMemoryUsage(mem.usedJSHeapSize);
  }
}

function handleReset() {
  performanceMonitor.reset();
  fpsFrameCount = 0;
  fpsLastTime = performance.now();
  currentFps.value = 0;
  updateStats();
}

function handleExport() {
  const _report = performanceMonitor.generateReport();
}

function start() {
  fpsLastTime = performance.now();
  fpsFrameCount = 0;
  rafId = requestAnimationFrame(fpsLoop);

  updateStats();
  statsTimer = window.setInterval(updateStats, 2000);
  memoryTimer = window.setInterval(collectMemory, 2000);
}

function stop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (statsTimer !== null) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
  if (memoryTimer !== null) {
    clearInterval(memoryTimer);
    memoryTimer = null;
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
.perf-panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 340px;
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
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #ffffff);
}

.panel-icon {
  font-size: 16px;
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
  padding: 14px 16px;
}

.metric-section {
  margin-bottom: 16px;
}

.metric-section:last-child {
  margin-bottom: 0;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-detail {
  color: var(--text-secondary, #aaa);
  font-size: 11px;
  line-height: 1.6;
}

.metric-detail .detail-sep {
  margin: 0 6px;
  color: var(--border, rgba(255, 255, 255, 0.15));
}

.bar-container {
  height: 6px;
  background-color: var(--elevated, rgba(255, 255, 255, 0.08));
  border-radius: 3px;
  margin: 4px 0;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar.good { background-color: #4caf50; }
.bar.warning { background-color: #ff9800; }
.bar.bad { background-color: #f44336; }

.metric-value-large {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
}

.metric-value-large.good { color: #4caf50; }
.metric-value-large.warning { color: #ff9800; }
.metric-value-large.bad { color: #f44336; }

.panel-footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.btn-action {
  flex: 1;
  padding: 7px 0;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #ccc);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
  border-color: var(--primary, #63e2b7);
}
</style>