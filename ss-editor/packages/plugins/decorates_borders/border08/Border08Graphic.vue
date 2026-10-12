<template>
  <div class="ss-border-box">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
    >
      <defs>
        <path
          :id="path"
          :d="pathD"
          fill="transparent"
        />
        <radialGradient
          :id="gradient"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stop-color="#fff"
            stop-opacity="1"
          />
          <stop
            offset="100%"
            stop-color="#fff"
            stop-opacity="0"
          />
        </radialGradient>

        <mask :id="mask">
          <circle
            cx="0"
            cy="0"
            r="150"
            :fill="`url(#${gradient})`"
          >
            <animateMotion
              :dur="`${dur}s`"
              :path="pathD"
              rotate="auto"
              repeatCount="indefinite"
            />
          </circle>
        </mask>
      </defs>

      <polygon
        :fill="backgroundColor"
        :points="`5, 5 ${w - 5}, 5 ${w - 5} ${h - 5} 5, ${h - 5}`"
      />

      <use
        :stroke="colors[0]"
        stroke-width="1"
        :href="`#${path}`"
      />

      <use
        :stroke="colors[1]"
        stroke-width="3"
        :href="`#${path}`"
        :mask="`url(#${mask})`"
      >
        <animate
          attributeName="stroke-dasharray"
          :from="`0, ${length}`"
          :to="`${length}, 0`"
          :dur="`${dur}s`"
          repeatCount="indefinite"
        />
      </use>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

function getUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default defineComponent({
  name: 'Border08Graphic',
  props: {
    w: { type: Number, default: 400 },
    h: { type: Number, default: 300 },
    colors: { type: Array as () => string[], required: true },
    backgroundColor: { type: String, default: 'transparent' },
    dur: { type: Number, default: 3 },
    reverse: { type: Boolean, default: false },
  },
  setup(props) {
    const path = `border-box-08-path-${getUUID()}`;
    const gradient = `border-box-08-gradient-${getUUID()}`;
    const mask = `border-box-08-mask-${getUUID()}`;

    const length = computed(() => {
      return (props.w + props.h - 5) * 2;
    });

    const pathD = computed(() => {
      if (props.reverse) {
        return `M 2.5, 2.5 L 2.5, ${props.h - 2.5} L ${props.w - 2.5}, ${
          props.h - 2.5
        } L ${props.w - 2.5}, 2.5 L 2.5, 2.5`;
      }
      return `M2.5, 2.5 L${props.w - 2.5}, 2.5 L${props.w - 2.5}, ${
        props.h - 2.5
      } L2.5, ${props.h - 2.5} L2.5, 2.5`;
    });

    return { path, gradient, mask, length, pathD };
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