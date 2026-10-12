<template>
  <div class="tab-content">
    <div class="property-group">
      <label>{{ $t('dataPanel.customDataProcessing') }}</label>
      <div class="property-item">
        <span>{{ $t('dataPanel.enableDataProcessing') }}:</span>
        <input
          v-model="useDataDeal"
          type="checkbox"
          @change="updateGraphicProperties"
        >
      </div>
      <template v-if="useDataDeal">
        <div class="property-item">
          <span>{{ $t('dataPanel.dataProcessingFunction') }}:</span>
        </div>
        <textarea
          ref="textareaRef"
          v-model="dataDealFunction"
          placeholder="// 输入 JS 代码
// 内置函数: formatNumber, formatPercent, mapValue, limitRange, toFixed, timestampToDate"
          @input="onTextareaInput"
        />
        <div class="quick-buttons">
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('formatNumber')"
          >
            [formatNumber]
          </button>
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('formatPercent')"
          >
            [formatPercent]
          </button>
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('mapValue')"
          >
            [mapValue]
          </button>
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('limitRange')"
          >
            [limitRange]
          </button>
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('toFixed')"
          >
            [toFixed]
          </button>
          <button
            type="button"
            class="quick-btn"
            @click="insertFunction('timestampToDate')"
          >
            [timestampToDate]
          </button>
        </div>
        <div
          v-if="validationError"
          class="validation-status"
        >
          <span class="validation-fail">✗</span>
          <span class="validation-fail">{{ validationError }}</span>
        </div>
        <div
          v-else-if="dataDealFunction"
          class="validation-status"
        >
          <span class="validation-pass">✓</span>
          <span class="validation-pass">{{ $t('dataPanel.syntaxValidationPassed') }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useGraphicStore } from '@scada-editor/core';

const props = defineProps<{
  graphicProperties: any;
}>();

const emit = defineEmits<{
  updateGraphicProperties: [];
}>();

const graphicStore = useGraphicStore();
const updateGraphic = (graphicStore as any).updateGraphic;

const useDataDeal = ref(props.graphicProperties?.useDataDeal || false);
const dataDealFunction = ref(props.graphicProperties?.dataDealFunction || '');
const validationError = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const validateFunction = () => {
  validationError.value = '';
  if (!dataDealFunction.value.trim()) {
    return;
  }
  try {
    new Function('data', dataDealFunction.value);
  } catch (e: any) {
    validationError.value = e.message;
  }
};

const onTextareaInput = () => {
  validateFunction();
  updateGraphicProperties();
};

const insertFunction = (name: string) => {
  const textarea = textareaRef.value;
  if (!textarea) {
    dataDealFunction.value += name + '()';
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = dataDealFunction.value.substring(0, start);
  const after = dataDealFunction.value.substring(end);
  dataDealFunction.value = before + name + '()' + after;
  const newCursorPos = start + name.length + 2;
  void textarea.value !== undefined;
  nextTick(() => {
    textarea.focus();
    textarea.selectionStart = newCursorPos;
    textarea.selectionEnd = newCursorPos;
  });
};

const updateGraphicProperties = () => {
  if (props.graphicProperties) {
    const updatedProperties = {
      dataSource: {
        ...props.graphicProperties.dataSource,
        useDataDeal: useDataDeal.value,
        dataDealFunction: dataDealFunction.value,
        timestamp: Date.now(),
      },
    };
    updateGraphic(props.graphicProperties.config.id, updatedProperties);
    emit('updateGraphicProperties');
  }
};
</script>

<style scoped>
@import '../../../../panels/styles/property-panel.scss';

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0;
}

.quick-btn {
  padding: 2px 8px;
  font-size: 11px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-secondary);
}

.quick-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.validation-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
}

.validation-pass {
  color: var(--status-success);
}

.validation-fail {
  color: var(--status-error);
}

textarea {
  width: 100%;
  min-height: 120px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  padding: 8px;
  background: var(--background);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  resize: vertical;
}
</style>