<script setup lang="ts">
import { ref } from 'vue';

const _props = defineProps({
  w: Number,
  h: Number,
  colors: Array as () => string[],
  dur: Number,
});

const uid = ref(crypto.randomUUID().slice(0, 8));
const animationId1 = `h5ani1${uid.value}`;
const animationId2 = `h5ani2${uid.value}`;
const animationId3 = `h5ani3${uid.value}`;
const animationId4 = `h5ani4${uid.value}`;
const animationId5 = `h5ani5${uid.value}`;
const animationId6 = `h5ani6${uid.value}`;
const animationId7 = `h5ani7${uid.value}`;
</script>

<template>
  <svg
    :width="w"
    :height="h"
  >
    <polyline
      :stroke="colors[1]"
      stroke-width="2"
      :points="`0, ${h/2} ${w}, ${h/2}`"
    />
    <polyline
      :stroke="colors[0]"
      stroke-width="2"
      :points="`5, ${h/2} ${w*0.2-3}, ${h/2}`"
      :stroke-dasharray="`0, ${w*0.2}`"
      fill="freeze"
    >
      <animate
        :id="animationId2"
        attributeName="stroke-dasharray"
        :values="`0, ${w*0.2};${w*0.2}, 0;`"
        :dur="dur"
        :begin="`${animationId1}.end`"
        fill="freeze"
      />
      <animate
        attributeName="stroke-dasharray"
        :values="`${w*0.2}, 0;0, ${w*0.2}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </polyline>
    <polyline
      :stroke="colors[0]"
      stroke-width="2"
      :points="`${w*0.2+3}, ${h/2} ${w*0.8-3}, ${h/2}`"
      :stroke-dasharray="`0, ${w*0.6}`"
    >
      <animate
        :id="animationId4"
        attributeName="stroke-dasharray"
        :values="`0, ${w*0.6};${w*0.6}, 0`"
        :dur="dur"
        :begin="`${animationId3}.end + 1s`"
        fill="freeze"
      />
      <animate
        attributeName="stroke-dasharray"
        :values="`${w*0.6}, 0;0, ${w*0.6}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </polyline>
    <polyline
      :stroke="colors[0]"
      stroke-width="2"
      :points="`${w*0.8+3}, ${h/2} ${w-5}, ${h/2}`"
      :stroke-dasharray="`0, ${w*0.2}`"
    >
      <animate
        :id="animationId6"
        attributeName="stroke-dasharray"
        :values="`0, ${w*0.2};${w*0.2}, 0`"
        :dur="dur"
        :begin="`${animationId5}.end + 1s`"
        fill="freeze"
      />
      <animate
        attributeName="stroke-dasharray"
        :values="`${w*0.2}, 0;0, ${w*0.3}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </polyline>
    <circle
      cx="2"
      :cy="h/2"
      r="2"
      :fill="colors[1]"
    >
      <animate
        :id="animationId1"
        attributeName="fill"
        :values="`${colors[1]};${colors[0]}`"
        :begin="`0s;${animationId7}.end`"
        dur="0.3s"
        fill="freeze"
      />
    </circle>
    <circle
      :cx="w*0.2"
      :cy="h/2"
      r="2"
      :fill="colors[1]"
    >
      <animate
        :id="animationId3"
        attributeName="fill"
        :values="`${colors[1]};${colors[0]}`"
        :begin="`${animationId2}.end`"
        dur="0.3s"
        fill="freeze"
      />
      <animate
        attributeName="fill"
        :values="`${colors[1]};${colors[1]}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </circle>
    <circle
      :cx="w*0.8"
      :cy="h/2"
      r="2"
      :fill="colors[1]"
    >
      <animate
        :id="animationId5"
        attributeName="fill"
        :values="`${colors[1]};${colors[0]}`"
        :begin="`${animationId4}.end`"
        dur="0.3s"
        fill="freeze"
      />
      <animate
        attributeName="fill"
        :values="`${colors[1]};${colors[1]}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </circle>
    <circle
      :cx="w-2"
      :cy="h/2"
      r="2"
      :fill="colors[1]"
    >
      <animate
        :id="animationId7"
        attributeName="fill"
        :values="`${colors[1]};${colors[0]}`"
        :begin="`${animationId6}.end`"
        dur="0.3s"
        fill="freeze"
      />
      <animate
        attributeName="fill"
        :values="`${colors[1]};${colors[1]}`"
        dur="0.01s"
        :begin="`${animationId7}.end`"
        fill="freeze"
      />
    </circle>
  </svg>
</template>