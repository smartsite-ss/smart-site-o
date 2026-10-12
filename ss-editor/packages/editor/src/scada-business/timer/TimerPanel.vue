<template>
  <div class="timer-panel-content">
    <div class="timer-header">
      <button
        class="btn btn--primary btn--sm"
        type="button"
        @click="addTimer"
      >
        + {{ t('timerPanel.addTimer') }}
      </button>
    </div>
    
    <div
      v-if="timers.length === 0"
      class="timer-empty"
    >
      {{ t('timerPanel.noTimers') }}
    </div>
    
    <div
      v-else
      class="timer-list"
    >
      <div
        v-for="timer in timers"
        :key="timer.id"
        class="timer-item"
        :class="{ active: selectedTimerId === timer.id }"
      >
        <div
          class="timer-item-header"
          @click="selectTimer(timer.id)"
        >
          <div class="timer-item-name">
            <input
              type="text"
              class="timer-name-input"
              :value="timer.name"
              @input="updateTimerName(timer.id, ($event.target as HTMLInputElement).value)"
              @keydown.stop
            >
          </div>
          <div class="timer-item-status">
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="timer.enabled"
                @change="toggleTimerEnabled(timer.id)"
              >
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
        
        <div
          v-if="selectedTimerId === timer.id"
          class="timer-item-details"
        >
          <div class="property-group">
            <label>{{ t('timerPanel.type') }}</label>
            <div class="property-item">
              <select
                :value="timer.type"
                @change="updateTimerType(timer.id, ($event.target as HTMLSelectElement).value as 'interval' | 'timeout')"
              >
                <option value="interval">
                  {{ t('timerPanel.interval') }}
                </option>
                <option value="timeout">
                  {{ t('timerPanel.timeout') }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="property-group">
            <label>{{ t('timerPanel.intervalLabel') }}</label>
            <div class="property-item">
              <input
                type="number"
                :value="timer.interval"
                :min="100"
                @input="updateTimerInterval(timer.id, Number(($event.target as HTMLInputElement).value))"
                @keydown.stop
              >
              <span class="hint">ms</span>
            </div>
          </div>
          
          <div
            v-if="timer.type === 'timeout'"
            class="property-group"
          >
            <label>{{ t('timerPanel.repeatCount') }}</label>
            <div class="property-item">
              <input
                type="number"
                :value="timer.repeatCount || 0"
                :min="-1"
                :placeholder="t('timerPanel.infinite')"
                @input="updateTimerRepeatCount(timer.id, Number(($event.target as HTMLInputElement).value))"
                @keydown.stop
              >
            </div>
          </div>
          
          <div class="property-group">
            <label>{{ t('timerPanel.script') }}</label>
            <div class="property-item script-preview-container">
              <div class="script-preview">
                <code class="script-preview-code">{{ previewScript(timer.script) }}</code>
              </div>
              <button
                class="btn btn--primary btn--sm btn--open-editor"
                type="button"
                @click="openInDrawer(timer)"
              >
                <span class="btn-icon">✎</span>
                {{ t('timerPanel.openInEditor') }}
              </button>
            </div>
          </div>
          
          <div class="timer-actions">
            <button
              class="btn"
              style="background-color: var(--status-success); color: white;"
              type="button"
              @click="testTimerScript(timer.id)"
            >
              {{ t('timerPanel.testScript') }}
            </button>
            <button
              class="btn"
              style="background-color: var(--status-error); color: white;"
              type="button"
              @click="deleteTimer(timer.id)"
            >
              {{ t('timerPanel.delete') }}
            </button>
          </div>
          
          <div
            v-if="getTimerExecutionLogs(timer.id).length > 0"
            class="timer-logs"
          >
            <h4>{{ t('timerPanel.executionLogs') }}</h4>
            <div class="log-list">
              <div
                v-for="log in getTimerExecutionLogs(timer.id)"
                :key="log.timestamp"
                class="log-item"
                :class="{ error: !log.success }"
              >
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                <span
                  v-if="log.success"
                  class="log-success"
                >
                  {{ log.output || t('timerPanel.executeSuccess') }}
                </span>
                <span
                  v-else
                  class="log-error"
                >
                  {{ log.error || t('timerPanel.executeFailed') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { type ITimerConfig, type ITimerExecutionResult, type BasePage, i18n } from '@scada-editor/core';
import { useJsonEditor } from '../../composables/useJsonEditor';
import { useScriptDrawer } from '../../components/script/useScriptDrawer';

// 国际化翻译函数
const { t } = i18n.global;

interface Props {
  page: BasePage | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updatePage: [];
}>();

const { refreshJson } = useJsonEditor();
const { openScript } = useScriptDrawer();
const timers = ref<ITimerConfig[]>([])
const selectedTimerId = ref<string | null>(null)
const executionLogs = ref<Map<string, ITimerExecutionResult[]>>(new Map())
const timersInitialized = ref(false);

onMounted(() => {
  if (props.page && !timersInitialized.value) {
    // 初始化定时器
    if (props.page.timers) {
      timers.value = props.page.timers;
    }
    // 启动定时器
    if (props.page.startTimers) {
      props.page.startTimers();
    }
    timersInitialized.value = true;
  }
});

onUnmounted(() => {
  if (props.page && props.page.stopTimers) {
    props.page.stopTimers();
  }
});

/** 在底部抽屉中打开脚本编辑器 */
const openInDrawer = (timer: ITimerConfig) => {
  openScript(
    {
      id: `timer-${timer.id}`,
      title: timer.name || `Timer ${timer.id}`,
      script: timer.script || '',
      mode: 'timer',
      source: { type: 'timer', sourceId: timer.id },
    },
    (script: string) => {
      updateTimerScript(timer.id, script);
    },
  );
};

/** 脚本预览（截取前几行） */
const previewScript = (script: string): string => {
  if (!script) return '// 暂无脚本';
  const lines = script.split('\n').slice(0, 3);
  if (script.split('\n').length > 3) lines.push('...');
  return lines.join('\n');
};

const addTimer = () => {
  if (props.page && props.page.addTimer) {
    const newTimer = props.page.addTimer({
      name: t('timerPanel.newTimer'),
      enabled: true,
      type: 'interval',
      interval: 1000,
      script: '// ' + t('timerPanel.scriptHint'),
    });
    timers.value = props.page.timers;
    selectedTimerId.value = newTimer.id;
    updatePage();
    refreshJson();
  }
};

const selectTimer = (id: string) => {
  selectedTimerId.value = selectedTimerId.value === id ? null : id;
};

const updateTimerName = (id: string, name: string) => {
  if (props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { name });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const updateTimerType = (id: string, type: 'interval' | 'timeout') => {
  if (props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { type });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const updateTimerInterval = (id: string, interval: number) => {
  if (props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { interval });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const updateTimerRepeatCount = (id: string, repeatCount: number) => {
  if (props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { repeatCount });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const updateTimerScript = (id: string, script: string) => {
  if (props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { script });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const toggleTimerEnabled = (id: string) => {
  const timer = timers.value.find(t => t.id === id);
  if (timer && props.page && props.page.updateTimer) {
    props.page.updateTimer(id, { enabled: !timer.enabled });
    timers.value = props.page.timers;
    updatePage();
    refreshJson();
  }
};

const deleteTimer = (id: string) => {
  if (props.page && props.page.removeTimer) {
    props.page.removeTimer(id);
    timers.value = props.page.timers;
    if (selectedTimerId.value === id) {
      selectedTimerId.value = null;
    }
    executionLogs.value.delete(id);
    updatePage();
    refreshJson();
  }
};

const testTimerScript = (id: string) => {
  const timer = timers.value.find(t => t.id === id);
  if (timer && props.page && props.page.executeTimerScript) {
    const result = props.page.executeTimerScript(timer);
    let logs = executionLogs.value.get(id) || [];
    logs.push(result);
    if (logs.length > 50) {
      logs.shift();
    }
    executionLogs.value.set(id, logs);
  }
};

const getTimerExecutionLogs = (id: string) => {
  return executionLogs.value.get(id) || [];
};

const formatLogTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const updatePage = () => {
  emit('updatePage');
};
</script>

<style scoped>
@import '../../panels/styles/property-panel.scss';

.timer-panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-sm);
  gap: var(--spacing-xs);
  overflow-y: auto;
}

.timer-header {
  display: flex;
  justify-content: flex-end;
  padding-bottom: var(--spacing-xs);
}

.timer-empty {
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.timer-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.timer-item {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.timer-item:hover {
  border-color: var(--primary);
  box-shadow: 0 1px 3px rgba(52, 152, 219, 0.1);
}

.timer-item.active {
  border-color: var(--primary);
}

.timer-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--surface);
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 28px;
}

.timer-item-header:hover {
  background-color: var(--control-button-hover);
}

.timer-item-name {
  flex: 1;
}

.timer-name-input {
  width: 100%;
  border: none;
  background: transparent;
  font-weight: 600;
  color: var(--text);
  font-size: 12px;
  padding: 2px 0;
}

.timer-name-input:focus {
  outline: none;
}

.timer-item-status {
  display: flex;
  align-items: center;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.3s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary);
}

input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.timer-item-details {
  padding: var(--spacing-sm);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.script-preview-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.script-preview {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  max-height: 60px;
  overflow: auto;
}

.script-preview-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.btn--open-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  width: 100%;
}

.btn--open-editor .btn-icon {
  font-size: 13px;
}

.timer-actions {
  display: flex;
  gap: var(--spacing-xs);
  justify-content: flex-end;
}

.timer-logs {
  border-top: 1px solid var(--border);
  padding-top: var(--spacing-sm);
}

.timer-logs h4 {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.log-list {
  max-height: 60px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-item {
  display: flex;
  gap: var(--spacing-xs);
  font-size: 10px;
  padding: 3px 6px;
  background-color: var(--surface);
  border-radius: 2px;
  border-left: 2px solid var(--primary);
}

.log-item.error {
  background-color: #ffebee;
  border-left-color: var(--status-error);
}

.log-time {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-weight: 500;
}

.log-success {
  color: var(--status-success);
}

.log-error {
  color: var(--status-error);
}

/* 滚动条样式 */
.timer-panel-content::-webkit-scrollbar,
.log-list::-webkit-scrollbar {
  width: 5px;
}

.timer-panel-content::-webkit-scrollbar-track,
.log-list::-webkit-scrollbar-track {
  background: var(--background);
  border-radius: 2px;
}

.timer-panel-content::-webkit-scrollbar-thumb,
.log-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.timer-panel-content::-webkit-scrollbar-thumb:hover,
.log-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}
</style>
