<template>
  <div class="video-player">
    <video
      v-if="kind === 'native'"
      ref="videoRef"
      class="video-player-el"
      :style="{ objectFit }"
      :src="playUrl"
      :muted="muted"
      :autoplay="autoPlay"
      playsinline
      controls
      @error="onError"
      @playing="onPlaying"
    ></video>
    <div v-else class="video-player-hint">{{ hintText }}</div>
    <div v-if="!playing && kind === 'native'" class="video-player-status">{{ statusText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { i18n } from '@scada-editor/core';
import { resolvePlayerKind, type VideoProtocol } from './videoPlayer';

const props = defineProps<{
  playUrl: string;
  protocol: VideoProtocol;
  muted: boolean;
  autoPlay: boolean;
  objectFit: 'contain' | 'cover' | 'fill';
}>();

const { t } = i18n.global;

const kind = computed(() => resolvePlayerKind(props.protocol));
const videoRef = ref<HTMLVideoElement | null>(null);
const playing = ref(false);
const errored = ref(false);

const statusText = computed(() => {
  if (errored.value) return t('hikvisionVideo.player.loadFailed');
  return t('hikvisionVideo.player.loading');
});

const hintText = computed(() => {
  if (kind.value === 'flv') return t('hikvisionVideo.player.needFlv');
  return t('hikvisionVideo.player.needWebrtc');
});

function onError() {
  errored.value = true;
}

function onPlaying() {
  playing.value = true;
  errored.value = false;
}
</script>

<style scoped>
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  overflow: hidden;
}

.video-player-el {
  width: 100%;
  height: 100%;
  display: block;
}

.video-player-status,
.video-player-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}

.video-player-status {
  pointer-events: none;
}
</style>
