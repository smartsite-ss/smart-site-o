<template>
  <svg
    class="border03-graphic"
    :width="w"
    :height="h"
    :viewBox="`0 0 ${w} ${h}`"
  >
    <defs>
      <filter
        :id="filterId"
        height="150%"
        width="150%"
        x="-25%"
        y="-25%"
      >
        <feMorphology
          operator="dilate"
          radius="1"
          in="SourceAlpha"
          result="thicken"
        />
        <feGaussianBlur
          in="thicken"
          stdDeviation="2"
          result="blurred"
        />
        <feFlood
          :flood-color="alpha(colors[1], 0.7)"
          result="glowColor"
        />
        <feComposite
          in="glowColor"
          in2="blurred"
          operator="in"
          result="softGlowColored"
        />
        <feMerge>
          <feMergeNode in="softGlowColored" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <path
      v-if="w && h"
      :fill="backgroundColor"
      stroke-width="2"
      :stroke="colors[0]"
      :d="`
        M15 5 L ${w - 15} 5 Q ${w - 5} 5, ${w - 5} 15
        L ${w - 5} ${h - 15} Q ${w - 5} ${h - 5}, ${w - 15} ${h - 5}
        L 15, ${h - 5} Q 5 ${h - 5} 5 ${h - 15} L 5 15
        Q 5 5 15 5
      `"
    />

    <path
      stroke-width="2"
      fill="transparent"
      stroke-linecap="round"
      :filter="`url(#${filterId})`"
      :stroke="colors[1]"
      :d="`M 20 5 L 15 5 Q 5 5 5 15 L 5 20`"
    />

    <path
      stroke-width="2"
      fill="transparent"
      stroke-linecap="round"
      :filter="`url(#${filterId})`"
      :stroke="colors[1]"
      :d="`M ${w - 20} 5 L ${w - 15} 5 Q ${w - 5} 5 ${w - 5} 15 L ${w - 5} 20`"
    />

    <path
      stroke-width="2"
      fill="transparent"
      stroke-linecap="round"
      :filter="`url(#${filterId})`"
      :stroke="colors[1]"
      :d="`
        M ${w - 20} ${h - 5} L ${w - 15} ${h - 5}
        Q ${w - 5} ${h - 5} ${w - 5} ${h - 15}
        L ${w - 5} ${h - 20}
      `"
    />

    <path
      stroke-width="2"
      fill="transparent"
      stroke-linecap="round"
      :filter="`url(#${filterId})`"
      :stroke="colors[1]"
      :d="`
        M 20 ${h - 5} L 15 ${h - 5}
        Q 5 ${h - 5} 5 ${h - 15}
        L 5 ${h - 20}
      `"
    />
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

function alpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default defineComponent({
  name: 'Border03Graphic',
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
  },
  setup() {
    const filterId = `border03-filter-${crypto.randomUUID()}`;
    return { filterId, alpha };
  },
});
</script>

<style scoped>
.border03-graphic {
  width: 100%;
  height: 100%;
  display: block;
}
</style>