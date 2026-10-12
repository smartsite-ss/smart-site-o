<template>
  <div class="state-variable-config">
    <!-- 1. 变量绑定 -->
    <TagBindingEditor
      mode="flat"
      :project-id="projectId"
      :current="current"
      @add="addVariable"
      @clear="clearBind"
    />

    <!-- 2. 状态规则列表 -->
    <div class="states-section">
      <div class="section-title">
        <span>{{ $t('stateVariable.config.states') }}</span>
        <button
          type="button"
          class="bind-btn"
          @click="addRule"
        >
          {{ $t('stateVariable.config.addRule') }}
        </button>
      </div>

      <div
        v-if="states.length === 0"
        class="states-empty"
      >
        {{ $t('stateVariable.config.states') }}
      </div>

      <div
        v-for="(rule, index) in states"
        :key="rule.id"
        class="rule-item"
      >
        <div class="rule-row">
          <span class="rule-label rule-label--readonly">{{ currentValueText || '—' }}</span>
          <select
            :value="rule.operator"
            class="rule-operator"
            @change="updateRule(rule.id, { operator: ($event.target as HTMLSelectElement).value as StateOperator })"
          >
            <option
              v-for="op in availableOperators"
              :key="op"
              :value="op"
            >
              {{ operatorLabel(op) }}
            </option>
          </select>
          <input
            :value="rule.value"
            type="text"
            class="rule-value"
            :placeholder="$t('stateVariable.config.value')"
            @input="updateRule(rule.id, { value: ($event.target as HTMLInputElement).value })"
          >
          <input
            v-if="rule.operator === 'between'"
            :value="rule.value2"
            type="text"
            class="rule-value"
            :placeholder="$t('stateVariable.config.value2')"
            @input="updateRule(rule.id, { value2: ($event.target as HTMLInputElement).value })"
          >
        </div>

        <div class="rule-row rule-row--actions">
          <button
            type="button"
            class="image-btn"
            @click="pickRuleImage(rule.id)"
          >
            <img
              v-if="rule.image"
              :src="rule.image"
              class="image-thumb"
              alt=""
            >
            <span v-else>{{ $t('stateVariable.config.selectImage') }}</span>
          </button>

          <button
            type="button"
            class="move-btn"
            :disabled="index === 0"
            title="上移"
            @click="moveRule(index, -1)"
          >↑</button>
          <button
            type="button"
            class="move-btn"
            :disabled="index === states.length - 1"
            title="下移"
            @click="moveRule(index, 1)"
          >↓</button>
          <button
            type="button"
            class="delete-btn"
            :title="$t('stateVariable.config.deleteRule')"
            @click="removeRule(rule.id)"
          >×</button>
        </div>
      </div>
    </div>

    <!-- 3. 默认图片 -->
    <div class="default-section">
      <div class="section-title">
        {{ $t('stateVariable.config.defaultImage') }}
      </div>
      <div class="rule-row rule-row--actions">
        <button
          type="button"
          class="image-btn"
          @click="pickDefaultImage"
        >
          <img
            v-if="defaultImage"
            :src="defaultImage"
            class="image-thumb"
            alt=""
          >
          <span v-else>{{ $t('stateVariable.config.selectImage') }}</span>
        </button>
        <button
          v-if="defaultImage"
          type="button"
          class="delete-btn"
          :title="$t('stateVariable.config.deleteRule')"
          @click="setDefaultImage('')"
        >×</button>
      </div>
    </div>

    <!-- 4. 图片样式 -->
    <PluginConfigPanel
      :schema="stateVariablePropertySchema"
      :values="values"
    />

    <StateImagePicker
      v-model:visible="imagePickerVisible"
      @select="handleImageSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue';
import { i18n, ScadaDataManager } from '@scada-editor/core';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding, useWsStore } from '@scada-editor/system';
import { stateVariablePropertySchema } from './stateVariablePropertySchema';
import {
  generateRuleId,
  getAvailableOperators,
  type StateOperator,
  type StateRule,
} from './stateVariableUtils';
import StateImagePicker from './StateImagePicker.vue';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const { t } = i18n.global;

const values = usePluginConfig(toRef(props, 'graphicProperties'), stateVariablePropertySchema, emit);

const wsStore = useWsStore();
const imagePickerVisible = ref(false);

const { projectId, current, addVariable, clearBind } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'flat' },
);

/** 图片选择目标：'default' 或某条规则的 id */
const imagePickerTarget = ref<'default' | string>('default');

const customProps = computed(() => props.graphicProperties?.config?.customProps ?? {});

const tagId = computed(() => customProps.value.tagId ?? '');
const states = computed<StateRule[]>(() => customProps.value.states ?? []);
const defaultImage = computed<string>(() => customProps.value.defaultImage ?? '');
const dataType = computed<string>(() => customProps.value.dataType ?? 'float');

/** 兜底刷新版本号：EventBus tagValueChanged 触发强制重算 */
const localVersion = ref(0);

