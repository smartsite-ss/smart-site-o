<template>
  <div class="style-panel-content">
    <!-- ====== 1. 基本属性（合并图形属性+位置尺寸）====== -->
    <div
      v-if="config"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('graphic', e)"
      >
        <span class="group-title">{{ $t('stylePanel.graphicProperties') }}</span>
        <button
          type="button"
          class="copy-btn-inline"
          :title="$t('stylePanel.copyId')"
          @click.stop="copyGraphicId"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              ry="2"
            />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
        <span :class="['collapse-icon', { expanded: expandedGroups.graphic }]" />
      </div>
      <div
        v-show="expandedGroups.graphic"
        class="group-body"
      >
        <div class="property-item">
          <span>{{ $t('stylePanel.name') }}:</span>
          <input
            v-model="config.name"
            type="text"
            @input="onFieldChange"
          >
        </div>
        <template v-if="hasGeometry">
          <div class="position-size-row">
            <div class="position-size-item">
              <span class="position-label">{{ $t('stylePanel.x') }}</span>
              <ValueAdjuster
                v-model.number="geometry!.x"
                :step="1"
                :integer="true"
                input-width="100%"
                :disabled="config?.locked"
                @update:model-value="onFieldChange"
              />
            </div>
            <div class="position-size-item">
              <span class="position-label">{{ $t('stylePanel.y') }}</span>
              <ValueAdjuster
                v-model.number="geometry!.y"
                :step="1"
                :integer="true"
                input-width="100%"
                :disabled="config?.locked"
                @update:model-value="onFieldChange"
              />
            </div>
            <span class="link-btn-placeholder" />
          </div>
          <div class="position-size-row">
            <div class="position-size-item flex-1">
              <span class="position-label">{{ $t('stylePanel.width') }}</span>
              <ValueAdjuster
                v-model.number="geometry!.width"
                :step="1"
                :integer="true"
                input-width="100%"
                :disabled="config?.locked || aspectLocked"
                @update:model-value="onFieldChange"
              />
            </div>
            <div class="position-size-item flex-1">
              <span class="position-label">{{ $t('stylePanel.height') }}</span>
              <ValueAdjuster
                v-model.number="geometry!.height"
                :step="1"
                :integer="true"
                input-width="100%"
                :disabled="config?.locked || aspectLocked"
                @update:model-value="onFieldChange"
              />
            </div>
            <button
              type="button"
              :class="['link-btn', { active: aspectLocked }]"
              :title="$t(aspectLocked ? 'stylePanel.unlockAspect' : 'stylePanel.lockAspect')"
              @click.stop="aspectLocked = !aspectLocked"
            >
              🔗
            </button>
          </div>
        </template>
        <div class="property-item rotation-row">
          <span>{{ $t('stylePanel.rotation') }}:</span>
          <ValueAdjuster
            v-model.number="geometry!.rotation"
            :step="1"
            :integer="true"
            input-width="100px"
            :disabled="config?.locked"
            @update:model-value="onFieldChange"
          />
          <button
            type="button"
            class="quick-btn"
            title="+90°"
            @click.stop="quickRotate(90)"
          >
            ⊕90°
          </button>
          <button
            type="button"
            class="quick-btn"
            title="-90°"
            @click.stop="quickRotate(-90)"
          >
            ⊖90°
          </button>
        </div>
        <div class="property-row scale-zindex-row">
          <div class="property-item scale-row flex-1">
            <span>{{ $t('stylePanel.scale') }}:</span>
            <ValueAdjuster
              v-model.number="geometry!.scale"
              :step="0.1"
              input-width="90px"
              :disabled="config?.locked"
              @update:model-value="onFieldChange"
            />
            <button
              type="button"
              class="quick-btn"
              title="1:1"
              @click.stop="resetScale"
            >
              1:1
            </button>
          </div>
          <div class="property-item zindex-row flex-1">
            <span>{{ $t('stylePanel.zIndex') }}:</span>
            <ValueAdjuster
              v-model.number="config.zIndex"
              :step="1"
              :min="-100"
              :max="100"
              input-width="100px"
              @update:model-value="onFieldChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 2. 高级配置（图元差异化配置）====== -->
    <div
      v-if="config"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('generic', e)"
      >
        <span class="group-title">{{ $t('stylePanel.advanced') || 'Advanced' }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.generic }]" />
      </div>
      <div
        v-show="expandedGroups.generic"
        class="group-body"
      >
        <GenericConfig
          :graphic-type="config.type"
          :graphic-properties="props.graphicProperties"
          @update-graphic-properties="onFieldChange"
        />
      </div>
    </div>

    <!-- ====== 3. 填充与边框 ====== -->
    <div
      v-if="hasStyleConfig"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('fillBorder', e)"
      >
        <span class="group-title">{{ $t('stylePanel.fillAndBorder') }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.fillBorder }]" />
      </div>
      <div
        v-show="expandedGroups.fillBorder"
        class="group-body"
      >
        <div class="property-row color-with-enable">
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.backgroundColor') }}:</span>
            <ColorPicker
              v-if="fillEnabled"
              v-model="style!.backgroundColor"
              @color-change="onFieldChange"
            />
            <span
              v-else
              class="disabled-hint"
            >--</span>
          </div>
          <label class="enable-check">
            <input
              v-model="fillEnabled"
              type="checkbox"
              @change="onFieldChange"
            >
          </label>
        </div>
        <div class="property-row color-with-enable">
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.borderColor') }}:</span>
            <ColorPicker
              v-if="borderEnabled"
              v-model="style!.borderColor"
              @color-change="onFieldChange"
            />
            <span
              v-else
              class="disabled-hint"
            >--</span>
          </div>
          <label class="enable-check">
            <input
              v-model="borderEnabled"
              type="checkbox"
              @change="onFieldChange"
            >
          </label>
        </div>
        <template v-if="borderEnabled">
          <div class="property-row">
            <div class="property-item">
              <span>{{ $t('stylePanel.borderWidth') }}:</span>
              <ValueAdjuster
                :model-value="styleNum('borderWidth')"
                :step="1"
                :min="0"
                input-width="100px"
                @update:model-value="setStyleNum('borderWidth', $event); onFieldChange()"
              />
            </div>
            <div class="property-item">
              <span>{{ $t('stylePanel.borderRadius') }}:</span>
              <ValueAdjuster
                :model-value="styleNum('borderRadius')"
                :step="1"
                :min="0"
                input-width="100px"
                @update:model-value="setStyleNum('borderRadius', $event); onFieldChange()"
              />
            </div>
          </div>
          <div class="property-item">
            <span>{{ $t('stylePanel.borderStyle') }}:</span>
            <select
              v-model="style!.borderStyle"
              @change="onFieldChange"
            >
              <option value="solid">
                {{ $t('stylePanel.solid') }}
              </option>
              <option value="dashed">
                {{ $t('stylePanel.dashed') }}
              </option>
              <option value="dotted">
                {{ $t('stylePanel.dotted') }}
              </option>
              <option value="double">
                {{ $t('stylePanel.double') }}
              </option>
            </select>
          </div>
        </template>
        <div class="property-item opacity-row">
          <span>{{ $t('stylePanel.opacity') }}:</span>
          <input
            v-model.number="opacityPercent"
            type="range"
            min="0"
            max="100"
            step="1"
            class="opacity-slider"
            @input="onOpacityChange"
          >
          <span class="opacity-value">{{ opacityPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- ====== 4. 文字样式 ====== -->
    <div
      v-if="hasStyleConfig && showTextStyle"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('textStyle', e)"
      >
        <span class="group-title">{{ $t('stylePanel.textStyle') }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.textStyle }]" />
      </div>
      <div
        v-show="expandedGroups.textStyle"
        class="group-body"
      >
        <div class="property-item">
          <span>{{ $t('stylePanel.fontColor') }}:</span>
          <ColorPicker
            v-model="style!.fontColor"
            @color-change="onFieldChange"
          />
        </div>
        <div class="property-row">
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.fontSize') }}:</span>
            <ValueAdjuster
              :model-value="styleNum('fontSize')"
              :step="1"
              :min="8"
              :max="200"
              input-width="80px"
              @update:model-value="setStyleNum('fontSize', $event); onFieldChange()"
            />
          </div>
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.textAlign') }}:</span>
            <select
              v-model="style!.textAlign"
              @change="onFieldChange"
            >
              <option value="left">
                {{ $t('stylePanel.left') }}
              </option>
              <option value="center">
                {{ $t('stylePanel.center') }}
              </option>
              <option value="right">
                {{ $t('stylePanel.right') }}
              </option>
            </select>
          </div>
        </div>
        <div class="property-item">
          <span>{{ $t('stylePanel.fontFamily') }}:</span>
          <select
            v-model="style!.fontFamily"
            @change="onFieldChange"
          >
            <option value="Arial">
              Arial
            </option>
            <option value="Microsoft YaHei">
              微软雅黑
            </option>
            <option value="PingFang SC">
              苹方
            </option>
            <option value="Helvetica Neue">
              Helvetica Neue
            </option>
            <option value="Consolas">
              Consolas
            </option>
          </select>
        </div>
        <div class="property-row">
          <div class="property-item">
            <span>{{ $t('stylePanel.fontStyle') }}:</span>
            <select
              v-model="style!.fontStyle"
              @change="onFieldChange"
            >
              <option value="normal">
                {{ $t('stylePanel.normal') }}
              </option>
              <option value="italic">
                {{ $t('stylePanel.italic') }}
              </option>
            </select>
          </div>
          <div class="property-item">
            <span>{{ $t('stylePanel.fontWeight') }}:</span>
            <select
              v-model="style!.fontWeight"
              @change="onFieldChange"
            >
              <option value="300">
                {{ $t('stylePanel.light') }}
              </option>
              <option value="400">
                {{ $t('stylePanel.normal') }}
              </option>
              <option value="500">
                {{ $t('stylePanel.medium') }}
              </option>
              <option value="600">
                {{ $t('stylePanel.semibold') }}
              </option>
              <option value="700">
                {{ $t('stylePanel.bold') }}
              </option>
            </select>
          </div>
        </div>
        <div class="property-row">
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.letterSpacing') }}:</span>
            <input
              v-model.number="style!.letterSpacing"
              type="range"
              :min="-10"
              :max="20"
              step="0.5"
              class="range-input"
              @input="onFieldChange"
            >
            <span class="range-inline-value">{{ style!.letterSpacing }}</span>
          </div>
          <div class="property-item flex-1">
            <span>{{ $t('stylePanel.lineHeight') }}:</span>
            <input
              v-model.number="lineHeightDisplay"
              type="range"
              :min="0.5"
              :max="10"
              step="0.1"
              class="range-input"
              @input="onLineHeightChange"
            >
            <span class="range-inline-value">{{ lineHeightDisplay }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 5. 阴影效果 ====== -->
    <div
      v-if="hasStyleConfig"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('shadow', e)"
      >
        <span class="group-title">{{ $t('stylePanel.shadowEffects') }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.shadow }]" />
      </div>
      <div
        v-show="expandedGroups.shadow"
        class="group-body"
      >
        <div class="shadow-header">
          <label class="enable-check">
            <input
              v-model="shadowEnabled"
              type="checkbox"
              @change="onFieldChange"
            >
            {{ $t('stylePanel.enableShadow') }}
          </label>
          <div
            v-if="shadowEnabled"
            class="shadow-preview"
            :style="shadowPreviewStyle"
          />
        </div>
        <template v-if="shadowEnabled">
          <div class="property-row">
            <div class="property-item">
              <span>{{ $t('stylePanel.shadowColor') }}:</span>
              <ColorPicker
                v-model="style!.shadowColor"
                @color-change="onFieldChange"
              />
            </div>
          </div>
          <div class="property-row">
            <div class="property-item">
              <span>{{ $t('stylePanel.shadowBlur') }}:</span>
              <ValueAdjuster
                :model-value="styleNum('shadowBlur')"
                :step="1"
                :min="0"
                input-width="100px"
                @update:model-value="setStyleNum('shadowBlur', $event); onFieldChange()"
              />
            </div>
            <div class="property-item">
              <span>Inset:</span>
              <label class="enable-check-sm"><input
                v-model="shadowInset"
                type="checkbox"
                @change="onFieldChange"
              ></label>
            </div>
          </div>
          <div class="property-row">
            <div class="property-item">
              <span>{{ $t('stylePanel.shadowOffsetX') }}:</span>
              <ValueAdjuster
                :model-value="styleNum('shadowOffsetX')"
                :step="1"
                input-width="100px"
                @update:model-value="setStyleNum('shadowOffsetX', $event); onFieldChange()"
              />
            </div>
            <div class="property-item">
              <span>{{ $t('stylePanel.shadowOffsetY') }}:</span>
              <ValueAdjuster
                :model-value="styleNum('shadowOffsetY')"
                :step="1"
                input-width="100px"
                @update:model-value="setStyleNum('shadowOffsetY', $event); onFieldChange()"
              />
            </div>
          </div>
          <div class="property-item">
            <span>{{ $t('stylePanel.shadowSpread') }}:</span>
            <ValueAdjuster
              :model-value="styleNum('shadowSpread')"
              :step="1"
              :min="0"
              input-width="100px"
              @update:model-value="setStyleNum('shadowSpread', $event); onFieldChange()"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- ====== 6. 动画 ====== -->
    <div
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('animation', e)"
      >
        <span class="group-title">{{ $t('stylePanel.enterAnimation') }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.animation }]" />
      </div>
      <div
        v-show="expandedGroups.animation"
        class="group-body"
      >
        <div class="property-item">
          <label class="enable-check">
            <input
              :checked="props.graphicProperties.animation?.enabled ?? false"
              type="checkbox"
              @change="onAnimToggle"
            >
            {{ $t('stylePanel.enableAnimation') }}
          </label>
        </div>
        <template v-if="props.graphicProperties.animation?.enabled">
          <div class="property-item">
            <span>{{ $t('stylePanel.animationType') }}:</span>
            <select
              v-model="props.graphicProperties.animation!.type"
              @change="onAnimationTypeChange"
            >
              <option
                v-for="(label, value) in animationTypeOptions"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </div>
          <div class="property-row">
            <div class="property-item flex-1">
              <span>{{ $t('stylePanel.animationDuration') }}:</span>
              <ValueAdjuster
                v-model.number="props.graphicProperties.animation!.duration"
                :step="0.1"
                :min="0.1"
                :max="10"
                input-width="100px"
                @update:model-value="onFieldChange"
              />
            </div>
            <div class="property-item flex-1">
              <span>{{ $t('stylePanel.animationDelay') }}:</span>
              <ValueAdjuster
                v-model.number="props.graphicProperties.animation!.delay"
                :step="0.1"
                :min="0"
                :max="10"
                input-width="100px"
                @update:model-value="onFieldChange"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ====== 7. 布局间距（仅容器类图元）====== -->
    <div
      v-if="hasStyleConfig && isContainerType"
      class="property-group"
    >
      <div
        class="group-label"
        @click="(e) => toggleGroup('layout', e)"
      >
        <span class="group-title">{{ $t('stylePanel.layoutSpacing') }}</span>
        <span :class="['collapse-icon', { expanded: expandedGroups.layout }]" />
      </div>
      <div
        v-show="expandedGroups.layout"
        class="group-body"
      >
        <div class="spacing-section">
          <span class="spacing-label">{{ $t('stylePanel.padding') }}:</span>
          <div class="spacing-box">
            <div class="spacing-cell spacing-top">
              <input
                v-model.number="paddingValues.top"
                type="number"
                :step="1"
                :min="0"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
            <div class="spacing-cell spacing-middle">
              <input
                v-model.number="paddingValues.left"
                type="number"
                :step="1"
                :min="0"
                class="spacing-input"
                @input="onFieldChange"
              >
              <button
                type="button"
                class="sync-btn"
                :title="$t('stylePanel.syncAll')"
                @click="syncPadding"
              >
                ⇄
              </button>
              <input
                v-model.number="paddingValues.right"
                type="number"
                :step="1"
                :min="0"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
            <div class="spacing-cell spacing-bottom">
              <input
                v-model.number="paddingValues.bottom"
                type="number"
                :step="1"
                :min="0"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
          </div>
        </div>
        <div class="spacing-section">
          <span class="spacing-label">{{ $t('stylePanel.margin') }}:</span>
          <div class="spacing-box">
            <div class="spacing-cell spacing-top">
              <input
                v-model.number="marginValues.top"
                type="number"
                :step="1"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
            <div class="spacing-cell spacing-middle">
              <input
                v-model.number="marginValues.left"
                type="number"
                :step="1"
                class="spacing-input"
                @input="onFieldChange"
              >
              <button
                type="button"
                class="sync-btn"
                :title="$t('stylePanel.syncAll')"
                @click="syncMargin"
              >
                ⇄
              </button>
              <input
                v-model.number="marginValues.right"
                type="number"
                :step="1"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
            <div class="spacing-cell spacing-bottom">
              <input
                v-model.number="marginValues.bottom"
                type="number"
                :step="1"
                class="spacing-input"
                @input="onFieldChange"
              >
            </div>
          </div>
        </div>
        <div class="property-item unit-row">
          <span>{{ $t('stylePanel.unit') }}:</span>
          <select
            v-model="layoutUnit"
            @change="onFieldChange"
          >
            <option value="px">
              px
            </option>
            <option value="%">
              %
            </option>
            <option value="em">
              em
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePropertyEditor, type GraphicPropertiesData } from './usePropertyEditor';
import GenericConfig from '../../common/GenericConfig.vue';
import ValueAdjuster from '../../common/ValueAdjuster.vue';
import { ColorPicker } from '@scada-editor/shared';
import { ALL_ANIMATION_TYPE_LABELS } from '@scada-editor/core';

