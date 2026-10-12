<template>
  <div class="app-header">
    <!-- 品牌/Logo区 -->
    <BrandLogo />
    
    <!-- 主导航区 -->
    <MenuContainer
      @save="emit('save')"
      @open-project="emit('open-project')"
      @close-project="emit('close-project')"
      @export-project="emit('export-project')"
      @import-project="emit('import-project')"
    />
    
    <!-- 右侧区域 -->
    <div class="header-right">
      <!-- 全局工具区 -->
      <GlobalTools @open-settings="emit('open-settings')" />
      
      <!-- 用户信息区 -->
      <UserInfo />
    </div>
  </div>
</template>

<script setup lang="ts">
import BrandLogo from './BrandLogo.vue';
import MenuContainer from '../menu/MenuContainer.vue';
import GlobalTools from './GlobalTools.vue';
import UserInfo from './UserInfo.vue';

const emit = defineEmits<{
  (e: 'open-settings'): void;
  (e: 'save'): void;
  (e: 'open-project'): void;
  (e: 'close-project'): void;
  (e: 'export-project'): void;
  (e: 'import-project'): void;
}>();
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  background-color: var(--header-background);
  color: var(--header-text);
  box-shadow: var(--shadow-small);
  height: 60px;
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}
</style>
