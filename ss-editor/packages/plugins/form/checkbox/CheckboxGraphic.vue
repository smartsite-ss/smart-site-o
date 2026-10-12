<template>
  <label class="checkbox-graphic" :style="rootStyle">
    <input
      ref="inputEl"
      type="checkbox"
      class="checkbox-graphic-input"
      :style="inputStyle"
      :checked="innerChecked"
      :disabled="disabled"
      @change="onToggle"
    />
    <span
      v-if="label"
      class="checkbox-graphic-label"
    >{{ label }}</span>
  </label>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted } from 'vue';

const SIZE_MAP: Record<string, number> = {
  small: 14,
  medium: 18,
  large: 22,
};

export default defineComponent({
  name: 'CheckboxGraphic',
  props: {
    w: { type: Number, default: 24 },
    h: { type: Number, default: 24 },
    checked: { type: Boolean, default: false },
    label: { type: String, default: '复选框' },
    disabled: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    color: { type: String, default: '#18A058FF' },
    labelPosition: { type: String, default: 'right' },
    size: { type: String, default: 'medium' },
  },
  setup(props) {
    const innerChecked = ref(props.checked);
    const inputEl = ref<HTMLInputElement | null>(null);

    watch(
      () => props.checked,
      (v) => {
        innerChecked.value = v;
      },
    );

    const syncIndeterminate = () => {
      if (inputEl.value) {
        inputEl.value.indeterminate = props.indeterminate;
      }
    };
    watch(() => props.indeterminate, syncIndeterminate);
    onMounted(syncIndeterminate);

    const boxSize = computed(() => SIZE_MAP[props.size] ?? SIZE_MAP.medium);

    const rootStyle = computed(() => ({
      flexDirection: props.labelPosition === 'left' ? 'row-reverse' : 'row',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? '0.6' : '1',
      color: 'var(--text, #333333)',
    }));

    const inputStyle = computed(() => ({
      width: `${boxSize.value}px`,
      height: `${boxSize.value}px`,
      accentColor: props.color,
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      margin: '0',
      flexShrink: '0',
    }));

    const onToggle = (e: Event) => {
      innerChecked.value = (e.target as HTMLInputElement).checked;
    };

    return { innerChecked, inputEl, rootStyle, inputStyle, onToggle };
  },
});
</script>

<style scoped>
.checkbox-graphic {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}

.checkbox-graphic-input {
  display: block;
}

.checkbox-graphic-label {
  font-size: 14px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
