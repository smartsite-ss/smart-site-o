<template>
  <div class="script-api-panel">
    <!-- 搜索栏 -->
    <div class="api-header">
      <span class="api-title">{{ $t('system.scriptEditor.api.title') }}</span>
      <input
        v-model="searchText"
        class="api-search"
        :placeholder="$t('system.scriptEditor.api.searchPlaceholder')"
      >
    </div>

    <!-- API 列表 -->
    <div class="api-list">
      <div
        v-for="group in filteredGroups"
        :key="group.label"
        class="api-group"
      >
        <div class="api-group-title">
          <span class="api-group-icon">{{ group.icon }}</span>
          {{ group.label }}
          <span class="api-group-count">({{ group.apis.length }})</span>
        </div>
        <div
          v-for="api in group.apis"
          :key="api.name"
          class="api-item"
          :class="{ 'api-item--selected': selectedApi === api.name }"
          :title="api.summary + ' (' + $t('system.scriptEditor.api.doubleClickInsert') + ')'"
          @click="selectApi(api.name)"
          @dblclick="$emit('insert', api.insertText)"
        >
          <span class="api-name">{{ api.name }}</span>
          <span class="api-signature">{{ api.signature }}</span>
        </div>
      </div>

      <!-- 无结果 -->
      <div
        v-if="filteredGroups.length === 0"
        class="api-empty"
      >
        {{ $t('system.scriptEditor.api.noMatch') }}
      </div>
    </div>

    <!-- API 详情面板 -->
    <div
      v-if="selectedApiDetail"
      class="api-detail-panel"
    >
      <div class="api-detail-header">
        <span class="api-detail-name">{{ selectedApiDetail.name }}</span>
        <button
          class="api-detail-close"
          @click="selectedApi = null"
        >
          ✕
        </button>
      </div>
      <div class="api-detail-body">
        <!-- 签名 -->
        <div class="api-detail-section">
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.signature') }}
          </div>
          <code class="api-detail-signature">{{ selectedApiDetail.signature }}</code>
        </div>

        <!-- 说明 -->
        <div class="api-detail-section">
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.description') }}
          </div>
          <div class="api-detail-text">
            {{ selectedApiDetail.description }}
          </div>
        </div>

        <!-- 分类 -->
        <div class="api-detail-section">
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.category') }}
          </div>
          <span class="api-detail-badge">{{ API_CATEGORY_LABELS[selectedApiDetail.category] }}</span>
          <span
            v-for="env in selectedApiDetail.availableIn"
            :key="env"
            class="api-detail-badge api-detail-badge--env"
          >{{ env }}</span>
        </div>

        <!-- 参数 -->
        <div
          v-if="selectedApiDetail.params.length > 0"
          class="api-detail-section"
        >
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.params') }}
          </div>
          <div class="api-detail-params">
            <div
              v-for="p in selectedApiDetail.params"
              :key="p.name"
              class="api-detail-param"
            >
              <span class="param-name">{{ p.name }}</span>
              <span class="param-type">{{ p.type }}</span>
              <span
                v-if="p.required"
                class="param-required"
              >{{ $t('system.scriptEditor.api.required') }}</span>
              <span
                v-else
                class="param-optional"
              >{{ $t('system.scriptEditor.api.optional') }}</span>
              <span
                v-if="p.defaultValue"
                class="param-default"
              >{{ $t('system.scriptEditor.api.default') }}{{ p.defaultValue }}</span>
              <div class="param-desc">
                {{ p.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- 返回值 -->
        <div
          v-if="selectedApiDetail.returns"
          class="api-detail-section"
        >
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.returns') }}
          </div>
          <div class="api-detail-text">
            {{ selectedApiDetail.returns }}
          </div>
        </div>

        <!-- 使用注意 -->
        <div
          v-if="selectedApiDetail.notes"
          class="api-detail-section"
        >
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.notes') }}
          </div>
          <div class="api-detail-text api-detail-text--warn">
            {{ selectedApiDetail.notes }}
          </div>
        </div>

        <!-- 示例 -->
        <div
          v-if="selectedApiDetail.example"
          class="api-detail-section"
        >
          <div class="api-detail-label">
            {{ $t('system.scriptEditor.api.example') }}
          </div>
          <pre class="api-detail-example">{{ selectedApiDetail.example }}</pre>
        </div>

        <!-- 插入按钮 -->
        <button
          class="api-detail-insert"
          @click="$emit('insert', selectedApiDetail.insertText)"
        >
          {{ $t('system.scriptEditor.api.insertCode') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  API_REGISTRY,
  API_CATEGORY_LABELS,
  API_CATEGORY_ICONS,
  getApiByName,
  type ApiMethodDef,
} from '../rules/script-api-registry';

defineEmits<{
  (e: 'insert', code: string): void;
}>();

const searchText = ref('');
const selectedApi = ref<string | null>(null);

/** 当前选中的 API 详情 */
const selectedApiDetail = computed<ApiMethodDef | null>(() => {
  if (!selectedApi.value) return null;
  return getApiByName(selectedApi.value) ?? null;
});

/** 分类分组后的 API */
const apiGroups = computed(() => {
  const categoryMap = new Map<string, { label: string; icon: string; apis: ApiMethodDef[] }>();

  for (const api of API_REGISTRY) {
    const cat = api.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        label: API_CATEGORY_LABELS[cat],
        icon: API_CATEGORY_ICONS[cat],
        apis: [],
      });
    }
    categoryMap.get(cat)!.apis.push(api);
  }

  return Array.from(categoryMap.values());
});

