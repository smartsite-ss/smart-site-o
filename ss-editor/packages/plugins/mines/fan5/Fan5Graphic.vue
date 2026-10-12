<template>
  <svg
    class="fan5-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 71 104`"
    fill="none"
  >
    <desc>风机</desc>
    <g :transform="'rotate(' + (roate) + ')'">
      <path
        id="path-bu"
        d="M11.978 41.5023L11.978 3.32018L16.8386 2.53896L22.5672 1.95305L28.9902 1.56244L32.2885 1.46478L39.2323 1.46478L46.0024 1.75774L52.0782 2.246L57.2861 2.92957L59.5428 3.32018L59.5428 41.5023L54.6822 42.2836L48.9536 42.8695L42.5305 43.2601L39.2323 43.3577L32.2885 43.3577L25.8655 43.0648L19.6161 42.4789L14.4083 41.7953L11.978 41.5023Z"
        fill-rule="nonzero"
        :fill="colors[0]"
      />
      <path
        id="path-bu"
        d="M11.978 3.32018L16.8386 2.53896L22.5672 1.95305L28.9902 1.56244L32.2885 1.46478L39.2323 1.46478L46.0024 1.75774L52.0782 2.246L57.2861 2.92957L59.5428 3.32018L59.5428 41.5023L54.6822 42.2836L48.9536 42.8695L42.5305 43.2601L39.2323 43.3577L32.2885 43.3577L25.8655 43.0648L19.6161 42.4789L14.4083 41.7953L11.978 41.5023L11.978 3.32018Z"
        stroke="#000000"
        stroke-width="0.250000"
      />
      <g
        :class="effectiveCls"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <path
          id="path-roate"
          d="M5.52136 72.8974L65.4786 65L67.4445 65.7179L68.8205 66.5385L69.6068 67.6667L70 69L69.8034 70.1282L69.0171 71.2564L67.641 72.282L66.0684 73L5.71796 65.1026L3.75214 65.8205L2.37607 66.641L1.19659 67.7692L1 69L1.19659 70.1282L2.37607 71.2564L3.75214 72.282L5.52136 72.8974Z"
          fill-rule="nonzero"
          :fill="colors[0]"
        />
        <path
          id="path-roate"
          d="M65.4786 65L67.4445 65.7179L68.8205 66.5385L69.6068 67.6667L70 69L69.8034 70.1282L69.0171 71.2564L67.641 72.282L66.0684 73L5.71796 65.1026L3.75214 65.8205L2.37607 66.641L1.19659 67.7692L1 69L1.19659 70.1282L2.37607 71.2564L3.75214 72.282L5.52136 72.8974L65.4786 65Z"
          stroke="#000000"
          stroke-width="0.250000"
        />
      </g>
      <path
        id="path-gan"
        d="M35.6153 43.268L35.6153 68.6577"
        :stroke="colors[1]"
        stroke-width="4.000000"
      />
      <defs>
        <clipPath id="clip48_934">
          <rect
            id="fan5"
            width="71.000000"
            height="104.000000"
            fill="white"
          />
        </clipPath>
      </defs>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  dur: number;
  roate: number;
  cls: string;
  backgroundColor: string;
  colors: string[];
  flowColor: string[];
  pipeColor: string[];
  bgWidth: number;
  boardWidth: number;
  dataset: number;
  status: number;
  forwardValue: string;
  backwardValue: string;
  stopValue: string;
  defaultCls: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 动画方向：绑定实时值 → cls 映射，未绑定沿用静态 cls */
const effectiveCls = computed(() => {
  if (!props.tagId) return props.cls;
  const raw = currentValue.value;
  const rawStr = raw === null || raw === undefined ? '' : String(raw);
  if (props.forwardValue !== '' && rawStr === props.forwardValue) return 'svg_an_left';
  if (props.backwardValue !== '' && rawStr === props.backwardValue) return 'svg_an_right';
  if (props.stopValue !== '' && rawStr === props.stopValue) return 'svg_an_stop';
  return props.defaultCls;
});
</script>

<style scoped>
.fan5-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: ani_fill_left var(--ani-dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_left var(--ani-dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
}

.svg_an_right {
  animation: ani_fill_right var(--ani-dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_right var(--ani-dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
}

.svg_an_stop {
  animation: ani_fill_stop var(--ani-dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_stop var(--ani-dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
}

@keyframes ani_fill_right {
  from {
    transform: rotateZ(0deg);
  }
  to {
    transform: rotateZ(360deg);
  }
}

@keyframes ani_fill_left {
  from {
    transform: rotateZ(360deg);
  }
  to {
    transform: rotateZ(0deg);
  }
}

@keyframes ani_fill_stop {
}
</style>