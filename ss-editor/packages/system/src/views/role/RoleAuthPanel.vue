<template>
  <div class="role-auth-panel">
    <div class="auth-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="auth-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ $t(tab.labelKey) }}
      </button>
    </div>

    <!-- ────── 项目授权 ────── -->
    <div
      v-if="activeTab === 'project'"
      class="auth-tab-content"
    >
      <div class="auth-toolbar">
        <button
          class="btn-sm"
          @click="selectAllProjects"
        >
          {{ $t('system.roles.selectAll') }}
        </button>
        <button
          class="btn-sm"
          @click="deselectAllProjects"
        >
          {{ $t('system.roles.deselectAll') }}
        </button>
      </div>
      <div class="auth-list">
        <div
          v-for="p in projects"
          :key="p.projectId"
          class="auth-row"
        >
          <label class="auth-checkbox">
            <input
              type="checkbox"
              :checked="hasProjectAuth(p.projectId)"
              @change="toggleProjectAuth(p.projectId)"
            >
            <span class="auth-name">{{ p.projectName }}</span>
          </label>
          <select
            v-if="hasProjectAuth(p.projectId)"
            v-model="projectAuthMap[p.projectId]"
            class="permission-select"
          >
            <option value="read">
              {{ $t('system.roles.permissionRead') }}
            </option>
            <option value="write">
              {{ $t('system.roles.permissionWrite') }}
            </option>
            <option value="admin">
              {{ $t('system.roles.permissionAdmin') }}
            </option>
          </select>
          <span
            v-if="hasProjectAuth(p.projectId) && projectAuthMap[p.projectId] === 'admin'"
            class="inherit-hint"
          >{{ $t('system.roles.adminInheritHint') }}</span>
        </div>
        <div
          v-if="projects.length === 0"
          class="auth-empty"
        >
          {{ $t('system.roles.noProjectAuth') }}
        </div>
      </div>
    </div>

    <!-- ────── 设备授权 ────── -->
    <div
      v-if="activeTab === 'device'"
      class="auth-tab-content"
    >
      <div class="auth-filter">
        <label class="filter-label">{{ $t('system.roles.filterByProject') }}:</label>
        <select
          v-model="deviceProjectId"
          class="project-select"
          @change="loadDeviceData"
        >
          <option value="">
            {{ $t('system.roles.selectProject') }}
          </option>
          <option
            v-for="p in projects"
            :key="p.projectId"
            :value="p.projectId"
          >
            {{ p.projectName }}
          </option>
        </select>
      </div>
      <div
        v-if="deviceProjectId"
        class="auth-filter"
      >
        <label class="filter-label">{{ $t('system.roles.filterByGroup') }}:</label>
        <select
          v-model="deviceGroupFilter"
          class="project-select"
          @change="onDeviceGroupFilterChange"
        >
          <option value="">
            {{ $t('system.roles.allGroups') }}
          </option>
          <option
            v-for="g in allGroups"
            :key="g.id"
            :value="g.id"
          >
            {{ g.name }}
          </option>
        </select>
      </div>
      <div
        v-if="deviceProjectId"
        class="auth-toolbar"
      >
        <button
          class="btn-sm"
          @click="selectAllDevices"
        >
          {{ $t('system.roles.selectAll') }}
        </button>
        <button
          class="btn-sm"
          @click="deselectAllDevices"
        >
          {{ $t('system.roles.deselectAll') }}
        </button>
      </div>
      <div
        v-if="deviceProjectId && filteredDevices.length > 0"
        class="auth-list"
      >
        <div
          v-for="d in filteredDevices"
          :key="d.id"
          class="auth-row"
        >
          <label class="auth-checkbox">
            <input
              type="checkbox"
              :checked="hasDeviceAuth(d.id)"
              @change="toggleDeviceAuth(d.id)"
            >
            <span class="auth-name">{{ d.deviceName }}</span>
          </label>
          <select
            v-if="hasDeviceAuth(d.id)"
            v-model="deviceAuthMap[d.id]"
            class="permission-select"
          >
            <option value="read">
              {{ $t('system.roles.permissionRead') }}
            </option>
            <option value="write">
              {{ $t('system.roles.permissionWrite') }}
            </option>
          </select>
        </div>
      </div>
      <div
        v-if="deviceProjectId && filteredDevices.length === 0"
        class="auth-empty"
      >
        {{ $t('system.roles.noDeviceAuth') }}
      </div>
    </div>

    <div class="auth-actions">
      <button
        class="btn-save btn-primary"
        :disabled="saving"
        @click="saveAll"
      >
        {{ saving ? $t('system.roles.saving') : $t('system.roles.saveAuth') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { roleApi } from '../../api/modules/role.api';
import type { ProjectAuthDto } from '../../api/modules/role.api';
import { useProjectStore } from '../../stores/project.store';
import { deviceApi } from '../../api/modules/device.api';
import type { Project, Device, DeviceGroup } from '../../types/api';
import { showError } from '../../utils/messageBox';

const props = defineProps<{
  roleId: string;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const activeTab = ref<'project' | 'device'>('project');
const saving = ref(false);

const tabs = [
  { key: 'project' as const, labelKey: 'system.roles.projectAuth' },
  { key: 'device' as const, labelKey: 'system.roles.deviceAuth' },
];

const { t } = useI18n();
const projectStore = useProjectStore();

// ──────── 公共数据 ────────
const projects = ref<Project[]>([]);

// ──────── 项目授权 ────────
const projectAuthMap = reactive<Record<string, 'read' | 'write' | 'admin'>>({});

function hasProjectAuth(pid: string): boolean {
  return pid in projectAuthMap;
}

function toggleProjectAuth(pid: string) {
  if (hasProjectAuth(pid)) {
    delete projectAuthMap[pid];
  } else {
    projectAuthMap[pid] = 'read';
  }
}

function selectAllProjects() {
  for (const p of projects.value) {
    if (!hasProjectAuth(p.projectId)) {
      projectAuthMap[p.projectId] = 'read';
    }
  }
}

function deselectAllProjects() {
  for (const pid of Object.keys(projectAuthMap)) {
    delete projectAuthMap[pid];
  }
}

// ──────── 设备授权 ────────
const deviceProjectId = ref('');
const deviceGroupFilter = ref('');
const allDevices = ref<Device[]>([]);
const allGroups = ref<DeviceGroup[]>([]);

const filteredDevices = computed<Device[]>(() => {
  if (!deviceGroupFilter.value) return allDevices.value;
  return allDevices.value.filter((d: any) => d.groupId === deviceGroupFilter.value);
});

const deviceAuthMap = reactive<Record<string, 'read' | 'write'>>({});

function hasDeviceAuth(deviceId: string): boolean {
  return deviceId in deviceAuthMap;
}

function toggleDeviceAuth(deviceId: string) {
  if (hasDeviceAuth(deviceId)) {
    delete deviceAuthMap[deviceId];
  } else {
    deviceAuthMap[deviceId] = 'read';
  }
}

function selectAllDevices() {
  for (const d of filteredDevices.value) {
    if (!hasDeviceAuth(d.id)) {
      deviceAuthMap[d.id] = 'read';
    }
  }
}

function deselectAllDevices() {
  for (const deviceId of Object.keys(deviceAuthMap)) {
    // Only remove those visible in current filter
    if (filteredDevices.value.some(d => d.id === deviceId)) {
      delete deviceAuthMap[deviceId];
    }
  }
}

function onDeviceGroupFilterChange() {
  // filteredDevices recomputes automatically
}

// ──────── 数据加载 ────────

async function loadProjects() {
  try {
    await projectStore.fetchProjects(1, 100);
    projects.value = projectStore.projects;
  } catch { showError(t('common.loadError')); }
}

async function loadProjectAuths() {
  try {
    const res = await roleApi.getProjectAuths(props.roleId);
    const data: ProjectAuthDto[] = (res as any)?.data || res || [];
    for (const k of Object.keys(projectAuthMap)) {
      delete projectAuthMap[k];
    }
    for (const auth of data) {
      projectAuthMap[auth.projectId] = auth.permission;
    }
  } catch { showError(t('common.loadError')); }
}

async function loadDeviceData() {
  for (const k of Object.keys(deviceAuthMap)) delete deviceAuthMap[k];
  allDevices.value = [];
  allGroups.value = [];
  deviceGroupFilter.value = '';

  if (!deviceProjectId.value) return;

  try {
    const res = await deviceApi.list(deviceProjectId.value, { page: 1, pageSize: 100 } as any);
    allDevices.value = (res as any)?.data || (res as any) || [];
    const groupsRes = await deviceApi.listGroups(deviceProjectId.value);
    allGroups.value = (groupsRes as any)?.data || (groupsRes as any) || [];
  } catch { showError(t('common.loadError')); }

  await loadDeviceAuths();
}

async function loadDeviceAuths() {
  if (!deviceProjectId.value) return;
  try {
    const res = await roleApi.getDeviceAuths(props.roleId, deviceProjectId.value);
    const data: any[] = (res as any)?.data || res || [];
    for (const auth of data) {
      deviceAuthMap[auth.deviceId] = auth.permission;
    }
  } catch { showError(t('common.loadError')); }
}

// ──────── 统一保存 ────────

async function saveAll() {
  saving.value = true;
  try {
    // Save project auths
    const projectAuthList = Object.entries(projectAuthMap).map(([projectId, permission]) => ({
      projectId,
      permission,
    }));
    await roleApi.setProjectAuths(props.roleId, projectAuthList);

    // v8.0：设备分组授权已废弃，不再单独保存分组授权（分组可见性由设备授权推导）
    // Save device auths
    if (deviceProjectId.value) {
      const deviceAuthList = Object.entries(deviceAuthMap).map(([deviceId, permission]) => ({
        deviceId,
        permission,
      }));
      await roleApi.setDeviceAuths(props.roleId, deviceProjectId.value, deviceAuthList);
    }

    emit('saved');
  } finally {
    saving.value = false;
  }
}

// ──────── 初始化 ────────

onMounted(async () => {
  await loadProjects();
  await loadProjectAuths();
});
</script>

<style scoped>
.role-auth-panel {
  background: var(--background);
  border-radius: 8px;
  overflow: hidden;
}
.auth-tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  background: var(--surface);
}
.auth-tab {
  flex: 1;
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
.auth-tab:hover {
  color: var(--text);
}
.auth-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
.auth-tab-content {
  padding: 12px;
}
.auth-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filter-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.auth-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.btn-sm {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-sm:hover {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.auth-list {
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.auth-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}
.auth-row:last-child {
  border-bottom: none;
}
.auth-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}
.auth-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--primary);
  flex-shrink: 0;
}
.auth-name {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.auth-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.permission-select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--background);
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
}
.project-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--background);
  color: var(--text);
  min-width: 140px;
}
.inherit-hint {
  font-size: 11px;
  color: var(--primary);
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.8;
}
.auth-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px;
  border-top: 1px solid var(--border);
}
.btn-save {
  padding: 8px 20px;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: var(--button-text);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
