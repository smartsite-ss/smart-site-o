<template>
  <div class="status-indicator-root" :title="bindTitle">
    <div class="status-indicator-dot" :style="dotStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTagValue } from '@scada-editor/system';

type StatusKey = 'normal' | 'warning' | 'error' | 'offline';
type ColorKey = 'normalColor' | 'warningColor' | 'errorColor' | 'offlineColor';

const STATUS_COLOR_KEY: Record<StatusKey, ColorKey> = {
  normal: 'normalColor',
  warning: 'warningColor',
  error: 'errorColor',
  offline: 'offlineColor',
};

const props = defineProps<{
  w: number;
  h: number;
  status: string;
  normalColor: string;
  warningColor: string;
  errorColor: string;
  offlineColor: string;
  size: number;
  showGlow: boolean;
  pulseSpeed: number;
  normalValue: string;
  warningValue: string;
  errorValue: string;
  offlineValue: string;
  defaultStatus: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
}>();

const { currentValue, bindTitle } = useTagValue(props);

/** 解析实时值 → 状态：未绑定时用手动 status；绑定时按「值→状态」映射，未命中用 defaultStatus */
const effectiveStatus = computed<StatusKey>(() => {
  if (!props.tagId) return props.status as StatusKey;

  const raw = currentValue.value;
  if (typeof raw === 'boolean') return raw ? 'normal' : 'offline';
  const rawStr = raw === null || raw === undefined ? '' : String(raw);

  const rules: Array<{ status: StatusKey; value: string }> = [
    { status: 'normal', value: props.normalValue },
    { status: 'warning', value: props.warningValue },
    { status: 'error', value: props.errorValue },
    { status: 'offline', value: props.offlineValue },
  ];
  for (const rule of rules) {
    if (rule.value !== '' && rawStr === rule.value) return rule.status;
  }
  return props.defaultStatus as StatusKey;
});

const dotColor = computed(() => props[STATUS_COLOR_KEY[effectiveStatus.value]]);

const dotStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: '50%',
  background: dotColor.value,
  boxShadow:
    props.showGlow && effectiveStatus.value !== 'offline'
      ? `0 0 ${props.size * 0.5}px ${dotColor.value}, 0 0 ${props.size}px ${dotColor.value}40`
      : 'none',
  animation:
    props.showGlow && effectiveStatus.value !== 'offline'
      ? `ss-indicator-pulse ${props.pulseSpeed}s ease-in-out infinite`
      : 'none',
}));
</script>

<style scoped>
.status-indicator-root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-indicator-dot {
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

@keyframes ss-indicator-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
</style>
