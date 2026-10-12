<template>
  <div class="plugin-config-panel">
    <template
      v-for="group in groupedFields"
      :key="group.key"
    >
      <div
        v-if="group.label"
        class="config-section"
      >
        <h4 class="config-section-title">
          {{ group.label }}
        </h4>
        <div
          v-for="field in group.fields"
          :key="field.name"
          class="config-row"
        >
          <label class="config-label">{{ resolveLabel(field) }}</label>

          <ColorPicker
            v-if="field.type === 'color'"
            v-model="values[field.name]"
            class="config-color-picker-wrapper"
          />

          <div
            v-else-if="field.type === 'color-array'"
            class="config-color-array"
          >
            <ColorPicker
              v-for="(_, idx) in getColorArray(field)"
              :key="idx"
              :model-value="getColorArrayItem(field, idx)"
              class="config-color-picker-wrapper"
              @update:model-value="(v: string) => updateColorArray(field.name, idx, v, field.defaultValue)"
            />
          </div>

          <input
            v-else-if="field.type === 'number'"
            v-model.number="values[field.name]"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            class="config-control config-input"
          >

          <template v-else-if="field.type === 'text' || field.type === 'string'">
            <input
              v-model="values[field.name]"
              type="text"
              :list="field.options ? 'datalist-' + field.name : undefined"
              class="config-control config-input"
            >
            <datalist
              v-if="field.options"
              :id="'datalist-' + field.name"
            >
              <option
                v-for="opt in (field.options || [])"
                :key="opt.value"
                :value="opt.value"
              >
                {{ resolveOptionLabel(opt) }}
              </option>
            </datalist>
          </template>

          <input
            v-else-if="field.type === 'checkbox' || field.type === 'boolean'"
            v-model="values[field.name]"
            type="checkbox"
            class="config-control"
          >

          <select
            v-else-if="field.type === 'select'"
            v-model="values[field.name]"
            class="config-control config-select"
          >
            <option
              v-for="opt in (field.options || [])"
              :key="opt.value"
              :value="opt.value"
            >
              {{ resolveOptionLabel(opt) }}
            </option>
          </select>

          <template v-else-if="field.type === 'range'">
            <input
              v-model.number="values[field.name]"
              type="range"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              class="config-control"
            >
            <span class="config-range-value">{{ values[field.name] }}</span>
          </template>

          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="values[field.name]"
            rows="3"
            class="config-control config-textarea"
          />

          <div
            v-else-if="field.type === 'image'"
            class="config-image-picker-inline"
          >
            <div
              class="image-thumb"
              :class="{ 'image-thumb--has-image': !!getImagePreviewUrl(field) }"
              @click="triggerImageUpload(field.name)"
            >
              <img
                v-if="getImagePreviewUrl(field)"
                :src="getImagePreviewUrl(field)"
                :alt="resolveLabel(field)"
                class="image-thumb-img"
              >
              <span
                v-else
                class="image-thumb-icon"
              >📷</span>
              <input
                :ref="(el) => setImageInputRef(field.name, el as HTMLInputElement)"
                type="file"
                accept="image/*"
                class="image-hidden-input"
                @change="(e: Event) => handleImageUpload(field.name, e)"
              >
            </div>
            <button
              class="image-select-btn"
              @click="triggerImageUpload(field.name)"
            >
              {{ t('configPanel.imagePicker.selectBtn') }}
            </button>
            <input
              v-model="values[field.name]"
              type="text"
              :placeholder="t('configPanel.imagePicker.urlPlaceholder')"
              class="config-control config-input image-url-inline-input"
            >
            <button
              v-if="values[field.name]"
              class="image-clear-btn-inline"
              :title="t('configPanel.imagePicker.clear')"
              @click.stop="handleImageClear(field.name)"
            >
              ✕
            </button>
          </div>

          <span
            v-else
            class="config-control"
          >{{ values[field.name] }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { i18n } from '@scada-editor/core';
import ColorPicker from './ColorPicker.vue';
import { showError } from './utils/messageBox';

const { t } = i18n.global;

interface ConfigPanelField {
  name: string;
  type: string;
  label: string;
  labelKey?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string; labelKey?: string }[];
  group?: string;
  groupKey?: string;
}

interface ConfigPanelSchema {
  fields: ConfigPanelField[];
}

const props = defineProps<{
  schema: ConfigPanelSchema;
  values: Record<string, any>;
}>();

const _emit = defineEmits<{
  updateValues: [values: Record<string, any>];
}>();

const groupedFields = computed(() => {
  const groups: Record<string, { key: string; label: string; fields: ConfigPanelField[] }> = {};
  const ungrouped: ConfigPanelField[] = [];

  for (const field of props.schema.fields) {
    const groupKey = field.group || field.groupKey;
    if (groupKey) {
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: resolveSectionLabel(groupKey),
          fields: [],
        };
      }
      groups[groupKey].fields.push(field);
    } else {
      ungrouped.push(field);
    }
  }

  const result = Object.values(groups);
  if (ungrouped.length > 0) {
    result.push({ key: '__default', label: '', fields: ungrouped });
  }
  return result;
});

function resolveSectionLabel(groupKey: string): string {
  const i18nKey = `plugins.groups.${groupKey}`;
  const translated = t(i18nKey);
  if (translated && translated !== i18nKey) {
    return translated;
  }
  return groupKey;
}

function resolveLabel(field: ConfigPanelField): string {
  if (field.labelKey) {
    const translated = t(field.labelKey);
    if (translated && translated !== field.labelKey) {
      return translated;
    }
  }
  return field.label;
}

function resolveOptionLabel(opt: { value: any; label: string; labelKey?: string }): string {
  if (opt.labelKey) {
    const translated = t(opt.labelKey);
    if (translated && translated !== opt.labelKey) {
      return translated;
    }
  }
  return opt.label;
}

function getColorArray(field: ConfigPanelField): any[] {
  const val = props.values[field.name];
  const def = field.defaultValue;
  if (Array.isArray(val)) return val;
  if (Array.isArray(def)) return [...def];
  return [];
}

function getColorArrayItem(field: ConfigPanelField, index: number): string {
  const val = props.values[field.name];
  if (Array.isArray(val)) return val[index] || '';
  const def = field.defaultValue;
  if (Array.isArray(def)) return def[index] || '';
  return '';
}

function updateColorArray(fieldName: string, index: number, color: string, defaults: any[]) {
  const current = props.values[fieldName];
  const arr = Array.isArray(current) ? [...current] : [...(defaults || [])];
  arr[index] = color;
  props.values[fieldName] = arr;
}

const imageInputRefs = new Map<string, HTMLInputElement>();

function setImageInputRef(name: string, el: HTMLInputElement | null) {
  if (el) {
    imageInputRefs.set(name, el);
  } else {
    imageInputRefs.delete(name);
  }
}

function triggerImageUpload(name: string) {
  const input = imageInputRefs.get(name);
  if (input) input.click();
}

function getImagePreviewUrl(field: ConfigPanelField): string | undefined {
  const val = props.values[field.name];
  if (!val) return undefined;
  return typeof val === 'string' ? val : undefined;
}

async function handleImageUpload(fieldName: string, event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  if (file.size > 10 * 1024 * 1024) {
    showError(t('configPanel.imagePicker.fileSizeError'));
    input.value = '';
    return;
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    props.values[fieldName] = dataUrl;
  } catch (e) {
    console.error('ImageConfig - Failed to read file:', e);
  }
  input.value = '';
}

function handleImageClear(fieldName: string) {
  props.values[fieldName] = '';
}

</script>

<style scoped src="./styles/config-panel.css"></style>