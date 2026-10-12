<template>
  <div class="role-list-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.nav.roles') }}
      </h1>
      <button
        v-permission="PermissionCodes.ROLE_CREATE"
        class="btn-primary"
        @click="openCreateDialog"
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
        {{ $t('system.roles.create') }}
      </button>
    </div>

    <SmartTable
      table-id="role-list"
      :data="roles"
      :columns="roleColumns"
      :loading="loading"
      :enable-pagination="false"
      show-column-toggle
      show-export
      :show-refresh="true"
      @refresh="loadData"
    >
      <template #cell-isSystem="{ row }">
        <span
          v-if="row.isSystem"
          class="badge-system"
        >{{ $t('system.roles.builtin') }}</span>
        <span
          v-else
          class="badge-custom"
        >{{ $t('system.roles.custom') }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="actions-cell">
          <button
            class="btn-action"
            :title="$t('system.roles.edit')"
            @click="openEditDialog(row)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button
            v-if="!row.isSystem"
            v-permission="PermissionCodes.ROLE_DELETE"
            class="btn-action btn-danger"
            :title="$t('system.roles.delete')"
            @click="handleDelete(row)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </template>
    </SmartTable>

    <!-- 对话框 -->
    <div
      v-if="dialogVisible"
      class="modal-overlay"
      @click.self="closeDialog"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditing ? $t('system.roles.edit') : $t('system.roles.create') }}</h3>
          <button
            class="btn-close"
            @click="closeDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="dialog-tabs">
            <button
              :class="{ active: dialogTab === 'basic' }"
              @click="dialogTab = 'basic'"
            >
              {{ $t('system.roles.basic') }}
            </button>
            <button
              :class="{ active: dialogTab === 'permissions' }"
              @click="dialogTab = 'permissions'"
            >
              {{ $t('system.roles.permissions') }}
            </button>
            <button
              v-if="isEditing"
              :class="{ active: dialogTab === 'menuAccess' }"
              @click="dialogTab = 'menuAccess'"
            >
              {{ $t('system.roles.menuAccess') }}
            </button>
            <button
              v-if="isEditing"
              :class="{ active: dialogTab === 'buttonAccess' }"
              @click="dialogTab = 'buttonAccess'"
            >
              {{ $t('system.roles.buttonAccess') }}
            </button>
            <button
              v-if="isEditing"
              :class="{ active: dialogTab === 'auth' }"
              @click="dialogTab = 'auth'"
            >
              {{ $t('system.roles.dataAuth') }}
            </button>
          </div>

          <!-- 基本信息 Tab -->
          <div
            v-show="dialogTab === 'basic'"
            class="tab-content"
          >
            <div class="form-group">
              <label>{{ $t('system.roles.name') }} *</label>
              <input
                v-model="form.name"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.roles.code') }} *</label>
              <input
                v-model="form.code"
                :disabled="isEditing"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>{{ $t('system.roles.description') }}</label>
              <input
                v-model="form.description"
                class="form-input"
              >
            </div>
          </div>

          <!-- 权限码 Tab -->
          <div
            v-show="dialogTab === 'permissions'"
            class="tab-content"
          >
            <RolePermissionPanel v-model="form.permissions" />
          </div>

          <!-- 菜单访问 Tab（仅编辑时可用） -->
          <div
            v-show="dialogTab === 'menuAccess'"
            class="tab-content"
          >
            <RoleMenuPanel
              v-if="isEditing"
              v-model="form.menuIds"
            />
          </div>

          <!-- 按钮权限 Tab（仅编辑时可用） -->
          <div
            v-show="dialogTab === 'buttonAccess'"
            class="tab-content"
          >
            <RoleButtonPanel
              v-if="isEditing"
              v-model="form.permissions"
            />
          </div>

          <!-- 数据授权 Tab（仅编辑时可用） -->
          <div
            v-show="dialogTab === 'auth'"
            class="tab-content"
          >
            <RoleAuthPanel
              v-if="isEditing && editingId"
              :role-id="editingId"
              @saved="onAuthSaved"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-cancel"
            @click="closeDialog"
          >
            {{ $t('system.roles.cancel') }}
          </button>
          <button
            class="btn-primary"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? $t('system.roles.saving') : $t('system.roles.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '@scada-editor/core';
import { showConfirm, showError } from '../../utils/messageBox';
import { roleApi } from '../../api/modules';
import type { RoleInfo } from '../../api/modules/role.api';
import { PermissionCodes } from '../../config/system-menu.config';
import RolePermissionPanel from '../role/RolePermissionPanel.vue';
import RoleMenuPanel from '../role/RoleMenuPanel.vue';
import RoleButtonPanel from '../role/RoleButtonPanel.vue';
import RoleAuthPanel from '../role/RoleAuthPanel.vue';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn } from '../../components/smart-table';

