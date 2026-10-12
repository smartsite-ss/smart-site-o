<template>
  <div class="device-detail-view">
    <div class="page-header">
      <button
        class="btn btn-secondary btn-sm"
        @click="$router.back()"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        ><line
          x1="19"
          y1="12"
          x2="5"
          y2="12"
        /><polyline points="12 19 5 12 12 5" /></svg>
        {{ $t('common.back') }}
      </button>
    </div>

    <SsLoading
      v-if="loading && !device"
      :text="$t('system.deviceDetail.loading')"
      size="small"
    />

    <div
      v-else-if="!device"
      class="empty-state"
    >
      <p>{{ $t('system.deviceDetail.notFound') }}</p>
    </div>

    <template v-else>
      <div class="device-info-panel">
        <div class="info-header">
          <div class="info-title">
            <h2>{{ device.deviceName }} <span class="device-code-tag">{{ deviceDeviceCode }}</span></h2>
            <span
              class="status-badge"
              :class="'status-' + device.status"
            >
              {{ deviceStatusLabel(device.status) }}
            </span>
            <span class="type-badge">{{ deviceTypeLabel(device.type) }}</span>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ $t('common.deviceCode') }}</span>
            <span class="info-value mono">{{ deviceDeviceCode }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.deviceDetail.description') }}</span>
            <span class="info-value">{{ device.description || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('common.nameAlias') }}</span>
            <span class="info-value">{{ deviceNameAlias || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.deviceDetail.tagCount') }}</span>
            <span class="info-value">{{ deviceTags.length }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('common.template') }}</span>
            <span class="info-value">{{ getTemplateName(deviceTemplateId) || deviceTemplateId || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.deviceDetail.lastOnline') }}</span>
            <span class="info-value">{{ formatDate(device.lastOnlineAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.deviceDetail.updateTime') }}</span>
            <span class="info-value">{{ formatDate(device.updatedAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.deviceDetail.errorCount') }}</span>
            <span
              class="info-value"
              :class="{ 'text-danger': device.errorCount }"
            >{{ device.errorCount || 0 }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="deviceConnection && Object.keys(deviceConnection).length > 0"
        class="channel-panel"
      >
        <div class="channel-header">
          <h3>{{ $t('system.devices.channelConfig') }}</h3>
          <span
            v-if="deviceDriver"
            class="driver-tag"
          >{{ deviceDriver }}</span>
        </div>
        <div class="channel-grid">
          <div
            v-for="(value, key) in deviceConnection"
            :key="key"
            class="channel-item"
          >
            <span class="channel-label">{{ key }}</span>
            <span class="channel-value">{{ maskSensitive(String(key), value) }}</span>
          </div>
        </div>
      </div>

      <div class="tags-panel">
        <div class="tags-header">
          <h3>{{ $t('system.deviceDetail.dataTags') }}</h3>
        </div>

        <div
          v-if="deviceTags.length === 0"
          class="tags-empty"
        >
          {{ $t('system.deviceDetail.noTagsDesc') }}
        </div>

        <div
          v-else
          class="tags-table-wrapper"
        >
          <table class="tags-table">
            <thead>
              <tr>
                <th>{{ $t('system.deviceDetail.tagName') }}</th>
                <th>{{ $t('system.deviceDetail.address') }}</th>
                <th>{{ $t('system.deviceDetail.dataType') }}</th>
                <th>{{ $t('common.latestValue') }}</th>
                <th>{{ $t('common.quality') }}</th>
                <th>{{ $t('system.deviceDetail.lastUpdate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tag in deviceTags"
                :key="tag.id"
              >
                <td class="cell-name">
                  {{ tag.name }}
                </td>
                <td><code class="code">{{ tag.address }}</code></td>
                <td>{{ tag.dataType }}</td>
                <td>{{ latestValues[tag.id]?.value ?? '-' }}</td>
                <td>
                  <span
                    class="quality-badge"
                    :class="latestValues[tag.id]?.quality === 'good' ? 'quality-good' : 'quality-bad'"
                  >
                    {{ latestValues[tag.id]?.quality ?? 'N/A' }}
                  </span>
                </td>
                <td class="cell-time">
                  {{ formatDate(latestValues[tag.id]?.timestamp) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, onDeactivated, onActivated, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@scada-editor/core';
import { useDeviceStore } from '../../stores/device.store';
import { useWsStore } from '../../stores/ws.store';
import { SsLoading } from '@scada-editor/shared';
import type { DeviceTemplateListResult } from '../../api/modules/template.api';
import { templateApi } from '../../api/modules/template.api';

const route = useRoute();
const { t } = useI18n();
const deviceStore = useDeviceStore();

const wsStore = useWsStore();

const projectId = route.query.projectId as string || '';
const deviceId = route.params.deviceId as string;

const device = computed(() => deviceStore.currentDevice);
const deviceTags = computed(() => deviceStore.currentDeviceTags);
const loading = computed(() => deviceStore.loading);

/** 合并 HTTPS 初始值 + WebSocket 实时更新 */
const latestValues = computed(() => {
  const http = deviceStore.latestValues; // HTTP 初始快照
  const ws = wsStore.tagValues;          // WebSocket 实时值
  const merged: Record<string, any> = { ...http };
  for (const [tagId, entry] of ws.entries()) {
    if (entry.value !== undefined && entry.value !== null) {
      merged[tagId] = { value: entry.value, quality: entry.quality, timestamp: entry.timestamp };
    }
  }
  return merged;
});

const deviceDeviceCode = computed(() => (device.value as any)?.deviceCode || device.value?.id || '');
const deviceNameAlias = computed(() => (device.value as any)?.nameAlias || '');
const deviceTemplateId = computed(() => (device.value as any)?.templateId || '');

// 模板 ID -> 名称映射
const templateNameMap = ref<Map<string, string>>(new Map());

async function loadTemplateNames() {
  try {
    const res = await templateApi.list({ page: 1, pageSize: 1000 });
    const result: DeviceTemplateListResult = res.data;
    const list = result?.data || [];
    const map = new Map<string, string>();
    for (const tpl of list) {
      if (tpl?.id) map.set(String(tpl.id), tpl.name || tpl.id);
    }
    templateNameMap.value = map;
  } catch {
    // 静默失败
  }
}

function getTemplateName(templateId?: string): string {
  if (!templateId) return '';
  return templateNameMap.value.get(String(templateId)) || templateId;
}

const deviceDriver = computed(() => (device.value as any)?.driver || '');
const deviceConnection = computed(() => {
  const conn = (device.value as any)?.connection || (device.value as any)?.config || {};
  return typeof conn === 'object' ? conn : {};
});

const SENSITIVE_KEYS = new Set(['password', 'passphrase', 'secret', 'token', 'apikey', 'privateKey', 'cert']);

function maskSensitive(key: string, value: any): string {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return '***';
  }
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  modbus_tcp: t('system.devices.deviceTypes.modbus_tcp'),
  modbus_rtu: t('system.devices.deviceTypes.modbus_rtu'),
  opc_ua: t('system.devices.deviceTypes.opc_ua'),
  mqtt: t('system.devices.deviceTypes.mqtt'),
};

const DEVICE_STATUS_LABELS: Record<string, string> = {
  offline: t('system.deviceDetail.statusOffline'),
  connecting: t('system.deviceDetail.statusConnecting'),
  online: t('system.deviceDetail.statusOnline'),
  degraded: t('system.deviceDetail.statusDegraded'),
  error: t('system.deviceDetail.statusError'),
};

function deviceTypeLabel(type: string): string {
  return DEVICE_TYPE_LABELS[type] || type;
}

function deviceStatusLabel(status: string): string {
  return DEVICE_STATUS_LABELS[status] || status;
}

function formatDate(d?: string): string {
  if (!d) return '-';
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

onMounted(async () => {
  // 加载模板名称映射（用于设备详情"模板"信息展示）
  loadTemplateNames();
  if (projectId && deviceId) {
    await deviceStore.fetchDevice(projectId, deviceId);
    await deviceStore.fetchLatestValues(projectId, deviceId);

    // WebSocket 实时订阅
    try {
      await wsStore.connect(projectId);
      const tagIds = deviceTags.value.map((t: any) => t.id);
      if (tagIds.length > 0) {
        wsStore.subscribeTags(tagIds);
      }
    } catch { if (import.meta.env.DEV) console.warn('[DeviceDetail] WS connect failed, falling back to HTTP'); }
  }
});

onUnmounted(() => {
  const tagIds = deviceTags.value.map((t: any) => t.id);
  if (tagIds.length > 0) {
    wsStore.unsubscribeTags(tagIds);
  }
});

// keep-alive 缓存：离开页面时退订 WS，返回时重新订阅
onDeactivated(() => {
  const tagIds = deviceTags.value.map((t: any) => t.id);
  if (tagIds.length > 0) {
    wsStore.unsubscribeTags(tagIds);
  }
});

onActivated(() => {
  const tagIds = deviceTags.value.map((t: any) => t.id);
  if (tagIds.length > 0) {
    wsStore.subscribeTags(tagIds);
  }
});
</script>

<style scoped>
.device-detail-view {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.device-info-panel {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.info-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-code-tag {
  font-size: 12px;
  font-weight: 500;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-online { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.status-offline { background: color-mix(in srgb, var(--text-secondary) 15%, transparent); color: var(--text-secondary); }
.status-connecting { background: rgba(147,197,253,0.15); color: var(--status-info); }
.status-degraded { background: rgba(250,204,21,0.15); color: var(--status-warning); }
.status-error { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--background);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 13px;
  color: var(--text);
}

.info-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.text-danger { color: var(--status-error); }

.tags-panel {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 20px 24px;
}

.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tags-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.tags-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.tags-table-wrapper {
  overflow-x: auto;
}

.tags-table {
  width: 100%;
  border-collapse: collapse;
}

.tags-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--surface);
}

.tags-table td {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid var(--background);
}

.cell-name { font-weight: 500; }

.cell-time { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }

.code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: var(--background);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--status-info);
}

.quality-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.quality-good { background: color-mix(in srgb, var(--status-online) 15%, transparent); color: var(--status-online); }
.quality-bad { background: color-mix(in srgb, var(--status-error) 15%, transparent); color: var(--status-error); }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: var(--text); }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-secondary { background: var(--border-light); color: var(--text); }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-sm { padding: 5px 10px; font-size: 13px; }

.channel-panel {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.channel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.channel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.driver-tag {
  display: inline-block;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.channel-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.channel-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.channel-value {
  font-size: 13px;
  color: var(--text);
  font-family: 'Courier New', monospace;
  word-break: break-all;
}
</style>