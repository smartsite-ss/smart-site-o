<template>
  <svg
    class="border01-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <polygon
      :stroke="borderColor"
      stroke-width="1"
      fill="transparent"
      :points="zPolygon"
    />

    <!-- 左上角 -->
    <g>
      <polygon
        :fill="showAnimation ? undefined : colors[0]"
        :stroke="borderColor"
        stroke-width="1"
        points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[0]};${colors[1]};${colors[0]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="showAnimation ? undefined : colors[1]"
        :stroke="borderColor"
        stroke-width="1"
        points="27.6,4.8 38.4,4.8 35.4,7.8 30.6,7.8"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[1]};${colors[0]};${colors[1]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>

    <!-- 右上角 -->
    <g :transform="`translate(${w}, 0) scale(-1, 1)`">
      <polygon
        :fill="showAnimation ? undefined : colors[0]"
        :stroke="borderColor"
        stroke-width="1"
        points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[0]};${colors[1]};${colors[0]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="showAnimation ? undefined : colors[1]"
        :stroke="borderColor"
        stroke-width="1"
        points="27.6,4.8 38.4,4.8 35.4,7.8 30.6,7.8"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[1]};${colors[0]};${colors[1]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>

    <!-- 左下角 -->
    <g :transform="`translate(0, ${h}) scale(1, -1)`">
      <polygon
        :fill="showAnimation ? undefined : colors[0]"
        :stroke="borderColor"
        stroke-width="1"
        points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[0]};${colors[1]};${colors[0]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="showAnimation ? undefined : colors[1]"
        :stroke="borderColor"
        stroke-width="1"
        points="27.6,4.8 38.4,4.8 35.4,7.8 30.6,7.8"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[1]};${colors[0]};${colors[1]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>

    <!-- 右下角 -->
    <g :transform="`translate(${w}, ${h}) scale(-1, -1)`">
      <polygon
        :fill="showAnimation ? undefined : colors[0]"
        :stroke="borderColor"
        stroke-width="1"
        points="6,66 6,18 12,12 18,12 24,6 27,6 30,9 36,9 39,6 84,6 81,9 75,9 73.2,7 40.8,7 37.8,10.2 24,10.2 12,21 12,24 9,27 9,51 7.8,54 7.8,63"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[0]};${colors[1]};${colors[0]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        :fill="showAnimation ? undefined : colors[1]"
        :stroke="borderColor"
        stroke-width="1"
        points="27.6,4.8 38.4,4.8 35.4,7.8 30.6,7.8"
      >
        <animate
          v-if="showAnimation"
          attributeName="fill"
          :values="`${colors[1]};${colors[0]};${colors[1]}`"
          :dur="`${dur}s`"
          begin="0s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>

  </svg>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'Border01Graphic',
  props: {
    w: {
      type: Number,
      default: 400,
    },
    h: {
      type: Number,
      default: 300,
    },
    colors: {
      type: Array as () => string[],
      required: true,
    },
    backgroundColor: {
      type: String,
      default: 'transparent',
    },
    borderColor: {
      type: String,
      default: 'transparent',
    },
    dur: {
      type: Number,
      default: 3,
    },
    showAnimation: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const zPolygon = computed(() => {
      const W = props.w;
      const H = props.h;
      const points = `10,27 10,${H - 27} 13,${H - 24} 13,${H - 21} 24,${H - 11} 38,${H - 11} 41,${H - 8} 73,${H - 8} 75,${H - 10} 81,${H - 10} 85,${H - 6} ${W - 85},${H - 6} ${W - 81},${H - 10} ${W - 75},${H - 10} ${W - 73},${H - 8} ${W - 41},${H - 8} ${W - 38},${H - 11} ${W - 13},${H - 21} ${W - 13},${H - 24} ${W - 10},${H - 27} ${W - 10},27 ${W - 13},25 ${W - 13},21 ${W - 24},11 ${W - 38},11 ${W - 41},8 ${W - 73},8 ${W - 75},10 ${W - 81},10 ${W - 85},6 85,6 81,10 75,10 73,8 41,8 38,11 24,11 13,21 13,24`;
      return points;
    });

    return { zPolygon };
  },
});
</script>

<style scoped>
.border01-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>