<template>
  <div class="menu-manage-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.nav.menus') }}
      </h1>
      <div class="header-actions">
        <button
          class="btn-primary"
          @click="addRootItem"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          ><line
            x1="12"
            y1="5"
            x2="12"
            y2="19"
          /><line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
          /></svg>
          {{ $t('system.menus.addRoot') }}
        </button>
        <button
          class="btn-primary"
          :disabled="saving"
          @click="handleSaveAll"
        >
          {{ saving ? $t('system.menus.saving') : $t('system.menus.saveAll') }}
        </button>
      </div>
    </div>

    <div class="content-panels">
      <!-- 左侧菜单树 -->
      <div class="left-panel">
        <div class="panel-header">
          {{ $t('system.menus.menuTree') }}
          <span class="order-hint">({{ $t('system.menus.sortOrderLabel') }})</span>
        </div>
        <div class="tree-list">
          <div
            v-for="(item, idx) in flatMenuList"
            :key="item.id"
            class="tree-item"
            :class="{ active: selectedId === item.id, 'is-detail': item.isDetail }"
            :style="{ paddingLeft: (item._depth * 20 + 12) + 'px' }"
            @click="selectItem(item)"
          >
            <span class="tree-item-icon">{{ item._depth > 0 ? '├─ ' : '' }}</span>
            <span class="tree-item-label">{{ getDisplayLabel(item.labelKey) || $t(item.labelKey) || item.labelKey }}</span>
            <span class="tree-item-path">{{ item.path || '/' }}</span>
            <span class="tree-item-order">#{{ item.order ?? 0 }}</span>
            <span
              v-if="item.subsystem"
              class="tree-item-subsystem"
            >{{ item.subsystem }}</span>
            <span class="tree-item-actions">
              <button
                class="btn-order"
                :title="$t('system.menus.moveUp')"
                :disabled="idx === 0 || (idx > 0 && flatMenuList[idx - 1]._depth !== item._depth)"
                @click.stop="moveItem(item, -1)"
              >▲</button>
              <button
                class="btn-order"
                :title="$t('system.menus.moveDown')"
                :disabled="idx >= flatMenuList.length - 1 || flatMenuList[idx + 1]._depth !== item._depth"
                @click.stop="moveItem(item, 1)"
              >▼</button>
            </span>
          </div>
          <div
            v-if="flatMenuList.length === 0 && !loading"
            class="tree-empty"
          >
            {{ $t('system.menus.empty') }}
          </div>
        </div>
      </div>

      <!-- 右侧编辑面板 -->
      <div class="right-panel">
        <template v-if="selectedItem">
          <div class="panel-header">
            {{ $t('system.menus.editItem') }}
          </div>
          <div class="edit-form">
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.itemId') }}</label>
              <input
                v-model="selectedItem.id"
                class="form-input"
                :disabled="isExisting"
              >
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.labelKey') }}</label>
              <input
                v-model="selectedItem.labelKey"
                class="form-input"
              >
            </div>
            <!-- 菜单显示名称（按系统语言编辑） -->
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.displayName') }}</label>
              <div class="locale-inputs">
                <div class="locale-input-item">
                  <span class="locale-tag">{{ $t('system.menus.langZhCN') }}</span>
                  <input
                    v-model="displayLabelZhCN"
                    class="form-input"
                    :placeholder="$t('system.menus.displayNameHint')"
                  >
                </div>
                <div class="locale-input-item">
                  <span class="locale-tag">{{ $t('system.menus.langEnUS') }}</span>
                  <input
                    v-model="displayLabelEnUS"
                    class="form-input"
                    :placeholder="$t('system.menus.displayNameHint')"
                  >
                </div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.icon') }}</label>
              <input
                v-model="selectedItem.icon"
                class="form-input"
              >
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.subsystem') }}</label>
              <input
                v-model="selectedItem.subsystem"
                class="form-input"
                :placeholder="$t('system.menus.subsystemHint')"
              >
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.sortOrder') }}</label>
              <input
                v-model.number="selectedItem.order"
                type="number"
                class="form-input"
              >
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.roles') }}</label>
              <div class="roles-checkbox-group">
                <label
                  v-for="r in availableRoles"
                  :key="r"
                  class="role-checkbox"
                >
                  <input
                    type="checkbox"
                    :value="r"
                    :checked="(selectedItem.roles || []).includes(r)"
                    @change="toggleRole(r)"
                  >
                  {{ r }}
                </label>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">{{ $t('system.menus.isDetail') }}</label>
              <label class="role-checkbox">
                <input
                  type="checkbox"
                  :checked="!!selectedItem.isDetail"
                  @change="selectedItem.isDetail = !selectedItem.isDetail"
                >
                {{ $t('system.menus.isDetailHint') }}
              </label>
            </div>

            <div class="form-actions">
              <button
                class="btn-save"
                :disabled="saving"
                @click="saveCurrentItem"
              >
                {{ $t('system.menus.saveItem') }}
              </button>
              <button
                v-if="isExisting"
                class="btn-danger"
                :disabled="saving"
                @click="deleteCurrentItem"
              >
                {{ $t('system.menus.deleteItem') }}
              </button>
              <button
                class="btn-cancel"
                :disabled="saving"
                @click="addChildItem"
              >
                {{ $t('system.menus.addChild') }}
              </button>
            </div>
          </div>

          <!-- 按钮管理区域 -->
          <div class="buttons-section">
            <div class="panel-header">
              {{ $t('system.menus.buttons') }}
              <button
                class="btn-small"
                @click="addButton"
              >
                + {{ $t('system.menus.addButton') }}
              </button>
            </div>
            <div class="buttons-list">
              <div
                v-for="btn in currentButtons"
                :key="btn.id"
                class="button-item"
              >
                <div class="button-item-fields">
                  <input
                    v-model="btn.id"
                    class="form-input-small"
                    :placeholder="$t('system.menus.buttonId')"
                  >
                  <input
                    v-model="btn.labelKey"
                    class="form-input-small"
                    :placeholder="$t('system.menus.buttonLabelKey')"
                  >
                  <input
                    v-model="btn.permissionCode"
                    class="form-input-small"
                    :placeholder="$t('system.menus.permissionCode')"
                  >
                  <input
                    v-model.number="btn.sortOrder"
                    type="number"
                    class="form-input-narrow"
                    :placeholder="$t('system.menus.sortOrder')"
                  >
                </div>
                <button
                  class="btn-remove"
                  :disabled="saving"
                  @click="removeButton(btn.id)"
                >
                  ✕
                </button>
              </div>
              <div
                v-if="currentButtons.length === 0"
                class="buttons-empty"
              >
                {{ $t('system.menus.noButtons') }}
              </div>
            </div>
          </div>
        </template>
        <div
          v-else
          class="panel-empty"
        >
          {{ $t('system.menus.selectHint') }}
        </div>
      </div>
    </div>

    <!-- 同步操作栏 -->
    <div class="sync-bar">
      <span class="sync-hint">{{ $t('system.menus.syncHint') }}</span>
      <button
        class="btn-small"
        :disabled="saving"
        @click="handleSyncI18n('zh-CN')"
      >
        {{ $t('system.menus.syncZhCN') }}
      </button>
      <button
        class="btn-small"
        :disabled="saving"
        @click="handleSyncI18n('en-US')"
      >
        {{ $t('system.menus.syncEnUS') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n, getLocale, i18n } from '@scada-editor/core';
import { menuApi } from '../../api/modules';
import { showSuccess, showError, showConfirm } from '../../utils/messageBox';
import type { SystemMenuItem, SystemRole } from '../../config/system-menu.config';
import type { SystemMenuButton, MenuI18nItem } from '../../api/modules/menu.api';

const { t } = useI18n();

interface FlatMenuItem extends SystemMenuItem {
  _depth: number;
}

const menuTree = ref<SystemMenuItem[]>([]);
const allButtons = ref<SystemMenuButton[]>([]);
const loading = ref(false);
const saving = ref(false);
const selectedId = ref<string | null>(null);

const availableRoles: SystemRole[] = ['admin', 'user', 'viewer'];

/** 新创建菜单项的父节点 ID（用于保存时传给后端） */
const newItemParentId = ref<string | null>(null);

/** 当前系统语言（从 vue-i18n 获取，无需手动切换） */
const activeLocale = computed(() => {
  const loc = getLocale();
  // normalize: 'zh' → 'zh-CN', 'en' → 'en-US'
  if (loc === 'zh') return 'zh-CN';
  if (loc === 'en') return 'en-US';
  return loc;
});
/** 支持的语言列表 */
const supportedLocales = ref<string[]>(['zh-CN', 'en-US']);
/** 菜单国际化标签映射: locale → (labelKey → label) */
const menuI18nLabels = ref<Map<string, Map<string, string>>>(new Map());

/** 获取菜单项的显示名称 */
function getDisplayLabel(labelKey: string): string | undefined {
  const localeMap = menuI18nLabels.value.get(activeLocale.value);
  return localeMap?.get(labelKey);
}

/** 获取指定 locale 下 labelKey 的显示名称 */
function getDisplayLabelForLocale(labelKey: string, locale: string): string {
  // 优先从 API 加载的菜单 i18n 数据中获取
  const localeMap = menuI18nLabels.value.get(locale);
  const apiLabel = localeMap?.get(labelKey);
  if (apiLabel) return apiLabel;
  // 回退到 vue-i18n locale JSON
  const tLabel = t(labelKey, {} as Record<string, unknown>, { locale });
  if (tLabel !== labelKey) return tLabel;
  return '';
}

/** 中文显示名称（双向绑定到 i18n label） */
const displayLabelZhCN = computed({
  get: () => {
    if (!selectedItem.value) return '';
    return getDisplayLabelForLocale(selectedItem.value.labelKey, 'zh-CN');
  },
  set: (val: string) => {
    if (!selectedItem.value) return;
    if (!menuI18nLabels.value.has('zh-CN')) {
      menuI18nLabels.value.set('zh-CN', new Map());
    }
    menuI18nLabels.value.get('zh-CN')!.set(selectedItem.value.labelKey, val);
  },
});

/** 英文显示名称（双向绑定到 i18n label） */
const displayLabelEnUS = computed({
  get: () => {
    if (!selectedItem.value) return '';
    return getDisplayLabelForLocale(selectedItem.value.labelKey, 'en-US');
  },
  set: (val: string) => {
    if (!selectedItem.value) return;
    if (!menuI18nLabels.value.has('en-US')) {
      menuI18nLabels.value.set('en-US', new Map());
    }
    menuI18nLabels.value.get('en-US')!.set(selectedItem.value.labelKey, val);
  },
});

/** 选中的菜单项（浅拷贝用于编辑） */
const selectedItem = ref<SystemMenuItem | null>(null);

/** 是否为已存在的项（编辑模式） */
const isExisting = computed(() => {
  if (!selectedItem.value) return false;
  return findInTree(menuTree.value, selectedItem.value.id) !== null;
});

/** 扁平化菜单列表（用于左侧树展示） */
const flatMenuList = computed<FlatMenuItem[]>(() => {
  const result: FlatMenuItem[] = [];
  function walk(items: SystemMenuItem[], depth: number) {
    // 按 order 排序后再遍历，确保显示顺序始终正确
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const item of sorted) {
      result.push({ ...item, _depth: depth });
      if (item.children && item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    }
  }
  walk(menuTree.value, 0);
  return result;
});

/** 当前选中菜单项关联的按钮 */
const currentButtons = computed({
  get: () => {
    if (!selectedId.value) return [];
    return allButtons.value
      .filter(b => b.menuId === selectedId.value)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  set: (_val: SystemMenuButton[]) => {
    // handled via mutations to allButtons
  },
});

function findInTree(items: SystemMenuItem[], id: string): SystemMenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findInTree(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function selectItem(item: FlatMenuItem) {
  selectedId.value = item.id;
  newItemParentId.value = null; // 选择已有项，非新建
  selectedItem.value = {
    id: item.id,
    labelKey: item.labelKey,
    path: item.path,
    icon: item.icon,
    roles: item.roles ? [...item.roles] : undefined,
    order: item.order,
    isDetail: item.isDetail,
    subsystem: item.subsystem,
    children: item.children ? [...item.children] : undefined,
  };
}

function toggleRole(role: SystemRole) {
  if (!selectedItem.value) return;
  const roles = selectedItem.value.roles || [];
  if (roles.includes(role)) {
    selectedItem.value.roles = roles.filter(r => r !== role);
    if (selectedItem.value.roles!.length === 0) selectedItem.value.roles = undefined;
  } else {
    selectedItem.value.roles = [...roles, role];
  }
}

function addRootItem() {
  const newId = `menu-${Date.now()}`;
  // 计算新 order：同级最大 order + 10
  const maxOrder = menuTree.value.reduce((max, s) => Math.max(max, s.order ?? 0), 0);
  const newItem: SystemMenuItem = {
    id: newId,
    labelKey: '',
    path: '',
    icon: '',
    order: maxOrder + 10,
  };
  menuTree.value.push(newItem);
  selectedId.value = newId;
  selectedItem.value = { ...newItem };
  newItemParentId.value = null; // 根节点无父级
}

function addChildItem() {
  if (!selectedId.value) return;
  const parentId = selectedId.value;
  const newId = `menu-${Date.now()}`;
  // 计算新 order：同级最大 order + 10
  let maxOrder = 0;
  function findParentAndMax(items: SystemMenuItem[]): { found: boolean; maxOrder: number } {
    for (const item of items) {
      if (item.id === parentId) {
        const max = (item.children || []).reduce((m, c) => Math.max(m, c.order ?? 0), 0);
        return { found: true, maxOrder: max };
      }
      if (item.children) {
        const result = findParentAndMax(item.children);
        if (result.found) return result;
      }
    }
    return { found: false, maxOrder: 0 };
  }
  const parentResult = findParentAndMax(menuTree.value);
  maxOrder = parentResult.maxOrder;
  const newItem: SystemMenuItem = {
    id: newId,
    labelKey: '',
    path: '',
    icon: '',
    order: maxOrder + 10,
  };

  // 添加到父节点的 children 中
  function addChild(items: SystemMenuItem[]): boolean {
    for (const item of items) {
      if (item.id === parentId) {
        if (!item.children) item.children = [];
        item.children.push(newItem);
        return true;
      }
      if (item.children && addChild(item.children)) return true;
    }
    return false;
  }
  addChild(menuTree.value);
  selectedId.value = newId;
  selectedItem.value = { ...newItem };
  newItemParentId.value = parentId; // 记录父节点
}

/** 在同级菜单中上移/下移（direction: -1 上移, 1 下移） */
function moveItem(item: FlatMenuItem, direction: number) {
  const siblings = findSiblingArray(menuTree.value, item.id);
  if (!siblings) return;
  const idx = siblings.findIndex(s => s.id === item.id);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= siblings.length) return;
  // 交换位置并更新排序值
  [siblings[idx], siblings[newIdx]] = [siblings[newIdx], siblings[idx]];
  // 按当前顺序重新设置 order 值
  siblings.forEach((s, i) => { s.order = i * 10; });
  // 保持选中项
  selectedItem.value = {
    id: siblings[newIdx].id,
    labelKey: siblings[newIdx].labelKey,
    path: siblings[newIdx].path,
    icon: siblings[newIdx].icon,
    roles: siblings[newIdx].roles ? [...siblings[newIdx].roles] : undefined,
    order: siblings[newIdx].order,
    isDetail: siblings[newIdx].isDetail,
    subsystem: siblings[newIdx].subsystem,
    children: siblings[newIdx].children ? [...siblings[newIdx].children] : undefined,
  };
}

/** 查找 item 所在的兄弟数组 */
function findSiblingArray(items: SystemMenuItem[], id: string): SystemMenuItem[] | null {
  for (const item of items) {
    if (item.id === id) return items;
    if (item.children) {
      const found = findSiblingArray(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

async function saveCurrentItem() {
  if (!selectedItem.value || !selectedItem.value.id || !selectedItem.value.labelKey) return;
  saving.value = true;
  try {
    const item = selectedItem.value;
    const parentId = isExisting.value ? undefined : (newItemParentId.value ?? undefined);

    if (isExisting.value) {
      // 已有菜单项：更新数据库记录
      await menuApi.updateMenuItem(item.id, item);
    } else {
      // 新菜单项：创建数据库记录
      await menuApi.createMenuItem(item, parentId);
      newItemParentId.value = null;
    }

    // 保存当前项的 i18n 显示名称到 data/menu/ JSON 文件
    await saveCurrentItemI18nLabel();

    // 更新本地树
    const updateInTree = (items: SystemMenuItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === item.id) {
          items[i] = { ...item, children: items[i].children };
          return true;
        }
        if (items[i].children && updateInTree(items[i].children!)) return true;
      }
      return false;
    };
    updateInTree(menuTree.value);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.menus.saveFailed', { message: e.message || t('system.error.unknown') }));
    }
  } finally {
    saving.value = false;
  }
}

async function deleteCurrentItem() {
  if (!selectedId.value) return;
  if (!(await showConfirm(t('system.menus.confirmDelete')))) return;
  saving.value = true;
  try {
    await menuApi.deleteMenuItem(selectedId.value);
    // 从本地树中移除
    const removeFromTree = (items: SystemMenuItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === selectedId.value!) {
          items.splice(i, 1);
          return true;
        }
        if (items[i].children && removeFromTree(items[i].children!)) return true;
      }
      return false;
    };
    removeFromTree(menuTree.value);
    // 移除关联按钮
    allButtons.value = allButtons.value.filter(b => b.menuId !== selectedId.value);
    selectedId.value = null;
    selectedItem.value = null;
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.menus.deleteFailed', { message: e.message || t('system.error.unknown') }));
    }
  } finally {
    saving.value = false;
  }
}

