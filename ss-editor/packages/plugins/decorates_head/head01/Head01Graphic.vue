<template>
  <svg
    :width="w"
    :height="h"
  >
    <rect
      :x="0"
      :y="h / 2"
      :width="w"
      :height="lineHeight"
      :fill="colors[0]"
    >
      <animate
        attributeName="width"
        from="0"
        :to="w"
        :dur="`${dur}s`"
        calcMode="spline"
        keyTimes="0;1"
        keySplines=".42,0,.58,1"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      :x="0"
      :y="h / 2"
      :width="endWidth"
      :height="lineHeight"
      :fill="colors[1]"
    >
      <animate
        attributeName="x"
        from="0"
        :to="w"
        :dur="`${dur}s`"
        calcMode="spline"
        keyTimes="0;1"
        keySplines="0.42,0,0.58,1"
        repeatCount="indefinite"
      />
    </rect>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Head01Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 30 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: 'transparent' },
    dur: { type: Number, default: 3 },
    lineHeight: { type: Number, default: 2 },
    endWidth: { type: Number, default: 5 },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>