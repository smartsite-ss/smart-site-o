<template>
  <div
    class="dict-selector"
    :class="{ 'dict-selector--disabled': disabled, 'dict-selector--loading': loading }"
  >
    <select
      v-if="!clearable"
      class="dict-select"
      :value="modelValue ?? ''"
      :disabled="disabled"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option
        value=""
        disabled
      >
        {{ placeholder }}
      </option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
    <!-- 带清除按钮的 select -->
    <div
      v-else
      class="dict-select-clearable"
    >
      <select
        class="dict-select"
        :value="modelValue ?? ''"
        :disabled="disabled"
        @change="onChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <button
        v-if="modelValue && !disabled"
        class="dict-clear-btn"
        type="button"
        tabindex="-1"
        @click="onChange('')"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useDict, type DictOption } from '../composables/useDict';

const props = withDefaults(
  defineProps<{
    /** 字典标识，如 "priority" */
    dictId: string;
    /** v-model 绑定值 */
    modelValue?: string;
    /** 占位提示 */
    placeholder?: string;
    /** 禁用状态 */
    disabled?: boolean;
    /** 是否显示清除按钮 */
    clearable?: boolean;
    /** 尺寸 */
    size?: 'small' | 'default' | 'large';
  }>(),
  {
    modelValue: '',
    placeholder: '请选择',
    disabled: false,
    clearable: false,
    size: 'default',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'change': [value: string, option: DictOption | null];
}>();

const { loadDict, getDictOptions, loading } = useDict();

const options = ref<DictOption[]>([]);

async function refreshOptions() {
  try {
    options.value = await getDictOptions(props.dictId);
  } catch {
    options.value = [];
  }
}

onMounted(async () => {
  await loadDict(props.dictId);
  await refreshOptions();
});

// dictId 变化时重新加载
watch(
  () => props.dictId,
  async () => {
    await loadDict(props.dictId);
    await refreshOptions();
  },
);

function onChange(value: string) {
  const v = value ?? '';
  const opt = options.value.find((o) => o.value === v) ?? null;
  emit('update:modelValue', v);
  emit('change', v, opt);
}
</script>

<style scoped>
.dict-selector {
  display: inline-block;
  position: relative;
}

.dict-select {
  width: 100%;
  padding: 6px 10px;
  font-size: 14px;
  color: var(--text, #333);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #d9d9d9);
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  appearance: auto;
}

.dict-select:focus {
  border-color: var(--primary, #3b82f6);
}

.dict-selector--disabled .dict-select {
  cursor: not-allowed;
  opacity: 0.6;
}

.dict-selector--loading .dict-select {
  opacity: 0.7;
}

.dict-select-clearable {
  position: relative;
  display: flex;
  align-items: center;
}

.dict-select-clearable .dict-select {
  padding-right: 28px;
}

.dict-clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--text-secondary, #999);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px 4px;
}

.dict-clear-btn:hover {
  color: var(--text, #333);
}
</style>
