<template>
  <div
    v-if="visible"
    class="alarm-data-overlay"
    @click.self="handleClose"
  >
    <div class="alarm-data-container">
      <!-- 头部 -->
      <div class="dialog-header">
        <div class="header-left">
          <span class="alarm-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <h2 class="dialog-title">
            {{ $t('system.alarmData.title') }}
          </h2>
        </div>
        <div class="header-right">
          <button
            class="dialog-close"
            :title="$t('common.close')"
            @click="handleClose"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
              /><line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 告警信息条 -->
      <div class="alarm-info-bar">
        <div class="info-chip">
          <span class="chip-label">{{ $t('system.alarmData.device') }}</span>
          <span class="chip-value">{{ deviceName || '-' }}</span>
        </div>
        <div class="info-divider" />
        <div class="info-chip">
          <span class="chip-label">{{ $t('system.alarmData.tag') }}</span>
          <span class="chip-value">{{ tagName || tagId }}</span>
        </div>
        <div class="info-divider" />
        <div class="info-chip">
          <span class="chip-label">{{ $t('system.alarmData.triggerTime') }}</span>
          <span class="chip-value">{{ formatTime(alarmTime) }}</span>
        </div>
        <div class="info-divider" />
        <div class="info-chip">
          <span class="chip-label">{{ $t('system.alarmData.triggerValue') }}</span>
          <span class="chip-value trigger-value">{{ formatNum(triggerValue) }}</span>
        </div>
        <div class="info-divider" />
        <div class="info-chip">
          <span class="chip-label">{{ $t('system.alarmData.level') }}</span>
          <span
            class="level-tag"
            :class="'level-' + level"
          >{{ levelLabel(level) }}</span>
        </div>
        <template v-if="acknowledgedAt">
          <div class="info-divider" />
          <div class="info-chip">
            <span class="chip-label">{{ $t('system.alarmData.acknowledgedAt') }}</span>
            <span class="chip-value ack-value">{{ formatTime(acknowledgedAt) }}</span>
          </div>
        </template>
        <template v-if="recoveredAt">
          <div class="info-divider" />
          <div class="info-chip">
            <span class="chip-label">{{ $t('system.alarmData.recoveredAt') }}</span>
            <span class="chip-value recovered-value">{{ formatTime(recoveredAt) }}</span>
          </div>
          <div class="info-divider" />
          <div class="info-chip">
            <span class="chip-label">{{ $t('system.alarms.recoveredValue') }}</span>
            <span class="chip-value recovered-value">{{ formatNum(recoveredValue) }}</span>
          </div>
        </template>
      </div>

      <!-- 时间窗口 + 按钮 -->
      <div class="time-window-control">
        <div class="window-config">
          <label>{{ $t('system.alarmData.before') }}</label>
          <select
            v-model.number="beforeMinutes"
            class="form-select-sm"
            @change="queryAlarmData"
          >
            <option
              v-for="m in windowOptions"
              :key="'b'+m"
              :value="m"
            >
              {{ formatWindow(m) }}
            </option>
          </select>
          <label>{{ $t('system.alarmData.after') }}</label>
          <select
            v-model.number="afterMinutes"
            class="form-select-sm"
            @change="queryAlarmData"
          >
            <option
              v-for="m in windowOptions"
              :key="'a'+m"
              :value="m"
            >
              {{ formatWindow(m) }}
            </option>
          </select>
        </div>
        <div class="window-actions">
          <div class="view-toggle">
            <button
              class="view-toggle-btn"
              :class="{ active: viewMode === 'trend' }"
              @click="viewMode = 'trend'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {{ $t('system.alarmData.viewTrend') }}
            </button>
            <button
              class="view-toggle-btn"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  ry="2"
                />
                <line
                  x1="3"
                  y1="9"
                  x2="21"
                  y2="9"
                /><line
                  x1="3"
                  y1="15"
                  x2="21"
                  y2="15"
                /><line
                  x1="9"
                  y1="3"
                  x2="9"
                  y2="21"
                />
              </svg>
              {{ $t('system.alarmData.viewTable') }}
            </button>
          </div>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="queryLoading"
            @click="queryAlarmData"
          >
            {{ $t('system.alarmData.refresh') }}
          </button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="dialog-body">
        <template v-if="queryLoading">
          <div class="loading-state">
            {{ $t('system.alarmData.loading') }}
          </div>
        </template>
        <template v-else-if="!hasData">
          <div class="empty-state">
            {{ $t('system.alarmData.noData') }}
          </div>
        </template>
        <template v-else>
          <!-- 趋势视图 -->
          <div
            v-if="viewMode === 'trend'"
            class="trend-view"
          >
            <div class="chart-area">
              <canvas
                ref="chartCanvas"
                class="trend-canvas"
                @dblclick="resetZoom"
              />
            </div>
            <div class="threshold-legend">
              <div
                v-if="thresholdUpper !== null"
                class="legend-item"
              >
                <span class="legend-line upper-line" />{{ $t('system.alarmData.upperLimit') }}: {{ formatNum(thresholdUpper) }}
              </div>
              <div
                v-if="thresholdLower !== null"
                class="legend-item"
              >
                <span class="legend-line lower-line" />{{ $t('system.alarmData.lowerLimit') }}: {{ formatNum(thresholdLower) }}
              </div>
              <div class="legend-item">
                <span class="legend-dot alarm-dot" />{{ $t('system.alarmData.alarmPoint') }}
              </div>
              <div
                v-if="acknowledgedAt"
                class="legend-item"
              >
                <span class="legend-dot ack-dot" />{{ $t('system.alarmData.ackPoint') }}
              </div>
              <div
                v-if="recoveredAt"
                class="legend-item"
              >
                <span class="legend-dot recovery-dot" />{{ $t('system.alarmData.recoveryPoint') }}
              </div>
            </div>
          </div>
          <!-- 表格视图 -->
          <div
            v-else
            class="table-view"
          >
            <div class="data-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="num-col">
                      #
                    </th>
                    <th>{{ $t('system.alarmData.timestamp') }}</th>
                    <th class="num-col">
                      {{ $t('system.alarmData.value') }}
                    </th>
                    <th class="center-col">
                      {{ $t('system.alarmData.status') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, idx) in tableData"
                    :key="idx"
                    :class="{ 'alarm-row': item.isAlarmPoint }"
                  >
                    <td class="num-col idx-col">
                      <span
                        v-if="item.isAlarmPoint"
                        class="alarm-dot-inline"
                      />
                      {{ idx + 1 }}
                    </td>
                    <td class="mono td-time">
                      {{ formatTime(item.timestamp) }}
                    </td>
                    <td class="num-col">
                      <span class="value-badge">{{ formatNum(item.value) }}</span>
                    </td>
                    <td class="center-col">
                      <span
                        v-if="item.isAlarmPoint"
                        class="alarm-badge"
                      >{{ $t('system.alarmData.triggered') }}</span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { dataQueryApi } from '../../../api/modules/data-query.api';

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  alarmTime: string;
  triggerValue: number | string;
  tagId: string;
  tagName?: string;
  deviceId?: string;
  deviceName?: string;
  projectId: string;
  ruleName?: string;
  level: string;
  message?: string;
  condition?: string;
  conditionValue?: string;
  acknowledgedAt?: string;
  recoveredAt?: string;
  recoveredValue?: number | string;
  clearReason?: string;
}>();

