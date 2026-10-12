<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <filter id="cb-neon-cyan">
          <feGaussianBlur
            stdDeviation="3"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cb-neon-magenta">
          <feGaussianBlur
            stdDeviation="3"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cb-glow-light">
          <feGaussianBlur
            stdDeviation="1.5"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient
          :id="'cb-h-grad'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            :stop-color="colors[2]"
          />
          <stop
            offset="10%"
            :stop-color="colors[0]"
          />
          <stop
            offset="50%"
            :stop-color="colors[1]"
          />
          <stop
            offset="90%"
            :stop-color="colors[0]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <linearGradient
          :id="'cb-v-grad'"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            :stop-color="colors[2]"
          />
          <stop
            offset="10%"
            :stop-color="colors[1]"
          />
          <stop
            offset="50%"
            :stop-color="colors[0]"
          />
          <stop
            offset="90%"
            :stop-color="colors[1]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <pattern
          :id="'cb-crt-dots'"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <circle
            cx="2"
            cy="2"
            r="0.6"
            :fill="colors[0]"
            opacity="0.06"
          />
        </pattern>
      </defs>

      <rect
        :fill="backgroundColor"
        x="0"
        y="0"
        :width="w"
        :height="h"
      />
      <rect
        :fill="`url(#cb-crt-dots)`"
        x="0"
        y="0"
        :width="w"
        :height="h"
      />

      <!-- 扫描线 -->
      <g
        v-if="showScanline"
        opacity="0.08"
      >
        <line
          v-for="y in scanlines"
          :key="'sl'+y"
          x1="0"
          :y1="y"
          :x2="w"
          :y2="y"
          :stroke="colors[0]"
          stroke-width="1"
        >
          <animate
            attributeName="opacity"
            :values="scanlineOpacityValues"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            :begin="`${y * 0.02}s`"
          />
        </line>
      </g>

      <!-- 顶部霓虹边框 -->
      <line
        x1="28"
        y1="4"
        :x2="w - 28"
        y2="4"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#cb-neon-cyan)"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.5;1;0.5"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="28"
        y1="8"
        :x2="w - 28"
        y2="8"
        :stroke="`url(#cb-h-grad)`"
        stroke-width="0.8"
        stroke-opacity="0.4"
      />

      <!-- 底部霓虹边框 -->
      <line
        x1="28"
        :y1="h - 4"
        :x2="w - 28"
        :y2="h - 4"
        :stroke="colors[1]"
        stroke-width="2"
        filter="url(#cb-neon-magenta)"
      >
        <animate
          attributeName="stroke-opacity"
          values="1;0.5;1"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="28"
        :y1="h - 8"
        :x2="w - 28"
        :y2="h - 8"
        :stroke="`url(#cb-h-grad)`"
        stroke-width="0.8"
        stroke-opacity="0.4"
      />

      <!-- 左侧霓虹边框 -->
      <line
        y1="28"
        x1="4"
        :y2="h - 28"
        x2="4"
        :stroke="colors[1]"
        stroke-width="2"
        filter="url(#cb-neon-magenta)"
      >
        <animate
          attributeName="stroke-opacity"
          values="1;0.5;1"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </line>
      <line
        y1="28"
        x1="8"
        :y2="h - 28"
        x2="8"
        :stroke="`url(#cb-v-grad)`"
        stroke-width="0.8"
        stroke-opacity="0.4"
      />

      <!-- 右侧霓虹边框 -->
      <line
        :y1="28"
        :x1="w - 4"
        :y2="h - 28"
        :x2="w - 4"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#cb-neon-cyan)"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.5;1;0.5"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </line>
      <line
        :y1="28"
        :x1="w - 8"
        :y2="h - 28"
        :x2="w - 8"
        :stroke="`url(#cb-v-grad)`"
        stroke-width="0.8"
        stroke-opacity="0.4"
      />

      <!-- L形角 brackets -->
      <g filter="url(#cb-glow-light)">
        <!-- 左上 -->
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          points="4,28 4,4 28,4"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          points="10,28 10,10 28,10"
          stroke-opacity="0.5"
        />
        <!-- 右上 -->
        <polyline
          :stroke="colors[1]"
          stroke-width="2"
          fill="none"
          :points="`${w - 4},28 ${w - 4},4 ${w - 28},4`"
        />
        <polyline
          :stroke="colors[0]"
          stroke-width="0.8"
          fill="none"
          :points="`${w - 10},28 ${w - 10},10 ${w - 28},10`"
          stroke-opacity="0.5"
        />
        <!-- 左下 -->
        <polyline
          :stroke="colors[1]"
          stroke-width="2"
          fill="none"
          :points="`4,${h - 28} 4,${h - 4} 28,${h - 4}`"
        />
        <polyline
          :stroke="colors[0]"
          stroke-width="0.8"
          fill="none"
          :points="`10,${h - 28} 10,${h - 10} 28,${h - 10}`"
          stroke-opacity="0.5"
        />
        <!-- 右下 -->
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          :points="`${w - 4},${h - 28} ${w - 4},${h - 4} ${w - 28},${h - 4}`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          :points="`${w - 10},${h - 28} ${w - 10},${h - 10} ${w - 28},${h - 10}`"
          stroke-opacity="0.5"
        />
      </g>

      <!-- 电路纹理 circuit traces along edges -->
      <g
        v-if="showCircuit"
        stroke-width="1"
        stroke-opacity="0.35"
        fill="none"
        filter="url(#cb-glow-light)"
      >
        <!-- 顶部电路 -->
        <polyline
          :stroke="colors[0]"
          :points="`40,0 40,12 55,12 55,0`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`80,0 80,6 95,6 95,12 110,12 110,0`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`140,0 140,8 160,8 160,0`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`190,0 190,10 205,10 205,6 225,6 225,0`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w - 140},0 ${w - 140},8 ${w - 160},8 ${w - 160},0`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`${w - 80},0 ${w - 80},10 ${w - 95},10 ${w - 95},6 ${w - 110},6 ${w - 110},0`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w - 40},0 ${w - 40},12 ${w - 55},12 ${w - 55},0`"
        />
        <!-- 底部电路 -->
        <polyline
          :stroke="colors[1]"
          :points="`40,${h} 40,${h - 12} 55,${h - 12} 55,${h}`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`80,${h} 80,${h - 8} 100,${h - 8} 100,${h - 14} 115,${h - 14} 115,${h}`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`140,${h} 140,${h - 10} 165,${h - 10} 165,${h}`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`190,${h} 190,${h - 6} 210,${h - 6} 210,${h - 12} 230,${h - 12} 230,${h}`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`${w - 140},${h} ${w - 140},${h - 10} ${w - 165},${h - 10} ${w - 165},${h}`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w - 80},${h} ${w - 80},${h - 8} ${w - 100},${h - 8} ${w - 100},${h - 14} ${w - 115},${h - 14} ${w - 115},${h}`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`${w - 40},${h} ${w - 40},${h - 12} ${w - 55},${h - 12} ${w - 55},${h}`"
        />
        <!-- 左侧电路 -->
        <polyline
          :stroke="colors[0]"
          :points="`0,40 12,40 12,55 0,55`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`0,80 8,80 8,100 14,100 14,115 0,115`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`0,140 10,140 10,165 0,165`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`0,${h - 140} 10,${h - 140} 10,${h - 165} 0,${h - 165}`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`0,${h - 80} 8,${h - 80} 8,${h - 100} 14,${h - 100} 14,${h - 115} 0,${h - 115}`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`0,${h - 40} 12,${h - 40} 12,${h - 55} 0,${h - 55}`"
        />
        <!-- 右侧电路 -->
        <polyline
          :stroke="colors[1]"
          :points="`${w},40 ${w - 12},40 ${w - 12},55 ${w},55`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w},80 ${w - 8},80 ${w - 8},100 ${w - 14},100 ${w - 14},115 ${w},115`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`${w},140 ${w - 10},140 ${w - 10},165 ${w},165`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w},${h - 140} ${w - 10},${h - 140} ${w - 10},${h - 165} ${w},${h - 165}`"
        />
        <polyline
          :stroke="colors[1]"
          :points="`${w},${h - 80} ${w - 8},${h - 80} ${w - 8},${h - 100} ${w - 14},${h - 100} ${w - 14},${h - 115} ${w},${h - 115}`"
        />
        <polyline
          :stroke="colors[0]"
          :points="`${w},${h - 40} ${w - 12},${h - 40} ${w - 12},${h - 55} ${w},${h - 55}`"
        />
      </g>

      <!-- 边框上的霓虹发光点 -->
      <g>
        <!-- 顶部发光点 -->
        <circle
          v-for="dot in topDots"
          :key="'td'+dot"
          :cx="dot"
          cy="4"
          r="1.2"
          :fill="colors[0]"
          filter="url(#cb-neon-cyan)"
        >
          <animate
            attributeName="r"
            values="1;1.6;1"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            :begin="`${dot * 0.005}s`"
          />
        </circle>
        <!-- 底部发光点 -->
        <circle
          v-for="dot in bottomDots"
          :key="'bd'+dot"
          :cx="dot"
          :cy="h - 4"
          r="1.2"
          :fill="colors[1]"
          filter="url(#cb-neon-magenta)"
        >
          <animate
            attributeName="r"
            values="1.4;1;1.4"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            :begin="`${dot * 0.005}s`"
          />
        </circle>
        <!-- 左侧发光点 -->
        <circle
          v-for="dot in leftDots"
          :key="'ld'+dot"
          :cy="dot"
          cx="4"
          r="1.2"
          :fill="colors[1]"
          filter="url(#cb-neon-magenta)"
        >
          <animate
            attributeName="r"
            values="1;1.4;1"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            :begin="`${dot * 0.005}s`"
          />
        </circle>
        <!-- 右侧发光点 -->
        <circle
          v-for="dot in rightDots"
          :key="'rd'+dot"
          :cy="dot"
          :cx="w - 4"
          r="1.2"
          :fill="colors[0]"
          filter="url(#cb-neon-cyan)"
        >
          <animate
            attributeName="r"
            values="1.4;1;1.4"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            :begin="`${dot * 0.005}s`"
          />
        </circle>
      </g>

      <!-- 四角霓虹核心点 -->
      <circle
        cx="4"
        cy="4"
        r="4"
        :fill="colors[0]"
        filter="url(#cb-neon-cyan)"
      >
        <animate
          attributeName="r"
          values="3;5;3"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.7;1;0.7"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="4"
        cy="4"
        r="8"
        fill="none"
        :stroke="colors[0]"
        stroke-width="0.5"
        opacity="0.4"
      >
        <animate
          attributeName="r"
          values="6;10;6"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.2;0.5;0.2"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </circle>

      <circle
        :cx="w - 4"
        cy="4"
        r="4"
        :fill="colors[1]"
        filter="url(#cb-neon-magenta)"
      >
        <animate
          attributeName="r"
          values="4;3;4"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.375s"
        />
        <animate
          attributeName="opacity"
          values="1;0.7;1"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.375s"
        />
      </circle>
      <circle
        :cx="w - 4"
        cy="4"
        r="8"
        fill="none"
        :stroke="colors[1]"
        stroke-width="0.5"
        opacity="0.4"
      >
        <animate
          attributeName="r"
          values="8;6;8"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.375s"
        />
        <animate
          attributeName="opacity"
          values="0.5;0.2;0.5"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.375s"
        />
      </circle>

      <circle
        :cx="w - 4"
        :cy="h - 4"
        r="4"
        :fill="colors[0]"
        filter="url(#cb-neon-cyan)"
      >
        <animate
          attributeName="r"
          values="3;5;3"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.75s"
        />
        <animate
          attributeName="opacity"
          values="0.7;1;0.7"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.75s"
        />
      </circle>
      <circle
        :cx="w - 4"
        :cy="h - 4"
        r="8"
        fill="none"
        :stroke="colors[0]"
        stroke-width="0.5"
        opacity="0.4"
      >
        <animate
          attributeName="r"
          values="6;10;6"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.75s"
        />
        <animate
          attributeName="opacity"
          values="0.2;0.5;0.2"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.75s"
        />
      </circle>

      <circle
        cx="4"
        :cy="h - 4"
        r="4"
        :fill="colors[1]"
        filter="url(#cb-neon-magenta)"
      >
        <animate
          attributeName="r"
          values="4;3;4"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="1.125s"
        />
        <animate
          attributeName="opacity"
          values="1;0.7;1"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="1.125s"
        />
      </circle>
      <circle
        cx="4"
        :cy="h - 4"
        r="8"
        fill="none"
        :stroke="colors[1]"
        stroke-width="0.5"
        opacity="0.4"
      >
        <animate
          attributeName="r"
          values="8;6;8"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="1.125s"
        />
        <animate
          attributeName="opacity"
          values="0.5;0.2;0.5"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="1.125s"
        />
      </circle>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border17Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showCircuit: { type: Boolean, default: true },
    showScanline: { type: Boolean, default: true },
    animationSpeed: { type: Number, default: 1 },
  },
  computed: {
    scanlines(): number[] {
      const lines: number[] = [];
      for (let y = 12; y < this.h; y += 4) {
        lines.push(y);
      }
      return lines;
    },
    scanlineOpacityValues(): string {
      return '0.3;0.8;0.2;0.7;0.3';
    },
    topDots(): number[] {
      return this.generateDots(40, this.w - 40, 30);
    },
    bottomDots(): number[] {
      return this.generateDots(40, this.w - 40, 30);
    },
    leftDots(): number[] {
      return this.generateDots(40, this.h - 40, 30);
    },
    rightDots(): number[] {
      return this.generateDots(40, this.h - 40, 30);
    },
  },
  methods: {
    generateDots(start: number, end: number, step: number): number[] {
      const dots: number[] = [];
      for (let i = start; i <= end; i += step) {
        dots.push(i);
      }
      return dots;
    },
  },
});
</script>

<style scoped>
.ss-border-box {
  width: 100%;
  height: 100%;
}
.ss-border-box svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>