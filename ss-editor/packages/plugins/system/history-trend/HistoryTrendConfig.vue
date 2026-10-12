<template>
  <div class="history-trend-config">
    <!-- 变量绑定 -->
    <TagBindingEditor
      mode="multiple"
      :project-id="projectId"
      :tags="tags"
      with-style
      @add="addVariable"
      @remove="removeTag"
    />

    <!-- 每变量趋势样式 -->
    <div
      v-for="(item, index) in tags"
      :key="item.tagId"
      class="series-style"
    >
      <details open>
        <summary>
          <span
            class="series-dot"
            :style="{ background: item.style.lineStyle.color }"
          />
          <span class="series-name">{{ bindLabel(item) }}</span>
        </summary>

        <div class="style-grid">
          <!-- 线条 -->
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.lineWidth') }}</span>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              :value="item.style.lineStyle.width"
              @change="onStyleNumber(index, 'lineStyle.width', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.lineType') }}</span>
            <select
              :value="item.style.lineStyle.type"
              @change="onStyleString(index, 'lineStyle.type', $event)"
            >
              <option value="solid">{{ $t('historyTrend.options.lineType.solid') }}</option>
              <option value="dashed">{{ $t('historyTrend.options.lineType.dashed') }}</option>
              <option value="dotted">{{ $t('historyTrend.options.lineType.dotted') }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.lineColor') }}</span>
            <input
              type="color"
              :value="item.style.lineStyle.color"
              @input="onStyleString(index, 'lineStyle.color', $event)"
            >
          </label>

          <!-- 实心点 -->
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.symbolSize') }}</span>
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              :value="item.style.symbolSize"
              @change="onStyleNumber(index, 'symbolSize', $event)"
            >
          </label>

          <!-- 标签 -->
          <label class="field field--inline">
            <input
              type="checkbox"
              :checked="item.style.label.show"
              @change="onStyleBoolean(index, 'label.show', $event)"
            >
            <span class="field-label">{{ $t('historyTrend.series.labelShow') }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.labelFontSize') }}</span>
            <input
              type="number"
              min="8"
              max="24"
              step="1"
              :value="item.style.label.fontSize"
              @change="onStyleNumber(index, 'label.fontSize', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.labelColor') }}</span>
            <input
              type="color"
              :value="item.style.label.color"
              @input="onStyleString(index, 'label.color', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.labelPosition') }}</span>
            <select
              :value="item.style.label.position"
              @change="onStyleString(index, 'label.position', $event)"
            >
              <option value="top">{{ $t('historyTrend.options.labelPosition.top') }}</option>
              <option value="left">{{ $t('historyTrend.options.labelPosition.left') }}</option>
              <option value="right">{{ $t('historyTrend.options.labelPosition.right') }}</option>
              <option value="bottom">{{ $t('historyTrend.options.labelPosition.bottom') }}</option>
            </select>
          </label>

          <!-- 区域填充 -->
          <label class="field field--inline">
            <input
              type="checkbox"
              :checked="item.style.areaStyle.show"
              @change="onStyleBoolean(index, 'areaStyle.show', $event)"
            >
            <span class="field-label">{{ $t('historyTrend.series.areaShow') }}</span>
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.areaStartColor') }}</span>
            <input
              type="color"
              :value="item.style.areaStyle.colorStops[0]?.color"
              @input="onStyleString(index, 'areaStyle.colorStops.0.color', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.areaMiddleColor') }}</span>
            <input
              type="color"
              :value="item.style.areaStyle.colorStops[1]?.color"
              @input="onStyleString(index, 'areaStyle.colorStops.1.color', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.areaEndColor') }}</span>
            <input
              type="color"
              :value="item.style.areaStyle.colorStops[2]?.color"
              @input="onStyleString(index, 'areaStyle.colorStops.2.color', $event)"
            >
          </label>
          <label class="field">
            <span class="field-label">{{ $t('historyTrend.series.areaOpacity') }}</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              :value="item.style.areaStyle.opacity"
              @change="onStyleNumber(index, 'areaStyle.opacity', $event)"
            >
          </label>
        </div>
      </details>
    </div>

    <!-- 全局配置（默认查询/时间范围 + 标题 + 图表 + 样式） -->
    <PluginConfigPanel
      :schema="historyTrendPropertySchema"
      :values="values"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel, type ChartTagBinding } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { historyTrendPropertySchema } from './historyTrendPropertySchema';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), historyTrendPropertySchema, emit);

const { projectId, tags, bindLabel, addVariable, removeTag, mutateTags } = useTagBinding<ChartTagBinding>(
  props,
  () => emit('updateGraphicProperties'),
  { mode: 'array-multiple', withStyle: true },
);

function setStylePath(index: number, path: string, value: unknown) {
  mutateTags((list) => {
    const item = list[index];
    if (!item) return;
    const segments = path.split('.');
    let target: any = item.style;
    for (let i = 0; i < segments.length - 1; i++) {
      if (target == null) return;
      target = target[segments[i]];
    }
    if (target != null) {
      target[segments[segments.length - 1]] = value;
    }
  });
}

function onStyleNumber(index: number, path: string, event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  const num = Number(raw);
  setStylePath(index, path, Number.isNaN(num) ? 0 : num);
}

function onStyleString(index: number, path: string, event: Event) {
  setStylePath(index, path, (event.target as HTMLInputElement).value);
}

function onStyleBoolean(index: number, path: string, event: Event) {
  setStylePath(index, path, (event.target as HTMLInputElement).checked);
}
</script>

<style scoped>
.history-trend-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.series-style {
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
}

.series-style summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333333);
  list-style: none;
}

.series-style summary::-webkit-details-marker {
  display: none;
}

.series-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.series-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--border, #dddddd);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.field-label {
  color: var(--text-secondary, #666666);
  font-size: 11px;
}

.field input[type='number'],
.field input[type='color'],
.field select {
  width: 100%;
  height: 26px;
  padding: 2px 6px;
  box-sizing: border-box;
  font-size: 12px;
  border: 1px solid var(--border, #dddddd);
  border-radius: 4px;
  background: var(--surface, #ffffff);
  color: var(--text-primary, #333333);
}

.field input[type='color'] {
  padding: 1px 2px;
}

.field input[type='checkbox'] {
  margin: 0;
  flex-shrink: 0;
}
</style>
