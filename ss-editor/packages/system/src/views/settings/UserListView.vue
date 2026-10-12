<template>
  <div class="user-list-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.nav.users') }}
      </h1>
      <button
        v-permission="PermissionCodes.USER_CREATE"
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
        {{ $t('system.users.create') }}
      </button>
    </div>

    <div class="table-container">
      <SmartTable
        table-id="user-list"
        :data="users"
        :columns="userColumns"
        :loading="loading"
        :enable-pagination="false"
        :show-column-toggle="true"
        :show-export="true"
        :show-refresh="true"
        @refresh="loadData"
      >
        <template #cell-status="{ row }">
          <span :class="['status-badge', row.isActive ? 'status-active' : 'status-inactive']">
            {{ row.isActive ? $t('system.users.active') : $t('system.users.inactive') }}
          </span>
        </template>
        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <button
              v-permission="PermissionCodes.USER_EDIT"
              class="btn-action"
              :title="$t('system.users.edit')"
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
              v-if="row.isActive"
              v-permission="PermissionCodes.USER_DELETE"
              class="btn-action btn-danger"
              :title="$t('system.users.disable')"
              @click="handleDelete(row)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
              /><line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
              /></svg>
            </button>
          </div>
        </template>
      </SmartTable>
    </div>

    <!-- 新建/编辑对话框 -->
    <div
      v-if="dialogVisible"
      class="modal-overlay"
      @click.self="closeDialog"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditing ? $t('system.users.edit') : $t('system.users.create') }}</h3>
          <button
            class="btn-close"
            @click="closeDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('system.users.username') }} *</label>
            <input
              v-model="form.username"
              :disabled="isEditing"
              class="form-input"
            >
          </div>
          <div
            v-if="!isEditing"
            class="form-group"
          >
            <label>{{ $t('system.users.password') }} *</label>
            <input
              v-model="form.password"
              type="password"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.users.email') }} *</label>
            <input
              v-model="form.email"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.users.displayName') }}</label>
            <input
              v-model="form.displayName"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.users.phone') }}</label>
            <input
              v-model="form.phone"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.users.role') }}</label>
            <select
              v-model="form.roleId"
              class="form-select"
            >
              <option value="">
                {{ $t('system.users.selectRole') }}
              </option>
              <option
                v-for="role in roles"
                :key="role.id"
                :value="role.id"
              >
                {{ role.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ $t('system.users.position') }}</label>
            <select
              v-model="form.positionId"
              class="form-select"
            >
              <option value="">
                {{ $t('system.users.selectPosition') }}
              </option>
              <option
                v-for="pos in positions"
                :key="pos.id"
                :value="pos.id"
              >
                {{ pos.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-cancel"
            @click="closeDialog"
          >
            {{ $t('system.users.cancel') }}
          </button>
          <button
            class="btn-primary"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? $t('system.users.saving') : $t('system.users.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@scada-editor/core';
import { showConfirm, showError } from '../../utils/messageBox';
import { userApi, roleApi, positionApi } from '../../api/modules';
import type { AdminUserInfo } from '../../api/modules/user.api';
import type { RoleInfo } from '../../api/modules/role.api';
import type { PositionInfo } from '../../api/modules/position.api';
import { PermissionCodes } from '../../config/system-menu.config';
import { SmartTable } from '../../components/smart-table';

const { t } = useI18n();

const users = ref<AdminUserInfo[]>([]);
const roles = ref<RoleInfo[]>([]);
const positions = ref<PositionInfo[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  username: '',
  password: '',
  email: '',
  displayName: '',
  phone: '',
  roleId: '',
  positionId: '',
});

function extractList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

async function loadData() {
  loading.value = true;
  try {
    const [usersRes, rolesRes, positionsRes] = await Promise.all([
      userApi.getUsers(),
      roleApi.getRoles(),
      positionApi.getPositions(),
    ]);
    users.value = extractList<AdminUserInfo>(usersRes);
    roles.value = extractList<RoleInfo>(rolesRes);
    positions.value = extractList<PositionInfo>(positionsRes);
  } catch {
    /* ignore */
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { username: '', password: '', email: '', displayName: '', phone: '', roleId: '', positionId: '' };
  dialogVisible.value = true;
}

function openEditDialog(user: AdminUserInfo) {
  isEditing.value = true;
  editingId.value = user.id;
  form.value = {
    username: user.username || '',
    password: '',
    email: user.email || '',
    displayName: user.displayName || '',
    phone: user.phone || '',
    roleId: user.roleEntity?.id || user.roleId || '',
    positionId: user.position?.id || user.positionId || '',
  };
  dialogVisible.value = true;
}

function closeDialog() {
  dialogVisible.value = false;
}

async function handleSave() {
  if (!form.value.username.trim()) {
    showError(t('system.users.usernameRequired'));
    return;
  }
  if (!isEditing.value && !form.value.password.trim()) {
    showError(t('system.users.passwordRequired'));
    return;
  }
  if (!form.value.email.trim()) {
    showError(t('system.users.emailRequired'));
    return;
  }
  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await userApi.updateUser(editingId.value, {
        displayName: form.value.displayName,
        email: form.value.email,
        phone: form.value.phone,
        roleId: form.value.roleId || undefined,
        positionId: form.value.positionId || undefined,
      });
    } else {
      await userApi.createUser({
        username: form.value.username,
        password: form.value.password,
        email: form.value.email,
        displayName: form.value.displayName,
        phone: form.value.phone,
        roleId: form.value.roleId || undefined,
        positionId: form.value.positionId || undefined,
      });
    }
    closeDialog();
    await loadData();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.response?.data?.message || t('system.users.saveFailed'));
    }
  } finally {
    saving.value = false;
  }
}

