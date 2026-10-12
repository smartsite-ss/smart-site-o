<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  w: number
  h: number
  dataset: number
  showDay: boolean
  flipperBgColor: string
  flipperTextColor: string
  flipperWidth: number
  flipperHeight: number
  flipperGap: number
}>()

const displayText = ref('')
let timer: any = null
let startTime = Date.now()

const updateDisplay = () => {
  let remaining = Math.max(0, props.dataset - Math.floor((Date.now() - startTime) / 1000))
  const days = Math.floor(remaining / 86400)
  remaining = remaining % 86400
  const hours = String(Math.floor(remaining / 3600)).padStart(2, '0')
  remaining = remaining % 3600
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')
  displayText.value = props.showDay ? `${days}d ${hours}:${minutes}:${secs}` : `${hours}:${minutes}:${secs}`
}

onMounted(() => {
  startTime = Date.now()
  timer = setInterval(updateDisplay, 1000)
  updateDisplay()
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div :style="`width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background-color:${flipperBgColor};color:${flipperTextColor};font-size:${flipperHeight*0.6}px;font-family:monospace;border-radius:${Math.min(flipperWidth,flipperHeight)*0.1}px;`">
    {{ displayText }}
  </div>
</template>