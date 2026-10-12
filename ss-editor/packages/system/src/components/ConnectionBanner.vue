<template>
  <Transition name="banner-slide">
    <div
      v-if="connectionStore.status !== 'online'"
      class="connection-banner"
      :class="`connection-banner--${connectionStore.status}`"
    >
      <span class="connection-banner-icon">{{ connectionStore.isOffline ? '⚠' : '⟳' }}</span>
      <span class="connection-banner-text">
        {{ connectionStore.isOffline ? $t('connection.offline') : $t('connection.recovering') }}
        <span
          v-if="connectionStore.hasPending"
          class="connection-banner-pending"
        >({{ connectionStore.pendingRequests }})</span>
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useConnectionStore } from '../stores/connection.store';

const connectionStore = useConnectionStore();
</script>

<style scoped>
.connection-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  z-index: 999;
}

.connection-banner--offline {
  background: var(--danger, #e74c3c);
  color: var(--text-inverse, #fff);
}

.connection-banner--recovering {
  background: var(--warning, #f39c12);
  color: var(--text-inverse, #fff);
}

.connection-banner-icon {
  font-size: 14px;
}

.connection-banner-pending {
  opacity: 0.8;
  font-weight: 400;
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s ease;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
