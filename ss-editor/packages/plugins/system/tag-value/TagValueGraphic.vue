<template>
  <div
    class="tag-value-root"
    :style="rootStyle"
    :title="bindTitle"
  >
    <div
      class="tag-value-graphic"
      :class="`shape-${shape}`"
      :style="containerStyle"
    >
      <img
        v-if="isBackgroundDecoration"
        :src="decorationImage"
        class="decoration decoration--background"
        :style="bgDecorationStyle"
        alt=""
      >

      <template v-if="isCircle">
        <img
          v-if="showIconDecoration"
          :src="decorationImage"
          class="decoration decoration--icon"
          :style="iconDecorationStyle"
          alt=""
        >
        <span
          v-if="showName"
          class="name"
          :style="nameStyle"
        >{{ displayName }}</span>
        <span
          class="value"
          :style="valueStyle"
        >{{ displayValue }}</span>
        <span
          v-if="unit"
          class="unit"
          :style="unitStyle"
        >{{ unit }}</span>
      </template>

      <template v-else>
        <img
          v-if="showIconDecoration && iconOnLeft"
          :src="decorationImage"
          class="decoration decoration--icon"
          :style="iconDecorationStyle"
          alt=""
        >
        <span
          v-if="showName"
          class="name"
          :style="nameStyle"
        >{{ displayName }}</span>
        <span
          class="value"
          :style="valueStyle"
        >{{ displayValue }}</span>
        <span
          v-if="unit"
          class="unit"
          :style="unitStyle"
        >{{ unit }}</span>
        <img
          v-if="showIconDecoration && iconOnRight"
          :src="decorationImage"
          class="decoration decoration--icon"
          :style="iconDecorationStyle"
          alt=""
        >
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';
import { resolveDisplayName, resolveBackgroundSize } from './tagValueUtils';

const props = defineProps<{
  w: number;
  h: number;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
  shape: string;
  alias: string;
  showName: boolean;
  nameColor: string;
  nameFontSize: number;
  nameFontWeight: string;
  nameGap: number;
  decorationImage: string;
  decorationImagePosition: string;
  decorationImageSize: number;
  decorationImageOpacity: number;
  decimalPlaces: number;
  unit: string;
  unitFontSize: number;
  unitFontColor: string;
  unitGap: number;
  textColor: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  verticalAlignment: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundRepeat: string;
  backgroundImageFit: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  textShadowColor: string;
  textShadowOffsetX: number;
  textShadowOffsetY: number;
  textShadowBlur: number;
}>();

const { displayValue, bindTitle } = useTagValue(props);
const displayName = computed(() => resolveDisplayName(props.alias, props.tagName, props.tagId));

const isCircle = computed(() => props.shape === 'circle');
const hasDecoration = computed(() => !!props.decorationImage);
const isBackgroundDecoration = computed(() => hasDecoration.value && props.decorationImagePosition === 'background');
const showIconDecoration = computed(() => hasDecoration.value && props.decorationImagePosition !== 'background');
const iconOnLeft = computed(() => props.decorationImagePosition === 'left');
const iconOnRight = computed(() => props.decorationImagePosition === 'right');

function resolveBackground(color: string): string {
  return color === '#00000000' ? 'transparent' : color;
}

const textShadow = computed(() =>
  props.textShadowColor && props.textShadowColor !== '#00000000'
    ? `${props.textShadowOffsetX}px ${props.textShadowOffsetY}px ${props.textShadowBlur}px ${props.textShadowColor}`
    : 'none',
);

const justifyContent = computed(() => {
  switch (props.textAlign) {
    case 'center': return 'center';
    case 'right': return 'flex-end';
    default: return 'flex-start';
  }
});

const alignItems = computed(() => {
  switch (props.verticalAlignment) {
    case 'top': return 'flex-start';
    case 'bottom': return 'flex-end';
    default: return 'center';
  }
});

const circleSize = computed(() => Math.max(1, Math.min(props.w, props.h)));

const rootStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const containerStyle = computed(() => {
  const base = {
    position: 'relative' as const,
    display: 'flex',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    backgroundColor: resolveBackground(props.backgroundColor),
    backgroundImage: props.backgroundImage ? `url("${props.backgroundImage}")` : 'none',
    backgroundRepeat: props.backgroundRepeat,
    backgroundSize: resolveBackgroundSize(props.backgroundImageFit),
    border: `${props.borderWidth}px ${props.borderStyle} ${resolveBackground(props.borderColor)}`,
  };

  if (isCircle.value) {
    return {
      ...base,
      width: `${circleSize.value}px`,
      height: `${circleSize.value}px`,
      borderRadius: '50%',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  return {
    ...base,
    width: '100%',
    height: '100%',
    borderRadius: `${props.borderRadius}px`,
    flexDirection: 'row' as const,
    alignItems: alignItems.value,
    justifyContent: justifyContent.value,
    padding: '0 8px',
    whiteSpace: 'nowrap' as const,
  };
});

const nameStyle = computed(() => ({
  color: props.nameColor,
  fontSize: `${props.nameFontSize}px`,
  fontWeight: props.nameFontWeight,
  lineHeight: 1,
  ...(isCircle.value
    ? { marginBottom: `${props.nameGap}px` }
    : { marginRight: `${props.nameGap}px` }),
}));

const valueStyle = computed(() => ({
  color: props.textColor,
  fontSize: `${props.fontSize}px`,
  fontWeight: props.fontWeight,
  fontStyle: props.fontStyle,
  lineHeight: 1,
  textShadow: textShadow.value,
}));

const unitStyle = computed(() => ({
  color: props.unitFontColor,
  fontSize: `${props.unitFontSize}px`,
  fontWeight: props.fontWeight,
  fontStyle: props.fontStyle,
  lineHeight: 1,
  ...(isCircle.value
    ? { marginTop: `${props.unitGap}px` }
    : { marginLeft: `${props.unitGap}px` }),
}));

const bgDecorationStyle = computed(() => ({
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  opacity: props.decorationImageOpacity,
}));

const iconDecorationStyle = computed(() => ({
  width: `${props.decorationImageSize}px`,
  height: `${props.decorationImageSize}px`,
  objectFit: 'contain' as const,
  opacity: props.decorationImageOpacity,
  ...(isCircle.value
    ? { marginBottom: `${props.nameGap}px` }
    : iconOnLeft.value
      ? { marginRight: `${props.nameGap}px` }
      : { marginLeft: `${props.unitGap}px` }),
}));

</script>

<style scoped>
.tag-value-root {
  font-family: Arial, sans-serif;
}

.tag-value-graphic {
  position: relative;
}

.decoration--background {
  z-index: 0;
}

.name,
.value,
.unit,
.decoration--icon {
  position: relative;
  z-index: 1;
  white-space: nowrap;
}
</style>
