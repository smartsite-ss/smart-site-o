<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="tag-detail-overlay"
        @click.self="close"
      >
        <div class="tag-detail-modal">
          <div class="tag-detail-header">
            <h2 class="tag-detail-title">
              {{ $t('system.tagDetail.title', { name: tagData?.name }) }}
            </h2>
            <button
              class="tag-detail-close"
              :title="$t('common.close')"
              @click="close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                />
                <line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                />
              </svg>
            </button>
          </div>

          <div class="tag-detail-body">
            <!-- 当前值条 — 醒目展示 -->
            <div class="current-value-bar">
              <div class="current-value-main">
                <span class="current-value-label">{{ $t('system.devices.tagValue') }}</span>
                <span
                  class="current-value-number"
                  :class="{ 'value-null': tagData?.value === null || tagData?.value === undefined }"
                >
                  {{ formatTagValue(tagData?.value, tagData?.displayFormat) }}
                </span>
              </div>
              <div class="current-value-meta">
                <span
                  class="quality-dot"
                  :class="tagData?.quality === 'good' ? 'quality-good' : 'quality-bad'"
                />
                <span class="quality-text">{{ tagData?.quality || $t('common.notAvailable') }}</span>
                <span class="quality-sep">|</span>
                <span class="mono">{{ formatTime(tagData?.timestamp) }}</span>
              </div>
            </div>

            <!-- 基本信息 -->
            <section class="detail-section">
              <h3 class="detail-section-title">
                {{ $t('system.tagDetail.sectionBasic') }}
              </h3>
              <div class="detail-list">
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagName') }}</span>
                  <span class="detail-value detail-value-strong">{{ tagData?.name || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagAddress') }}</span>
                  <span class="detail-value mono">{{ tagData?.address || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagDataType') }}</span>
                  <span class="detail-value">
                    <span class="type-badge">{{ tagData?.dataType || '-' }}</span>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagUnit') }}</span>
                  <span class="detail-value">{{ tagData?.unit || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.description') }}</span>
                  <span class="detail-value">{{ tagData?.description || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.enabled') }}</span>
                  <span class="detail-value">
                    <span
                      class="enabled-badge"
                      :class="tagData?.enabled !== false ? 'enabled-yes' : 'enabled-no'"
                    >
                      {{ tagData?.enabled !== false ? $t('common.yes') : $t('common.no') }}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <!-- 采集配置 + 数据转换 合并为一个紧凑区块 -->
            <section class="detail-section">
              <h3 class="detail-section-title">
                {{ $t('system.tagDetail.sectionCollection') }} &middot; {{ $t('system.tagDetail.sectionConversion') }}
              </h3>
              <div class="detail-list">
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.scanRate') }}</span>
                  <span class="detail-value">{{ tagData?.scanRate != null ? tagData.scanRate + ' ms' : '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.deadbandMode') }}</span>
                  <span class="detail-value">{{ tagData?.deadband || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.displayFormat') }}</span>
                  <span class="detail-value mono">{{ tagData?.displayFormat || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.scale') }}</span>
                  <span class="detail-value">{{ tagData?.scale ?? '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.tagDetail.offset') }}</span>
                  <span class="detail-value">{{ tagData?.offset ?? '-' }}</span>
                </div>
              </div>
            </section>

            <!-- 报警限值 -->
            <section class="detail-section">
              <h3 class="detail-section-title">
                {{ $t('system.tagDetail.sectionAlarm') }}
              </h3>
              <div class="detail-list">
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagHighLimit') }}</span>
                  <span class="detail-value alarm-high">{{ tagData?.alarmHigh ?? '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">{{ $t('system.devices.tagLowLimit') }}</span>
                  <span class="detail-value alarm-low">{{ tagData?.alarmLow ?? '-' }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { formatTagValue } from '../../../utils/format';

interface TagDetailData {
  name?: string;
  address?: string;
  dataType?: string;
  unit?: string;
  description?: string;
  enabled?: boolean;
  scanRate?: number;
  deadband?: string;
  displayFormat?: string;
  scale?: number;
  offset?: number;
  alarmHigh?: number;
  alarmLow?: number;
  value?: unknown;
  quality?: string;
  timestamp?: string | number | null;
}

defineProps<{
  visible: boolean;
  tagData: TagDetailData | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

function close() {
  emit('update:visible', false);
}

function formatTime(val?: string | number | Date | null): string {
  if (!val && val !== 0) return '-';
  try {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else if (typeof val === 'string') {
      const sqliteMatch = val.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
      if (sqliteMatch) {
        d = new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}Z`);
      } else {
        d = new Date(val);
      }
    } else {
      return '-';
    }
    if (isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch {
    return '-';
  }
}

</script>

<style scoped>
/* ===== Overlay ===== */
.tag-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

/* ===== Modal ===== */
.tag-detail-modal {
  background: var(--background);
  border-radius: 10px;
  width: 90%;
  max-width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 24px -4px rgba(0, 0, 0, 0.25);
}

.tag-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tag-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.tag-detail-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.tag-detail-close:hover {
  color: var(--text);
  background: var(--border-light);
}

/* ===== Body ===== */
.tag-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 16px;
}

/* ===== 当前值醒目条 ===== */
.current-value-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.current-value-main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.current-value-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.current-value-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.current-value-number.value-null {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 16px;
}

.current-value-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.quality-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.quality-dot.quality-good {
  background: var(--status-online);
}

.quality-dot.quality-bad {
  background: var(--status-error);
}

.quality-text {
  text-transform: capitalize;
}

.quality-sep {
  color: var(--border);
}

/* ===== Section ===== */
.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 6px;
}

/* ===== Detail rows ===== */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.detail-row + .detail-row {
  border-top: 1px solid var(--border-light);
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  color: var(--text);
  text-align: right;
  margin-left: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-value-strong {
  font-weight: 600;
}

.mono {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
}

/* ===== Badges ===== */
.type-badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-secondary);
}

.enabled-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.enabled-yes {
  background: var(--status-online-bg, rgba(34, 197, 94, 0.12));
  color: var(--status-online);
}

.enabled-no {
  background: var(--status-offline-bg, rgba(148, 163, 184, 0.12));
  color: var(--text-secondary);
}

/* ===== Alarm colors ===== */
.alarm-high {
  color: var(--status-error);
  font-weight: 600;
}

.alarm-low {
  color: var(--status-warning);
  font-weight: 600;
}

/* ===== Transition ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}

.modal-fade-enter-active .tag-detail-modal,
.modal-fade-leave-active .tag-detail-modal {
  transition: transform 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .tag-detail-modal,
.modal-fade-leave-to .tag-detail-modal {
  transform: scale(0.95);
}
</style>
