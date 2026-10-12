<template>
  <input
    class="input-graphic"
    :style="inputStyle"
    :value="innerValue"
    :placeholder="placeholder"
    @input="onInput"
  />
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';

export default defineComponent({
  name: 'InputGraphic',
  props: {
    w: { type: Number, default: 160 },
    h: { type: Number, default: 36 },
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    backgroundColor: { type: String, default: '#FFFFFFFF' },
    borderColor: { type: String, default: '#CED4DAFF' },
    borderWidth: { type: Number, default: 1 },
    borderStyle: { type: String, default: 'solid' },
    borderRadius: { type: Number, default: 4 },
    textColor: { type: String, default: '#333333FF' },
    fontSize: { type: Number, default: 14 },
    fontWeight: { type: String, default: 'normal' },
    textAlign: { type: String, default: 'left' },
    shadowColor: { type: String, default: '#00000000' },
    shadowOffsetX: { type: Number, default: 0 },
    shadowOffsetY: { type: Number, default: 0 },
    shadowBlur: { type: Number, default: 0 },
  },
  setup(props) {
    const innerValue = ref(props.value);

    watch(
      () => props.value,
      (v) => {
        innerValue.value = v;
      },
    );

    const inputStyle = computed(() => {
      let boxShadow = 'none';
      if (props.shadowColor && props.shadowColor !== '#00000000') {
        boxShadow = `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`;
      }

      return {
        background: props.backgroundColor,
        color: props.textColor,
        border: `${props.borderWidth}px ${props.borderStyle} ${props.borderColor}`,
        borderRadius: `${props.borderRadius}px`,
        fontSize: `${props.fontSize}px`,
        fontWeight: props.fontWeight,
        textAlign: props.textAlign,
        boxShadow,
        width: '100%',
        height: '100%',
        padding: '0 8px',
        outline: 'none',
        boxSizing: 'border-box',
      };
    });

    const onInput = (e: Event) => {
      innerValue.value = (e.target as HTMLInputElement).value;
    };

    return { inputStyle, innerValue, onInput };
  },
});
</script>

<style scoped>
.input-graphic {
  display: block;
}

.input-graphic::placeholder {
  color: var(--text-secondary, #999999);
}
</style>
