<template>
  <div
    class="color-picker"
    @click="$event.stopPropagation()"
  >
    <!-- 颜色显示和选择按钮 -->
    <div
      ref="triggerRef"
      class="color-picker-trigger"
      @click="toggleColorPicker"
    >
      <div
        class="color-preview"
        :class="{ 'is-transparent': !modelValue }"
        :style="{ background: modelValue || 'transparent' }"
      >
        <span class="color-value-text">{{ displayValue }}</span>
      </div>
      <div class="color-picker-button">
        <span>▼</span>
      </div>
    </div>
    
    <!-- 颜色选择器弹窗 -->
    <div 
      v-if="isOpen" 
      class="color-picker-content" 
      :style="popupPosition"
      @click="$event.stopPropagation()"
    >
      <!-- 主颜色选择器 -->
      <div
        ref="colorSelectorRef"
        class="color-selector"
      >
        <div 
          class="color-gradient" 
          :style="{ background: gradientStyle }"
          @click="handleColorClick"
        >
          <div 
            class="color-picker-indicator" 
            :style="{ left: `${hue * 100}%`, top: `${(1 - saturation) * 100}%` }"
          />
        </div>
        
        <!-- 色相条 -->
        <div class="hue-slider">
          <div 
            class="hue-gradient"
            @click="handleHueClick"
          >
            <div 
              class="hue-indicator" 
              :style="{ top: `${(1 - hue) * 100}%` }"
            />
          </div>
        </div>
        
        <!-- 透明度条 -->
        <div class="alpha-slider">
          <div 
            class="alpha-gradient" 
            :style="{ background: alphaGradientStyle }"
            @click="handleAlphaClick"
          >
            <div 
              class="alpha-indicator" 
              :style="{ left: `${alpha * 100}%` }"
            />
          </div>
        </div>
      </div>
      
      <!-- 预设颜色 -->
      <div class="preset-colors">
        <div 
          v-for="(preset, index) in presetColors" 
          :key="index"
          class="preset-color"
          :style="{ background: preset }"
          @click="selectPresetColor(preset)"
        />
      </div>
      
      <!-- 颜色值和操作按钮 -->
      <div class="color-picker-footer">
        <div class="color-value">
          <input 
            v-model="colorValue" 
            type="text" 
            class="color-value-input"
            @input="handleColorValueChange"
          >
        </div>
        <div class="color-picker-actions">
          <button 
            class="color-picker-button clear"
            @click="clearColor"
          >
            {{ t('operations.clear') }}
          </button>
          <button 
            class="color-picker-button confirm"
            @click="confirmColor"
          >
            {{ t('settings.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { i18n } from '@scada-editor/core';
const { t } = i18n.global;

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: '#64A479'
  },
  direction: {
    type: String,
    default: 'bottom',
    validator: (value: string) => {
      return ['top', 'bottom', 'left', 'right'].includes(value);
    }
  },
  autoPosition: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'colorChange']);

// Refs
const colorSelectorRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);

// State
const hue = ref(0.3); // 0-1
const saturation = ref(0.4); // 0-1
const lightness = ref(0.5); // 0-1
const alpha = ref(1); // 0-1
const colorValue = ref(props.modelValue);
const isOpen = ref(false);

// Computed
const actualDirection = computed(() => {
  if (!props.autoPosition) {
    return props.direction;
  }
  
  if (!triggerRef.value || !isOpen.value) {
    return props.direction;
  }
  
  const rect = triggerRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 计算各个方向的可用空间
  const spaceTop = rect.top;
  const spaceBottom = viewportHeight - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = viewportWidth - rect.right;
  
  // 优先选择空间最大的方向
  const spaces = {
    top: spaceTop,
    bottom: spaceBottom,
    left: spaceLeft,
    right: spaceRight
  };
  
  return Object.entries(spaces)
    .sort(([,a], [,b]) => b - a)[0][0] as 'top' | 'bottom' | 'left' | 'right';
});

const popupPosition = computed(() => {
  if (!triggerRef.value || !isOpen.value) {
    return { top: '0px', left: '0px' };
  }
  
  const rect = triggerRef.value.getBoundingClientRect();
  const contentWidth = 300;
  const contentHeight = 400; // 估计的颜色选择器高度
  
  let top = 0;
  let left = 0;
  
  switch (actualDirection.value) {
    case 'top':
      top = rect.top - contentHeight - 4;
      left = rect.left;
      break;
    case 'bottom':
      top = rect.bottom + 4;
      left = rect.left;
      break;
    case 'left':
      top = rect.top;
      left = rect.left - contentWidth - 4;
      break;
    case 'right':
      top = rect.top;
      left = rect.right + 4;
      break;
  }
  
  // 确保弹出框在视口内
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (left < 0) {
    left = 0;
  } else if (left + contentWidth > viewportWidth) {
    left = viewportWidth - contentWidth;
  }
  
  if (top < 0) {
    top = 0;
  } else if (top + contentHeight > viewportHeight) {
    top = viewportHeight - contentHeight;
  }
  
  return { top: `${top}px`, left: `${left}px` };
});

