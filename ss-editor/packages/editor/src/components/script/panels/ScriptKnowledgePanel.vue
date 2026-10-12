<template>
  <div class="script-knowledge-panel">
    <!-- 头部：标题 + 搜索 + 刷新 -->
    <div class="kb-header">
      <div class="kb-header-top">
        <span class="kb-title">📚 {{ $t('scriptEditor.knowledge.title') }}</span>
        <button
          class="kb-refresh-btn"
          :title="$t('scriptEditor.knowledge.refresh')"
          :disabled="isLoading"
          @click="handleRefresh"
        >
          <span
            v-if="isLoading"
            class="kb-spin"
          >↻</span>
          <span v-else>↻</span>
        </button>
      </div>
      <div class="kb-search-row">
        <select
          v-model="activeCategory"
          class="kb-category-select"
        >
          <option value="">
            {{ $t('scriptEditor.knowledge.allCategories') }}
          </option>
          <option
            v-for="cat in categories"
            :key="cat.category"
            :value="cat.category"
          >
            {{ cat.icon }} {{ cat.label }} ({{ cat.items.length }})
          </option>
        </select>
        <input
          v-model="searchText"
          class="kb-search"
          :placeholder="$t('scriptEditor.knowledge.searchPlaceholder')"
        >
      </div>
      <!-- 版本信息 -->
      <div
        v-if="versionCheck"
        class="kb-version-bar"
        :class="{ 'kb-version-bar--warn': !versionCheck.compatible }"
      >
        <span class="kb-version-text">
          {{ $t('scriptEditor.knowledge.version') }}: {{ kbVersion }}
          <span
            v-if="fromFallback"
            class="kb-fallback-tag"
          >{{ $t('scriptEditor.knowledge.fallback') }}</span>
        </span>
      </div>
    </div>



    <!-- 示例列表 -->
    <div class="kb-list">
      <div
        v-for="example in filteredExamples"
        :key="example.id"
        class="kb-item"
        :class="{ 'kb-item--expanded': expandedId === example.id }"
      >
        <!-- 示例标题行 -->
        <div
          class="kb-item-header"
          @click="toggleExpand(example.id)"
        >
          <div class="kb-item-title-row">
            <span class="kb-item-title">{{ example.title }}</span>
            <span
              class="kb-item-difficulty"
              :class="`kb-item-difficulty--${example.difficulty}`"
            >
              {{ difficultyLabel(example.difficulty) }}
            </span>
          </div>
          <div class="kb-item-meta">
            <span class="kb-item-trigger">{{ triggerLabel(example.triggerType) }}</span>
            <span class="kb-item-tags">
              <span
                v-for="tag in example.tags"
                :key="tag"
                class="kb-tag"
              >{{ tag }}</span>
            </span>
          </div>
          <div class="kb-item-desc">
            {{ example.description }}
          </div>
        </div>

        <!-- 展开内容：代码预览 + 插入按钮 -->
        <div
          v-if="expandedId === example.id"
          class="kb-item-body"
        >
          <pre class="kb-item-code">{{ example.code }}</pre>
          <div class="kb-item-actions">
            <button
              class="kb-insert-btn"
              @click="insertExample(example.code)"
            >
              {{ $t('scriptEditor.knowledge.insertCode') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 无结果 -->
      <div
        v-if="filteredExamples.length === 0"
        class="kb-empty"
      >
        {{ $t('scriptEditor.knowledge.noMatch') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useKnowledgeBase } from '../composables/useKnowledgeBase';
import type { ScriptExample } from '../rules/types';

const emit = defineEmits<{
  (e: 'insertSnippet', code: string): void;
}>();

// 使用知识库服务
const {
  isLoading,
  versionCheck,
  kbVersion,
  fromFallback,
  examples,
  allExamples,
  searchExamples,
  loadKb,
  refreshKb,
} = useKnowledgeBase();

// 本地状态
const searchText = ref('');
const activeCategory = ref('');
const expandedId = ref<string | null>(null);

// 初始化加载
onMounted(() => {
  loadKb();
});

// 分类列表
const categories = computed(() => examples.value);

// 过滤后的示例
const filteredExamples = computed<ScriptExample[]>(() => {
  if (searchText.value) {
    return searchExamples(searchText.value);
  }

  if (activeCategory.value) {
    const cat = examples.value.find((c) => c.category === activeCategory.value);
    return cat?.items ?? [];
  }

  // 默认显示所有
  return allExamples.value;
});

// 难度标签
function difficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '入门',
    medium: '进阶',
    hard: '高级',
  };
  return labels[difficulty] || difficulty;
}

// 触发方式标签
function triggerLabel(triggerType: string): string {
  const labels: Record<string, string> = {
    dataChange: '数据变化',
    schedule: '定时任务',
    event: '事件触发',
    manual: '手动触发',
    expression: '表达式',
  };
  return labels[triggerType] || triggerType;
}

// 展开/收起
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

// 插入示例代码
function insertExample(code: string) {
  emit('insertSnippet', code);
}

// 刷新知识库
async function handleRefresh() {
  await refreshKb();
}
</script>

<style scoped>
.script-knowledge-panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ── 头部 ── */
.kb-header {
  padding: 8px 12px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.kb-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.kb-title {
  font-weight: 600;
  color: var(--text);
  font-size: 13px;
}
.kb-refresh-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: var(--radius-md);
}
.kb-refresh-btn:hover:not(:disabled) {
  background: var(--elevated);
  color: var(--text);
}
.kb-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.kb-spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.kb-search-row {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}
.kb-category-select {
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
}
.kb-category-select:focus {
  outline: none;
  border-color: var(--border-focus);
}
.kb-search {
  flex: 1;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  font-size: 12px;
  box-sizing: border-box;
}
.kb-search:focus {
  outline: none;
  border-color: var(--border-focus);
}

/* ── 版本条 ── */
.kb-version-bar {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 0;
}
.kb-version-bar--warn {
  color: var(--status-warning);
}
.kb-fallback-tag {
  background: var(--status-warning);
  color: var(--button-text);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 4px;
}

/* ── 示例列表 ── */
.kb-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  min-height: 0;
}
.kb-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 4px;
  background: var(--background);
  overflow: hidden;
}
.kb-item-header {
  padding: 8px 10px;
  cursor: pointer;
}
.kb-item-header:hover {
  background: var(--elevated);
}
.kb-item-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.kb-item-title {
  font-weight: 600;
  color: var(--text);
  font-size: 12px;
}
.kb-item-difficulty {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
}
.kb-item-difficulty--easy {
  background: var(--status-success);
  color: var(--button-text);
}
.kb-item-difficulty--medium {
  background: var(--status-warning);
  color: var(--button-text);
}
.kb-item-difficulty--hard {
  background: var(--status-error);
  color: var(--button-text);
}
.kb-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.kb-item-trigger {
  font-size: 10px;
  color: var(--accent);
  background: var(--elevated);
  padding: 1px 5px;
  border-radius: 3px;
}
.kb-item-tags {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.kb-tag {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--surface);
  padding: 1px 4px;
  border-radius: 3px;
}
.kb-item-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* ── 展开内容 ── */
.kb-item-body {
  border-top: 1px solid var(--border);
  padding: 8px 10px;
  background: var(--surface);
}
.kb-item-code {
  margin: 0;
  padding: 8px;
  background: var(--background);
  border-radius: var(--radius-md);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
.kb-item-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}
.kb-insert-btn {
  background: var(--status-success);
  color: var(--button-text);
  border: 1px solid var(--status-success);
  padding: 5px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}
.kb-insert-btn:hover {
  background: var(--button-hover, color-mix(in srgb, var(--status-success) 80%, black));
}

/* ── 空状态 ── */
.kb-empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px;
  font-size: 12px;
}
</style>
