<template>
  <div class="tve">
    <div class="tve-head">
      <span class="tve-title">{{ $t('templateVariable.title') }}</span>
      <button class="tve-add" @click="addVar">＋</button>
    </div>
    <div v-if="!vars.length" class="tve-empty">
      {{ $t('templateVariable.resolveHint') }}
    </div>
    <div v-for="(v, idx) in vars" :key="idx" class="tve-row">
      <input
        class="tve-input tve-key"
        v-model="v.key"
        :placeholder="$t('templateVariable.key')"
      />
      <input
        class="tve-input"
        v-model="v.label"
        :placeholder="$t('templateVariable.label')"
      />
      <select class="tve-input" v-model="v.type">
        <option value="text">{{ $t('templateVariable.type.string') }}</option>
        <option value="number">{{ $t('templateVariable.type.number') }}</option>
        <option value="color">{{ $t('templateVariable.type.string') }} (color)</option>
        <option value="bind-tag">{{ $t('templateVariable.type.datatag') }}</option>
      </select>
      <input
        class="tve-input"
        v-model="v.defaultValue"
        :placeholder="$t('templateVariable.default')"
      />
      <button class="tve-del" @click="removeVar(idx)">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { i18n } from '@scada-editor/core';
import type { WidgetTemplateVariable } from '@scada-editor/core';

const { t } = i18n.global;
const $t = t;

const props = defineProps<{
  modelValue: WidgetTemplateVariable[];
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: WidgetTemplateVariable[]): void;
}>();

const vars = ref<WidgetTemplateVariable[]>(clone(props.modelValue || []));

watch(
  vars,
  (val) => emit('update:modelValue', clone(val)),
  { deep: true },
);

function clone(arr: WidgetTemplateVariable[]): WidgetTemplateVariable[] {
  return JSON.parse(JSON.stringify(arr || []));
}

function addVar() {
  vars.value.push({
    key: '',
    label: '',
    type: 'text',
    defaultValue: '',
  });
}

function removeVar(idx: number) {
  vars.value.splice(idx, 1);
}
</script>

<style scoped>
.tve {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tve-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tve-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.tve-add,
.tve-del {
  width: 22px;
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--control-bg);
  color: var(--text);
  cursor: pointer;
}
.tve-empty {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 6px 0;
}
.tve-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 4px;
  align-items: center;
}
.tve-input {
  background: var(--control-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  min-width: 0;
}
.tve-key {
  font-family: monospace;
}
</style>
