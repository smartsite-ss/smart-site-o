<template>
  <div class="preview-view">
    <!-- 错误/加载状态 UI -->
    <div
      v-if="!isReady && !hasError"
      class="preview-loading"
    >
      <SsLoading :text="t('editor.loadingPreview')" />
    </div>

    <div
      v-else-if="hasError"
      class="preview-error"
    >
      <div class="error-icon">
        ⚠️
      </div>
      <div class="error-title">
        {{ errorTitle }}
      </div>
      <div class="error-message">
        {{ errorMessage }}
      </div>
      <div
        v-if="errorHint"
        class="error-hint"
      >
        {{ errorHint }}
      </div>
      <button
        class="back-button"
        @click="goBack"
      >
        {{ t('editor.backToEditor') }}
      </button>
    </div>

    <!-- 正常预览 UI -->
    <PreviewCanvas
      v-else
      :width="previewWidth"
      :height="previewHeight"
      :show-controls="false"
      :carousel-config="carouselConfig"
      @carousel-config-changed="handleCarouselConfigChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { PreviewCanvas } from '@scada-editor/editor';
import {
  usePageStore,
  BasePage,
  KeyboardContext,
  keyboardService,
  loadAllPagesData,
  validatePageData,
  i18n,
  DEFAULT_CAROUSEL_CONFIG,
  type CarouselConfig,
  ScadaDataManager,
  BindingManager,
} from '@scada-editor/core';
import { pageApi, projectApi, usePageDataSourceStore } from '@scada-editor/system';
import { SsLoading } from '@scada-editor/shared';
import { pluginReady } from '../plugins';
import { useDataSourceLifecycle } from '../composables/useDataSourceLifecycle';

// 经 unknown 断言窄化 t 签名：解构 i18n.global 会触发 vue-i18n messages 字面量 schema 深度类型实例化（TS2589）
const t = (key: string): string =>
  (i18n.global as unknown as { t: (key: string) => string }).t(key);
const route = useRoute();

const pageStore = usePageStore();

// 预览尺寸 - 占满整个窗口
const previewWidth = ref(window.innerWidth);
const previewHeight = ref(window.innerHeight);

// 状态管理
const isReady = ref(false);
const hasError = ref(false);
const errorTitle = ref('');
const errorMessage = ref('');
const errorHint = ref('');

// 轮播配置（从项目 projectinfo.json 加载）
const carouselConfig = ref<CarouselConfig>({ ...DEFAULT_CAROUSEL_CONFIG });

// 显示错误
const showError = (title: string, message: string, hint?: string) => {
  hasError.value = true;
  isReady.value = false;
  errorTitle.value = title;
  errorMessage.value = message;
  errorHint.value = hint || '';
};

// 返回编辑器
const goBack = () => {
  window.close();
  // 如果无法关闭（不是通过 window.open 打开的），尝试返回历史记录
  if (window.history.length > 1) {
    window.history.back();
  }
};

// 窗口大小改变处理
const handleResize = () => {
  previewWidth.value = window.innerWidth;
  previewHeight.value = window.innerHeight;
};

// 从 IndexedDB 恢复所有页面数据，供 PageBrowser 等图元在预览中使用
const restoreAllPages = async () => {
  try {
    const allPages = await loadAllPagesData();
    if (!allPages || allPages.length === 0) return;

    const restoredPages = allPages.map((item: any) => {
      const page = new BasePage();
      page.init({
        id: item.data?.id || 'preview-page',
        name: item.data?.name || item.name || 'Preview Page',
        width: item.data?.width || 1920,
        height: item.data?.height || 1080,
        backgroundColor: item.data?.backgroundColor || '#FFFFFF',
      });
      page.fromJSON(item.data);
      return page;
    });

    if (restoredPages.length > 0) {
      // 保留当前页面（从后端加载的主页面），其他页面（供 PageBrowser 使用）合并进来
      const currentPage = pageStore.currentPage;
      const mergedPages = [currentPage, ...restoredPages.filter(p => p.id !== currentPage?.id)].filter(Boolean) as NonNullable<typeof currentPage>[];
      pageStore.pages = mergedPages;
    }
  } catch (e) {
    console.warn('[PreviewView] Failed to restore all pages:', e);
  }
};

