<template>
  <div
    class="tag-variable-graphic"
    :style="containerStyle"
    :title="bindTitle"
  >
    <span
      class="tag-variable-value"
      :style="valueStyle"
    >{{ displayValue }}</span>
    <span
      v-if="unit"
      class="tag-variable-unit"
      :style="unitStyle"
    >{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

const props = defineProps<{
  w: number;
  h: number;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
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
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  textShadowColor: string;
  textShadowOffsetX: number;
  textShadowOffsetY: number;
  textShadowBlur: number;
}>();

const { displayValue, bindTitle } = useTagValue(props);

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

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: alignItems.value,
  justifyContent: justifyContent.value,
  gap: `${props.unitGap}px`,
  boxSizing: 'border-box' as const,
  background: props.backgroundColor === '#00000000' ? 'transparent' : props.backgroundColor,
  border: `${props.borderWidth}px solid ${props.borderColor === '#00000000' ? 'transparent' : props.borderColor}`,
  borderRadius: `${props.borderRadius}px`,
  padding: '0 8px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
}));

const valueStyle = computed(() => ({
  color: props.textColor,
  fontSize: `${props.fontSize}px`,
  fontWeight: props.fontWeight,
  fontStyle: props.fontStyle,
  lineHeight: 1,
  textShadow:
    props.textShadowColor && props.textShadowColor !== '#00000000'
      ? `${props.textShadowOffsetX}px ${props.textShadowOffsetY}px ${props.textShadowBlur}px ${props.textShadowColor}`
      : 'none',
}));

const unitStyle = computed(() => ({
  color: props.unitFontColor,
  fontSize: `${props.unitFontSize}px`,
  fontWeight: props.fontWeight,
  fontStyle: props.fontStyle,
  lineHeight: 1,
}));

</script>

<style scoped>
.tag-variable-graphic {
  position: relative;
  font-family: Arial, sans-serif;
}

.tag-variable-value,
.tag-variable-unit {
  flex-shrink: 0;
}
</style>
