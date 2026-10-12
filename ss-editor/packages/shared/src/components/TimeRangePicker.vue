<template>
  <div
    ref="rootRef"
    class="trp"
    :class="[`trp--${size}`, `trp--${mode}`]"
  >
    <!-- 固定窗口模式：简单下拉 -->
    <select
      v-if="mode === 'window'"
      :value="modelValue"
      class="trp-select"
      @change="onWindowChange"
    >
      <option
        v-for="opt in windowOptions"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <!-- 日期/日期时间模式：触发按钮 + 弹出面板 -->
    <template v-else>
      <button
        class="trp-trigger"
        :class="{ 'trp-trigger--open': open }"
        type="button"
        @click="toggleOpen"
      >
        <svg
          class="trp-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            ry="2"
          />
          <line
            x1="16"
            y1="2"
            x2="16"
            y2="6"
          />
          <line
            x1="8"
            y1="2"
            x2="8"
            y2="6"
          />
          <line
            x1="3"
            y1="10"
            x2="21"
            y2="10"
          />
        </svg>
        <span class="trp-display">{{ displayText }}</span>
        <svg
          class="trp-arrow"
          :class="{ 'trp-arrow--open': open }"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <Teleport to="body">
        <div
          v-if="open"
          class="trp-overlay"
          @click="handleOverlayClick"
        />
        <div
          v-if="open"
          ref="popoverRef"
          class="trp-popover"
          :style="popoverStyle"
        >
          <!-- 预设快捷 -->
          <div
            v-if="effectivePresets.length"
            class="trp-presets"
          >
            <span class="trp-presets-title">{{ t('timeRange.quickSelect') }}</span>
            <button
              v-for="p in effectivePresets"
              :key="p.value"
              class="trp-preset-btn"
              :class="{ 'trp-preset-btn--active': activePreset === p.value }"
              type="button"
              @click="applyPreset(p.value)"
            >
              {{ p.label }}
            </button>
          </div>

          <div class="trp-body">
            <!-- 开始 -->
            <div class="trp-field">
              <label class="trp-label">{{ _startLabel }}</label>
              <input
                :type="mode === 'datetime' ? 'datetime-local' : 'date'"
                :value="localStart"
                class="trp-input"
                @change="onStartChange"
              >
            </div>

            <span class="trp-sep">—</span>

            <!-- 结束 -->
            <div class="trp-field">
              <label class="trp-label">{{ _endLabel }}</label>
              <input
                :type="mode === 'datetime' ? 'datetime-local' : 'date'"
                :value="localEnd"
                class="trp-input"
                @change="onEndChange"
              >
            </div>
          </div>

          <div class="trp-footer">
            <button
              class="trp-clear-btn"
              :disabled="!hasValue"
              type="button"
              @click="clear"
            >
              {{ _clearLabel }}
            </button>
            <div class="trp-footer-actions">
              <button
                class="trp-cancel-btn"
                type="button"
                @click="cancel"
              >
                {{ _cancelLabel }}
              </button>
              <button
                class="trp-apply-btn"
                type="button"
                @click="apply"
              >
                {{ _applyLabel }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from '@scada-editor/core';
import type { TimeRange } from './TimeRangePicker.types';

/** 时间范围值 */
export type { TimeRange } from './TimeRangePicker.types';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 模式 */
    mode: 'date' | 'datetime' | 'window';
    /** v-model: date/datetime 模式为 { start, end }，window 模式为 number(分钟) */
    modelValue: TimeRange | number;
    /** 预设选项（date/datetime 模式；未传入时按 mode 自动生成默认快捷项） */
    presets?: { label: string; value: string }[];
    /** 窗口选项（仅 window 模式） */
    windowOptions?: { label: string; value: number }[];
    /** 开始标签 */
    startLabel?: string;
    /** 结束标签 */
    endLabel?: string;
    /** 应用按钮文本 */
    applyLabel?: string;
    /** 取消按钮文本 */
    cancelLabel?: string;
    /** 清除按钮文本 */
    clearLabel?: string;
    /** 尺寸 */
    size?: 'sm' | 'md';
    /** 占位文本 */
    placeholder?: string;
  }>(),
  {
    presets: () => [],
    windowOptions: () => [],
    startLabel: '',
    endLabel: '',
    applyLabel: '',
    cancelLabel: '',
    clearLabel: '',
    size: 'sm',
    placeholder: '',
  },
);