const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>();

const windowOptions = [5, 10, 20, 30, 60, 120, 240, 360, 720, 1440, 2880, 4320];
const beforeMinutes = ref(5);
const afterMinutes = ref(5);

/** 将分钟数格式化为友好显示：5min / 30min / 1h / 2h / 1.5h */
function formatWindow(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}
const viewMode = ref<'trend' | 'table'>('trend');
const queryLoading = ref(false);
const hasData = ref(false);
const historyData = ref<Array<{ value: number | null; timestamp: string }>>([]);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const zoomRange = ref<{ start: number; end: number } | null>(null);

const thresholdUpper = computed(() => getThresholdUpper());
const thresholdLower = computed(() => getThresholdLower());

// 调试：打印阈值解析结果
if (import.meta.env.DEV) {
  watch([() => props.condition, () => props.conditionValue, () => props.message], ([c, cv, _msg]) => {
    const fromMsg = c ? null : parseThresholdFromMessage();
    console.log('[AlarmDataDialog] condition:', c, 'conditionValue:', cv,
      '| fromRule→ upper:', thresholdUpper.value, 'lower:', thresholdLower.value,
      '| fromMsg→', fromMsg);
  });
}
const tableData = computed(() =>
  historyData.value.map((item) => ({
    ...item,
    isAlarmPoint: isNearAlarmTime(item.timestamp),
  })),
);

