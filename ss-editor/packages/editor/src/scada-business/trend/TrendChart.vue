<template>
  <div class="trend-chart">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <span
        class="current-value"
        :style="{ color: color }"
      >
        {{ formattedCurrentValue }}
      </span>
    </div>
    <div
      ref="svgContainer"
      class="chart-svg-wrapper"
    >
      <svg
        :width="svgWidth"
        :height="svgHeight"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
      >
        <g :transform="`translate(${padding.left}, ${padding.top})`">
          <g class="grid-lines">
            <line
              v-for="(yVal, idx) in yGridLines"
              :key="'grid-' + idx"
              :x1="0"
              :y1="yVal"
              :x2="plotWidth"
              :y2="yVal"
              stroke="#e8e8e8"
              stroke-width="0.5"
            />
          </g>

          <g class="axis-labels">
            <text
              v-for="(label, idx) in xLabels"
              :key="'x-' + idx"
              :x="label.x"
              :y="plotHeight + 16"
              text-anchor="middle"
              font-size="10"
              fill="#999"
            >
              {{ label.text }}
            </text>
            <text
              v-for="(label, idx) in yLabels"
              :key="'y-' + idx"
              :x="-6"
              :y="label.y + 4"
              text-anchor="end"
              font-size="10"
              fill="#999"
            >
              {{ label.text }}
            </text>
          </g>

          <polyline
            :points="linePoints"
            :stroke="color"
            stroke-width="2"
            fill="none"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <polygon
            :points="areaPoints"
            :fill="color"
            fill-opacity="0.08"
          />

          <circle
            v-for="(pt, idx) in dataPoints"
            :key="'pt-' + idx"
            :cx="pt.x"
            :cy="pt.y"
            r="3"
            :fill="color"
            :opacity="idx === dataPoints.length - 1 ? 1 : 0.6"
          />

          <circle
            v-if="dataPoints.length > 0"
            :cx="dataPoints[dataPoints.length - 1].x"
            :cy="dataPoints[dataPoints.length - 1].y"
            r="5"
            :stroke="color"
            stroke-width="2"
            fill="white"
          />
        </g>
      </svg>
    </div>
    <div class="chart-footer">
      <span class="footer-label">时间范围: {{ timeRange }}</span>
      <span class="footer-label">数据点: {{ data.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface TrendDataPoint {
  timestamp: number
  value: number
}

const props = withDefaults(
  defineProps<{
    data: TrendDataPoint[]
    title: string
    color: string
  }>(),
  {
    data: () => [],
    title: '趋势图',
    color: '#2080f0',
  }
)

const svgContainer = ref<HTMLElement | null>(null)
const svgWidth = ref(600)
const svgHeight = ref(280)
const padding = { top: 10, right: 16, bottom: 24, left: 48 }

const plotWidth = computed(() => svgWidth.value - padding.left - padding.right)
const plotHeight = computed(() => svgHeight.value - padding.top - padding.bottom)

const formattedCurrentValue = computed(() => {
  if (props.data.length === 0) return '--'
  const latest = props.data[props.data.length - 1].value
  if (typeof latest === 'number') {
    return latest.toFixed(latest % 1 === 0 ? 0 : 2)
  }
  return String(latest)
})

const timeRange = computed(() => {
  if (props.data.length < 2) return '--'
  const minT = props.data[0].timestamp
  const maxT = props.data[props.data.length - 1].timestamp
  const diff = (maxT - minT) / 1000
  if (diff < 60) return `${diff.toFixed(0)}s`
  if (diff < 3600) return `${(diff / 60).toFixed(1)}min`
  return `${(diff / 3600).toFixed(1)}h`
})

const valueRange = computed(() => {
  if (props.data.length === 0) return { min: 0, max: 100 }
  let min = Infinity
  let max = -Infinity
  for (const d of props.data) {
    if (d.value < min) min = d.value
    if (d.value > max) max = d.value
  }
  if (min === max) {
    min = min - 10
    max = max + 10
  }
  const padding = (max - min) * 0.1 || 10
  return { min: min - padding, max: max + padding }
})

const xLabels = computed(() => {
  if (props.data.length === 0) return []
  const count = Math.min(6, props.data.length)
  const pw = plotWidth.value
  const labels: { x: number; text: string }[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1 || 1)) * (props.data.length - 1))
    const t = props.data[idx]?.timestamp
    if (t !== undefined) {
      labels.push({
        x: pw > 0 ? (idx / (props.data.length - 1 || 1)) * pw : 0,
        text: formatTime(t),
      })
    }
  }
  return labels
})

const yLabels = computed(() => {
  const range = valueRange.value
  const count = 5
  const ph = plotHeight.value
  const labels: { y: number; text: string }[] = []
  for (let i = 0; i < count; i++) {
    const value = range.min + ((range.max - range.min) * i) / (count - 1)
    labels.push({
      y: ph > 0 ? ph - ((value - range.min) / (range.max - range.min)) * ph : 0,
      text: formatValue(value),
    })
  }
  return labels
})

const yGridLines = computed(() => {
  return yLabels.value.map((l) => l.y)
})

const dataPoints = computed(() => {
  if (props.data.length === 0) return []
  const range = valueRange.value
  const pw = plotWidth.value
  const ph = plotHeight.value
  return props.data.map((d, i) => ({
    x: props.data.length > 1 ? (i / (props.data.length - 1)) * pw : pw / 2,
    y: ph - ((d.value - range.min) / (range.max - range.min)) * ph,
  }))
})

const linePoints = computed(() => {
  return dataPoints.value.map((pt) => `${pt.x},${pt.y}`).join(' ')
})

const areaPoints = computed(() => {
  const pts = dataPoints.value
  if (pts.length === 0) return ''
  const ph = plotHeight.value
  const points = pts.map((pt) => `${pt.x},${pt.y}`).join(' ')
  return `${0},${ph} ${points} ${pts[pts.length - 1].x},${ph}`
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'k'
  if (v % 1 === 0) return String(v)
  return v.toFixed(1)
}

function updateSvgSize() {
  if (svgContainer.value) {
    const rect = svgContainer.value.getBoundingClientRect()
    if (rect.width > 0) {
      svgWidth.value = rect.width
      svgHeight.value = Math.max(200, rect.height || 280)
    }
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  updateSvgSize()
  if (svgContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSvgSize()
    })
    resizeObserver.observe(svgContainer.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

watch(
  () => props.data.length,
  () => {
    nextTick(() => updateSvgSize())
  }
)
</script>

<style scoped>
.trend-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--surface, #fff);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 6px;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.current-value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chart-svg-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chart-svg-wrapper svg {
  display: block;
  width: 100%;
  height: 100%;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
  border-top: 1px solid var(--border-color, #e8e8e8);
  background-color: var(--background, #fafafa);
}

.footer-label {
  font-size: 11px;
  color: #999;
}
</style>