const props = defineProps<{
  graphicProperties: GraphicPropertiesData;
}>();

const emit = defineEmits<{
  updateGraphicProperties: [];
}>();

const { t: _t } = useI18n();

// ===== Composable =====
const {
  config,
  geometry,
  style,
  hasGeometry,
  hasStyleConfig,
  showTextStyle,
  expandedGroups,
  toggleGroup,
  onFieldChange,
  previewAnimation,
  newPropKey: _newPropKey,
  newPropValue: _newPropValue,
  addProp: _addProp,
  removeProp: _removeProp,
  copyGraphicId,
  styleNum,
  setStyleNum,
} = usePropertyEditor(
  () => props.graphicProperties,
  (event) => emit(event),
);

// ===== 动画预览 =====
function onAnimationTypeChange() {
  previewAnimation();
  onFieldChange();
}

// 模板中用于安全访问可选动画属性的辅助方法
function _anim(): NonNullable<typeof props.graphicProperties.animation> {
  return props.graphicProperties.animation ?? { enabled: false, type: 'fade', duration: 1, delay: 0, properties: {} };
}

function onAnimToggle(e: Event) {
  const target = e.target as HTMLInputElement;
  if (props.graphicProperties.animation) {
    props.graphicProperties.animation.enabled = target.checked;
  }
  onFieldChange();
}

