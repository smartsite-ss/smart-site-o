<template>
  <div class="menu-dropdown">
    <div class="dropdown-content">
      <button 
        v-for="item in items" 
        :key="item.id"
        class="dropdown-item"
        @click="handleItemClick(item)"
      >
        <span class="dropdown-icon">
          <component v-if="typeof item.icon === 'function'" :is="item.icon" />
          <template v-else>{{ item.icon }}</template>
        </span>
        <span class="dropdown-text">{{ $t('menu.' + item.id) }}</span>
        <span
          v-if="item.shortcut"
          class="dropdown-shortcut"
        >{{ item.shortcut }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MenuItem as MenuItemType } from '../../config/menu.config';

interface Props {
  items: MenuItemType[];
}

const _props = defineProps<Props>();
const emit = defineEmits(['menu-item-click']);

// 处理菜单项点击
const handleItemClick = (item: MenuItemType) => {
  emit('menu-item-click', item);
};
</script>

<style scoped>
.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--shadow-medium);
  min-width: 200px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-content {
  padding: 8px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  transition: all 0.2s ease;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--control-button-hover);
  color: var(--primary);
}

.dropdown-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dropdown-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.dropdown-text {
  flex: 1;
}

.dropdown-shortcut {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}
</style>