/** 搜索过滤后的分组 */
const filteredGroups = computed(() => {
  const keyword = searchText.value.toLowerCase().trim();
  if (!keyword) return apiGroups.value;

  return apiGroups.value
    .map((group) => ({
      ...group,
      apis: group.apis.filter(
        (api) =>
          api.name.toLowerCase().includes(keyword) ||
          api.summary.toLowerCase().includes(keyword) ||
          api.description.toLowerCase().includes(keyword) ||
          api.params.some((p) => p.name.toLowerCase().includes(keyword)),
      ),
    }))
    .filter((group) => group.apis.length > 0);
});

/** 选中 API 查看详情 */
function selectApi(name: string) {
  selectedApi.value = selectedApi.value === name ? null : name;
}
</script>

<style scoped>
.script-api-panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.api-header {
  padding: 8px 12px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}
.api-title {
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 6px;
}
.api-search {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  font-size: 12px;
  box-sizing: border-box;
}
.api-search:focus {
  outline: none;
  border-color: var(--border-focus);
}

/* ── API 列表 ── */
.api-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  min-height: 0;
}
.api-group-title {
  color: var(--text-secondary);
  font-size: 11px;
  padding: 8px 8px 4px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.api-group-icon {
  font-size: 12px;
}
.api-group-count {
  color: var(--text-tertiary);
  font-weight: 400;
  margin-left: auto;
}
.api-item {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.api-item:hover {
  background: var(--elevated);
}
.api-item--selected {
  background: var(--elevated);
  border: 1px solid var(--accent);
}
.api-name {
  color: var(--accent);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  font-weight: 500;
}
.api-signature {
  color: var(--text-secondary);
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.api-empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px;
  font-size: 12px;
}

/* ── API 详情面板 ── */
.api-detail-panel {
  border-top: 1px solid var(--border);
  background: var(--background);
  max-height: 45%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.api-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}
.api-detail-name {
  color: var(--accent);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
}
.api-detail-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: var(--radius-md);
}
.api-detail-close:hover {
  background: var(--elevated);
  color: var(--text);
}
.api-detail-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.api-detail-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.api-detail-label {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.api-detail-signature {
  color: var(--accent);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  background: var(--surface);
  padding: 4px 8px;
  border-radius: var(--radius-md);
}
.api-detail-text {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.api-detail-text--warn {
  color: var(--status-warning);
  background: var(--surface);
  padding: 6px 8px;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--status-warning);
}
.api-detail-badge {
  display: inline-block;
  background: var(--elevated);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-md);
  margin-right: 4px;
}
.api-detail-badge--env {
  background: var(--elevated);
  color: var(--accent);
}
.api-detail-params {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.api-detail-param {
  background: var(--surface);
  padding: 6px 8px;
  border-radius: var(--radius-md);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
}
.param-name {
  color: var(--accent);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  font-weight: 500;
}
.param-type {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
}
.param-required {
  color: var(--status-error);
  font-size: 10px;
  font-weight: 600;
  background: var(--elevated);
  padding: 1px 4px;
  border-radius: 3px;
}
.param-optional {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  background: var(--elevated);
  padding: 1px 4px;
  border-radius: 3px;
}
.param-default {
  color: var(--status-warning);
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
.param-desc {
  width: 100%;
  color: var(--text-secondary);
  font-size: 11px;
  margin-top: 2px;
}
.api-detail-example {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  background: var(--surface);
  padding: 8px;
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  line-height: 1.5;
  margin: 0;
}
.api-detail-insert {
  background: var(--status-success);
  color: var(--button-text);
  border: 1px solid var(--status-success);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  margin-top: 4px;
}
.api-detail-insert:hover {
  background: var(--button-hover, color-mix(in srgb, var(--status-success) 80%, black));
}
</style>