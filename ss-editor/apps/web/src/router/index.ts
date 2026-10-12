// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { isDebugSkipAuth, PermissionCodes } from '@scada-editor/system';

// CODE-13: EditorView/PreviewView 改为动态导入，避免编辑器代码（含 three.js 用法）
// 被打进主 bundle，使登录页首屏不再下载整个编辑器（主 index.js 从 3.3MB 显著瘦身）
const EditorView = () => import('../views/EditorView.vue').then((m) => m.default);
const PreviewView = () => import('../views/PreviewView.vue').then((m) => m.default);

type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

/**
 * 产品模式类型
 * - full:  集成部署（ss-scada + ss-data 全部能力）
 * - scada: ss-scada 独立部署（仅组态编辑/运行）
 * - data:  ss-data 独立部署（仅数据中台/系统管理）
 */
type ProductMode = 'full' | 'scada' | 'data';

/**
 * 校验并返回有效的产品模式
 * 避免 .env 中 VITE_PRODUCT_MODE 被设为非法字符串（如 'undefined'）
 * 导致两个路由分支均不执行，进而触发 "No match found" 告警
 */
function resolveProductMode(mode: unknown): ProductMode {
  if (mode === 'full' || mode === 'scada' || mode === 'data') {
    return mode;
  }
  return 'full';
}

/** 当前产品模式（构建时由 Vite 注入，默认 full 兼容现状） */
const PRODUCT_MODE: ProductMode = resolveProductMode(import.meta.env.VITE_PRODUCT_MODE);

// ──────── 路由分组（按产品模式动态组合） ────────

/** 共享路由（所有模式均加载）：登录页 */
const sharedRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    // CODE-15: 直接从 LoginView.vue 文件导入，绕过 @scada-editor/system barrel。
    // 原 import('@scada-editor/system').then(m => m.LoginView) 会因 barrel 导出 40+ 视图
    // 而将所有系统视图打进同一 chunk，导致登录页下载全量系统管理代码。
    // 直接文件导入后，仅 LoginView 及其静态依赖（可 tree-shake）进入登录页 chunk。
    component: () => import('@scada-editor/system/views/LoginView.vue').then((m: any) => m.default),
    meta: { guest: true },
  },
];

/** ss-scada 路由（full + scada 模式加载）：编辑器、预览 */
const scadaRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/system',
      },
      {
        path: 'editor',
        name: 'editor',
        component: EditorView,
      },
      {
        path: 'editor/:projectId',
        name: 'editor-project',
        component: EditorView,
      },
      {
        path: 'editor/template/:canvasTemplateId',
        name: 'editor-canvas-template',
        component: EditorView,
      },
      {
        path: 'test-config',
        name: 'test-config',
        component: () => import('@scada-editor/editor').then(m => m.ConfigTestPage),
      },
    ],
  },
  {
    path: '/preview',
    name: 'preview',
    component: PreviewView,
  },
  {
    // 方案B：H5 iframe 预览专用路由，复用同一 PreviewView。
    // 后端 buildPreviewUrl 生成 ${SCADA_SHELL_BASE_URL}/preview，故路径为 /mobile-preview/preview，
    // 与管理端 /preview 完全等价、仅路径隔离，便于 H5 直连且不影响管理端业务。
    // PreviewView 内部已支持 ?ticket= 一次性票据兑换 Bearer（跨源 iframe 鉴权），
    // 插件从同源 /plugins/ 加载，插件更新只需走管理端常规发布，无需重发壳。
    path: '/mobile-preview/preview',
    name: 'mobile-preview',
    component: PreviewView,
  },
];

