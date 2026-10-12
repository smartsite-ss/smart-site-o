<template>
  <div class="channel-config-form">
    <template
      v-for="(field, key) in schema.properties"
      :key="key"
    >
      <div class="kv-row">
        <label class="kv-label">
          {{ field.title || key }}
          <span
            v-if="isRequired(key)"
            class="required"
          >*</span>
        </label>
        <div class="kv-input-wrapper">
          <!-- 字符串类型 -->
          <input
            v-if="field.type === 'string'"
            :value="modelValue[key] ?? field.default ?? ''"
            type="text"
            class="kv-input"
            :placeholder="field.title || key"
            @input="updateValue(key, $event)"
          >
          <!-- 数值类型 -->
          <input
            v-else-if="field.type === 'number'"
            :value="modelValue[key] ?? field.default ?? ''"
            type="number"
            :min="field.minimum"
            :max="field.maximum"
            class="kv-input"
            @input="updateValue(key, $event, 'number')"
          >
          <!-- 布尔类型 -->
          <input
            v-else-if="field.type === 'boolean'"
            :checked="modelValue[key] ?? field.default ?? false"
            type="checkbox"
            class="kv-checkbox"
            @change="updateValue(key, ($event.target as HTMLInputElement).checked)"
          >
          <!-- 枚举类型 -->
          <select
            v-else-if="field.enum"
            :value="modelValue[key] ?? field.default ?? ''"
            class="kv-input kv-select"
            @change="updateValue(key, $event)"
          >
            <option
              v-for="v in field.enum"
              :key="v"
              :value="v"
            >
              {{ v }}
            </option>
          </select>
          <!-- 未知类型 fallback -->
          <input
            v-else
            :value="modelValue[key] ?? ''"
            type="text"
            class="kv-input"
            @input="updateValue(key, $event)"
          >
          <span
            v-if="field.description"
            class="kv-hint"
          >{{ field.description }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">

interface SchemaField {
  type: string;
  title?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  description?: string;
}

interface ConnectionSchema {
  type: string;
  required?: string[];
  properties: Record<string, SchemaField>;
}

const props = defineProps<{
  schema: ConnectionSchema;
  modelValue: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

function isRequired(key: string): boolean {
  return props.schema.required?.includes(key) ?? false;
}

function updateValue(key: string, event: Event | string | number | boolean, type?: string) {
  let val: any;
  if (typeof event === 'string' || typeof event === 'number' || typeof event === 'boolean') {
    val = event;
  } else {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    val = target.value;
  }

  if (type === 'number') {
    val = val === '' ? undefined : Number(val);
  }

  const updated = { ...props.modelValue, [key]: val };
  emit('update:modelValue', updated);
}
</script>

<style scoped>
.channel-config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kv-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kv-label {
  flex: 0 0 130px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.required {
  color: var(--status-error);
}

.kv-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.kv-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.kv-input:focus {
  border-color: var(--primary);
}

.kv-input::placeholder {
  color: var(--text-secondary);
}

.kv-select {
  appearance: auto;
  cursor: pointer;
}

.kv-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--primary);
}

.kv-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
