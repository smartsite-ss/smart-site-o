// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 路由配置（不含组件，组件由宿主应用注入）
export const systemRouteConfigs = [
  {
    path: '/login',
    name: 'system-login',
    meta: { guest: true },
  },
  {
    path: '/system',
    meta: { requiresAuth: true },
    redirect: '/system/projects',
    children: [
      { path: '', redirect: '/system/projects' },
      { path: 'projects', name: 'system-projects', meta: { titleKey: 'system.nav.projects' } },
      { path: 'projects/:projectId/manage', name: 'system-project-manage', meta: { titleKey: 'system.projectManage.title' } },
      { path: 'page-management', name: 'system-page-management', meta: { titleKey: 'system.nav.pageManagement' } },
      { path: 'preview/:pageName', name: 'system-preview', meta: { titleKey: 'system.nav.preview' } },
      { path: 'devices', name: 'system-devices', meta: { titleKey: 'system.nav.devices' } },
      { path: 'devices/:deviceId', name: 'system-device-detail', meta: { titleKey: 'system.routes.deviceDetail' } },
      { path: 'device-monitor', name: 'system-device-monitor', meta: { titleKey: 'system.nav.deviceMonitor' } },
      { path: 'plugins', name: 'system-plugins', meta: { titleKey: 'system.nav.plugins' } },
      { path: 'plugins/:protocol', name: 'system-plugin-detail', meta: { titleKey: 'system.routes.pluginDetail' } },
      { path: 'plugins/:protocol/monitor', name: 'system-plugin-monitor', meta: { titleKey: 'system.routes.pluginMonitor' } },
      { path: 'pipeline-metrics', name: 'system-pipeline-metrics', meta: { titleKey: 'system.nav.pipelineMetrics' } },
      { path: 'alarms', name: 'system-alarms', meta: { titleKey: 'system.nav.alarms' } },
      { path: 'realtime-alarms', name: 'system-realtime-alarms', meta: { titleKey: 'system.nav.realtimeAlarms' } },
      { path: 'alarm-statistics', name: 'system-alarm-statistics', meta: { titleKey: 'system.routes.alarmStatistics' } },
      { path: 'scripts', name: 'system-scripts', meta: { titleKey: 'system.nav.scripts' } },
      { path: 'script-templates', name: 'system-script-templates', meta: { titleKey: 'system.scriptTemplates.title' } },
      { path: 'reports', name: 'system-reports', meta: { titleKey: 'system.nav.reports' } },
      { path: 'control-logs', name: 'system-control-logs', meta: { titleKey: 'system.nav.controlLogs' } },
      { path: 'templates', name: 'system-templates', meta: { titleKey: 'system.nav.deviceTemplates' } },
      { path: 'canvas-templates', name: 'system-canvas-templates', meta: { titleKey: 'system.nav.canvasTemplates' } },
      { path: 'settings', name: 'system-settings', meta: { titleKey: 'system.settings.title' } },
      { path: 'users', name: 'system-users', meta: { titleKey: 'system.nav.users' } },
      { path: 'roles', name: 'system-roles', meta: { titleKey: 'system.nav.roles' } },
      { path: 'positions', name: 'system-positions', meta: { titleKey: 'system.nav.positions' } },
      { path: 'menus', name: 'system-menus', meta: { titleKey: 'system.nav.menus' } },
      { path: 'dict', name: 'system-dict', meta: { titleKey: 'system.nav.dict' } },
      { path: 'notification-channels', name: 'system-notification-channels', meta: { titleKey: 'system.nav.notificationChannels' } },
      { path: 'info', name: 'system-info', meta: { titleKey: 'system.nav.info' } },
      { path: 'health', name: 'system-health', meta: { titleKey: 'system.nav.health' } },
      { path: 'database-ops', name: 'system-database-ops', meta: { titleKey: 'system.nav.databaseOps' } },
      { path: 'base-services', name: 'system-base-services', meta: { titleKey: 'system.nav.baseServices' } },
      { path: 'ws-monitor', name: 'system-ws-monitor', meta: { titleKey: 'system.nav.wsMonitor' } },
      { path: 'ai-config', name: 'system-ai-config', meta: { titleKey: 'system.nav.aiConfig' } },
      { path: 'terminal', name: 'terminal', meta: { titleKey: 'system.nav.terminal' } },
      { path: 'knowledge', name: 'system-knowledge', meta: { titleKey: 'system.nav.knowledge' } },
      { path: 'gallery', name: 'system-gallery', meta: { titleKey: 'system.nav.gallery' } },
      { path: 'historical-trend', name: 'system-historical-trend', meta: { titleKey: 'system.nav.historicalTrend' } },
      { path: 'real-time-trend', name: 'system-real-time-trend', meta: { titleKey: 'system.nav.realTimeTrend' } },
      { path: 'timer-config', name: 'system-timer-config', meta: { titleKey: 'system.nav.timerConfig' } },
      { path: 'operation-logs', name: 'system-operation-logs', meta: { titleKey: 'system.nav.operationLogs' } },
      { path: 'security-audit-logs', name: 'system-security-audit-logs', meta: { titleKey: 'system.nav.securityAuditLogs' } },
      { path: 'error-logs', name: 'system-error-logs', meta: { titleKey: 'system.nav.errorLogs' } },
      { path: 'permission-audit-logs', name: 'system-permission-audit-logs', meta: { titleKey: 'system.nav.permissionAuditLogs' } },
      { path: 'event-logs', name: 'system-event-logs', meta: { titleKey: 'system.nav.eventLogs' } },
      { path: 'app-logs', name: 'system-app-logs', meta: { titleKey: 'system.nav.appLogs' } },
    ],
  },
] as import('vue-router').RouteRecordRaw[];

// Token 检查工具函数（内联实现，避免导入依赖）
export function checkAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
