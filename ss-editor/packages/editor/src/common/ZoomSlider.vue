<template>
  <div
    class="zoom-slider"
    :class="{ 'zoom-disabled': disabled }"
    :title="disabled ? t('editorControls.zoomDisabledInStretch') : undefined"
  >
    <div class="zoom-slider-controls">
      <button 
        class="zoom-button" 
        :disabled="disabled || effectiveMinScale > currentScale"
        :title="t('editorControls.zoomOut')"
        @click="zoomOut"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          />
          <line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
          <line
            x1="8"
            y1="11"
            x2="14"
            y2="11"
          />
        </svg>
      </button>
      
      <div class="slider-container">
        <input
          v-model.number="localScale"
          type="range"
          class="zoom-range"
          :min="effectiveMinScale"
          :max="effectiveMaxScale"
          :step="step"
          :disabled="disabled"
          @input="updateScale"
        >
        <div class="slider-track">
          <div 
            class="slider-progress" 
            :style="{ width: `${((localScale - effectiveMinScale) / (effectiveMaxScale - effectiveMinScale)) * 100}%` }"
          />
        </div>
      </div>
      
      <button 
        class="zoom-button" 
        :disabled="disabled || effectiveMaxScale < currentScale"
        :title="t('editorControls.zoomIn')"
        @click="zoomIn"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          />
          <line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
          <line
            x1="11"
            y1="8"
            x2="11"
            y2="14"
          />
          <line
            x1="8"
            y1="11"
            x2="14"
            y2="11"
          />
        </svg>
      </button>
    </div>
    
    <div class="zoom-value">
      {{ Math.round(currentScale) }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePageStore, useI18n } from '@scada-editor/core';
import { useViewportStore } from '../stores/useViewportStore';
import { VIEWPORT } from '../canvas-page/design-canvas/constants';

const { t } = useI18n()

// Props
const props = defineProps({
  modelValue: {
    type: Number,
    default: 100
  },
  minScale: {
    type: Number,
    default: VIEWPORT.SCALE_MIN
  },
  maxScale: {
    type: Number,
    default: VIEWPORT.SCALE_MAX
  },
  step: {
    type: Number,
    default: 10
  },
  usePageScale: {
    type: Boolean,
    default: true
  },
  /** 禁用缩放（如 stretch 模式下保护非均匀比例，置灰 + tooltip 说明） */
  disabled: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'scaleChange']);

// Store
const pageStore = usePageStore();
const viewportStore = useViewportStore();

const effectiveMinScale = computed(() => (props.usePageScale ? viewportStore.scaleMin : props.minScale));
const effectiveMaxScale = computed(() => (props.usePageScale ? viewportStore.scaleMax : props.maxScale));

// Local state
const localScale = ref(props.modelValue);

// Computed
const currentScale = computed({
  get: () => {
    if (props.usePageScale) {
      return pageStore.currentPageScale;
    }
    return props.modelValue;
  },
  set: (value) => {
    if (props.usePageScale) {
      viewportStore.scale = value;
      emit('scaleChange', value);
    } else {
      emit('update:modelValue', value);
      emit('scaleChange', value);
    }
  }
});

// Watch for modelValue changes
watch(() => props.modelValue, (newValue) => {
  if (!props.usePageScale) {
    localScale.value = newValue;
  }
}, { immediate: true });

// Watch for page scale changes
watch(() => pageStore.currentPageScale, (newScale) => {
  if (props.usePageScale && newScale !== undefined) {
    localScale.value = newScale;
  }
}, { immediate: true });

// Methods
const updateScale = () => {
  currentScale.value = localScale.value;
};

const zoomIn = () => {
  if (currentScale.value < effectiveMaxScale.value) {
    currentScale.value = Math.min(currentScale.value + props.step, effectiveMaxScale.value);
  }
};

const zoomOut = () => {
  if (currentScale.value > effectiveMinScale.value) {
    currentScale.value = Math.max(currentScale.value - props.step, effectiveMinScale.value);
  }
};
</script>

<style scoped lang="scss">
.zoom-slider {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    background: var(--panel-background, #f5f5f5);
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    min-width: 160px;
    height: 24px;

    &.zoom-disabled {
      opacity: 0.5;
      cursor: not-allowed;

      .zoom-range {
        cursor: not-allowed;
      }
    }

  .zoom-slider-controls {
    display: flex;
    align-items: center;
    gap: 4px;

    .zoom-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      background: var(--surface, #ffffff);
      border-radius: 4px;
      cursor: pointer;
      color: var(--text-primary, #333333);
      transition: all 0.2s ease;

      &:hover {
        background: var(--primary-light, #e6f7ff);
        color: var(--primary, #1890ff);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
          background: var(--surface, #ffffff);
          color: var(--text-primary, #333333);
        }
      }
    }

    .slider-container {
      position: relative;
      width: 80px;
      height: 20px;
      display: flex;
      align-items: center;
      padding: 0 8px;

      .zoom-range {
        position: absolute;
        width: 100%;
        height: 4px;
        background: transparent;
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        cursor: pointer;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--primary, #1890ff);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;

          &:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
        }

        &::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--primary, #1890ff);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;

          &:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
        }
      }

      .slider-track {
        position: absolute;
        width: 100%;
        height: 4px;
        background: var(--border, #e8e8e8);
        border-radius: 2px;

        .slider-progress {
          position: absolute;
          height: 100%;
          background: var(--primary, #1890ff);
          border-radius: 2px;
          transition: width 0.2s ease;
        }
      }
    }
  }

  .zoom-value {
    min-width: 40px;
    width: 40px;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary, #ffffff);
    flex-shrink: 0;
  }
}

// Dark theme
:deep(.dark) {
  .zoom-slider {
    background: var(--panel-background, #1f1f1f);

    .zoom-slider-controls {
      .zoom-button {
        background: var(--surface, #2d2d2d);
        color: var(--text-primary, #e0e0e0);

        &:hover {
          background: var(--primary-light, #1a365d);
          color: var(--primary, #3182ce);
        }

        &:disabled {
          &:hover {
            background: var(--surface, #2d2d2d);
            color: var(--text-primary, #e0e0e0);
          }
        }
      }

      .slider-container {
        .slider-track {
          background: var(--border, #3d3d3d);

          .slider-progress {
            background: var(--primary, #3182ce);
          }
        }

        .zoom-range {
          &::-webkit-slider-thumb {
            background: var(--primary, #3182ce);
          }

          &::-moz-range-thumb {
            background: var(--primary, #3182ce);
          }
        }
      }
    }

    .zoom-value {
      color: var(--text-primary, #e0e0e0);
    }
  }
}
</style>