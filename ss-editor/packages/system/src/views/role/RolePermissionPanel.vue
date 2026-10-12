<template>
  <div class="role-permission-panel">
    <div class="panel-toolbar">
      <label class="select-all-label">
        <input
          type="checkbox"
          :checked="allSelected"
          @change="toggleAll"
        >
        <span>{{ $t('system.roles.selectAll') }}</span>
      </label>
    </div>
    <div class="permission-categories">
      <div
        v-for="category in categories"
        :key="category.module"
        class="permission-category"
      >
        <div
          class="category-header"
          @click="toggleCategory(category.module)"
        >
          <span class="category-arrow">{{ collapsed[category.module] ? '▸' : '▾' }}</span>
          <label class="category-check">
            <input
              type="checkbox"
              :checked="categoryAllSelected(category)"
              @click.stop
              @change="toggleCategoryAll(category)"
            >
          </label>
          <span class="category-label">{{ category.label }}</span>
          <span class="category-count">{{ selectedCount(category) }}/{{ category.codes.length }}</span>
        </div>
        <div
          v-show="!collapsed[category.module]"
          class="category-items"
        >
          <label
            v-for="code in category.codes"
            :key="code.value"
            class="permission-item"
          >
            <input
              type="checkbox"
              :value="code.value"
              :checked="modelValue.includes(code.value)"
              @change="toggleCode(code.value)"
            >
            <span class="code-value">{{ code.value }}</span>
            <span class="code-label">{{ code.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { PermissionCodes, type PermissionCode } from '../../config/system-menu.config';
import { roleApi } from '../../api/modules/role.api';

const { t } = useI18n();

interface CodeItem {
  value: PermissionCode;
  label: string;
}

interface PermissionCategory {
  module: string;
  label: string;
  codes: CodeItem[];
}

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const collapsed = reactive<Record<string, boolean>>({});

// ▼ v8.0 权限码注册表：从后端 API 动态加载，当前硬编码数据作为初始 fallback
const DEFAULT_CATEGORIES: PermissionCategory[] = [
  {
    module: 'project',
    label: t('system.permissions.categories.project'),
    codes: [
      { value: PermissionCodes.PROJECT_CREATE, label: t('system.permissions.codes.project:create') },
      { value: PermissionCodes.PROJECT_EDIT, label: t('system.permissions.codes.project:edit') },
      { value: PermissionCodes.PROJECT_DELETE, label: t('system.permissions.codes.project:delete') },
      { value: PermissionCodes.PROJECT_VIEW, label: t('system.permissions.codes.project:view') },
      { value: PermissionCodes.PROJECT_CONFIG, label: t('system.permissions.codes.project:config') },
    ],
  },
  {
    module: 'device',
    label: t('system.permissions.categories.device'),
    codes: [
      { value: PermissionCodes.DEVICE_CREATE, label: t('system.permissions.codes.device:create') },
      { value: PermissionCodes.DEVICE_EDIT, label: t('system.permissions.codes.device:edit') },
      { value: PermissionCodes.DEVICE_DELETE, label: t('system.permissions.codes.device:delete') },
      { value: PermissionCodes.DEVICE_VIEW, label: t('system.permissions.codes.device:view') },
      { value: PermissionCodes.DEVICE_IMPORT, label: t('system.permissions.codes.device:import') },
      { value: PermissionCodes.DEVICE_EXPORT, label: t('system.permissions.codes.device:export') },
      { value: PermissionCodes.DEVICE_CONNECT, label: t('system.permissions.codes.device:connect') },
    ],
  },
  {
    module: 'device_group',
    label: t('system.permissions.categories.device_group'),
    codes: [
      { value: PermissionCodes.DEVICE_GROUP_CREATE, label: t('system.permissions.codes.device_group:create') },
      { value: PermissionCodes.DEVICE_GROUP_EDIT, label: t('system.permissions.codes.device_group:edit') },
      { value: PermissionCodes.DEVICE_GROUP_DELETE, label: t('system.permissions.codes.device_group:delete') },
      { value: PermissionCodes.DEVICE_GROUP_VIEW, label: t('system.permissions.codes.device_group:view') },
    ],
  },
  {
    module: 'datatag',
    label: t('system.permissions.categories.datatag'),
    codes: [
      { value: PermissionCodes.DATATAG_CREATE, label: t('system.permissions.codes.datatag:create') },
      { value: PermissionCodes.DATATAG_EDIT, label: t('system.permissions.codes.datatag:edit') },
      { value: PermissionCodes.DATATAG_DELETE, label: t('system.permissions.codes.datatag:delete') },
      { value: PermissionCodes.DATATAG_VIEW, label: t('system.permissions.codes.datatag:view') },
      { value: PermissionCodes.DATATAG_IMPORT, label: t('system.permissions.codes.datatag:import') },
      { value: PermissionCodes.DATATAG_EXPORT, label: t('system.permissions.codes.datatag:export') },
      { value: PermissionCodes.DATATAG_WRITE, label: t('system.permissions.codes.datatag:write') },
    ],
  },
  {
    module: 'plugin',
    label: t('system.permissions.categories.plugin'),
    codes: [
      { value: PermissionCodes.PLUGIN_CREATE, label: t('system.permissions.codes.plugin:create') },
      { value: PermissionCodes.PLUGIN_EDIT, label: t('system.permissions.codes.plugin:edit') },
      { value: PermissionCodes.PLUGIN_DELETE, label: t('system.permissions.codes.plugin:delete') },
      { value: PermissionCodes.PLUGIN_VIEW, label: t('system.permissions.codes.plugin:view') },
      { value: PermissionCodes.PLUGIN_CONFIG, label: t('system.permissions.codes.plugin:config') },
    ],
  },
  {
    module: 'alarm',
    label: t('system.permissions.categories.alarm'),
    codes: [
      { value: PermissionCodes.ALARM_VIEW, label: t('system.permissions.codes.alarm:view') },
      { value: PermissionCodes.ALARM_ACK, label: t('system.permissions.codes.alarm:ack') },
      { value: PermissionCodes.ALARM_RULE_VIEW, label: t('system.permissions.codes.alarm:rule:view') },
      { value: PermissionCodes.ALARM_RULE_CREATE, label: t('system.permissions.codes.alarm:rule:create') },
      { value: PermissionCodes.ALARM_RULE_EDIT, label: t('system.permissions.codes.alarm:rule:edit') },
      { value: PermissionCodes.ALARM_RULE_DELETE, label: t('system.permissions.codes.alarm:rule:delete') },
    ],
  },
  {
    module: 'script',
    label: t('system.permissions.categories.script'),
    codes: [
      { value: PermissionCodes.SCRIPT_CREATE, label: t('system.permissions.codes.script:create') },
      { value: PermissionCodes.SCRIPT_EDIT, label: t('system.permissions.codes.script:edit') },
      { value: PermissionCodes.SCRIPT_DELETE, label: t('system.permissions.codes.script:delete') },
      { value: PermissionCodes.SCRIPT_EXECUTE, label: t('system.permissions.codes.script:execute') },
      { value: PermissionCodes.SCRIPT_VIEW, label: t('system.permissions.codes.script:view') },
    ],
  },
  {
    module: 'report',
    label: t('system.permissions.categories.report'),
    codes: [
      { value: PermissionCodes.REPORT_CREATE, label: t('system.permissions.codes.report:create') },
      { value: PermissionCodes.REPORT_EDIT, label: t('system.permissions.codes.report:edit') },
      { value: PermissionCodes.REPORT_DELETE, label: t('system.permissions.codes.report:delete') },
      { value: PermissionCodes.REPORT_VIEW, label: t('system.permissions.codes.report:view') },
      { value: PermissionCodes.REPORT_EXPORT, label: t('system.permissions.codes.report:export') },
    ],
  },
  {
    module: 'template',
    label: t('system.permissions.categories.template'),
    codes: [
      { value: PermissionCodes.TEMPLATE_CREATE, label: t('system.permissions.codes.template:create') },
      { value: PermissionCodes.TEMPLATE_EDIT, label: t('system.permissions.codes.template:edit') },
      { value: PermissionCodes.TEMPLATE_DELETE, label: t('system.permissions.codes.template:delete') },
      { value: PermissionCodes.TEMPLATE_IMPORT, label: t('system.permissions.codes.template:import') },
      { value: PermissionCodes.TEMPLATE_EXPORT, label: t('system.permissions.codes.template:export') },
      { value: PermissionCodes.TEMPLATE_VIEW, label: t('system.permissions.codes.template:view') },
    ],
  },
  {
    module: 'system',
    label: t('system.permissions.categories.system'),
    codes: [
      { value: PermissionCodes.SYSTEM_USER_CREATE, label: t('system.permissions.codes.system:user:create') },
      { value: PermissionCodes.SYSTEM_USER_EDIT, label: t('system.permissions.codes.system:user:edit') },
      { value: PermissionCodes.SYSTEM_USER_DELETE, label: t('system.permissions.codes.system:user:delete') },
      { value: PermissionCodes.SYSTEM_USER_VIEW, label: t('system.permissions.codes.system:user:view') },
      { value: PermissionCodes.SYSTEM_ROLE_CREATE, label: t('system.permissions.codes.system:role:create') },
      { value: PermissionCodes.SYSTEM_ROLE_EDIT, label: t('system.permissions.codes.system:role:edit') },
      { value: PermissionCodes.SYSTEM_ROLE_DELETE, label: t('system.permissions.codes.system:role:delete') },
      { value: PermissionCodes.SYSTEM_ROLE_VIEW, label: t('system.permissions.codes.system:role:view') },
      { value: PermissionCodes.SYSTEM_MENU_CONFIG, label: t('system.permissions.codes.system:menu:config') },
      { value: PermissionCodes.SYSTEM_CONFIG, label: t('system.permissions.codes.system:config') },
      { value: PermissionCodes.SYSTEM_OPERATION_LOG, label: t('system.permissions.codes.system:operation_log') },
      { value: PermissionCodes.SYSTEM_INFO, label: t('system.permissions.codes.system:info') },
    ],
  },
];

// v8.0：权限码分组从后端 API 动态加载，DEFAULT_CATEGORIES 作为初始/fallback 数据
const categories = ref<PermissionCategory[]>(DEFAULT_CATEGORIES);

onMounted(async () => {
  try {
    const res = await roleApi.getPermissionsRegistry().catch(() => null);
    if (!res) return; // 后端 v8.0 端点未部署，使用 DEFAULT_CATEGORIES
    const data: any = (res as any)?.data || res;
    if (data?.categories && data.categories.length > 0) {
      categories.value = data.categories.map((cat: any) => ({
        module: cat.module,
        label: cat.label,
        codes: (cat.codes || []).map((c: any) => ({
          value: c.code,
          label: c.label || c.code,
        })),
      }));
    }
  } catch {
    // API 不可用时保持 DEFAULT_CATEGORIES
  }
});

const allSelected = computed(() => {
  const allCodes = categories.value.flatMap(c => c.codes.map(cc => cc.value));
  return allCodes.length > 0 && allCodes.every(c => props.modelValue.includes(c));
});

function categoryAllSelected(category: PermissionCategory): boolean {
  return category.codes.every(c => props.modelValue.includes(c.value));
}

function selectedCount(category: PermissionCategory): number {
  return category.codes.filter(c => props.modelValue.includes(c.value)).length;
}

function toggleAll() {
  if (allSelected.value) {
    emit('update:modelValue', []);
  } else {
    const allCodes = categories.value.flatMap(c => c.codes.map(cc => cc.value));
    emit('update:modelValue', allCodes);
  }
}

function toggleCategory(module: string) {
  collapsed[module] = !collapsed[module];
}

function toggleCategoryAll(category: PermissionCategory) {
  const codeValues = category.codes.map(c => c.value);
  const allIncluded = categoryAllSelected(category);
  let updated: string[];
  if (allIncluded) {
    updated = props.modelValue.filter(c => !codeValues.includes(c as any));
  } else {
    // 手动去重合并（避免 Set 迭代的 downlevelIteration 问题）
    const merged = [...props.modelValue];
    for (const cv of codeValues) {
      if (!merged.includes(cv)) merged.push(cv);
    }
    updated = merged;
  }
  emit('update:modelValue', updated);
}

function toggleCode(code: string) {
  const updated = props.modelValue.includes(code)
    ? props.modelValue.filter(c => c !== code)
    : [...props.modelValue, code];
  emit('update:modelValue', updated);
}
</script>

<style scoped>
.role-permission-panel {
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
.permission-categories {
  max-height: 50vh;
  overflow-y: auto;
}
.permission-category {
  border-bottom: 1px solid var(--border-light);
}
.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--surface);
  transition: background 0.15s;
}
.category-header:hover {
  background: var(--background-hover, rgba(0,0,0,0.03));
}
.category-arrow {
  font-size: 12px;
  color: var(--text-secondary);
  width: 16px;
}
.category-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}
.category-count {
  font-size: 11px;
  color: var(--text-secondary);
}
.category-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 4px 12px 8px 40px;
  background: var(--background);
}
.permission-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.permission-item:hover {
  background: var(--surface);
}
.permission-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.code-value {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: var(--primary);
  min-width: 100px;
}
.code-label {
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
