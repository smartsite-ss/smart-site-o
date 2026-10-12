<template>
  <div class="cron-input-wrap">
    <!-- 预设选择 -->
    <div class="cron-presets">
      <button
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        class="preset-btn"
        :class="{ active: modelValue === preset.value }"
        @click="selectPreset(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- 手动输入 -->
    <div class="cron-input-row">
      <input
        type="text"
        class="cron-text-input"
        :value="modelValue"
        placeholder="0 3 * * *"
        spellcheck="false"
        @input="onInput"
        @blur="onBlur"
      >
      <span
        class="cron-status"
        :class="validityClass"
      >{{ validityText }}</span>
    </div>

    <!-- 字段说明 -->
    <div class="cron-fields">
      <div
        v-for="(f, i) in fieldLabels"
        :key="i"
        class="cron-field"
      >
        <span class="field-name">{{ f.name }}</span>
        <span class="field-value">{{ fields[i] || '*' }}</span>
      </div>
    </div>

    <!-- 人类可读描述 -->
    <div
      v-if="humanDescription"
      class="cron-desc"
    >
      {{ humanDescription }}
    </div>
    <div
      v-else-if="!isValid"
      class="cron-desc cron-desc-warn"
    >
      {{ invalidReason }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Cron 表达式（5 段式：分 时 日 月 周） */
    modelValue: string;
    /** 是否显示预设按钮 */
    showPresets?: boolean;
  }>(),
  {
    showPresets: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

interface Preset {
  label: string;
  value: string;
}

const presets: Preset[] = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每30分钟', value: '*/30 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 0点', value: '0 0 * * *' },
  { label: '每天 3点', value: '0 3 * * *' },
  { label: '每天 12点', value: '0 12 * * *' },
  { label: '每周日 0点', value: '0 0 * * 0' },
  { label: '每月1日 0点', value: '0 0 1 * *' },
];

const fieldLabels = [
  { name: '分', value: '0-59' },
  { name: '时', value: '0-23' },
  { name: '日', value: '1-31' },
  { name: '月', value: '1-12' },
  { name: '周', value: '0-6' },
];

const fields = computed(() => {
  return (props.modelValue || '').trim().split(/\s+/);
});

const isValid = computed(() => {
  return validateCron(props.modelValue).valid;
});

const invalidReason = computed(() => {
  return validateCron(props.modelValue).reason;
});

const validityClass = computed(() => (isValid.value ? 'valid' : 'invalid'));
const validityText = computed(() => (isValid.value ? '✓' : '✗'));

const humanDescription = computed(() => {
  if (!isValid.value) return '';
  return describeCron(props.modelValue);
});

function selectPreset(value: string): void {
  emit('update:modelValue', value);
  emit('change', value);
}

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function onBlur(): void {
  emit('change', props.modelValue);
}

// ==================== Cron 表达式验证 ====================

interface ValidationResult {
  valid: boolean;
  reason: string;
}

function validateCron(expr: string): ValidationResult {
  if (!expr || !expr.trim()) {
    return { valid: false, reason: '表达式为空' };
  }

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, reason: `需要5个字段，当前${parts.length}个` };
  }

  const ranges = [
    { min: 0, max: 59, name: '分' },
    { min: 0, max: 23, name: '时' },
    { min: 1, max: 31, name: '日' },
    { min: 1, max: 12, name: '月' },
    { min: 0, max: 6, name: '周' },
  ];

  for (let i = 0; i < 5; i++) {
    const result = validateField(parts[i], ranges[i]);
    if (!result.valid) {
      return { valid: false, reason: `${ranges[i].name}字段: ${result.reason}` };
    }
  }

  return { valid: true, reason: '' };
}

