<template>
  <div
    class="generic-config"
    :style="themeStyles"
  >
    <component
      :is="configComponent"
      v-if="configComponent"
      :graphic-properties="graphicProperties"
      @update-graphic-properties="emit('updateGraphicProperties')"
    />
    <template v-else-if="template">
      <div
        v-for="group in groupedFields"
        :key="group.key"
        class="property-group"
      >
        <label v-if="group.label">{{ group.label }}</label>
        <div
          :class="`layout-${template.layout || 'vertical'}`"
          :style="{
            gridTemplateColumns:
              template.layout === 'grid'
                ? `repeat(${template.columns || 2}, 1fr)`
                : 'auto',
          }"
        >
          <div
            v-for="field in group.fields"
            :key="field.name"
            class="property-item"
          >
            <span>{{ resolveFieldLabel(field) }}:</span>
            <input
              v-if="field.type === 'text'"
              type="text"
              :value="getFieldValue(field.name)"
              @input="handleTextInput(field.name, $event)"
            >
            <input
              v-else-if="field.type === 'number'"
              type="number"
              :value="getFieldValue(field.name)"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              @input="handleNumberInput(field.name, $event)"
            >
            <input
              v-else-if="field.type === 'color'"
              type="color"
              :value="getColorFieldValue(field.name)"
              @input="handleColorInput(field.name, $event)"
            >
            <select
              v-else-if="field.type === 'select'"
              :value="getFieldValue(field.name)"
              @change="handleSelectInput(field.name, $event)"
            >
              <option
                v-for="option in (resolvedProviderOptions[field.name]?.length ? resolvedProviderOptions[field.name] : (field.options || []))"
                :key="option.value"
                :value="option.value"
              >
                {{ resolveOptionLabel(option) }}
              </option>
            </select>
            <input
              v-else-if="field.type === 'checkbox'"
              type="checkbox"
              :checked="getFieldValue(field.name)"
              @change="handleCheckboxInput(field.name, $event)"
            >
            <textarea
              v-else-if="field.type === 'textarea'"
              :value="getFieldValue(field.name)"
              rows="3"
              @input="handleTextInput(field.name, $event)"
            />
            <div
              v-else-if="field.type === 'range'"
              class="range-wrapper"
            >
              <input
                type="range"
                :value="getFieldValue(field.name)"
                :min="field.min ?? 0"
                :max="field.max ?? 100"
                :step="field.step ?? 1"
                @input="handleNumberInput(field.name, $event)"
              >
              <span class="range-value">{{ getFieldValue(field.name) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="no-template"
    >
      {{ $t('stylePanel.noConfigTemplate') || '无配置模板' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n, usePageStore, useTheme, ConfigTemplateManager, type PluginPropertySchema, type SchemaField } from '@scada-editor/core';

const props = defineProps({
  graphicType: {
    type: String,
    required: true,
  },
  graphicProperties: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['updateGraphicProperties']);

const { themeStyles } = useTheme();
const { t } = useI18n();

/** 在 setup 中直接获取 pageStore（Pinia inject 在 setup 上下文中可用） */
const pageStore = (() => {
  try { return usePageStore(); } catch (err) {
    console.warn('[GenericConfig] usePageStore() 调用失败:', err);
    return null;
  }
})();

console.debug('[GenericConfig] pageStore 初始化状态:', {
  hasPageStore: !!pageStore,
  pageCount: pageStore ? (pageStore as any).pages?.length : 0,
  pages: pageStore ? (pageStore as any).pages?.map((p: any) => p.name) : [],
});

const _pluginSchema = computed<PluginPropertySchema | null>(() => {
  return ConfigTemplateManager.getPluginSchema(props.graphicType);
});

const configComponent = computed(() => {
  return ConfigTemplateManager.getConfigComponent(props.graphicType);
});

const template = computed(() => {
  const tpl = ConfigTemplateManager.getTemplate(props.graphicType);
  console.debug(`[GenericConfig] getTemplate("${props.graphicType}") →`, tpl ? `found (${tpl.fields?.length} fields)` : 'null');
  return tpl;
});

const propsPath = computed<string>(() => {
  return ConfigTemplateManager.getPropsPath(props.graphicType) || 'customProps';
});

/**
 * 预解析 optionsProvider。
 * - string key：由已知映射解析（如 'pageStore.pages'）
 * - 函数：在 setup 上下文中调用
 */
const resolvedProviderOptions = computed(() => {
  const map: Record<string, { value: any; label: string }[]> = {};
  if (!template.value) {
    console.debug('[GenericConfig] template 为空，无法解析 provider options');
    return map;
  }
  for (const field of template.value.fields) {
    const provider = (field as any).optionsProvider;
    if (!provider) continue;
    if (typeof provider === 'string') {
      if (provider === 'pageStore.pages') {
        if (pageStore) {
          const pages = (pageStore as any).pages;
          map[field.name] = pages.map((p: any) => ({
            value: p.name,
            label: p.name,
          }));
          console.debug(`[GenericConfig] optionsProvider "${provider}" → ${map[field.name].length} 个选项:`, map[field.name].map(o => o.label));
        } else {
          console.warn(`[GenericConfig] optionsProvider "${provider}" 但 pageStore 为 null，设置空选项`);
          map[field.name] = [];
        }
      } else {
        console.debug(`[GenericConfig] 未识别的 optionsProvider key: "${provider}"，设置空选项`);
        map[field.name] = [];
      }
    } else if (typeof provider === 'function') {
      try {
        map[field.name] = provider();
        console.debug(`[GenericConfig] optionsProvider 函数返回 ${map[field.name].length} 个选项`);
      } catch (err) {
        console.warn(`[GenericConfig] optionsProvider 函数调用失败:`, err);
        map[field.name] = [];
      }
    }
  }
  return map;
});

const groupedFields = computed(() => {
  if (!template.value) return [];
  const fields = template.value.fields;
  const groups: { key: string; label: string; fields: typeof fields }[] = [];
  const groupMap: Record<string, typeof fields> = {};

  fields.forEach((field) => {
    const key = field.group || '_default';
    if (!groupMap[key]) {
      groupMap[key] = [];
    }
    groupMap[key].push(field);
  });

  const groupLabels: Record<string, string> = {
    basic: t('plugins.groups.basic') || '图元标识',
    visual: t('plugins.groups.visual') || '业务视觉',
    text: t('plugins.groups.text') || '文字',
    style: t('plugins.groups.style') || '样式',
    shadow: t('plugins.groups.shadow') || '阴影',
    animation: t('plugins.groups.animation') || '动画',
    status: t('plugins.groups.status') || '状态',
    display: t('plugins.groups.display') || '显示控制',
    ticks: t('plugins.groups.ticks') || '刻度',
    alarm: t('plugins.groups.alarm') || '告警设置',
    gauge: t('plugins.groups.gauge') || '仪表盘角度',
    value: t('plugins.groups.value') || '数值范围',
    behavior: t('plugins.groups.behavior') || '行为设置',
    binding: t('plugins.groups.binding') || '数据绑定',
    color: t('plugins.groups.color') || '颜色配置',
    _default: '',
  };

  Object.keys(groupMap).forEach((key) => {
    groups.push({
      key,
      label: groupLabels[key] || key,
      fields: groupMap[key],
    });
  });

  return groups;
});

function resolveFieldLabel(field: SchemaField): string {
  if (field.labelKey) {
    const translated = t(field.labelKey);
    return translated !== field.labelKey ? translated : field.label;
  }
  return field.label;
}

function resolveOptionLabel(option: { value: string; label: string; labelKey?: string }): string {
  if (option.labelKey) {
    const translated = t(option.labelKey);
    return translated !== option.labelKey ? translated : option.label;
  }
  return option.label;
}

function resolvePropsTarget(): Record<string, any> {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return {};
  const path = propsPath.value;
  const segments = path.split('.');
  let current: any = gp.config;
  for (const seg of segments) {
    if (current == null) return {};
    current = current[seg];
  }
  return current || {};
}

const getFieldValue = (fieldName: string): any => {
  const target = resolvePropsTarget();
  return target[fieldName];
};

const getColorFieldValue = (fieldName: string): string => {
  const raw = getFieldValue(fieldName);
  if (typeof raw === 'string' && raw.length === 9 && raw.startsWith('#')) {
    return raw.substring(0, 7);
  }
  return raw || '#000000';
};

const updateFieldValue = (fieldName: string, value: any) => {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  const path = propsPath.value;
  const segments = path.split('.');
  let current: any = gp.config;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current[seg] == null) {
      current[seg] = {};
    }
    current = current[seg];
  }
  const lastSeg = segments[segments.length - 1];
  if (current[lastSeg] == null) {
    current[lastSeg] = {};
  }
  current[lastSeg][fieldName] = value;
  emit('updateGraphicProperties');
};

const handleColorInput = (fieldName: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target) {
    const rawValue = target.value;
    const fullValue = rawValue.length === 7 ? rawValue + 'FF' : rawValue;
    updateFieldValue(fieldName, fullValue);
  }
};

const handleTextInput = (fieldName: string, event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (target) {
    updateFieldValue(fieldName, target.value);
  }
};

const handleNumberInput = (fieldName: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target) {
    updateFieldValue(fieldName, parseFloat(target.value));
  }
};

const handleSelectInput = (fieldName: string, event: Event) => {
  const target = event.target as HTMLSelectElement;
  if (target) {
    updateFieldValue(fieldName, target.value);
  }
};

const handleCheckboxInput = (fieldName: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target) {
    updateFieldValue(fieldName, target.checked);
  }
};
</script>

<style scoped>
@import '../panels/styles/property-panel.scss';

.property-group {
  margin-bottom: 12px;
}

.property-group > label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.property-item span {
  width: 90px;
  flex-shrink: 0;
}

.property-item input,
.property-item select,
.property-item textarea {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border, #ddd);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--background, #fff);
  color: var(--text, #333);
  min-width: 0;
}

.property-item select {
  min-width: 80px;
  text-overflow: ellipsis;
  padding-right: 24px;
}

.range-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.range-wrapper input[type='range'] {
  flex: 1;
  min-width: 60px;
}

.range-value {
  min-width: 32px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
}

.no-template {
  padding: 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