// ===== 图形属性增强 =====
function _toggleLock() {
  if (config.value) config.value.locked = !config.value.locked;
  onFieldChange();
}

function _toggleVisible() {
  if (config.value) config.value.visible = !config.value.visible;
  onFieldChange();
}

// ===== 位置尺寸增强 =====
const aspectLocked = ref(false);

watch(aspectLocked, (locked) => {
  if (locked && geometry.value) {
    (geometry.value as any)._aspectRatio = geometry.value.width / geometry.value.height;
  }
});

function quickRotate(deg: number) {
  if (geometry.value && !config.value?.locked) {
    geometry.value.rotation = ((geometry.value.rotation || 0) + deg) % 360;
    onFieldChange();
  }
}

function resetScale() {
  if (geometry.value && !config.value?.locked) {
    geometry.value.scale = 1;
    onFieldChange();
  }
}

// ===== 填充边框增强 =====
const fillEnabled = ref(true);
const borderEnabled = ref(true);
const opacityPercent = ref(100);

watch(opacityPercent, (val) => {
  if (style.value) style.value.opacity = val / 100;
});

function onOpacityChange() {
  if (style.value) onFieldChange();
}

// 初始化 opacityPercent
watch(style, (s) => {
  if (s && s.opacity !== undefined) {
    opacityPercent.value = Math.round(s.opacity * 100);
  }
}, { immediate: true });

