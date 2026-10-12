<template>
  <div class="smart-table-empty">
    <div class="empty-icon">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        opacity="0.4"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <line
          x1="9"
          y1="13"
          x2="15"
          y2="13"
        />
        <line
          x1="9"
          y1="17"
          x2="13"
          y2="17"
        />
      </svg>
    </div>
    <p class="empty-text">
      {{ text }}
    </p>
    <button
      v-if="error"
      class="retry-btn"
      @click="$emit('retry')"
    >
      重试
    </button>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string;
  error?: boolean;
}>(), {
  text: '暂无数据',
  error: false,
});

defineEmits<{
  retry: [];
}>();
</script>

<style scoped>
.smart-table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--text-secondary);
}
.empty-icon { margin-bottom: 12px; }
.empty-text { font-size: 14px; margin: 0; }
.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
}
.retry-btn:hover { border-color: var(--primary); color: var(--primary); }
</style>
