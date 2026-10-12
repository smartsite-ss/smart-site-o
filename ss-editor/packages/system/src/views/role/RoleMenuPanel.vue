<template>
  <div class="role-menu-panel">
    <div class="panel-toolbar">
      <label class="select-all-label">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="toggleAll"
        >
        <span>{{ $t('system.roles.selectAllMenus') }}</span>
      </label>
    </div>
    <div class="menu-tree">
      <div
        v-for="menuItem in menuItems"
        :key="menuItem.id"
      >
        <MenuTreeNode
          :item="menuItem"
          :selected-ids="selectedIds"
          @toggle="toggleMenu"
        />
      </div>
      <div
        v-if="menuItems.length === 0"
        class="tree-empty"
      >
        {{ $t('system.roles.noMenus') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SystemMenuItem } from '../../config/system-menu.config';
import { menuApi } from '../../api/modules';

// 递归菜单树节点组件
const MenuTreeNode: ReturnType<typeof defineComponent> = defineComponent({
  name: 'MenuTreeNode',
  props: {
    item: { type: Object as () => SystemMenuItem, required: true },
    selectedIds: { type: Array as () => string[], required: true },
    depth: { type: Number, default: 0 },
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const expanded = ref(true);
    return () => {
      const item = props.item;
      const isChecked = props.selectedIds.includes(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const indent = props.depth * 20;

      return h('div', { class: 'tree-node' }, [
        h('div', {
          class: 'tree-node-row',
          style: { paddingLeft: indent + 'px' },
          onClick: () => emit('toggle', item.id),
        }, [
          hasChildren ? h('span', {
            class: 'tree-expand',
            onClick: (e: Event) => { e.stopPropagation(); expanded.value = !expanded.value; },
          }, expanded.value ? '▾' : '▸') : h('span', { class: 'tree-expand', style: { visibility: 'hidden' } }, ' '),
          h('input', {
            type: 'checkbox',
            checked: isChecked,
            onClick: (e: Event) => e.stopPropagation(),
            onChange: () => emit('toggle', item.id),
          }),
          h('span', { class: 'tree-label' }, t(item.labelKey)),
          h('span', { class: 'tree-path' }, item.path || '/'),
          item.subsystem ? h('span', { class: 'tree-subsystem' }, item.subsystem) : null,
        ]),
        hasChildren && expanded.value ? h('div', null,
          item.children!.map((child: SystemMenuItem) =>
            h(MenuTreeNode, {
              key: child.id,
              item: child,
              selectedIds: props.selectedIds,
              depth: props.depth + 1,
              onToggle: (id: string) => emit('toggle', id),
            })
          )
        ) : null,
      ]);
    };
  },
});

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const menuItems = ref<SystemMenuItem[]>([]);

const selectedIds = computed(() => props.modelValue);

const allSelected = computed(() => {
  const allIds = collectAllIds(menuItems.value);
  return allIds.length > 0 && allIds.every(id => props.modelValue.includes(id));
});

function collectAllIds(items: SystemMenuItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (item.children) {
      ids.push(...collectAllIds(item.children));
    }
  }
  return ids;
}

function toggleAll() {
  if (allSelected.value) {
    emit('update:modelValue', []);
  } else {
    emit('update:modelValue', collectAllIds(menuItems.value));
  }
}

function toggleMenu(id: string) {
  const updated = props.modelValue.includes(id)
    ? props.modelValue.filter(i => i !== id)
    : [...props.modelValue, id];
  emit('update:modelValue', updated);
}

async function loadMenus() {
  try {
    const menus = await menuApi.getMenu();
    menuItems.value = menus || [];
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadMenus();
});
</script>

<style scoped>
.role-menu-panel {
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
.menu-tree {
  max-height: 50vh;
  overflow-y: auto;
}
.tree-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.tree-node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
  transition: background 0.12s;
}
.tree-node-row:hover {
  background: var(--background-hover, rgba(0,0,0,0.03));
}
.tree-expand {
  width: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.tree-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-path {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}
.tree-subsystem {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}
</style>