// ===== 文字样式增强 =====
const lineHeightDisplay = ref(1.5);

watch(lineHeightDisplay, (val) => {
  if (style.value) style.value.lineHeight = val;
});

function onLineHeightChange() {
  if (style.value) onFieldChange();
}

watch(style, (s) => {
  if (s && s.lineHeight !== undefined) {
    lineHeightDisplay.value = s.lineHeight;
  }
}, { immediate: true });

// ===== 阴影增强 =====
const shadowEnabled = ref(false);
const shadowInset = ref(false);

const shadowPreviewStyle = computed(() => {
  if (!style.value) return {};
  const s = style.value;
  return {
    width: '40px',
    height: '40px',
    backgroundColor: s.backgroundColor || '#ccc',
    boxShadow: shadowInset.value
      ? `inset ${s.shadowOffsetX || 0}px ${s.shadowOffsetY || 0}px ${s.shadowBlur || 0}px ${s.shadowSpread || 0}px ${s.shadowColor || '#000'}`
      : `${s.shadowOffsetX || 0}px ${s.shadowOffsetY || 0}px ${s.shadowBlur || 0}px ${s.shadowSpread || 0}px ${s.shadowColor || '#000'}`,
  };
});

// 初始化 shadowEnabled
watch(style, (s) => {
  if (s) {
    const hasShadow = (s.shadowBlur ?? 0) > 0 || (s.shadowOffsetX ?? 0) !== 0 || (s.shadowOffsetY ?? 0) !== 0;
    if (hasShadow && !shadowEnabled.value) shadowEnabled.value = true;
  }
}, { immediate: true });

