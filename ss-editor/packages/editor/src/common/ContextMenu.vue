<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="menuStyle"
    @click.stop
  >
    <template
      v-for="item in items"
      :key="item.id"
    >
      <div
        v-if="item.id && typeof item.id === 'string' && item.id.startsWith('divider')"
        class="context-menu-divider"
      />
      <div
        v-else-if="item.id && typeof item.id === 'string' && item.id.endsWith('-header')"
        class="context-menu-header"
      >
        {{ item.label }}
      </div>
      <div
        v-else
        class="context-menu-item"
        @click="handleItemClick(item)"
      >
        {{ item.label }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

interface MenuItem {
  id: string | number;
  label: string;
  [key: string]: any;
}

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array as () => MenuItem[],
    default: () => [],
  },
});

const emit = defineEmits(['close', 'itemClick']);

// 计算菜单样式
const menuStyle = computed(() => {
  return {
    left: `${props.x}px`,
    top: `${props.y}px`,
  };
});

// 处理菜单项点击（跳过分隔线）
const handleItemClick = (item: MenuItem) => {
  if (typeof item.id === 'string' && item.id.startsWith('divider')) return;
  emit('itemClick', item);
  emit('close');
};

// 处理点击外部关闭菜单
const handleClickOutside = (e: MouseEvent) => {
  const contextMenu = document.querySelector('.context-menu');
  if (contextMenu && !contextMenu.contains(e.target as Node)) {
    emit('close');
  }
};

// 挂载事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 卸载事件监听器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: var(--surface, #fff);
  border: 1px solid var(--border, #ccc);
  border-radius: var(--radius-md, 4px);
  box-shadow: var(--shadow-dropdown, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text, #333);
  transition: all 0.15s;
}

.context-menu-item:hover {
  background-color: var(--primary, #2196f3);
  color: #fff;
}

.context-menu-header {
  padding: 6px 16px 2px;
  font-size: 11px;
  color: var(--text-secondary, #999);
  cursor: default;
  user-select: none;
}

.context-menu-divider {
  height: 1px;
  margin: 4px 8px;
  background-color: var(--border, #ccc);
}
</style>
