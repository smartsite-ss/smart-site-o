<template>
  <span
    class="dict-label"
    :title="titleText"
  >{{ displayText }}</span>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useDict } from '../../composables/useDict';

const props = withDefaults(defineProps<{
  dictId: string;
  value: string;
  locale?: string;
  fallback?: string;
}>(), {
  locale: 'zh-CN',
});

const { loadDict, getLabel } = useDict();

const displayText = computed(() => getLabel(props.dictId, props.value, props.fallback));
const titleText = computed(() => {
  const display = displayText.value;
  return display !== props.value ? `${props.value} — ${display}` : display;
});

onMounted(() => {
  loadDict(props.dictId, props.locale);
});

watch(
  () => props.locale,
  (locale) => {
    loadDict(props.dictId, locale);
  },
);
</script>

<style scoped>
.dict-label {
  color: inherit;
  font-size: inherit;
}
</style>