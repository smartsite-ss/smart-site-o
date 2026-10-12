<template>
  <div class="preview-wrapper">
    <iframe
      v-if="iframeSrc"
      :key="iframeSrc"
      :src="iframeSrc"
      class="preview-iframe"
      frameborder="0"
      allowfullscreen
    />
    <div
      v-else
      class="preview-error"
    >
      {{ t('system.pageManagement.noPreviewParams') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@scada-editor/core';

const route = useRoute();
const { t } = useI18n();

const iframeSrc = ref('');

function buildPreviewUrl(projectId: string, pageName: string, group?: string): string {
  const q = new URLSearchParams({ projectId, pageName });
  if (group) q.set('group', group);
  return `/preview?${q.toString()}`;
}

// 监听 route.fullPath（含 query）：仅在有参数时更新 iframeSrc
// 切换 tab 时 query 丢失 → 不更新 iframeSrc → keep-alive 下 iframe 内容保持
watch(() => route.fullPath, () => {
  const pageName = decodeURIComponent((route.params as Record<string, string>).pageName || '');
  const { projectId, group } = route.query as Record<string, string | undefined>;
  if (projectId && pageName) {
    iframeSrc.value = buildPreviewUrl(projectId, pageName, group);
  }
  // query 缺失时不操作，保留上次的 iframeSrc
}, { immediate: true });
</script>

<style scoped>
.preview-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
