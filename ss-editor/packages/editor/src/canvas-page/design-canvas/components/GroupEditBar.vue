<template>
  <div
    v-if="isInGroupEdit"
    class="group-edit-bar"
  >
    <span class="group-edit-label">正在编辑组合</span>
    <button
      class="group-edit-exit-btn"
      @click="$emit('exit')"
    >
      退出编辑 (Esc)
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isInGroupEdit: boolean;
}>();

defineEmits<{
  exit: [];
}>();
</script>

<style scoped>
.group-edit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  z-index: 1000;
  flex-shrink: 0;
}

.group-edit-exit-btn {
  padding: 2px 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-edit-exit-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>