<template>
  <div
    class="dict-selector"
    :class="[`dict-selector--${size}`]"
  >
    <div
      class="dict-selector-wrapper"
      :class="{ 'is-clearable': allowClear && modelValue }"
    >
      <input
        v-if="filterable"
        ref="inputRef"
        v-model="filterText"
        type="text"
        class="dict-selector-input"
        :placeholder="placeholder || $t('common.pleaseSelect')"
        :disabled="disabled"
        @focus="openOptions"
        @blur="onBlur"
        @input="onFilterInput"
      >
      <div
        v-else
        ref="triggerRef"
        class="dict-selector-trigger"
        @click="toggleOptions"
      >
        <span
          v-if="selectedLabel"
          class="dict-selector-selected"
        >{{ selectedLabel }}</span>
        <span
          v-else
          class="dict-selector-placeholder"
        >{{ placeholder || $t('common.pleaseSelect') }}</span>
      </div>

      <!-- 清除按钮 -->
      <button
        v-if="allowClear && modelValue"
        class="dict-selector-clear"
        tabindex="-1"
        type="button"
        @click.stop="clearValue"
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

      <!-- 箭头 -->
      <svg
        class="dict-selector-arrow"
        :class="{ 'is-open': visible }"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- 下拉面板 -->
    <teleport to="body">
      <div
        v-if="visible"
        ref="panelRef"
        class="dict-selector-panel"
        :style="panelStyle"
      >
        <div
          v-if="loading"
          class="dict-selector-loading"
        >
          {{ $t('common.loading') }}
        </div>
        <div
          v-else-if="filteredOptions.length === 0"
          class="dict-selector-empty"
        >
          {{ emptyText || $t('common.noData') }}
        </div>
        <div
          v-else
          class="dict-selector-options"
        >
          <div
            v-for="opt in filteredOptions"
            :key="opt.value"
            class="dict-selector-option"
            :class="{ 'is-selected': opt.value === modelValue }"
            @mousedown.prevent="selectOption(opt)"
          >
            {{ opt.label }}
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useDict } from '../../composables/useDict';

const props = withDefaults(defineProps<{
  dictId: string;
  modelValue?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  filterable?: boolean;
  allowCustom?: boolean;
  size?: 'small' | 'default' | 'large';
  emptyText?: string;
}>(), {
  locale: 'zh-CN',
  placeholder: '',
  disabled: false,
  allowClear: false,
  filterable: false,
  allowCustom: false,
  size: 'default',
  emptyText: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { loadDict, getOptions, getLabel, loading } = useDict();
const visible = ref(false);
const filterText = ref('');
const inputRef = ref<HTMLInputElement>();
const triggerRef = ref<HTMLDivElement>();
const panelRef = ref<HTMLDivElement>();
const panelStyle = ref({});

// 已加载的选项
const allOptions = computed(() => getOptions(props.dictId));

// 过滤后的选项
const filteredOptions = computed(() => {
  const options = allOptions.value;
  if (!filterText.value || !props.filterable) return options;
  const keyword = filterText.value.toLowerCase();
  return options.filter((opt) => opt.label.toLowerCase().includes(keyword));
});

// 选中项的 label
const selectedLabel = computed(() => getLabel(props.dictId, props.modelValue ?? ''));

// 初始化加载（字典可能尚未创建，捕获异常避免控制台报错）
onMounted(() => {
  loadDict(props.dictId, props.locale).catch(() => {});
});

// 语言切换时重新加载
watch(
  () => props.locale,
  (locale) => {
    loadDict(props.dictId, locale).catch(() => {});
  },
);

// 选中值变化后更新过滤文本
watch(
  () => props.modelValue,
  (val) => {
    if (props.filterable && !visible.value) {
      filterText.value = getLabel(props.dictId, val ?? '');
    }
  },
);

function toggleOptions() {
  if (props.disabled) return;
  visible.value = !visible.value;
  if (visible.value) {
    updatePanelPosition();
  }
}

function openOptions() {
  if (props.disabled) return;
  visible.value = true;
  updatePanelPosition();
}

function closeOptions() {
  // 可编辑 combobox 在关闭时提交自定义输入值
  if (props.filterable && props.allowCustom && filterText.value !== getLabel(props.dictId, props.modelValue ?? '')) {
    emit('update:modelValue', filterText.value);
  }
  visible.value = false;
  if (props.filterable && props.modelValue) {
    filterText.value = getLabel(props.dictId, props.modelValue);
  }
}

function selectOption(opt: { value: string; label: string }) {
  emit('update:modelValue', opt.value);
  if (props.filterable) {
    filterText.value = opt.label;
  }
  closeOptions();
}

function clearValue() {
  emit('update:modelValue', '');
  if (props.filterable) {
    filterText.value = '';
  }
}

function onBlur() {
  // 延迟关闭以允许点击选项
  setTimeout(() => {
    if (!document.activeElement || !panelRef.value?.contains(document.activeElement)) {
      closeOptions();
    }
  }, 200);
}

function onFilterInput() {
  // 输入时自动打开下拉
  if (!visible.value) {
    visible.value = true;
    updatePanelPosition();
  }
}

function updatePanelPosition() {
  const el = (props.filterable ? inputRef.value?.closest('.dict-selector-wrapper') : triggerRef.value?.closest('.dict-selector-wrapper')) as HTMLElement;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  panelStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
}

// 点击外部关闭
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dict-selector')) {
    closeOptions();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick);
});

