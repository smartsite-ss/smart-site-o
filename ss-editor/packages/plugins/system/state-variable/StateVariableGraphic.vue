<template>
  <div
    class="state-variable-graphic"
    :style="containerStyle"
    :title="bindTitle"
  >
    <img
      v-if="currentImage"
      :src="currentImage"
      class="state-variable-image"
      :style="imageStyle"
      alt=""
    >
    <span
      v-else
      class="state-variable-placeholder"
    >{{ $t('stateVariable.graphic.placeholder') }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { ScadaDataManager } from '@scada-editor/core';
import { useWsStore } from '@scada-editor/system';
import { resolveStateImage, type StateRule } from './stateVariableUtils';

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
  states: StateRule[];
  defaultImage: string;
  imageFit: string;
  opacity: number;
  imageScale: number;
  imageRotation: number;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}>();

const wsStore = useWsStore();

/** 兜底刷新版本号：运行态 EventBus 或 HTTP 轮询等通道通过 tagValueChanged 触发 */
const localVersion = ref(0);

/** 实时值：依赖 wsStore.tagFlushVersion 与 localVersion，任一变化即强制重算 */
const currentValue = computed(() => {
  void wsStore.tagFlushVersion;
  void localVersion.value;
  if (!props.tagId) return null;

  const wsValue = wsStore.getTagValue(props.tagId);
  if (wsValue !== null && wsValue !== undefined) return wsValue;

  return ScadaDataManager.getTagValue(props.tagId) ?? null;
});

/** 根据当前值匹配状态规则，得到应显示的图片 */
const currentImage = computed(() =>
  resolveStateImage(currentValue.value, props.states || [], props.dataType, props.defaultImage || ''),
);

const bindTitle = computed(() =>
  props.tagId ? `${props.deviceName || props.deviceCode} · ${props.tagName || props.tagId}` : '',
);

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  overflow: 'hidden',
  boxSizing: 'border-box' as const,
  border: `${props.borderWidth}px ${props.borderStyle} ${props.borderColor === '#00000000' ? 'transparent' : props.borderColor}`,
  borderRadius: `${props.borderRadius}px`,
  boxShadow:
    props.shadowColor && props.shadowColor !== '#00000000'
      ? `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`
      : 'none',
}));

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: props.imageFit as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down',
  opacity: props.opacity,
  transform: `scale(${props.imageScale}) rotate(${props.imageRotation}deg)`,
}));

let unsubscribeEventBus: (() => void) | null = null;
/** 已登记到 wsStore 的标签，用于绑定变更时退订 / 新增 */
let registeredTagId: string | null = null;

function syncSubscription() {
  const next = props.tagId || null;
  if (registeredTagId && registeredTagId !== next) {
    wsStore.unsubscribeTags([registeredTagId]);
  }
  if (next && next !== registeredTagId && wsStore.isConnected) {
    wsStore.subscribeTags([next]);
  }
  registeredTagId = next;
}

onMounted(() => {
  syncSubscription();
  unsubscribeEventBus = ScadaDataManager.eventBus.on('tagValueChanged', (event) => {
    const payload = (event as { payload?: { tagId?: string } }).payload;
    if (payload?.tagId === props.tagId) {
      localVersion.value++;
    }
  });
});

// 首次连接建立后补偿订阅
watch(
  () => wsStore.isConnected,
  (connected) => {
    if (!connected) return;
    if (props.tagId) wsStore.subscribeTags([props.tagId]);
  },
);

// 绑定变更时同步订阅
watch(
  () => props.tagId,
  () => syncSubscription(),
);

onUnmounted(() => {
  if (registeredTagId) {
    wsStore.unsubscribeTags([registeredTagId]);
  }
  registeredTagId = null;
  unsubscribeEventBus?.();
});
</script>

<style scoped>
.state-variable-graphic {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
}

.state-variable-image {
  display: block;
}

.state-variable-placeholder {
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}
</style>