async function handleSaveAll() {
  saving.value = true;
  try {
    // 先将当前编辑项的修改同步到菜单树，避免 "保存全部" 时丢失未保存的编辑
    if (selectedItem.value && selectedItem.value.id) {
      const syncToTree = (items: SystemMenuItem[]): boolean => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === selectedItem.value!.id) {
            items[i] = { ...selectedItem.value!, children: items[i].children };
            return true;
          }
          if (items[i].children && syncToTree(items[i].children!)) return true;
        }
        return false;
      };
      syncToTree(menuTree.value);
    }
    await menuApi.updateMenu(menuTree.value);
    // 同时保存按钮
    await menuApi.updateButtons(allButtons.value);
    // 保存 i18n 标签
    await saveCurrentI18nLabels();
    showSuccess(t('system.menus.saveSuccess'));
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.menus.saveFailed', { message: e.message || t('system.error.unknown') }));
    }
  } finally {
    saving.value = false;
  }
}

function addButton() {
  if (!selectedId.value) return;
  const newBtn: SystemMenuButton = {
    id: `btn-${Date.now()}`,
    menuId: selectedId.value,
    labelKey: '',
    permissionCode: '',
    sortOrder: allButtons.value.filter(b => b.menuId === selectedId.value).length * 10,
  };
  allButtons.value.push(newBtn);
}

