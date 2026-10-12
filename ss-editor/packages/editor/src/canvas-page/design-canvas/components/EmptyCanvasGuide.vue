<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="empty-canvas-guide"
    >
      <div class="guide-content">
        <div class="guide-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              ry="2"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="16"
            />
            <line
              x1="8"
              y1="12"
              x2="16"
              y2="12"
            />
          </svg>
        </div>
        <h3 class="guide-title">
          {{ title }}
        </h3>
        <p class="guide-description">
          {{ description }}
        </p>
        <div class="guide-tips">
          <div class="tip-item">
            <span class="tip-icon">🖱️</span>
            <span class="tip-text">{{ tipDrag }}</span>
          </div>
          <div class="tip-item">
            <span class="tip-icon">⌨️</span>
            <span class="tip-text">{{ tipShortcut }}</span>
          </div>
          <div class="tip-item">
            <span class="tip-icon">📐</span>
            <span class="tip-text">{{ tipTools }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title?: string;
  description?: string;
  tipDrag?: string;
  tipShortcut?: string;
  tipTools?: string;
}>();
</script>

<style scoped>
.empty-canvas-guide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(26, 26, 26, 0.6);
  backdrop-filter: blur(4px);
  z-index: 5;
  pointer-events: none;
}

.guide-content {
  text-align: center;
  padding: 48px;
  max-width: 480px;
}

.guide-icon {
  margin-bottom: 24px;
  color: var(--primary, #4a90d9);
  opacity: 0.8;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

.guide-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
}

.guide-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.guide-tips {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.tip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.tip-item:hover {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}

.tip-icon {
  font-size: 28px;
}

.tip-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>