<template>
  <div
    class="main-navigation"
    :style="themeStyles"
  >
    <!-- 显示前5个菜单项 -->
    <div 
      v-for="item in visibleItems" 
      :key="item.id"
      class="nav-item"
      :class="{ active: activeItem === item.id }"
    >
      <!-- 通用组件菜单 -->
      <div
        v-if="item.id === 'general'"
        class="nav-item with-submenu"
      >
        <button
          class="nav-button"
          @click="selectItem(item.id)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </button>
        <!-- 二级菜单 -->
        <div
          v-if="showGeneralSubmenu"
          class="submenu"
        >
          <div class="submenu-header">
            <span>{{ t('menu.graphicCategories') }}</span>
          </div>
          <div class="submenu-content">
            <div class="submenu-categories">
              <button
                v-for="category in graphicCategories"
                :key="category.id"
                class="category-button"
                @click="selectGraphicCategory(category.id)"
              >
                {{ category.name }}
              </button>
            </div>
            <div class="submenu-items">
              <div
                v-for="graphic in selectedCategoryGraphics"
                :key="graphic.type"
                class="submenu-item"
                draggable="true"
                @dragstart="handleGraphicDragStart($event, graphic.type)"
              >
                <span class="submenu-item-icon">{{ getGraphicIcon(graphic.type) }}</span>
                <span class="submenu-item-name">{{ graphic.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 编辑菜单 -->
      <div
        v-else-if="item.id === 'edit'"
        class="nav-item with-submenu"
      >
        <button
          class="nav-button"
          @click="selectItem(item.id)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </button>
        <!-- 编辑下拉菜单 -->
        <div
          v-if="showEditSubmenu"
          class="submenu edit-submenu"
        >
          <div class="edit-menu-content">
            <button
              class="edit-menu-item"
              @click="handleUndo"
            >
              <span class="edit-menu-icon">↶</span>
              <span class="edit-menu-text">{{ t('menu.undo') }}</span>
              <span class="edit-menu-shortcut">Ctrl+Z</span>
            </button>
            <button
              class="edit-menu-item"
              @click="handleRedo"
            >
              <span class="edit-menu-icon">↷</span>
              <span class="edit-menu-text">{{ t('menu.redo') }}</span>
              <span class="edit-menu-shortcut">Ctrl+Y</span>
            </button>
            <div class="edit-menu-divider" />
            <button
              class="edit-menu-item"
              @click="handleHistory"
            >
              <span class="edit-menu-icon">📋</span>
              <span class="edit-menu-text">{{ t('menu.history') }}</span>
            </button>
            <div class="edit-menu-divider" />
            <button
              class="edit-menu-item"
              @click="handleSelect"
            >
              <span class="edit-menu-icon">📏</span>
              <span class="edit-menu-text">{{ t('menu.select') }}</span>
            </button>
            <div class="edit-menu-divider" />
            <button
              class="edit-menu-item"
              @click="handlePaste"
            >
              <span class="edit-menu-icon">📋</span>
              <span class="edit-menu-text">{{ t('menu.paste') }}</span>
              <span class="edit-menu-shortcut">Ctrl+V</span>
            </button>
          </div>
        </div>
      </div>
      <!-- 其他菜单项 -->
      <button 
        v-else 
        class="nav-button"
        @click="selectItem(item.id)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { GraphicFactory, i18n } from '@scada-editor/core';
import { useTheme } from '@scada-editor/core';

// 国际化翻译函数
const { t } = i18n.global;

// 使用主题
const { themeStyles } = useTheme();

// 主导航区组件
// 负责模块切换的一级菜单

// 菜单数据
const menuItems = [
  { id: 'scene', name: t('menu.scene'), icon: '🎬' },
  { id: 'edit', name: t('menu.edit'), icon: '✏️' },
  { id: 'general', name: t('menu.general'), icon: '🧩', active: true },
  { id: 'components', name: t('menu.components'), icon: '📚' },
  { id: 'design', name: t('menu.design'), icon: '🎯' },
  { id: 'script', name: t('menu.script'), icon: '📜' },
];



// 当前激活的菜单项
const activeItem = ref('general');

// 通用组件二级菜单状态
const showGeneralSubmenu = ref(false);

// 编辑菜单二级菜单状态
const showEditSubmenu = ref(false);

// 图元分类
const graphicCategories = [
  { id: 'basic', name: t('menu.graphicCategory.basic') },
  { id: 'system', name: t('menu.graphicCategory.system') },
  { id: 'chart', name: t('menu.graphicCategory.chart') },
  { id: 'form', name: t('menu.graphicCategory.form') },
  { id: 'layout', name: t('menu.graphicCategory.layout') },
  { id: 'container', name: t('menu.graphicCategory.container') },
  { id: 'industrial', name: t('menu.graphicCategory.industrial') },
];


// 选中的图元分类
const selectedGraphicCategory = ref('basic');

// 显示的菜单项（所有）
const visibleItems = computed(() => {
  return menuItems;
});

// 计算选中分类的图元
const selectedCategoryGraphics = computed(() => {
  const graphics = GraphicFactory.getGraphicTypes().filter(
    (graphic) => graphic.category === selectedGraphicCategory.value
  );

  // 添加 Naive Button
  if (selectedGraphicCategory.value === 'basic') {
    graphics.push({
      type: 'naive-button',
      name: 'Naive按钮',
      category: 'basic',
      version: '0.0.0',
      constructor: GraphicFactory.createGraphic as any,
    });
  }

  return graphics;
});

// 切换通用组件二级菜单
const toggleGeneralSubmenu = () => {
  showGeneralSubmenu.value = !showGeneralSubmenu.value;
  // 关闭其他菜单
  showEditSubmenu.value = false;
};

// 切换编辑菜单二级菜单
const toggleEditSubmenu = () => {
  showEditSubmenu.value = !showEditSubmenu.value;
  // 关闭其他菜单
  showGeneralSubmenu.value = false;
};

// 选择菜单项
const selectItem = (id: string) => {
  activeItem.value = id;
  // 如果是通用组件，切换二级菜单
  if (id === 'general') {
    toggleGeneralSubmenu();
  } 
  // 如果是编辑，切换二级菜单
  else if (id === 'edit') {
    toggleEditSubmenu();
  } 
  else {
    // 关闭所有菜单
    showGeneralSubmenu.value = false;
    showEditSubmenu.value = false;
  }
  // 这里可以添加路由跳转或其他逻辑
};

// 选择图元分类
const selectGraphicCategory = (categoryId: string) => {
  selectedGraphicCategory.value = categoryId;
};

// 处理图元拖拽开始
const handleGraphicDragStart = (event: DragEvent, graphicType: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', graphicType);
  }
};

// 获取图元图标
const getGraphicIcon = (type: string) => {
  // 根据图元类型返回对应的图标
  const iconMap: Record<string, string> = {
    button: '🔘',
    input: '📝',
    chart: '📊',
    shape: '🔲',
    label: '📄',
    image: '🖼️',
    'naive-button': '🔘',
    checkbox: '☑️',
  };
  return iconMap[type] || '📦';
};

// 处理撤销操作
const handleUndo = () => {
  ('Undo operation');
  // 这里可以添加撤销操作的逻辑
};

// 处理重做操作
const handleRedo = () => {
  ('Redo operation');
  // 这里可以添加重做操作的逻辑
};

// 处理历史记录操作
const handleHistory = () => {
  ('History operation');
  // 这里可以添加历史记录操作的逻辑
};

// 处理框选操作
const handleSelect = () => {
  ('Select operation');
  // 这里可以添加框选操作的逻辑
};

// 处理粘贴操作
const handlePaste = () => {
  ('Paste operation');
  // 这里可以添加粘贴操作的逻辑
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const submenus = document.querySelectorAll('.with-submenu');
  
  // 检查是否点击在任何二级菜单内部
  let clickInsideSubmenu = false;
  submenus.forEach(submenu => {
    if (submenu.contains(event.target as Node)) {
      clickInsideSubmenu = true;
    }
  });
  
  // 关闭所有二级菜单
  if (!clickInsideSubmenu) {
    showGeneralSubmenu.value = false;
    showEditSubmenu.value = false;
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
.main-navigation {
  display: flex;
  align-items: center;
  background-color: transparent;
  border: none;
  padding: 0;
  margin: 0 20px;
  position: relative;
  z-index: 1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--header-text);
  cursor: pointer;
  font-size: 12px;
  border-radius: 3px;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 70px;
  position: relative;
  height: 56px;
  box-sizing: border-box;
  justify-content: center;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: none;
  background: none;
  color: var(--header-text);
  cursor: pointer;
  font-size: 12px;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
  justify-content: center;
}

.nav-item.with-submenu:hover {
  background-color: var(--control-button-hover);
}

.nav-item.with-submenu.active {
  background-color: var(--accent);
  font-weight: bold;
}

.nav-icon {
  font-size: 16px;
  line-height: 1;
}

.nav-text {
  font-size: 12px;
  line-height: 1;
  text-align: center;
}

.nav-item:hover {
  background-color: var(--control-button-hover);
}

.nav-item.active {
  background-color: var(--accent);
  font-weight: bold;
}

/* 折叠菜单样式 */
.dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border: none;
  background: none;
  color: var(--header-text);
  cursor: pointer;
  font-size: 14px;
  border-radius: 3px;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 80px;
}

.dropdown-toggle:hover {
  background-color: var(--control-button-hover);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--surface);
  border-radius: 4px;
  box-shadow: var(--shadow-medium);
  min-width: 120px;
  z-index: 1000;
  margin-top: 8px;
  border: 1px solid var(--border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  transition: all 0.3s ease;
  text-align: left;
}

.dropdown-item:hover {
  background-color: var(--control-button-hover);
}

.dropdown-item.active {
  background-color: var(--primary);
  color: white;
  font-weight: bold;
}

.dropdown-icon {
  font-size: 16px;
  line-height: 1;
}

.dropdown-text {
  line-height: 1;
}

/* 二级菜单样式 */
.submenu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: var(--surface);
  border-radius: 4px;
  box-shadow: var(--shadow-medium);
  min-width: 400px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.submenu-header {
  padding: 12px 16px;
  background-color: var(--control-button-hover);
  border-bottom: 1px solid var(--border);
  font-weight: bold;
  color: var(--text);
}

.submenu-content {
  padding: 16px;
}

.submenu-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.submenu-categories .category-button {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background-color: var(--control-button-hover);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  color: var(--text);
}

.submenu-categories .category-button:hover {
  background-color: var(--primary);
  border-color: var(--primary);
  color: white;
}

.submenu-items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.submenu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background-color: var(--control-button-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s;
  color: var(--text);
  min-height: 80px;
  justify-content: center;
}

.submenu-item:hover {
  background-color: var(--primary);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-small);
  color: white;
}

.submenu-item:active {
  cursor: grabbing;
}

.submenu-item-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.submenu-item-name {
  font-size: 12px;
  text-align: center;
  color: var(--text);
}

.submenu-item:hover .submenu-item-name {
  color: white;
}

/* 滚动条样式 */
.submenu-items::-webkit-scrollbar {
  width: 6px;
}

.submenu-items::-webkit-scrollbar-track {
  background: var(--control-button-hover);
  border-radius: 3px;
}

.submenu-items::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.submenu-items::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}

/* 编辑菜单下拉菜单样式 */
.edit-submenu {
  min-width: 200px;
}

.edit-menu-content {
  padding: 8px 0;
}

.edit-menu-item {
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
}

.edit-menu-item:hover {
  background-color: var(--primary);
  color: white;
}

.edit-menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.edit-menu-text {
  flex: 1;
}

.edit-menu-shortcut {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.edit-menu-item:hover .edit-menu-shortcut {
  color: rgba(255, 255, 255, 0.8);
}

.edit-menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 8px 0;
}
</style>
