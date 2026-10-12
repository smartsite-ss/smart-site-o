<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <filter id="sm-soft-glow">
          <feGaussianBlur
            stdDeviation="1"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern
          :id="'sm-dot-pattern'"
          x="0"
          y="0"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="8"
            cy="8"
            r="1.2"
            :fill="colors[2]"
            opacity="0.35"
          />
          <circle
            cx="4"
            cy="4"
            r="0.6"
            :fill="colors[1]"
            opacity="0.2"
          />
          <circle
            cx="12"
            cy="12"
            r="0.6"
            :fill="colors[1]"
            opacity="0.2"
          />
        </pattern>
        <pattern
          :id="'sm-dot-pattern-large'"
          x="0"
          y="0"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="12"
            cy="12"
            r="1.5"
            :fill="colors[2]"
            opacity="0.3"
          />
          <circle
            cx="6"
            cy="6"
            r="0.8"
            :fill="colors[1]"
            opacity="0.18"
          />
          <circle
            cx="18"
            cy="6"
            r="0.8"
            :fill="colors[1]"
            opacity="0.18"
          />
          <circle
            cx="6"
            cy="18"
            r="0.8"
            :fill="colors[1]"
            opacity="0.18"
          />
          <circle
            cx="18"
            cy="18"
            r="0.8"
            :fill="colors[1]"
            opacity="0.18"
          />
        </pattern>
        <linearGradient
          :id="'sm-leaf-grad'"
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
        <linearGradient
          :id="'sm-leaf-grad2'"
          x1="100%"
          y1="0%"
          x2="0%"
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
      </defs>

      <rect
        :fill="backgroundColor"
        x="0"
        y="0"
        :width="w"
        :height="h"
      />

      <g
        v-if="showDots"
        opacity="0.6"
      >
        <rect
          x="10"
          y="10"
          :width="w - 20"
          :height="h - 20"
          :fill="`url(#sm-dot-pattern-large)`"
        />
      </g>

      <rect
        x="10"
        y="10"
        :width="w - 20"
        :height="h - 20"
        :fill="colors[2]"
        rx="1"
        opacity="0.12"
      />

      <g filter="url(#sm-soft-glow)">
        <rect
          x="9"
          y="9"
          :width="w - 18"
          :height="h - 18"
          :stroke="colors[0]"
          stroke-width="1.5"
          fill="none"
          rx="2"
          stroke-opacity="0.7"
        />
        <rect
          x="13"
          y="13"
          :width="w - 26"
          :height="h - 26"
          :stroke="colors[1]"
          stroke-width="0.8"
          fill="none"
          rx="1"
          stroke-opacity="0.5"
        />
        <rect
          x="15"
          y="15"
          :width="w - 30"
          :height="h - 30"
          :stroke="colors[0]"
          stroke-width="0.5"
          fill="none"
          rx="1"
          stroke-opacity="0.3"
        />
      </g>

      <g
        v-if="showLeaves"
        filter="url(#sm-soft-glow)"
      >
        <g transform="translate(18, 8)">
          <path
            d="M 0,28 C -6,16 -8,4 0,-10 C 8,4 6,16 0,28 Z"
            :fill="`url(#sm-leaf-grad)`"
            opacity="0.8"
            transform="rotate(-15, 0, 10)"
          />
          <path
            d="M 0,24 C -5,14 -7,4 0,-8 C 7,4 5,14 0,24 Z"
            :fill="`url(#sm-leaf-grad2)`"
            opacity="0.7"
            transform="rotate(10, 0, 10)"
          />
          <path
            d="M 0,20 C -4,12 -5,4 0,-6 C 5,4 4,12 0,20 Z"
            :fill="colors[2]"
            opacity="0.5"
            transform="rotate(-5, 0, 8)"
          />
        </g>

        <g :transform="`translate(${w - 18}, 8) scale(-1, 1)`">
          <path
            d="M 0,28 C -6,16 -8,4 0,-10 C 8,4 6,16 0,28 Z"
            :fill="`url(#sm-leaf-grad)`"
            opacity="0.8"
            transform="rotate(-15, 0, 10)"
          />
          <path
            d="M 0,24 C -5,14 -7,4 0,-8 C 7,4 5,14 0,24 Z"
            :fill="`url(#sm-leaf-grad2)`"
            opacity="0.7"
            transform="rotate(10, 0, 10)"
          />
          <path
            d="M 0,20 C -4,12 -5,4 0,-6 C 5,4 4,12 0,20 Z"
            :fill="colors[2]"
            opacity="0.5"
            transform="rotate(-5, 0, 8)"
          />
        </g>
      </g>

      <g
        opacity="0.5"
        filter="url(#sm-soft-glow)"
      >
        <path
          :d="`M 18,${h - 30} Q 30,${h - 38} 42,${h - 30} T 66,${h - 30} T 90,${h - 30}`"
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M 18,${h - 30} Q 30,${h - 38} 42,${h - 30} T 66,${h - 30} T 90,${h - 30};M 18,${h - 30} Q 30,${h - 22} 42,${h - 30} T 66,${h - 30} T 90,${h - 30};M 18,${h - 30} Q 30,${h - 38} 42,${h - 30} T 66,${h - 30} T 90,${h - 30}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </path>
        <path
          :d="`M 18,${h - 24} Q 30,${h - 32} 42,${h - 24} T 66,${h - 24} T 90,${h - 24}`"
          :stroke="colors[0]"
          stroke-width="0.6"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M 18,${h - 24} Q 30,${h - 32} 42,${h - 24} T 66,${h - 24} T 90,${h - 24};M 18,${h - 24} Q 30,${h - 16} 42,${h - 24} T 66,${h - 24} T 90,${h - 24};M 18,${h - 24} Q 30,${h - 32} 42,${h - 24} T 66,${h - 24} T 90,${h - 24}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </path>
        <path
          :d="`M 18,${h - 18} Q 30,${h - 26} 42,${h - 18} T 66,${h - 18} T 90,${h - 18}`"
          :stroke="colors[2]"
          stroke-width="0.4"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M 18,${h - 18} Q 30,${h - 26} 42,${h - 18} T 66,${h - 18} T 90,${h - 18};M 18,${h - 18} Q 30,${h - 10} 42,${h - 18} T 66,${h - 18} T 90,${h - 18};M 18,${h - 18} Q 30,${h - 26} 42,${h - 18} T 66,${h - 18} T 90,${h - 18}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="1s"
          />
        </path>

        <path
          :d="`M ${w - 18},${h - 30} Q ${w - 30},${h - 38} ${w - 42},${h - 30} T ${w - 66},${h - 30} T ${w - 90},${h - 30}`"
          :stroke="colors[1]"
          stroke-width="1"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M ${w - 18},${h - 30} Q ${w - 30},${h - 38} ${w - 42},${h - 30} T ${w - 66},${h - 30} T ${w - 90},${h - 30};M ${w - 18},${h - 30} Q ${w - 30},${h - 22} ${w - 42},${h - 30} T ${w - 66},${h - 30} T ${w - 90},${h - 30};M ${w - 18},${h - 30} Q ${w - 30},${h - 38} ${w - 42},${h - 30} T ${w - 66},${h - 30} T ${w - 90},${h - 30}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.25s"
          />
        </path>
        <path
          :d="`M ${w - 18},${h - 24} Q ${w - 30},${h - 32} ${w - 42},${h - 24} T ${w - 66},${h - 24} T ${w - 90},${h - 24}`"
          :stroke="colors[0]"
          stroke-width="0.6"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M ${w - 18},${h - 24} Q ${w - 30},${h - 32} ${w - 42},${h - 24} T ${w - 66},${h - 24} T ${w - 90},${h - 24};M ${w - 18},${h - 24} Q ${w - 30},${h - 16} ${w - 42},${h - 24} T ${w - 66},${h - 24} T ${w - 90},${h - 24};M ${w - 18},${h - 24} Q ${w - 30},${h - 32} ${w - 42},${h - 24} T ${w - 66},${h - 24} T ${w - 90},${h - 24}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.75s"
          />
        </path>
        <path
          :d="`M ${w - 18},${h - 18} Q ${w - 30},${h - 26} ${w - 42},${h - 18} T ${w - 66},${h - 18} T ${w - 90},${h - 18}`"
          :stroke="colors[2]"
          stroke-width="0.4"
          fill="none"
          stroke-linecap="round"
        >
          <animate
            attributeName="d"
            :values="`M ${w - 18},${h - 18} Q ${w - 30},${h - 26} ${w - 42},${h - 18} T ${w - 66},${h - 18} T ${w - 90},${h - 18};M ${w - 18},${h - 18} Q ${w - 30},${h - 10} ${w - 42},${h - 18} T ${w - 66},${h - 18} T ${w - 90},${h - 18};M ${w - 18},${h - 18} Q ${w - 30},${h - 26} ${w - 42},${h - 18} T ${w - 66},${h - 18} T ${w - 90},${h - 18}`"
            :dur="`${3 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="1.25s"
          />
        </path>
      </g>

      <g filter="url(#sm-soft-glow)">
        <circle
          cx="14"
          cy="14"
          r="3"
          :fill="colors[0]"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.7;0.4"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          :cx="w - 14"
          cy="14"
          r="3"
          :fill="colors[0]"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.7;0.4;0.7"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>
        <circle
          cx="14"
          :cy="h - 14"
          r="3"
          :fill="colors[0]"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.7;0.4;0.7"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>
        <circle
          :cx="w - 14"
          :cy="h - 14"
          r="3"
          :fill="colors[0]"
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.7;0.4"
            :dur="`${2 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border16Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showLeaves: { type: Boolean, default: true },
    showDots: { type: Boolean, default: true },
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