<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="tag-variable-selector-overlay"
      @click.self="close"
    >
      <div class="tag-variable-selector-dialog">
        <div class="dialog-header">
          <span class="dialog-title">{{ $t('tagBinding.selector.title') }}</span>
          <button
            class="dialog-close"
            type="button"
            @click="close"
          >×</button>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="$t('tagBinding.selector.searchPlaceholder')"
        >

        <div
          v-if="loading"
          class="status-hint"
        >
          {{ $t('tagBinding.selector.loading') }}
        </div>
        <div
          v-else-if="filteredDevices.length === 0"
          class="status-hint"
        >
          {{ $t('tagBinding.selector.empty') }}
        </div>
        <div
          v-else
          class="device-list"
        >
          <div
            v-for="device in filteredDevices"
            :key="device.deviceId"
            class="device-group"
          >
            <div class="device-header">
              <span class="device-label">{{ deviceLabel(device) }}</span>
              <span class="device-tag-count">{{ $t('tagBinding.selector.tagCount', { count: device.tags.length }) }}</span>
            </div>
            <div
              v-if="device.tags.length === 0"
              class="tag-empty"
            >
              {{ $t('tagBinding.selector.empty') }}
            </div>
            <button
              v-for="tag in device.tags"
              :key="tag.tagId"
              type="button"
              class="tag-item"
              @click="selectTag(device, tag)"
            >
              <span class="tag-name">{{ tag.tagName }}</span>
              <span class="tag-value">{{ tagValueText(tag.tagId) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { deviceApi } from '../../api/modules/device.api';
import { useWsStore } from '../../stores/ws.store';
import type { SelectableVariable } from './types';

interface DeviceEntry {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
}

interface TagEntry {
  tagId: string;
  tagName: string;
  dataType: string;
  unit?: string;
  decimalPlaces?: number;
}

const props = defineProps<{
  visible: boolean;
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', variable: SelectableVariable): void;
}>();

const devices = ref<DeviceEntry[]>([]);
const tagsByDevice = ref<Record<string, TagEntry[]>>({});
const loading = ref(false);
const searchQuery = ref('');
const wsStore = useWsStore();

function close() {
  emit('update:visible', false);
}

function deviceLabel(device: DeviceEntry): string {
  return device.deviceName || device.deviceCode || device.deviceId;
}

// ===== 实时值订阅（列表项展示标签实时值，替代 UUID） =====
let subscribedTagIds: string[] = [];

function collectTagIds(): string[] {
  return Object.values(tagsByDevice.value)
    .flat()
    .map((tag) => tag.tagId);
}

function subscribeAllTags() {
  if (!props.visible) return;
  unsubscribeAllTags();
  subscribedTagIds = collectTagIds();
  if (subscribedTagIds.length === 0) return;
  // 编辑态下 wsStore 可能尚未连接（连接通常由数据面板/数据源配置触发）。
  // 变量绑定选择器需在此确保连接，否则选择设备变量后无法订阅实时数据。
  if (!wsStore.isConnected || wsStore.subscribedProjectId !== props.projectId) {
    void wsStore.connect(props.projectId);
  }
  if (wsStore.isConnected) {
    wsStore.subscribeTags(subscribedTagIds);
  }
}

function unsubscribeAllTags() {
  if (subscribedTagIds.length > 0) {
    wsStore.unsubscribeTags(subscribedTagIds);
    subscribedTagIds = [];
  }
}

function tagValueText(tagId: string): string {
  void wsStore.tagFlushVersion;
  const value = wsStore.getTagValue(tagId);
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return String(value);
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : String(value);
}

async function load() {
  if (!props.projectId) return;
  loading.value = true;
  try {
    const res = await deviceApi.list(props.projectId, { page: 1, pageSize: 100 });
    const list = (res.data || []) as any[];
    devices.value = list.map((d: any) => ({
      deviceId: d.id,
      deviceCode: d.deviceCode || '',
      deviceName: d.deviceName || d.deviceCode || d.id,
    }));

    const map: Record<string, TagEntry[]> = {};
    await Promise.allSettled(
      list.map(async (d: any) => {
        try {
          const detail = await deviceApi.getById(props.projectId, d.id);
          const device = (detail as any)?.data || detail;
          const tags = Array.isArray(device?.tags) ? device.tags : [];
          map[d.id] = tags.map((t: any) => ({
            tagId: t.id,
            tagName: t.name,
            dataType: t.dataType || 'float',
            unit: t.unit ?? '',
            decimalPlaces: t.decimalPlaces,
          }));
        } catch {
          map[d.id] = [];
        }
      }),
    );
    tagsByDevice.value = map;
    subscribeAllTags();
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      searchQuery.value = '';
      load();
    } else {
      unsubscribeAllTags();
    }
  },
);

const filteredDevices = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const result = devices.value.map((device) => {
    const tags = tagsByDevice.value[device.deviceId] || [];
    const filteredTags = q
      ? tags.filter(
          (t) =>
            t.tagName.toLowerCase().includes(q) ||
            t.tagId.toLowerCase().includes(q),
        )
      : tags;
    return { ...device, tags: filteredTags };
  });

  if (!q) return result;
  return result.filter(
    (d) =>
      d.deviceName.toLowerCase().includes(q) ||
      d.deviceCode.toLowerCase().includes(q) ||
      d.tags.length > 0,
  );
});

function selectTag(device: DeviceEntry, tag: TagEntry) {
  emit('select', {
    deviceId: device.deviceId,
    deviceCode: device.deviceCode,
    deviceName: device.deviceName,
    tagId: tag.tagId,
    tagName: tag.tagName,
    dataType: tag.dataType,
    unit: tag.unit,
    decimalPlaces: tag.decimalPlaces,
  });
  close();
}

watch(
  () => wsStore.isConnected,
  (connected) => {
    if (connected) subscribeAllTags();
  },
);

onUnmounted(() => {
  unsubscribeAllTags();
});
</script>

<style scoped>
.tag-variable-selector-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.tag-variable-selector-dialog {
  width: 460px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: var(--surface, #ffffff);
  color: var(--text);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.dialog-close {
  width: 24px;
  height: 24px;
  line-height: 1;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary, #666666);
  cursor: pointer;
  font-size: 18px;
}

.dialog-close:hover {
  background: var(--background, #f5f5f5);
  color: var(--text);
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  box-sizing: border-box;
}

.status-hint {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary, #999999);
}

.device-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-group {
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  padding: 6px;
}

.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.device-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.device-tag-count {
  font-size: 11px;
  color: var(--text-tertiary, #999999);
}

.tag-empty {
  padding: 8px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}

.tag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.tag-item:hover {
  background: var(--background, #f5f5f5);
  border-color: var(--border, #dddddd);
}

.tag-name {
  color: var(--text);
}

.tag-value {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
