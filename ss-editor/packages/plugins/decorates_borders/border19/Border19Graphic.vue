<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <filter id="swiss-glow">
          <feGaussianBlur
            stdDeviation="1"
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

      <rect
        x="4"
        y="4"
        width="24"
        :height="h - 8"
        :fill="colors[0]"
      />
      <rect
        x="4"
        y="4"
        width="4"
        :height="h - 8"
        :fill="colors[1]"
      />

      <rect
        x="28"
        y="4"
        :width="w - 32"
        height="8"
        :fill="colors[0]"
      />
      <rect
        x="28"
        :y="h - 12"
        :width="w - 32"
        height="8"
        :fill="colors[0]"
      />
      <rect
        :x="w - 8"
        y="12"
        width="4"
        :height="h - 24"
        :fill="colors[0]"
      />

      <rect
        x="30"
        y="14"
        :width="w - 38"
        :height="h - 28"
        fill="none"
        :stroke="colors[2]"
        stroke-width="1"
        opacity="0.5"
      />

      <g v-if="showBlocks">
        <rect
          :x="w * 0.45"
          y="4"
          width="16"
          height="8"
          :fill="colors[1]"
        />
        <rect
          :x="w * 0.7"
          y="4"
          width="8"
          height="8"
          :fill="colors[1]"
          opacity="0.7"
        />

        <rect
          x="28"
          :y="h - 12"
          width="14"
          height="8"
          :fill="colors[1]"
        />
        <rect
          :x="w * 0.65"
          :y="h - 12"
          width="22"
          height="8"
          :fill="colors[1]"
        />

        <rect
          :x="w - 8"
          y="36"
          width="4"
          height="20"
          :fill="colors[1]"
        />
        <rect
          :x="w - 8"
          :y="h - 56"
          width="4"
          height="16"
          :fill="colors[1]"
        />

        <rect
          x="28"
          y="4"
          width="10"
          height="8"
          :fill="colors[0]"
          opacity="0.6"
        />
        <rect
          :x="w - 8"
          :y="h * 0.5 - 8"
          width="4"
          height="16"
          :fill="colors[0]"
          opacity="0.6"
        />
      </g>

      <g
        v-if="showAccents"
        filter="url(#swiss-glow)"
      >
        <rect
          :x="w * 0.33 - 3"
          y="2"
          width="6"
          height="6"
          :fill="colors[1]"
        />
        <rect
          :x="w * 0.66 - 3"
          y="2"
          width="6"
          height="6"
          :fill="colors[2]"
        />

        <rect
          :x="w * 0.33 - 3"
          :y="h - 8"
          width="6"
          height="6"
          :fill="colors[2]"
        />
        <rect
          :x="w * 0.66 - 3"
          :y="h - 8"
          width="6"
          height="6"
          :fill="colors[1]"
        />

        <rect
          x="2"
          :y="h * 0.33 - 3"
          width="6"
          height="6"
          :fill="colors[1]"
        />
        <rect
          x="2"
          :y="h * 0.66 - 3"
          width="6"
          height="6"
          :fill="colors[2]"
        />

        <rect
          :x="w - 8"
          :y="h * 0.33 - 3"
          width="6"
          height="6"
          :fill="colors[2]"
        />
        <rect
          :x="w - 8"
          :y="h * 0.66 - 3"
          width="6"
          height="6"
          :fill="colors[1]"
        />

        <circle
          cx="4"
          cy="4"
          r="9"
          :fill="colors[1]"
        >
          <animate
            attributeName="r"
            values="8;10;8"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          :cx="w - 4"
          cy="4"
          r="9"
          :fill="colors[1]"
        >
          <animate
            attributeName="r"
            values="9;8;9"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.375s"
          />
        </circle>
        <circle
          cx="4"
          :cy="h - 4"
          r="9"
          :fill="colors[1]"
        >
          <animate
            attributeName="r"
            values="9;8;9"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="0.75s"
          />
        </circle>
        <circle
          :cx="w - 4"
          :cy="h - 4"
          r="9"
          :fill="colors[1]"
        >
          <animate
            attributeName="r"
            values="8;10;8"
            :dur="`${1.5 / animationSpeed}s`"
            repeatCount="indefinite"
            begin="1.125s"
          />
        </circle>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Border19Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: '#00000000' },
    showBlocks: { type: Boolean, default: true },
    showAccents: { type: Boolean, default: true },
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