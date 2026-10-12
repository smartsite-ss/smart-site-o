<template>
  <div class="value-adjuster">
    <label
      v-if="label"
      class="value-adjuster-label"
    >{{ label }}</label>
    <div class="value-adjuster-control">
      <input
        v-model.number="localValue"
        type="number"
        class="value-adjuster-input"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        @input="updateValue"
      >
      <div class="value-adjuster-buttons">
        <button
          type="button"
          class="value-adjuster-btn value-adjuster-btn-plus"
          @click="adjustValue(step ?? 1)"
        >
          +
        </button>
        <button
          type="button"
          class="value-adjuster-btn value-adjuster-btn-minus"
          @click="adjustValue(-(step ?? 1))"
        >
          −
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: number;
  label?: string;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  inputWidth?: string;
  integer?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

// 确保值是整数
const ensureInteger = (value: number): number => {
  return props.integer ? Math.round(value) : value;
};

const localValue = ref(ensureInteger(props.modelValue));

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  localValue.value = ensureInteger(newValue);
});

// 更新值
const updateValue = () => {
  const newValue = ensureInteger(localValue.value);
  localValue.value = newValue;
  emit('update:modelValue', newValue);
};

// 调整值
const adjustValue = (delta: number) => {
  let newValue = localValue.value + delta;
  
  // 应用最小值和最大值限制
  if (props.min !== undefined) {
    newValue = Math.max(props.min, newValue);
  }
  if (props.max !== undefined) {
    newValue = Math.min(props.max, newValue);
  }
  
  newValue = ensureInteger(newValue);
  localValue.value = newValue;
  emit('update:modelValue', newValue);
};
</script>

<style scoped>
.value-adjuster {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--surface);
  border-radius: 6px;
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all 0.2s ease;
}

.value-adjuster:hover {
  border-color: var(--border-hover);
}

.value-adjuster:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.15);
}

.value-adjuster-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 0 8px;
  height: 28px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
}

.value-adjuster-control {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.value-adjuster-input {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 40px;
  height: 28px;
  box-sizing: border-box;
  outline: none;
}

.value-adjuster-input::-webkit-outer-spin-button,
.value-adjuster-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.value-adjuster-input[type=number] {
  -moz-appearance: textfield;
}

.value-adjuster-input::placeholder {
  color: var(--text-secondary);
}

.value-adjuster-buttons {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  width: 24px;
  flex-shrink: 0;
}

.value-adjuster-btn {
  width: 24px;
  height: 14px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 1;
}

.value-adjuster-btn:hover {
  background: var(--control-button-hover);
  color: var(--text);
}

.value-adjuster-btn:active {
  background: var(--primary);
  color: white;
}

.value-adjuster-btn-plus {
  border-bottom: 1px solid var(--border);
}

.value-adjuster-btn-plus:active {
  border-bottom-color: var(--primary);
}
</style>