function alarmTimeMs(): number { return new Date(props.alarmTime).getTime(); }
function isNearAlarmTime(ts: string): boolean { return Math.abs(new Date(ts).getTime() - alarmTimeMs()) <= 3000; }
function formatTime(d?: string): string { if (!d) return '-'; return new Date(d).toLocaleString('zh-CN'); }
function formatNum(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '-';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  return Number.isInteger(num) ? String(num) : num.toFixed(3);
}
function levelLabel(l: string): string {
  const labels: Record<string, string> = {
    info: t('system.alarms.levelInfo'), warning: t('system.alarms.levelWarning'),
    error: t('system.alarms.levelError'), critical: t('system.alarms.levelCritical'),
  };
  return labels[l] || l;
}

// 阈值解析
function parseConditionValues(): number[] {
  if (!props.condition || !props.conditionValue) return [];
  try {
    const raw = typeof props.conditionValue === 'string' ? JSON.parse(props.conditionValue) : props.conditionValue;
    if (Array.isArray(raw)) return raw.map(Number).filter((n) => !isNaN(n));
    const num = Number(raw);
    return isNaN(num) ? [] : [num];
  } catch { const num = Number(props.conditionValue); return isNaN(num) ? [] : [num]; }
}

/**
 * 从告警消息中解析阈值（rule 不存在时的 fallback）
 * 消息格式示例：
 *   "[警告] Controller_Status 超过上限 55，当前值: 56.07"  →  55
 *   "[警告] Controller_Status 低于下限 30，当前值: 28.5"   →  30
 *   仅支持 "超过上限 N" / "低于下限 N" / "超过 N" / "低于 N" 四种模式
 */
function parseThresholdFromMessage(): { upper: number | null; lower: number | null } {
  const msg = props.message || '';
  const upperMatch = msg.match(/超过上限[^\d]*([\d]+(?:\.[\d]+)?)/);
  const lowerMatch = msg.match(/低于下限[^\d]*([\d]+(?:\.[\d]+)?)/);
  const overMatch = msg.match(/超过[^\d]*([\d]+(?:\.[\d]+)?)/);
  const underMatch = msg.match(/低于[^\d]*([\d]+(?:\.[\d]+)?)/);
  
  if (upperMatch) return { upper: Number(upperMatch[1]), lower: null };
  if (lowerMatch) return { upper: null, lower: Number(lowerMatch[1]) };
  if (overMatch) return { upper: Number(overMatch[1]), lower: null };
  if (underMatch) return { upper: null, lower: Number(underMatch[1]) };
  return { upper: null, lower: null };
}

function getThresholdUpper(): number | null {
  const vals = parseConditionValues();
  const cond = props.condition;
  // gt/gte: 值超过阈值时告警 → 此阈值即上限线
  if (cond === 'gt' || cond === 'gte') return vals[0] ?? null;
  // eq/neq: 参照线
  if (cond === 'eq' || cond === 'neq') return vals[0] ?? null;
  // range_in/range_out: 区间上界
  if (cond === 'range_in' || cond === 'range_out') return vals.length >= 2 ? Math.max(...vals) : null;
  // 无 rule 时从消息解析
  if (!cond) {
    const msg = parseThresholdFromMessage();
    return msg.upper;
  }
  return null;
}
function getThresholdLower(): number | null {
  const vals = parseConditionValues();
  const cond = props.condition;
  // lt/lte: 值低于阈值时告警 → 此阈值即下限线
  if (cond === 'lt' || cond === 'lte') return vals[0] ?? null;
  // eq/neq: 参照线
  if (cond === 'eq' || cond === 'neq') return vals[0] ?? null;
  // range_in/range_out: 区间下界
  if (cond === 'range_in' || cond === 'range_out') return vals.length >= 2 ? Math.min(...vals) : null;
  // 无 rule 时从消息解析
  if (!cond) {
    const msg = parseThresholdFromMessage();
    return msg.lower;
  }
  return null;
}

