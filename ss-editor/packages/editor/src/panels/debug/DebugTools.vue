<template>
  <div
    class="debug-tools-container"
    :style="themeStyles"
  >
    <!-- 抽屉按钮 -->
    <button
      class="drawer-button"
      :class="{ expanded: isVisible }"
      @click="toggleVisibility"
    >
      {{ isVisible ? '←' : '→' }}
    </button>

    <!-- 调试工具面板 -->
    <div
      class="debug-tools"
      :class="{ expanded: isVisible }"
    >
      <div class="debug-section">
        <h3>{{ t('debugTools.title') }}</h3>

        <!-- 图元层级关系展示 -->
        <div class="debug-panel">
          <h4>{{ t('debugTools.graphicHierarchy') }}</h4>
          <div class="hierarchy-view">
            <div
              v-if="sortedGraphics.length > 0"
              class="hierarchy-list"
            >
              <div
                v-for="(graphic, _) in sortedGraphics"
                :key="graphic.id"
                class="hierarchy-item"
                :class="{ selected: graphic.id === selectedGraphicId }"
                @click="selectGraphic(graphic.id)"
              >
                <div
                  class="hierarchy-indent"
                  :style="{
                    marginLeft: `${graphic.config.isGroup ? 0 : 20}px`,
                  }"
                />
                <span class="hierarchy-icon">{{
                  graphic.config.isGroup ? '📁' : '📄'
                }}</span>
                <span class="hierarchy-name">{{
                  getGraphicName(graphic)
                }}</span>
                <span class="hierarchy-type">({{ graphic.type }})</span>
                <span class="hierarchy-id">id:{{ graphic.id }}</span>
                <span class="hierarchy-zindex">z:{{ graphic.config.zIndex }}</span>
              </div>
            </div>
            <div
              v-else
              class="no-graphics"
            >
              {{ t('debugTools.noGraphics') }}
            </div>
          </div>
        </div>

        <!-- 调试信息 -->
        <div class="debug-panel">
          <h4>{{ t('debugTools.debugInfo') }}</h4>
          <div class="debug-info">
            <div class="info-item">
              <span>{{ t('debugTools.currentPage') }}:</span>
              <span>{{ currentPage?.name || t('debugTools.none') }}</span>
            </div>
            <div class="info-item">
              <span>{{ t('debugTools.totalGraphics') }}:</span>
              <span>{{ sortedGraphics.length }}</span>
            </div>
            <div class="info-item">
              <span>{{ t('debugTools.selectedGraphic') }}:</span>
              <span>{{ selectedGraphic ? selectedGraphic.type : t('debugTools.none') }}</span>
            </div>
            <div class="info-item">
              <span>{{ t('debugTools.totalErrors') }}:</span>
              <span>{{ errorHistory.length }}</span>
            </div>
          </div>
        </div>

        <!-- 错误历史 -->
        <div class="debug-panel">
          <div class="panel-header">
            <h4>{{ t('debugTools.errorHistory') }}</h4>
            <button
              class="clear-button"
              @click="clearErrors"
            >
              {{ t('debugTools.clear') }}
            </button>
          </div>
          <div
            ref="errorHistoryRef"
            class="error-history"
          >
            <div
              v-for="(error, index) in errorHistory"
              :key="index"
              class="error-item"
              :class="(error as any).type?.toLowerCase()"
              @click="toggleErrorDetail(index)"
            >
              <div class="error-header">
                <span class="error-icon">⚠️</span>
                <span class="error-type">{{ (error as any).type || 'Error' }}</span>
                <span class="error-time">{{ formatTime(error.timestamp ?? 0) }}</span>
              </div>
              <div class="error-message">
                {{ getFriendlyMessage(error) }}
              </div>
              <div
                v-if="expandedErrorIndex === index"
                class="error-details"
              >
                <div
                  v-if="error.context"
                  class="error-context"
                >
                  <strong>{{ t('debugTools.context') }}:</strong> {{ error.context }}
                </div>
                <div
                  v-if="error.stack"
                  class="error-stack"
                >
                  <strong>{{ t('debugTools.stack') }}:</strong>
                  <pre>{{ error.stack }}</pre>
                </div>
              </div>
            </div>
            <div
              v-if="errorHistory.length === 0"
              class="no-errors"
            >
              {{ t('debugTools.noErrors') }}
            </div>
          </div>
        </div>

        <!-- 控制台日志 -->
        <div class="debug-panel">
          <div class="panel-header">
            <h4>{{ t('debugTools.consoleLogs') }}</h4>
            <button
              class="clear-button"
              @click="clearLogs"
            >
              {{ t('debugTools.clear') }}
            </button>
          </div>
          <div
            ref="consoleLogsRef"
            class="console-logs"
          >
            <div
              v-for="(log, index) in consoleLogs"
              :key="index"
              class="log-item"
              :class="log.level"
            >
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-level">{{ log.level.toUpperCase() }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGraphic } from '../../composables/useGraphic';
import { useSelection } from '../../composables/useSelection';
import { usePageStore, useTheme, errorService, i18n } from '@scada-editor/core';
import type { ErrorDetails } from '@scada-editor/core';

