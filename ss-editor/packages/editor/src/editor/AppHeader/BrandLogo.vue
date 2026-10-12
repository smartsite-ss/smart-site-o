<template>
  <div class="brand-logo">
    <img
      :src="logoUrl"
      class="logo-icon"
      alt="SS"
    >
    <div class="system-name">
      SMART SCADA
    </div>
  </div>
</template>

<script setup lang="ts">
// 品牌/Logo区组件 — 使用纯图标 + 独立文字，避免全尺寸 logo 在小空间内不可读
import logoUrl from '../../assets/logo.svg';
</script>

<style scoped>
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.system-name {
  color: var(--header-text);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
}
</style>