async function queryAlarmData() {
  if (!props.tagId || !props.projectId) return;
  queryLoading.value = true;
  try {
    const alarmMs = alarmTimeMs();
    const startMs = alarmMs - beforeMinutes.value * 60_000;
    const endMs = Math.min(alarmMs + afterMinutes.value * 60_000, Date.now());
    // POST /data/trend/query — TransformInterceptor 通过 pagination 模式已扁平化响应：
    //   { code, data: [...pages], pagination: { total }, message }
    // dataQueryApi.queryTrend() 剥离 code 层 → { data: [...pages], pagination: { total } }
    const res = await dataQueryApi.queryTrend({
      tagIds: [props.tagId],
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      maxPoints: 2000,
      projectId: props.projectId,
      interpolation: 'raw',
    });
    const pages = (res as any)?.data ?? [];
    console.log('[AlarmDataDialog] raw pages:', pages.length, 'first page data:', pages[0]?.data?.length);
    if (pages.length) {
      historyData.value = (pages[0]?.data || []).map((d: any) => ({
        timestamp: d.timestamp,
        value: d.value,
      }));
      hasData.value = historyData.value.length > 0;
      console.log('[AlarmDataDialog] historyData populated:', historyData.value.length, 'hasData:', hasData.value);
    } else { historyData.value = []; hasData.value = false; }
    zoomRange.value = null;
    await nextTick();
    // rAF 确保浏览器完成 layout 后再读取 canvas 尺寸
    requestAnimationFrame(() => drawChart());
  } catch { historyData.value = []; hasData.value = false; }
  finally { queryLoading.value = false; }
}

function readThemeVar(el: Element | null, name: string): string {
  return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
}
function resetZoom() { zoomRange.value = null; nextTick(drawChart); }

/** 从历史数据中查找最接近指定时间戳的数据点 */
function findNearestDataPoint(ts: number): { value: number; timestamp: string } | null {
  const data = historyData.value.filter((d) => d.value !== null && d.value !== undefined);
  if (!data.length) return null;
  let nearest = data[0];
  let minDiff = Math.abs(new Date(data[0].timestamp).getTime() - ts);
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(new Date(data[i].timestamp).getTime() - ts);
    if (diff < minDiff) { minDiff = diff; nearest = data[i]; }
  }
  return nearest as { value: number; timestamp: string };
}