// Preset colors
const presetColors = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#808080', '#A52A2A', '#FFC0CB', '#800000', '#808000',
  '#008000', '#008080', '#000080', '#8B4513', '#2E8B57'
];

// Computed properties
const gradientStyle = computed(() => {
  return `linear-gradient(to right, white, hsl(${hue.value * 360}, 100%, 50%)), linear-gradient(to top, black, transparent)`;
});

const alphaGradientStyle = computed(() => {
  const rgbColor = hslToRgb(hue.value, saturation.value, lightness.value);
  return `linear-gradient(to right, transparent, rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 1))`;
});

const displayValue = computed(() => {
  if (!props.modelValue) return '#00000000';
  return props.modelValue.toUpperCase();
});

// Methods
function hslToRgb(h: number, s: number, l: number) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255, g /= 255, b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function updateColorValue() {
  const rgb = hslToRgb(hue.value, saturation.value, lightness.value);
  colorValue.value = rgbToHex(rgb.r, rgb.g, rgb.b);
  emit('update:modelValue', colorValue.value);
  emit('colorChange', colorValue.value);
}

function parseColorValue(value: string) {
  // 处理 rgba 格式
  const rgbaMatch = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    alpha.value = parseFloat(rgbaMatch[4]);
    const hsl = rgbToHsl(r, g, b);
    hue.value = hsl.h;
    saturation.value = hsl.s;
    lightness.value = hsl.l;
    return true;
  }
  
  // 处理十六进制格式
  const hexMatch = value.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    alpha.value = 1;
    const hsl = rgbToHsl(r, g, b);
    hue.value = hsl.h;
    saturation.value = hsl.s;
    lightness.value = hsl.l;
    return true;
  }
  
  return false;
}

function handleColorClick(event: MouseEvent) {
  if (!colorSelectorRef.value) return;
  const rect = colorSelectorRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const width = rect.width - 20; // 减去色相条宽度
  const height = rect.height - 40; // 减去透明度条高度
  
  hue.value = Math.max(0, Math.min(1, x / width));
  saturation.value = Math.max(0, Math.min(1, 1 - y / height));
  updateColorValue();
}

function handleHueClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;
  
  hue.value = Math.max(0, Math.min(1, 1 - y / height));
  updateColorValue();
}

function handleAlphaClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const width = rect.width;
  
  alpha.value = Math.max(0, Math.min(1, x / width));
  updateColorValue();
}

function handleColorValueChange() {
  if (!parseColorValue(colorValue.value)) {
    // 无效的颜色值，恢复之前的颜色
    updateColorValue();
  }
}

function selectPresetColor(color: string) {
  colorValue.value = color;
  parseColorValue(color);
  updateColorValue();
}

function clearColor() {
  alpha.value = 1;
  hue.value = 0;
  saturation.value = 0;
  lightness.value = 0;
  colorValue.value = '';
  emit('update:modelValue', '');
  emit('colorChange', '');
  isOpen.value = false;
}

function toggleColorPicker() {
  isOpen.value = !isOpen.value;
}

function confirmColor() {
  // 确认颜色选择并关闭颜色选择器
  emit('colorChange', colorValue.value);
  isOpen.value = false;
}

// 点击外部关闭颜色选择器
function handleClickOutside(_: MouseEvent) {
  if (isOpen.value) {
    isOpen.value = false;
  }
}