const { themeStyles } = useTheme();

// 国际化翻译函数
const { t } = i18n.global;
const pageStore = usePageStore();
const { selectGraphic } = useGraphic();
const { selectedGraphic, selectedGraphicId } = useSelection();

// 计算当前页面的图形列表
const sortedGraphics = computed(() => {
  const graphicStore = useGraphic();
  const currentGraphics = graphicStore.graphics;
  return [...currentGraphics].sort(
    (a, b) => a.config.zIndex - b.config.zIndex
  );
});

// 面板可见性状态
const isVisible = ref(true);

// 切换面板可见性
const toggleVisibility = () => {
  isVisible.value = !isVisible.value;
};

// 当前页面
const currentPage = computed(() => pageStore.currentPage);

 
// 控制台日志
const consoleLogs = ref<
  Array<{ level: string; message: string; timestamp: number }>
>([]);
const consoleLogsRef = ref<HTMLElement | null>(null);

// 错误历史
const errorHistory = ref<ErrorDetails[]>([]);
const expandedErrorIndex = ref<number | null>(null);

// 轮询更新错误历史
let errorPollingTimer: number | null = null;

// 更新错误历史
const updateErrorHistory = () => {
  errorHistory.value = errorService.getHistory();
};

// 切换错误详情
const toggleErrorDetail = (index: number) => {
  expandedErrorIndex.value = expandedErrorIndex.value === index ? null : index;
};

// 清空错误
const clearErrors = () => {
  errorHistory.value = [];
};

// 获取友好的错误消息
const getFriendlyMessage = (error: ErrorDetails) => {
  return errorService.getFriendlyMessage(error);
};

// 原始 console 方法
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// 重写 console 方法
const overrideConsole = () => {
  console.log = (...args) => {
    originalConsole.log(...args);
    addLog('log', args.join(' '));
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    addLog('error', args.join(' '));
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    addLog('warn', args.join(' '));
  };

  console.info = (...args) => {
    originalConsole.info(...args);
    addLog('info', args.join(' '));
  };
};

// 恢复原始 console 方法
const restoreConsole = () => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
};

// 添加日志
const addLog = (level: string, message: string) => {
  consoleLogs.value.push({ level, message, timestamp: Date.now() });
  // 限制日志数量
  if (consoleLogs.value.length > 100) {
    consoleLogs.value.shift();
  }
  // 自动滚动到底部
  setTimeout(() => {
    if (consoleLogsRef.value) {
      consoleLogsRef.value.scrollTop = consoleLogsRef.value.scrollHeight;
    }
  }, 100);
};

// 清空日志
const clearLogs = () => {
  consoleLogs.value = [];
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// 组件挂载时重写 console 方法
onMounted(() => {
  overrideConsole();
  // 添加初始日志
  addLog('info', t('debugTools.consoleEnabled'));
  // 初始化错误历史
  updateErrorHistory();
  // 开始轮询更新错误历史
  errorPollingTimer = window.setInterval(updateErrorHistory, 1000);
});

// 组件卸载时恢复原始 console 方法
onUnmounted(() => {
  restoreConsole();
  if (errorPollingTimer) {
    clearInterval(errorPollingTimer);
  }
});

// 获取图形名称
const getGraphicName = (graphic: any) => {
  switch (graphic.type) {
    case 'button':
      return `${t('debugTools.button')} ${graphic.config.customProps.text || ''}`;
    case 'input':
      return `${t('debugTools.input')} ${graphic.config.customProps.placeholder || ''}`;
    case 'shape':
      return `${t('debugTools.shape')} ${graphic.config.customProps.shapeType || ''}`;
    case 'label':
      return `${t('debugTools.label')} ${graphic.config.customProps.text || ''}`;
    case 'image':
      return `${t('debugTools.image')} ${graphic.config.customProps.alt || ''}`;
    case 'chart':
      return `${t('debugTools.chart')} ${graphic.config.customProps.title || ''}`;
    default:
      return `${graphic.type}`;
  }
};
</script>

<style scoped>
.debug-tools-container {
  display: flex;
  height: 100%;
  position: relative;
}

.drawer-button {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 20px;
  height: 60px;
  border: 1px solid var(--border);
  border-left: none;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  background-color: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

.drawer-button:hover {
  background-color: var(--control-button-hover);
}

.drawer-button.expanded {
  left: 300px;
}

.debug-tools {
  background-color: var(--background);
  border-left: 1px solid var(--border);
  padding: 10px;
  width: 300px;
  height: 100%;
  overflow-y: hidden;
  transition: all 0.3s ease;
  transform: translateX(0);
}

.debug-tools:not(.expanded) {
  transform: translateX(-100%);
}

.debug-section {
  margin-bottom: 20px;
}

.debug-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--text);
}

