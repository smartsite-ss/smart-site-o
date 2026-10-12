<template>
  <button
    class="navigation-button-graphic"
    :style="buttonStyle"
    :disabled="disabled"
    @click="handleClick"
  >{{ text }}</button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { usePageStore } from '@scada-editor/core';

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  primary: { bg: 'var(--primary, #2196F3)', color: '#fff', border: 'var(--primary, #2196F3)' },
  success: { bg: 'var(--status-success, #4CAF50)', color: '#fff', border: 'var(--status-success, #4CAF50)' },
  warning: { bg: 'var(--status-warning, #FFC107)', color: '#fff', border: 'var(--status-warning, #FFC107)' },
  danger: { bg: 'var(--status-error, #F44336)', color: '#fff', border: 'var(--status-error, #F44336)' },
  default: { bg: 'var(--surface, #FFFFFF)', color: 'var(--text, #333333)', border: 'var(--border, #CCCCCC)' },
};

const SIZE_STYLES: Record<string, { padding: string; fontSize: string; height: string }> = {
  large: { padding: '0 20px', fontSize: '14px', height: '40px' },
  default: { padding: '0 16px', fontSize: '13px', height: '32px' },
  small: { padding: '0 12px', fontSize: '12px', height: '24px' },
};

export default defineComponent({
  name: 'NavigationButtonGraphic',
  props: {
    w: { type: Number, default: 100 },
    h: { type: Number, default: 40 },
    text: { type: String, default: '导航按钮' },
    type: { type: String, default: 'primary' },
    size: { type: String, default: 'default' },
    disabled: { type: Boolean, default: false },
    transparent: { type: Boolean, default: false },
    backgroundColor: { type: String, default: '' },
    fontColor: { type: String, default: '' },
    borderColor: { type: String, default: '' },
    borderWidth: { type: Number, default: 1 },
    borderStyle: { type: String, default: 'solid' },
    borderRadius: { type: Number, default: 4 },
    fontSize: { type: Number, default: 13 },
    fontWeight: { type: String, default: 'normal' },
    textAlign: { type: String, default: 'center' },
    shadowColor: { type: String, default: '' },
    shadowOffsetX: { type: Number, default: 0 },
    shadowOffsetY: { type: Number, default: 0 },
    shadowBlur: { type: Number, default: 0 },
    targetType: { type: String, default: 'none' },
    targetPage: { type: String, default: '' },
    targetUrl: { type: String, default: '' },
  },
  setup(props) {
    const pageStore = usePageStore();

    const buttonStyle = computed(() => {
      const typeStyle = TYPE_STYLES[props.type] || TYPE_STYLES.default;
      const sizeStyle = SIZE_STYLES[props.size] || SIZE_STYLES.default;

      // 样式类：用户自定义值优先，空值回退到 type 预设
      const bg = props.backgroundColor || typeStyle.bg;
      const color = props.fontColor || typeStyle.color;
      const borderColorVal = props.borderColor || typeStyle.border;
      const radius = `${props.borderRadius}px`;

      // 阴影：shadowColor 为空时不显示阴影
      let boxShadow = 'none';
      if (props.shadowColor) {
        boxShadow = `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`;
      }

      // 透明模式：隐藏背景和边框
      if (props.transparent) {
        return {
          background: 'transparent',
          color: props.fontColor || typeStyle.color,
          border: 'none',
          borderRadius: radius,
          fontSize: `${props.fontSize}px`,
          fontWeight: props.fontWeight,
          textAlign: props.textAlign,
          boxShadow,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? '0.6' : '1',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxSizing: 'border-box',
        };
      }

      return {
        background: bg,
        color,
        border: `${props.borderWidth}px ${props.borderStyle} ${borderColorVal}`,
        borderRadius: radius,
        fontSize: `${props.fontSize}px`,
        fontWeight: props.fontWeight,
        textAlign: props.textAlign,
        boxShadow,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? '0.6' : '1',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
      };
    });

    const handleClick = () => {
      if (props.disabled) return;
      if (props.targetType === 'none') return;

      if (props.targetType === 'page' && props.targetPage) {
        pageStore.setCurrentPage(props.targetPage);
      } else if (props.targetType === 'url' && props.targetUrl) {
        window.open(props.targetUrl, '_blank');
      }
    };

    return { buttonStyle, handleClick };
  },
});
</script>

<style scoped>
.navigation-button-graphic {
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}
</style>
