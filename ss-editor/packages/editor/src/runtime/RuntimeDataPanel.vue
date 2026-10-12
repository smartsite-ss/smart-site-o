<template>
  <div
    v-if="visible"
    class="runtime-data-panel-overlay"
    @click.self="close"
  >
    <div class="runtime-data-panel">
      <div class="panel-header">
        <div class="panel-title">
          <span class="panel-icon">📊</span>
          <span>数据管理面板</span>
          <span class="panel-subtitle">实时数据监控</span>
        </div>
        <div class="panel-header-right">
          <button
            type="button"
            class="btn-refresh"
            :class="{ spinning: isRefreshing }"
            @click="manualRefresh"
          >
            🔄
          </button>
          <span
            v-if="wsConnected !== undefined"
            class="ws-status"
            :class="wsConnected ? 'ws-online' : 'ws-offline'"
            :title="wsConnected ? 'WebSocket 已连接 — 实时数据推送中' : 'WebSocket 未连接 — 等待实时数据…'"
          >
            {{ wsConnected ? '⚡' : '🔌' }}
          </span>
          <button
            type="button"
            class="btn-close"
            @click="close"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="panel-body">
        <div
          v-if="!sources || sources.length === 0"
          class="empty-state"
        >
          <span class="empty-icon">📭</span>
          <span>暂无数据源</span>
        </div>

        <div
          v-for="source in sources"
          :key="source.id"
          class="source-card"
          :class="'status-' + source.status"
        >
          <!-- 头部：类型标识 + 名称 + 状态 -->
          <div class="source-header">
            <div class="source-info">
              <span
                class="source-type-badge"
                :class="'type-' + source.type"
              >
                {{ typeLabel(source.type) }}
              </span>
              <span class="source-name">{{ source.name }}</span>
            </div>
            <div class="source-status">
              <span
                class="status-dot"
                :class="'dot-' + source.status"
              />
              <span class="status-label">{{ statusLabel(source.status) }}</span>
            </div>
          </div>

          <!-- 数据详情行（参照编辑态摘要表：质量 / 更新值 / 更新时间） -->
          <div class="source-detail">
            <div class="detail-item">
              <span class="detail-label">质量</span>
              <span
                v-if="source.quality"
                class="quality-badge"
                :class="'q-' + source.quality"
              >{{ qualityLabel(source.quality) }}</span>
              <span
                v-else
                class="detail-empty"
              >—</span>
            </div>
            <div class="detail-item detail-value">
              <span class="detail-label">更新值</span>
              <span
                v-if="source.lastValue !== null && source.lastValue !== undefined"
                class="detail-data-value"
              >{{ source.lastValue }}</span>
              <span
                v-else
                class="detail-empty"
              >—</span>
            </div>
            <div class="detail-item detail-time">
              <span class="detail-label">更新时间</span>
              <span class="detail-data-time">
                {{ source.updatedAt ? formatTime(source.updatedAt) : '—' }}
              </span>
            </div>
          </div>

          <div
            v-if="source.errorMessage"
            class="source-error"
          >
            {{ source.errorMessage }}
          </div>

          <div
            v-if="source.tags && source.tags.length > 0"
            class="source-tags"
          >
            <div class="tags-header">
              <span>关联标签 ({{ source.tags.length }})</span>
              <button
                type="button"
                class="btn-toggle"
                @click="toggleTags(source.id)"
              >
                {{ expandedTags[source.id] ? '收起' : '展开' }}
              </button>
            </div>
            <div
              v-show="expandedTags[source.id] !== false"
              class="tags-table"
            >
              <table>
                <thead>
                  <tr>
                    <th>标签ID</th>
                    <th>标签名</th>
                    <th>当前值</th>
                    <th>质量</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="tag in source.tags"
                    :key="tag.tagId"
                  >
                    <td class="cell-tagid">
                      {{ tag.tagId }}
                    </td>
                    <td>{{ tag.tagName }}</td>
                    <td class="cell-value">
                      {{ tag.currentValue ?? '—' }}
                    </td>
                    <td>
                      <span
                        class="quality-badge"
                        :class="'q-' + (tag.quality || 'unknown')"
                      >
                        {{ tag.quality || '—' }}
                      </span>
                    </td>
                    <td class="cell-time">
                      {{ tag.lastUpdate ? formatTime(tag.lastUpdate) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <span class="footer-info">
          共 {{ (sources || []).length }} 个数据源
          <template v-if="totalTagCount > 0"> | {{ totalTagCount }} 个标签</template>
          <template v-if="lastRefreshTime"> | 上次刷新: {{ formatTime(lastRefreshTime) }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, watch, computed } from 'vue';

interface TagEntry {
  tagId: string;
  tagName: string;
  currentValue?: unknown;
  quality?: string;
  lastUpdate?: number;
}

interface SourceEntry {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'loading' | 'active' | 'error' | 'paused';
  lastFetchTime: number;
  errorMessage?: string;
  tags?: TagEntry[];
  /** 数据源级别的聚合更新值（如标签数据源为各变量值拼接） */
  lastValue?: string | null;
  /** 数据源级别的最新更新时间戳 */
  updatedAt?: number | null;
  /** 数据源级别的聚合质量（取所有标签中最差的） */
  quality?: string | null;
}

const props = defineProps<{
  visible: boolean;
  sources?: SourceEntry[];
  getTags?: (sourceId: string) => TagEntry[];
  wsConnected?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  refresh: [];
}>();

const expandedTags = reactive<Record<string, boolean>>({});
const isRefreshing = ref(false);
const lastRefreshTime = ref<number>(0);

const totalTagCount = computed(() => {
  return (props.sources || []).reduce((sum, s) => sum + (s.tags?.length || 0), 0);
});

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    static: '静态', tag: '标签', api: 'API', polling: 'API',
    sql: '数据库', database: '数据库', expression: '表达式',
  };
  return labels[type] || type;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: '空闲', loading: '加载中', active: '活跃',
    error: '错误', paused: '暂停', connecting: '连接中',
    connected: '已连接', disconnected: '已断开',
  };
  return labels[status] || status;
}

