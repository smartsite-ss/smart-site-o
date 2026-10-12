<template>
  <svg
    class="insulator-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <rect
      v-if="backgroundColor && backgroundColor !== '#00000000'"
      :width="w"
      :height="h"
      :fill="backgroundColor"
    />
    <g :transform="`translate(${cx}, 0)`">
      <line
        x1="0"
        y1="0"
        x2="0"
        :y2="topDiskY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <ellipse
        cx="0"
        :cy="topDiskY + diskH / 2"
        :rx="diskR"
        :ry="diskH / 2"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <path
        :d="neckPathD"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <ellipse
        cx="0"
        :cy="bottomDiskY + diskH / 2"
        :rx="diskR"
        :ry="diskH / 2"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <line
        x1="0"
        :y1="bottomDiskY + diskH"
        x2="0"
        :y2="h"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'InsulatorGraphic',
  props: {
    w: { type: Number, default: 24 },
    h: { type: Number, default: 50 },
    color: { type: String, default: '#9ca3af' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const diskR = computed(() => props.w * 0.42);
    const diskH = computed(() => props.h * 0.18);
    const topDiskY = computed(() => props.h * 0.12);
    const bottomDiskY = computed(() => props.h - props.h * 0.12 - props.h * 0.18);
    const neckTopY = computed(() => topDiskY.value + diskH.value);
    const neckBottomY = computed(() => bottomDiskY.value);
    const neckR = computed(() => props.w * 0.15);
    const neckPathD = computed(() => {
      const nt = neckTopY.value;
      const nb = neckBottomY.value;
      const nr = neckR.value;
      const dr = diskR.value;
      return `M ${-dr} ${nt} Q ${-nr} ${(nt + nb) / 2} ${-dr} ${nb} M ${dr} ${nt} Q ${nr} ${(nt + nb) / 2} ${dr} ${nb}`;
    });

    return { cx, diskR, diskH, topDiskY, bottomDiskY, neckPathD };
  },
});
</script>

<style scoped>
.insulator-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
