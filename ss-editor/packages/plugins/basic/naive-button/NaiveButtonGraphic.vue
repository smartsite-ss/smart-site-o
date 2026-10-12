<template>
  <button
    class="naive-button"
    :class="[
      `naive-button--${props.type}`,
      `naive-button--${props.size}`,
      { 'naive-button--round': props.round },
      { 'naive-button--circle': props.circle },
      { 'naive-button--disabled': props.disabled },
      { 'naive-button--loading': props.loading },
    ]"
    :disabled="props.disabled || props.loading"
    @click="handleClick"
  >
    <div
      v-if="props.loading"
      class="naive-button__loading"
    >
      <div class="naive-button__loading-spinner" />
    </div>
    <span
      v-else
      class="naive-button__text"
    >{{ props.text }}</span>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { showAlert } from '../../../../editor/src/utils/messageBox';

export default defineComponent({
  name: 'NaiveButtonGraphic',
  props: {
    graphic: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const buttonProps = computed(() => {
      if (
        props.graphic &&
        typeof props.graphic.getNaiveButtonProps === 'function'
      ) {
        return props.graphic.getNaiveButtonProps();
      }
      return {
        text: 'Naive Button',
        type: 'primary',
        size: 'medium',
        round: false,
        circle: false,
        disabled: false,
        loading: false,
      };
    });

    const handleClick = () => {
      const eventHandlers = props.graphic?.events?.eventHandlers;
      if (!eventHandlers) return;

      // eventHandlers 是 Record<eventId, eventObj>，需要遍历找出 eventType === 'click' 的事件
      for (const [_eventId, eventObj] of Object.entries(eventHandlers)) {
        const evt = eventObj as any;
        if (evt.eventType !== 'click') continue;
        if (!Array.isArray(evt.actions)) continue;

        // 执行每个动作
        for (const action of evt.actions) {
          executeAction(action);
        }
      }
    };

    const executeAction = (action: any) => {
      switch (action.actionType) {
        case 'api':
          break;
        case 'script':
          break;
        case 'customScript':
          if (action.script) {
            try {
              const fn = new Function('"use strict";' + action.script);
              fn();
            } catch (err: any) {
              console.error('[NaiveButton] 自定义脚本执行失败:', err.message);
            }
          }
          break;
        case 'show':
          if (action.target) {
            const targetEl = document.getElementById(action.target);
            if (targetEl) targetEl.style.display = 'block';
          }
          break;
        case 'hide':
          if (action.target) {
            const targetEl = document.getElementById(action.target);
            if (targetEl) targetEl.style.display = 'none';
          }
          break;
        case 'change':
          if (action.target && action.value) {
            const targetEl = document.getElementById(action.target);
            if (targetEl) {
              const prop = action.target.includes('.') ? action.target.split('.').pop() : action.target;
              (targetEl as any)[prop] = action.value;
            }
          }
          break;
        case 'navigate':
          if (action.target) {
            window.open(action.target, '_blank');
          }
          break;
        case 'alert':
          if (action.value) {
            showAlert(action.value);
          }
          break;
      }
    };

    return {
      props: buttonProps,
      handleClick,
    };
  },
});
</script>

<style scoped>
.naive-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.naive-button--primary {
  background-color: var(--primary);
  color: #ffffff;
}

.naive-button--success {
  background-color: var(--status-success);
  color: #ffffff;
}

.naive-button--warning {
  background-color: var(--status-warning);
  color: #ffffff;
}

.naive-button--error {
  background-color: var(--status-error);
  color: #ffffff;
}

.naive-button--info {
  background-color: var(--primary);
  color: #ffffff;
}

.naive-button--small {
  padding: 4px 12px;
  font-size: 12px;
  min-height: 28px;
}

.naive-button--medium {
  padding: 6px 16px;
  font-size: 14px;
  min-height: 36px;
}

.naive-button--large {
  padding: 8px 20px;
  font-size: 16px;
  min-height: 44px;
}

.naive-button--round {
  border-radius: 999px;
}

.naive-button--circle {
  border-radius: 50%;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
}

.naive-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.naive-button--loading {
  pointer-events: none;
}

.naive-button__loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.naive-button__text {
  white-space: nowrap;
}
</style>