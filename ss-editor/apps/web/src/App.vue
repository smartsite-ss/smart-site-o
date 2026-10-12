<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { themeManager } from '@scada-editor/core';

onMounted(() => {
  themeManager.applyThemeToDOM();
});
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--background);
  color: var(--text);
}

#app {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
