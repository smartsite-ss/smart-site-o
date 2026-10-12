<template>
  <svg
    class="draughtfan-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`190 -170 599 560`"
  >
    <g :transform="'rotate(' + roate + ')'">
      <path
        class="st0"
        d="M706,44.4L582.8-49.9l0,0c-24-21.9-47.2-34.2-72.7-37.5l-299.3-2.7V99.6h122.4
        c5.5,85,76.4,152.8,163.1,152.8s157.6-67.8,163.1-152.8l0,0c1.6-19-0.4-36.8-4.8-53.5L706,44.4z"
      />
      <polygon
        class="st1"
        points="210.8,99.6 210.8,-90.4 328.8,13.9 328.8,99.9"
      />
      <polygon
        class="st2"
        points="376.4,201.9 507.5,317 472.6,180.9"
      />
      <path
        class="st1"
        d="M629.8,17l-301-3v189.6h122.4c5.5,85,76.4,152.8,163.1,152.8s157.6-67.8,163.1-152.8l0,0
        C786.5,96.6,711.8,24.3,629.8,17z"
      />
      <circle
        class="st3"
        cx="616.8"
        cy="202.9"
        r="132.3"
      />
      <circle
        class="st2"
        cx="616.8"
        cy="202.9"
        r="107.7"
      />
      <g :class="effectiveCls">
        <path
          class="st4"
          d="M610.8,202.6c0,0-4.4-35.6-4.3-47.5c0-11.2-2.6-35.7,4.3-44.5c7.2-9.1,35.3-11.3,59,6.5
          c0,0-30.8,15.2-37,42c-5.8,25-10,43.8-10,43.8L610.8,202.6z"
        />
        <path
          class="st4"
          d="M613.5,207.9c0,0-33-14-43.3-20c-9.7-5.6-32.2-15.6-36.4-26c-4.3-10.8,7.9-36.2,35.1-47.8
          c0,0-2.2,34.3,17.9,53c18.8,17.5,32.9,30.6,32.9,30.6L613.5,207.9z"
        />
        <path
          class="st4"
          d="M619.5,208.3c0,0-28.6,21.6-39,27.5c-9.7,5.6-29.7,20.1-40.7,18.5
          c-11.5-1.7-27.4-25-23.9-54.3c0,0,28.6,19.1,54.9,11c24.5-7.5,43-13.2,43-13.2L619.5,208.3z"
        />
        <path
          class="st4"
          d="M622.7,203.3c0,0,4.4,35.6,4.3,47.5c0,11.2,2.6,35.7-4.3,44.5c-7.2,9.1-35.3,11.3-59-6.5
          c0,0,30.8-15.2,37-42c5.8-25,10-43.8,10-43.8L622.7,203.3z"
        />
        <path
          class="st4"
          d="M620,197.9c0,0,33,14,43.3,20c9.7,5.6,32.2,15.6,36.4,26c4.3,10.8-7.9,36.2-35.1,47.8
          c0,0,2.2-34.3-17.9-53c-18.8-17.5-32.9-30.6-32.9-30.6L620,197.9z"
        />
        <path
          class="st4"
          d="M614.1,197.6c0,0,28.6-21.6,39-27.5c9.7-5.6,29.7-20.1,40.7-18.5c11.5,1.7,27.4,25,23.9,54.3
          c0,0-28.6-19.1-54.9-11c-24.5,7.5-43,13.2-43,13.2L614.1,197.6z"
        />
      </g>
      <polygon
        class="st2"
        points="210.8,95.6 328.8,95.6 328.8,203.6"
      />
      <circle
        class="st1"
        cx="616.8"
        cy="202.9"
        r="25.6"
      />
      <circle
        class="st3"
        cx="617.8"
        cy="204.9"
        r="25.6"
      />
      <circle
        cx="616.8"
        cy="202.9"
        r="7.3"
      />
      <path
        class="st5"
        d="M204.8-113.2L204.8-113.2l-4,1l2.9,7.8l1.1-0.4v207.9l133.3,116.5l0.8,5.2l3.9-1V8.4
        L204.8-113.2z M322.8,179.8l-98-85.8V-69l98,86.4V179.8z"
      />
      <g>
        <path
          class="st6"
          d="M339,224.8L200.8,104.1v-216.3L339,9.4V224.8z M220.8,95.1l98.2,85.8V18.5l-98.2-86.4V95.1z"
        />
      </g>
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
  dataset: number;
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
  if (props.forwardValue !== '' && rawStr === props.forwardValue) return 'svg_pool_fill_left';
  if (props.backwardValue !== '' && rawStr === props.backwardValue) return 'svg_pool_fill_right';
  if (props.stopValue !== '' && rawStr === props.stopValue) return 'svg_pool_fill_stop';
  return props.defaultCls;
});
</script>

<style scoped>
.draughtfan-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.st0 { fill: #6C98F1; }
.st1 { fill: #496FB5; }
.st2 { fill: #1F426E; }
.st3 { fill: #6191E9; }
.st4 { fill: v-bind('colors[0]'); }
.st5 { fill: #2F5C94; }
.st6 { fill: #182B42; }

.svg_pool_fill_stop {
  transform-box: fill-box;
  transform-origin: center 50%;
}

.svg_pool_fill_left {
  animation: ani_fill_h40_left v-bind(dur + 's') linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_h40_left v-bind(dur + 's') linear infinite;
  -webkit-animation-fill-mode: forwards;
  transform-box: fill-box;
  transform-origin: center 50%;
}

.svg_pool_fill_right {
  animation: ani_fill_h40_right v-bind(dur + 's') linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_h40_right v-bind(dur + 's') linear infinite;
  -webkit-animation-fill-mode: forwards;
  transform-box: fill-box;
  transform-origin: center 50%;
}

@keyframes ani_fill_h40_right {
  from {
    transform: rotateZ(360deg);
  }
  to {
    transform: rotateZ(0deg);
  }
}

@keyframes ani_fill_h40_left {
  from {
    transform: rotateZ(0deg);
  }
  to {
    transform: rotateZ(360deg);
  }
}
</style>