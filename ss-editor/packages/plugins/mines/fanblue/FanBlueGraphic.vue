<template>
  <svg
    class="fanblue-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 1024 1024`"
  >
    <g
      :transform="'rotate(' + roate + ')'"
      :class="effectiveCls"
    >
      <path
        d="M510.379 1019.568c-68.427 0-134.828-13.41-197.359-39.859-60.378-25.537-114.595-62.089-161.144-108.638-46.549-46.549-83.1-100.766-108.638-161.144C16.79 647.396 3.379 580.995 3.379 512.568S16.79 377.74 43.238 315.209c25.538-60.378 62.089-114.595 108.638-161.144 46.549-46.549 100.765-83.1 161.144-108.638C375.551 18.979 441.952 5.568 510.379 5.568s134.828 13.411 197.359 39.859c60.378 25.538 114.595 62.089 161.144 108.638 46.549 46.549 83.101 100.765 108.638 161.144 26.449 62.531 39.859 128.933 39.859 197.359s-13.41 134.828-39.859 197.359c-25.537 60.378-62.089 114.595-108.638 161.144s-100.766 83.101-161.144 108.638c-62.531 26.449-128.932 39.859-197.359 39.859z m0-934c-235.449 0-427 191.551-427 427 0 235.448 191.551 427 427 427 235.448 0 427-191.552 427-427s-191.552-427-427-427z"
        :fill="colors[2]"
      />
      <path
        d="M887.032 475.393H683.844c35.259-41.115 54.492-92.893 54.492-147.63 0-60.686-23.633-117.739-66.544-160.65-42.912-42.912-99.965-66.544-160.651-66.544-22.091 0-40 17.909-40 40v199.619c-40.799-34.215-91.809-52.86-145.692-52.86-60.686 0-117.739 23.632-160.65 66.544-42.912 42.911-66.544 99.964-66.544 160.65 0 22.092 17.909 40 40 40h199.313c-35.258 41.114-54.492 92.893-54.492 147.63 0 60.686 23.632 117.739 66.543 160.65 42.912 42.911 99.965 66.544 160.65 66.544 22.091 0 40-17.908 40-40V686.404c41.42 36.33 93.966 56.183 149.568 56.183 60.686 0 117.739-23.633 160.65-66.544s66.544-99.965 66.544-160.65c0.001-22.092-17.907-40-39.999-40z m-335.89-289.302c61.785 17.471 107.194 74.37 107.194 141.672s-45.409 124.201-107.194 141.672V186.091zM325.449 367.328c67.302 0 124.201 45.408 141.672 107.194H183.777c17.471-61.786 74.37-107.194 141.672-107.194zM470.27 843.823c-61.786-17.471-107.194-74.369-107.194-141.672S408.484 577.95 470.27 560.479v283.344z m229.568-181.236c-67.303 0-124.201-45.408-141.672-107.194H841.51c-17.471 61.786-74.369 107.194-141.672 107.194z"
        :fill="colors[1]"
      />
      <path
        d="M512.02 515.968m-106.584 0a106.584 106.584 0 1 0 213.168 0 106.584 106.584 0 1 0-213.168 0Z"
        fill="#FFFFFF"
      />
      <path
        d="M512.02 662.552c-80.826 0-146.583-65.757-146.583-146.584s65.757-146.584 146.583-146.584c80.827 0 146.584 65.757 146.584 146.584S592.847 662.552 512.02 662.552z m0-213.168c-36.714 0-66.583 29.87-66.583 66.584 0 36.715 29.869 66.584 66.583 66.584 36.715 0 66.584-29.869 66.584-66.584s-29.87-66.584-66.584-66.584z"
        :fill="colors[0]"
      />
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
.fanblue-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

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