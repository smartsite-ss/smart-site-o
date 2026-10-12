<template>
  <div class="timer-config-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">
        {{ $t('system.timerConfig.title') }}
      </h2>
      <p class="page-desc">
        {{ $t('system.timerConfig.description') }}
      </p>
    </div>

    <!-- 加载状态 -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <SsLoading
        size="medium"
        :text="$t('common.loading')"
      />
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="error"
      class="error-state"
    >
      <span class="error-icon">&#9888;</span>
      <span class="error-text">{{ error }}</span>
      <button
        class="btn-retry"
        @click="fetchConfigs"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- 定时器配置表格 -->
    <div
      v-else
      class="config-table-wrapper"
    >
      <table class="config-table">
        <thead>
          <tr>
            <th>{{ $t('system.timerConfig.colName') }}</th>
            <th>{{ $t('system.timerConfig.colModule') }}</th>
            <th>{{ $t('system.timerConfig.colCurrentInterval') }}</th>
            <th>{{ $t('system.timerConfig.colDefaultInterval') }}</th>
            <th>{{ $t('system.timerConfig.colRuntimeUpdate') }}</th>
            <th>{{ $t('system.timerConfig.colDescription') }}</th>
            <th>{{ $t('system.timerConfig.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in configs"
            :key="item.id"
            :class="{ 'row-editing': editingId === item.id }"
          >
            <td class="cell-name">
              <code class="config-id">{{ item.id }}</code>
              <span class="config-label">{{ item.name }}</span>
            </td>
            <td>
              <span class="module-tag">{{ item.module }}</span>
            </td>
            <td class="cell-interval">
              <template v-if="editingId === item.id">
                <div class="edit-group">
                  <input
                    ref="editInput"
                    v-model.number="editValue"
                    type="number"
                    class="interval-input"
                    min="100"
                    step="100"
                    @keyup.enter="saveEdit(item)"
                    @keyup.escape="cancelEdit"
                  >
                  <span class="unit">ms</span>
                </div>
              </template>
              <template v-else>
                <span class="interval-value">{{ formatInterval(item.currentInterval) }}</span>
              </template>
            </td>
            <td class="cell-default">
              <span class="interval-value muted">{{ formatInterval(item.defaultInterval) }}</span>
            </td>
            <td class="cell-runtime">
              <span
                v-if="item.runtimeUpdate"
                class="badge badge-yes"
              >
                {{ $t('system.timerConfig.hotReloadYes') }}
              </span>
              <span
                v-else
                class="badge badge-no"
              >
                {{ $t('system.timerConfig.hotReloadNo') }}
              </span>
            </td>
            <td class="cell-desc">
              {{ item.description }}
            </td>
            <td class="cell-actions">
              <template v-if="editingId === item.id">
                <button
                  class="btn-action btn-save"
                  :disabled="savingId === item.id"
                  @click="saveEdit(item)"
                >
                  {{ savingId === item.id ? $t('common.saving') : $t('common.save') }}
                </button>
                <button
                  class="btn-action btn-cancel"
                  @click="cancelEdit"
                >
                  {{ $t('common.cancel') }}
                </button>
              </template>
              <template v-else>
                <button
                  class="btn-action btn-edit"
                  @click="startEdit(item)"
                >
                  {{ $t('common.edit') }}
                </button>
                <button
                  v-if="item.currentInterval !== item.defaultInterval"
                  class="btn-action btn-reset"
                  @click="resetConfig(item)"
                >
                  {{ $t('common.reset') }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <span class="badge badge-yes legend-badge">{{ $t('system.timerConfig.hotReloadYes') }}</span>
          <span>{{ $t('system.timerConfig.hotReloadDesc') }}</span>
        </div>
        <div class="legend-item">
          <span class="badge badge-no legend-badge">{{ $t('system.timerConfig.hotReloadNo') }}</span>
          <span>{{ $t('system.timerConfig.noHotReloadDesc') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { timerConfigApi, type TimerConfigEntry } from '../../api/modules/timer-config.api';
import { SsLoading } from '@scada-editor/shared';
import { showSuccess, showError } from '../../utils/messageBox';

const { t } = useI18n();

// 状态
const configs = ref<TimerConfigEntry[]>([]);
const loading = ref(true);
const error = ref('');
const editingId = ref<string | null>(null);
const editValue = ref<number>(0);
const savingId = ref<string | null>(null);
const editInput = ref<HTMLInputElement | null>(null);

// 加载配置
async function fetchConfigs(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const data = await timerConfigApi.getAll();
    configs.value = Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (e: any) {
    error.value = e?.message || t('common.loadError');
  } finally {
    loading.value = false;
  }
}

// 开始编辑
function startEdit(item: TimerConfigEntry): void {
  editingId.value = item.id;
  editValue.value = item.currentInterval;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
}

// 取消编辑
function cancelEdit(): void {
  editingId.value = null;
  editValue.value = 0;
}

// 保存编辑
async function saveEdit(item: TimerConfigEntry): Promise<void> {
  const newInterval = editValue.value;
  if (!newInterval || newInterval < 100) {
    showError(t('system.timerConfig.invalidInterval'));
    return;
  }
  if (newInterval === item.currentInterval) {
    cancelEdit();
    return;
  }

  savingId.value = item.id;
  try {
    const updated = await timerConfigApi.updateInterval(item.id, newInterval);
    const idx = configs.value.findIndex((c) => c.id === item.id);
    if (idx !== -1) {
      configs.value[idx] = updated;
    }
    editingId.value = null;
    showSuccess(t('system.timerConfig.updateSuccess'));
  } catch (e: any) {
    showError(e?.message || t('system.timerConfig.updateFailed'));
  } finally {
    savingId.value = null;
  }
}

// 重置为默认值
async function resetConfig(item: TimerConfigEntry): Promise<void> {
  try {
    const updated = await timerConfigApi.resetInterval(item.id);
    const idx = configs.value.findIndex((c) => c.id === item.id);
    if (idx !== -1) {
      configs.value[idx] = updated;
    }
    showSuccess(t('system.timerConfig.resetSuccess'));
  } catch (e: any) {
    showError(e?.message || t('system.timerConfig.resetFailed'));
  }
}

// 格式化间隔
function formatInterval(ms: number): string {
  if (ms >= 60_000) {
    const min = ms / 60_000;
    const sec = (ms % 60_000) / 1000;
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  }
  return `${ms}ms`;
}

onMounted(() => {
  fetchConfigs();
});
</script>

<style scoped>
.timer-config-page {
  padding: 24px 32px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* 加载/错误状态 */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.error-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-error) 20%, transparent);
  border-radius: 8px;
  color: var(--status-error);
}

.error-icon {
  font-size: 20px;
}

.error-text {
  flex: 1;
  font-size: 14px;
}

.btn-retry {
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: var(--border);
}

/* 表格 */
.config-table-wrapper {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.config-table thead {
  background: rgba(128, 128, 128, 0.06);
}

.config-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.config-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}

.config-table tbody tr:last-child td {
  border-bottom: none;
}

.config-table tbody tr:hover {
  background: rgba(128, 128, 128, 0.03);
}

.config-table tbody tr.row-editing {
  background: rgba(59, 130, 246, 0.04);
}

/* 名称列 */
.cell-name {
  min-width: 200px;
}

.config-id {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(128, 128, 128, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
  width: fit-content;
  word-break: break-all;
}

.config-label {
  font-size: 14px;
  font-weight: 500;
}

/* 模块标签 */
.module-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  white-space: nowrap;
}

/* 间隔列 */
.cell-interval {
  min-width: 160px;
}

.interval-value {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.interval-value.muted {
  color: var(--text-secondary);
  font-weight: 400;
}

.edit-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.interval-input {
  width: 100px;
  padding: 6px 10px;
  border: 1px solid var(--primary);
  border-radius: 6px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  background: var(--surface);
  outline: none;
}

.interval-input:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
}

.unit {
  color: var(--text-secondary);
  font-size: 13px;
}

/* 默认值列 */
.cell-default {
  min-width: 120px;
}

/* 热更新列 */
.cell-runtime {
  min-width: 100px;
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-yes {
  background: color-mix(in srgb, var(--status-online) 10%, transparent);
  color: var(--status-online);
}

.badge-no {
  background: color-mix(in srgb, var(--status-error) 8%, transparent);
  color: var(--status-error);
}

/* 描述列 */
.cell-desc {
  max-width: 240px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 操作列 */
.cell-actions {
  min-width: 140px;
  white-space: nowrap;
}

.btn-action {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--surface);
  color: var(--text);
}

.btn-action + .btn-action {
  margin-left: 6px;
}

.btn-edit:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-save {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--text);
}

.btn-save:hover:not(:disabled) {
  background: var(--primary);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel:hover {
  border-color: var(--text-secondary);
}

.btn-reset {
  color: var(--status-error);
}

.btn-reset:hover {
  border-color: var(--status-error);
}

/* 图例 */
.legend {
  display: flex;
  gap: 24px;
  padding: 16px;
  border-top: 1px solid var(--border);
  background: rgba(128, 128, 128, 0.02);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.legend-badge {
  flex-shrink: 0;
}
</style>
