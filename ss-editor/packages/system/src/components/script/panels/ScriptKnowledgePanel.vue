<template>
  <div class="script-knowledge-panel">
    <!-- 头部：标题 + 搜索 + 刷新 -->
    <div class="kb-header">
      <div class="kb-header-top">
        <span class="kb-title">📚 脚本知识库</span>
        <button
          class="kb-refresh-btn"
          title="刷新知识库"
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
      <input
        v-model="searchText"
        class="kb-search"
        placeholder="搜索示例..."
      >
      <!-- 版本信息 -->
      <div class="kb-version-bar">
        <span class="kb-version-text">
          版本: {{ kbVersion }}
          <span
            v-if="fromFallback"
            class="kb-fallback-tag"
          >内置</span>
          <span
            v-if="fromCache"
            class="kb-cache-tag"
          >缓存</span>
        </span>
        <span
          v-if="versionCheck && !versionCheck.compatible"
          class="kb-version-warn"
        >{{ versionCheck.message }}</span>
      </div>
    </div>

    <!-- 分类标签 -->
    <div
      v-if="!searchText && categories.length > 0"
      class="kb-tabs"
    >
      <button
        v-for="cat in categories"
        :key="cat.category"
        class="kb-tab"
        :class="{ 'kb-tab--active': activeCategory === cat.category }"
        @click="activeCategory = cat.category"
      >
        <span class="kb-tab-icon">{{ cat.icon }}</span>
        {{ cat.label }}
        <span class="kb-tab-count">({{ cat.items.length }})</span>
      </button>
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
              插入代码
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态：加载中 -->
      <div
        v-if="isLoading"
        class="kb-empty"
      >
        加载中...
      </div>

      <!-- 空状态：无结果 -->
      <div
        v-if="!isLoading && filteredExamples.length === 0 && isLoaded"
        class="kb-empty"
      >
        {{ searchText ? '无匹配结果' : '暂无示例' }}
      </div>

      <!-- 空状态：未加载 -->
      <div
        v-if="!isLoading && !isLoaded"
        class="kb-empty"
      >
        <button
          class="kb-load-btn"
          @click="handleRefresh"
        >
          加载知识库
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useKnowledgeBase } from '../composables/useKnowledgeBase';

const emit = defineEmits<{
  (e: 'insertSnippet', code: string): void;
}>();

const {
  isLoading: _kbLoading,
  isLoaded,
  fromCache,
  fromFallback,
  versionCheck,
  kbVersion,
  examples,
  allExamples,
  loadKb,
  refreshKb,
} = useKnowledgeBase();

// 本地状态
const searchText = ref('');
const activeCategory = ref('');
const expandedId = ref<string | null>(null);
const isLoading = ref(false);

// 初始化加载
onMounted(async () => {
  isLoading.value = true;
  await loadKb();
  isLoading.value = false;
});

// 分类列表
const categories = computed(() => examples.value);

// 过滤后的示例
const filteredExamples = computed(() => {
  if (searchText.value) {
    const lower = searchText.value.toLowerCase();
    return allExamples.value.filter(
      (ex) =>
        ex.title.toLowerCase().includes(lower) ||
        ex.description.toLowerCase().includes(lower) ||
        ex.code.toLowerCase().includes(lower) ||
        ex.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  }

  if (activeCategory.value) {
    const cat = (examples.value as any[]).find((c: any) => c.category === activeCategory.value);
    return cat?.items ?? [];
  }

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
  isLoading.value = true;
  await refreshKb();
  isLoading.value = false;
}
</script>

<style scoped>
.script-knowledge-panel {
  border: 1px solid #334155;
  background: #1e293b;
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
  background: #0f172a;
  border-bottom: 1px solid #334155;
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
  color: #e2e8f0;
  font-size: 13px;
}
.kb-refresh-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}
.kb-refresh-btn:hover:not(:disabled) {
  background: #334155;
  color: #e2e8f0;
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
.kb-search {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
  margin-bottom: 4px;
}
.kb-search:focus {
  outline: none;
  border-color: #3b82f6;
}

/* ── 版本条 ── */
.kb-version-bar {
  font-size: 11px;
  color: #64748b;
  padding: 2px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.kb-version-warn {
  color: #f59e0b;
  font-size: 10px;
}
.kb-fallback-tag {
  background: #f59e0b;
  color: #0f172a;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 4px;
}
.kb-cache-tag {
  background: #3b82f6;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  margin-left: 4px;
}

/* ── 分类标签 ── */
.kb-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #334155;
  background: #0f172a;
  flex-shrink: 0;
}
.kb-tab {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}
.kb-tab:hover {
  background: #334155;
  color: #e2e8f0;
}
.kb-tab--active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.kb-tab-icon {
  margin-right: 2px;
}
.kb-tab-count {
  opacity: 0.7;
  margin-left: 2px;
}

/* ── 示例列表 ── */
.kb-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  min-height: 0;
}
.kb-item {
  border: 1px solid #334155;
  border-radius: 4px;
  margin-bottom: 4px;
  background: #0f172a;
  overflow: hidden;
}
.kb-item-header {
  padding: 8px 10px;
  cursor: pointer;
}
.kb-item-header:hover {
  background: #1e293b;
}
.kb-item-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.kb-item-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 12px;
}
.kb-item-difficulty {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
}
.kb-item-difficulty--easy {
  background: #10b981;
  color: #fff;
}
.kb-item-difficulty--medium {
  background: #f59e0b;
  color: #fff;
}
.kb-item-difficulty--hard {
  background: #ef4444;
  color: #fff;
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
  color: #3b82f6;
  background: #1e293b;
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
  color: #64748b;
  background: #1e293b;
  padding: 1px 4px;
  border-radius: 3px;
}
.kb-item-desc {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.4;
}

/* ── 展开内容 ── */
.kb-item-body {
  border-top: 1px solid #334155;
  padding: 8px 10px;
  background: #1e293b;
}
.kb-item-code {
  margin: 0;
  padding: 8px;
  background: #0f172a;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #94a3b8;
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
  background: #10b981;
  color: #fff;
  border: 1px solid #10b981;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}
.kb-insert-btn:hover {
  background: #059669;
}

/* ── 空状态 ── */
.kb-empty {
  color: #64748b;
  text-align: center;
  padding: 20px;
  font-size: 12px;
}
.kb-load-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.kb-load-btn:hover {
  background: #2563eb;
}
</style>