function qualityLabel(quality: string): string {
  const labels: Record<string, string> = {
    good: '良好', uncertain: '不确定', bad: '差',
    stale: '陈旧', disconnected: '断开',
  };
  return labels[quality] || quality;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

function toggleTags(sourceId: string) {
  expandedTags[sourceId] = expandedTags[sourceId] === false;
}

function close() {
  emit('close');
}

async function manualRefresh() {
  isRefreshing.value = true;
  emit('refresh');
  // lastRefreshTime 由 sources watch 自动更新（PreviewCanvas push 新数据后触发）
  setTimeout(() => {
    isRefreshing.value = false;
  }, 800);
}

// 监听 sources 变化：PreviewCanvas 推送新数据时自动更新刷新时间戳
watch(() => props.sources, () => {
  lastRefreshTime.value = Date.now();
}, { deep: true });

// 面板第一次打开时初始化时间戳
watch(() => props.visible, (v) => {
  if (v) {
    lastRefreshTime.value = Date.now();
  }
}, { immediate: true });

onUnmounted(() => {
  // 定时器已由 PreviewCanvas 管理，此处无需清理
});
</script>

<style scoped>
.runtime-data-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.runtime-data-panel {
  width: 720px;
  max-height: 80vh;
  background: var(--surface, #fff);
  border-radius: 10px;
  box-shadow: var(--shadow-modal, 0 8px 40px rgba(0, 0, 0, 0.2));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border, #e8eaed);
  background: var(--header-background, #fafbfc);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #1a1a2e);
}

.panel-icon {
  font-size: 18px;
}

.panel-subtitle {
  font-size: 12px;
  color: var(--text-tertiary, #909399);
  font-weight: 400;
  margin-left: 4px;
}

.panel-header-right {
  display: flex;
  gap: 6px;
}

.btn-refresh,
.btn-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--surface, #fff);
  color: var(--text-secondary, #606266);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.ws-status {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  padding: 0 6px;
  border-radius: 6px;
  transition: all 0.3s;
}

.ws-status.ws-online {
  color: #22c55e;
  text-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.ws-status.ws-offline {
  color: #94a3b8;
}

.btn-refresh:hover,
.btn-close:hover {
  background: var(--elevated, #f0f0f0);
  color: var(--text, #1a1a2e);
}

.btn-refresh.spinning {
  animation: spin 0.6s linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-tertiary, #909399);
  font-size: 14px;
}

.empty-icon {
  font-size: 36px;
}

.source-card {
  border: 1px solid var(--border, #e8eaed);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
  background: var(--surface, #fff);
}

.source-card.status-active {
  border-left: 3px solid var(--status-success, #18a058);
}

.source-card.status-error {
  border-left: 3px solid var(--status-error, #d03050);
}

.source-card.status-loading {
  border-left: 3px solid var(--status-warning, #f0a020);
}

.source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--header-background, #fafbfc);
}

.source-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-type-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

.type-static { background: #909399; }
.type-tag { background: #2080f0; }
.type-api { background: #18a058; }
.type-polling { background: #18a058; }
.type-sql { background: #f0a020; }
.type-database { background: #f0a020; }
.type-expression { background: #9c27b0; }

.source-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #1a1a2e);
}

.source-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-active { background: var(--status-success, #18a058); }
.dot-loading { background: var(--status-warning, #f0a020); animation: pulse 1.2s ease-in-out infinite; }
.dot-error { background: var(--status-error, #d03050); }
.dot-paused { background: var(--text-tertiary, #909399); }
.dot-idle { background: var(--border, #c0c4cc); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-label {
  font-size: 12px;
  color: var(--text-secondary, #606266);
}

/* 数据详情行：参照编辑态摘要表 — 质量 / 更新值 / 更新时间 */
.source-detail {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 14px;
  border-top: 1px solid var(--border-light, #f0f0f0);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.detail-label {
  font-size: 11px;
  color: var(--text-tertiary, #909399);
}

.detail-data-value {
  font-size: 13px;
  font-family: monospace;
  color: var(--primary, #2080f0);
  font-weight: 500;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-data-time {
  font-size: 12px;
  color: var(--text-secondary, #606266);
  white-space: nowrap;
}

.detail-empty {
  font-size: 13px;
  color: var(--text-tertiary, #c0c4cc);
}

.source-error {
  padding: 6px 14px;
  font-size: 12px;
  color: var(--status-error, #d03050);
  background: rgba(208, 48, 80, 0.05);
  border-bottom: 1px solid var(--border, #e8eaed);
}

.source-tags {
  border-top: 1px solid var(--border, #e8eaed);
}

.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-secondary, #606266);
  background: var(--elevated, #f5f7fa);
}

.btn-toggle {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--border, #dcdfe6);
  border-radius: 4px;
  background: var(--surface, #fff);
  color: var(--text-secondary, #606266);
  cursor: pointer;
}

.btn-toggle:hover {
  color: var(--primary, #2080f0);
  border-color: var(--primary, #2080f0);
}

.tags-table {
  overflow-x: auto;
}

.tags-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.tags-table th {
  padding: 6px 10px;
  text-align: left;
  background: var(--header-background, #fafbfc);
  color: var(--text-tertiary, #909399);
  font-weight: 500;
  border-bottom: 1px solid var(--border, #e8eaed);
}

.tags-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
  color: var(--text, #303133);
}

.cell-tagid {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-secondary, #606266);
}

.cell-value {
  font-family: monospace;
  font-weight: 500;
  color: var(--primary, #2080f0);
}

.cell-time {
  font-size: 11px;
  color: var(--text-tertiary, #c0c4cc);
  white-space: nowrap;
}

.quality-badge {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
}

.q-good { background: rgba(24, 160, 88, 0.1); color: var(--status-success, #18a058); }
.q-uncertain { background: rgba(240, 160, 32, 0.1); color: var(--status-warning, #f0a020); }
.q-bad { background: rgba(208, 48, 80, 0.1); color: var(--status-error, #d03050); }
.q-stale { background: rgba(144, 147, 153, 0.1); color: var(--text-tertiary, #909399); }
.q-unknown { color: var(--text-tertiary, #c0c4cc); }

.panel-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border, #e8eaed);
  background: var(--header-background, #fafbfc);
}

.footer-info {
  font-size: 12px;
  color: var(--text-tertiary, #909399);
}
</style>