<template>
  <div class="system-info-page">
    <div class="page-header">
      <h1 class="page-title">
        {{ $t('system.settings.systemInfo') }}
      </h1>
    </div>

    <div class="info-card">
      <div class="card-header">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><circle
          cx="12"
          cy="12"
          r="10"
        /><line
          x1="12"
          y1="16"
          x2="12"
          y2="12"
        /><line
          x1="12"
          y1="8"
          x2="12.01"
          y2="8"
        /></svg>
        <h3>{{ $t('system.settings.systemInfo') }}</h3>
      </div>
      <div class="card-body">
        <div
          v-if="sysInfo"
          class="info-grid"
        >
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.app') }}</span>
            <span class="info-value">{{ sysInfo.appName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.backendVersion') }}</span>
            <span class="info-value">{{ sysInfo.version }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.backendBuildTime') }}</span>
            <span class="info-value">{{ sysInfo.buildTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.frontendVersion') }}</span>
            <span class="info-value">{{ appVersion }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.frontendBuildTime') }}</span>
            <span class="info-value">{{ appBuildTime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.backendApi') }}</span>
            <a
              :href="apiUrl"
              target="_blank"
              class="info-value info-link"
            >
              {{ apiUrl }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line
                x1="10"
                y1="14"
                x2="21"
                y2="3"
              /></svg>
            </a>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.swagger') }}</span>
            <a
              :href="swaggerUrl"
              target="_blank"
              class="info-value info-link"
            >
              {{ swaggerUrl }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line
                x1="10"
                y1="14"
                x2="21"
                y2="3"
              /></svg>
            </a>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.node') }}</span>
            <span class="info-value">{{ sysInfo.nodeVersion }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.platform') }}</span>
            <span class="info-value">{{ sysInfo.platform }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.cpu') }}</span>
            <span class="info-value">{{ sysInfo.cpuCores }} {{ $t('system.settings.cpuCores') }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.memory') }}</span>
            <span class="info-value">{{ sysInfo.totalMemory }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('system.settings.uptime') }}</span>
            <span class="info-value">{{ sysInfo.uptime }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">PID</span>
            <span class="info-value">{{ sysInfo.pid }}</span>
          </div>
        </div>
        <div v-else>
          <button
            class="btn btn-secondary btn-sm"
            @click="fetchSysInfo"
          >
            {{ $t('system.settings.viewSysInfo') }}
          </button>
        </div>
      </div>
    </div>

    <div class="info-card">
      <div class="card-header">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <h3>{{ $t('system.settings.systemHealth') }}</h3>
      </div>
      <div
        v-if="health"
        class="card-body"
      >
        <div
          class="health-status"
          :class="'health-' + health.status"
        >
          <span class="health-indicator" />
          {{ health.status === 'ok' ? $t('system.settings.healthy') : health.status === 'degraded' ? $t('system.settings.degraded') : $t('system.settings.abnormal') }}
        </div>
        <div
          v-if="health.details"
          class="health-details"
        >
          <div class="health-row">
            <span>{{ $t('system.settings.memoryUsage') }}</span>
            <span>{{ health.details.memory?.usagePercent || '-' }}%</span>
          </div>
          <div class="health-row">
            <span>{{ $t('system.settings.diskUsage') }}</span>
            <span>{{ health.details.disk?.usagePercent || '-' }}%</span>
          </div>
          <div class="health-row">
            <span>{{ $t('system.settings.cpuLoad') }}</span>
            <span>{{ health.details.cpu?.loadAvg || '-' }}</span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="card-body"
      >
        <button
          class="btn btn-secondary btn-sm"
          @click="fetchHealth"
        >
          {{ $t('system.settings.checkHealth') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { systemApi } from '../../api/modules/system.api';
import type { SystemInfo } from '../../types/api';

const appVersion = __APP_VERSION__;
const appBuildTime = __BUILD_TIME__;
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const swaggerUrl = `${apiUrl}/api/docs`;

const sysInfo = ref<SystemInfo | null>(null);
const health = ref<any>(null);

async function fetchSysInfo() {
  try {
    const res = await systemApi.getInfo();
    sysInfo.value = res.data || (res as any);
  } catch {
    /* ignore */
  }
}

async function fetchHealth() {
  try {
    const res = await systemApi.getHealth();
    health.value = res.data || (res as any);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  fetchSysInfo();
  fetchHealth();
});
</script>

<style scoped>
.system-info-page {
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
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.info-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.card-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.card-body {
  padding: 16px 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text);
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--background);
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  font-weight: 500;
  color: var(--text);
}

.info-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

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
.btn-secondary { background: var(--border); color: var(--text); }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-sm { padding: 5px 10px; font-size: 13px; }
</style>