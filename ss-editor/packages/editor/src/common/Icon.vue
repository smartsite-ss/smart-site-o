<template>
  <i
    v-if="type === 'font'"
    :class="value"
    :style="iconStyle"
  />
  <svg
    v-else-if="type === 'svg'"
    :style="iconStyle"
    v-html="value"
  />
  <component
    :is="value"
    v-else-if="type === 'vicon'"
    :size="size"
    :color="color"
  />
  <img
    v-else-if="type === 'image'"
    :src="value"
    :style="iconImageStyle"
  >
  <span
    v-else
    :style="iconStyle"
  >{{ value }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface IconConfig {
  type: 'emoji' | 'font' | 'svg' | 'vicon' | 'image';
  value: string | any;
}

const props = defineProps({
  icon: {
    type: [String, Object],
    required: true
  },
  size: {
    type: [String, Number],
    default: '16px'
  },
  color: {
    type: String,
    default: 'currentColor'
  }
});

const iconConfig = computed(() => {
  if (typeof props.icon === 'string') {
    return { type: 'emoji', value: props.icon };
  }
  return props.icon as IconConfig;
});

const type = computed(() => iconConfig.value.type);
const value = computed(() => iconConfig.value.value);

const iconStyle = computed(() => ({
  fontSize: props.size,
  color: props.color,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const iconImageStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
  objectFit: 'contain' as const,
}));
</script>

<style scoped>
/* 图标组件样式 */
i {
  line-height: 1;
}

svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
