<template>
  <svg
    :width="size || 24"
    :height="size || 24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      :stroke="rimColor"
      stroke-width="1.5"
      :fill="faceColor"
    />
    <path
      d="M 5.5 17.5 A 9 9 0 1 1 18.5 17.5"
      :stroke="arcColor"
      stroke-width="2"
      fill="none"
      stroke-linecap="round"
    />
    <line
      x1="12"
      y1="12"
      x2="16"
      y2="7"
      :stroke="needleColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <circle
      cx="12"
      cy="12"
      r="1.5"
      fill="#5D6D7E"
    />
    <line
      v-for="i in 5"
      :key="'major-'+i"
      :x1="12 + Math.cos(getAngle(i/6)) * 7"
      :y1="12 + Math.sin(getAngle(i/6)) * 7"
      :x2="12 + Math.cos(getAngle(i/6)) * 9"
      :y2="12 + Math.sin(getAngle(i/6)) * 9"
      :stroke="tickColor"
      stroke-width="1"
    />
    <text
      x="12"
      y="18"
      text-anchor="middle"
      :fill="valueColor"
      font-size="3"
      font-weight="bold"
    >50</text>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number;
  faceColor?: string;
  rimColor?: string;
  needleColor?: string;
  arcColor?: string;
  tickColor?: string;
  valueColor?: string;
}>();

const getAngle = (fraction: number) => {
  const startAngle = (225 * Math.PI) / 180;
  const endAngle = (-45 * Math.PI) / 180;
  let totalAngle = endAngle - startAngle;
  while (totalAngle < 0) totalAngle += Math.PI * 2;
  return startAngle + totalAngle * fraction;
};
</script>
