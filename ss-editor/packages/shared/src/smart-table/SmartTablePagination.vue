<template>
  <div
    v-if="total > 0"
    class="smart-table-pagination"
  >
    <span class="pagination-info">{{ $t('smartTable.pagination.info', { from: showingFrom, to: showingTo, total }) }}</span>
    <div class="pagination-controls">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="$emit('go', currentPage - 1)"
      >
        ◀
      </button>
      <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
      <input
        type="number"
        class="page-input"
        :min="1"
        :max="totalPages"
        :placeholder="String(currentPage)"
        @keyup.enter="$emit('go-input', ($event.target as HTMLInputElement).value)"
      >
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="$emit('go', currentPage + 1)"
      >
        ▶
      </button>
      <select
        class="page-size-select"
        :value="pageSize"
        @change="$emit('size-change', Number(($event.target as HTMLSelectElement).value))"
      >
        <option
          v-for="s in pageSizes"
          :key="s"
          :value="s"
        >
          {{ $t('smartTable.pagination.perPage', { size: s }) }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentPage: number;
  totalPages: number;
  total: number;
  showingFrom: number;
  showingTo: number;
  pageSize: number;
  pageSizes: number[];
}>();

defineEmits<{
  go: [page: number];
  'go-input': [inputVal: string];
  'size-change': [size: number];
}>();
</script>

<style scoped>
.smart-table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}
.pagination-info { font-size: 12px; color: var(--text-secondary); }
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-btn {
  width: 28px; height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.page-btn:disabled { opacity: 0.4; cursor: default; }
.page-btn:not(:disabled):hover { border-color: var(--primary); }
.page-indicator { font-size: 12px; color: var(--text); min-width: 60px; text-align: center; }
.page-input {
  width: 48px; height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  text-align: center;
  font-size: 12px;
}
.page-size-select {
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  padding: 0 4px;
}
</style>