.debug-panel {
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--surface);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.debug-panel h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: bold;
  color: var(--text);
}

.hierarchy-view {
  max-height: 200px;
  overflow-y: hidden;
}

.hierarchy-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hierarchy-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text);
}

.hierarchy-item:hover {
  background-color: var(--control-button-hover);
}

.hierarchy-item.selected {
  background-color: var(--primary);
  color: white;
}

.hierarchy-indent {
  flex-shrink: 0;
}

.hierarchy-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.hierarchy-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-type {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.hierarchy-id {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 10px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-zindex {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 10px;
}

.no-graphics {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text);
}

.info-item span:last-child {
  color: var(--text-secondary);
}

/* 控制台日志样式 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.clear-button {
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 10px;
  background-color: var(--control-button-background);
  color: var(--control-button-text);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background-color: var(--control-button-hover);
}

.console-logs {
  max-height: 200px;
  overflow-y: hidden;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 5px;
  background-color: var(--background);
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-bottom: 3px;
  font-size: 10px;
  line-height: 1.2;
}

.log-time {
  color: var(--text-secondary);
  flex-shrink: 0;
  min-width: 60px;
}

.log-level {
  flex-shrink: 0;
  min-width: 50px;
  font-weight: bold;
}

.log-level.LOG {
  color: var(--text);
}

.log-level.ERROR {
  color: #f44336;
}

.log-level.WARN {
  color: #ff9800;
}

.log-level.INFO {
  color: #2196f3;
}

.log-message {
  flex: 1;
  word-break: break-all;
  color: var(--text);
}

/* 日志级别样式 */
.log-item.log {
  border-left: 2px solid var(--text);
  padding-left: 5px;
}

.log-item.error {
  border-left: 2px solid #f44336;
  padding-left: 5px;
}

.log-item.warn {
  border-left: 2px solid #ff9800;
  padding-left: 5px;
}

.log-item.info {
  border-left: 2px solid #2196f3;
  padding-left: 5px;
}

/* 错误历史样式 */
.error-history {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 5px;
  background-color: var(--background);
}

.error-item {
  margin-bottom: 5px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-item:hover {
  background-color: var(--control-button-hover);
}

.error-item.storageerror {
  border-left: 3px solid #ff9800;
  background-color: rgba(255, 152, 0, 0.05);
}

.error-item.scripterror {
  border-left: 3px solid #9c27b0;
  background-color: rgba(156, 39, 176, 0.05);
}

.error-item.exporterror {
  border-left: 3px solid #f44336;
  background-color: rgba(244, 67, 54, 0.05);
}

.error-item.importerror {
  border-left: 3px solid #e91e63;
  background-color: rgba(233, 30, 99, 0.05);
}

.error-item.serializationerror {
  border-left: 3px solid #673ab7;
  background-color: rgba(103, 58, 183, 0.05);
}

.error-item.validationerror {
  border-left: 3px solid #3f51b5;
  background-color: rgba(63, 81, 181, 0.05);
}

.error-item.graphicerror {
  border-left: 3px solid #f44336;
  background-color: rgba(244, 67, 54, 0.05);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.error-icon {
  font-size: 12px;
}

.error-type {
  font-weight: bold;
  font-size: 11px;
  color: var(--text);
}

.error-time {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
}

.error-message {
  font-size: 11px;
  color: var(--text);
  word-break: break-word;
}

.error-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.error-context {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.error-stack {
  font-size: 10px;
  color: var(--text-secondary);
}

.error-stack pre {
  margin: 4px 0 0 0;
  padding: 4px;
  background-color: var(--surface);
  border-radius: 2px;
  overflow-x: auto;
  font-size: 9px;
  line-height: 1.4;
}

.no-errors {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