// 计算最终标签：优先使用 prop，否则使用 i18n 默认值
const _startLabel = computed(() => props.startLabel || (props.mode === 'datetime' ? t('timeRange.startTime') : t('timeRange.startDate')));
const _endLabel = computed(() => props.endLabel || (props.mode === 'datetime' ? t('timeRange.endTime') : t('timeRange.endDate')));
const _applyLabel = computed(() => props.applyLabel || t('timeRange.apply'));
const _cancelLabel = computed(() => props.cancelLabel || t('timeRange.cancel'));
const _clearLabel = computed(() => props.clearLabel || t('timeRange.clear'));
const _placeholder = computed(() => props.placeholder || t('timeRange.placeholder'));

/**
 * 生效的预设列表 — 优先使用外部传入的 presets，未传入时按 mode 自动生成默认快捷项
 *
 * - datetime 模式：含小时级精度（最近1/6/24小时）+ 今天/昨天/本周/本月
 * - date 模式：仅日期级精度（今天/昨天/本周/本月/最近7天/最近30天）
 * - window 模式：无预设（下拉选择即可）
 *
 * 外部传入 presets 时完全覆盖默认值，保持灵活性。
 */
const effectivePresets = computed<{ label: string; value: string }[]>(() => {
  if (props.presets.length) return props.presets;
  if (props.mode === 'datetime') {
    return [
      { label: t('timeRange.last1Hour'), value: '1h' },
      { label: t('timeRange.last6Hours'), value: '6h' },
      { label: t('timeRange.last24Hours'), value: '24h' },
      { label: t('timeRange.today'), value: 'today' },
      { label: t('timeRange.yesterday'), value: 'yesterday' },
      { label: t('timeRange.thisWeek'), value: 'thisWeek' },
      { label: t('timeRange.thisMonth'), value: 'thisMonth' },
    ];
  }
  if (props.mode === 'date') {
    return [
      { label: t('timeRange.today'), value: 'today' },
      { label: t('timeRange.yesterday'), value: 'yesterday' },
      { label: t('timeRange.thisWeek'), value: 'thisWeek' },
      { label: t('timeRange.thisMonth'), value: 'thisMonth' },
      { label: t('timeRange.last7Days'), value: '7d' },
      { label: t('timeRange.last30Days'), value: '30d' },
    ];
  }
  return [];
});

const emit = defineEmits<{
  'update:modelValue': [value: TimeRange | number];
  change: [value: TimeRange | number];
}>();

const open = ref(false);
const localStart = ref('');
const localEnd = ref('');
const activePreset = ref<string>('');
const rootRef = ref<HTMLElement>();
const popoverRef = ref<HTMLElement>();
const popoverStyle = ref<Record<string, string>>({});

const hasValue = computed(() => {
  if (props.mode === 'window') return props.modelValue !== 0;
  const v = props.modelValue as TimeRange;
  return !!(v?.start || v?.end);
});

const displayText = computed(() => {
  if (props.mode === 'window') {
    const opt = props.windowOptions.find((o) => o.value === props.modelValue);
    return opt?.label || String(props.modelValue);
  }
  const v = props.modelValue as TimeRange;
  if (!v?.start && !v?.end) return _placeholder.value;
  const fmt = (s: string) => {
    if (!s) return '…';
    if (props.mode === 'datetime') return s.replace('T', ' ').slice(0, 16);
    return s.slice(0, 10);
  };
  return `${fmt(v.start)} — ${fmt(v.end)}`;
});

function syncLocal() {
  if (props.mode === 'window') return;
  const v = props.modelValue as TimeRange;
  localStart.value = v?.start || '';
  localEnd.value = v?.end || '';
  activePreset.value = '';
}

watch(() => props.modelValue, syncLocal, { immediate: true });

function toggleOpen() {
  if (open.value) {
    close();
  } else {
    syncLocal();
    open.value = true;
    nextTick(() => positionPopover());
  }
}

function close() {
  open.value = false;
}

function positionPopover() {
  if (!rootRef.value || !popoverRef.value) return;
  const trigger = rootRef.value.querySelector('.trp-trigger') as HTMLElement;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  // 面板宽度约 320px，确保不超出右侧
  const popoverW = 320;
  let left = rect.left;
  if (left + popoverW > window.innerWidth - 12) {
    left = window.innerWidth - popoverW - 12;
  }
  if (left < 8) left = 8;
  popoverStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
    zIndex: '10000',
  };
}

