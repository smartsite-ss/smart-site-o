<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <linearGradient
          :id="'ad-gold-h'"
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
            offset="20%"
            :stop-color="colors[1]"
          />
          <stop
            offset="50%"
            :stop-color="colors[0]"
          />
          <stop
            offset="80%"
            :stop-color="colors[1]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <linearGradient
          :id="'ad-gold-v'"
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
            offset="20%"
            :stop-color="colors[1]"
          />
          <stop
            offset="50%"
            :stop-color="colors[0]"
          />
          <stop
            offset="80%"
            :stop-color="colors[1]"
          />
          <stop
            offset="100%"
            :stop-color="colors[2]"
          />
        </linearGradient>
        <linearGradient
          :id="'ad-gold-diag'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            :stop-color="colors[0]"
          />
          <stop
            offset="100%"
            :stop-color="colors[1]"
          />
        </linearGradient>
        <filter id="ad-glow">
          <feGaussianBlur
            stdDeviation="1.5"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        :fill="backgroundColor"
        x="0"
        y="0"
        :width="w"
        :height="h"
      />

      <!-- 顶部边框 -->
      <line
        x1="24"
        y1="3"
        :x2="w - 24"
        y2="3"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.6;1;0.6"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="24"
        y1="7"
        :x2="w - 24"
        y2="7"
        :stroke="`url(#ad-gold-h)`"
        stroke-width="1"
        stroke-opacity="0.5"
      />

      <!-- 底部边框 -->
      <line
        x1="24"
        :y1="h - 3"
        :x2="w - 24"
        :y2="h - 3"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="stroke-opacity"
          values="1;0.6;1"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="24"
        :y1="h - 7"
        :x2="w - 24"
        :y2="h - 7"
        :stroke="`url(#ad-gold-h)`"
        stroke-width="1"
        stroke-opacity="0.5"
      />

      <!-- 左侧边框 -->
      <line
        y1="24"
        x1="3"
        :y2="h - 24"
        x2="3"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="stroke-opacity"
          values="1;0.6;1"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </line>
      <line
        y1="24"
        x1="7"
        :y2="h - 24"
        x2="7"
        :stroke="`url(#ad-gold-v)`"
        stroke-width="1"
        stroke-opacity="0.5"
      />

      <!-- 右侧边框 -->
      <line
        :y1="24"
        :x1="w - 3"
        :y2="h - 24"
        :x2="w - 3"
        :stroke="colors[0]"
        stroke-width="2"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.6;1;0.6"
          :dur="`${2 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </line>
      <line
        :y1="24"
        :x1="w - 7"
        :y2="h - 24"
        :x2="w - 7"
        :stroke="`url(#ad-gold-v)`"
        stroke-width="1"
        stroke-opacity="0.5"
      />

      <!-- 放射光芒 sunburst from corners -->
      <g
        v-if="showSunburst"
        opacity="0.4"
        filter="url(#ad-glow)"
      >
        <!-- 左上 -->
        <g>
          <line
            x1="3"
            y1="3"
            x2="60"
            y2="3"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            x1="3"
            y1="3"
            x2="3"
            y2="60"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            x1="3"
            y1="3"
            x2="45"
            y2="45"
            :stroke="colors[0]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            y1="3"
            x2="75"
            y2="15"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            y1="3"
            x2="15"
            y2="75"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            y1="3"
            x2="90"
            y2="30"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
          <line
            x1="3"
            y1="3"
            x2="30"
            y2="90"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
        </g>
        <!-- 右上 -->
        <g>
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 60"
            y2="3"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 3"
            y2="60"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 45"
            y2="45"
            :stroke="colors[0]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 75"
            y2="15"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 15"
            y2="75"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 90"
            y2="30"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
          <line
            :x1="w - 3"
            y1="3"
            :x2="w - 30"
            y2="90"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
        </g>
        <!-- 左下 -->
        <g>
          <line
            x1="3"
            :y1="h - 3"
            x2="60"
            :y2="h - 3"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="3"
            :y2="h - 60"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="45"
            :y2="h - 45"
            :stroke="colors[0]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="75"
            :y2="h - 15"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="15"
            :y2="h - 75"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="90"
            :y2="h - 30"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
          <line
            x1="3"
            :y1="h - 3"
            x2="30"
            :y2="h - 90"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
        </g>
        <!-- 右下 -->
        <g>
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 60"
            :y2="h - 3"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 3"
            :y2="h - 60"
            :stroke="colors[0]"
            stroke-width="0.5"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 45"
            :y2="h - 45"
            :stroke="colors[0]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 75"
            :y2="h - 15"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 15"
            :y2="h - 75"
            :stroke="colors[1]"
            stroke-width="0.3"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 90"
            :y2="h - 30"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
          <line
            :x1="w - 3"
            :y1="h - 3"
            :x2="w - 30"
            :y2="h - 90"
            :stroke="colors[2]"
            stroke-width="0.2"
          />
        </g>
      </g>

      <!-- 角饰 Art Deco stepped chevrons -->
      <g
        v-if="showCorners"
        filter="url(#ad-glow)"
      >
        <!-- 左上三段阶梯 -->
        <polyline
          :stroke="`url(#ad-gold-diag)`"
          stroke-width="1.5"
          fill="none"
          points="3,28 16,28 16,15 28,15 28,3"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          points="8,32 20,32 20,20 32,20 32,8"
        />
        <polyline
          :stroke="colors[2]"
          stroke-width="0.5"
          fill="none"
          points="13,36 24,36 24,24 36,24 36,13"
        />
        <!-- 右上 -->
        <polyline
          :stroke="`url(#ad-gold-diag)`"
          stroke-width="1.5"
          fill="none"
          :points="`${w - 3},28 ${w - 16},28 ${w - 16},15 ${w - 28},15 ${w - 28},3`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          :points="`${w - 8},32 ${w - 20},32 ${w - 20},20 ${w - 32},20 ${w - 32},8`"
        />
        <polyline
          :stroke="colors[2]"
          stroke-width="0.5"
          fill="none"
          :points="`${w - 13},36 ${w - 24},36 ${w - 24},24 ${w - 36},24 ${w - 36},13`"
        />
        <!-- 左下 -->
        <polyline
          :stroke="`url(#ad-gold-diag)`"
          stroke-width="1.5"
          fill="none"
          :points="`3,${h - 28} 16,${h - 28} 16,${h - 15} 28,${h - 15} 28,${h - 3}`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          :points="`8,${h - 32} 20,${h - 32} 20,${h - 20} 32,${h - 20} 32,${h - 8}`"
        />
        <polyline
          :stroke="colors[2]"
          stroke-width="0.5"
          fill="none"
          :points="`13,${h - 36} 24,${h - 36} 24,${h - 24} 36,${h - 24} 36,${h - 13}`"
        />
        <!-- 右下 -->
        <polyline
          :stroke="`url(#ad-gold-diag)`"
          stroke-width="1.5"
          fill="none"
          :points="`${w - 3},${h - 28} ${w - 16},${h - 28} ${w - 16},${h - 15} ${w - 28},${h - 15} ${w - 28},${h - 3}`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          :points="`${w - 8},${h - 32} ${w - 20},${h - 32} ${w - 20},${h - 20} ${w - 32},${h - 20} ${w - 32},${h - 8}`"
        />
        <polyline
          :stroke="colors[2]"
          stroke-width="0.5"
          fill="none"
          :points="`${w - 13},${h - 36} ${w - 24},${h - 36} ${w - 24},${h - 24} ${w - 36},${h - 24} ${w - 36},${h - 13}`"
        />
      </g>

      <!-- 四角钻石点 -->
      <circle
        cx="3"
        cy="3"
        r="3"
        :fill="colors[0]"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="r"
          values="2.5;3.5;2.5"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        :cx="w - 3"
        cy="3"
        r="3"
        :fill="colors[0]"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="r"
          values="3;2.5;3"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.375s"
        />
      </circle>
      <circle
        :cx="w - 3"
        :cy="h - 3"
        r="3"
        :fill="colors[0]"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="r"
          values="2.5;3.5;2.5"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="0.75s"
        />
      </circle>
      <circle
        cx="3"
        :cy="h - 3"
        r="3"
        :fill="colors[0]"
        filter="url(#ad-glow)"
      >
        <animate
          attributeName="r"
          values="3;2.5;3"
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
  name: 'Border15Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showSunburst: { type: Boolean, default: true },
    showCorners: { type: Boolean, default: true },
    animationSpeed: { type: Number, default: 1 },
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