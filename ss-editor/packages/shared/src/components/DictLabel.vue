<template>
  <span
    class="dict-label"
    :title="titleText"
  >{{ displayText }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useDict, type DictItem } from '../composables/useDict';

const props = withDefaults(
  defineProps<{
    /** 字典标识 */
    dictId: string;
    /** 字典条目 value */
    value: string;
    /** 未匹配时显示的兜底文字，默认显示 value 本身 */
    fallback?: string;
  }>(),
  {
    fallback: '',
  },
);

const { loadDict } = useDict();

/** 已加载的字典条目（用于 value 变化时同步解析，无需再次请求） */
const items = ref<DictItem[]>([]);

/** 当前显示文本 */
const displayText = ref<string>(props.fallback || props.value);

/** tooltip 文本：value — label */
const titleText = computed(() => {
  const display = displayText.value;
  return display !== props.value ? `${props.value} — ${display}` : display;
});

/** 根据 items 和 value 解析 label */
function resolveLabel() {
  const item = items.value.find((it) => it.value === props.value);
  displayText.value = item?.label ?? (props.fallback || props.value);
}

async function loadAndResolve() {
  try {
    items.value = await loadDict(props.dictId);
    resolveLabel();
  } catch {
    displayText.value = props.fallback || props.value;
  }
}

onMounted(loadAndResolve);

// dictId 变化时重新加载
watch(() => props.dictId, loadAndResolve);

// value 变化时从已缓存的 items 中解析（无需再次请求）
watch(() => props.value, resolveLabel);

// fallback 变化时重新解析
watch(() => props.fallback, resolveLabel);
</script>

<style scoped>
.dict-label {
  color: var(--text, inherit);
  font-size: inherit;
}
</style>