function applyPreset(value: string) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (value) {
    case '1h': start.setHours(start.getHours() - 1); break;
    case '6h': start.setHours(start.getHours() - 6); break;
    case '24h': start.setDate(start.getDate() - 1); break;
    case '7d': start.setDate(start.getDate() - 7); break;
    case '30d': start.setDate(start.getDate() - 30); break;
    case 'today': start.setHours(0, 0, 0, 0); break;
    case 'yesterday': start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); break;
    case 'thisWeek': {
      const d = start.getDay();
      const diff = d === 0 ? 6 : d - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'thisMonth': start.setDate(1); start.setHours(0, 0, 0, 0); break;
    default: break;
  }

  // 使用本地时间格式化（与 <input type="datetime-local"> 一致），
  // toISOString() 会转 UTC，在非 UTC 时区导致时间偏移
  const fmt = props.mode === 'datetime'
    ? (d: Date) => {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${day}T${h}:${mi}`;
      }
    : (d: Date) => {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
      };

  localStart.value = fmt(start);
  localEnd.value = fmt(end);
  activePreset.value = value;
}

function onStartChange(e: Event) {
  localStart.value = (e.target as HTMLInputElement).value;
  activePreset.value = '';
}

function onEndChange(e: Event) {
  localEnd.value = (e.target as HTMLInputElement).value;
  activePreset.value = '';
}

function onWindowChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value);
  emit('update:modelValue', val);
  emit('change', val);
}

function apply() {
  if (props.mode === 'window') return;
  const v: TimeRange = { start: localStart.value, end: localEnd.value };
  emit('update:modelValue', v);
  emit('change', v);
  close();
}

function cancel() {
  syncLocal();
  close();
}

function clear() {
  if (props.mode === 'window') return;
  localStart.value = '';
  localEnd.value = '';
  activePreset.value = '';
  const v: TimeRange = { start: '', end: '' };
  emit('update:modelValue', v);
  emit('change', v);
  close();
}

function handleOverlayClick() {
  close();
}

function handleClickOutside(e: MouseEvent) {
  if (!popoverRef.value) return;
  if (!popoverRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  window.addEventListener('resize', positionPopover);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
  window.removeEventListener('resize', positionPopover);
});
</script>

<style scoped>
/* ===== 基础 ===== */
.trp {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

/* ===== window 模式 ===== */
.trp-select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 6px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 24px;
}

.trp-select:focus {
  border-color: var(--primary);
}

/* ===== 触发按钮 ===== */
.trp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
  font-family: inherit;
  line-height: 1.5;
}

.trp-trigger:hover {
  border-color: var(--primary);
}

.trp-trigger--open {
  border-color: var(--primary);
}

.trp-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.trp-display {
  color: var(--text);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trp-display:empty::before {
  content: attr(data-placeholder);
  color: var(--text-secondary);
}

.trp-arrow {
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: transform 0.15s;
}

.trp-arrow--open {
  transform: rotate(180deg);
}

/* ===== 弹出面板 ===== */
.trp-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.trp-popover {
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  animation: trp-scale-in 0.15s ease;
}

@keyframes trp-scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

/* ===== 预设区 ===== */
.trp-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--border);
}

.trp-presets-title {
  width: 100%;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
}

.trp-preset-btn {
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  line-height: 1.5;
}

.trp-preset-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.trp-preset-btn--active {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

/* ===== 输入区 ===== */
.trp-body {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
}

.trp-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trp-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.trp-sep {
  color: var(--text-secondary);
  font-size: 13px;
  padding-top: 18px;
  flex-shrink: 0;
}

.trp-input {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.trp-input:focus {
  border-color: var(--primary);
}

/* Fix for datetime-local height inconsistency */
.trp-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
}

/* ===== 底部 ===== */
.trp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  gap: 8px;
}

.trp-footer-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.trp-clear-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.trp-clear-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.trp-clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.trp-cancel-btn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.trp-cancel-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.trp-apply-btn {
  padding: 4px 12px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: inherit;
}

.trp-apply-btn:hover {
  opacity: 0.85;
}

/* ===== 尺寸 ===== */
.trp--sm .trp-trigger { padding: 3px 6px; font-size: 11px; }
.trp--sm .trp-icon { width: 12px; height: 12px; }
.trp--sm .trp-select { padding: 2px 6px; font-size: 11px; padding-right: 20px; background-size: 14px; }
</style>