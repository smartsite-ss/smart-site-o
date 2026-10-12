<template>
  <div class="base-services-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.baseServices.title') }}
      </h1>
      <div class="header-actions">
        <button
          class="sys-btn sys-btn-primary sys-btn-sm"
          @click="openCreateModal"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            />
            <line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
          {{ $t('system.baseServices.addService') }}
        </button>
        <button
          class="sys-btn sys-btn-secondary sys-btn-sm"
          :disabled="loading"
          @click="refreshAll"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {{ $t('system.baseServices.refresh') }}
        </button>
      </div>
    </div>

    <!-- 服务卡片列表 -->
    <div class="services-grid">
      <div
        v-for="svc in services"
        :key="svc.name"
        class="service-card"
        :class="'status-' + svc.status"
      >
        <div class="card-header">
          <div class="svc-title">
            <span class="svc-name">{{ svc.displayName }}</span>
            <span
              v-if="svc.port"
              class="svc-port"
            >:{{ svc.port }}</span>
          </div>
          <span
            class="status-badge"
            :class="'badge-' + svc.status"
          >
            {{ statusText(svc.status) }}
          </span>
        </div>

        <div class="card-body">
          <div class="status-row">
            <span class="row-label">{{ $t('system.baseServices.pid') }}</span>
            <span class="row-value mono">{{ svc.pid || '-' }}</span>
          </div>
          <div class="status-row">
            <span class="row-label">{{ $t('system.baseServices.processRunning') }}</span>
            <span
              class="row-value"
              :class="svc.processRunning ? 'ok' : 'fail'"
            >
              {{ svc.processRunning ? $t('system.baseServices.yes') : $t('system.baseServices.no') }}
            </span>
          </div>
          <div
            v-if="svc.port"
            class="status-row"
          >
            <span class="row-label">{{ $t('system.baseServices.portReachable') }}</span>
            <span
              class="row-value"
              :class="svc.portReachable ? 'ok' : 'fail'"
            >
              {{ svc.portReachable ? $t('system.baseServices.yes') : $t('system.baseServices.no') }}
            </span>
          </div>
          <div class="status-row">
            <span class="row-label">{{ $t('system.baseServices.uptime') }}</span>
            <span class="row-value mono">{{ formatUptime(svc.uptimeSeconds) }}</span>
          </div>
          <div
            v-if="svc.autoStart || svc.processGuard"
            class="status-row"
          >
            <span class="row-label">{{ $t('system.baseServices.flags') }}</span>
            <span class="row-value flags">
              <span
                v-if="svc.autoStart"
                class="flag-tag flag-auto"
              >{{ $t('system.baseServices.auto') }}</span>
              <span
                v-if="svc.processGuard"
                class="flag-tag flag-guard"
              >{{ $t('system.baseServices.guard') }}</span>
            </span>
          </div>

          <div class="file-checks">
            <div
              class="check-item"
              :class="{ ok: svc.binaryExists, fail: !svc.binaryExists }"
            >
              <span class="check-icon">{{ svc.binaryExists ? '✓' : '✗' }}</span>
              {{ $t('system.baseServices.binary') }}
            </div>
            <div
              class="check-item"
              :class="{ ok: svc.configExists, fail: !svc.configExists }"
            >
              <span class="check-icon">{{ svc.configExists ? '✓' : '✗' }}</span>
              {{ $t('system.baseServices.config') }}
            </div>
            <div
              class="check-item"
              :class="{ ok: svc.logDirExists, fail: !svc.logDirExists }"
            >
              <span class="check-icon">{{ svc.logDirExists ? '✓' : '✗' }}</span>
              {{ $t('system.baseServices.logDir') }}
            </div>
          </div>

          <!-- InfluxDB Setup 状态 -->
          <div
            v-if="svc.name === 'influxdb' && influxSetup"
            class="influx-setup-status"
            :class="{
              'setup-needed': influxSetup.reachable && !influxSetup.initialized,
              'setup-ok': influxSetup.initialized,
              'setup-unknown': !influxSetup.reachable,
            }"
          >
            <span class="setup-dot" />
            <span v-if="influxSetupLoading">{{ $t('system.baseServices.initInfluxdbChecking') }}</span>
            <span v-else-if="influxSetup.reachable && !influxSetup.initialized">
              {{ $t('system.baseServices.initInfluxdbNeeded') }}
            </span>
            <span v-else-if="influxSetup.initialized">
              {{ $t('system.baseServices.initInfluxdbReady') }}
              <span
                v-if="!influxSetup.tokenConfigured"
                class="setup-warn"
              >({{ $t('system.baseServices.notConfigured') }})</span>
            </span>
            <span v-else>{{ $t('system.baseServices.initInfluxdbUnreachable') }}</span>
          </div>

          <!-- NanoMQ 健康状态 -->
          <div
            v-if="svc.name === 'nanomq' && svc.status === 'running' && nanomqHealth"
            class="influx-setup-status"
            :class="{
              'setup-ok': nanomqHealth.reachable,
              'setup-unknown': !nanomqHealth.reachable,
            }"
          >
            <span class="setup-dot" />
            <span v-if="nanomqHealthLoading">{{ $t('system.baseServices.checking') }}</span>
            <span v-else-if="nanomqHealth.reachable">
              {{ $t('system.baseServices.nanomqHealthy') }}
              <span class="setup-ok-ms">({{ nanomqHealth.responseTimeMs }}ms)</span>
            </span>
            <span v-else>{{ nanomqHealth.error || $t('system.baseServices.nanomqUnreachable') }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="actionLoading[svc.name] || svc.status === 'running'"
            @click="handleStart(svc.name)"
          >
            {{ $t('system.baseServices.start') }}
          </button>
          <button
            class="sys-btn sys-btn-warning sys-btn-sm"
            :disabled="actionLoading[svc.name] || svc.status === 'stopped'"
            @click="handleStop(svc.name)"
          >
            {{ $t('system.baseServices.stop') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="actionLoading[svc.name]"
            @click="handleRestart(svc.name)"
          >
            {{ $t('system.baseServices.restart') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="openConfig(svc.name)"
          >
            {{ $t('system.baseServices.config') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="openLogs(svc.name)"
          >
            {{ $t('system.baseServices.logs') }}
          </button>
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="openEditModal(svc.name)"
          >
            {{ $t('system.baseServices.edit') }}
          </button>
          <!-- InfluxDB 一键初始化 -->
          <button
            v-if="svc.name === 'influxdb' && influxSetup?.reachable && !influxSetup?.initialized"
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="influxInitLoading"
            @click="handleInitInfluxDB"
          >
            {{ influxInitLoading ? $t('system.baseServices.initInfluxdbIniting') : $t('system.baseServices.initInfluxdb') }}
          </button>
          <!-- NanoMQ 健康检查 -->
          <button
            v-if="svc.name === 'nanomq' && svc.status === 'running'"
            class="sys-btn sys-btn-secondary sys-btn-sm"
            :disabled="nanomqHealthLoading"
            @click="checkNanomqHealthStatus"
          >
            {{ nanomqHealthLoading ? $t('system.baseServices.checking') : $t('system.baseServices.healthCheck') }}
          </button>
          <button
            class="sys-btn sys-btn-danger sys-btn-sm"
            @click="handleDelete(svc.name)"
          >
            {{ $t('system.baseServices.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!loading && services.length === 0"
      class="empty-state"
    >
      {{ $t('system.baseServices.noServices') }}
    </div>

    <!-- ==================== 新增/编辑服务模态框 ==================== -->
    <div
      v-if="formModal.visible"
      class="modal-overlay"
      @click.self="closeFormModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ formModal.isEdit ? $t('system.baseServices.editService') : $t('system.baseServices.addService') }}
          </h3>
          <button
            class="modal-close"
            @click="closeFormModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldName') }} *</label>
              <input
                v-model="formModal.data.name"
                class="form-input"
                :disabled="formModal.isEdit"
                :placeholder="$t('system.baseServices.fieldNamePlaceholder')"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldDisplayName') }} *</label>
              <input
                v-model="formModal.data.displayName"
                class="form-input"
                :placeholder="$t('system.baseServices.fieldDisplayNamePlaceholder')"
              >
            </div>
            <div class="form-field form-field-full">
              <label class="form-label">{{ $t('system.baseServices.fieldDescription') }}</label>
              <input
                v-model="formModal.data.description"
                class="form-input"
              >
            </div>
            <div class="form-field form-field-full">
              <label class="form-label">{{ $t('system.baseServices.fieldBinaryPath') }}</label>
              <input
                v-model="formModal.data.binaryPath"
                class="form-input"
                placeholder="C:/redis/redis-server.exe"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldStartArgs') }}</label>
              <input
                v-model="formModal.data.startArgs"
                class="form-input"
                placeholder="--port 6379"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldProcessName') }}</label>
              <input
                v-model="formModal.data.processName"
                class="form-input"
                placeholder="redis-server.exe"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldPort') }}</label>
              <input
                v-model.number="formModal.data.port"
                type="number"
                class="form-input"
                placeholder="0"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldConfigPath') }}</label>
              <input
                v-model="formModal.data.configPath"
                class="form-input"
                placeholder="C:/redis/redis.conf"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldLogDir') }}</label>
              <input
                v-model="formModal.data.logDir"
                class="form-input"
                placeholder="C:/redis/logs"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldDataDir') }}</label>
              <input
                v-model="formModal.data.dataDir"
                class="form-input"
                placeholder="C:/redis/data"
              >
            </div>
            <div class="form-field form-field-full">
              <label class="form-label">{{ $t('system.baseServices.fieldStartScript') }}</label>
              <input
                v-model="formModal.data.startScript"
                class="form-input"
                :placeholder="$t('system.baseServices.fieldStartScriptPlaceholder')"
              >
            </div>
            <div class="form-field form-field-full">
              <label class="form-label">{{ $t('system.baseServices.fieldStopScript') }}</label>
              <input
                v-model="formModal.data.stopScript"
                class="form-input"
                :placeholder="$t('system.baseServices.fieldStopScriptPlaceholder')"
              >
            </div>
            <div class="form-field">
              <label class="form-label">{{ $t('system.baseServices.fieldSortOrder') }}</label>
              <input
                v-model.number="formModal.data.sortOrder"
                type="number"
                class="form-input"
                placeholder="0"
              >
            </div>
            <div class="form-field form-checkbox-group">
              <label class="checkbox-label">
                <input
                  v-model="formModal.data.enabled"
                  type="checkbox"
                >
                <span>{{ $t('system.baseServices.fieldEnabled') }}</span>
              </label>
              <label class="checkbox-label">
                <input
                  v-model="formModal.data.autoStart"
                  type="checkbox"
                >
                <span>{{ $t('system.baseServices.fieldAutoStart') }}</span>
              </label>
              <label class="checkbox-label">
                <input
                  v-model="formModal.data.processGuard"
                  type="checkbox"
                >
                <span>{{ $t('system.baseServices.fieldProcessGuard') }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="closeFormModal"
          >
            {{ $t('system.baseServices.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="formModal.saving"
            @click="handleSaveService"
          >
            {{ formModal.saving ? $t('system.baseServices.saving') : $t('system.baseServices.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 配置文件编辑模态框 ==================== -->
    <div
      v-if="configModal.visible"
      class="modal-overlay"
      @click.self="closeConfigModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.baseServices.configTitle') }} - {{ configModal.displayName }}
          </h3>
          <button
            class="modal-close"
            @click="closeConfigModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <SsLoading
            v-if="configModal.loading"
            :text="$t('system.baseServices.loading')"
            size="small"
          />
          <template v-else>
            <div class="config-meta">
              <span>{{ $t('system.baseServices.fileSize') }}: {{ configModal.size }} bytes</span>
            </div>
            <textarea
              v-model="configModal.content"
              class="config-editor"
              spellcheck="false"
              :placeholder="$t('system.baseServices.configPlaceholder')"
            />
          </template>
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="closeConfigModal"
          >
            {{ $t('system.baseServices.cancel') }}
          </button>
          <button
            class="sys-btn sys-btn-primary sys-btn-sm"
            :disabled="configModal.saving"
            @click="handleSaveConfig"
          >
            {{ configModal.saving ? $t('system.baseServices.saving') : $t('system.baseServices.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 日志查看模态框 ==================== -->
    <div
      v-if="logsModal.visible"
      class="modal-overlay"
      @click.self="closeLogsModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ $t('system.baseServices.logsTitle') }} - {{ logsModal.displayName }}
          </h3>
          <button
            class="modal-close"
            @click="closeLogsModal"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="logs-toolbar">
            <label class="limit-select">
              {{ $t('system.baseServices.lines') }}:
              <select
                v-model="logsModal.limit"
                @change="reloadLogs"
              >
                <option :value="100">100</option>
                <option :value="200">200</option>
                <option :value="500">500</option>
              </select>
            </label>
            <div class="toolbar-actions">
              <button
                class="sys-btn sys-btn-secondary sys-btn-sm"
                @click="reloadLogs"
              >
                {{ $t('system.baseServices.refreshLogs') }}
              </button>
              <button
                class="sys-btn sys-btn-danger sys-btn-sm"
                :disabled="logsModal.clearing"
                @click="handleClearLogs"
              >
                {{ logsModal.clearing ? $t('system.baseServices.clearing') : $t('system.baseServices.clearLogs') }}
              </button>
            </div>
          </div>

          <SsLoading
            v-if="logsModal.loading"
            :text="$t('system.baseServices.loading')"
            size="small"
          />
          <div
            v-else-if="logsModal.entries.length === 0"
            class="empty-state"
          >
            {{ $t('system.baseServices.noLogs') }}
          </div>
          <div
            v-else
            class="logs-tab-view"
          >
            <!-- Tab 栏：每个日志文件一个 tab -->
            <div class="log-tabs">
              <button
                v-for="entry in logsModal.entries"
                :key="entry.filename"
                class="log-tab-btn"
                :class="{ active: logsModal.activeTab === entry.filename }"
                :title="`${entry.filename} (${entry.size} bytes)`"
                @click="logsModal.activeTab = entry.filename"
              >
                <span class="tab-filename">{{ entry.filename }}</span>
                <span class="tab-size">{{ formatLogSize(entry.size) }}</span>
              </button>
            </div>
            <!-- 当前选中 tab 的日志内容 -->
            <div
              v-for="entry in logsModal.entries"
              :key="'content-' + entry.filename"
            >
              <pre
                v-if="logsModal.activeTab === entry.filename"
                class="log-content"
              >{{ entry.lines.join('\n') }}</pre>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="sys-btn sys-btn-secondary sys-btn-sm"
            @click="closeLogsModal"
          >
            {{ $t('system.baseServices.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, onDeactivated, onActivated } from 'vue';
import { useI18n } from 'vue-i18n';
import { baseServicesApi } from '../../api/modules/base-services.api';
import type { ServiceStatus, CreateBaseServiceDto, InfluxSetupStatus, NanomqHealthStatus } from '../../api/modules/base-services.api';
import { showConfirm, showSuccess, showError } from '../../utils/messageBox';
import { SsLoading } from '@scada-editor/shared';

const { t } = useI18n();

const services = ref<ServiceStatus[]>([]);
const loading = ref(false);
const actionLoading = reactive<Record<string, boolean>>({});

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ==================== InfluxDB Setup 状态 ====================
const influxSetup = ref<InfluxSetupStatus | null>(null);
const influxSetupLoading = ref(false);
const influxInitLoading = ref(false);

// ==================== NanoMQ 健康状态 ====================
const nanomqHealth = ref<NanomqHealthStatus | null>(null);
const nanomqHealthLoading = ref(false);

// ==================== 新增/编辑模态框 ====================
const formModal = reactive<{
  visible: boolean;
  isEdit: boolean;
  saving: boolean;
  data: CreateBaseServiceDto;
}>({
  visible: false,
  isEdit: false,
  saving: false,
  data: {
    name: '',
    displayName: '',
    description: '',
    binaryPath: '',
    startArgs: '',
    configPath: '',
    logDir: '',
    dataDir: '',
    processName: '',
    port: 0,
    startScript: '',
    stopScript: '',
    enabled: true,
    autoStart: false,
    processGuard: false,
    sortOrder: 0,
  },
});

// ==================== 配置模态框 ====================
const configModal = reactive<{
  visible: boolean;
  name: string | null;
  displayName: string;
  content: string;
  size: number;
  loading: boolean;
  saving: boolean;
}>({
  visible: false,
  name: null,
  displayName: '',
  content: '',
  size: 0,
  loading: false,
  saving: false,
});

// ==================== 日志模态框 ====================
const logsModal = reactive<{
  visible: boolean;
  name: string | null;
  displayName: string;
  entries: Array<{ filename: string; size: number; modifiedAt?: string; lines: string[]; totalLines: number }>;
  limit: number;
  loading: boolean;
  clearing: boolean;
  activeTab: string;
}>({
  visible: false,
  name: null,
  displayName: '',
  entries: [],
  limit: 200,
  loading: false,
  clearing: false,
  activeTab: '',
});

// ==================== 数据加载 ====================
async function fetchAllStatus() {
  loading.value = true;
  try {
    const res = await baseServicesApi.list();
    const data = (res as any).data || (res as any);
    services.value = Array.isArray(data) ? data : [];

    // 如果存在 InfluxDB 服务，检测其 setup 状态
    if (services.value.some((s) => s.name === 'influxdb' && s.processRunning)) {
      checkInfluxSetupStatus();
    }
    // 如果存在 NanoMQ 服务且运行中，检测其健康状态
    if (services.value.some((s) => s.name === 'nanomq' && s.processRunning)) {
      checkNanomqHealthStatus();
    }
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.message || t('system.baseServices.fetchFailed'));
    }
  } finally {
    loading.value = false;
  }
}

function refreshAll() {
  fetchAllStatus();
}

// ==================== 服务操作 ====================
async function handleStart(name: string) {
  actionLoading[name] = true;
  try {
    const res = await baseServicesApi.start(name);
    const data = (res as any).data || (res as any);
    if (data?.success) {
      showSuccess(t('system.baseServices.startSuccess', { name: data.name || name }));
    } else {
      showError(data?.message || t('system.baseServices.startFailed'));
    }
    await fetchAllStatus();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.startFailed'));
    }
  } finally {
    actionLoading[name] = false;
  }
}

async function handleStop(name: string) {
  const confirmed = await showConfirm(t('system.baseServices.stopConfirm', { name }));
  if (!confirmed) return;

  actionLoading[name] = true;
  try {
    const res = await baseServicesApi.stop(name);
    const data = (res as any).data || (res as any);
    if (data?.success) {
      showSuccess(t('system.baseServices.stopSuccess', { name: data.name || name }));
    } else {
      showError(data?.message || t('system.baseServices.stopFailed'));
    }
    await fetchAllStatus();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.stopFailed'));
    }
  } finally {
    actionLoading[name] = false;
  }
}

async function handleRestart(name: string) {
  const confirmed = await showConfirm(t('system.baseServices.restartConfirm', { name }));
  if (!confirmed) return;

  actionLoading[name] = true;
  try {
    const res = await baseServicesApi.restart(name);
    const data = (res as any).data || (res as any);
    if (data?.success) {
      showSuccess(t('system.baseServices.restartSuccess', { name: data.name || name }));
    } else {
      showError(data?.message || t('system.baseServices.restartFailed'));
    }
    await fetchAllStatus();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.restartFailed'));
    }
  } finally {
    actionLoading[name] = false;
  }
}

async function handleDelete(name: string) {
  const confirmed = await showConfirm(t('system.baseServices.deleteConfirm', { name }));
  if (!confirmed) return;

  try {
    await baseServicesApi.remove(name);
    showSuccess(t('system.baseServices.deleteSuccess'));
    await fetchAllStatus();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.deleteFailed'));
    }
  }
}

// ==================== InfluxDB 初始化 ====================
async function checkInfluxSetupStatus() {
  influxSetupLoading.value = true;
  try {
    const res = await baseServicesApi.checkInfluxSetup();
    const data = (res as any).data || (res as any);
    influxSetup.value = data;
  } catch {
    influxSetup.value = null;
  } finally {
    influxSetupLoading.value = false;
  }
}

// ==================== NanoMQ 健康检测 ====================

async function checkNanomqHealthStatus() {
  nanomqHealthLoading.value = true;
  try {
    const res = await baseServicesApi.checkNanomqHealth();
    const data = (res as any).data || (res as any);
    nanomqHealth.value = data;
  } catch {
    nanomqHealth.value = null;
  } finally {
    nanomqHealthLoading.value = false;
  }
}

async function handleInitInfluxDB() {
  const confirmed = await showConfirm(t('system.baseServices.initInfluxdbDesc'));
  if (!confirmed) return;

  influxInitLoading.value = true;
  try {
    const res = await baseServicesApi.setupInfluxDB();
    const data = (res as any).data || (res as any);
    if (data?.success) {
      showSuccess(data?.message || t('system.baseServices.initInfluxdbSuccess'));
      await checkInfluxSetupStatus();
      await fetchAllStatus();
    } else {
      showError(data?.message || t('system.baseServices.initInfluxdbFailed'));
    }
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.initInfluxdbFailed'));
    }
  } finally {
    influxInitLoading.value = false;
  }
}

// ==================== 新增/编辑服务 ====================
function openCreateModal() {
  formModal.isEdit = false;
  formModal.visible = true;
  formModal.saving = false;
  formModal.data = {
    name: '',
    displayName: '',
    description: '',
    binaryPath: '',
    startArgs: '',
    configPath: '',
    logDir: '',
    dataDir: '',
    processName: '',
    port: 0,
    startScript: '',
    stopScript: '',
    enabled: true,
    autoStart: false,
    sortOrder: 0,
  };
}

async function openEditModal(name: string) {
  try {
    const res = await baseServicesApi.listConfig();
    const configs = (res as any).data || (res as any);
    const config = Array.isArray(configs) ? configs.find((c: any) => c.name === name) : null;
    if (!config) {
      showError(t('system.baseServices.configNotFound'));
      return;
    }
    formModal.isEdit = true;
    formModal.visible = true;
    formModal.saving = false;
    formModal.data = {
      name: config.name,
      displayName: config.displayName || '',
      description: config.description || '',
      binaryPath: config.binaryPath || '',
      startArgs: config.startArgs || '',
      configPath: config.configPath || '',
      logDir: config.logDir || '',
      dataDir: config.dataDir || '',
      processName: config.processName || '',
      port: config.port || 0,
      startScript: config.startScript || '',
      stopScript: config.stopScript || '',
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? false,
      processGuard: config.processGuard ?? false,
      sortOrder: config.sortOrder ?? 0,
    };
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.fetchFailed'));
    }
  }
}

function closeFormModal() {
  formModal.visible = false;
}

async function handleSaveService() {
  if (!formModal.data.name || !formModal.data.displayName) {
    showError(t('system.baseServices.requiredFields'));
    return;
  }
  formModal.saving = true;
  try {
    if (formModal.isEdit) {
      // Name is in the URL path param, not the body
      const { name: _name, ...updateData } = formModal.data;
      await baseServicesApi.update(formModal.data.name, updateData as any);
      showSuccess(t('system.baseServices.updateSuccess'));
    } else {
      await baseServicesApi.create(formModal.data);
      showSuccess(t('system.baseServices.createSuccess'));
    }
    closeFormModal();
    await fetchAllStatus();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.saveFailed'));
    }
  } finally {
    formModal.saving = false;
  }
}

// ==================== 配置文件 ====================
async function openConfig(name: string) {
  const svc = services.value.find((s) => s.name === name);
  configModal.name = name;
  configModal.displayName = svc?.displayName || name;
  configModal.visible = true;
  configModal.loading = true;
  configModal.content = '';
  configModal.size = 0;

  try {
    const res = await baseServicesApi.getConfig(name);
    const data = (res as any).data || (res as any);
    configModal.content = data?.content || '';
    configModal.size = data?.size || 0;
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.configLoadFailed'));
    }
    configModal.visible = false;
  } finally {
    configModal.loading = false;
  }
}

function closeConfigModal() {
  configModal.visible = false;
  configModal.name = null;
}

async function handleSaveConfig() {
  if (!configModal.name) return;
  configModal.saving = true;
  try {
    const res = await baseServicesApi.saveConfig(configModal.name, configModal.content);
    const data = (res as any).data || (res as any);
    if (data?.success) {
      showSuccess(t('system.baseServices.configSaved'));
    } else {
      showError(t('system.baseServices.configSaveFailed'));
    }
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.configSaveFailed'));
    }
  } finally {
    configModal.saving = false;
  }
}

// ==================== 日志 ====================
function formatLogSize(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

async function openLogs(name: string) {
  const svc = services.value.find((s) => s.name === name);
  logsModal.name = name;
  logsModal.displayName = svc?.displayName || name;
  logsModal.visible = true;
  logsModal.entries = [];
  logsModal.activeTab = '';
  await reloadLogs();
  // 默认选中第一个日志文件
  if (logsModal.entries.length > 0) {
    logsModal.activeTab = logsModal.entries[0].filename;
  }
}

function closeLogsModal() {
  logsModal.visible = false;
  logsModal.name = null;
  logsModal.entries = [];
  logsModal.activeTab = '';
}

async function reloadLogs() {
  if (!logsModal.name) return;
  logsModal.loading = true;
  try {
    const res = await baseServicesApi.getLogs(logsModal.name, logsModal.limit);
    const data = (res as any).data || (res as any);
    logsModal.entries = Array.isArray(data) ? data : [];
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.logsLoadFailed'));
    }
  } finally {
    logsModal.loading = false;
  }
}

async function handleClearLogs() {
  if (!logsModal.name) return;
  const confirmed = await showConfirm(t('system.baseServices.clearLogsConfirm'));
  if (!confirmed) return;

  logsModal.clearing = true;
  try {
    const res = await baseServicesApi.clearLogs(logsModal.name);
    const data = (res as any).data || (res as any);
    const cleared = Array.isArray(data?.cleared) ? data.cleared.length : 0;
    showSuccess(t('system.baseServices.logsCleared', { count: cleared }));
    await reloadLogs();
  } catch (err: any) {
    if (!err._errorHandled) {
      showError(err?.response?.data?.message || err?.message || t('system.baseServices.logsClearFailed'));
    }
  } finally {
    logsModal.clearing = false;
  }
}

// ==================== 工具函数 ====================
function statusText(status: string): string {
  const map: Record<string, string> = {
    running: t('system.baseServices.statusRunning'),
    stopped: t('system.baseServices.statusStopped'),
    error: t('system.baseServices.statusError'),
    unknown: t('system.baseServices.statusUnknown'),
  };
  return map[status] || status;
}

function formatUptime(sec?: number): string {
  if (!sec && sec !== 0) return '-';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchAllStatus();
  pollTimer = setInterval(fetchAllStatus, 10000);
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

// keep-alive 缓存：离开页面时停止轮询，返回时恢复
onDeactivated(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

onActivated(() => {
  fetchAllStatus();
  if (!pollTimer) {
    pollTimer = setInterval(fetchAllStatus, 10000);
  }
});
</script>

<style scoped>
.base-services-page {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.service-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.service-card.status-running {
  border-left: 3px solid var(--status-success);
}
.service-card.status-stopped {
  border-left: 3px solid var(--text-secondary);
}
.service-card.status-error {
  border-left: 3px solid var(--status-error);
}
.service-card.status-unknown {
  border-left: 3px solid var(--status-warning);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.svc-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.svc-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.svc-port {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.status-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-running {
  background: rgba(16, 185, 129, 0.15);
  color: var(--status-success);
}
.badge-stopped {
  background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
  color: var(--text-secondary);
}
.badge-error {
  background: color-mix(in srgb, var(--status-error) 15%, transparent);
  color: var(--status-error);
}
.badge-unknown {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: var(--status-warning);
}

.card-body {
  padding: 12px 16px;
  flex: 1;
}

.status-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--border);
}

.status-row:last-of-type {
  border-bottom: none;
}

.row-label {
  color: var(--text-secondary);
}

.row-value {
  color: var(--text);
  font-weight: 500;
}

.row-value.mono {
  font-family: monospace;
}

.row-value.ok {
  color: var(--status-success);
}

.row-value.fail {
  color: var(--status-error);
}

.file-checks {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--bg, rgba(0, 0, 0, 0.02));
  border-radius: 6px;
}

.check-item {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.check-item.ok {
  color: var(--status-success);
}

.check-item.fail {
  color: var(--status-error);
}

.check-icon {
  font-weight: bold;
}

/* InfluxDB Setup 状态 */
.influx-setup-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.setup-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.influx-setup-status.setup-needed {
  background: color-mix(in srgb, var(--status-warning) 10%, transparent);
  color: var(--status-warning);
}
.influx-setup-status.setup-needed .setup-dot {
  background: var(--status-warning);
  animation: setup-pulse 1.5s ease-in-out infinite;
}

.influx-setup-status.setup-ok {
  background: rgba(16, 185, 129, 0.1);
  color: var(--status-success);
}
.influx-setup-status.setup-ok .setup-dot {
  background: var(--status-success);
}

.influx-setup-status.setup-unknown {
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  color: var(--text-secondary);
}
.influx-setup-status.setup-unknown .setup-dot {
  background: var(--text-secondary);
}

.setup-warn {
  color: var(--status-warning);
  font-weight: 600;
}

@keyframes setup-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg, rgba(0, 0, 0, 0.02));
}

/* 通用按钮 */
.sys-btn {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sys-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.sys-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sys-btn-primary {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}

.sys-btn-primary:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-warning {
  background: var(--status-warning);
  color: var(--text);
  border-color: var(--status-warning);
}

.sys-btn-warning:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-danger {
  background: var(--status-error);
  color: var(--text);
  border-color: var(--status-error);
}

.sys-btn-danger:hover:not(:disabled) {
  opacity: 0.85;
  color: var(--text);
}

.sys-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.sys-btn-secondary {
  background: var(--surface);
  color: var(--text);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: mb-fade-in 0.2s ease;
}

@keyframes mb-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-dialog {
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: mb-scale-in 0.2s ease;
}

@keyframes mb-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-lg {
  width: 800px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0 4px;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

/* 表单 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field-full {
  grid-column: 1 / -1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-input {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg, rgba(0, 0, 0, 0.02));
  color: var(--text);
  font-size: 13px;
  outline: none;
}

.form-input:focus {
  border-color: var(--primary);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-checkbox-group {
  display: flex;
  gap: 20px;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}

/* 配置编辑器 */
.config-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.config-editor {
  width: 100%;
  min-height: 400px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg, rgba(0, 0, 0, 0.02));
  color: var(--text);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.config-editor:focus {
  border-color: var(--primary);
}

/* 日志 */
.logs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.limit-select {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.limit-select select {
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.logs-tab-view {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.log-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  gap: 0;
  overflow-x: auto;
  flex-shrink: 0;
}

.log-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
  font-family: inherit;
}

.log-tab-btn:hover {
  color: var(--text);
}

.log-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-filename {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.tab-size {
  font-size: 11px;
  color: var(--text-muted, #888);
}

.log-tab-btn.active .tab-size {
  color: var(--primary);
  opacity: 0.7;
}

.log-content {
  margin: 0;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text);
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--bg, rgba(0, 0, 0, 0.01));
}

/* 服务标志标签 */
.flags {
  display: flex;
  gap: 6px;
}

.flag-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

.flag-tag.flag-auto {
  background: color-mix(in srgb, var(--status-online) 15%, transparent);
  color: var(--status-online);
}

.flag-tag.flag-guard {
  background: color-mix(in srgb, var(--status-warning) 15%, transparent);
  color: var(--status-warning);
}
</style>
