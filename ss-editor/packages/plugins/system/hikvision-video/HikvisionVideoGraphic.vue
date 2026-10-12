<template>
  <div class="hikvision-video-graphic" :style="containerStyle">
    <div
      v-for="slotIndex in grid.total"
      :key="slotIndex"
      class="video-slot"
    >
      <VideoPlayer
        v-if="isSlotPlayable(slotIndex - 1)"
        :play-url="channelAt(slotIndex - 1)!.playUrl"
        :protocol="channelAt(slotIndex - 1)!.protocol"
        :muted="muted"
        :auto-play="autoPlay"
        :object-fit="objectFit"
      />
      <div v-else class="video-slot-placeholder">
        {{ channelAt(slotIndex - 1)?.name || `CH${slotIndex}` }}
      </div>
      <div
        v-if="showChannelName && channelAt(slotIndex - 1)?.name"
        class="video-slot-name"
        :style="nameStyle"
      >
        {{ channelAt(slotIndex - 1)!.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import {
  isPlayableChannel,
  resolveGrid,
  resolveVisibleChannels,
  type VideoChannel,
  type VideoLayout,
} from './videoPlayer';

const props = defineProps<{
  w: number;
  h: number;
  layout: VideoLayout;
  channels: VideoChannel[];
  autoPlay: boolean;
  muted: boolean;
  objectFit: 'contain' | 'cover' | 'fill';
  showChannelName: boolean;
  nameColor: string;
  nameFontSize: number;
  nameBackgroundColor: string;
  backgroundColor: string;
  gap: number;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}>();

const grid = computed(() => resolveGrid(props.layout));
const visibleChannels = computed(() => resolveVisibleChannels(props.channels, props.layout));

function channelAt(index: number): VideoChannel | undefined {
  return visibleChannels.value[index];
}

function isSlotPlayable(index: number): boolean {
  const channel = channelAt(index);
  return !!channel && isPlayableChannel(channel);
}

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  display: 'grid',
  gridTemplateColumns: `repeat(${grid.value.columns}, 1fr)`,
  gridTemplateRows: `repeat(${grid.value.rows}, 1fr)`,
  gap: `${props.gap}px`,
  backgroundColor: props.backgroundColor,
  boxSizing: 'border-box' as const,
  border: `${props.borderWidth}px ${props.borderStyle} ${props.borderColor === '#00000000' ? 'transparent' : props.borderColor}`,
  borderRadius: `${props.borderRadius}px`,
  boxShadow:
    props.shadowColor && props.shadowColor !== '#00000000'
      ? `${props.shadowOffsetX}px ${props.shadowOffsetY}px ${props.shadowBlur}px ${props.shadowColor}`
      : 'none',
  overflow: 'hidden',
}));

const nameStyle = computed(() => ({
  position: 'absolute' as const,
  left: '4px',
  bottom: '4px',
  color: props.nameColor,
  fontSize: `${props.nameFontSize}px`,
  backgroundColor: props.nameBackgroundColor,
  padding: '2px 6px',
  borderRadius: '2px',
}));
</script>

<style scoped>
.hikvision-video-graphic {
  font-family: Arial, sans-serif;
}

.video-slot {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  overflow: hidden;
}

.video-slot-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}
</style>