function removeButton(id: string) {
  allButtons.value = allButtons.value.filter(b => b.id !== id);
}

async function loadData() {
  loading.value = true;
  try {
    const [menus, buttons, locales] = await Promise.all([
      menuApi.getMenu(),
      menuApi.getButtons(),
      menuApi.getMenuI18nLocales().catch(() => ['zh-CN', 'en-US']),
    ]);
    menuTree.value = menus || [];
    allButtons.value = buttons || [];
    supportedLocales.value = locales.length > 0 ? locales : ['zh-CN', 'en-US'];

    // 加载所有语言的菜单 i18n 数据
    await loadAllI18nLabels();
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
}

/** 加载所有语言的菜单 i18n 标签 */
async function loadAllI18nLabels() {
  const newLabels = new Map<string, Map<string, string>>();
  for (const locale of supportedLocales.value) {
    try {
      const data = await menuApi.getMenuI18n(locale);
      const labelMap = new Map<string, string>();
      const tables = Array.isArray(data) ? data : [data];
      for (const table of tables) {
        if (table && table.items) {
          for (const item of table.items) {
            labelMap.set(item.labelKey, item.label);
          }
        }
      }
      newLabels.set(locale, labelMap);
    } catch {
      // locale not available yet, skip
    }
  }
  menuI18nLabels.value = newLabels;
}

/** 保存当前编辑的 i18n 标签到后端 */
async function saveCurrentI18nLabels() {
  const menuId = 'system-menu';
  for (const locale of supportedLocales.value) {
    const labelMap = menuI18nLabels.value.get(locale);
    if (!labelMap || labelMap.size === 0) continue;
    const items: MenuI18nItem[] = [];
    for (const [labelKey, label] of labelMap.entries()) {
      items.push({ labelKey, label, sortOrder: 0, description: '' });
    }
    try {
      await menuApi.updateMenuI18nItems(locale, menuId, items);
    } catch (e: any) {
      if (import.meta.env.DEV) console.error(`Failed to save i18n for ${locale}:`, e.message);
    }
  }
}

/** 保存当前项在当前语言下的 i18n 显示名称（单项保存时调用） */
async function saveCurrentItemI18nLabel() {
  const locale = activeLocale.value;
  const labelMap = menuI18nLabels.value.get(locale);
  if (!labelMap || labelMap.size === 0) return;
  const menuId = 'system-menu';
  const items: MenuI18nItem[] = [];
  for (const [labelKey, label] of labelMap.entries()) {
    items.push({ labelKey, label, sortOrder: 0, description: '' });
  }
  try {
    await menuApi.updateMenuI18nItems(locale, menuId, items);
  } catch (e: any) {
    if (import.meta.env.DEV) console.error(`Failed to save i18n label for ${locale}:`, e.message);
  }
}

/** 同步菜单国际化到 locale JSON 文件 */
async function handleSyncI18n(locale: string) {
  saving.value = true;
  try {
    // 先保存当前编辑的标签
    await saveCurrentI18nLabels();
    // 再同步到 locale JSON 文件
    const result = await menuApi.syncMenuI18n(locale);
    showSuccess(`${locale} 同步完成：已更新 ${result.synced} 个菜单名称${result.errors.length > 0 ? '，错误: ' + result.errors.join(', ') : ''}`);
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(t('system.menus.saveFailed', { message: e.message || t('system.error.unknown') }));
    }
  } finally {
    saving.value = false;
  }
}