function validateField(field: string, range: { min: number; max: number }): ValidationResult {
  if (!field) {
    return { valid: false, reason: '为空' };
  }

  // 支持 * 、 */N 、 N-M 、 N,M 、 N
  const segments = field.split(',');
  for (const seg of segments) {
    if (seg === '*') continue;

    // */N
    const stepMatch = seg.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1], 10);
      if (step < 1 || step > range.max) {
        return { valid: false, reason: `步长 ${step} 超出范围` };
      }
      continue;
    }

    // N-M/S
    const rangeMatch = seg.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < range.min || start > range.max) {
        return { valid: false, reason: `值 ${start} 超出范围 ${range.min}-${range.max}` };
      }
      if (end < range.min || end > range.max) {
        return { valid: false, reason: `值 ${end} 超出范围 ${range.min}-${range.max}` };
      }
      if (start > end) {
        return { valid: false, reason: `范围 ${start}-${end} 无效` };
      }
      continue;
    }

    // N
    const numMatch = seg.match(/^(\d+)$/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      if (val < range.min || val > range.max) {
        return { valid: false, reason: `值 ${val} 超出范围 ${range.min}-${range.max}` };
      }
      continue;
    }

    return { valid: false, reason: `格式无效: ${seg}` };
  }

  return { valid: true, reason: '' };
}

// ==================== Cron 人类可读描述 ====================

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return '';

  const [min, hour, day, month, week] = parts;

  // 每分钟
  if (min === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
    return '每分钟执行';
  }

  // 每 N 分钟
  const minStep = min.match(/^\*\/(\d+)$/);
  if (minStep && hour === '*' && day === '*' && month === '*' && week === '*') {
    return `每 ${minStep[1]} 分钟执行`;
  }

  // 每 N 小时
  if (min === '0' && hour && hour.match(/^\*\/(\d+)$/) && day === '*' && month === '*' && week === '*') {
    const h = hour.match(/^\*\/(\d+)$/);
    return `每 ${h?.[1]} 小时执行`;
  }

  // 每天 N 点
  if (min === '0' && hour && hour.match(/^\d+$/) && day === '*' && month === '*' && week === '*') {
    return `每天 ${parseInt(hour, 10)} 点执行`;
  }

  // 每天 N:M
  if (min && min.match(/^\d+$/) && hour && hour.match(/^\d+$/) && day === '*' && month === '*' && week === '*') {
    return `每天 ${parseInt(hour, 10)}:${min.padStart(2, '0')} 执行`;
  }

  // 每周 X
  if (week && week.match(/^\d$/) && min === '0' && hour === '0' && day === '*' && month === '*') {
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    return `每周${weekNames[parseInt(week, 10)]} 0点执行`;
  }

  // 每月 N 日
  if (day && day.match(/^\d+$/) && min === '0' && hour === '0' && month === '*' && week === '*') {
    return `每月 ${parseInt(day, 10)} 日 0点执行`;
  }

  // 通用描述
  const parts2: string[] = [];
  if (min !== '*') parts2.push(`分=${min}`);
  if (hour !== '*') parts2.push(`时=${hour}`);
  if (day !== '*') parts2.push(`日=${day}`);
  if (month !== '*') parts2.push(`月=${month}`);
  if (week !== '*') parts2.push(`周=${week}`);
  return parts2.length > 0 ? `自定义: ${parts2.join(' ')}` : '每分钟执行';
}
</script>

<style scoped>
.cron-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cron-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preset-btn {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff);
  color: var(--text, #1e293b);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--primary, #3b82f6);
  color: var(--primary, #3b82f6);
}

.preset-btn.active {
  background: var(--primary, #3b82f6);
  color: #fff;
  border-color: var(--primary, #3b82f6);
}

.cron-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cron-text-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  background: var(--surface, #fff);
  color: var(--text, #1e293b);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  outline: none;
}

.cron-text-input:focus {
  border-color: var(--primary, #3b82f6);
}

.cron-status {
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.cron-status.valid {
  color: var(--success, #10b981);
}

.cron-status.invalid {
  color: var(--danger, #ef4444);
}

.cron-fields {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg, rgba(0, 0, 0, 0.02));
  border-radius: 4px;
}

.cron-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.field-name {
  font-size: 11px;
  color: var(--text-secondary, #94a3b8);
}

.field-value {
  font-size: 12px;
  font-family: monospace;
  color: var(--text, #1e293b);
  font-weight: 500;
}

.cron-desc {
  font-size: 12px;
  color: var(--success, #10b981);
  padding: 4px 8px;
  background: rgba(16, 185, 129, 0.08);
  border-radius: 4px;
}

.cron-desc-warn {
  color: var(--danger, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}
</style>