// 模板模式专用：从 IndexedDB 恢复页面数据
const restoreFromIndexedDB = async (pageName?: string) => {
  try {
    const allPages = await loadAllPagesData();
    if (!allPages || allPages.length === 0) {
      showError(
        t('preview.cannotLoadPreview'),
        t('preview.dataNotFound'),
        t('preview.previewHint')
      );
      return;
    }

    // 查找匹配的页面，或使用第一个
    const matchedPage = pageName
      ? allPages.find((p: any) => (p.data?.name || p.name) === pageName)
      : allPages[0];
    const pageData = matchedPage?.data || allPages[0]?.data;

    if (!pageData) {
      showError(
        t('preview.cannotLoadPreview'),
        t('preview.dataNotFound'),
        t('preview.previewHint')
      );
      return;
    }

    const tempPage = new BasePage();
    tempPage.init({
      id: pageData.id || 'preview-page',
      name: pageData.name || 'Preview Page',
      width: pageData.width || window.innerWidth,
      height: pageData.height || window.innerHeight,
      backgroundColor: pageData.backgroundColor || '#FFFFFF',
    });
    tempPage.fromJSON(pageData);

    // 恢复所有页面到 store
    const restoredPages = allPages.map((item: any) => {
      const page = new BasePage();
      page.init({
        id: item.data?.id || item.name || 'preview-page',
        name: item.data?.name || item.name || 'Preview Page',
        width: item.data?.width || 1920,
        height: item.data?.height || 1080,
        backgroundColor: item.data?.backgroundColor || '#FFFFFF',
      });
      page.fromJSON(item.data);
      return page;
    });

    pageStore.pages = restoredPages;
    pageStore.currentPageId = tempPage.id;

    // ── 数据源统一调度：模板模式下无 projectId，使用临时 ID ──
    await initDataSourceManager(tempPage, 'template-mode');

    nextTick(() => {
      isReady.value = true;
      hasError.value = false;
    });
  } catch (error) {
    console.error('[PreviewView] Failed to load from IndexedDB:', error);
    showError(
      t('preview.cannotLoadPreview'),
      t('preview.dataNotFound'),
      t('preview.previewHint')
    );
  }
};

// 从后端 API 或 IndexedDB 加载页面数据
const restorePageFromStorage = async () => {
  const mode = route.query.mode as string | undefined;
  const projectId = route.query.projectId as string | undefined;
  const pageName = route.query.pageName as string | undefined;
  const groupName = route.query.group as string | undefined;

  // 一次性票据鉴权桥（06 方案路线 B #2）：移动端（uni-app H5/App）以 Bearer 会话
  // 签发票据经 URL 传入，本壳先兑换为 Bearer Token（存内存），再加载需鉴权的页面数据。
  // 兑换失败不阻断：若本壳已有 Bearer 会话（如浏览器直开），仍可正常加载。
  const previewTicket = route.query.ticket as string | undefined;
  if (previewTicket) {
    await exchangePreviewTicket(previewTicket);
  }

  // 模板模式：直接从 IndexedDB 加载，不依赖后端项目 API
  if (mode === 'template') {
    await restoreFromIndexedDB(pageName);
    return;
  }

  if (!projectId || !pageName) {
    showError(
      t('preview.cannotLoadPreview'),
      t('preview.dataNotFound'),
      t('preview.previewHint')
    );
    return;
  }

  try {
    const response = await pageApi.readPage(projectId, pageName, groupName);
    // 后端响应可能有多层包装：
    //   无拦截器: { success: true, data: pageJSON }
    //   有拦截器: { data: { success: true, data: pageJSON }, message, timestamp }
    const pageResult = (response as any)?.data || (response as any);
    const pageData = pageResult?.data;

    if (!pageData) {
      showError(
        t('preview.cannotLoadPreview'),
        t('preview.dataNotFound'),
        t('preview.previewHint')
      );
      return;
    }

    const validation = validatePageData(pageData);
    if (!validation.valid) {
      showError(
        t('preview.dataValidationFailed'),
        validation.message || t('preview.dataFormatInvalid'),
        t('preview.regenerateHint')
      );
      return;
    }

    const tempPage = new BasePage();
    tempPage.init({
      id: pageData.id || 'preview-page',
      name: pageData.name || 'Preview Page',
      width: pageData.width || window.innerWidth,
      height: pageData.height || window.innerHeight,
      backgroundColor: pageData.backgroundColor || '#FFFFFF',
    });

    tempPage.fromJSON(pageData);
    // 设置 projectId，解决 PreviewCanvas 中背景图片相对路径（如 bg.png）
    // 需解析为 /api/v1/projects/{projectId}/pages/{pageName}/bg.png 的场景
    (tempPage as any).projectId = projectId;

    // 先设置当前页面
    pageStore.pages = [tempPage];
    pageStore.currentPageId = tempPage.id;

    // 从 IndexedDB 恢复所有页面数据，供 PageBrowser 等图元使用
    await restoreAllPages();

    // ── 数据源统一调度：初始化 DataSourceManager ──
    // 必须传 tempPage（BasePage 实例，含 getGraphicById），不能传原始 JSON pageData
    // 否则 BindingManager 注册时 getGraphicById 返回 undefined，绑定全部被跳过
    await initDataSourceManager(tempPage, projectId);

    // 从项目 projectinfo.json 加载轮播配置
    await loadCarouselConfig(projectId);

    nextTick(() => {
      isReady.value = true;
      hasError.value = false;
    });

  } catch (error) {
    console.error('[PreviewView] Failed to load page from backend:', error);
    showError(
      t('preview.cannotLoadPreview'),
      t('preview.dataNotFound'),
      t('preview.previewHint')
    );
  }
};

