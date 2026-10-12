<template>
  <div class="tag-value-config">
    <!-- 1. 变量绑定 -->
    <TagBindingEditor
      mode="flat"
      :project-id="projectId"
      :current="current"
      @add="addVariable"
      @clear="clearBind"
    />

    <!-- 2. 装饰图片 -->
    <div class="decoration-section">
      <div class="section-title">
        {{ $t('tagValue.config.decorationImage') }}
      </div>
      <div class="decoration-row">
        <button
          type="button"
          class="image-btn"
          @click="imagePickerVisible = true"
        >
          <img
            v-if="decorationImage"
            :src="decorationImage"
            class="image-thumb"
            alt=""
          >
          <span v-else>{{ $t('tagValue.config.selectImage') }}</span>
        </button>
        <button
          v-if="decorationImage"
          type="button"
          class="delete-btn"
          @click="setDecorationImage('')"
        >×</button>
      </div>
    </div>

    <!-- 3. 背景图片 -->
    <div class="decoration-section">
      <div class="section-title">
        {{ $t('tagValue.config.backgroundImage') }}
      </div>
      <div class="decoration-row">
        <button
          type="button"
          class="image-btn"
          @click="backgroundImagePickerVisible = true"
        >
          <img
            v-if="backgroundImage"
            :src="backgroundImage"
            class="image-thumb"
            alt=""
          >
          <span v-else>{{ $t('tagValue.config.selectImage') }}</span>
        </button>
        <button
          v-if="backgroundImage"
          type="button"
          class="delete-btn"
          @click="setBackgroundImage('')"
        >×</button>
      </div>
    </div>

    <!-- 4. 显示配置（形态/名称/装饰/单位/文本/样式） -->
    <PluginConfigPanel
      :schema="tagValuePropertySchema"
      :values="values"
    />

    <StateImagePicker
      v-model:visible="imagePickerVisible"
      @select="handleImageSelect"
    />

    <StateImagePicker
      v-model:visible="backgroundImagePickerVisible"
      @select="handleBackgroundImageSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { usePluginConfig } from '@scada-editor/plugin-sdk';
import { PluginConfigPanel } from '@scada-editor/shared';
import { TagBindingEditor, useTagBinding } from '@scada-editor/system';
import { tagValuePropertySchema } from './tagValuePropertySchema';
import StateImagePicker from '../state-variable/StateImagePicker.vue';

const props = defineProps<{ graphicProperties: any }>();
const emit = defineEmits<{ (e: 'updateGraphicProperties'): void }>();

const values = usePluginConfig(toRef(props, 'graphicProperties'), tagValuePropertySchema, emit);

const imagePickerVisible = ref(false);
const backgroundImagePickerVisible = ref(false);

const { projectId, current, addVariable, clearBind } = useTagBinding(
  props,
  () => emit('updateGraphicProperties'),
  {
    mode: 'flat',
    extraFields: (variable) => ({
      // 仅当标签已设置单位/小数位时才带出，避免覆盖手填值
      ...(variable.unit ? { unit: variable.unit } : {}),
      ...(variable.decimalPlaces !== undefined ? { decimalPlaces: variable.decimalPlaces } : {}),
    }),
  },
);

const customProps = computed(() => props.graphicProperties?.config?.customProps ?? {});
const decorationImage = computed(() => customProps.value.decorationImage ?? '');
const backgroundImage = computed(() => customProps.value.backgroundImage ?? '');

function writeCustomProps(fields: Record<string, any>) {
  const gp = props.graphicProperties as any;
  if (!gp?.config) return;
  if (!gp.config.customProps) gp.config.customProps = {};
  Object.assign(gp.config.customProps, fields);
  emit('updateGraphicProperties');
}

function setDecorationImage(image: string) {
  writeCustomProps({ decorationImage: image });
}

function handleImageSelect(image: string) {
  setDecorationImage(image);
}

function setBackgroundImage(image: string) {
  writeCustomProps({ backgroundImage: image });
}

function handleBackgroundImageSelect(image: string) {
  setBackgroundImage(image);
}
</script>

<style scoped>
.tag-value-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.decoration-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.section-title {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.decoration-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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
  border: 1px dashed var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}

.image-btn:hover {
  border-color: var(--primary);
}

.image-thumb {
  max-width: 48px;
  max-height: 28px;
  object-fit: contain;
}

.delete-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--status-error);
  cursor: pointer;
  font-size: 13px;
}
</style>
