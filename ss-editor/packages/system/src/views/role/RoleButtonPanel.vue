<template>
  <div class="role-button-panel">
    <div class="panel-toolbar">
      <label class="select-all-label">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="toggleAll"
        >
        <span>{{ $t('system.roles.selectAllButtons') }}</span>
      </label>
    </div>
    <div class="button-tree">
      <div
        v-for="menu in menuTree"
        :key="menu.id"
        class="button-menu-group"
      >
        <div
          class="menu-header"
          @click="toggleMenuExpand(menu.id)"
        >
          <span class="expand-icon">{{ expandedMenus[menu.id] ? '▾' : '▸' }}</span>
          <span class="menu-label">{{ menu.labelKey }}</span>
          <span class="menu-badge">{{ getMenuSelectedCount(menu) }}/{{ getMenuButtonCount(menu) }}</span>
        </div>
        <div
          v-show="expandedMenus[menu.id]"
          class="menu-buttons"
        >
          <label
            v-for="btn in buttonsByMenu[menu.id] || []"
            :key="btn.id"
            class="button-item"
          >
            <input
              type="checkbox"
              :checked="modelValue.includes(btn.permissionCode)"
              @change="toggleButton(btn.permissionCode)"
            >
            <span class="btn-code">{{ btn.permissionCode }}</span>
            <span class="btn-label">{{ btn.labelKey }}</span>
          </label>
          <div
            v-if="!(buttonsByMenu[menu.id]?.length)"
            class="no-buttons"
          >
            {{ $t('system.roles.noMenuButtons') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { menuApi } from '../../api/modules';
import type { SystemMenuItem } from '../../config/system-menu.config';
import type { SystemMenuButton } from '../../api/modules/menu.api';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const menuTree = ref<SystemMenuItem[]>([]);
const allButtons = ref<SystemMenuButton[]>([]);
const expandedMenus = reactive<Record<string, boolean>>({});

/** 菜单 → 按钮映射 */
const buttonsByMenu = computed(() => {
  const map: Record<string, SystemMenuButton[]> = {};
  for (const btn of allButtons.value) {
    if (!map[btn.menuId]) map[btn.menuId] = [];
    map[btn.menuId].push(btn);
  }
  return map;
});

const allButtonCodes = computed(() => allButtons.value.map(b => b.permissionCode));

const allSelected = computed(() => {
  return allButtonCodes.value.length > 0 && allButtonCodes.value.every(c => props.modelValue.includes(c));
});

function toggleAll() {
  if (allSelected.value) {
    emit('update:modelValue', props.modelValue.filter(c => !allButtonCodes.value.includes(c)));
  } else {
    emit('update:modelValue', [...new Set([...props.modelValue, ...allButtonCodes.value])]);
  }
}

function toggleButton(code: string) {
  const updated = props.modelValue.includes(code)
    ? props.modelValue.filter(c => c !== code)
    : [...props.modelValue, code];
  emit('update:modelValue', updated);
}

function toggleMenuExpand(menuId: string) {
  expandedMenus[menuId] = !expandedMenus[menuId];
}

function getMenuButtonCount(menu: SystemMenuItem): number {
  let count = (buttonsByMenu.value[menu.id] || []).length;
  if (menu.children) {
    for (const child of menu.children) {
      count += getMenuButtonCount(child);
    }
  }
  return count;
}

function getMenuSelectedCount(menu: SystemMenuItem): number {
  let count = (buttonsByMenu.value[menu.id] || []).filter(b => props.modelValue.includes(b.permissionCode)).length;
  if (menu.children) {
    for (const child of menu.children) {
      count += getMenuSelectedCount(child);
    }
  }
  return count;
}

async function loadData() {
  try {
    const [menus, buttons] = await Promise.all([
      menuApi.getMenu(),
      menuApi.getButtons(),
    ]);
    menuTree.value = menus || [];
    allButtons.value = buttons || [];
    // 默认展开有按钮的菜单
    for (const menu of menus || []) {
      if ((buttonsByMenu.value[menu.id] || []).length > 0) {
        expandedMenus[menu.id] = true;
      }
    }
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.role-button-panel {
  background: var(--background);
  border-radius: 8px;
  overflow: hidden;
}
.panel-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.select-all-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.button-tree {
  max-height: 50vh;
  overflow-y: auto;
}
.button-menu-group {
  border-bottom: 1px solid var(--border-light);
}
.menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  transition: background 0.12s;
}
.menu-header:hover {
  background: var(--background-hover, rgba(0,0,0,0.03));
}
.expand-icon {
  width: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.menu-label {
  flex: 1;
}
.menu-badge {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 400;
}
.menu-buttons {
  padding: 4px 12px 8px 32px;
  background: var(--background);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
}
.button-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.button-item:hover {
  background: var(--surface);
}
.button-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-code {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: var(--primary);
  min-width: 80px;
}
.btn-label {
  color: var(--text-secondary);
  white-space: nowrap;
}
.no-buttons {
  padding: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  grid-column: 1 / -1;
  text-align: center;
}
</style>
