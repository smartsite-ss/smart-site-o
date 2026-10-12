<template>
  <div class="menu-container">
    <!-- 显示所有菜单项 -->
    <MenuItem 
      v-for="item in menuConfig" 
      :key="item.id"
      ref="menuItems"
      :item="item"
      :active-id="activeItem"
      @menu-item-click="handleMenuItemClick"
      @menu-activate="handleMenuActivate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { menuConfig, MenuItem as MenuItemType } from '../../config/menu.config';
import { useGraphic } from '../../composables/useGraphic';
import MenuItem from './MenuItem.vue';

// 获取统一的图形操作方法
const {
  undo,
  redo,
  pasteGraphics
} = useGraphic();

// 定义事件发射器
const emit = defineEmits<{
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'paste'): void;
  (e: 'history'): void;
  (e: 'select'): void;
  (e: 'save'): void;
  (e: 'open-project'): void;
  (e: 'close-project'): void;
  (e: 'export-project'): void;
  (e: 'import-project'): void;
}>();

// 当前激活的菜单项
const activeItem = ref('general');

// 菜单项引用
const menuItems = ref<InstanceType<typeof MenuItem>[]>([]);

// 处理菜单项点击
const handleMenuItemClick = (menuItem: MenuItemType) => {
  
  
  // 处理菜单项动作
  if (menuItem.action) {
    handleAction(menuItem.action);
  }
};

// 处理菜单激活
const handleMenuActivate = (menuId: string) => {
  activeItem.value = menuId;
};

// 处理菜单项动作
const handleAction = (action: string) => {
  switch (action) {
    case 'undo':
      undo();
      emit('undo');
      break;
    case 'redo':
      redo();
      emit('redo');
      break;
    case 'history':
      emit('history');
      break;
    case 'select':
      emit('select');
      break;
    case 'paste':
      pasteGraphics();
      emit('paste');
      break;
    case 'save':
      emit('save');
      break;
    case 'open-project':
      emit('open-project');
      break;
    case 'close-project':
      emit('close-project');
      break;
    case 'export-project':
      emit('export-project');
      break;
    case 'import-project':
      emit('import-project');
      break;
    default:
    
  }
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const menuItemsElements = document.querySelectorAll('.menu-item');
  
  // 检查点击是否在菜单项内部
  let clickInsideMenuItem = false;
  menuItemsElements.forEach(item => {
    if (item.contains(event.target as Node)) {
      clickInsideMenuItem = true;
    }
  });
  
  // 如果点击在菜单项外部，关闭所有子菜单
  if (!clickInsideMenuItem) {
    // 关闭所有子菜单
    menuItems.value.forEach(item => {
      if (item.closeSubmenu) {
        item.closeSubmenu();
      }
    });
  }
};

// 添加点击外部关闭菜单的事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

// 移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.menu-container {
  display: flex;
  align-items: center;
  background-color: transparent;
  border: none;
  padding: 0;
  margin: 0 20px;
  position: relative;
  height: 44px;
  box-sizing: border-box;
}
</style>