// Lifecycle
onMounted(() => {
  colorValue.value = props.modelValue || '';
  if (props.modelValue) {
    parseColorValue(props.modelValue);
  }
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Watch
watch(() => props.modelValue, (newValue) => {
  colorValue.value = newValue || '';
  if (newValue) {
    parseColorValue(newValue);
  }
});
</script>

<style scoped lang="scss">
.color-picker {
  display: inline-block;
  position: relative;
  
  .color-picker-trigger {
    display: flex;
    align-items: center;
    border: 1px solid var(--border, #cccccc);
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    background: var(--surface, #ffffff);

    .color-preview {
      width: 80px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;

      &.is-transparent {
        background-image:
          linear-gradient(45deg, #ccc 25%, transparent 25%),
          linear-gradient(-45deg, #ccc 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #ccc 75%),
          linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 8px 8px;
        background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      }

      .color-value-text {
        font-size: 11px;
        font-family: monospace;
        font-weight: 500;
        letter-spacing: 0.3px;
        white-space: nowrap;
        text-shadow: 0 0 3px rgba(255, 255, 255, 0.7), 0 0 6px rgba(255, 255, 255, 0.4);
        pointer-events: none;
        user-select: none;
        line-height: 1;
      }
    }

    .color-picker-button {
      padding: 0 6px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text, #333333);
      flex-shrink: 0;

      &:hover {
        background: var(--control-button-hover, #f0f0f0);
      }
    }
  }
  
  .color-picker-content {
    position: fixed;
    z-index: 9999;
    background: var(--surface, #ffffff);
    border: 1px solid var(--border, #cccccc);
    border-radius: 4px;
    padding: 16px;
    box-shadow: var(--shadow-large, 0 4px 12px rgba(0, 0, 0, 0.15));
    width: 300px;
    
    .color-selector {
      display: flex;
      margin-bottom: 16px;
      
      .color-gradient {
        flex: 1;
        height: 200px;
        position: relative;
        cursor: pointer;
        border-radius: 4px 0 0 4px;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to right, white, transparent),
                      linear-gradient(to top, black, transparent);
          pointer-events: none;
        }
        
        .color-picker-indicator {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }
      }
      
      .hue-slider {
        width: 20px;
        height: 200px;
        margin-left: 8px;
        position: relative;
        cursor: pointer;
        
        .hue-gradient {
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, red, yellow, green, cyan, blue, magenta, red);
          border-radius: 4px;
          
          .hue-indicator {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: white;
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
            transform: translateY(-50%);
            pointer-events: none;
          }
        }
      }
    }
    
    .alpha-slider {
      width: 100%;
      height: 20px;
      margin-bottom: 16px;
      position: relative;
      cursor: pointer;
      
      .alpha-gradient {
        width: 100%;
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(to right, transparent, black);
        
        .alpha-indicator {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: white;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
          transform: translateX(-50%);
          pointer-events: none;
        }
      }
    }
    
    .preset-colors {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      margin-bottom: 16px;
      
      .preset-color {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        border: 1px solid var(--border, #cccccc);
        
        &:hover {
          transform: scale(1.1);
        }
      }
    }
    
    .color-picker-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .color-value {
        flex: 1;
        margin-right: 12px;
        
        .color-value-input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid var(--border, #cccccc);
          border-radius: 4px;
          font-size: 14px;
          color: var(--text, #333333);
          background: var(--surface, #ffffff);
          
          &:focus {
            outline: none;
            border-color: var(--primary, #2196F3);
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
          }
        }
      }
      
      .color-picker-actions {
        display: flex;
        gap: 8px;
        
        .color-picker-button {
          padding: 6px 12px;
          border: 1px solid var(--border, #cccccc);
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          
          &.clear {
            background: var(--surface, #ffffff);
            color: var(--text, #333333);
            
            &:hover {
              background: var(--background, #F5F5F5);
            }
          }
          
          &.confirm {
            background: var(--primary, #2196F3);
            color: white;
            border-color: var(--primary, #2196F3);
            
            &:hover {
              background: var(--button-hover, #1976D2);
              border-color: var(--button-hover, #1976D2);
            }
          }
        }
      }
    }
  }
}

// 深色主题适配
:deep(.dark) {
  .color-picker {
    .color-picker-trigger {
      border-color: var(--border, #333333);
      background: var(--surface, #1E1E1E);

      .color-preview {
        &.is-transparent {
          background-image:
            linear-gradient(45deg, #444 25%, transparent 25%),
            linear-gradient(-45deg, #444 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #444 75%),
            linear-gradient(-45deg, transparent 75%, #444 75%);
        }

        .color-value-text {
          text-shadow: 0 0 3px rgba(0, 0, 0, 0.7), 0 0 6px rgba(0, 0, 0, 0.4);
          color: #FFFFFF;
        }
      }

      .color-picker-button {
        color: var(--text, #FFFFFF);

        &:hover {
          background: var(--control-button-hover, #2D2D2D);
        }
      }
    }
    
    .color-picker-content {
      background: var(--surface, #1E1E1E);
      border-color: var(--border, #333333);
      
      .preset-color {
        border-color: var(--border, #333333);
      }
      
      .color-value {
        .color-value-input {
          background: var(--surface, #1E1E1E);
          color: var(--text, #FFFFFF);
          border-color: var(--border, #333333);
          
          &:focus {
            border-color: var(--primary, #409EFF);
            box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
          }
        }
      }
      
      .color-picker-actions {
        .color-picker-button {
          border-color: var(--border, #333333);
          
          &.clear {
            background: var(--surface, #1E1E1E);
            color: var(--text, #FFFFFF);
            
            &:hover {
              background: var(--background, #2D2D2D);
            }
          }
        }
      }
    }
  }
}
</style>