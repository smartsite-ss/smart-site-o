<template>
  <div
    class="ss-loading"
    :class="[`ss-loading--${size}`]"
  >
    <div class="ss-loading__container">
      <!-- 加载文字 -->
      <div
        v-if="text"
        class="ss-loading__text"
      >
        <span class="ss-loading__text-content">{{ text }}</span>
        <span class="ss-loading__dots">
          <span class="ss-loading__dot">.</span>
          <span class="ss-loading__dot">.</span>
          <span class="ss-loading__dot">.</span>
        </span>
      </div>

      <!-- 动画区域：光晕 + 双环 + SS 标识 -->
      <div class="ss-loading__animation">
        <div class="ss-loading__glow" />

        <!-- 外环（反向旋转 + 虚线） -->
        <div class="ss-loading__ring ss-loading__ring--outer">
          <svg
            class="ss-loading__ring-svg"
            viewBox="0 0 100 100"
          >
            <circle
              class="ss-loading__ring-arc-outer"
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-dasharray="8 20"
            />
          </svg>
        </div>

        <!-- 主旋转光环 -->
        <div class="ss-loading__ring ss-loading__ring--main">
          <svg
            class="ss-loading__ring-svg"
            viewBox="0 0 100 100"
          >
            <circle
              class="ss-loading__ring-track"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke-width="2.5"
            />
            <circle
              class="ss-loading__ring-arc"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <!-- SS 标识 -->
        <div class="ss-loading__logo">
          <div class="ss-loading__logo-bg" />
          <span class="ss-loading__logo-text">SS</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  /** 加载提示文字 */
  text: {
    type: String,
    default: '',
  },
  /** 尺寸：small | medium | large */
  size: {
    type: String as () => 'small' | 'medium' | 'large',
    default: 'medium',
  },
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   SsLoading — 美化版加载动画
   ═══════════════════════════════════════════════ */

.ss-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.ss-loading__container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* ── 尺寸变体 ── */
.ss-loading--small .ss-loading__ring {
  width: 52px;
  height: 52px;
}
.ss-loading--small .ss-loading__glow {
  width: 64px;
  height: 64px;
}
.ss-loading--small .ss-loading__logo-bg {
  width: 28px;
  height: 28px;
}
.ss-loading--small .ss-loading__logo-text {
  font-size: 16px;
}
.ss-loading--small .ss-loading__animation {
  width: 64px;
  height: 64px;
}
.ss-loading--small .ss-loading__text {
  font-size: 12px;
  margin-bottom: 10px;
}

.ss-loading--medium .ss-loading__ring {
  width: 88px;
  height: 88px;
}
.ss-loading--medium .ss-loading__glow {
  width: 108px;
  height: 108px;
}
.ss-loading--medium .ss-loading__logo-bg {
  width: 44px;
  height: 44px;
}
.ss-loading--medium .ss-loading__logo-text {
  font-size: 26px;
}
.ss-loading--medium .ss-loading__animation {
  width: 108px;
  height: 108px;
}
.ss-loading--medium .ss-loading__text {
  font-size: 14px;
  margin-bottom: 12px;
}

.ss-loading--large .ss-loading__ring {
  width: 132px;
  height: 132px;
}
.ss-loading--large .ss-loading__glow {
  width: 160px;
  height: 160px;
}
.ss-loading--large .ss-loading__logo-bg {
  width: 64px;
  height: 64px;
}
.ss-loading--large .ss-loading__logo-text {
  font-size: 38px;
}
.ss-loading--large .ss-loading__animation {
  width: 160px;
  height: 160px;
}
.ss-loading--large .ss-loading__text {
  font-size: 16px;
  margin-bottom: 16px;
}

/* ── 动画区域 ── */
.ss-loading__animation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── 光晕背景 ── */
.ss-loading__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(59, 130, 246, 0.12) 0%,
    rgba(96, 165, 250, 0.06) 40%,
    transparent 70%
  );
  animation: ss-glow-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ss-glow-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
}

/* ── 旋转光环 ── */
.ss-loading__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.ss-loading__ring-svg {
  width: 100%;
  height: 100%;
}

/* ── 外环（反向旋转虚线） ── */
.ss-loading__ring--outer {
  animation: ss-ring-rotate-outer 8s linear infinite;
}

.ss-loading__ring-arc-outer {
  stroke: var(--ss-loading-accent, #60a5fa);
  opacity: 0.35;
}

@keyframes ss-ring-rotate-outer {
  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}

/* ── 主环 ── */
.ss-loading__ring--main {
  animation: ss-ring-rotate 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.ss-loading__ring-track {
  stroke: var(--ss-loading-track, rgba(59, 130, 246, 0.1));
}

.ss-loading__ring-arc {
  stroke: url(#ss-ring-gradient) var(--ss-loading-primary, #3b82f6);
  stroke-dasharray: 180;
  stroke-dashoffset: 40;
  animation: ss-ring-dash 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
}

@keyframes ss-ring-rotate {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes ss-ring-dash {
  0% {
    stroke-dasharray: 1, 250;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 170, 250;
    stroke-dashoffset: -30;
  }
  100% {
    stroke-dasharray: 170, 250;
    stroke-dashoffset: -250;
  }
}

/* ── SS 标识 ── */
.ss-loading__logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.ss-loading__logo-bg {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.12) 0%,
    rgba(96, 165, 250, 0.06) 100%
  );
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 2px 8px rgba(59, 130, 246, 0.1);
}

.ss-loading__logo-text {
  position: relative;
  z-index: 1;
  font-weight: 900;
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: -1.5px;
  background: linear-gradient(
    160deg,
    var(--ss-loading-primary, #3b82f6) 0%,
    var(--ss-loading-accent, #60a5fa) 40%,
    #93c5fd 70%,
    var(--ss-loading-primary, #3b82f6) 100%
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ss-logo-pulse 3s ease-in-out infinite;
}

@keyframes ss-logo-pulse {
  0%, 100% {
    opacity: 0.8;
    background-position: 0% 50%;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    background-position: 100% 50%;
    transform: scale(1.05);
  }
}

/* ── 加载文字 ── */
.ss-loading__text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  color: var(--text-secondary, #94a3b8);
  font-weight: 400;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.ss-loading__text-content {
  line-height: 1;
}

.ss-loading__dots {
  display: inline-flex;
  width: 1.5em;
  overflow: hidden;
}

.ss-loading__dot {
  animation: ss-dot-blink 1.4s infinite both;
  font-weight: 700;
  color: var(--ss-loading-primary, #3b82f6);
}

.ss-loading__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.ss-loading__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ss-dot-blink {
  0%, 80%, 100% {
    opacity: 0;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>