<template>
  <svg
    class="ups-graphic"
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
    <g>
      <rect
        x="2"
        y="2"
        :width="w - 4"
        :height="h - 4"
        rx="3"
        ry="3"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="lineWidth"
      />
      <text
        x="cx"
        :y="labelY"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="strokeColor"
        :font-size="labelFontSize"
        font-family="Arial, sans-serif"
        font-weight="bold"
      >UPS</text>
      <g :transform="`translate(${cx}, ${batteryCenterY})`">
        <line
          :x1="-batteryW / 2 + 1"
          y1="-batteryH / 2"
          :x2="batteryW / 2 - 1"
          :y2="-batteryH / 2"
          :stroke="strokeColor"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
        <line
          :x1="-batteryW * 0.25"
          y1="-batteryH / 2 - 2"
          :x2="-batteryW * 0.25"
          :y2="-batteryH / 2 - 5"
          :stroke="strokeColor"
          :stroke-width="lineWidth * 0.8"
          stroke-linecap="round"
        />
        <line
          :x1="-batteryW / 2 + 2"
          y1="0"
          :x2="batteryW / 2 - 2"
          :y2="0"
          :stroke="strokeColor"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
        <line
          :x1="-batteryW / 2 + 4"
          :y1="batteryH / 2"
          :x2="batteryW / 2 - 4"
          :y2="batteryH / 2"
          :stroke="strokeColor"
          :stroke-width="lineWidth"
          stroke-linecap="round"
        />
      </g>
      <text
        x="cx"
        :y="acTextY"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="strokeColor"
        :font-size="acFontSize"
        font-family="Arial, sans-serif"
        font-style="italic"
      >~</text>
      <rect
        v-if="state === 'fault'"
        x="2"
        y="2"
        :width="w - 4"
        :height="h - 4"
        rx="3"
        ry="3"
        fill="none"
        stroke="#ef4444"
        :stroke-width="lineWidth"
        opacity="0.6"
      />
      <line
        v-if="state === 'bypass'"
        x1="2"
        :y1="h - 2"
        :x2="w - 2"
        y2="2"
        stroke="#f59e0b"
        :stroke-width="lineWidth"
        opacity="0.7"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'UpsGraphic',
  props: {
    w: { type: Number, default: 50 },
    h: { type: Number, default: 70 },
    color: { type: String, default: '#ca8a04' },
    backgroundColor: { type: String, default: 'transparent' },
    lineWidth: { type: Number, default: 2 },
    state: { type: String, default: 'online' },
  },
  setup(props) {
    const cx = computed(() => props.w / 2);
    const labelY = computed(() => props.h * 0.15);
    const labelFontSize = computed(() => Math.min(props.w, props.h) * 0.16);
    const batteryCenterY = computed(() => props.h * 0.45);
    const batteryW = computed(() => props.w * 0.45);
    const batteryH = computed(() => props.h * 0.25);
    const acTextY = computed(() => props.h * 0.75);
    const acFontSize = computed(() => Math.min(props.w, props.h) * 0.22);

    const strokeColor = computed(() => {
      if (props.state === 'fault') return '#ef4444';
      if (props.state === 'bypass') return '#f59e0b';
      return props.color;
    });

    return { cx, labelY, labelFontSize, batteryCenterY, batteryW, batteryH, acTextY, acFontSize, strokeColor };
  },
});
</script>

<style scoped>
.ups-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
