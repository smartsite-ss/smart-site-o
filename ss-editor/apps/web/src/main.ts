// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { i18n, themeManager, BindingManager, useGraphicStore, ScadaDataManager, SqlQueryDriver } from '@scada-editor/core';
import '@scada-editor/core/canvas-page/theme/styles/theme.css';
import '@scada-editor/system/theme/system.css';
import App from './App.vue';
import router from './router';

import { registerBundledPlugins, registerDirectoryPlugins, markPluginsReady } from './plugins';


import { setDebugSkipAuth, useWsStore, useAuthStore, vPermission, WebSocketDriver } from '@scada-editor/system';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
// core 导出的 i18n 为规避 TS2589 收窄了类型（见 locales 门面），运行时仍是真实 vue-i18n 实例
app.use(i18n as unknown as Parameters<typeof app.use>[0]);
app.directive('permission', vPermission);

// ── 数据源统一调度：注册驱动工厂到 DataSourceManager ──
// tag/websocket → WebSocketDriver；sql → SqlQueryDriver；api/polling/static/expression 已由 DriverRegistry 内置注册
ScadaDataManager.init({
  tag: () => new WebSocketDriver(),
  websocket: () => new WebSocketDriver(),
  sql: () => new SqlQueryDriver(),
});

// ── 数据源统一调度：BindingManager 接入 EventBus ──
BindingManager.setEventBus(ScadaDataManager.eventBus);

// 注入标签订阅处理器，解耦 core 与 system 的循环依赖
const wsStore = useWsStore();
BindingManager.setTagHandler({
  subscribeTags: (tagIds: string[]) => wsStore.subscribeTags(tagIds),
  unsubscribeTags: (tagIds: string[]) => wsStore.unsubscribeTags(tagIds),
});

// 注入 GraphicStore 访问器，解耦 BindingManager 与 graphic.store 的循环依赖
const graphicStore = useGraphicStore();
BindingManager.setGraphicStore({
  applyProperty: (graphicId: string, propertyPath: string, value: any) =>
    graphicStore.applyProperty(graphicId, propertyPath, value),
  applyQualityIndicator: (graphicId: string, quality: string) =>
    graphicStore.applyQualityIndicator(graphicId, quality),
  bindData: (graphicId: string, dataSource: string, dataField: string) =>
    graphicStore.bindData(graphicId, dataSource, dataField),
  unbindData: (graphicId: string) =>
    graphicStore.unbindData(graphicId),
  getGraphicInstance: (graphicId: string) => {
    const graphic = graphicStore.getGraphicById(graphicId) as any;
    if (graphic && typeof graphic.onDataInput === 'function') {
      return graphic;
    }
    return undefined;
  },
});

registerBundledPlugins(app, i18n);

// Lazy load directory plugins only when navigating to editor or preview routes,
// avoiding 99+ unnecessary network requests on /login and /system pages.
// The auth guard (registered in router/index.ts) runs first and may redirect to
// /login if unauthenticated — this guard only executes after auth passes.
let dirPluginsLoaded = false;
router.beforeEach(async (to, _from, next) => {
  if (!dirPluginsLoaded && (to.path.startsWith('/editor') || to.name === 'preview')) {
    dirPluginsLoaded = true;
    const preloadCategories = import.meta.env.VITE_PLUGIN_PRELOAD_CATEGORIES?.split(',').filter(Boolean) || [];
    if (preloadCategories.length > 0) {
      try {
        await registerDirectoryPlugins(app, i18n, preloadCategories);
        markPluginsReady();
      } catch (err) {
        console.error('❌ Directory plugin load failed:', err);
        markPluginsReady();
      }
    } else {
      markPluginsReady();
    }
  }
  next();
});

// 调试模式：仅在 VITE_DEBUG_SKIP_AUTH=true 时跳过认证
// ⚠️  debug-mock-token 仅在后端 NODE_ENV !== 'production' 时被识别（参见 jwt-auth.guard.ts isDevMode()）
//     生产构建绝不可使 VITE_DEBUG_SKIP_AUTH 为 true，否则前端跳过登录但后端拒绝 mock token → 所有 API 401
//     开发模式下此环境变量定义在 .env.development（--mode development 加载）
const debugSkipAuth = import.meta.env.VITE_DEBUG_SKIP_AUTH === 'true';
if (debugSkipAuth) {
  setDebugSkipAuth(true);

  // S-C03: debug 模式下 token 仅存内存（与 HttpOnly Cookie 模式保持一致）
  // 不再写入 localStorage，避免 XSS 风险与状态不一致
  // initDebugSession 内部会调用 setToken(debugToken) 写入内存，并填充 user 使菜单过滤生效
  const authStore = useAuthStore();
  authStore.initDebugSession();
}

// 使用 Editor 路由
app.use(router);

// 确保主题被应用到 DOM
themeManager.applyThemeToDOM();

app.mount('#app');
