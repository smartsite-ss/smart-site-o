// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { KbManifest } from './knowledge.types';

/**
 * 默认 manifest.json 数据（v2.0 多产品架构）
 *
 * 当 ${KB_ROOT}/manifest.json 不存在时，服务启动时自动写入此默认值。
 * 管理员可手动编辑 manifest.json 调整产品清单、模块清单和路由映射。
 *
 * 包含的产品：
 *   - ss-data：数据中台（17 功能模块 + 2 全局章节）
 *   - ss-scada：组态编辑器（骨架 + 2 全局章节）
 *
 * 每个产品内置两个全局章节：
 *   - 00-overview：系统概述
 *   - 00-manual：操作手册
 */
export const DEFAULT_MANIFEST: KbManifest = {
  version: '2.0',
  products: [
    {
      id: 'ss-data',
      name: '数据中台',
      nameI18n: { 'zh-CN': '数据中台', 'en-US': 'Data Platform' },
      icon: 'database',
      order: 10,
      modules: [
        // ===== 全局章节 =====
        {
          id: '00-overview',
          name: '系统概述',
          nameI18n: { 'zh-CN': '系统概述', 'en-US': 'System Overview' },
          icon: 'info',
          order: 0,
          isGlobal: true,
          globalType: 'overview',
        },
        {
          id: '00-manual',
          name: '操作手册',
          nameI18n: { 'zh-CN': '操作手册', 'en-US': 'User Manual' },
          icon: 'book',
          order: 1,
          isGlobal: true,
          globalType: 'manual',
        },
        // ===== 功能模块 =====
        {
          id: '01-permission',
          name: '权限管理',
          nameI18n: { 'zh-CN': '权限管理', 'en-US': 'Permission' },
          icon: 'roles',
          order: 10,
          routePath: '/system/users',
        },
        {
          id: '02-project',
          name: '项目管理',
          nameI18n: { 'zh-CN': '项目管理', 'en-US': 'Project' },
          icon: 'projects',
          order: 20,
          routePath: '/system/projects',
        },
        {
          id: '03-device',
          name: '设备管理',
          nameI18n: { 'zh-CN': '设备管理', 'en-US': 'Device Management' },
          icon: 'devices',
          order: 30,
          routePath: '/system/devices',
        },
        {
          id: '04-template',
          name: '模板管理',
          nameI18n: { 'zh-CN': '模板管理', 'en-US': 'Template' },
          icon: 'templates',
          order: 40,
          routePath: '/system/templates',
        },
        {
          id: '05-collector',
          name: '采集管理',
          nameI18n: { 'zh-CN': '采集管理', 'en-US': 'Collector' },
          icon: 'plugins',
          order: 50,
          routePath: '/system/plugins',
        },
        {
          id: '06-alarm',
          name: '报警管理',
          nameI18n: { 'zh-CN': '报警管理', 'en-US': 'Alarm' },
          icon: 'alarms',
          order: 60,
          routePath: '/system/alarms',
        },
        {
          id: '07-storage',
          name: '存储管理',
          nameI18n: { 'zh-CN': '存储管理', 'en-US': 'Storage' },
          icon: 'database',
          order: 70,
          routePath: '/system/database-ops',
        },
        {
          id: '08-protocol',
          name: '工业协议管理',
          nameI18n: { 'zh-CN': '工业协议管理', 'en-US': 'Industrial Protocol' },
          icon: 'plugins',
          order: 80,
          routePath: '/system/plugins',
        },
        {
          id: '09-websocket',
          name: '实时通信',
          nameI18n: { 'zh-CN': '实时通信', 'en-US': 'Realtime Communication' },
          icon: 'ws-monitor',
          order: 90,
          routePath: '/system/ws-monitor',
        },
        {
          id: '10-script',
          name: '脚本引擎管理',
          nameI18n: { 'zh-CN': '脚本引擎管理', 'en-US': 'Script Engine' },
          icon: 'scripts',
          order: 100,
          routePath: '/system/scripts',
        },
        {
          id: '11-api',
          name: 'API 接口',
          nameI18n: { 'zh-CN': 'API 接口', 'en-US': 'API' },
          icon: 'api',
          order: 110,
        },
        {
          id: '12-system',
          name: '系统管理',
          nameI18n: { 'zh-CN': '系统管理', 'en-US': 'System' },
          icon: 'settings',
          order: 120,
          routePath: '/system/settings',
        },
        {
          id: '13-dictionary',
          name: '数据字典',
          nameI18n: { 'zh-CN': '数据字典', 'en-US': 'Dictionary' },
          icon: 'dict',
          order: 130,
          routePath: '/system/dict',
        },
        {
          id: '14-cli',
          name: 'CLI 命令行',
          nameI18n: { 'zh-CN': 'CLI 命令行', 'en-US': 'CLI' },
          icon: 'cli',
          order: 140,
        },
        {
          id: '15-i18n',
          name: '国际化',
          nameI18n: { 'zh-CN': '国际化', 'en-US': 'Internationalization' },
          icon: 'i18n',
          order: 150,
        },
        {
          id: '16-report',
          name: '报表系统',
          nameI18n: { 'zh-CN': '报表系统', 'en-US': 'Report' },
          icon: 'reports',
          order: 160,
          routePath: '/system/reports',
        },
        {
          id: '17-sdk',
          name: 'SDK 工具',
          nameI18n: { 'zh-CN': 'SDK 工具', 'en-US': 'SDK' },
          icon: 'sdk',
          order: 170,
        },
      ],
      routeMap: [
        {
          routePattern: '/system/devices',
          knowledgePath: '03-device',
          hintTextKey: 'system.kb.hints.devices',
        },
        {
          routePattern: '/system/devices/:deviceId',
          knowledgePath: '03-device/device-detail',
          hintTextKey: 'system.kb.hints.deviceDetail',
        },
        {
          routePattern: '/system/plugins',
          knowledgePath: '05-collector',
          hintTextKey: 'system.kb.hints.plugins',
        },
        {
          routePattern: '/system/plugins/:protocol',
          knowledgePath: '05-collector/plugin-detail',
          hintTextKey: 'system.kb.hints.pluginDetail',
        },
        {
          routePattern: '/system/alarms',
          knowledgePath: '06-alarm',
          hintTextKey: 'system.kb.hints.alarms',
        },
        {
          routePattern: '/system/scripts',
          knowledgePath: '10-script',
          hintTextKey: 'system.kb.hints.scripts',
        },
        {
          routePattern: '/system/settings',
          knowledgePath: '12-system',
          hintTextKey: 'system.kb.hints.settings',
        },
        {
          routePattern: '/system/ws-monitor',
          knowledgePath: '09-websocket',
          hintTextKey: 'system.kb.hints.wsMonitor',
        },
        {
          routePattern: '/system/reports',
          knowledgePath: '16-report',
          hintTextKey: 'system.kb.hints.reports',
        },
        {
          routePattern: '/system/templates',
          knowledgePath: '04-template',
          hintTextKey: 'system.kb.hints.templates',
        },
      ],
    },
    {
      id: 'ss-scada',
      name: '组态编辑器',
      nameI18n: { 'zh-CN': '组态编辑器', 'en-US': 'SCADA Editor' },
      icon: 'editor',
      order: 20,
      modules: [
        // ===== 全局章节 =====
        {
          id: '00-overview',
          name: '系统概述',
          nameI18n: { 'zh-CN': '系统概述', 'en-US': 'System Overview' },
          icon: 'info',
          order: 0,
          isGlobal: true,
          globalType: 'overview',
        },
        {
          id: '00-manual',
          name: '操作手册',
          nameI18n: { 'zh-CN': '操作手册', 'en-US': 'User Manual' },
          icon: 'book',
          order: 1,
          isGlobal: true,
          globalType: 'manual',
        },
        // ===== 功能模块（骨架，待逐步完善） =====
        {
          id: '01-canvas',
          name: '画布编辑',
          nameI18n: { 'zh-CN': '画布编辑', 'en-US': 'Canvas Editing' },
          icon: 'canvas',
          order: 10,
          routePath: '/editor',
        },
        {
          id: '02-shape',
          name: '图元编辑',
          nameI18n: { 'zh-CN': '图元编辑', 'en-US': 'Shape Editing' },
          icon: 'shape',
          order: 20,
        },
        {
          id: '03-layer',
          name: '图层管理',
          nameI18n: { 'zh-CN': '图层管理', 'en-US': 'Layer Management' },
          icon: 'layers',
          order: 30,
        },
        {
          id: '04-property',
          name: '属性面板',
          nameI18n: { 'zh-CN': '属性面板', 'en-US': 'Property Panel' },
          icon: 'settings',
          order: 40,
        },
        {
          id: '05-binding',
          name: '数据绑定',
          nameI18n: { 'zh-CN': '数据绑定', 'en-US': 'Data Binding' },
          icon: 'binding',
          order: 50,
        },
        {
          id: '06-event',
          name: '事件交互',
          nameI18n: { 'zh-CN': '事件交互', 'en-US': 'Event Interaction' },
          icon: 'event',
          order: 60,
        },
        {
          id: '07-plugin',
          name: '插件图元',
          nameI18n: { 'zh-CN': '插件图元', 'en-US': 'Plugin Shape' },
          icon: 'plugins',
          order: 70,
        },
        {
          id: '08-theme',
          name: '主题样式',
          nameI18n: { 'zh-CN': '主题样式', 'en-US': 'Theme Style' },
          icon: 'theme',
          order: 80,
        },
      ],
      routeMap: [
        {
          routePattern: '/editor',
          knowledgePath: '00-overview',
          hintTextKey: 'system.kb.hints.editor',
        },
        {
          routePattern: '/editor/:projectId',
          knowledgePath: '01-canvas',
          hintTextKey: 'system.kb.hints.canvas',
        },
      ],
    },
  ],
};

/** 默认产品 ID（向后兼容） */
export const DEFAULT_PRODUCT_ID = 'ss-data';
