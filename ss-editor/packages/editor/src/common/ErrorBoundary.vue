<template>
  <div
    v-if="hasError"
    class="error-boundary"
  >
    <div class="error-content">
      <div class="error-icon">
        ⚠️
      </div>
      <h3>{{ t('errors.errorBoundaryTitle') }}</h3>
      <p class="error-message">
        {{ errorMessage }}
      </p>
      <div class="error-actions">
        <button
          class="btn btn-primary"
          @click="reset"
        >
          {{ t('errors.errorBoundaryReset') }}
        </button>
        <button
          class="btn btn-secondary"
          @click="showDetailsFlag = !showDetailsFlag"
        >
          {{ showDetailsFlag ? t('errors.errorBoundaryHideDetails') : t('errors.errorBoundaryDetails') }}
        </button>
      </div>
      <div
        v-if="showDetailsFlag"
        class="error-details"
      >
        <pre>{{ errorStack }}</pre>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { errorService, i18n } from '@scada-editor/core';

const { t } = i18n.global;

const hasError = ref(false);
const errorMessage = ref('');
const errorStack = ref('');
const showDetailsFlag = ref(false);

onErrorCaptured((error) => {
  const details = errorService.record(error, 'Component Error Boundary');
  errorMessage.value = errorService.getFriendlyMessage(details);
  errorStack.value = details.stack || '';
  hasError.value = true;
  return false;
});

const reset = () => {
  hasError.value = false;
  showDetailsFlag.value = false;
  errorMessage.value = '';
  errorStack.value = '';
};
</script>

<style scoped lang="scss">
.error-boundary {
  padding: 24px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.error-icon {
  font-size: 48px;
}

.error-message {
  color: #856404;
  font-size: 16px;
  margin: 0;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &.btn-primary {
    background: #ffc107;
    color: #212529;
    border-color: #ffc107;

    &:hover {
      background: #e0a800;
    }
  }

  &.btn-secondary {
    background: transparent;
    color: #6c757d;
    border-color: #6c757d;

    &:hover {
      background: #6c757d;
      color: white;
    }
  }
}

.error-details {
  margin-top: 16px;
  text-align: left;
  width: 100%;
  max-height: 300px;
  overflow: auto;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 12px;
    color: #666;
  }
}
</style>
