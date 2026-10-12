<template>
  <div
    class="theme-provider"
    :style="themeVars"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '@scada-editor/core';

const { colors } = useTheme();

const themeVars = computed(() => ({
  '--primary': colors.value.primary,
  '--secondary': colors.value.secondary,
  '--accent': colors.value.accent,
  '--surface': colors.value.surface,
  '--elevated': colors.value.elevated,
  '--backdrop': colors.value.backDrop,
  '--text': colors.value.text,
  '--text-secondary': colors.value.textSecondary,
  '--text-tertiary': colors.value.textTertiary,
  '--text-disabled': colors.value.textDisabled,
  '--background': colors.value.background,
  '--border': colors.value.border,
  '--border-light': colors.value.borderLight,
  '--border-focus': colors.value.borderFocus,
  '--status-success': colors.value.success,
  '--status-warning': colors.value.warning,
  '--status-error': colors.value.error,
  '--status-info': colors.value.info,
}));
</script>

<style scoped>
.theme-provider {
  min-height: 100%;
}
</style>