// ===== 动画配置增强 =====
const animationTypeOptions = ALL_ANIMATION_TYPE_LABELS;

// ===== 布局间距增强 =====
const containerTypes = ['container', 'panel', 'group'];
const isContainerType = computed(() => {
  return config.value ? containerTypes.includes(config.value.type) : false;
});

const layoutUnit = ref('px');
const paddingValues = ref({ top: 0, right: 0, bottom: 0, left: 0 });
const marginValues = ref({ top: 0, right: 0, bottom: 0, left: 0 });

function syncPadding() {
  const v = paddingValues.value.top;
  paddingValues.value = { top: v, right: v, bottom: v, left: v };
  updatePaddingMargin();
}

function syncMargin() {
  const v = marginValues.value.top;
  marginValues.value = { top: v, right: v, bottom: v, left: v };
  updatePaddingMargin();
}

function updatePaddingMargin() {
  if (!style.value) return;
  style.value.padding = `${paddingValues.value.top}${layoutUnit.value} ${paddingValues.value.right}${layoutUnit.value} ${paddingValues.value.bottom}${layoutUnit.value} ${paddingValues.value.left}${layoutUnit.value}`;
  style.value.margin = `${marginValues.value.top}${layoutUnit.value} ${marginValues.value.right}${layoutUnit.value} ${marginValues.value.bottom}${layoutUnit.value} ${marginValues.value.left}${layoutUnit.value}`;
  onFieldChange();
}
</script>

