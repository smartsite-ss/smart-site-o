<template>
  <svg
    class="fuse-graphic"
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
      <circle
        :cx="0"
        :cy="terminalYTop"
        :r="terminalRadius"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
      />
      <line
        x1="0"
        :y1="terminalYTop + terminalRadius"
        x2="0"
        :y2="boxTopY"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <rect
        x="-boxW / 2"
        :y="boxTopY"
        :width="boxW"
        :height="boxH"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth"
        rx="1.5"
      />
      <path
        :d="fuseElementPath"
        fill="none"
        :stroke="color"
        :stroke-width="lineWidth * 0.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <line
        x1="0"
        :y1="boxBottomY"
        x2="0"
        :y2="terminalYBottom - terminalRadius"
        :stroke="color"
        :stroke-width="lineWidth"
        stroke-linecap="round"
      />
      <circle
        :cx="0"
        :cy="terminalYBottom"
        :r="terminalRadius"
        :fill="'none'"
        :stroke="color"
        :stroke-width="lineWidth"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'FuseGraphic',
  props: {
    w: { type: Number, default: 30 },
    h: { type: Number, default: 60 },
    color: { type: String, default: '#ff8c00' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const terminalRadius = computed(() => 3);
    const terminalYTop = computed(() => terminalRadius.value + 4);
    const terminalYBottom = computed(() => props.h - terminalRadius.value - 4);
    const boxW = computed(() => props.w * 0.65);
    const boxH = computed(() => props.h * 0.4);
    const boxTopY = computed(() => terminalYTop.value + terminalRadius.value + (props.h * 0.08));
    const boxBottomY = computed(() => boxTopY.value + boxH.value);
    const fuseElementPath = computed(() => {
      const cy = boxTopY.value + boxH.value / 2;
      const halfW = boxW.value / 2 * 0.55;
      const amp = boxH.value * 0.22;
      return `M ${-halfW} ${cy - amp * 1.2} Q ${-halfW * 0.4} ${cy} ${0} ${cy - amp * 0.5} Q ${halfW * 0.4} ${cy} ${halfW} ${cy - amp * 1.2}`;
    });

    return { cx, terminalRadius, terminalYTop, terminalYBottom, boxW, boxH, boxTopY, boxBottomY, fuseElementPath };
  },
});
</script>

<style scoped>
.fuse-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
