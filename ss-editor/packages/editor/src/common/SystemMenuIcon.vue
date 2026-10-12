<template>
  <component :is="iconVNode" />
</template>

<script setup lang="ts">
import { computed, watch, type VNode } from 'vue';
import { iconMap, s, circle, setSvgAttrs } from './icons';

const props = withDefaults(defineProps<{
  name: string;
  size?: number | string;
}>(), {
  size: 18,
});

// Keep svgAttrs in sync with the icons module
watch(() => props.size, (size) => {
  setSvgAttrs({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}, { immediate: true });

const iconVNode = computed<VNode>(() => {
  const icon = iconMap[props.name];
  if (icon) return icon();
  // fallback: 默认图标
  return s(circle('12', '12', '3'));
});
</script>