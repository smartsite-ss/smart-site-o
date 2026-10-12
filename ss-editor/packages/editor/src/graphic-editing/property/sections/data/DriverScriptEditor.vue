<template>
  <div class="driver-script-editor">
    <div class="editor-header">
      <span class="hint-text">
        {{ $t('dataPanel.availableVariables') }}: <code>data</code>(过滤结果), <code>context</code>({ tagId, graphicId, ... }), <code>api</code>(数据驱动 API)
      </span>
      <div class="btn-row">
        <div
          ref="dropdownRef"
          class="dropdown"
          :class="{ open: dropdownOpen }"
        >
          <button
            type="button"
            class="ds-btn ds-btn--xs"
            @click.stop="toggleDropdown"
          >
            {{ $t('dataPanel.loadTemplate') }}
          </button>
          <div class="dropdown-menu">
            <div
              v-for="opt in templateOptions"
              :key="opt.key"
              class="dropdown-item"
              @click="selectTemplate(opt.key)"
            >
              {{ opt.label }}
            </div>
          </div>
        </div>
        <button
          type="button"
          class="ds-btn ds-btn--xs"
          @click="formatScript"
        >
          {{ $t('dataPanel.format') }}
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--xs ds-btn--primary"
          @click="testRun"
        >
          {{ $t('dataPanel.testRun') }}
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--xs"
          :class="{ active: showApiRef }"
          @click="showApiRef = !showApiRef"
        >
          {{ $t('dataPanel.apiReference') }}
        </button>
      </div>
    </div>

    <div class="code-block">
      <textarea
        v-model="scriptCode"
        class="code-body"
        rows="6"
        spellcheck="false"
        :placeholder="placeholderText"
        @input="onScriptChange"
      />
    </div>

    <div class="execution-status-bar">
      <template v-if="testResult">
        <span class="execution-time">{{ $t('dataPanel.lastExecution') }}: {{ testResult.time }}</span>
        <span> | {{ $t('dataPanel.elapsed') }}: {{ testResult.elapsed }}ms</span>
        <span> | </span>
        <span :class="testResult.success ? 'status-ok' : 'status-fail'">
          {{ testResult.success ? $t('dataPanel.success') : $t('dataPanel.failed') }}
        </span>
        <span
          v-if="testResult.error"
          class="status-error-msg"
        >{{ testResult.error }}</span>
      </template>
      <template v-else>
        <span class="execution-idle">{{ $t('dataPanel.readyClickTestRun') }}</span>
      </template>
    </div>

    <div
      v-if="showApiRef"
      class="api-reference-collapse"
    >
      <ScriptApiReference />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { i18n } from '@scada-editor/core';
import ScriptApiReference from './driver/ScriptApiReference.vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const scriptCode = ref(props.modelValue);

const showApiRef = ref(false);

const placeholderText = `// ${i18n.global.t('dataPanel.driverScriptHint1')}
// data: ${i18n.global.t('dataPanel.driverScriptHint2')} { number, unit, color, text, raw }
// context: { tagId, tagName, graphicId, graphicName }
// api: 数据驱动 API

// ${i18n.global.t('dataPanel.driverScriptHint3')}
api.setText(data.text);
api.setBackground(data.color);

// ${i18n.global.t('dataPanel.driverScriptHint4')}
if (data.number > 80) {
  api.triggerAlarm('critical', '温度过高!');
  api.showGraphic('alarm_light_01');
}`;

const testResult = ref<{
  time: string;
  elapsed: number;
  success: boolean;
  error?: string;
} | null>(null);

const dropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const templateOptions = [
  { label: i18n.global.t('dataPanel.templateValueToColor'), key: 'value-to-color' },
  { label: i18n.global.t('dataPanel.templateValueToText'), key: 'value-to-text' },
  { label: i18n.global.t('dataPanel.templateAlarmCheck'), key: 'alarm-check' },
  { label: i18n.global.t('dataPanel.templateGraphicLinkage'), key: 'graphic-linkage' },
  { label: i18n.global.t('dataPanel.templatePostProcess'), key: 'post-process' },
  { label: i18n.global.t('dataPanel.templateMultiTag'), key: 'multi-tag' },
];