/** ss-data 路由（full + data 模式加载）：系统管理 */
const dataRoutes: RouteRecordRaw[] = [
  {
    path: '/system',
    component: () => import('@scada-editor/editor').then((m: any) => m.SystemLayout),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'system-home',
        component: () => import('@scada-editor/system').then((m: any) => m.SystemHomeView),
        meta: { titleKey: 'system.nav.overview' },
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@scada-editor/system').then((m: any) => m.ProjectListView),
        meta: { titleKey: 'system.nav.projects' },
      },
      {
        path: 'projects/:projectId/manage',
        name: 'project-manage',
        component: () => import('@scada-editor/system').then((m: any) => m.ProjectManageView),
        meta: { titleKey: 'system.projectManage.title' },
      },
      {
        path: 'page-management',
        name: 'page-management',
        component: () => import('@scada-editor/system').then((m: any) => m.PageManagementView),
        meta: { titleKey: 'system.nav.pageManagement' },
      },
      {
        path: 'preview/:pageName',
        name: 'system-preview',
        component: () => import('@scada-editor/system').then((m: any) => m.PagePreviewTabView),
        meta: { titleKey: 'system.nav.preview' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@scada-editor/system').then((m: any) => m.DeviceListView),
        meta: { titleKey: 'system.nav.devices' },
      },
      {
        path: 'devices/:deviceId',
        name: 'device-detail',
        component: () => import('@scada-editor/system').then((m: any) => m.DeviceDetailView),
        meta: { titleKey: 'system.routes.deviceDetail' },
      },
      {
        path: 'device-monitor',
        name: 'device-monitor',
        component: () => import('@scada-editor/system').then((m: any) => m.DeviceMonitorView),
        meta: { titleKey: 'system.nav.deviceMonitor' },
      },
      {
        path: 'plugins',
        name: 'plugins',
        component: () => import('@scada-editor/system').then((m: any) => m.PluginListView),
        meta: { titleKey: 'system.nav.plugins' },
      },
      {
        path: 'plugins/:protocol',
        name: 'plugin-detail',
        component: () => import('@scada-editor/system').then((m: any) => m.PluginDetailView),
        meta: { titleKey: 'system.routes.pluginDetail' },
      },
      {
        path: 'plugins/:protocol/monitor',
        name: 'plugin-monitor',
        component: () => import('@scada-editor/system').then((m: any) => m.PluginMonitorView),
        meta: { titleKey: 'system.routes.pluginMonitor' },
      },
      {
        path: 'pipeline-metrics',
        name: 'pipeline-metrics',
        component: () => import('@scada-editor/system').then((m: any) => m.PipelineMetricsView),
        meta: { titleKey: 'system.nav.pipelineMetrics' },
      },
      {
        path: 'alarms',
        name: 'alarms',
        component: () => import('@scada-editor/system').then((m: any) => m.AlarmListView),
        meta: { titleKey: 'system.nav.alarms' },
      },
      {
        path: 'realtime-alarms',
        name: 'realtime-alarms',
        component: () => import('@scada-editor/system').then((m: any) => m.RealtimeAlarmView),
        meta: { titleKey: 'system.nav.realtimeAlarms' },
      },
      {
        path: 'alarm-statistics',
        name: 'alarm-statistics',
        component: () => import('@scada-editor/system').then((m: any) => m.AlarmStatisticsView),
        meta: { titleKey: 'system.routes.alarmStatistics' },
      },
      {
        path: 'scripts',
        name: 'scripts',
        component: () => import('@scada-editor/system').then((m: any) => m.ScriptListView),
        meta: { titleKey: 'system.nav.scripts' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@scada-editor/system').then((m: any) => m.ReportsView),
        meta: { titleKey: 'system.nav.reports' },
      },
      {
        path: 'control-logs',
        name: 'control-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.ControlLogsView),
        meta: { titleKey: 'system.nav.controlLogs' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@scada-editor/system').then((m: any) => m.SettingsView),
        meta: { titleKey: 'system.settings.title' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@scada-editor/system').then((m: any) => m.UserListView),
        meta: { titleKey: 'system.nav.users' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@scada-editor/system').then((m: any) => m.RoleListView),
        meta: { titleKey: 'system.nav.roles' },
      },
      {
        path: 'positions',
        name: 'positions',
        component: () => import('@scada-editor/system').then((m: any) => m.PositionListView),
        meta: { titleKey: 'system.nav.positions' },
      },
      {
        path: 'menus',
        name: 'menus',
        component: () => import('@scada-editor/system').then((m: any) => m.MenuManageView),
        meta: { titleKey: 'system.nav.menus' },
      },
      {
        path: 'dict',
        name: 'dict',
        component: () => import('@scada-editor/system').then((m: any) => m.DictView),
        meta: { titleKey: 'system.nav.dict' },
      },
      {
        path: 'notification-channels',
        name: 'notification-channels',
        component: () => import('@scada-editor/system').then((m: any) => m.NotificationChannelView),
        meta: { titleKey: 'system.nav.notificationChannels' },
      },
      {
        path: 'info',
        name: 'info',
        component: () => import('@scada-editor/system').then((m: any) => m.SystemInfoView),
        meta: { titleKey: 'system.nav.info' },
      },
      {
        path: 'health',
        name: 'health',
        component: () => import('@scada-editor/system').then((m: any) => m.HealthView),
        meta: { titleKey: 'system.nav.health' },
      },
      {
        path: 'database-ops',
        name: 'database-ops',
        component: () => import('@scada-editor/system').then((m: any) => m.DatabaseOpsView),
        meta: { titleKey: 'system.nav.databaseOps' },
      },
      {
        path: 'base-services',
        name: 'base-services',
        component: () => import('@scada-editor/system').then((m: any) => m.BaseServicesView),
        meta: { titleKey: 'system.nav.baseServices' },
      },
      {
        path: 'ws-monitor',
        name: 'ws-monitor',
        component: () => import('@scada-editor/system').then((m: any) => m.WebSocketMonitorView),
        meta: { titleKey: 'system.nav.wsMonitor' },
      },
      {
        path: 'ai-config',
        name: 'system-ai-config',
        component: () => import('@scada-editor/system').then((m: any) => m.AiProviderConfigView),
        meta: { titleKey: 'system.nav.aiConfig' },
      },
      {
        path: 'terminal',
        name: 'terminal',
        component: () => import('@scada-editor/system').then((m: any) => m.TerminalView),
        meta: { titleKey: 'system.nav.terminal' },
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: () => import('@scada-editor/system').then((m: any) => m.KnowledgeView),
        meta: { titleKey: 'system.nav.knowledge' },
      },
      {
        path: 'gallery',
        name: 'gallery',
        component: () => import('@scada-editor/system').then((m: any) => m.GalleryView),
        meta: { titleKey: 'system.nav.gallery' },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('@scada-editor/system').then((m: any) => m.TemplateListView),
        meta: { titleKey: 'system.nav.deviceTemplates' },
      },
      {
        path: 'canvas-templates',
        name: 'canvas-templates',
        component: () => import('@scada-editor/system').then((m: any) => m.CanvasTemplateAdmin),
        meta: { titleKey: 'system.nav.canvasTemplates' },
      },
      {
        path: 'historical-trend',
        name: 'historical-trend',
        component: () => import('@scada-editor/system').then((m: any) => m.HistoricalTrendView),
        meta: { titleKey: 'system.nav.historicalTrend' },
      },
      {
        path: 'real-time-trend',
        name: 'real-time-trend',
        component: () => import('@scada-editor/system').then((m: any) => m.RealTimeTrendView),
        meta: { titleKey: 'system.nav.realTimeTrend' },
      },
      {
        path: 'timer-config',
        name: 'system-timer-config',
        component: () => import('@scada-editor/system').then((m: any) => m.TimerConfigView),
        meta: { titleKey: 'system.nav.timerConfig' },
      },
      {
        path: 'operation-logs',
        name: 'system-operation-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.OperationLogView),
        meta: { titleKey: 'system.nav.operationLogs' },
      },
      {
        path: 'security-audit-logs',
        name: 'system-security-audit-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.SecurityAuditLogView),
        meta: { titleKey: 'system.nav.securityAuditLogs' },
      },
      {
        path: 'error-logs',
        name: 'system-error-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.ErrorLogView),
        meta: { titleKey: 'system.nav.errorLogs' },
      },
      {
        path: 'permission-audit-logs',
        name: 'system-permission-audit-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.PermissionAuditLogView),
        meta: { titleKey: 'system.nav.permissionAuditLogs' },
      },
      {
        path: 'event-logs',
        name: 'system-event-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.EventLogListView),
        meta: { titleKey: 'system.nav.eventLogs' },
      },
      {
        path: 'app-logs',
        name: 'system-app-logs',
        component: () => import('@scada-editor/system').then((m: any) => m.AppLogView),
        meta: { titleKey: 'system.nav.appLogs' },
      },
    ],
  },
];

// ──────── 根据产品模式组合最终路由表 ────────
const routes: RouteRecordRaw[] = [...sharedRoutes];

if (PRODUCT_MODE === 'full' || PRODUCT_MODE === 'scada') {
  routes.push(...scadaRoutes);
}

if (PRODUCT_MODE === 'full' || PRODUCT_MODE === 'data') {
  // data 模式下，根路径需要重定向到 /system
  if (PRODUCT_MODE === 'data') {
    routes.push({
      path: '/',
      redirect: '/system',
    });
  }
  routes.push(...dataRoutes);
}

// ──────── 兜底路由：未匹配的路径重定向到默认首页 ────────
// 1. 抑制 Vue Router "No match found for location with path xxx" 告警
// 2. 提供更好的用户体验（跳转到首页）而非空白页
// 3. 默认首页跳转到 /system
routes.push({
  path: '/:catchAll(.*)*',
  redirect: '/system',
});

// eslint-disable-next-line no-console
console.log(`[SS-Platform] Frontend Product Mode: ${PRODUCT_MODE}`);

const router = createRouter({
  // H5 内嵌场景以 VITE_BASE=/scada-preview/ 构建，路由基路径需与部署基路径一致
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ──────── 权限码级别路由守卫（方案B增强） ────────

/** 路由路径 → 权限码映射（用于细粒度权限校验） */
const ROUTE_PERMISSIONS: Record<string, PermissionCode> = {
  '/system/projects': PermissionCodes.PROJECT_VIEW,
  '/system/projects/': PermissionCodes.PROJECT_VIEW,
  '/system/page-management': PermissionCodes.PROJECT_VIEW,
  '/system/preview': PermissionCodes.PROJECT_VIEW,
  '/system/devices': PermissionCodes.DEVICE_VIEW,
  '/system/device-monitor': PermissionCodes.DEVICE_VIEW,
  '/system/plugins': PermissionCodes.PLUGIN_VIEW,
  '/system/alarms': PermissionCodes.ALARM_VIEW,
  '/system/realtime-alarms': PermissionCodes.ALARM_VIEW,
  '/system/scripts': PermissionCodes.SCRIPT_VIEW,
  '/system/script-templates': PermissionCodes.SCRIPT_VIEW,
  '/system/reports': PermissionCodes.REPORT_VIEW,
  '/system/control-logs': PermissionCodes.REPORT_VIEW,
  '/system/templates': PermissionCodes.TEMPLATE_VIEW,
  '/system/canvas-templates': PermissionCodes.TEMPLATE_VIEW,
  '/system/settings': PermissionCodes.SYSTEM_SETTINGS,
  '/system/dict': PermissionCodes.SYSTEM_DICT,
  '/system/info': PermissionCodes.SYSTEM_INFO,
  '/system/health': PermissionCodes.SYSTEM_INFO,
  '/system/database-ops': PermissionCodes.SYSTEM_SETTINGS,
  '/system/base-services': PermissionCodes.SYSTEM_BASE_SERVICES,
  '/system/ws-monitor': PermissionCodes.SYSTEM_SETTINGS,
  '/system/ai-config': PermissionCodes.SYSTEM_CONFIG,
  '/system/terminal': PermissionCodes.SYSTEM_SETTINGS,
  '/system/menus': PermissionCodes.SYSTEM_MENU_CONFIG,
  '/system/notification-channels': PermissionCodes.SYSTEM_CONFIG,
  '/system/users': PermissionCodes.SYSTEM_USER_VIEW,
  '/system/roles': PermissionCodes.SYSTEM_ROLE_VIEW,
  '/system/positions': PermissionCodes.POSITION_VIEW,
  '/system/historical-trend': PermissionCodes.HISTORICAL_TREND_VIEW,
  '/system/real-time-trend': PermissionCodes.REALTIME_TREND_VIEW,
  '/system/timer-config': PermissionCodes.SYSTEM_SETTINGS,
  '/system/operation-logs': PermissionCodes.SYSTEM_OPERATION_LOG,
  '/system/error-logs': PermissionCodes.SYSTEM_OPERATION_LOG,
  '/system/permission-audit-logs': PermissionCodes.SYSTEM_OPERATION_LOG,
  '/system/app-logs': PermissionCodes.SYSTEM_SETTINGS,
};

/** 检查用户是否有权限码访问指定路径 */
function canAccessByPermission(path: string, userPermissions: PermissionCode[]): boolean {
  // 非 /system 路径放行
  if (!path.startsWith('/system')) return true;
  // 首页（/system 或 /system/）始终可访问
  if (path === '/system' || path === '/system/') return true;
  // admin 拥有 ALL 权限
  if (userPermissions.includes(PermissionCodes.ALL)) return true;

  const requiredCode = ROUTE_PERMISSIONS[path];
  if (requiredCode) {
    return userPermissions.includes(requiredCode);
  }
  // 详情页（如 /system/devices/:id）匹配父级路由
  for (const [routePath, code] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(routePath + '/')) {
      return userPermissions.includes(code);
    }
  }
  // 未在映射中配置的路径默认放行
  return true;
}

router.beforeEach(async (to, _from, next) => {
  // 根据产品模式确定默认首页
  const defaultHome = '/system';

  if (isDebugSkipAuth()) {
    if (to.meta.guest) {
      next(defaultHome);
      return;
    }
    next();
    return;
  }

  // S-C03: 不再从 localStorage 读取 token，改用 auth store 的 isAuthenticated
  // （Token 通过 HttpOnly Cookie 管理，JS 不可读取，前端仅维护认证状态标记）
  const { useAuthStore }: any = await import('@scada-editor/system');
  const authStore = useAuthStore();

  // 访问需要认证的页面：若未恢复会话，先尝试 restore（通过 Cookie）
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    if (!authStore.sessionRestored) {
      await authStore.restoreSession();
    }
    // restore 后仍未认证 → 跳转登录
    if (!authStore.isAuthenticated) {
      next('/login');
      return;
    }
  }

  // 已认证访问 guest 页面（如登录页）→ 跳转首页
  if (to.meta.guest && authStore.isAuthenticated) {
    next(defaultHome);
    return;
  }

  if (to.meta.requiresAuth && authStore.isAuthenticated) {
    try {
      // 兜底：极少数情况下 token 标记存在但 user 未加载（如热重载丢失状态）
      if (!authStore.user) {
        await authStore.restoreSession();
        if (!authStore.isAuthenticated) {
          next('/login');
          return;
        }
      }
      // 权限校验（仅 /system 路径）
      // v7.2: 改用用户实际 permissions（从后端 roleEntity 加载），
      //       不再用本地 ROLE_PERMISSIONS[role] 按角色查表（test 等自建角色不在本地表，
      //       会被判定为无权限导致页面打不开）
      if (to.path.startsWith('/system') && authStore.user) {
        // 确保菜单已从后端加载（菜单显示按 menuIds 过滤）
        const { useMenuStore }: any = await import('@scada-editor/system');
        const menuStore = useMenuStore();
        if (!menuStore.loaded) {
          await menuStore.loadMenu();
        }
        // 权限码级别校验：使用用户实际权限码（authStore.permissions）
        const userPerms = (authStore.permissions || []) as PermissionCode[];
        if (!canAccessByPermission(to.path, userPerms)) {
          next('/system');
          return;
        }
      }
    } catch {
      next('/login');
      return;
    }
  }

  next();
});

// ──────── 浏览器标签页标题随模块动态切换 ────────
// - /system  → SS-DATA          （ss-data 数据中台）
// - /editor  → SS-SCADA Editor  （ss-scada 组态编辑器）
// - /preview → SS-SCADA Editor  （ss-scada 组态运行器，与编辑器同属 scada 子系统）
// - /login   → SS-SCADA Editor  （默认 fallback，与 index.html 初始 <title> 一致）
// 设计目的：用户在多标签页切换时能一眼区分当前所处子系统
router.afterEach((to) => {
  // to.path 仅含路径部分（query 在 to.query 中），故 /system 及 /system/xxx 均可命中
  if (to.path === '/system' || to.path.startsWith('/system/')) {
    document.title = 'SS-DATA';
  } else {
    document.title = 'SS-SCADA Editor';
  }
});

export default router;