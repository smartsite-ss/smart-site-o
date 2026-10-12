---
trigger: manual
alwaysApply: false
---

# Smart Site (SS-v7) 项目上下文

## 项目概述

Smart Site V7 是一个工业数据可视化与管理平台，包含三个子系统：

| 子系统 | 说明 | 入口 |
|--------|------|------|
| 组态编辑器 | 拖拽式工业监控画面编辑（设计态 + 运行态） | `http://localhost:5173/editor` |
| 数据中台 | 设备管理、报警、脚本、报表、模板管理 | `http://localhost:5173/system` |
| 后端服务 | REST API + WebSocket + 工业协议采集 | `http://localhost:4000` |

核心能力：图元编辑 · Modbus/OPC UA/MQTT/S7 设备采集 · 数据标签与模板 · 报警引擎 · 脚本引擎 · 主题系统 · 多语言国际化。

## 技术栈摘要

**前端**：Vue 3 (Composition API + `<script setup>`) · TypeScript 5.2 (严格模式) · Vite 5.x · pnpm 8+ · Pinia · Konva (vue-konva) · Naive UI · vue-i18n · Vue Router 4.x · Vitest 1.6 · Playwright 1.60

**后端**：NestJS 10.3 · TypeScript 5.2 · TypeORM · SQLite (better-sqlite3) · InfluxDB · Socket.IO · @nestjs/jwt + passport · Jest 29.7 · node-opcua · modbus-serial · mqtt · EventEmitter2

## 仓库结构

```
ss-v7/
├── ss-editor/                  # 前端 monorepo（pnpm workspace）
│   ├── apps/web/               # Web 应用入口（Vite :5173）
│   ├── apps/desktop/           # Electron 桌面应用
│   ├── apps/desktop-tauri/     # Tauri 桌面应用
│   ├── packages/
│   │   ├── core/               # 核心库：图元模型、存储、服务、i18n
│   │   ├── editor/             # 编辑器 UI：布局、菜单、工具栏
│   │   ├── system/             # 数据中台：视图、路由、API、stores
│   │   ├── shared/             # 共享 Vue 组件
│   │   ├── plugins/            # 图元插件包
│   │   ├── plugin-sdk/         # 插件开发 SDK
│   │   ├── create-plugin/      # 插件脚手架
│   │   └── tools/              # 构建工具
│   └── e2e/                    # Playwright E2E 测试
│
├── ss-services/ss-data/        # 后端 monorepo（NestJS + pnpm workspace）
│   ├── apps/ss-data-server/    # NestJS 主应用入口
│   ├── packages/
│   │   ├── ss-core/            # 核心基础设施（Auth、EventBus、Pipeline、WebSocket、Config）
│   │   ├── ss-sdk/             # 共享 SDK（DTO、类型、工具）
│   │   ├── ss-device/          # 设备管理
│   │   ├── ss-project/         # 项目管理
│   │   ├── ss-datatag/         # 数据标签
│   │   ├── ss-alarm/           # 报警管理
│   │   ├── ss-system/          # 系统管理
│   │   ├── ss-report/          # 报表系统
│   │   ├── ss-script/          # 脚本引擎
│   │   ├── ss-datasource/      # 外部数据源
│   │   ├── ss-storage/         # 存储引擎
│   │   ├── ss-collector/       # 工业协议采集器
│   │   ├── ss-i18n/            # 后端国际化
│   │   └── ss-cli/             # CLI 工具
│   ├── data/init/              # SQLite 初始化脚本
│   └── __tests__/              # 集成测试
│
└── docs/                       # 项目文档
    ├── 01-功能说明/            # 功能列表、用户手册
    ├── 02-详细设计/            # 子系统详细设计 + 功能整合
    ├── 03-架构设计/            # 前后端架构、API、数据库设计
    ├── 04-开发规范/            # 开发规范、组件规范
    ├── 05-前后端联调/          # 联调方案
    ├── 06-测试方案/            # 测试方案、测试报告
    ├── 07-开发计划/            # 开发计划
    └── 08-运维与发布/          # 部署指南
```

## 快速启动

```powershell
.\bin\start.bat          # 一键启动前后端

# 或分步启动：
cd ss-services\ss-data && pnpm dev      # 后端 :4000
cd ss-editor && pnpm dev:web            # 前端 :5173
```

## 关键文件速查

### 前端
- 数据中台布局：[SystemLayout.vue](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/layouts/SystemLayout.vue)
- Web 路由：[router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/apps/web/src/router/index.ts)
- System 路由：[router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/router/index.ts)
- 中文翻译：[zh-CN.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/zh-CN.json)
- 菜单配置：[menu.config.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/config/menu.config.ts)

### 后端
- 启动入口：[main.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/apps/ss-data-server/src/main.ts)
- 根模块：[app.module.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/apps/ss-data-server/src/app.module.ts)
- DB 初始化：[init-system-db.sql](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/data/init/init-system-db.sql)
- 配置服务：[system-config.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-system/src/config/system-config.service.ts)
- 文件监听：[config-watcher.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-core/src/config/config-watcher.service.ts)
- WebSocket：[websocket.gateway.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-core/src/websocket/websocket.gateway.ts)
- 用户实体：[user.entity.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-data/packages/ss-core/src/core/user/entities/user.entity.ts)

### 设计文档
- [后端整体架构](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/02-详细设计/ss-services/00-整体设计/后端整体架构设计.md)
- [前端架构设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/前端-架构设计.md)
- [后端框架设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/后端-框架设计.md)
- [后端数据库设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/后端-数据库设计.md)
- [后端开发规范](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/后端-开发规范.md)
- [前端开发指引](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/前端-开发指引.md)

## 调试与诊断

### 前端
- Vite dev server 端口 `5173`，API 代理到 `localhost:4000`
- `VITE_API_BASE_URL` 控制 API 目标；`VITE_DEBUG_SKIP_AUTH=true` 跳过认证
- workspace 包修改后需重新编译：`pnpm --filter @scada-editor/core build`

### 后端
- 端口 `4000`（`.env.dev` 中的 `PORT`）
- 环境变量优先于数据库配置
- 非生产模式可用 mock token 跳过 JWT 校验
- SQLite 文件：全局 `ss-services/ss-data/data/ss-data.db`；项目 `{PROJECTS_DIR}/{projectName}/db/system.db`
- workspace 包修改后需重新编译：`pnpm --filter @ss-data/ss-device build`
- 日志通过 `StructuredLogger`（`@ss-data/ss-core`）输出

## 文档引用格式

使用 `file:///` 协议的绝对路径创建可点击的文件链接：

```markdown
[SystemLayout.vue](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/layouts/SystemLayout.vue)
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
