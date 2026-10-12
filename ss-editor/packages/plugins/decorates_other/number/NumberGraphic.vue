<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  w: number
  h: number
  dataset: number
  from: number
  dur: number
  precision: number
  showSeparator: boolean
  numberSize: number
  numberColor: string
  prefixText: string
  prefixColor: string
  suffixText: string
  suffixColor: string
}>()

const displayValue = ref(props.from)
let animationId: number | null = null

watch(() => props.dataset, (newVal) => {
  const start = displayValue.value
  const end = Number(newVal)
  const duration = (props.dur || 3) * 1000
  const startTime = Date.now()

  if (animationId) cancelAnimationFrame(animationId)

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const current = start + (end - start) * progress
    displayValue.value = Number(current.toFixed(props.precision || 0))
    if (progress < 1) {
      animationId = requestAnimationFrame(animate)
    }
  }

  animationId = requestAnimationFrame(animate)
}, { immediate: true })

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
})

const formatNumber = (val: number) => {
  if (props.showSeparator) {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: props.precision,
      maximumFractionDigits: props.precision,
    })
  }
  return val.toFixed(props.precision)
}
</script>

<template>
  <div :style="`width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;`">
    <span :style="`color:${prefixColor};font-size:${numberSize}px;`">{{ prefixText }}</span>
    <span :style="`color:${numberColor};font-size:${numberSize}px;`">{{ formatNumber(displayValue) }}</span>
    <span :style="`color:${suffixColor};font-size:${numberSize}px;`">{{ suffixText }}</span>
  </div>
</template>