// 窗口滚动/大小变化时更新位置
function onScrollOrResize() {
  if (visible.value) updatePanelPosition();
}

onMounted(() => {
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScrollOrResize, true);
  window.removeEventListener('resize', onScrollOrResize);
});
</script>

<style scoped>
.dict-selector {
  position: relative;
  font-size: 14px;
  color: var(--text, #333);
}

.dict-selector--small { font-size: 12px; }
.dict-selector--large { font-size: 16px; }

.dict-selector-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border, #d9d9d9);
  border-radius: 6px;
  background: var(--background, #fff);
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 32px;
}

.dict-selector--small .dict-selector-wrapper { min-height: 24px; }
.dict-selector--large .dict-selector-wrapper { min-height: 40px; }

.dict-selector-wrapper:hover {
  border-color: var(--primary, #1890ff);
}

.dict-selector-input,
.dict-selector-trigger {
  flex: 1;
  padding: 4px 28px 4px 12px;
  cursor: pointer;
  user-select: none;
}

.dict-selector-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: inherit;
  color: inherit;
  cursor: text;
}

.dict-selector-input:disabled {
  cursor: not-allowed;
}

.dict-selector-selected {
  color: var(--text, #333);
}

.dict-selector-placeholder {
  color: var(--text-secondary, #999);
}

.dict-selector-clear {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary, #999);
  padding: 2px;
  border-radius: 50%;
}

.dict-selector-clear:hover {
  color: var(--text, #333);
  background: rgba(0, 0, 0, 0.06);
}

.dict-selector-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #999);
  transition: transform 0.2s;
}

.dict-selector-arrow.is-open {
  transform: translateY(-50%) rotate(180deg);
}

/* 下拉面板 */
.dict-selector-panel {
  position: fixed;
  z-index: 9999;
  background: var(--background, #fff);
  border: 1px solid var(--border, #d9d9d9);
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  max-height: 250px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dict-selector-options {
  overflow-y: auto;
  flex: 1;
}

.dict-selector-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: inherit;
}

.dict-selector-option:hover {
  background: rgba(0, 0, 0, 0.04);
}

.dict-selector-option.is-selected {
  color: var(--primary, #1890ff);
  font-weight: 500;
  background: rgba(24, 144, 255, 0.06);
}

.dict-selector-loading,
.dict-selector-empty {
  padding: 20px 12px;
  text-align: center;
  color: var(--text-secondary, #999);
  font-size: 13px;
}
</style>