<template>
  <div
    v-if="visible"
    class="carousel-controls"
    @click.stop
  >
    <div class="carousel-controls-inner">
      <!-- 播放/暂停 -->
      <button
        class="ctrl-btn"
        :title="state.isRunning && !state.isPaused ? t('carousel.pause') : t('carousel.play')"
        @click="handleTogglePlay"
      >
        {{ state.isRunning && !state.isPaused ? '⏸' : '▶' }}
      </button>

      <!-- 上一页 -->
      <button
        class="ctrl-btn"
        :title="t('carousel.previous')"
        @click="$emit('previous')"
      >
        ◀
      </button>

      <!-- 指示器 -->
      <div class="carousel-dots">
        <span
          v-for="(page, index) in state.carouselPages"
          :key="page.id"
          class="carousel-dot"
          :class="{
            active: index === state.currentIndex,
            passed: index < state.currentIndex,
          }"
          :title="page.name"
          @click="$emit('goTo', index)"
        />
      </div>

      <!-- 下一页 -->
      <button
        class="ctrl-btn"
        :title="t('carousel.next')"
        @click="$emit('next')"
      >
        ▶
      </button>

      <!-- 位置信息 -->
      <span class="carousel-info">
        {{ t('carousel.pagePosition', { current: state.currentIndex + 1, total: state.carouselPages.length }) }}
      </span>

      <!-- 剩余时间 -->
      <span class="carousel-timer">
        {{ formatRemainingTime() }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { i18n, type CarouselState } from '@scada-editor/core';

const { t } = i18n.global;

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  state: {
    type: Object as () => CarouselState,
    required: true,
  },
  interval: {
    type: Number,
    default: 30000,
  },
});

const emit = defineEmits<{
  /** 播放（启动或继续） */
  play: [];
  /** 暂停 */
  pause: [];
  previous: [];
  next: [];
  goTo: [index: number];
}>();

function handleTogglePlay(): void {
  if (props.state.isRunning && !props.state.isPaused) {
    emit('pause');
  } else {
    emit('play');
  }
}

function formatRemainingTime(): string {
  const remaining = Math.max(0, props.interval - props.state.elapsedTime);
  const seconds = Math.ceil(remaining / 1000);
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  }
  return `${seconds}s`;
}
</script>

<style scoped>
.carousel-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding: 8px 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.35));
  transition: opacity 0.3s ease;
}

.carousel-controls-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: var(--surface, #18181c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 24px;
  box-shadow: var(--shadow-modal, 0 4px 20px rgba(0, 0, 0, 0.3));
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 50%;
  background: var(--elevated, rgba(255, 255, 255, 0.06));
  color: var(--text, #e0e0e0);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  line-height: 1;
}

.ctrl-btn:hover {
  background: var(--primary, #63e2b7);
  color: #000;
  border-color: var(--primary, #63e2b7);
}

.carousel-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border, rgba(255, 255, 255, 0.15));
  cursor: pointer;
  transition: all 0.2s;
}

.carousel-dot.active {
  background: var(--primary, #63e2b7);
  transform: scale(1.3);
}

.carousel-dot.passed {
  background: var(--text-secondary, #888);
}

.carousel-dot:hover {
  background: var(--text, #e0e0e0);
}

.carousel-info {
  color: var(--text-secondary, #999);
  font-size: 11px;
  padding: 0 8px;
  user-select: none;
  white-space: nowrap;
}

.carousel-timer {
  color: var(--text-secondary, #888);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  user-select: none;
  min-width: 40px;
  text-align: right;
}
</style>