<style scoped>
@import '../../panels/styles/property-panel.scss';

/* ==================== ID 复制栏（顶部固定）==================== */
.id-copy-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.id-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.id-input {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  padding: 3px 6px;
}

/* ==================== 内联复制按钮（标题右侧）==================== */
.copy-btn-inline {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-right: 6px;
}
.copy-btn-inline:hover {
  background-color: var(--control-button-hover);
  border-color: var(--primary);
  color: var(--primary);
}
.copy-btn-inline:active {
  transform: scale(0.92);
}
.copy-btn-inline svg {
  display: block;
}

/* ==================== 分组标题（可折叠）==================== */
.group-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}

.group-label:hover {
  color: var(--text);
}

.group-label:hover .collapse-icon {
  opacity: 1;
}

.group-title {
  flex: 1;
}

.group-label-sub {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
  padding-left: 12px;
  border-bottom: none;
  margin-top: 6px;
  margin-bottom: 0;
}

/* P1-4: collapse-icon 纯 CSS 实现 */
.collapse-icon {
  display: inline-block;
  width: 0; height: 0;
  border-left: 5px solid var(--text-secondary);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.2s ease, opacity 0.15s ease;
  margin-left: 6px;
  opacity: 0.6;
  font-size: 0;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}

/* 分组内容区 */
.group-body {
  overflow: hidden;
  transition: max-height 0.25s ease;
  padding-top: 8px;
}