/** 绑定变量的实时值（用于「状态名称」只读展示） */
const currentValue = computed(() => {
  void wsStore.tagFlushVersion;
  void localVersion.value;
  if (!tagId.value) return null;
  const wsValue = wsStore.getTagValue(tagId.value);
  if (wsValue !== null && wsValue !== undefined) return wsValue;
  return ScadaDataManager.getTagValue(tagId.value) ?? null;
});

const currentValueText = computed(() => {
  const value = currentValue.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimalPlaces.value) : String(value);
});

const availableOperators = computed<StateOperator[]>(() => getAvailableOperators(dataType.value));

function operatorLabel(op: StateOperator): string {
  return t(`stateVariable.operator.${op}`);
}

function writeCustomProps(fields: Record<string, any>) {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  if (!gp.config.customProps) gp.config.customProps = {};
  Object.assign(gp.config.customProps, fields);
  emit('updateGraphicProperties');
}

function addRule() {
  const next: StateRule = {
    id: generateRuleId(),
    label: '',
    operator: 'equal',
    value: '',
    value2: '',
    image: '',
  };
  writeCustomProps({ states: [...states.value, next] });
}

function updateRule(id: string, fields: Partial<StateRule>) {
  const next = states.value.map((rule) => (rule.id === id ? { ...rule, ...fields } : rule));
  writeCustomProps({ states: next });
}

function removeRule(id: string) {
  writeCustomProps({ states: states.value.filter((rule) => rule.id !== id) });
}

function moveRule(index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= states.value.length) return;
  const next = [...states.value];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  writeCustomProps({ states: next });
}

function pickRuleImage(id: string) {
  imagePickerTarget.value = id;
  imagePickerVisible.value = true;
}

function pickDefaultImage() {
  imagePickerTarget.value = 'default';
  imagePickerVisible.value = true;
}

function handleImageSelect(image: string) {
  if (imagePickerTarget.value === 'default') {
    setDefaultImage(image);
  } else {
    updateRule(imagePickerTarget.value, { image });
  }
}

function setDefaultImage(image: string) {
  writeCustomProps({ defaultImage: image });
}

// ===== 订阅绑定变量实时值（用于「状态名称」只读展示） =====
let unsubscribeEventBus: (() => void) | null = null;
let registeredTagId: string | null = null;

function syncSubscription() {
  const next = tagId.value || null;
  if (registeredTagId && registeredTagId !== next) {
    wsStore.unsubscribeTags([registeredTagId]);
  }
  if (next && next !== registeredTagId && wsStore.isConnected) {
    wsStore.subscribeTags([next]);
  }
  registeredTagId = next;
}

onMounted(() => {
  syncSubscription();
  unsubscribeEventBus = ScadaDataManager.eventBus.on('tagValueChanged', (event) => {
    const payload = (event as { payload?: { tagId?: string } }).payload;
    if (payload?.tagId === tagId.value) {
      localVersion.value++;
    }
  });
});

watch(
  () => wsStore.isConnected,
  (connected) => {
    if (!connected) return;
    if (tagId.value) wsStore.subscribeTags([tagId.value]);
  },
);

watch(
  () => tagId.value,
  () => syncSubscription(),
);

onUnmounted(() => {
  if (registeredTagId) {
    wsStore.unsubscribeTags([registeredTagId]);
  }
  registeredTagId = null;
  unsubscribeEventBus?.();
});
</script>

<style scoped>
.state-variable-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bind-section,
.states-section,
.default-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border, #dddddd);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bind-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.bind-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bind-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  cursor: pointer;
}

.bind-btn:hover {
  background: var(--background, #f5f5f5);
}

.bind-btn--clear {
  color: var(--status-error, #d03050);
}

.bind-btn--clear:hover {
  border-color: var(--status-error, #d03050);
}

.states-empty {
  padding: 12px 0;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
  text-align: center;
}

.rule-item {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-row--actions {
  margin-top: 6px;
}

.rule-label,
.rule-value,
.rule-operator {
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text);
  box-sizing: border-box;
}

.rule-label {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-label--readonly {
  background: var(--background, #f5f5f5);
  color: var(--text-secondary, #666666);
  cursor: default;
  user-select: none;
}

.rule-operator {
  width: 96px;
  flex-shrink: 0;
}

.rule-value {
  width: 70px;
  flex-shrink: 0;
}

.image-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  height: 32px;
  padding: 2px 8px;
  font-size: 12px;
  border: 1px dashed var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-secondary, #666666);
  cursor: pointer;
}

.image-btn:hover {
  border-color: var(--primary, #1a73e8);
}

.image-thumb {
  max-width: 48px;
  max-height: 28px;
  object-fit: contain;
}

.move-btn,
.delete-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-secondary, #666666);
  cursor: pointer;
  font-size: 13px;
}

.move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delete-btn {
  color: var(--status-error, #d03050);
}
</style>