const templates: Record<string, string> = {
  'value-to-color': `// 根据数值范围切换颜色
api.setText(data.text);
api.setBackground(data.color);
api.setFontColor(data.number > 50 ? '#ffffff' : '#333333');`,

  'value-to-text': `// 数值格式化 + 单位拼接
api.setText(data.number.toFixed(2) + ' ' + data.unit);
api.setBackground(data.color);`,

  'alarm-check': `// 超过阈值触发告警
if (data.number > 80) {
  api.triggerAlarm('critical', '值超过80!');
  api.showGraphic('alarm_light_01');
} else if (data.number > 50) {
  api.triggerAlarm('warning', '值超过50');
  api.hideGraphic('alarm_light_01');
} else {
  api.clearAlarm('');
  api.hideGraphic('alarm_light_01');
}
api.setText(data.text);
api.setBackground(data.color);`,

  'graphic-linkage': `// 切换其它图元显隐
if (data.number > 0) {
  api.showGraphic('running_indicator');
  api.hideGraphic('stopped_indicator');
} else {
  api.hideGraphic('running_indicator');
  api.showGraphic('stopped_indicator');
}
api.setText(data.text);`,

  'post-process': `// 数据处理后写入日志
api.setText(data.text);
api.setBackground(data.color);

api.httpPost('/api/log', {
  tagId: context.tagId,
  value: data.number,
  unit: data.unit,
  timestamp: Date.now()
});`,

  'multi-tag': `// 交叉比较多个变量
const tag2 = api.readTag('tag_002');
if (tag2 && data.number > tag2.value) {
  api.setBackground('#d03050');
  api.triggerAlarm('warning', '差值超过基准');
} else {
  api.setBackground(data.color);
}
api.setText(data.text);`,
};

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

function onDocumentClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false;
  }
}

function selectTemplate(key: string) {
  dropdownOpen.value = false;
  loadTemplate(key);
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

watch(
  () => props.modelValue,
  (val) => {
    if (val !== scriptCode.value) {
      scriptCode.value = val;
    }
  },
);

function onScriptChange() {
  emit('update:modelValue', scriptCode.value);
}

function loadTemplate(key: string) {
  const template = templates[key];
  if (template) {
    scriptCode.value = template;
    emit('update:modelValue', scriptCode.value);
  }
}

function formatScript() {
  const lines = scriptCode.value.split('\n');
  let indent = 0;
  const formatted = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed === '') return '';
    if (trimmed === '}' || trimmed === '};' || trimmed.startsWith('}')) {
      indent = Math.max(0, indent - 1);
    }
    const result = '  '.repeat(indent) + trimmed;
    if (trimmed.endsWith('{') || trimmed.endsWith('({')) {
      indent++;
    }
    return result;
  });
  scriptCode.value = formatted.join('\n');
  emit('update:modelValue', scriptCode.value);
}

function testRun() {
  if (!scriptCode.value.trim()) {
    testResult.value = {
      time: new Date().toLocaleTimeString(),
      elapsed: 0,
      success: false,
      error: i18n.global.t('dataPanel.scriptEmpty'),
    };
    return;
  }

  const start = performance.now();
  try {
    const mockApi = createMockApi();
    const mockData = { number: 25.5, unit: '℃', color: '#18a058', text: '25.5℃', raw: 25.5 };
    const mockContext = { tagId: 'tag_001', tagName: '温度传感器1', graphicId: 'btn_01', graphicName: '温度按钮' };

    const fn = new Function('data', 'context', 'api', scriptCode.value);
    fn(mockData, mockContext, mockApi);

    testResult.value = {
      time: new Date().toLocaleTimeString(),
      elapsed: Math.round(performance.now() - start),
      success: true,
    };
  } catch (e: any) {
    testResult.value = {
      time: new Date().toLocaleTimeString(),
      elapsed: Math.round(performance.now() - start),
      success: false,
      error: e.message,
    };
  }
}