.sub-group {
  border-left: 2px solid var(--primary-light, #e0e0ff);
  margin-left: 8px;
  padding-left: 8px;
}

/* ==================== 复制按钮 ==================== */
.copy-btn {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background-color: var(--background);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.copy-btn:hover { background-color: var(--control-button-hover); border-color: var(--primary); color: var(--primary); }
.copy-btn:active { transform: scale(0.92); }
.copy-btn svg { display: block; }

.readonly-input {
  background-color: var(--background);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

/* ==================== 位置尺寸 ==================== */
.position-size-row {
  display: flex; gap: 8px;
}
.position-size-item {
  display: flex; align-items: center; gap: 6px; flex: 1;
}
.flex-1 { flex: 1; }
.link-btn {
  width: 26px; height: 26px;
  border: 1px solid var(--border); border-radius: 4px;
  background: var(--background); cursor: pointer;
  font-size: 12px; display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s ease; padding: 0;
}
.link-btn:hover { border-color: var(--primary); }
.link-btn.active { background: var(--primary-light, #e8e8ff); border-color: var(--primary); }

.link-btn-placeholder {
  width: 26px; height: 26px;
  flex-shrink: 0;
  display: inline-block;
}

.position-label {
  width: 36px; font-size: 11px; font-weight: 500; color: var(--text-secondary); flex-shrink: 0;
}

.property-row { display: flex; gap: 8px; }

/* 快捷按钮 */
.rotation-row, .scale-row, .zindex-row, .scale-zindex-row {
  display: flex; align-items: center; gap: 4px;
}
.quick-btn {
  height: 28px; padding: 0 8px;
  border: 1px solid var(--border); border-radius: 4px;
  background: var(--background); cursor: pointer;
  font-size: 11px; color: var(--text-secondary);
  white-space: nowrap; flex-shrink: 0;
  transition: all 0.15s ease;
}
.quick-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ==================== 颜色+启用 checkbox ==================== */
.color-with-enable {
  align-items: stretch;
}
.enable-check {
  display: flex; align-items: center; gap: 3px;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  font-size: 12px; color: var(--text-secondary);
  user-select: none;
}
.enable-check-sm {
  font-size: 11px;
}
.disabled-hint {
  color: var(--text-tertiary); font-style: italic; font-size: 12px;
}

/* Opacity slider */
.opacity-row {
  display: flex; align-items: center; gap: 8px;
}
.opacity-slider {
  flex: 1; accent-color: var(--primary); height: 4px;
}
.opacity-value {
  min-width: 36px; text-align: right; font-size: 12px;
  color: var(--text-secondary); font-weight: 500;
}

/* ==================== Radio 对齐按钮组 ==================== */
.align-radio-row {
  display: flex; align-items: center; gap: 4px;
}
.radio-option {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  padding: 4px 10px; border: 1px solid var(--border); border-radius: 4px;
  cursor: pointer; font-size: 12px; transition: all 0.15s ease;
  user-select: none; white-space: nowrap; min-width: 52px;
}
.radio-option:hover { border-color: var(--primary); }
.radio-option.active {
  background: var(--primary-light, #e8e8ff); border-color: var(--primary); color: var(--primary);
}
.radio-option input[type='radio'] { margin: 0; accent-color: var(--primary); flex-shrink: 0; }

/* Range slider */
.range-input {
  flex: 1; accent-color: var(--primary); height: 3px;
}
.range-inline-value {
  min-width: 32px; text-align: right; font-size: 11px; color: var(--text-secondary);
}

/* ==================== 阴影预览 ==================== */
.shadow-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 8px;
}
.shadow-preview {
  width: 44px; height: 44px; border-radius: 4px; border: 1px solid var(--border);
  flex-shrink: 0;
}

/* ==================== 四向间距输入器 ==================== */
.spacing-section {
  display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px;
}
.spacing-label {
  width: 50px; font-size: 11px; font-weight: 500; color: var(--text-secondary);
  line-height: 28px; flex-shrink: 0;
}
.spacing-box {
  display: grid; grid-template-areas: ". top ." ". left right ." ". bottom ."; grid-template-columns: 1fr auto 1fr;
  gap: 2px; flex: 1;
}
.spacing-cell {
  display: flex; align-items: center; justify-content: center;
}
.spacing-top { grid-area: top; }
.spacing-middle { grid-area: left / span 2; }
.spacing-bottom { grid-area: bottom; }
.spacing-input {
  width: 100%; height: 26px; padding: 2px 4px;
  border: 1px solid var(--border); border-radius: 3px;
  font-size: 12px; text-align: center;
  background: var(--background); color: var(--text);
}
.sync-btn {
  width: 22px; height: 22px; border: 1px solid var(--border); border-radius: 3px;
  background: var(--background); cursor: pointer; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s ease; padding: 0;
}
.sync-btn:hover { border-color: var(--primary); color: var(--primary); }
.unit-row { display: flex; align-items: center; gap: 8px; }

/* ==================== 自定义属性 key 样式 ==================== */
.prop-key {
  min-width: 50px; max-width: 120px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
  font-size: 11px; color: var(--text-secondary);
}
.prop-input-sm {
  flex: 1; min-width: 0; padding: 4px 8px; font-size: 11px; border-radius: 4px;
  border: 1px solid var(--border); background: var(--background);
}
.add-prop-row {
  flex-wrap: wrap; gap: 4px;
}
</style>
