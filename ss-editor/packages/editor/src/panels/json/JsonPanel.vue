<template>
  <div class="json-panel">
    <JsonEditor
      v-model="jsonContent"
      :compact="compact"
      @refresh="refreshJson"
      @apply="apply"
      @format="format"
      @copy="copyJson"
      @export="handleExport"
      @import="handleImport"
      @generate-test-graphics="handleGenerateTestGraphics"
    />
  </div>
</template>

<script setup lang="ts">
import { useJsonEditor } from '../../composables/useJsonEditor'
import JsonEditor from '../../common/JsonEditor.vue'
import { GraphicGenerator } from '@scada-editor/core'
import { usePageStore } from '@scada-editor/core'

interface Props {
  compact?: boolean;
}

const _props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const {
  jsonContent,
  refreshJson,
  applyJson,
  formatJson,
  copyJson,
  exportJson,
  validateJson,
} = useJsonEditor()

// 应用更改
const apply = () => {
  if (validateJson(jsonContent.value)) {
    applyJson(jsonContent.value)
  }
}

// 格式化
const format = () => {
  jsonContent.value = formatJson(jsonContent.value)
}

// 导出
const handleExport = () => {
  exportJson(jsonContent.value)
}

// 导入 - JsonEditor 组件已经处理了文件选择和内容更新，
// 这里我们只需要在内容更新后应用更改
const handleImport = () => {
  // JsonEditor 组件会处理文件选择，然后通过 v-model 更新 jsonContent
  // 当 jsonContent 更新后，我们可以考虑直接应用，但为了安全，
  // 让用户手动点击应用按钮
}

// 生成测试图元 - 1000个button
const handleGenerateTestGraphics = () => {
  const generator = new GraphicGenerator()
  
  // 使用网格布局生成1000个button
  const result = generator.generate({
    type: 'button',
    count: 1000,
    layoutMode: 'grid',
    startX: 50,
    startY: 50,
    areaWidth: 3000,
    areaHeight: 2000,
    cols: 50,
    fixedWidth: 40,
    fixedHeight: 30,
    gapX: 5,
    gapY: 5,
    randomColors: true,
  })
  
  // 获取当前页面并添加图元
  const pageStore = usePageStore()
  const currentPage = pageStore.currentPage
  
  if (currentPage) {
    result.graphics.forEach(g => {
      currentPage.addGraphic(g)
    })
    
  } else {
    console.error('❌ 没有找到当前页面')
  }
}
</script>

<style scoped>
@import '../styles/property-panel.scss';

.json-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  background-color: var(--surface);
  min-height: 0; /* 防止flex子元素溢出 */
  overflow: hidden;
}

.json-panel:not(.compact) {
  border-left: 0;
}
</style>