async function handleDelete(user: AdminUserInfo) {
  if (!(await showConfirm(t('system.users.confirmDisable', { name: user.displayName || user.username })))) return;
  try {
    await userApi.deleteUser(user.id);
    await loadData();
  } catch {
    /* ignore */
  }
}

const userColumns = computed(() => [
  {
    key: 'username',
    title: t('system.users.username'),
    dataKey: 'username',
  },
  {
    key: 'displayName',
    title: t('system.users.displayName'),
    dataKey: 'displayName',
    render: (value: any) => value || '-',
  },
  {
    key: 'role',
    title: t('system.users.role'),
    dataKey: 'roleEntity',
    render: (value: any, row: any) => value?.name || row.role || '-',
  },
  {
    key: 'position',
    title: t('system.users.position'),
    dataKey: 'position',
    render: (value: any) => value?.name || '-',
  },
  {
    key: 'status',
    title: t('system.users.status'),
    dataKey: 'isActive',
  },
  {
    key: 'createdAt',
    title: t('system.users.createdAt'),
    dataKey: 'createdAt',
    render: (v: any) => {
      if (!v) return '-';
      // If it's already a formatted string, return it
      if (typeof v === 'string' && v.includes('-')) return v.length <= 10 ? v : v.slice(0, 16).replace('T', ' ');
      // Try to convert to date
      const d = v instanceof Date ? v : new Date(v);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      // Fallback: try common object fields
      if (typeof v === 'object' && v !== null) {
        const nested = v.value || v.date || v.time || v.createdAt || v.updatedAt || v.iso;
        if (nested !== undefined) return String(nested);
        if (typeof v.toISOString === 'function') return v.toISOString().slice(0, 16).replace('T', ' ');
      }
      return String(v);
    },
  },
  {
    key: 'actions',
    title: t('system.users.actions'),
    dataKey: 'id',
  },
]);

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.user-list-page {
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
.table-container {
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.status-active {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: var(--status-online);
}
.status-inactive {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
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
/* Modal */
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
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
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
  padding: 20px;
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
.form-input, .form-select {
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