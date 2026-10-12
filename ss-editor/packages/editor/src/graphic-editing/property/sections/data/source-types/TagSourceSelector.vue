<template>
  <div class="tag-source-selector">
    <div class="section-header">
      {{ $t('sourceEditor.variableSelect') }}
    </div>
    <span class="hint-text">
      {{ $t('sourceEditor.deviceTreeHint') }}
    </span>

    <div class="tag-layout">
      <div class="tag-tree-panel">
        <div class="panel-header">
          <span class="panel-label">{{ $t('sourceEditor.deviceTreeLabel') }}</span>
          <button
            class="refresh-btn"
            :disabled="loading"
            :title="$t('sourceEditor.refresh')"
            @click="loadActualTags"
          >
            ⟳
          </button>
        </div>
        <!-- 搜索过滤 -->
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="$t('sourceEditor.searchPlaceholder')"
        >
        <!-- 加载中 -->
        <div
          v-if="loading"
          class="status-hint"
        >
          {{ $t('sourceEditor.loading') }}
        </div>
        <!-- 无数据 -->
        <div
          v-else-if="filteredTree.length === 0"
          class="status-hint"
        >
          {{ searchQuery ? $t('sourceEditor.noTags') : $t('sourceEditor.noTags') }}
        </div>
        <!-- 设备变量树 -->
        <div
          v-for="device in filteredTree"
          :key="device.key"
          class="device-group"
        >
          <div class="device-header">
            <label class="device-select-all">
              <input
                type="checkbox"
                :checked="isDeviceAllSelected(device.children)"
                @change="toggleDeviceAll(device.children, device.key)"
              >
            </label>
            <span class="device-label">{{ device.label }}</span>
            <span class="device-tag-count">{{ $t('sourceEditor.tagCount', { count: device.children.length }) }}</span>
          </div>
          <label
            v-for="child in device.children"
            :key="child.key"
            class="tag-checkbox"
          >
            <input
              v-model="selectedTagIds"
              type="checkbox"
              :value="child.key"
              @change="syncData"
            >
            <span>{{ child.label }}</span>
          </label>
        </div>
      </div>

      <div class="tag-selected-panel">
        <div class="panel-header">
          <span class="panel-label">{{ $t('sourceEditor.selectedVars') }}</span>
          <button
            v-if="selectedItems.length > 0"
            class="clear-all-btn"
            @click="clearAll"
          >
            {{ $t('sourceEditor.clearAll') }}
          </button>
          <span class="selected-count">{{ selectedItems.length }}</span>
        </div>
        <div
          v-if="selectedItems.length === 0"
          class="empty-hint"
        >
          {{ $t('sourceEditor.selectFromLeft') }}
        </div>
        <div
          v-for="item in selectedItems"
          :key="item.tagId"
          class="selected-item"
        >
          <span class="selected-name">{{ item.tagName }}</span>
          <span class="selected-id">{{ item.tagId }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="selectedTagIds.length > 0"
      class="preview-section"
    >
      <div class="section-header">
        {{ $t('sourceEditor.realtimePreview') }}
      </div>
      <table>
        <thead>
          <tr>
            <th>{{ $t('sourceEditor.tagId') }}</th>
            <th>{{ $t('sourceEditor.currentValue') }}</th>
            <th>{{ $t('sourceEditor.quality') }}</th>
            <th>{{ $t('sourceEditor.updateTime') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tagId in selectedTagIds"
            :key="tagId"
          >
            <td>{{ tagId }}</td>
            <td>{{ getTagValue(tagId) }}</td>
            <td>
              <span
                class="quality-indicator"
                :style="{ backgroundColor: getQualityColor(tagId) }"
              />
            </td>
            <td>{{ getTagUpdateTime(tagId) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePageDataSourceStore, useProjectStore, useDeviceStore, deviceApi, useWsStore } from '@scada-editor/system';
import type { DataSourceConfig } from '../../../../../../../system/src/api/modules/dataSource.api';
import { useSourceEditor } from './useSourceEditor';
import { getQualityColor as getQualityColorCommon } from '../sourceMeta';

interface TagItem {
  tagId: string;
  tagName: string;
  deviceId: string;
  deviceName: string;
}

const props = defineProps<{
  form: DataSourceConfig;
  typeData: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update', data: Record<string, any>): void;
}>();

const { t, emitUpdate } = useSourceEditor();
const pageDsStore = usePageDataSourceStore();
const projectStore = useProjectStore();
const deviceStore = useDeviceStore();
const wsStore = useWsStore();

const selectedTagIds = ref<string[]>(props.typeData?.tagIds ?? props.form?.tags ?? []);
const actualTags = ref<TagItem[]>([]);
const loading = ref(false);
const searchQuery = ref('');

/** 从 URL 路径中提取 projectId（编辑器路由 /editor/:projectId） */
function getProjectIdFromPath(): string {
  const match = window.location.pathname.match(/\/editor\/([^/]+)/);
  return match ? match[1] : '';
}

/** 从后端加载项目实际设备及变量（与 DeviceMonitorView 相同方式：deviceApi.getById 含内嵌 tags） */
async function loadActualTags() {
  const projectId = projectStore.currentProject?.projectId || getProjectIdFromPath();
  if (!projectId || projectId === 'default-project') return;

  loading.value = true;

  // 1. 获取设备列表
  try {
    await deviceStore.fetchDevices(projectId, 1, 100);
  } catch (err: any) {
    console.error('[TagSourceSelector] 加载设备失败:', err?.response?.status, err?.response?.data?.message || err?.message);
    loading.value = false;
    return;
  }

  // 2. 通过 deviceApi.getById 获取每个设备的详情（含内嵌 tags），与 DeviceMonitorView 一致
  const allTags: TagItem[] = [];
  const devices = deviceStore.devices;
  if (devices.length > 0) {
    const detailResults = await Promise.allSettled(
      devices.map((d) => deviceApi.getById(projectId, d.id)),
    );
    for (const result of detailResults) {
      if (result.status === 'fulfilled' && result.value?.data) {
        const device = result.value.data;
        const tags = Array.isArray(device.tags) ? device.tags : [];
        for (const tag of tags) {
          allTags.push({
            tagId: tag.id,
            tagName: tag.name,
            deviceId: device.id,
            deviceName: device.deviceName,
          });
        }
      }
    }
  }

  actualTags.value = allTags;
  loading.value = false;
}

onMounted(() => {
  loadActualTags();
  // 订阅已选标签到 WebSocket，确保变量实时预览有数据
  subscribeSelectedTags();
});

/** 订阅已选标签到 WebSocket，确保变量实时预览有数据 */
function subscribeSelectedTags() {
  if (selectedTagIds.value.length === 0) return;
  const projectId = projectStore.currentProject?.projectId || getProjectIdFromPath();
  if (!projectId || projectId === 'default-project') {
    console.warn('[TagSourceSelector] projectId 无效，跳过订阅');
    return;
  }
  // 如果 wsStore 未连接或连接到其他项目，则连接
  if (!wsStore.isConnected || wsStore.subscribedProjectId !== projectId) {
    wsStore.connect(projectId);
  }
  wsStore.subscribeTags(selectedTagIds.value);
}

// 当选中的标签变化时，订阅新的标签
watch(selectedTagIds, (newIds, oldIds) => {
  if (newIds.length > 0) {
    subscribeSelectedTags();
  }
});

const deviceTree = computed(() => {
  const deviceMap: Record<string, any[]> = {};
  for (const item of actualTags.value) {
    if (!deviceMap[item.deviceName]) {
      deviceMap[item.deviceName] = [];
    }
    deviceMap[item.deviceName].push({
      label: `${item.tagName} (${item.tagId})`,
      key: item.tagId,
    });
  }
  // 补充 deviceStore 中有但 actualTags 中未出现的设备（按 deviceName 去重）
  for (const device of deviceStore.devices) {
    const deviceName = device.deviceName;
    if (!deviceMap[deviceName]) {
      deviceMap[deviceName] = [];
    }
  }
  return Object.entries(deviceMap).map(([device, children]) => ({
    label: `${t('sourceEditor.deviceLabel')}: ${device}`,
    key: `device_${device}`,
    children,
    disabled: true,
  }));
});

const selectedItems = computed(() =>
  actualTags.value.filter((d) => selectedTagIds.value.includes(d.tagId)),
);

/** 按搜索词过滤设备树 */
const filteredTree = computed(() => {
  if (!searchQuery.value.trim()) return deviceTree.value;
  const query = searchQuery.value.trim().toLowerCase();
  return deviceTree.value
    .map((device) => ({
      ...device,
      children: device.children.filter(
        (c: any) =>
          c.label.toLowerCase().includes(query) ||
          c.key.toLowerCase().includes(query),
      ),
    }))
    .filter((device) => device.children.length > 0);
});

/** 判断设备下所有标签是否全选 */
function isDeviceAllSelected(children: any[]): boolean {
  if (children.length === 0) return false;
  return children.every((c) => selectedTagIds.value.includes(c.key));
}

/** 切换设备下所有标签的选中状态 */
function toggleDeviceAll(children: any[], _deviceKey: string) {
  const childIds = children.map((c) => c.key);
  const allSelected = isDeviceAllSelected(children);
  if (allSelected) {
    selectedTagIds.value = selectedTagIds.value.filter((id) => !childIds.includes(id));
  } else {
    const toAdd = childIds.filter((id) => !selectedTagIds.value.includes(id));
    selectedTagIds.value = [...selectedTagIds.value, ...toAdd];
  }
  syncData();
}

/** 清空全部已选 */
function clearAll() {
  selectedTagIds.value = [];
  syncData();
}

watch(
  () => props.typeData,
  (val) => {
    if (val?.tagIds !== undefined) {
      selectedTagIds.value = val.tagIds;
    }
  },
  { deep: true },
);

function _onCheckChange(keys: string[]) {
  selectedTagIds.value = keys.filter((k) => !k.startsWith('device_'));
  syncData();
}

function syncData() {
  emitUpdate(emit, {
    tagIds: selectedTagIds.value,
  });
}

function getTagValue(tagId: string): string {
  // 优先从 WebSocket 实时缓存读取
  const wsEntry = wsStore.tagValues.get(tagId);
  if (wsEntry?.value !== undefined && wsEntry?.value !== null) {
    return String(wsEntry.value);
  }
  // 回退到 pageDsStore 静态值
  const v = pageDsStore.getVariableByTagId(tagId);
  if (!v || v.currentValue === undefined || v.currentValue === null) return '--';
  return String(v.currentValue);
}

function getQualityColor(tagId: string): string {
  const wsEntry = wsStore.tagValues.get(tagId);
  const quality = wsEntry?.quality ?? pageDsStore.getVariableByTagId(tagId)?.quality;
  // 委托到统一映射 sourceMeta.getQualityColor（已包含 stale/disconnected 完整状态）
  return getQualityColorCommon(quality);
}

function getTagUpdateTime(tagId: string): string {
  const wsEntry = wsStore.tagValues.get(tagId);
  if (wsEntry?.timestamp) return new Date(wsEntry.timestamp).toLocaleTimeString();
  const v = pageDsStore.getVariableByTagId(tagId);
  if (!v?.lastUpdate) return '--';
  return new Date(v.lastUpdate).toLocaleTimeString();
}

syncData();
</script>

<style scoped src="./source-editor-shared.css"></style>
<style scoped>
.tag-source-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.tag-layout {
  display: flex;
  gap: 8px;
}

.tag-tree-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.search-input {
  width: 100%;
  margin: 4px 0;
  padding: 3px 6px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.status-hint {
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
}

.device-group {
  margin-bottom: 6px;
}

.device-group:last-child {
  margin-bottom: 0;
}

.device-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  margin-bottom: 2px;
}

.device-select-all {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.device-select-all input[type="checkbox"] {
  width: auto;
  flex-shrink: 0;
  margin: 0;
}

.device-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.device-tag-count {
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.tag-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0 2px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
}

.tag-checkbox input[type="checkbox"] {
  width: auto;
  flex-shrink: 0;
}

.tag-selected-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.panel-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.panel-header .panel-label {
  margin-bottom: 0;
  flex: 1;
}

.refresh-btn {
  font-size: 14px;
  line-height: 1;
  color: var(--text-secondary);
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  cursor: pointer;
  transition: transform 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--background);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.refresh-btn:active:not(:disabled) {
  transform: rotate(180deg);
}

.clear-all-btn {
  font-size: 10px;
  color: var(--text-secondary);
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 6px;
  cursor: pointer;
}

.clear-all-btn:hover {
  color: var(--status-error, #d03050);
  border-color: var(--status-error, #d03050);
}

.selected-count {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--background);
  border-radius: 8px;
  padding: 0 6px;
  min-width: 18px;
  text-align: center;
}

.empty-hint {
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: center;
  padding: 10px 0;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.selected-name {
  color: var(--text-primary);
}

.selected-id {
  color: var(--text-tertiary);
  font-size: 11px;
}

.preview-section {
  margin-top: 4px;
}

.quality-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
</style>