/**
 * 数据源统一调度：通过 ScadaDataManager.initPage 启动 DataSourceManager，
 * 由其内部的 WebSocketDriver / HttpPollingDriver / SqlQueryDriver 等接管所有数据源的生命周期。
 *
 * 数据流：ws/api/sql driver → DataSourceManager._onDataReceived → EventBus.emit('tagValueChanged')
 *        → BindingManager.handleDataUpdate → 图元属性更新。
 *
 * wsStore.flushTagUpdates 检测到 WebSocketDriver 注册了 onFlushed 监听器后，
 * 不再直接 emit EventBus，避免双重触发。
 *
 * 实现已抽取至 useDataSourceLifecycle composable，供 PreviewView/EditorView 共享。
 */
const { initDataSourceLifecycle, destroyDataSourceLifecycle } = useDataSourceLifecycle();

const initDataSourceManager = async (pageData: any, projectId: string) => {
  await initDataSourceLifecycle(pageData, projectId, 'PreviewView');
};

/**
 * 从项目 projectinfo.json 加载轮播配置
 */
const loadCarouselConfig = async (projectId: string) => {
  try {
    const project = await projectApi.getById(projectId);
    const result = (project as any)?.data || project;
    const projectData = result?.data || result;
    if (projectData?.config?.carousel) {
      carouselConfig.value = {
        ...DEFAULT_CAROUSEL_CONFIG,
        ...projectData.config.carousel,
      };
    }
  } catch (err) {
    console.warn('[PreviewView] 加载轮播配置失败，使用默认配置:', err);
  }
};

/**
 * 持久化轮播配置到项目 projectinfo.json
 */
const handleCarouselConfigChanged = async (config: CarouselConfig) => {
  carouselConfig.value = { ...config };
  const projectId = route.query.projectId as string;
  if (!projectId) return;
  try {
    await projectApi.update(projectId, { config: { carousel: config } });
  } catch (err) {
    console.warn('[PreviewView] 保存轮播配置失败:', err);
  }
};

/**
 * 兑换一次性预览票据为 Bearer 会话凭证（后端 POST /auth/preview-ticket-exchange）。
 *
 * 鉴权模式：Bearer Token（响应体返回）。壳内 axios 拦截器会从内存读取 token 注入
 * `Authorization` 头，JwtStrategy 已支持从该头取 token。
 *
 * 历史背景：原本设置 HttpOnly Cookie（SameSite=Strict），仅适用于「壳与 H5 同源部署」。
 * 现 H5 iframe 改为直连远程 8080 壳（跨源），浏览器视为第三方 Cookie 拦截 → 401。
 * 改 Bearer 后跨源可用，token 存内存（与 client.ts S-C03 一致）。
 *
 * 成功后从地址栏移除 ticket 参数（票据已一次性消费，留在 URL 中只会误导刷新重试，且有泄露风险）。
 */
const exchangePreviewTicket = async (previewTicket: string) => {
  try {
    const response = await fetch('/api/v1/auth/preview-ticket-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewTicket }),
    });
    if (!response.ok) {
      console.warn('[PreviewView] 预览票据兑换失败，回退既有会话:', response.status);
      return;
    }
    const data = await response.json();
    // 后端经全局 TransformInterceptor 包装为 { code, data: { accessToken, refreshToken }, message }
    const tokenPair = data?.data ?? data;
    if (tokenPair?.accessToken && tokenPair?.refreshToken) {
      const { setToken, setRefreshToken } = await import('@scada-editor/system');
      setToken(tokenPair.accessToken);
      setRefreshToken(tokenPair.refreshToken);
    }
  } catch (error) {
    console.warn('[PreviewView] 预览票据兑换请求异常，回退既有会话:', error);
  } finally {
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete('ticket');
    window.history.replaceState(null, '', cleanedUrl.toString());
  }
};

onMounted(async () => {
  await pluginReady;

  setTimeout(async () => {
    await restorePageFromStorage();
  }, 100);

  keyboardService.startListening();
  keyboardService.setContext(KeyboardContext.PREVIEW);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // ── 数据源统一调度：清理 DataSourceManager ──
  destroyDataSourceLifecycle();

  // 停止监听键盘事件
  keyboardService.stopListening();
  // 清除预览相关的按键绑定
  keyboardService.unregisterContext(KeyboardContext.PREVIEW);
  // 恢复键盘上下文为全局模式
  keyboardService.setContext(KeyboardContext.GLOBAL);
  // 移除监听
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.preview-view {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background-color: var(--background, #1a1a1a);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加载状态 */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 错误状态 */
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-primary, #e2e8f0);
  text-align: center;
  max-width: 400px;
  padding: 24px;
}

.error-icon {
  font-size: 48px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--danger, #ef4444);
}

.error-message {
  font-size: 14px;
  opacity: 0.9;
}

.error-hint {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 8px;
}

.back-button {
  margin-top: 16px;
  padding: 10px 24px;
  background-color: var(--primary, #3b82f6);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: var(--primary-dark, #2563eb);
}

/* Canvas 样式 */
:deep(.preview-canvas-container) {
  border: none !important;
  border-radius: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

:deep(.preview-canvas-container .preview-controls) {
  display: none !important;
}

/* 保留 overflow:auto：fitWidth/fitHeight 扩展位图需原生滚动承接，强制 hidden 会裁剪内容 */
:deep(.preview-canvas-container .canvas-wrapper.no-controls) {
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
}
</style>