/** 内置的菜单 i18n 键值对（locale → key → value），用于回退显示 */
const builtinMenusI18n = ref<Record<string, Record<string, string>>>({});

/** 确保菜单管理的 i18n 键已合并到全局 locale 中（解决 Vite pre-bundle 缓存导致部分新增键缺失的问题） */
function ensureMenusI18n() {
  const menusZhCN: Record<string, string> = {
    title: '菜单管理',
    addRoot: '添加根菜单',
    saveAll: '保存全部',
    saving: '保存中...',
    menuTree: '菜单树',
    editItem: '编辑菜单项',
    itemId: '菜单 ID',
    labelKey: 'i18n Key',
    path: '路由路径',
    icon: '图标',
    subsystem: '子系统',
    subsystemHint: '留空表示全局菜单',
    sortOrder: '排序',
    roles: '可访问角色',
    isDetail: '详情页',
    isDetailHint: '不在菜单中显示',
    saveItem: '保存当前项',
    deleteItem: '删除此项',
    addChild: '添加子菜单',
    buttons: '按钮权限',
    addButton: '添加按钮',
    buttonId: '按钮ID',
    buttonLabelKey: 'i18n Key',
    permissionCode: '权限码',
    noButtons: '暂无按钮',
    empty: '暂无菜单',
    selectHint: '请从左侧选择一个菜单项',
    confirmDelete: '确定要删除此菜单项及其子项吗？',
    deleteFailed: '删除失败: {message}',
    saveSuccess: '保存成功',
    saveFailed: '保存失败: {message}',
    displayName: '显示名称',
    displayNameHint: '输入菜单显示名称',
    sortOrderLabel: '拖拽或点击 ▲▼ 调整顺序',
    moveUp: '上移',
    moveDown: '下移',
    langZhCN: '中文',
    langEnUS: 'English',
    syncHint: '将菜单名称同步到前端 locale 文件（zh-CN.json / en-US.json）',
    syncZhCN: '同步中文',
    syncEnUS: '同步英文',
  };
  const menusEnUS: Record<string, string> = {
    title: 'Menu Management',
    addRoot: 'Add Root Menu',
    saveAll: 'Save All',
    saving: 'Saving...',
    menuTree: 'Menu Tree',
    editItem: 'Edit Menu Item',
    itemId: 'Menu ID',
    labelKey: 'i18n Key',
    path: 'Route Path',
    icon: 'Icon',
    subsystem: 'Subsystem',
    subsystemHint: 'Empty means global menu',
    sortOrder: 'Order',
    roles: 'Access Roles',
    isDetail: 'Detail Page',
    isDetailHint: 'Not shown in menu',
    saveItem: 'Save Item',
    deleteItem: 'Delete Item',
    addChild: 'Add Child',
    buttons: 'Button Permissions',
    addButton: 'Add Button',
    buttonId: 'Button ID',
    buttonLabelKey: 'i18n Key',
    permissionCode: 'Permission Code',
    noButtons: 'No buttons',
    empty: 'No menus',
    selectHint: 'Select a menu item from the left',
    confirmDelete: 'Are you sure you want to delete this menu item and its children?',
    deleteFailed: 'Delete failed: {message}',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed: {message}',
    displayName: 'Display Name',
    displayNameHint: 'Enter menu display name',
    sortOrderLabel: 'Drag or click ▲▼ to reorder',
    moveUp: 'Move Up',
    moveDown: 'Move Down',
    langZhCN: '中文',
    langEnUS: 'English',
    syncHint: 'Sync menu names to frontend locale files (zh-CN.json / en-US.json)',
    syncZhCN: 'Sync Chinese',
    syncEnUS: 'Sync English',
  };
  i18n.global.mergeLocaleMessage('zh-CN', { system: { menus: menusZhCN } });
  i18n.global.mergeLocaleMessage('en-US', { system: { menus: menusEnUS } });
  // 保存到本地 ref 用于跨语言回退
  builtinMenusI18n.value = { 'zh-CN': menusZhCN, 'en-US': menusEnUS };
}

