<template>
  <div class="position-list-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.nav.positions') }}
      </h1>
      <button
        v-permission="PermissionCodes.POSITION_CREATE"
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
        {{ $t('system.positions.create') }}
      </button>
    </div>

    <div class="table-container">
      <SmartTable
        table-id="position-list"
        :data="positions"
        :columns="positionColumns"
        :loading="loading"
        :enable-pagination="false"
        :show-column-toggle="true"
        :show-export="true"
        :show-refresh="true"
        @refresh="loadData"
      >
        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <button
              class="btn-action"
              :title="$t('system.positions.edit')"
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
              v-permission="PermissionCodes.POSITION_DELETE"
              class="btn-action btn-danger"
              :title="$t('system.positions.delete')"
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
    </div>

    <!-- 对话框 -->
    <div
      v-if="dialogVisible"
      class="modal-overlay"
      @click.self="closeDialog"
    >
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ isEditing ? $t('system.positions.edit') : $t('system.positions.create') }}</h3>
          <button
            class="btn-close"
            @click="closeDialog"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('system.positions.name') }} *</label>
            <input
              v-model="form.name"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.positions.code') }} *</label>
            <input
              v-model="form.code"
              :disabled="isEditing"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.positions.description') }}</label>
            <input
              v-model="form.description"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>{{ $t('system.positions.sortOrder') }}</label>
            <input
              v-model.number="form.sortOrder"
              type="number"
              class="form-input"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-cancel"
            @click="closeDialog"
          >
            {{ $t('system.positions.cancel') }}
          </button>
          <button
            class="btn-primary"
            :disabled="saving"
            @click="handleSave"
          >
            {{ saving ? $t('system.positions.saving') : $t('system.positions.save') }}
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
import { positionApi } from '../../api/modules';
import type { PositionInfo } from '../../api/modules/position.api';
import { PermissionCodes } from '../../config/system-menu.config';
import { SmartTable } from '../../components/smart-table';
import type { SmartTableColumn } from '../../components/smart-table';

const { t } = useI18n();

const positions = ref<PositionInfo[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
});

const positionColumns = computed<SmartTableColumn<PositionInfo>[]>(() => [
  { key: 'name', title: t('system.positions.name'), dataKey: 'name' },
  { key: 'code', title: t('system.positions.code'), dataKey: 'code' },
  { key: 'description', title: t('system.positions.description'), dataKey: 'description' },
  { key: 'sortOrder', title: t('system.positions.sortOrder'), dataKey: 'sortOrder' },
  { key: 'actions', title: t('system.positions.actions'), dataKey: 'id' },
]);

async function loadData() {
  loading.value = true;
  try {
    const res = await positionApi.getPositions();
    positions.value = (res as any)?.data || (res as any) || [];
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { name: '', code: '', description: '', sortOrder: 0 };
  dialogVisible.value = true;
}

function openEditDialog(pos: PositionInfo) {
  isEditing.value = true;
  editingId.value = pos.id;
  form.value = {
    name: pos.name,
    code: pos.code,
    description: pos.description,
    sortOrder: pos.sortOrder,
  };
  dialogVisible.value = true;
}

function closeDialog() {
  dialogVisible.value = false;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    showError(t('system.positions.nameRequired'));
    return;
  }
  if (!isEditing.value && !form.value.code.trim()) {
    showError(t('system.positions.codeRequired'));
    return;
  }
  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await positionApi.updatePosition(editingId.value, {
        name: form.value.name,
        description: form.value.description,
        sortOrder: form.value.sortOrder,
      });
    } else {
      await positionApi.createPosition(form.value);
    }
    closeDialog();
    await loadData();
  } catch (e: any) {
    if (!e._errorHandled) {
      showError(e?.response?.data?.message || t('system.positions.saveFailed'));
    }
  } finally {
    saving.value = false;
  }
}

async function handleDelete(pos: PositionInfo) {
  if (!(await showConfirm(t('system.positions.confirmDelete', { name: pos.name })))) return;
  try {
    await positionApi.deletePosition(pos.id);
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
.position-list-page {
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