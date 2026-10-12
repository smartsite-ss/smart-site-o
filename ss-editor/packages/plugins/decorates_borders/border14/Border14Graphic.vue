<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <filter id="glow14">
          <feGaussianBlur
            stdDeviation="2"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow14-strong">
          <feGaussianBlur
            stdDeviation="3"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient
          :id="'grad14h'"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            :stop-color="colors[1]"
            stop-opacity="0"
          />
          <stop
            offset="15%"
            :stop-color="colors[1]"
            stop-opacity="0.8"
          />
          <stop
            offset="50%"
            :stop-color="colors[0]"
            stop-opacity="1"
          />
          <stop
            offset="85%"
            :stop-color="colors[1]"
            stop-opacity="0.8"
          />
          <stop
            offset="100%"
            :stop-color="colors[1]"
            stop-opacity="0"
          />
        </linearGradient>
        <linearGradient
          :id="'grad14v'"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            :stop-color="colors[1]"
            stop-opacity="0"
          />
          <stop
            offset="15%"
            :stop-color="colors[1]"
            stop-opacity="0.8"
          />
          <stop
            offset="50%"
            :stop-color="colors[0]"
            stop-opacity="1"
          />
          <stop
            offset="85%"
            :stop-color="colors[1]"
            stop-opacity="0.8"
          />
          <stop
            offset="100%"
            :stop-color="colors[1]"
            stop-opacity="0"
          />
        </linearGradient>
        <pattern
          :id="'hex14'"
          patternUnits="userSpaceOnUse"
          width="24"
          height="42"
          patternTransform="scale(1)"
        >
          <path
            :stroke="colors[1]"
            stroke-width="0.5"
            stroke-opacity="0.15"
            fill="none"
            d="M12 0 L24 7 L24 21 L12 28 L0 21 L0 7 Z"
          />
        </pattern>
      </defs>

      <rect
        v-if="showHexGrid"
        :fill="`url(#hex14)`"
        x="0"
        y="0"
        :width="w"
        :height="h"
        opacity="0.6"
      />

      <rect
        :fill="backgroundColor"
        x="6"
        y="6"
        :width="w - 12"
        :height="h - 12"
      />

      <line
        v-if="showScanLine"
        :stroke="colors[0]"
        stroke-opacity="0.08"
        stroke-width="1"
        :x1="8"
        :y1="h / 2"
        :x2="w - 8"
        :y2="h / 2"
      >
        <animate
          attributeName="y1"
          :values="`8;${h - 8};8`"
          :dur="`${4 / animationSpeed}s`"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y2"
          :values="`8;${h - 8};8`"
          :dur="`${4 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </line>

      <g filter="url(#glow14)">
        <line
          :x1="30"
          y1="3"
          :x2="w - 30"
          y2="3"
          :stroke="colors[0]"
          stroke-width="1.5"
          stroke-opacity="0.9"
          :stroke-dasharray="`${(w - 60) / 2},${(w - 60) / 2}`"
        >
          <animate
            attributeName="stroke-dashoffset"
            :values="`0;${-(w - 60)}`"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </line>
        <line
          :x1="30"
          :y1="h - 3"
          :x2="w - 30"
          :y2="h - 3"
          :stroke="colors[0]"
          stroke-width="1.5"
          stroke-opacity="0.9"
          :stroke-dasharray="`${(w - 60) / 2},${(w - 60) / 2}`"
        >
          <animate
            attributeName="stroke-dashoffset"
            :values="`${-(w - 60)};0`"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="3"
          :y1="30"
          x2="3"
          :y2="h - 30"
          :stroke="colors[0]"
          stroke-width="1.5"
          stroke-opacity="0.9"
          :stroke-dasharray="`${(h - 60) / 2},${(h - 60) / 2}`"
        >
          <animate
            attributeName="stroke-dashoffset"
            :values="`0;${-(h - 60)}`"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </line>
        <line
          :x1="w - 3"
          :y1="30"
          :x2="w - 3"
          :y2="h - 30"
          :stroke="colors[0]"
          stroke-width="1.5"
          stroke-opacity="0.9"
          :stroke-dasharray="`${(h - 60) / 2},${(h - 60) / 2}`"
        >
          <animate
            attributeName="stroke-dashoffset"
            :values="`${-(h - 60)};0`"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </line>
      </g>

      <g filter="url(#glow14-strong)">
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          :points="`3,24 3,3 24,3`"
        />
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          :points="`${w - 24},3 ${w - 3},3 ${w - 3},24`"
        />
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          :points="`${w - 3},${h - 24} ${w - 3},${h - 3} ${w - 24},${h - 3}`"
        />
        <polyline
          :stroke="colors[0]"
          stroke-width="2"
          fill="none"
          :points="`24,${h - 3} 3,${h - 3} 3,${h - 24}`"
        />
      </g>

      <g filter="url(#glow14-strong)">
        <polyline
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          :points="`10,30 10,10 30,10`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          :points="`${w - 30},10 ${w - 10},10 ${w - 10},30`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          :points="`${w - 10},${h - 30} ${w - 10},${h - 10} ${w - 30},${h - 10}`"
        />
        <polyline
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          :points="`30,${h - 10} 10,${h - 10} 10,${h - 30}`"
        />
      </g>

      <circle
        cx="3"
        cy="3"
        r="3"
        :fill="colors[0]"
        filter="url(#glow14-strong)"
      >
        <animate
          attributeName="r"
          values="3;4;3"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        :cx="w - 3"
        cy="3"
        r="3"
        :fill="colors[0]"
        filter="url(#glow14-strong)"
      >
        <animate
          attributeName="r"
          values="3;4;3"
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
        filter="url(#glow14-strong)"
      >
        <animate
          attributeName="r"
          values="3;4;3"
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
        filter="url(#glow14-strong)"
      >
        <animate
          attributeName="r"
          values="3;4;3"
          :dur="`${1.5 / animationSpeed}s`"
          repeatCount="indefinite"
          begin="1.125s"
        />
      </circle>

      <circle
        cx="14"
        cy="14"
        r="1.5"
        :fill="colors[0]"
        opacity="0.6"
      />
      <circle
        :cx="w - 14"
        cy="14"
        r="1.5"
        :fill="colors[0]"
        opacity="0.6"
      />
      <circle
        :cx="w - 14"
        :cy="h - 14"
        r="1.5"
        :fill="colors[0]"
        opacity="0.6"
      />
      <circle
        cx="14"
        :cy="h - 14"
        r="1.5"
        :fill="colors[0]"
        opacity="0.6"
      />

      <line
        v-if="showCoreLines"
        :x1="w / 2"
        :y1="30"
        :x2="w / 2"
        :y2="h - 30"
        :stroke="colors[1]"
        stroke-width="0.5"
        stroke-opacity="0.3"
        :stroke-dasharray="`4,4`"
      />
      <line
        v-if="showCoreLines"
        :x1="30"
        :y1="h / 2"
        :x2="w - 30"
        :y2="h / 2"
        :stroke="colors[1]"
        stroke-width="0.5"
        stroke-opacity="0.3"
        :stroke-dasharray="`4,4`"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border14Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showHexGrid: { type: Boolean, default: true },
    showScanLine: { type: Boolean, default: true },
    showCoreLines: { type: Boolean, default: true },
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