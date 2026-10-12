<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ w: number, h: number, timeSize: number, timeLineHeight: number, timeTextIndent: number, timeColor: string, fontWeight: string, showShadow: boolean, hShadow: number, vShadow: number, blurShadow: number, colorShadow: string }>();

const now = ref('');
let timer: any = null;

onMounted(() => {
  const update = () => {
    const d = new Date();
    now.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  };
  update();
  timer = setInterval(update, 1000);
});

onUnmounted(() => { clearInterval(timer); });

const shadowStyle = computed(() => props.showShadow ? `${props.hShadow}px ${props.vShadow}px ${props.blurShadow}px ${props.colorShadow}` : 'none');
</script>

<template>
  <div :style="`width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;color:${timeColor};font-size:${timeSize}px;line-height:${timeLineHeight}px;letter-spacing:${timeTextIndent}px;font-weight:${fontWeight};text-shadow:${shadowStyle};`">
    {{ now }}
  </div>
</template>