const { t } = useI18n();

const roleColumns = computed<SmartTableColumn<RoleInfo>[]>(() => [
  { key: 'name', title: t('system.roles.name'), dataKey: 'name' },
  { key: 'code', title: t('system.roles.code'), dataKey: 'code' },
  { key: 'description', title: t('system.roles.description'), dataKey: 'description' },
  {
    key: 'permissionCount',
    title: t('system.roles.permissionCount'),
    dataKey: 'permissions',
    render: (value) => String((value as any[])?.length || 0),
  },
  { key: 'isSystem', title: t('system.roles.system'), dataKey: 'isSystem' },
  { key: 'actions', title: t('system.roles.actions'), dataKey: 'id' },
]);

const roles = ref<RoleInfo[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const dialogTab = ref<'basic' | 'permissions' | 'menuAccess' | 'buttonAccess' | 'auth'>('basic');

const form = ref({
  name: '',
  code: '',
  description: '',
  permissions: [] as string[],
  menuIds: [] as string[],
});

function onAuthSaved() {
  // Data authorization saved successfully
}

async function loadData() {
  loading.value = true;
  try {
    const res = await roleApi.getRoles();
    roles.value = (res as any)?.data || (res as any) || [];
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  dialogTab.value = 'basic';
  form.value = { name: '', code: '', description: '', permissions: [], menuIds: [] };
  dialogVisible.value = true;
}

function openEditDialog(role: RoleInfo) {
  isEditing.value = true;
  editingId.value = role.id;
  dialogTab.value = 'basic';
  form.value = {
    name: role.name,
    code: role.code,
    description: role.description,
    permissions: [...(role.permissions || [])],
    menuIds: [...(role.menuIds || [])],
  };
  dialogVisible.value = true;
}

function closeDialog() {
  dialogVisible.value = false;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    showError(t('system.roles.nameRequired'));
    return;
  }
  if (!isEditing.value && !form.value.code.trim()) {
    showError(t('system.roles.codeRequired'));
    return;
  }
  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await roleApi.updateRole(editingId.value, {
        name: form.value.name,
        description: form.value.description,
        permissions: form.value.permissions,
        menuIds: form.value.menuIds,
      });
    } else {
      await roleApi.createRole(form.value);
    }
    closeDialog();
    await loadData();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.response?.data?.message || t('system.roles.saveFailed'));
    }
  } finally {
    saving.value = false;
  }
}

async function handleDelete(role: RoleInfo) {
  if (!(await showConfirm(t('system.roles.confirmDelete', { name: role.name })))) return;
  try {
    await roleApi.deleteRole(role.id);
    await loadData();
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.role-list-page {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
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
.badge-system {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}
.badge-custom {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}
.actions-cell {
  display: flex;
  gap: 8px;
}
.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.btn-action:hover {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}
.btn-danger:hover {
  background: var(--status-error);
  border-color: var(--status-error);
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-dialog {
  background: var(--surface);
  border-radius: 12px;
  width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}
.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
}
.modal-body {
  padding: 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.dialog-tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  padding: 0 20px;
  background: var(--background);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 1;
}
.dialog-tabs button {
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.dialog-tabs button:hover {
  color: var(--text);
}
.dialog-tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
.tab-content {
  padding: 16px 20px;
}
.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--background);
  color: var(--text);
  box-sizing: border-box;
}
.form-input:disabled {
  opacity: 0.5;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}
.btn-cancel {
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
  font-size: 14px;
}
</style>