<template>
  <div class="cron-editor">
    <div class="cron-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="cron-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 预设模式 -->
    <div
      v-if="activeTab === 'preset'"
      class="cron-presets"
    >
      <div
        v-for="preset in presets"
        :key="preset.cron"
        class="preset-item"
        :class="{ active: modelValue === preset.cron }"
        @click="selectPreset(preset.cron)"
      >
        <span class="preset-label">{{ preset.label }}</span>
        <span class="preset-desc">{{ preset.desc }}</span>
      </div>
    </div>

    <!-- 自定义模式 -->
    <div
      v-else
      class="cron-custom"
    >
      <div class="cron-row">
        <label class="cron-field-label">分钟</label>
        <select
          v-model="fields.minute"
          class="cron-select"
          @change="onFieldChange"
        >
          <option value="*">
            每分钟
          </option>
          <option value="*/5">
            每5分钟
          </option>
          <option value="*/10">
            每10分钟
          </option>
          <option value="*/15">
            每15分钟
          </option>
          <option value="*/30">
            每30分钟
          </option>
          <option
            v-for="m in 60"
            :key="'m' + (m - 1)"
            :value="String(m - 1)"
          >
            {{ String(m - 1).padStart(2, '0') }} 分
          </option>
        </select>
      </div>

      <div class="cron-row">
        <label class="cron-field-label">小时</label>
        <select
          v-model="fields.hour"
          class="cron-select"
          @change="onFieldChange"
        >
          <option value="*">
            每小时
          </option>
          <option value="*/2">
            每2小时
          </option>
          <option value="*/6">
            每6小时
          </option>
          <option value="*/12">
            每12小时
          </option>
          <option
            v-for="h in 24"
            :key="'h' + (h - 1)"
            :value="String(h - 1)"
          >
            {{ String(h - 1).padStart(2, '0') }} 时
          </option>
        </select>
      </div>

      <div class="cron-row">
        <label class="cron-field-label">{{ $t('cron.day') }}</label>
        <select
          v-model="fields.dayOfMonth"
          class="cron-select"
          @change="onFieldChange"
        >
          <option value="*">
            {{ $t('cron.everyDay') }}
          </option>
          <option
            v-for="d in 31"
            :key="'d' + d"
            :value="String(d)"
          >
            {{ d }} {{ $t('cron.day') }}
          </option>
        </select>
      </div>

      <div class="cron-row">
        <label class="cron-field-label">{{ $t('cron.month') }}</label>
        <select
          v-model="fields.month"
          class="cron-select"
          @change="onFieldChange"
        >
          <option value="*">
            {{ $t('cron.everyMonth') }}
          </option>
          <option
            v-for="m in 12"
            :key="'mo' + m"
            :value="String(m)"
          >
            {{ monthNames[m - 1] }}
          </option>
        </select>
      </div>

      <div class="cron-row">
        <label class="cron-field-label">{{ $t('cron.weekday') }}</label>
        <select
          v-model="fields.dayOfWeek"
          class="cron-select"
          @change="onFieldChange"
        >
          <option value="*">
            {{ $t('cron.everyDay') }}
          </option>
          <option value="1">
            {{ $t('cron.monday') }}
          </option>
          <option value="2">
            {{ $t('cron.tuesday') }}
          </option>
          <option value="3">
            {{ $t('cron.wednesday') }}
          </option>
          <option value="4">
            {{ $t('cron.thursday') }}
          </option>
          <option value="5">
            {{ $t('cron.friday') }}
          </option>
          <option value="6">
            {{ $t('cron.saturday') }}
          </option>
          <option value="0">
            {{ $t('cron.sunday') }}
          </option>
          <option value="1-5">
            {{ $t('cron.workday') }}
          </option>
          <option value="0,6">
            {{ $t('cron.weekend') }}
          </option>
        </select>
      </div>

      <div class="cron-expression">
        <label class="cron-field-label">{{ $t('cron.cronExpression') }}</label>
        <input
          v-model="cronInput"
          class="cron-input"
          :class="{ invalid: validationError }"
          placeholder="* * * * *"
          @input="onCronInput"
        >
        <span
          v-if="validationError"
          class="cron-error"
        >{{ validationError }}</span>
      </div>
    </div>

    <!-- 描述与预览 -->
    <div class="cron-preview">
      <div class="preview-row">
        <span class="preview-label">{{ $t('cron.expression') }}</span>
        <code class="preview-code">{{ modelValue }}</code>
      </div>
      <div class="preview-row">
        <span class="preview-label">{{ $t('cron.meaning') }}</span>
        <span class="preview-desc">{{ description }}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">{{ $t('cron.nextRun') }}</span>
        <span class="preview-time">{{ nextRunTimeStr }}</span>
      </div>
    </div>

    <div class="cron-preset-buttons">
      <span class="preset-button-label">{{ $t('cron.quickSelect') }}</span>
      <button
        v-for="quick in quickPresets"
        :key="quick.cron"
        class="quick-btn"
        :class="{ active: modelValue === quick.cron }"
        @click="selectPreset(quick.cron)"
      >
        {{ quick.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@scada-editor/core';

const { t } = useI18n();

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const tabs = computed(() => [
  { key: 'preset', label: t('cron.preset') },
  { key: 'custom', label: t('cron.custom') },
] as const);

const presets = computed(() => [
  { cron: '* * * * *', label: t('cron.presets.everyMinute'), desc: t('cron.presets.everyMinuteDesc') },
  { cron: '*/5 * * * *', label: t('cron.presets.every5Min'), desc: t('cron.presets.every5MinDesc') },
  { cron: '*/15 * * * *', label: t('cron.presets.every15Min'), desc: t('cron.presets.every15MinDesc') },
  { cron: '0 * * * *', label: t('cron.presets.everyHour'), desc: t('cron.presets.everyHourDesc') },
  { cron: '0 */2 * * *', label: t('cron.presets.every2Hours'), desc: t('cron.presets.every2HoursDesc') },
  { cron: '0 0 * * *', label: t('cron.presets.everyDay0'), desc: t('cron.presets.everyDay0Desc') },
  { cron: '0 9 * * *', label: t('cron.presets.everyDay9'), desc: t('cron.presets.everyDay9Desc') },
  { cron: '0 9 * * 1-5', label: t('cron.presets.workday9'), desc: t('cron.presets.workday9Desc') },
  { cron: '0 0 1 * *', label: t('cron.presets.monthly1'), desc: t('cron.presets.monthly1Desc') },
  { cron: '0 0 * * 0', label: t('cron.presets.weeklySun'), desc: t('cron.presets.weeklySunDesc') },
]);

const quickPresets = computed(() => [
  { cron: '*/5 * * * *', label: t('cron.presets.every5Min') },
  { cron: '0 * * * *', label: t('cron.presets.everyHour') },
  { cron: '0 0 * * *', label: t('cron.presets.everyDay0') },
  { cron: '0 9 * * *', label: t('cron.presets.everyDay9') },
  { cron: '0 0 * * 1-5', label: t('cron.workday') },
]);

const monthNames = computed(() => t('cron.months') as unknown as string[]);

const activeTab = ref<string>('preset');

const fields = ref({
  minute: '*',
  hour: '*',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '*',
});

const cronInput = ref(props.modelValue);

const validationError = ref<string | null>(null);

const dayNames = computed(() => [
  t('cron.sunday'),
  t('cron.monday'),
  t('cron.tuesday'),
  t('cron.wednesday'),
  t('cron.thursday'),
  t('cron.friday'),
  t('cron.saturday'),
]);

const description = computed(() => {
  const parts = props.modelValue.split(/\s+/);
  if (parts.length < 5) return t('cron.description.invalid');

  const [m, h, d, mo, dow] = parts;
  const timeStr = `${h}:${m.padStart(2, '0')}`;

  if (m === '*' && h === '*' && d === '*' && mo === '*' && dow === '*') return t('cron.description.everyMinute');
  if (m === '0' && h === '*' && d === '*' && mo === '*' && dow === '*') return t('cron.description.everyHour');

  if (m.includes('/') && h === '*' && d === '*' && mo === '*' && dow === '*') {
    const step = m.split('/')[1];
    return t('cron.description.everyStepMin', { step });
  }

  if (h === '*' && d === '*' && mo === '*' && dow === '*') {
    return t('cron.description.atMinute', { m });
  }

  if (d === '*' && mo === '*' && dow === '*') {
    return t('cron.description.daily', { time: timeStr });
  }

  if (dow !== '*' && d === '*' && mo === '*') {
    if (dow.includes('-')) {
      const [start, end] = dow.split('-');
      return t('cron.description.weeklyRange', { start: dayNames.value[+start], end: dayNames.value[+end], time: timeStr });
    }
    if (dow.includes(',')) {
      const days = dow.split(',').map((d) => dayNames.value[+d]).join(', ');
      return t('cron.description.weeklyDays', { days, time: timeStr });
    }
    return t('cron.description.weekly', { day: dayNames.value[+dow] ?? dow, time: timeStr });
  }

  if (d !== '*' && mo === '*' && dow === '*') {
    return t('cron.description.monthly', { day: d, time: timeStr });
  }

  return props.modelValue;
});

const nextRunTimeStr = computed(() => {
  try {
    const next = getNextRunTime(props.modelValue);
    return new Date(next).toLocaleString('zh-CN');
  } catch {
    return '—';
  }
});

function getNextRunTime(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return Date.now() + 60000;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const from = new Date();
  const next = new Date(from.getTime() + 60000);
  next.setSeconds(0);
  next.setMilliseconds(0);

  const maxIter = 366 * 24 * 60;
  for (let i = 0; i < maxIter; i++) {
    const cm = next.getMinutes();
    const ch = next.getHours();
    const cd = next.getDate();
    const cmo = next.getMonth() + 1;
    const cdow = next.getDay();

    if (
      matchesField(minute, cm) &&
      matchesField(hour, ch) &&
      matchesField(dayOfMonth, cd) &&
      matchesField(month, cmo) &&
      matchesField(dayOfWeek, cdow)
    ) {
      return next.getTime();
    }
    next.setMinutes(next.getMinutes() + 1);
  }
  return Date.now() + 60000;
}

function matchesField(expr: string, value: number): boolean {
  if (expr === '*') return true;
  for (const part of expr.split(',')) {
    if (matchesPart(part.trim(), value)) return true;
  }
  return false;
}

function matchesPart(part: string, value: number): boolean {
  if (part.includes('/')) {
    const [range, stepStr] = part.split('/');
    const step = parseInt(stepStr, 10);
    if (isNaN(step) || step <= 0) return false;
    if (range === '*') return value % step === 0;
    if (range.includes('-')) {
      const [rs, re] = range.split('-').map(Number);
      return value >= rs && value <= re && (value - rs) % step === 0;
    }
    const start = parseInt(range, 10);
    return value >= start && (value - start) % step === 0;
  }
  if (part.includes('-')) {
    const [rs, re] = part.split('-').map(Number);
    return value >= rs && value <= re;
  }
  return value === parseInt(part, 10);
}

function selectPreset(cron: string) {
  emit('update:modelValue', cron);
  cronInput.value = cron;
  parseCronToFields(cron);
}

function onFieldChange() {
  const cron = `${fields.value.minute} ${fields.value.hour} ${fields.value.dayOfMonth} ${fields.value.month} ${fields.value.dayOfWeek}`;
  cronInput.value = cron;
  emit('update:modelValue', cron);
}

function onCronInput() {
  const value = cronInput.value.trim();
  emit('update:modelValue', value);
  validateCron(value);
}

function validateCron(cron: string) {
  const parts = cron.split(/\s+/);
  if (parts.length !== 5) {
    validationError.value = t('cron.validation.invalidFieldCount');
    return;
  }
  if (!/^[0-9,\-*/]+$/.test(parts.join(' ').replace(/\s/g, ''))) {
    validationError.value = t('cron.validation.invalidChars');
    return;
  }
  validationError.value = null;
}

function parseCronToFields(cron: string) {
  const parts = cron.split(/\s+/);
  if (parts.length >= 5) {
    fields.value = {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }
}

// 初始化
parseCronToFields(props.modelValue);
cronInput.value = props.modelValue;

watch(() => props.modelValue, (val) => {
  cronInput.value = val;
  parseCronToFields(val);
});
</script>

<style scoped>
.cron-editor {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
}

.cron-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #334155;
  padding-bottom: 8px;
}

.cron-tab {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.cron-tab:hover {
  color: #e2e8f0;
  background: #334155;
}

.cron-tab.active {
  color: #3b82f6;
  background: #1e3a5f;
}

.cron-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-item:hover {
  border-color: #3b82f6;
  background: #1e3a5f;
}

.preset-item.active {
  border-color: #3b82f6;
  background: #1e3a5f;
}

.preset-label {
  color: #e2e8f0;
  font-weight: 500;
  font-size: 13px;
}

.preset-desc {
  color: #64748b;
  font-size: 11px;
  margin-top: 2px;
}

.cron-custom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cron-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cron-field-label {
  width: 50px;
  color: #94a3b8;
  font-size: 12px;
  text-align: right;
  flex-shrink: 0;
}

.cron-select {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 6px 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
}

.cron-select:focus {
  border-color: #3b82f6;
}

.cron-expression {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.cron-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 6px 10px;
  color: #e2e8f0;
  font-size: 14px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  outline: none;
  letter-spacing: 1px;
}

.cron-input:focus {
  border-color: #3b82f6;
}

.cron-input.invalid {
  border-color: #ef4444;
}

.cron-error {
  width: 100%;
  color: #ef4444;
  font-size: 11px;
  margin-top: 2px;
}

.cron-preview {
  margin-top: 12px;
  padding: 10px;
  background: #0f172a;
  border-radius: 6px;
  border: 1px solid #334155;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 4px;
}

.preview-row:last-child {
  margin-bottom: 0;
}

.preview-label {
  color: #64748b;
  flex-shrink: 0;
}

.preview-code {
  color: #4fc1ff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: #1e293b;
  padding: 1px 6px;
  border-radius: 3px;
}

.preview-desc {
  color: #94a3b8;
}

.preview-time {
  color: #22c55e;
}

.cron-preset-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #334155;
}

.preset-button-label {
  color: #64748b;
  font-size: 12px;
  margin-right: 2px;
}

.quick-btn {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 3px 10px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover {
  border-color: #3b82f6;
  color: #e2e8f0;
}

.quick-btn.active {
  border-color: #3b82f6;
  background: #1e3a5f;
  color: #3b82f6;
}
</style>