<template>
  <div
    v-if="show"
    class="smart-table-export-wrapper"
  >
    <button
      class="toolbar-btn"
      :disabled="disabled"
      @click="toggleDropdown"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line
          x1="12"
          y1="15"
          x2="12"
          y2="3"
        />
      </svg>
      导出
    </button>
    <div
      v-if="dropdownVisible"
      class="dropdown-panel"
      @click.stop
    >
      <div
        class="export-item"
        @click="$emit('export', 'xlsx')"
      >
        <span class="export-icon">📊</span>
        <span>导出 Excel (.xlsx)</span>
      </div>
      <div
        class="export-item"
        @click="$emit('export', 'csv')"
      >
        <span class="export-icon">📄</span>
        <span>导出 CSV (.csv)</span>
      </div>
      <div
        class="export-item"
        @click="$emit('export', 'png')"
      >
        <span class="export-icon">🖼</span>
        <span>导出图片 (.png)</span>
      </div>
    </div>
    <div
      v-if="dropdownVisible"
      class="backdrop"
      @click="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  dropdownVisible: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  export: [format: string];
  'update:dropdownVisible': [visible: boolean];
}>();

function toggleDropdown() {
  emit('update:dropdownVisible', !props.dropdownVisible);
}

function handleClose() {
  emit('update:dropdownVisible', false);
}
</script>

<script lang="ts">
export default { inheritAttrs: false };
</script>

<style scoped>
.smart-table-export-wrapper { position: relative; }
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
}
.toolbar-btn:disabled { opacity: 0.4; cursor: default; }
.toolbar-btn:not(:disabled):hover { border-color: var(--primary); }
.dropdown-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 200px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.export-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
}
.export-item:hover { background: var(--border); }
.export-icon { font-size: 15px; }
.backdrop { position: fixed; inset: 0; z-index: 99; }
</style>
