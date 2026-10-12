// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ref, watch } from 'vue'
import { usePageStore, useGraphicStore } from '@scada-editor/core'

// 简单的 debounce 实现
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

export function useJsonEditor() {
  const pageStore = usePageStore()
  const graphicStore = useGraphicStore()

  // JSON 内容
  const jsonContent = ref('')
  // 是否有错误
  const hasError = ref(false)
  // 错误信息
  const errorMessage = ref('')

  // 生成 JSON 数据
  const generateJsonData = () => {
    const currentPage = pageStore.currentPage
    if (!currentPage) {
      return {
        version: '1.0',
        page: {
          id: '',
          name: '',
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        },
        graphics: [],
        timers: [],
        groups: [],
      }
    }

    // 直接使用 BasePage.toJSON() 获取完整数据
    const pageData = currentPage.toJSON()
    
    return {
      version: '1.0',
      page: {
        id: pageData.id,
        name: pageData.name,
        width: pageData.width,
        height: pageData.height,
        backgroundColor: pageData.backgroundColor,
        backgroundImage: pageData.backgroundImage || '',
        backgroundApplicationType: (currentPage as any).backgroundApplicationType || 'applicationColor',
        backgroundFitMode: (currentPage as any).backgroundFitMode || 'stretch',
      },
      graphics: pageData.graphics,
      timers: pageData.timers,
      groups: pageData.groups,
    }
  }

  // 刷新 JSON 内容
  const refreshJson = () => {
    try {
      const data = generateJsonData()
      jsonContent.value = JSON.stringify(data, null, 2)
      hasError.value = false
      errorMessage.value = ''
    } catch (error) {
      console.error('Failed to refresh JSON:', error)
      hasError.value = true
      errorMessage.value = 'Failed to generate JSON'
    }
  }

  // 应用 JSON 更改
  const applyJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString)

      const currentPage = pageStore.currentPage
      if (!currentPage) {
        hasError.value = true
        errorMessage.value = 'No current page found'
        return false
      }

      // 检测数据格式：支持两种格式
      // 1. JSON面板格式：{ version, page, graphics, timers, groups }
      // 2. 直接 toJSON 格式：{ id, name, graphics, groups, timers, ... }
      let pageData = data
      let graphicsData = data.graphics
      let timersData = data.timers
      let groupsData = data.groups

      // 如果是 JSON 面板格式，提取数据
      if (data.version && data.page) {
        pageData = data.page
        graphicsData = data.graphics
        timersData = data.timers
        groupsData = data.groups
      }

      if (!Array.isArray(graphicsData)) {
        hasError.value = true
        errorMessage.value = 'Invalid JSON format: graphics array is required'
        return false
      }

      // 保存历史记录
      (graphicStore as any).saveHistory?.()

      // 更新页面属性
      pageStore.updatePage(currentPage.id, {
        name: pageData.name,
        width: pageData.width,
        height: pageData.height,
        backgroundColor: pageData.backgroundColor,
        backgroundImage: pageData.backgroundImage,
      } as any)

      // 使用页面的 importGraphics 方法，它会正确重建管理器
      currentPage.importGraphics(graphicsData)

      // 导入 timers
      if (timersData && Array.isArray(timersData)) {
        const timerManager = (currentPage as any).timerManager
        if (timerManager && timerManager.fromJSON) {
          timerManager.fromJSON(timersData)
        }
      }

      // 导入 groups
      if (groupsData && Array.isArray(groupsData)) {
        const groupManager = (currentPage as any).getGroupManager?.()
        if (groupManager && groupManager.fromJSON) {
          groupManager.fromJSON(groupsData)
          // 确保更新引用
          const graphics =
            'value' in currentPage.graphics
              ? currentPage.graphics.value
              : currentPage.graphics
          const graphicMap = new Map((graphics as any[]).map((g: any) => [g.id, g]))
          groupManager.updateReferences?.(graphics, graphicMap)
        }
      }

      hasError.value = false
      errorMessage.value = ''
      return true
    } catch (error) {
      console.error('Failed to apply JSON:', error)
      hasError.value = true
      errorMessage.value = error instanceof Error ? error.message : 'Invalid JSON format'
      return false
    }
  }

  // 格式化 JSON
  const formatJson = (jsonString: string): string => {
    try {
      const data = JSON.parse(jsonString)
      return JSON.stringify(data, null, 2)
    } catch (error) {
      return jsonString
    }
  }

  // 验证 JSON
  const validateJson = (jsonString?: string): boolean => {
    try {
      const content = jsonString ?? jsonContent.value
      JSON.parse(content)
      hasError.value = false
      errorMessage.value = ''
      return true
    } catch (error) {
      hasError.value = true
      errorMessage.value = error instanceof Error ? error.message : 'Invalid JSON format'
      return false
    }
  }

  // 复制 JSON 到剪贴板（复制整个页面的原始 JSON 数据）
  const copyJson = async () => {
    try {
      const data = generateJsonData()
      const jsonString = JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(jsonString)
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  // 导出 JSON 文件
  const exportJson = (jsonString: string) => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const currentPage = pageStore.currentPage
      a.download = `${currentPage?.name || 'scada-page'}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export JSON:', error)
    }
  }

  // 导入 JSON 文件
  const importJson = () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const text = await file.text()
          jsonContent.value = text
          applyJson(text)
        }
      }
      input.click()
    } catch (error) {
      console.error('Failed to import JSON:', error)
    }
  }

  // 监听页面和图形变化，自动刷新 JSON（带 debounce）
  const debouncedRefresh = debounce(refreshJson, 300)

  // 监听 pageStore 变化来获取 currentPage 的变化
  watch(
    () => pageStore.currentPage,
    (newPage) => {
      if (newPage) {
        watch(
          [
            () => newPage.graphics,
            () => newPage.selectedGraphicIds,
            () => newPage.selectedGraphicId,
            () => newPage.backgroundColor,
            () => newPage.name,
            () => (newPage as any).timerManager,
            () => (newPage as any).getGroupManager?.().getAllGroups?.()
          ],
          () => {
            debouncedRefresh()
          },
          { deep: true }
        )
      }
    },
    { immediate: true }
  )

  // 初始化时刷新一次
  refreshJson()

  return {
    jsonContent,
    hasError,
    errorMessage,
    refreshJson,
    applyJson,
    formatJson,
    copyJson,
    exportJson,
    importJson,
    validateJson,
  }
}