function drawChart() {
  const canvas = chartCanvas.value;
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  // 确保最小尺寸：父容器可能尚未完成 flex layout，rect 为 0 时用 CSS 规定高度兜底
  const w = Math.max(rect.width || 800, 400) * dpr;
  const h = Math.max(rect.height || 400, 200) * dpr;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = (w / dpr) + 'px';
  canvas.style.height = (h / dpr) + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const m = { top: 20, right: 40, bottom: 50, left: 70 };
  const pw = w - m.left * dpr - m.right * dpr;
  const ph = h - m.top * dpr - m.bottom * dpr;
  ctx.clearRect(0, 0, w, h);

  const data = historyData.value.filter((d) => d.value !== null && d.value !== undefined);
  if (!data.length) return;

  const allTs = data.map((d) => new Date(d.timestamp).getTime());
  let xMin = zoomRange.value ? zoomRange.value.start : Math.min(...allTs);
  let xMax = zoomRange.value ? zoomRange.value.end : Math.max(...allTs);
  const xRange = xMax - xMin || 1;
  const allVals = data.map((d) => d.value as number);
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  if (thresholdUpper.value !== null) { yMax = Math.max(yMax, thresholdUpper.value * 1.05); yMin = Math.min(yMin, thresholdUpper.value * 0.95); }
  if (thresholdLower.value !== null) { yMax = Math.max(yMax, thresholdLower.value * 1.05); yMin = Math.min(yMin, thresholdLower.value * 0.95); }
  const yPad = (yMax - yMin || 1) * 0.1;
  const yDMin = yMin - yPad;
  const yDMax = yMax + yPad;
  const yDRng = yDMax - yDMin;

  const toX = (t: number) => m.left + ((t - xMin) / xRange) * pw;
  const toY = (v: number) => m.top + ph - ((v - yDMin) / yDRng) * ph;

  const borderColor = readThemeVar(canvas, '--border');
  const textSec = readThemeVar(canvas, '--text-secondary');
  const primaryClr = readThemeVar(canvas, '--primary');
  const errClr = readThemeVar(canvas, '--status-error') || '#ef4444';
  const warnClr = readThemeVar(canvas, '--status-warning') || '#f59e0b';
  const surfClr = readThemeVar(canvas, '--surface');

  // 网格
  ctx.strokeStyle = borderColor; ctx.lineWidth = 0.5 * dpr;
  for (let i = 0; i <= 5; i++) {
    const y = m.top + (ph / 5) * i;
    ctx.beginPath(); ctx.moveTo(m.left, y); ctx.lineTo(w - m.right, y); ctx.stroke();
    const val = yDMin + ((ph - (y - m.top)) / ph) * yDRng;
    ctx.fillStyle = textSec; ctx.font = `${10 * dpr}px sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(Number.isInteger(val) ? String(val) : val.toFixed(1), m.left - 6, y);
  }

  // 阈值线
  const drawTh = (val: number, color: string, label: string) => {
    const y = toY(val);
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1 * dpr; ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(m.left, y); ctx.lineTo(w - m.right, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color; ctx.font = `bold ${10 * dpr}px sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, w - m.right - 4, y - 4);
    ctx.restore();
  };
  if (thresholdLower.value !== null) drawTh(thresholdLower.value, warnClr, `L:${formatNum(thresholdLower.value)}`);
  if (thresholdUpper.value !== null) drawTh(thresholdUpper.value, errClr, `H:${formatNum(thresholdUpper.value)}`);

  // 曲线
  ctx.strokeStyle = primaryClr; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = toX(new Date(data[i].timestamp).getTime());
    const y = toY(data[i].value as number);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 事件标注（告警开始 / 人工确认 / 恢复）
  const ackClr = readThemeVar(canvas, '--status-info') || '#3b82f6';
  const recClr = readThemeVar(canvas, '--status-success') || '#22c55e';

  /**
   * 在趋势图上标注事件点：垂直虚线 + 圆点 + 顶部标签
   * @param ts 事件时间戳(ms)
   * @param val 事件值(null 时从历史数据查找最近点)
   * @param color 标注颜色
   * @param label 顶部标签
   */
  const drawEventMarker = (ts: number, val: number | null, color: string, label: string) => {
    if (isNaN(ts)) return;
    const x = toX(ts);
    if (x < m.left || x > w - m.right) return;
    // 值缺失时从历史数据查找最近点
    if (val === null) {
      const nearest = findNearestDataPoint(ts);
      if (nearest) val = nearest.value;
    }
    // 垂直虚线
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1 * dpr; ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(x, m.top); ctx.lineTo(x, m.top + ph); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // 圆点 + 光环（有值时才画）
    if (val !== null && !isNaN(val)) {
      const y = toY(val);
      ctx.beginPath(); ctx.arc(x, y, 6 * dpr, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = surfClr; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 10 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 1 * dpr; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // 顶部标签
    ctx.save();
    ctx.fillStyle = color; ctx.font = `bold ${10 * dpr}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, x, m.top + 2);
    ctx.restore();
  };

  // 1) 告警开始（红色）
  const alarmMs = alarmTimeMs();
  const tvNum = typeof props.triggerValue === 'string' ? parseFloat(props.triggerValue) : Number(props.triggerValue);
  drawEventMarker(alarmMs, isNaN(tvNum) ? null : tvNum, errClr, t('system.alarmData.triggered'));

  // 2) 人工确认（蓝色，值从历史数据最近点获取）
  if (props.acknowledgedAt) {
    const ackMs = new Date(props.acknowledgedAt).getTime();
    drawEventMarker(ackMs, null, ackClr, t('system.alarmData.ackPoint'));
  }

  // 3) 恢复（绿色，优先用 recoveredValue，缺失时从历史数据查找）
  if (props.recoveredAt) {
    const recMs = new Date(props.recoveredAt).getTime();
    const recVal = props.recoveredValue != null && props.recoveredValue !== ''
      ? (typeof props.recoveredValue === 'string' ? parseFloat(props.recoveredValue) : Number(props.recoveredValue))
      : null;
    drawEventMarker(recMs, isNaN(recMs) ? null : recVal, recClr, t('system.alarmData.recoveryPoint'));
  }

  // X 轴
  ctx.fillStyle = textSec; ctx.font = `${10 * dpr}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const ts = xMin + (xRange / 4) * i;
    const x = toX(ts);
    if (x >= m.left && x <= w - m.right) {
      const d = new Date(ts);
      ctx.fillText(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, x, m.top + ph + 6);
    }
  }
}

function setupResize() {
  if (resizeObserver) return;
  const el = chartCanvas.value?.parentElement;
  if (!el) return;
  resizeObserver = new ResizeObserver(() => { nextTick(drawChart); });
  resizeObserver.observe(el);
}

function handleClose() { emit('update:visible', false); }

watch(() => props.visible, async (v) => {
  if (v) { await nextTick(); setupResize(); queryAlarmData(); }
  else { zoomRange.value = null; historyData.value = []; hasData.value = false; }
});

onUnmounted(() => { resizeObserver?.disconnect(); resizeObserver = null; });
</script>

<style scoped>
.alarm-data-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 24px; }
.alarm-data-container { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 100%; max-width: 1200px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 8px; }
.alarm-icon { color: var(--status-error); display: flex; }
.dialog-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.dialog-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.dialog-close:hover { background: var(--border); color: var(--text); }
.alarm-info-bar { display: flex; align-items: center; padding: 10px 20px; background: color-mix(in srgb, var(--status-error) 6%, var(--surface)); border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
.info-chip { display: flex; align-items: center; gap: 6px; padding: 0 12px; }
.chip-label { font-size: 12px; color: var(--text-secondary); }
.chip-value { font-size: 13px; color: var(--text); font-family: monospace; }
.trigger-value { color: var(--status-error); font-weight: 600; }
.ack-value { color: var(--status-info, #3b82f6); }
.recovered-value { color: var(--status-success, #22c55e); font-weight: 600; }
.info-divider { width: 1px; height: 16px; background: var(--border); }
.level-tag { padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.level-info { background: color-mix(in srgb, var(--status-info, #3b82f6) 15%, transparent); color: var(--status-info, #3b82f6); }
.level-warning { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #f59e0b; }
.level-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.level-critical { background: color-mix(in srgb, var(--status-error) 25%, transparent); color: var(--status-error); }
.time-window-control { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 16px; }
.window-config { display: flex; align-items: center; gap: 8px; }
.window-config label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.form-select-sm { padding: 2px 6px; font-size: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); color: var(--text); min-width: 56px; }
.window-actions { display: flex; align-items: center; gap: 12px; }
.view-toggle { display: flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.view-toggle-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: none; background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.view-toggle-btn.active { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.view-toggle-btn:hover:not(.active) { background: var(--border); }
.dialog-body { flex: 1; overflow: auto; padding: 16px 20px; min-height: 300px; }
.loading-state, .empty-state { display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-secondary); }
.trend-view { display: flex; flex-direction: column; gap: 8px; }
.chart-area { position: relative; height: 400px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--surface); }
.trend-canvas { width: 100%; height: 100%; cursor: crosshair; }
.threshold-legend { display: flex; align-items: center; gap: 20px; padding: 4px 0; font-size: 12px; color: var(--text-secondary); }
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-line { width: 20px; height: 0; border-top: 2px dashed; }
.upper-line { border-color: var(--status-error); }
.lower-line { border-color: #f59e0b; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.alarm-dot { background: var(--status-error); }
.ack-dot { background: var(--status-info, #3b82f6); }
.recovery-dot { background: var(--status-success, #22c55e); }
.table-view { max-height: 500px; }
.data-table-wrapper { max-height: 500px; overflow: auto; border: 1px solid var(--border); border-radius: 8px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { position: sticky; top: 0; background: var(--surface); border-bottom: 2px solid var(--border); padding: 10px 12px; font-weight: 600; color: var(--text-secondary); text-align: left; z-index: 1; }
.data-table td { padding: 6px 12px; border-bottom: 1px solid var(--border); color: var(--text); white-space: nowrap; }
.data-table .num-col { text-align: right; }
.data-table .center-col { text-align: center; }
.data-table .alarm-row { background: color-mix(in srgb, var(--status-error) 8%, transparent); }
.data-table .alarm-row td { color: var(--status-error); font-weight: 500; }
.data-table .alarm-row:hover { background: color-mix(in srgb, var(--status-error) 15%, transparent); }
.idx-col { width: 48px; }
.alarm-dot-inline { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--status-error); margin-right: 4px; vertical-align: middle; }
.value-badge { font-family: monospace; }
.alarm-badge { display: inline-block; padding: 1px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }
.mono { font-family: monospace; font-size: 12px; }
</style>
