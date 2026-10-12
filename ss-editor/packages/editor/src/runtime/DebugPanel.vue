<template>
  <div
    v-if="visible"
    class="debug-panel"
    @click.stop
  >
    <div class="panel-header">
      <span class="panel-title">
        <span class="panel-icon">🔧</span>
        {{ t('runtime.debugPanel.title') }}
      </span>
      <button
        class="btn-close"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="panel-body">
      <!-- 画布信息 -->
      <div class="section">
        <div class="section-title">
          {{ t('runtime.debugPanel.canvasInfo') }}
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t('runtime.debugPanel.size') }}:</span>
            <span class="info-value">{{ canvasWidth }} × {{ canvasHeight }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('runtime.debugPanel.zoom') }}:</span>
            <span class="info-value">{{ (zoom * 100).toFixed(1) }}%</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('runtime.debugPanel.pan') }}:</span>
            <span class="info-value">({{ panX }}, {{ panY }})</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('runtime.debugPanel.graphicsCount') }}:</span>
            <span class="info-value highlight">{{ graphicsCount }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('runtime.debugPanel.backendStatus') }}:</span>
            <span :class="['info-value', backendExists ? 'status-ok' : 'status-err']">
              {{ backendExists ? 'Canvas2DBackend 可用' : 'Canvas2DBackend 不可用' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 显示模式 -->
      <div class="section">
        <div class="section-title">
          {{ t('runtime.debugPanel.fitMode') }}
        </div>
        <div class="fitmode-group">
          <button
            v-for="option in fitModes"
            :key="option.mode"
            :class="['fitmode-btn', { active: fitMode === option.mode }]"
            @click="handleFitModeChange(option.mode)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Canvas 诊断 -->
      <div class="section">
        <div class="section-title">
          {{ t('runtime.debugPanel.canvasDiagnostic') }}
        </div>
        <div class="action-row">
          <label class="toggle-label">
            <input
              type="checkbox"
              :checked="showOverlay"
              @change="$emit('toggle-overlay', ($event.target as HTMLInputElement).checked)"
            >
            <span class="toggle-text">{{ t('runtime.debugPanel.showDiagnosticOverlay') }}</span>
          </label>
        </div>
        <button
          class="btn-action small"
          @click="$emit('run-diagnostic')"
        >
          🔍 {{ t('runtime.debugPanel.canvasDiagnostic') }}
        </button>
      </div>

      <!-- 诊断结果 -->
      <div
        v-if="diagnosticInfo"
        class="section"
      >
        <div class="section-title">
          诊断结果 ({{ new Date(diagnosticInfo.timestamp).toLocaleTimeString() }})
        </div>
        <div class="diag-results">
          <div class="diag-row">
            <span class="diag-status-icon">{{ diagnosticInfo.canvasRefExists ? '✓' : '✗' }}</span>
            <span class="diag-label">canvasRef</span>
            <span class="diag-value">{{ diagnosticInfo.canvasRefExists ? '存在' : '不存在' }}</span>
          </div>
          <div class="diag-row">
            <span class="diag-status-icon">{{ diagnosticInfo.canvasRefInDOM ? '✓' : '✗' }}</span>
            <span class="diag-label">DOM 中</span>
            <span class="diag-value">{{ diagnosticInfo.canvasRefInDOM ? '是' : '否' }}</span>
          </div>
          <div class="diag-row">
            <span class="diag-status-icon">{{ diagnosticInfo.testDrawSuccess ? '✓' : '✗' }}</span>
            <span class="diag-label">测试绘制</span>
            <span class="diag-value">{{ diagnosticInfo.testDrawSuccess ? '成功' : '失败' }}</span>
          </div>
          <div class="diag-row">
            <span class="diag-status-icon">{{ diagnosticInfo.backendExists ? '✓' : '✗' }}</span>
            <span class="diag-label">渲染后端</span>
            <span class="diag-value">{{ diagnosticInfo.backendExists ? '运行中' : '未启动' }}</span>
          </div>
          <div class="diag-row">
            <span class="diag-status-icon">{{ diagnosticInfo.backgroundImageLoaded ? '✓' : '⚠️' }}</span>
            <span class="diag-label">背景图片</span>
            <span class="diag-value">{{ diagnosticInfo.backgroundImageLoaded ? '已加载' : '未加载' }}</span>
          </div>
          <div class="diag-detail-row">
            <span class="diag-label">Canvas CSS:</span>
            <span class="diag-value code">display={{ diagnosticInfo.canvasCssDisplay }} visibility={{ diagnosticInfo.canvasCssVisibility }} opacity={{ diagnosticInfo.canvasCssOpacity }}</span>
          </div>
          <div class="diag-detail-row">
            <span class="diag-label">Canvas 尺寸:</span>
            <span class="diag-value code">{{ diagnosticInfo.canvasWidth }}×{{ diagnosticInfo.canvasHeight }}px</span>
          </div>
          <div class="diag-detail-row">
            <span class="diag-label">DOM canvas 数量</span>
            <span class="diag-value code">{{ diagnosticInfo.totalCanvasesInDOM }}</span>
          </div>
          <div class="diag-detail-row">
            <span class="diag-label">页面:</span>
            <span class="diag-value code">{{ diagnosticInfo.currentPageName }} ({{ diagnosticInfo.currentPageSize }})</span>
          </div>
          <div class="diag-detail-row">
            <span class="diag-label">适配模式:</span>
            <span class="diag-value code">{{ diagnosticInfo.fitMode }}</span>
          </div>
          <div
            v-if="diagnosticInfo.backendStats"
            class="diag-detail-row"
          >
            <span class="diag-label">后端统计:</span>
            <span class="diag-value code">FPS={{ diagnosticInfo.backendStats.fps }} 图元={{ diagnosticInfo.backendStats.graphicCount }}</span>
          </div>
        </div>
      </div>

      <!-- 刷新按钮 -->
      <div class="section">
        <button
          class="btn-action"
          @click="$emit('refresh-page')"
        >
          🔄 {{ t('runtime.debugPanel.refreshPage') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { i18n } from '@scada-editor/core';
import type { FitMode } from '@scada-editor/core';

// 经 unknown 断言窄化 t 签名：解构 i18n.global 与动态 key 均会触发 vue-i18n messages 字面量 schema 深度类型实例化（TS2589）
const t = (key: string): string =>
  (i18n.global as unknown as { t: (key: string) => string }).t(key);

interface DiagnosticInfo {
  timestamp: number;
  canvasRefExists: boolean;
  canvasRefInDOM: boolean;
  testDrawSuccess: boolean;
  backendExists: boolean;
  backgroundImageLoaded: boolean;
  canvasCssDisplay: string;
  canvasCssVisibility: string;
  canvasCssOpacity: string;
  canvasWidth: number;
  canvasHeight: number;
  totalCanvasesInDOM: number;
  currentPageName: string;
  currentPageSize: string;
  fitMode: string;
  backendStats: Record<string, any> | null;
  [key: string]: any;
}

const _props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  diagnosticInfo: {
    type: Object as () => DiagnosticInfo | null,
    default: null,
  },
  showOverlay: {
    type: Boolean,
    default: false,
  },
  fitMode: {
    type: String,
    default: 'auto',
  },
  zoom: {
    type: Number,
    default: 1,
  },
  panX: {
    type: Number,
    default: 0,
  },
  panY: {
    type: Number,
    default: 0,
  },
  canvasWidth: {
    type: Number,
    default: 0,
  },
  canvasHeight: {
    type: Number,
    default: 0,
  },
  graphicsCount: {
    type: Number,
    default: 0,
  },
  backendExists: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits({
  close: () => true,
  'run-diagnostic': () => true,
  'toggle-overlay': (_on: boolean) => true,
  'refresh-page': () => true,
  'change-fit-mode': (_mode: FitMode) => true,
});

// 显示模式选项：与右键菜单共用同一组 i18n key（zoomManager.fitModes.*），文案全局统一；
// computed 保证语言切换后标签同步刷新
const FIT_MODES: FitMode[] = ['auto', 'contain', 'fitWidth', 'fitHeight', 'stretch'];
const fitModes = computed(() =>
  FIT_MODES.map((mode) => ({ mode, label: t(`zoomManager.fitModes.${mode}.label`) })),
);

function handleFitModeChange(mode: FitMode) {
  emit('change-fit-mode', mode);
}
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 360px;
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

.section {
  margin-bottom: 16px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  padding-bottom: 4px;
}

/* 信息网格 */
.info-grid {
  display: grid;
  gap: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.info-label {
  color: var(--text-secondary, #888);
  font-size: 11px;
}

.info-value {
  color: var(--text, #ccc);
  font-size: 11px;
  font-weight: 500;
}

.info-value.highlight {
  color: var(--primary, #63e2b7);
  font-weight: 600;
}

.info-value.status-ok {
  color: #4caf50;
}

.info-value.status-err {
  color: #f44336;
}

/* 显示模式按钮 */
.fitmode-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fitmode-btn {
  padding: 5px 10px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  background: var(--surface, #18181c);
  color: var(--text-secondary, #aaa);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.fitmode-btn:hover {
  background: var(--elevated, rgba(255, 255, 255, 0.08));
  color: var(--text, #fff);
}

.fitmode-btn.active {
  background: var(--primary, #63e2b7);
  color: #000;
  border-color: var(--primary, #63e2b7);
  font-weight: 600;
}

/* 操作 */
.action-row {
  margin-bottom: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--text-secondary, #aaa);
  font-size: 11px;
}

.toggle-label input[type="checkbox"] {
  accent-color: var(--primary, #63e2b7);
}

.toggle-text {
  color: var(--text, #ccc);
}

/* 通用操作按钮 */
.btn-action {
  width: 100%;
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

.btn-action.small {
  width: auto;
  padding: 5px 12px;
  font-size: 11px;
  display: inline-block;
}

/* 诊断结果 */
.diag-results {
  background: var(--elevated, rgba(255, 255, 255, 0.04));
  border-radius: 6px;
  padding: 8px 10px;
}

.diag-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.05));
}

.diag-row:last-child {
  border-bottom: none;
}

.diag-status-icon {
  width: 20px;
  text-align: center;
  font-size: 12px;
}

.diag-label {
  color: var(--text-secondary, #888);
  font-size: 11px;
  min-width: 60px;
  flex-shrink: 0;
}

.diag-value {
  color: var(--text, #ccc);
  font-size: 11px;
}

.diag-detail-row {
  display: flex;
  gap: 4px;
  padding: 2px 0 2px 26px;
}

.diag-detail-row .diag-label {
  min-width: auto;
  flex-shrink: 0;
}

.diag-value.code {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 10px;
  color: var(--text-secondary, #aaa);
  word-break: break-all;
}
</style>