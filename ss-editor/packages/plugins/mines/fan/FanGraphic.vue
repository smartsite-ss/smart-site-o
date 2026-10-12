<template>
  <svg
    class="fan-graphic"
    :width="w"
    :height="h"
    :title="bindTitle"
    :viewBox="`0 0 40.8584 68.1477`"
  >
    <desc>风机</desc>
    <g :transform=" 'rotate(' + (roate) + ')' + ' scale(' + '1' + ')' ">
      <path
        id="path"
        d="M14.9882 32.9411L23.0706 32.9411L23.0706 68.1477L14.9882 68.1477L14.9882 32.9411Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_939_0)"
      />
      <path
        id="path"
        d="M13.8335 33.6181L24.2253 33.6181L24.2253 39.7116L13.8335 39.7116L13.8335 33.6181Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_940_0)"
      />
      <path
        id="path-roate"
        d="M14.6583 55.9608L23.6025 55.9608L23.6025 67.9544L14.6583 67.9544L14.6583 55.9608Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_941_0)"
      />
      <g
        :class="effectiveCls"
        :style="{ '--dur': dur + 's', '--roate': roate }"
        style="transform-box:fill-box; transform-origin:center;"
      >
        <path
          id="path-roate"
          d="M23.4883 58.5406C23.4883 58.5406 27.0089 59.1063 34.05 56.9565C40.6155 55.033 44.6118 62.9533 35.6676 66.6872C35.6676 66.6872 28.0555 68.7238 23.4883 64.6505L23.4883 58.5406Z"
          fill-rule="evenodd"
          fill="url(#paint_linear_48_942_0)"
        />
        <path
          id="path-roate"
          d="M17.3701 58.5632C17.3701 58.5632 13.8495 59.1289 6.80833 56.9791C0.242905 55.0556 -3.75343 62.9759 5.19077 66.7098C5.19077 66.7098 12.8029 68.7465 17.3701 64.6732L17.3701 58.5632Z"
          fill-rule="evenodd"
          fill="url(#paint_linear_48_943_0)"
        />
      </g>
      <path
        id="path"
        d="M10.7229 6.36382L26.9212 6.36382L26.9212 10.1971L10.7229 10.1971L10.7229 6.36382Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_944_0)"
      />
      <path
        id="path"
        d="M7.31073 7.89716L30.3142 7.89716L30.3142 30.1305L7.31073 30.1305L7.31073 7.89716Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_945_0)"
      />
      <path
        id="path"
        d="M7.31073 26.836L30.3142 26.836L30.3142 31.3031L7.31073 31.3031L7.31073 26.836Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_954_0)"
      />
      <path
        id="path"
        d="M6.35226 29.6614L31.1768 29.6614C31.7519 29.6614 32.1353 30.1081 32.1353 30.6665L32.1353 33.1234C32.1353 33.7935 31.7519 34.2402 31.1768 34.2402L6.35226 34.2402C5.87302 34.2402 5.39378 33.7935 5.39378 33.1234L5.39378 30.6665C5.39378 30.1081 5.87302 29.6614 6.35226 29.6614Z"
        fill-rule="evenodd"
        fill="url(#paint_linear_48_955_0)"
      />
      <defs>
        <clipPath id="clip48_938">
          <rect
            id="fan"
            width="40.858383"
            height="68.147720"
            fill="white"
          />
        </clipPath>
        <linearGradient
          id="paint_linear_48_939_0"
          x1="23.070650"
          y1="32.941051"
          x2="14.988176"
          y2="32.941051"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_940_0"
          x1="24.225281"
          y1="33.618095"
          x2="13.833528"
          y2="33.618095"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_941_0"
          x1="23.602467"
          y1="55.960815"
          x2="14.658265"
          y2="55.960815"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#A7B1B4" />
          <stop
            offset="0.150000"
            stop-color="#DCE9EC"
          />
          <stop
            offset="0.250000"
            stop-color="#ECF2F4"
          />
          <stop
            offset="0.440000"
            stop-color="#BFCACE"
          />
          <stop
            offset="0.600000"
            stop-color="#AAB4B7"
          />
          <stop
            offset="0.800000"
            stop-color="#8F979A"
          />
          <stop
            offset="0.970000"
            stop-color="#828A8D"
          />
          <stop
            offset="1.000000"
            stop-color="#AEB8BB"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_942_0"
          x1="37.760944"
          y1="70.307915"
          x2="26.342808"
          y2="53.335800"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_943_0"
          x1="10.709535"
          y1="70.330528"
          x2="5.951972"
          y2="54.489880"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_944_0"
          x1="26.921154"
          y1="6.363792"
          x2="10.722902"
          y2="6.363792"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_945_0"
          x1="30.314171"
          y1="7.897132"
          x2="7.310730"
          y2="7.897132"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_954_0"
          x1="30.314171"
          y1="26.835995"
          x2="7.310730"
          y2="26.835995"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#A7B1B4" />
          <stop
            offset="0.150000"
            stop-color="#DCE9EC"
          />
          <stop
            offset="0.250000"
            stop-color="#ECF2F4"
          />
          <stop
            offset="0.440000"
            stop-color="#BFCACE"
          />
          <stop
            offset="0.600000"
            stop-color="#AAB4B7"
          />
          <stop
            offset="0.800000"
            stop-color="#8F979A"
          />
          <stop
            offset="0.970000"
            stop-color="#828A8D"
          />
          <stop
            offset="1.000000"
            stop-color="#AEB8BB"
          />
        </linearGradient>
        <linearGradient
          id="paint_linear_48_955_0"
          x1="32.135281"
          y1="29.661423"
          x2="5.393785"
          y2="29.661423"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#BAC0C1" />
          <stop
            offset="0.150000"
            stop-color="#F4FAFC"
          />
          <stop
            offset="0.250000"
            stop-color="#F8FCFD"
          />
          <stop
            offset="0.440000"
            stop-color="#D5DBDD"
          />
          <stop
            offset="0.600000"
            stop-color="#BDC3C4"
          />
          <stop
            offset="0.800000"
            stop-color="#A0A4A6"
          />
          <stop
            offset="0.970000"
            stop-color="#929697"
          />
          <stop
            offset="1.000000"
            stop-color="#C2C7C9"
          />
        </linearGradient>
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
  colors: string[];
  flowColor: string[];
  pipeColor: string[];
  backgroundColor: string;
  bgWidth: number;
  boardWidth: number;
  roate: number;
  cls: string;
  dur: number;
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
  if (props.forwardValue !== '' && rawStr === props.forwardValue) return 'svg_an_left';
  if (props.backwardValue !== '' && rawStr === props.backwardValue) return 'svg_an_right';
  if (props.stopValue !== '' && rawStr === props.stopValue) return 'svg_an_stop';
  return props.defaultCls;
});
</script>

<style scoped>
.fan-graphic {
  width: 100%;
  height: 100%;
  display: block;
}

.svg_an_left {
  animation: ani_fill_right var(--dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_right var(--dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
  transform: rotateZ(var(--roate, 0deg));
}

.svg_an_right {
  animation: ani_fill_right var(--dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_right var(--dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
  transform: rotateZ(var(--roate, 0deg));
}

.svg_an_stop {
  animation: ani_fill_stop var(--dur, 5s) linear infinite;
  animation-fill-mode: forwards;
  -webkit-animation: ani_fill_stop var(--dur, 5s) linear infinite;
  -webkit-animation-fill-mode: forwards;
}

@keyframes ani_fill_right {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}

@keyframes ani_fill_left {
  from {
    transform: rotateY(360deg);
  }
  to {
    transform: rotateZ(0deg);
  }
}

@keyframes ani_fill_stop {
}
</style>