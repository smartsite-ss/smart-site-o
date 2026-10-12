<template>
  <input
    type="color"
    :value="displayValue"
    @input="onInput"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function stripAlpha(hex: string): string {
  if (hex && hex.length === 9 && hex.startsWith('#')) {
    return hex.substring(0, 7);
  }
  return hex || '#000000';
}

function appendAlpha(hex: string): string {
  if (hex && hex.length === 7 && hex.startsWith('#')) {
    return hex + 'FF';
  }
  return hex;
}

const displayValue = computed(() => stripAlpha(props.modelValue));

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', appendAlpha(target.value));
}
</script>