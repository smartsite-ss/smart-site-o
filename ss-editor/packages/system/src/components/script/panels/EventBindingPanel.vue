<template>
  <div class="event-binding-panel">
    <div class="binding-form">
      <!-- 事件类型选择 -->
      <div class="form-group">
        <label class="form-label">{{ $t('eventBinding.selectEventType') }}</label>
        <select
          v-model="selectedEventType"
          class="form-select"
          @change="onEventTypeChange"
        >
          <option value="">
            {{ $t('eventBinding.selectEventType') }}
          </option>
          <optgroup
            v-for="group in eventGroups"
            :key="group.label"
            :label="group.label"
          >
            <option
              v-for="evt in group.events"
              :key="evt.fullName"
              :value="evt.fullName"
            >
              {{ evt.label }}
            </option>
          </optgroup>
        </select>
      </div>

      <!-- 事件描述 -->
      <div
        v-if="selectedEvent"
        class="event-description"
      >
        <span class="desc-icon">ℹ</span>
        <span class="desc-text">{{ selectedEvent.description }}</span>
      </div>

      <!-- 条件表达式（可选） -->
      <div class="form-group">
        <label class="form-label">
          {{ $t('eventBinding.condition') }}
          <span class="label-hint">{{ $t('eventBinding.conditionOptional') }}</span>
        </label>
        <input
          v-model="condition"
          class="form-input"
          :placeholder="$t('eventBinding.conditionPlaceholder')"
          @input="emitChange"
        >
        <span class="form-hint">{{ $t('eventBinding.conditionHint') }}</span>
      </div>

      <!-- 脚本选择 -->
      <div class="form-group">
        <label class="form-label">{{ $t('eventBinding.bindingScript') }}</label>
        <select
          v-model="selectedScriptId"
          class="form-select"
          @change="emitChange"
        >
          <option value="">
            {{ $t('eventBinding.selectScript') }}
          </option>
          <option
            v-for="script in scripts"
            :key="script.id"
            :value="script.id"
          >
            {{ script.name }}
          </option>
        </select>
        <span
          v-if="scripts.length === 0"
          class="form-hint muted"
        >
          {{ $t('eventBinding.noScripts') }}
        </span>
      </div>
    </div>

    <!-- 已绑定列表 -->
    <div
      v-if="bindings.length > 0"
      class="binding-list"
    >
      <div class="list-header">
        <span class="list-title">{{ $t('eventBinding.boundEvents') }}</span>
        <span class="list-count">{{ bindings.length }}</span>
      </div>
      <div
        v-for="(binding, index) in bindings"
        :key="index"
        class="binding-item"
      >
        <div class="binding-info">
          <span class="binding-event">{{ getEventLabel(binding.eventFullName) }}</span>
          <span
            v-if="binding.condition"
            class="binding-condition"
          >
            if ({{ binding.condition }})
          </span>
          <span class="binding-arrow">→</span>
          <span class="binding-script">{{ getScriptName(binding.scriptId) }}</span>
        </div>
        <button
          class="binding-remove"
          :title="$t('eventBinding.remove')"
          @click="removeBinding(index)"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="binding-actions">
      <button
        class="btn btn-primary btn-sm"
        :disabled="!canAdd"
        @click="addBinding"
      >
        {{ $t('eventBinding.add') }}
      </button>
      <button
        v-if="bindings.length > 0"
        class="btn btn-outline btn-sm"
        @click="clearAll"
      >
        {{ $t('eventBinding.clearAll') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@scada-editor/core';
import type { ScriptDefinition } from '@scada-editor/core';
import type { EventBindingConfig } from './EventBindingPanel.types';

const { t } = useI18n();

const props = defineProps<{
  modelValue: EventBindingConfig[];
  scripts: ScriptDefinition[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: EventBindingConfig[]): void;
}>();

interface EventOption {
  fullName: string;
  label: string;
  description: string;
}

const eventGroups = computed(() => [
  {
    label: t('eventBinding.eventGroups.data'),
    events: [
      { fullName: 'data:changed', label: t('eventBinding.events.dataChanged'), description: t('eventBinding.events.dataChangedDesc') },
      { fullName: 'data:quality:bad', label: t('eventBinding.events.dataQualityBad'), description: t('eventBinding.events.dataQualityBadDesc') },
      { fullName: 'data:timeout', label: t('eventBinding.events.dataTimeout'), description: t('eventBinding.events.dataTimeoutDesc') },
    ] as EventOption[],
  },
  {
    label: t('eventBinding.eventGroups.alarm'),
    events: [
      { fullName: 'alarm:triggered', label: t('eventBinding.events.alarmTriggered'), description: t('eventBinding.events.alarmTriggeredDesc') },
      { fullName: 'alarm:acknowledged', label: t('eventBinding.events.alarmAcknowledged'), description: t('eventBinding.events.alarmAcknowledgedDesc') },
      { fullName: 'alarm:cleared', label: t('eventBinding.events.alarmCleared'), description: t('eventBinding.events.alarmClearedDesc') },
    ] as EventOption[],
  },
  {
    label: t('eventBinding.eventGroups.graphic'),
    events: [
      { fullName: 'graphic:click', label: t('eventBinding.events.graphicClick'), description: t('eventBinding.events.graphicClickDesc') },
      { fullName: 'graphic:doubleClick', label: t('eventBinding.events.graphicDoubleClick'), description: t('eventBinding.events.graphicDoubleClickDesc') },
      { fullName: 'graphic:mouseEnter', label: t('eventBinding.events.graphicMouseEnter'), description: t('eventBinding.events.graphicMouseEnterDesc') },
      { fullName: 'graphic:mouseLeave', label: t('eventBinding.events.graphicMouseLeave'), description: t('eventBinding.events.graphicMouseLeaveDesc') },
    ] as EventOption[],
  },
  {
    label: t('eventBinding.eventGroups.system'),
    events: [
      { fullName: 'page:loaded', label: t('eventBinding.events.pageLoaded'), description: t('eventBinding.events.pageLoadedDesc') },
      { fullName: 'page:unloaded', label: t('eventBinding.events.pageUnloaded'), description: t('eventBinding.events.pageUnloadedDesc') },
      { fullName: 'page:switched', label: t('eventBinding.events.pageSwitched'), description: t('eventBinding.events.pageSwitchedDesc') },
      { fullName: 'system:online', label: t('eventBinding.events.systemOnline'), description: t('eventBinding.events.systemOnlineDesc') },
      { fullName: 'system:offline', label: t('eventBinding.events.systemOffline'), description: t('eventBinding.events.systemOfflineDesc') },
    ] as EventOption[],
  },
  {
    label: t('eventBinding.eventGroups.timer'),
    events: [
      { fullName: 'timer:tick', label: t('eventBinding.events.timerTick'), description: t('eventBinding.events.timerTickDesc') },
      { fullName: 'timer:minute', label: t('eventBinding.events.timerMinute'), description: t('eventBinding.events.timerMinuteDesc') },
      { fullName: 'timer:hour', label: t('eventBinding.events.timerHour'), description: t('eventBinding.events.timerHourDesc') },
    ] as EventOption[],
  },
]);

const selectedEventType = ref('');
const condition = ref('');
const selectedScriptId = ref('');

const bindings = ref<EventBindingConfig[]>([...props.modelValue]);

const selectedEvent = computed(() => {
  for (const group of eventGroups.value) {
    const found = group.events.find((e: EventOption) => e.fullName === selectedEventType.value);
    if (found) return found;
  }
  return null;
});

const canAdd = computed(() => {
  return selectedEventType.value && selectedScriptId.value;
});

function getEventLabel(fullName: string): string {
  for (const group of eventGroups.value) {
    const found = group.events.find((e: EventOption) => e.fullName === fullName);
    if (found) return found.label;
  }
  return fullName;
}

function getScriptName(scriptId: string): string {
  const script = props.scripts.find((s) => s.id === scriptId);
  return script?.name ?? scriptId;
}

function onEventTypeChange() {
  emitChange();
}

function emitChange() {
  // 不自动 emit，等待用户点击添加
}

function addBinding() {
  if (!canAdd.value) return;

  const newBinding: EventBindingConfig = {
    eventFullName: selectedEventType.value,
    scriptId: selectedScriptId.value,
    condition: condition.value || undefined,
  };

  // 避免重复绑定
  const exists = bindings.value.some(
    (b) =>
      b.eventFullName === newBinding.eventFullName &&
      b.scriptId === newBinding.scriptId &&
      b.condition === newBinding.condition,
  );

  if (!exists) {
    bindings.value.push(newBinding);
    emit('update:modelValue', [...bindings.value]);
  }

  // 重置选择
  selectedEventType.value = '';
  condition.value = '';
  selectedScriptId.value = '';
}

function removeBinding(index: number) {
  bindings.value.splice(index, 1);
  emit('update:modelValue', [...bindings.value]);
}

function clearAll() {
  bindings.value = [];
  emit('update:modelValue', []);
}

watch(
  () => props.modelValue,
  (val) => {
    bindings.value = [...val];
  },
);
</script>

<style scoped>
.event-binding-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
}

.binding-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.label-hint {
  font-weight: 400;
  color: #64748b;
}

.form-select,
.form-input {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 6px 10px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  width: 100%;
}

.form-select:focus,
.form-input:focus {
  border-color: #3b82f6;
}

.form-hint {
  color: #64748b;
  font-size: 11px;
  margin-top: 2px;
}

.form-hint code {
  background: #0f172a;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 11px;
  color: #4fc1ff;
}

.form-hint.muted {
  color: #475569;
  font-style: italic;
}

.event-description {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: #0f172a;
  border-radius: 4px;
  border: 1px solid #334155;
}

.desc-icon {
  color: #3b82f6;
  font-size: 13px;
  flex-shrink: 0;
}

.desc-text {
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

.binding-list {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #334155;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.list-title {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.list-count {
  background: #334155;
  color: #94a3b8;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
}

.binding-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
  margin-bottom: 4px;
  border: 1px solid #334155;
}

.binding-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}

.binding-event {
  color: #4fc1ff;
  font-weight: 500;
}

.binding-condition {
  color: #ce9178;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: #1e293b;
  padding: 1px 4px;
  border-radius: 2px;
}

.binding-arrow {
  color: #64748b;
}

.binding-script {
  color: #dcdcaa;
}

.binding-remove {
  background: none;
  border: none;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}

.binding-remove:hover {
  color: #ef4444;
}

.binding-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #334155;
}

.btn {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #1e3a5f;
  color: #64748b;
  cursor: not-allowed;
}

.btn-outline {
  background: none;
  border: 1px solid #334155;
  color: #94a3b8;
}

.btn-outline:hover {
  border-color: #ef4444;
  color: #ef4444;
}
</style>