function createMockApi() {
  const logs: string[] = [];
  return {
    setText: (v: string) => logs.push(`setText("${v}")`),
    setBackground: (c: string) => logs.push(`setBackground("${c}")`),
    setVisible: (b: boolean) => logs.push(`setVisible(${b})`),
    setBorder: (c: string, w?: number) => logs.push(`setBorder("${c}", ${w})`),
    setFontSize: (n: number) => logs.push(`setFontSize(${n})`),
    setFontColor: (c: string) => logs.push(`setFontColor("${c}")`),
    setRotation: (d: number) => logs.push(`setRotation(${d})`),
    setOpacity: (v: number) => logs.push(`setOpacity(${v})`),
    setPosition: (x: number, y: number) => logs.push(`setPosition(${x}, ${y})`),
    setSize: (w: number, h: number) => logs.push(`setSize(${w}, ${h})`),
    showGraphic: (id: string) => logs.push(`showGraphic("${id}")`),
    hideGraphic: (id: string) => logs.push(`hideGraphic("${id}")`),
    setGraphicProps: (id: string, _p: any) => logs.push(`setGraphicProps("${id}", ...)`),
    getGraphicProperty: (_id: string, _p: string) => null,
    triggerAlarm: (l: string, m: string) => logs.push(`triggerAlarm("${l}", "${m}")`),
    clearAlarm: (id: string) => logs.push(`clearAlarm("${id}")`),
    getActiveAlarms: () => [],
    readTag: (_id: string) => ({ value: 30, quality: 'good', timestamp: Date.now() }),
    writeTag: (id: string, v: any) => logs.push(`writeTag("${id}", ${v})`),
    httpGet: (_url: string) => Promise.resolve({ ok: true }),
    httpPost: (_url: string, _d: any) => Promise.resolve({ ok: true }),
    setTimeout: (_cb: (...args: any[]) => any, _d: number) => 0,
    setInterval: (_cb: (...args: any[]) => any, _i: number) => 0,
    clearTimeout: (_id: number) => {},
    clearInterval: (_id: number) => {},
    Math,
    round: (v: number, d?: number) => Number(v.toFixed(d ?? 0)),
    clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    mapRange: (v: number, i1: number, i2: number, o1: number, o2: number) => (v - i1) / (i2 - i1) * (o2 - o1) + o1,
    colorForValue: (v: number, min: number, max: number) => {
      const r = (v - min) / (max - min);
      if (r < 0.5) return `hsl(${120 - r * 120}, 80%, 45%)`;
      return `hsl(${60 - (r - 0.5) * 60}, 80%, 45%)`;
    },
    formatNumber: (v: number, d?: number) => Number(v).toFixed(d ?? 1),
    log: (...args: any[]) => logs.push(`log: ${args.join(' ')}`),
  };
}
</script>

<style scoped>
@import '../../../../panels/styles/data-panel-theme.scss';

.driver-script-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.hint-text {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.hint-text code {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10.5px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.btn-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  display: none;
  position: absolute;
  z-index: 100;
  top: calc(100% + 4px);
  left: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow:
    0 4px 12px -2px rgba(0, 0, 0, 0.12),
    0 2px 6px -1px rgba(0, 0, 0, 0.06);
}

.dropdown.open .dropdown-menu {
  display: block;
  animation: dropdown-fade-in 0.12s ease-out;
}

@keyframes dropdown-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  padding: 7px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  color: var(--text);

  &:hover {
    background: color-mix(in srgb, var(--primary) 6%, transparent);
    color: var(--primary);
  }
}

.code-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.code-body {
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 0;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  resize: vertical;
  min-height: 80px;
  background: var(--surface);
  color: var(--text);
  tab-size: 2;

  &:focus {
    background: color-mix(in srgb, var(--primary) 2%, var(--surface));
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary) 8%, transparent);
  }

  &::placeholder {
    color: var(--text-tertiary);
    opacity: 0.6;
  }
}

.execution-status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--background) 80%, transparent), color-mix(in srgb, var(--background) 50%, transparent));
  border-radius: 6px;
  border: 1px solid var(--border);
  line-height: 1.5;
}

.execution-time,
.execution-idle {
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.status-ok {
  color: #10b981;
  font-weight: 600;
}

.status-fail {
  color: #ef4444;
  font-weight: 600;
}

.status-error-msg {
  color: #ef4444;
  margin-left: 6px;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-reference-collapse {
  margin-top: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}
</style>