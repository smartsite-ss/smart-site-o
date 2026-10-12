<template>
  <div
    v-if="loading"
    class="smart-table-loading"
  >
    <div
      v-for="i in 5"
      :key="i"
      class="skeleton-row"
    >
      <div
        v-for="j in (i === 1 ? skeletonCols : skeletonCols)"
        :key="j"
        class="skeleton-cell"
        :style="{ width: skeletonWidths[(j - 1) % skeletonWidths.length] }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  loading?: boolean;
  columns?: number;
}>(), {
  columns: 6,
});

const skeletonCols = computed(() => Math.max(2, Math.min(props.columns, 8)));
const skeletonWidths = ['40%', '25%', '15%', '35%', '20%', '30%'];
</script>

<style scoped>
.smart-table-loading {
  padding: 0;
}
.skeleton-row {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.skeleton-cell {
  height: 14px;
  background: linear-gradient(90deg, var(--border) 25%, transparent 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 4px;
}
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