onMounted(() => {
  ensureMenusI18n();
  loadData();
});
</script>

<style scoped>
.menu-manage-page {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
}
/* 菜单树项扩展样式 */
.tree-item-path {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
  min-width: 60px;
  text-align: right;
}
.tree-item-order {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
  min-width: 32px;
  text-align: center;
  background: var(--background);
  border-radius: 3px;
  padding: 1px 4px;
}
.tree-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.btn-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 3px;
  font-size: 10px;
  padding: 0;
  line-height: 1;
  transition: all 0.12s;
}
.btn-order:hover:not(:disabled) {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}
.btn-order:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.order-hint {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 6px;
}

/* 同步操作栏 */
.sync-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 16px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 8px;
  flex-shrink: 0;
}
.sync-hint {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: var(--text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.content-panels {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.left-panel {
  width: 320px;
  min-width: 280px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.right-panel {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  background: var(--background);
  flex-shrink: 0;
}
.tree-list {
  flex: 1;
  overflow-y: auto;
}
.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text);
  transition: background 0.12s;
}
.tree-item:hover {
  background: var(--background-hover, rgba(0,0,0,0.03));
}
.tree-item.active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-left: 3px solid var(--primary);
}
.tree-item.is-detail {
  opacity: 0.5;
  font-style: italic;
}
.tree-item-icon {
  color: var(--text-secondary);
  font-size: 12px;
  width: 16px;
}
.tree-item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-item-id {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}
.tree-item-subsystem {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}
.tree-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.panel-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}
.edit-form {
  padding: 16px;
}
.form-row {
  margin-bottom: 12px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}
.form-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--background);
  color: var(--text);
  box-sizing: border-box;
}
.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.locale-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.locale-input-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.locale-tag {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 48px;
  text-align: right;
  flex-shrink: 0;
}
.roles-checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.role-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.btn-save {
  padding: 7px 16px;
  background: var(--primary);
  color: var(--text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-danger {
  padding: 7px 16px;
  background: var(--status-error);
  color: var(--text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-cancel {
  padding: 7px 16px;
  background: var(--background);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-small {
  padding: 4px 10px;
  background: var(--primary);
  color: var(--text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.buttons-section {
  border-top: 1px solid var(--border);
}
.buttons-list {
  padding: 12px 16px;
  max-height: 200px;
  overflow-y: auto;
}
.button-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
}
.button-item:last-child {
  border-bottom: none;
}
.button-item-fields {
  display: flex;
  gap: 6px;
  flex: 1;
  flex-wrap: wrap;
}
.form-input-small {
  width: 100px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
}
.form-input-narrow {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
}
.btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  flex-shrink: 0;
}
.btn-remove:hover {
  background: color-mix(in srgb, var(--status-error) 10%, transparent);
  color: var(--status-error);
}
.buttons-empty {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
