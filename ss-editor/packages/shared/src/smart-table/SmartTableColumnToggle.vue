<template>
  <div
    v-if="show"
    class="smart-table-col-toggle-wrapper"
  >
    <button
      class="toolbar-btn"
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
        <path
          d="M10 3h4v18h-4z"
          opacity="0.3"
        />
        <path
          d="M4 5h4v14H4z"
          opacity="0.3"
        />
        <path
          d="M16 7h4v10h-4z"
          opacity="0.3"
        />
      </svg>
      列配置
    </button>
    <div
      v-if="dropdownVisible"
      class="dropdown-panel"
      @click.stop
    >
      <div
        v-for="col in configurableColumns"
        :key="col.key"
        class="col-item"
        :class="{ hidden: hiddenKeys.includes(col.key) }"
        @click="toggleColumn(col.key)"
      >
        <span class="col-check">
          <svg
            v-if="!hiddenKeys.includes(col.key)"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          ><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <span class="col-label">{{ typeof col.title === 'function' ? col.title(col) : col.title }}</span>
      </div>
      <div class="dropdown-footer">
        <button
          class="reset-btn"
          @click="resetToDefault"
        >
          重置为默认
        </button>
      </div>
    </div>
    <!-- click-outside backdrop -->
    <div
      v-if="dropdownVisible"
      class="backdrop"
      @click="closeDropdown"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  configurableColumns: any[];
  hiddenKeys: string[];
  dropdownVisible: boolean;
}>();

const emit = defineEmits<{
  toggleColumn: [key: string];
  resetToDefault: [];
  'update:dropdownVisible': [visible: boolean];
}>();

function toggleDropdown() {
  emit('update:dropdownVisible', !props.dropdownVisible);
}

function closeDropdown() {
  emit('update:dropdownVisible', false);
}

function toggleColumn(key: string) {
  emit('toggleColumn', key);
}

function resetToDefault() {
  emit('resetToDefault');
}
</script>

<script lang="ts">
export default { inheritAttrs: false };
</script>

<style scoped>
.smart-table-col-toggle-wrapper { position: relative; }
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
.toolbar-btn:hover { border-color: var(--primary); }
.dropdown-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.col-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
}
.col-item:hover { background: var(--border); }
.col-item.hidden { color: var(--text-secondary); }
.col-check {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}
.dropdown-footer {
  border-top: 1px solid var(--border);
  padding: 6px 12px;
}
.reset-btn {
  width: 100%;
  padding: 4px 0;
  border: none;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 12px;
}
.reset-btn:hover { text-decoration: underline; }
.backdrop { position: fixed; inset: 0; z-index: 99; }
</style>
