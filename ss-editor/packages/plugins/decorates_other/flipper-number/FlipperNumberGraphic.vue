<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  w: number
  h: number
  dataset: string | number
  flipperLength: number
  flipperTextColor: string
  flipperWidth: number
  flipperHeight: number
  flipperGap: number
}>()

const displayValue = ref('')

watch(() => props.dataset, (val) => {
  displayValue.value = String(val).padStart(props.flipperLength, '0').slice(-props.flipperLength)
}, { immediate: true })
</script>

<template>
  <div :style="`width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;color:${flipperTextColor};font-size:${flipperHeight*0.6}px;font-family:monospace;letter-spacing:${flipperGap}px;`">
    {{ displayValue }}
  </div>
</template>