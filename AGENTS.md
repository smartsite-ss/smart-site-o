﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿# AGENTS.md — Smart Site (SS-v7) 项目指南

本文档是项目的 导航索引 ，详细规则已拆分为 `.qoder/rules/` 下的独立文件。

---

## 规则文件索引

| 规则文件                                                                                                                  | 类型         | 内容                                                      |
| ------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| [project-context.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/project-context.md)             | 始终生效     | 项目概览、技术栈、仓库结构、关键文件速查、调试            |
| [coding-standards.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/coding-standards.md)           | 始终生效     | 门禁流程、CSS 变量、i18n、TS 严格模式、命名规范、提交格式 |
| [frontend-architecture.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/frontend-architecture.md) | 前端文件触发 | 模块职责边界、包间引用、workspace 编译                    |
| [backend-architecture.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/backend-architecture.md)   | 后端文件触发 | 分层架构、EventBus、DB 隔离、全局模块                     |
| [testing-standards.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/testing-standards.md)         | 按需引用     | 测试层级、文件约定、覆盖率要求                            |
| [dev-workflow.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.qoder/rules/dev-workflow.md)                   | 按需引用     | 开发流程、常见任务、设计文档规范                          |

---

## 快速链接

- 启动 ：使用 [`bin/`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin) 目录脚本（`start.bat` 全栈 / `start-data.bat` / `start-scada.bat`），，，严禁直接，， ，，`pnpm dev`，，，详见 §4 快速启动
- 构建 ：前端 `cd ss-editor && pnpm build:web`，后端 `cd ss-services\ss-node && pnpm build`
- 文档引用格式 ：`[文件名](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/...)`

---

最后更新：2026-08-03

# AGENTS.md — Smart Site (SS-v7) 项目指南

本文档面向 AI 编码助手（Agent），提供项目全生命周期的关键信息：需求 → 设计 → 开发 → 测试。

---

## 1. 项目概述

Smart Site V7

&#x20;是一个工业数据可视化与管理平台，包含：

| 子系统     | 说明                                      | 入口                           |
| ---------- | ----------------------------------------- | ------------------------------ |
| 组态编辑器 | 拖拽式工业监控画面编辑（设计态 + 运行态） | `http://localhost:5173/editor` |
| 数据中台   | 设备管理、报警、脚本、报表、模板管理      | `http://localhost:5173/system` |
| 后端服务   | REST API + WebSocket + 工业协议采集       | `http://localhost:4000`        |

核心能力

：图元编辑 · Modbus/OPC UA/MQTT/S7 设备采集 · 数据标签与模板 · 报警引擎 · 脚本引擎 · 主题系统 · 多语言国际化

---

## 2. 仓库结构

```
ss-v7/
├── ss-editor/                  # 前端 monorepo（pnpm workspace）
│   ├── apps/web/               # Web 应用入口（Vite dev server :5173）
│   ├── apps/desktop/           # Electron 桌面应用
│   ├── apps/desktop-tauri/     # Tauri 桌面应用
│   ├── packages/
│   │   ├── core/               # 核心库：图元模型、存储、服务、i18n
│   │   ├── editor/             # 编辑器 UI：布局、菜单、工具栏
│   │   ├── system/             # 数据中台：视图、路由、API、stores
│   │   ├── shared/             # 共享 Vue 组件
│   │   ├── plugins/            # 图元插件包（industrial/chart/form 等）
│   │   ├── plugin-sdk/         # 插件开发 SDK
│   │   ├── create-plugin/      # 插件脚手架工具
│   │   └── tools/              # 构建工具
│   └── e2e/                    # Playwright E2E 测试
│
├── ss-services/ss-node/        # 后端 monorepo（NestJS + pnpm workspace）
│   ├── apps/ss-node-server/    # NestJS 主应用入口
│   ├── packages/
│   │   ├── ss-core/            # 核心基础设施（Auth、EventBus、Pipeline、WebSocket、Config）
│   │   ├── ss-sdk/             # 共享 SDK（DTO、类型、工具）
│   │   ├── ss-device/          # 设备管理
│   │   ├── ss-project/         # 项目管理
│   │   ├── ss-datatag/         # 数据标签
│   │   ├── ss-alarm/           # 报警管理
│   │   ├── ss-system/          # 系统管理（配置、终端）
│   │   ├── ss-report/          # 报表系统
│   │   ├── ss-script/          # 脚本引擎
│   │   ├── ss-datasource/      # 外部数据源
│   │   ├── ss-storage/         # 存储引擎（InfluxDB 等）
│   │   ├── ss-collector/       # 工业协议采集器
│   │   │   ├── ss-collector-modbus/
│   │   │   ├── ss-collector-mqtt/
│   │   │   ├── ss-collector-opcua/
│   │   │   ├── ss-collector-s7/
│   │   │   ├── ss-collector-virtual/
│   │   │   └── ss-collector-sdk/
│   │   ├── ss-i18n/            # 后端国际化
│   │   └── ss-cli/             # CLI 工具
│   ├── data/init/              # SQLite 初始化脚本
│   ├── bin/                    # 构建/运行脚本
│   └── __tests__/              # 集成测试
│
└── docs/                       # 项目文档
    ├── 01-功能说明/            # 功能列表、用户手册
    ├── 02-详细设计/            # 子系统详细设计 + 功能整合
    ├── 03-架构设计/            # 前后端架构、API 设计、数据库设计
    ├── 04-开发规范/            # 开发规范、组件规范
    ├── 05-前后端联调/          # 联调方案
    ├── 06-测试方案/            # 测试方案、测试报告
    ├── 07-开发计划/            # 开发计划
    └── 08-运维与发布/          # 部署指南
```

---

## 3. 技术栈

### 前端

| 技术              | 版本 | 用途                               |
| ----------------- | ---- | ---------------------------------- |
| Vue 3             | 3.x  | Composition API + `<script setup>` |
| TypeScript        | 5.2  | 严格模式                           |
| Vite              | 5.x  | 构建工具                           |
| pnpm              | 8+   | 包管理器 + workspace               |
| Pinia             | —    | 状态管理                           |
| Konva (vue-konva) | —    | 画布渲染                           |
| Naive UI          | —    | UI 组件库                          |
| vue-i18n          | —    | 国际化                             |
| Vue Router        | 4.x  | 路由                               |
| Vitest            | 1.6  | 单元测试                           |
| Playwright        | 1.60 | E2E 测试                           |

### 后端

| 技术                    | 版本  | 用途                        |
| ----------------------- | ----- | --------------------------- |
| NestJS                  | 10.3  | 应用框架                    |
| TypeScript              | 5.2   | 严格模式                    |
| TypeORM                 | —     | ORM                         |
| SQLite (better-sqlite3) | —     | 元数据存储（每项目独立 DB） |
| InfluxDB                | —     | 时序数据存储                |
| Socket.IO               | —     | WebSocket 实时通信          |
| @nestjs/jwt + passport  | —     | JWT 认证 + RBAC             |
| Jest                    | 29.7  | 单元测试                    |
| ts-jest                 | 29.4  | Jest TypeScript 转换        |
| Supertest               | 7.2   | HTTP 集成测试               |
| node-opcua              | 2.170 | OPC UA 协议                 |
| modbus-serial           | 8.0   | Modbus 协议                 |
| mqtt                    | 5.15  | MQTT 协议                   |
| EventEmitter2           | —     | 模块间事件解耦              |

---

## 4. 快速启动

> ⚠️ 强制规则 ：开发中需要启动/重启前后端、尝试不同产品模式、或启动失败需要重试时，，，必须使用，， ，，[`bin/`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin)，， ，，目录下的脚本，，，严禁直接执行 `pnpm dev` / `pnpm dev:web`。脚本已封装路径解析、依赖安装、workspace 编译、环境变量、缓存清理等流程，确保启动环境一致。

### 4.1 启动模式选择

项目支持三种产品模式，按需选择对应启动脚本（均在新窗口中启动前后端）：

| 模式         | 启动脚本                                                                                               | 前端端口 | 后端端口 | 适用场景                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ | -------- | -------- | ---------------------------------------------------------------------- |
| 全栈（默认） | [`.\bin\start.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/start.bat)             | 5173     | 3000     | 同时开发编辑器 + 数据中台                                              |
| data 模式    | [`.\bin\start-data.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/start-data.bat)   | 5175     | 4000     | 仅开发数据中台（禁用 `/editor`、`/preview` 路由，不注册 PluginModule） |
| scada 模式   | [`.\bin\start-scada.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/start-scada.bat) | 5174     | 4100     | 仅开发组态编辑器（禁用 `/system/*` 路由，不注册 data 模块）            |

> 端口差异说明：`start.bat` 检查后端 :3000，`start-data.bat` / `start-scada.bat` 分别使用 :4000 / :4100。实际后端端口由 `.env.*` 中的 `PORT` 决定，脚本仅做占用预检与提示。

### 4.2 分步启动（调试单个端）

需要单独观察前后端日志、或只调试一端时：

```powershell
.\bin\start-backend.bat    # 仅启动后端（自动 install + build workspace 包 + start:dev）
.\bin\start-frontend.bat  # 仅启动前端（Vite dev + plugins-cli.js 统一构建管线）
```

### 4.3 桌面应用调试

```powershell
.\bin\run-desktop.bat     # 启动 Electron 桌面应用
```

### 4.4 启动失败 / 重试流程

当启动失败、热更新异常、或 workspace 包修改未生效时，，，不要手动删缓存，，，按以下顺序使用脚本（详见 [§12.4 启动失败与重试](#124-启动失败与重试)）：

```powershell
# 1. 杀掉所有残留 Node 进程（关闭所有 dev server 窗口后执行）
.\bin\kill-node.bat

# 2. 清理前端 Vite 缓存 + 后端 dist/tsbuildinfo 并重新编译
.\bin\clear-vite-cache.bat

# 3. 重新启动对应模式
.\bin\start.bat
```

### 4.5 首次安装依赖

```bash
# 根目录
pnpm install
```

### 4.6 构建

```bash
# 前端构建
cd ss-editor && pnpm build:web

# 后端构建
cd ss-services\ss-node && pnpm build
```

---

## 5. 代码规范

### 5.1 门禁流程

```
编写代码 → typecheck ✓ → lint ✓ → test ✓ → Code Review ✓ → 提交
```

| 关卡     | 命令             | 阻断条件   |
| -------- | ---------------- | ---------- |
| 类型检查 | `pnpm typecheck` | 任何 Error |
| 代码风格 | `pnpm lint`      | 任何 Error |
| 单元测试 | `pnpm test`      | 任何失败   |

### 5.2 强制规则

1.  主题样式 ：所有颜色必须用 CSS 变量（`--primary`、`--surface`、`--text`、`--border` 等），，，严禁硬编码颜色值，，
2.  国际化 ：新增 UI 文本必须使用 `$t('system.xxx.yyy')` 并在 `zh-CN.json` / `en-US.json` 同步翻译
3.  TypeScript 严格模式 ：禁止 `any`，优先具体类型或泛型
4.  系统弹窗 ：所有提示、确认、警告弹窗必须使用统一的 MessageBox 组件（`showSuccess`、`showError`、`showConfirm` 等，位于 [messageBox.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/utils/messageBox.ts)），，，严禁使用原生，， ，，`alert()`、`confirm()`、`prompt()`，，
5.  批处理文件 ：所有 `.bat` 文件必须使用 UTF-8 编码 （带 BOM，`chcp 65001 >nul`），，，统一使用英文，，编写注释和输出信息
6.  第三方 UI 组件库 ：引入任何第三方样式/组件库（如 Naive UI、Element Plus、Ant Design 等）））必须事先征得用户确认）），不得擅自添加依赖。优先使用原生 HTML + CSS 变量实现 UI 组件，保持项目依赖精简
7.  启动脚本（强制） ：开发中需要启动/重启前后端、切换产品模式（data / scada）、或启动失败需要重试时，，，必须使用，， ，，[`bin/`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin)，， ，，目录下的脚本，，（`start.bat` / `start-data.bat` / `start-scada.bat` / `start-backend.bat` / `start-frontend.bat` / `kill-node.bat` / `clear-vite-cache.bat`），，，严禁直接执行，， ，，`pnpm dev`、`pnpm dev:web`、`pnpm start:dev`，，。脚本已统一封装路径解析、依赖安装、workspace 编译、缓存清理流程，避免环境不一致导致的启动失败
8.  CSS 变量示例 ：

```css
/* ✅ 正确 */
background: var(--surface);
border: 1px solid var(--border);

/* ❌ 错误 */
background: #0f172a;
border: 1px solid #1e293b;
```

### 5.3 命名规范

| 类型          | 格式                        | 示例                   |
| ------------- | --------------------------- | ---------------------- |
| Vue SFC 文件  | PascalCase                  | `DeviceListView.vue`   |
| TS 工具文件   | kebab-case                  | `device.api.ts`        |
| 目录          | kebab-case 或小写           | `device/`, `data-tag/` |
| NestJS 模块   | XxxModule                   | `DeviceModule`         |
| NestJS 控制器 | XxxController               | `DeviceController`     |
| NestJS 服务   | XxxService                  | `DeviceService`        |
| DTO           | CreateXxxDto / UpdateXxxDto | `CreateDeviceDto`      |
| Entity        | Xxx                         | `Device`               |
| 函数/变量     | camelCase                   | `handleSaveProject`    |
| 接口          | IXxx                        | `IProjectConfig`       |
| 类型别名      | TXxx                        | `TDeviceType`          |
| 常量          | UPPER_SNAKE_CASE            | `DEFAULT_SCAN_RATE`    |

### 5.4 提交信息

提交信息使用简易中文格式，尽量说明原因而不是做了什么，包含功能模块前缀：

```
feat: 设备管理-分组支持拖拽排序
fix: 设备管理-分组创建后未刷新列表
refactor: 系统-菜单改为集中配置
docs: 设计文档-菜单配置方案
```

### 5.5 标识符与变量命名规范（强制）

> **核心原则：禁止缩写，使用完整语义命名。** 所有变量、参数、属性、字段、DTO 键、事件 payload、日志消息、Redis key、API 路由参数、DB 列别名均须使用可自解释的全称，让 AI 和人无需上下文即可理解含义。
>
> **背景**：历史代码中 `pid`/`did`/`tid`/`uid` 等缩写导致"一名多义"（如 `tid` 既指项目租户又指设备标签），AI 生成代码时极易混淆。2026-08-03 方案 B 统一为 `projectId` 后，本规范将"禁止缩写"确立为**全局通用规则**，不限于 `projectinfo.json`。详见 [13 号文档 v3.0](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/ss-data/06-优化记录/13-项目标识符命名统一优化方案.md)、[14 号文档 v1.2](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/ss-data/06-优化记录/14-设备标识符命名统一优化方案.md)。

#### 5.5.1 领域标识符全称对照表（强制使用全称）

| ❌ 禁止缩写       | ✅ 全称                                   | 语义                                        | 出现位置                                    |
| ----------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `pid`             | `projectId`                               | 项目唯一标识符                              | 实体字段、路由参数、事件 payload、Redis key |
| `did`             | `deviceId`                                | 设备主键 ID                                 | 局部变量、日志、路由参数                    |
| `tid`（项目维度） | `tenantId`                                | 项目租户 ID（多租户预留，当前=projectId）   | 实体字段、事件 payload                      |
| `tid`（设备维度） | `deviceCode`（推荐）/ `device.deviceCode` | 设备编码（用户可读标识，如 `temp-hum-001`） | Device 实体字段（见 §5.5.5 注）             |
| `uid`             | `userId`                                  | 用户 ID                                     | 权限、审计、日志                            |
| `gid`             | `groupId`                                 | 分组 ID（设备分组/标签分组）                | 实体字段、路由参数                          |
| `rid`             | `roleId`                                  | 角色 ID                                     | 权限授权表                                  |
| `id`（路由参数）  | `:projectId` / `:deviceId` / `:tagId` 等  | 按业务实体明确命名                          | API 路由参数                                |

#### 5.5.2 通用缩写禁止清单

以下缩写在**领域代码**（实体、服务、控制器、DTO、事件、API、视图）中禁止使用，必须用全称：

| ❌ 缩写      | ✅ 全称                                      | ❌ 缩写 | ✅ 全称              |
| ------------ | -------------------------------------------- | ------- | -------------------- |
| `cfg`        | `config`                                     | `cnt`   | `count`              |
| `tmp`/`temp` | `temporary` / `temperature`（按语义）        | `desc`  | `description`        |
| `addr`       | `address`                                    | `msg`   | `message`            |
| `err`        | `error`                                      | `val`   | `value`              |
| `idx`        | `index`                                      | `ts`    | `timestamp`          |
| `dir`        | `directory`                                  | `len`   | `length`             |
| `num`        | `number`                                     | `str`   | `string`             |
| `arr`        | `array`                                      | `obj`   | `object`             |
| `btn`        | `button`                                     | `img`   | `image`              |
| `info`       | `information` / 直接用业务名                 | `nav`   | `navigation`         |
| `auth`       | `authentication` / `authorization`（按语义） | `perm`  | `permission`         |
| `repo`       | `repository`                                 | `svc`   | `service`            |
| `ctrl`       | `controller`                                 | `dto`   | 保留（行业通用术语） |
| `db`         | `database`                                   | `conn`  | `connection`         |
| `req`        | `request`                                    | `res`   | `response`           |
| `ctx`        | `context`                                    | `param` | `parameter`          |

> **例外**：`req`/`res`/`ctx`/`err` 在 Express/NestJS **中间件/拦截器**的窄局部作用域内可保留（框架约定），但跨函数传递或作为类属性时必须用全称（`request`/`response`/`context`/`error`）。

#### 5.5.3 应用范围（全覆盖）

本规范适用于以下**所有**命名场景，AI 生成代码时逐一检查：

| 场景              | 示例                                                  |
| ----------------- | ----------------------------------------------------- |
| 变量 / 局部变量   | `const projectId = ...`（非 `pid`）                   |
| 函数参数          | `findOne(projectId: string)`（非 `name`/`tid`）       |
| 类属性 / 实体字段 | `@Column() deviceId: string`（非 `did`）              |
| DTO 字段          | `createDeviceDto.deviceName`（非 `name`）             |
| API 路由参数      | `@Param('projectId') projectId: string`（非 `:id`）   |
| 事件 payload      | `{ projectId, tenantId, projectName }`（非 `tid`）    |
| Redis key         | `ss:latest:{projectId}:{deviceId}`（非 `tid`/`did`）  |
| InfluxDB bucket   | `ss_node_data_{projectId}`（非 `tid`）                |
| 日志消息          | `log.info({ projectId, deviceId })`（非 `pid`/`did`） |
| 前端 store / 视图 | `device.deviceName`（非 `device.name`）               |
| 文件 / 目录名     | `device.api.ts`（kebab-case 全称）                    |

#### 5.5.4 项目标识符（核心应用）

| 标识符        | 格式                  | 用途                                                                              | 示例                |
| ------------- | --------------------- | --------------------------------------------------------------------------------- | ------------------- |
| `projectId`   | 拼音全拼 kebab-case   | **唯一物理标识符**：目录名 / DB 隔离 / InfluxDB bucket / Redis key / API 路由参数 | `ce-shi-gong-cheng` |
| `tenantId`    | = projectId（当前）   | 多租户预留字段，当前与 `projectId` 等价，勿赋予其他语义                           | `ce-shi-gong-cheng` |
| `projectName` | 中文/任意（用户输入） | 项目显示名称                                                                      | `测试工程`          |

**`projectId` 生成规则**（[project.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-project/src/project.service.ts) `generateProjectId()`）：

- 中文名 → 拼音全拼 kebab-case（如 `测试工程` → `ce-shi-gong-cheng`）
- 英文名 → 直接 kebab-case
- 正则：`/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/`
- 全局唯一，冲突时追加数字后缀（`ce-shi-gong-cheng2`）

#### 5.5.5 设备标识符（核心应用）

| 标识符              | 含义                                           | 注意                          |
| ------------------- | ---------------------------------------------- | ----------------------------- |
| `deviceId`          | 设备主键 UUID（`device.id`）                   | 严禁缩写为 `did`              |
| `deviceName`        | 设备显示名称（TS 属性，DB 列名 `device_name`） | 严禁用 `device.name`（TS 层） |
| `device.deviceCode` | 设备编码（用户可读标识，如 `temp-hum-001`）    | 见下方注                      |

> **关于 `device.tid`**：`tid` 是缩写，违反"禁止缩写"原则。按本规范应命名为 `device.deviceCode`（设备编码）。
>
> **⚠️ 严禁命名为 `tagId`**：`tagId` 在本系统中已固化含义为 **DataTag（数据标签）的 UUID**（后端 1325 处 + 前端 872 处 = 2197 处，如 [redis-latest-value-persist-writer.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-device/src/persist/redis-latest-value-persist-writer.ts) `ss:latest:{projectId}:{deviceId}` Hash field={tagId}）。`device.tid`（设备编码，如 `temp-hum-001`）与 `tagId`（数据标签 UUID）是**完全不同的概念**，若重命名为 `device.tagId` 将造成一名两义。
>
> **迁移策略**：~~当前 DB 列为 `tid`，可采用策略 A（`@Column({ name: 'tid' }) deviceCode`）零 migration 重命名 TS 属性。此项为**已知命名债务**~~ → **策略 B 已实施**（2026-08-03）：DB 列名已改为 `device_code`/`device_name`（snake_case），通过 `renameDeviceColumnsPreSync` pre-sync 迁移自动升级现有项目 DB（11 个库全部迁移成功，数据零丢失）。详见 [14 号文档 §12](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/ss-data/06-优化记录/14-设备标识符命名统一优化方案.md)。

#### 5.5.6 API 路由参数规范

```typescript
// ✅ 正确：路由参数按业务实体全称命名
@Controller('projects/:projectId/devices')
findOne(@Param('projectId') projectId: string, @Param('deviceId') deviceId: string) {}

// ❌ 错误：严禁 :id / :tid / :projectTid 作为项目路由参数
@Controller('projects/:id/devices')          // id 是什么？项目？设备？
@Controller('projects/:tid/devices')         // tid 已重命名为 tenantId
@Controller('projects/:projectTid/devices')  // 方案 B 不引入第三个名字
```

所有项目相关路由参数统一为 `:projectId`；设备相关用 `:deviceId`；标签用 `:tagId`。

#### 5.5.7 `projectinfo.json` 字段规范

```json
// ✅ 正确（仅新字段）
{ "projectId": "ce-shi-gong-cheng", "tenantId": "ce-shi-gong-cheng", "projectName": "测试工程" }

// ❌ 错误（旧字段，仅历史数据残留，新建项目严禁写入）
{ "pid": "csgc", "tid": "ce-shi-gong-cheng", "name": "测试工程" }
```

**向后兼容**（`readProjectInfo()`）：`projectId = raw.projectId ?? raw.pid`；`projectName = raw.projectName ?? raw.name`；`tenantId = raw.tenantId ?? raw.tid ?? raw.projectId`。兼容窗口 6 个月，新建项目仅写入新字段。

#### 5.5.8 存储 Key 规范

| 存储     | Key 格式                                  | 示例                                           |
| -------- | ----------------------------------------- | ---------------------------------------------- |
| InfluxDB | `ss_node_data_{projectId}`                | `ss_node_data_ce-shi-gong-cheng`               |
| Redis    | `ss:latest:{projectId}:{deviceId}` (Hash) | `ss:latest:ce-shi-gong-cheng:2daa6cef-...`     |
| Redis    | `ss:latest:index:{projectId}` (Set)       | `ss:latest:index:ce-shi-gong-cheng`            |
| 文件系统 | `{PROJECTS_DIR}/{projectId}/`             | `data/projects/ce-shi-gong-cheng/`             |
| 项目 DB  | `{projectId}/db/system.db`                | `data/projects/ce-shi-gong-cheng/db/system.db` |

#### 5.5.9 事件 Payload 规范

```typescript
// project.created
{ projectId: string, tenantId: string, projectName: string }
// project.beforeDelete
{ projectId: string, tenantId: string, timestamp: number }
```

订阅方（`InfluxBucketService`、`ProjectDatabaseService`、`RedisLatestValuePersistWriter`）从 `payload.projectId` 取值，严禁 `payload.tid`。

#### 5.5.10 AI 生成代码自查清单

| ❌ 禁止                                                      | ✅ 正确                                                                                            | 原因                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `:id`/`:tid`/`:projectTid` 路由参数                          | `:projectId`/`:deviceId`/`:tagId`                                                                  | 按实体全称，消除歧义                                                |
| `project.pid`/`project.name`/`project.tid`                   | `project.projectId`/`project.projectName`/`project.tenantId`                                       | 字段已重命名                                                        |
| `device.name`（TS 层）                                       | `device.deviceName`                                                                                | 与 `projectName` 一致                                               |
| `device.tid`（设备编码）                                     | `device.deviceCode`                                                                                | `tid` 是缩写；**严禁用 `tagId`**（与 DataTag UUID 冲突，见 §5.5.5） |
| `did`/`pid`/`uid`/`gid`/`rid` 缩写                           | `deviceId`/`projectId`/`userId`/`groupId`/`roleId`                                                 | 全称自解释                                                          |
| `cfg`/`cnt`/`tmp`/`desc`/`addr`/`msg`/`err`/`val`/`idx`/`ts` | `config`/`count`/`temporary`/`description`/`address`/`message`/`error`/`value`/`index`/`timestamp` | 禁止通用缩写                                                        |
| DB 列名直接改                                                | DB 列名与 TS 属性同步用全称 + pre-sync 迁移（`ALTER TABLE RENAME COLUMN`）                         | 策略 B：列名与属性对齐（`device_code`/`device_name` 已实施）        |
| 事件 payload 用 `tid`                                        | 事件 payload 用 `projectId` + `tenantId`                                                           | 事件契约已更新                                                      |
| 参数名 `projectName` 却传 tid 值                             | 参数名 `projectId`，值 = projectId                                                                 | 名实一致                                                            |

---

## 6. 架构关键模式

### 6.1 包间引用

- 前端 ：`@scada-editor/system` → `packages/system/src/index.ts`
- 后端 ：`@ss-node/ss-device` → `packages/ss-device/src/index.ts`
- workspace 包的修改需要重新编译 （`npx tsc` 或 `pnpm build`）才能在其他包中生效

### 6.2 前端模块职责

| 包       | 职责                           | 不应做                |
| -------- | ------------------------------ | --------------------- |
| `core`   | 数据模型、基础服务、i18n、类型 | UI 渲染、具体业务视图 |
| `editor` | 编辑器布局、工具栏、菜单       | 数据中台视图          |
| `system` | 数据中台视图、API、stores      | 编辑器图元逻辑        |
| `shared` | 通用 Vue 组件                  | 业务逻辑              |

### 6.3 后端模块分层

```
Controller  →  Service  →  Repository  →  DB
     ↓
Interceptor/Guard（横切关注点）
     ↓
EventBus（模块间解耦）
```

- 全局模块 （`@Global()`）：`ConfigModule`、`I18nModule`、`LoggerModule`
- `ss-core` 是基础设施包，提供 Auth、EventBus、Pipeline、WebSocket、ConfigWatcher 等
- 业务包 （ss-device/ss-project 等）依赖 ss-core，不直接互相依赖
- 采集器包 （ss-collector-\*）实现 `BaseCollectorService` 抽象类

### 6.4 数据库隔离策略

- 全局配置 → `ss-node.db`（`system_configs`、`users` 表）
- 项目数据 → `{PROJECTS_DIR}/{projectName}/db/system.db`（`devices`、`device_groups` 等表）
- 项目配置 → `projectinfo.json` 文件（不入库）
- `PROJECT_DB_MODE=isolated` 环境变量控制

#### ⚠️ 项目级数据读写强制规则（高频陷阱）

核心原则

：当 `PROJECT_DB_MODE=isolated` 时，所有项目级实体（通过 `projectDbService.registerSystemEntities()` 注册的实体）的读写操作作作必须使用作作 作作`ProjectDatabaseService.getSystemDb(projectId)`作作 作作获取项目对应的 DataSource/Repository作作，，，严禁，，使用全局 `@Inject(getRepositoryToken(Entity))` 注入的 Repository。

判断实体属于哪个数据库

：

| 数据库            | 实体注册方式                                                                      | 示例实体                                                          |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 全局 `ss-node.db` | `TypeOrmModule.forFeature([Entity])` 在 `AppModule` 或全局模块中                  | `User`、`SystemConfig`                                            |
| 项目 `system.db`  | 通过 `projectDbService.registerSystemEntities([Entity])` 在 `onModuleInit` 中注册 | `Device`、`DataTag`、`DeviceGroup`、`HistoricalData`、`AlarmRule` |

✅ 正确写法

（读写项目库）：

```typescript
// 注入 ProjectDatabaseService
constructor(
  private projectDbService: ProjectDatabaseService,
) {}

// 按 projectId 获取项目库 Repository
async findDevice(projectId: string, deviceId: string) {
  const ds = await this.projectDbService.getSystemDb(projectId);
  const repo = ds.getRepository(Device);
  return repo.findOne({ where: { id: deviceId } });
}
```

❌ 错误写法

（读写全局库，查不到项目数据）：

```typescript
// 错误：注入全局 Repository，只查全局 ss-node.db
constructor(
  @Inject(getRepositoryToken(HistoricalData))
  private repo: Repository<HistoricalData>,  // ← 永远的全局库！
) {}

async queryData() {
  return this.repo.find({ ... });  // ← 项目库有数据，但这里查不到！
}
```

Controller 层要求

：所有依赖 `projectId` 的查询接口，必须在请求体中传入 `projectId`，并透传到 Service 层：

```typescript
// 请求体必须包含 projectId
@Post('trend/query')
trendQuery(@Body() body: { tagIds: string[]; projectId?: string; ... }) {
  return this.service.queryTrendData(body.tagIds, ..., body.projectId);
}
```

已验证的受影响模块

：

| 模块     | 文件                                                                                                                                                                 | 修复状态                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 数据查询 | [data-query.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-storage/ss-storage-influx/src/data-query.service.ts) | ✅ 已修复（2026-07-22）         |
| 设备管理 | [device.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-device/src/device.service.ts)                            | ✅ 已使用 `getRepos(projectId)` |
| 数据标签 | ss-datatag                                                                                                                                                           | 需检查                          |
| 报警管理 | ss-alarm                                                                                                                                                             | 需检查                          |

自查方法

：在项目中搜索 `@Inject(getRepositoryToken(` 和 `registerSystemEntities`，确认每个实体是否使用了正确的 Repository 来源。

### 6.5 事件驱动通信

后端模块间通过 `EventBusService`（基于 `EventEmitter2`）通信：

```typescript
// 发布事件
this.eventBus.emitConfigChanged({ configType: 'system', changes: {...} });

// 订阅事件
this.eventBus.on('config.changed', (payload) => { ... });
```

前端通过 WebSocket（Socket.IO）接收后端推送的实时数据。

---

## 7. 测试策略

### 7.1 测试层级

| 层级     | 工具                         | 覆盖率要求     | 命令            |
| -------- | ---------------------------- | -------------- | --------------- |
| 单元测试 | Vitest（前端）/ Jest（后端） | 新增代码 ≥ 90% | `pnpm test`     |
| 集成测试 | Supertest（后端）            | 核心 API 100%  | —               |
| E2E      | Playwright（前端）           | 关键流程       | `pnpm test:e2e` |

### 7.2 测试文件约定

- 文件位置：`__tests__/` 或 `src/__tests__/`
- 命名：`xxx.test.ts`（Vitest）或 `xxx.spec.ts`（Jest/前端的某些旧文件）
- 每个 `it()` 只测一件事
- 测试关注注注行为注注，不关注实现细节

### 7.3 运行测试

```bash
# 前端
cd ss-editor
pnpm test:core       # core 包单元测试
pnpm test:ui         # editor 包单元测试
pnpm test:all        # 全部
pnpm test:e2e        # E2E

# 后端
cd ss-services\ss-node
pnpm test            # 全部测试
pnpm --filter @ss-node/ss-device test   # 单包测试
```

---

## 8. 设计文档规范

### 8.1 文档体系

| 目录             | 内容                  | 面向对象  |
| ---------------- | --------------------- | --------- |
| `01-功能说明/`   | 功能列表、用户手册    | 产品/用户 |
| `02-详细设计/`   | 子系统设计 + 功能整合 | 开发      |
| `03-架构设计/`   | 架构、API、数据库设计 | 开发/架构 |
| `04-开发规范/`   | 编码规范、组件规范    | 开发      |
| `05-前后端联调/` | 联调方案              | 开发      |
| `06-测试方案/`   | 测试方案、报告        | 测试/开发 |
| `07-开发计划/`   | 开发计划              | PM/开发   |
| `08-运维与发布/` | 部署指南              | 运维      |

### 8.2 功能整合文档结构

`docs/02-详细设计/00-功能整合/` 下的文档应包含：

```markdown
# 功能名 — 前后端功能整合

**最后更新**：YYYY-MM-DD
**涉及模块**：前端 `packages/xxx` → 后端 `packages/xxx`

## 1. 功能概述

## 2. 前后端架构（前端组件树 + 后端模块图）

## 3. 核心时序（时序图描述关键交互）

## 4. API 映射表（前端 API ↔ 后端端点）

## 5. 已修复的已知问题

## 6. 详细设计文档链接
```

### 8.3 文档引用

使用 `file:///` 协议的绝对路径创建可点击的文件链接：

```markdown
[SystemLayout.vue](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/layouts/SystemLayout.vue)
```

### 8.4 修改记录规范

所有 `docs/` 下的文档（设计文档、功能整合文档、开发计划、测试报告等）的修改记录（更新记录/版本更新日志）中，**必须包含"模型"列**，记录本次修改使用的 AI 模型名称。AGENTS.md 本身同样适用（见 §13 文档更新记录）。

**表格格式示例**：

```markdown
## 更新记录

| 版本 | 日期       | 更新内容         | 模型            |
| ---- | ---------- | ---------------- | --------------- |
| v1.0 | 2026-07-11 | 初始版本         | —               |
| v1.1 | 2026-07-12 | 新增系统配置管理 | DeepSeek-V4-Pro |
```

**列表格式示例**：

```markdown
## 更新记录

### 2026-07-12

- **模型**: DeepSeek-V4-Pro
- **新增**：第 8 节「.env.ss 配置」
```

**模型名称填写规则**：

- 使用 AI 模型的实际名称，如 `DeepSeek-V4-Pro`、`Claude-4.5-Opus`、`GPT-5` 等
- 历史记录中无法确定模型的，填写 `—`（占位符）
- 多人协作或非 AI 修改的，填写 `人工` 或具体人员

---

## 9. 需求驱动开发流程

当接到新功能需求时，按以下优先级推进：

```
1. 需求理解
   ├─ 读取 docs/01-功能说明/ 和 docs/02-详细设计/ 中的相关文档
   └─ 明确前后端边界与 API 契约

2. 影响分析
   ├─ 使用 Grep/SearchCodebase 搜索相关代码
   ├─ 识别需修改的文件清单
   └─ 评估对现有功能的影响

3. 设计文档
   ├─ 如有新模块：在 docs/02-详细设计/ 创建设计文档
   └─ 如为功能整合：在 docs/02-详细设计/00-功能整合/ 创建整合文档

4. 实现
   ├─ 优先修改共享类型/DTO
   ├─ 后端优先（Controller → Service → Repository）
   ├─ 前端适配（API → Store → View）
   └─ 同步更新 i18n（zh-CN.json + en-US.json）

5. 验证
   ├─ typecheck → lint → test
   ├─ 启动服务验证功能正确性
   └─ 更新 docs/02-详细设计/00-功能整合/ 中的已知问题列表
```

---

## 10. 常见开发任务

### 10.1 新增一个数据中台页面

1. 在 `packages/system/src/router/index.ts` 添加路由配置
2. 在 `packages/system/src/views/` 创建视图组件
3. 在 `SystemLayout.vue` 中添加菜单项（或后续改为在 menu.config.ts 中配置）
4. 在 `zh-CN.json` 和 `en-US.json` 添加 i18n label

### 10.2 新增一个后端业务模块

1. 在 `packages/` 下创建新包（参考 ss-device 结构）
2. 创建 Entity → DTO → Service → Controller → Module
3. 在 `apps/ss-node-server/src/app.module.ts` 注册模块
4. 如需数据库表：更新 `ss-run/ss/data/init/init-system-db.sql`
5. 编写单元测试（`src/__tests__/xxx.service.spec.ts`）

### 10.3 修复后端 workspace 包未生效

```bash
cd ss-services\ss-node
pnpm --filter @ss-node/ss-device build   # 重新编译修改的包
# 重启 dev server
```

### 10.4 后端端口相关

- 默认端口：`4000`（由 `.env.dev` 中的 `PORT` 控制）
- 前端 Vite 代理：`VITE_API_BASE_URL=http://localhost:4000`
- WebSocket URL：`VITE_WS_URL=ws://localhost:4000`
- CORS 配置：`apps/ss-node-server/src/main.ts`

### 10.5 新增系统菜单项

新增一个系统管理菜单项需修改以下 9 个位置 （缺一不可）：

| #   | 文件                                                                                                                                                                                                                                            | 变更内容                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | [XxxView.vue](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/views/settings/)                                                                                                                            | 新建 视图组件，放在 `views/settings/` 下                                                            |
| 2   | [index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/index.ts)                                                                                                                                      | 导出视图组件 `export { default as XxxView }`                                                        |
| 3   | [router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/router/index.ts)（system 包）                                                                                                           | 添加路由配置 `{ path, name, meta: { titleKey } }`                                                   |
| 4   | [router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/apps/web/src/router/index.ts)（web 应用）                                                                                                                   | 添加路由组件映射 `component: () => import(...).then(m => m.XxxView)` + 权限映射 `ROUTE_PERMISSIONS` |
| 5   | [system-menu.config.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/config/system-menu.config.ts)（前端）                                                                                             | 添加菜单项条目（含 `id`、`labelKey`、`path`、`icon`、`roles`）                                      |
| 6   | [system-menu-config.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-system/src/config/system-menu-config.service.ts)（后端）                                                                | 在 `DEFAULT_SYSTEM_MENU` 中添加相同菜单项                                                           |
| 7   | [zh-CN.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/zh-CN.json) / [en-US.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/en-US.json) | 添加 `nav.xxx` 导航键 + 页面内所有翻译键                                                            |
| 8   | [icons.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/common/icons.ts)                                                                                                                               | 如菜单图标不存在，需新增 SVG 图标函数（使用 `s()`、`p()`、`r()`、`l()`、`circle()` 等辅助函数）     |
| 9   | [init-system-db.sql](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-run/ss/data/init/init-system-db.sql)                                                                                                                            | 添加 `INSERT OR IGNORE INTO sys_menus (...)` 语句，确保已有部署的数据库能补增该菜单项               |

数据库同步

（已有部署）：

- 新部署：首次启动时 `SystemMenuConfigService.initDefaultMenus()` 自动从 `DEFAULT_SYSTEM_MENU` 写入 `sys_menus` 表
- 已有部署：
  - 9 号文件 `init-system-db.sql` 中的 `INSERT OR IGNORE` 语句会在下次启动时自动执行
  - `initDefaultMenus()` 已改为非空表时调用 `insertMissingMenus()` 递归补增缺失项，不再仅在表为空时写入
  - 也可手动执行 SQL 语句立即生效

icon 名称必须与

&#x20;

`icons.ts`

&#x20;

中

&#x20;

`iconMap`

&#x20;

的 key 一致

，否则渲染为默认圆形图标。

i18n 缺失的表现

：菜单项显示原始 key 字符串（如 `system.nav.databaseOps`），说明翻译键未在 `zh-CN.json` / `en-US.json` 的 `nav` 段中添加。`nav.xxx` 键用于菜单项显示文本，`system.xxx.*` 键用于页面内文本。两者缺一不可。

---

## 11. 关键文件速查

### 前端核心文件

| 文件                                                                                                                               | 职责                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [SystemLayout.vue](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/layouts/SystemLayout.vue) | 数据中台布局（侧栏+顶栏+主内容区） |
| [router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/apps/web/src/router/index.ts)                  | Web 应用路由定义                   |
| [router/index.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/router/index.ts)           | System 包路由配置导出              |
| [zh-CN.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/zh-CN.json)             | 中文翻译（数据中台）               |
| [menu.config.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/editor/src/config/menu.config.ts)      | 编辑器工具栏菜单配置               |

### 后端核心文件

| 文件                                                                                                                                                           | 职责                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [main.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/apps/ss-node-server/src/main.ts)                                         | NestJS 启动入口               |
| [app.module.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/apps/ss-node-server/src/app.module.ts)                             | 根模块                        |
| [init-system-db.sql](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-run/ss/data/init/init-system-db.sql)                                           | 数据库初始化脚本（system.db） |
| [system-config.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-system/src/config/system-config.service.ts) | DB 配置服务（key-value）      |
| [config-watcher.service.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-core/src/config/config-watcher.service.ts) | JSON 文件监听服务             |
| [websocket.gateway.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-core/src/websocket/websocket.gateway.ts)        | WebSocket 网关                |
| [user.entity.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-services/ss-node/packages/ss-core/src/core/user/entities/user.entity.ts)           | 用户实体（角色枚举）          |

### 设计文档

| 文档                                                                                                                                 | 内容                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| [后端整体架构](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/02-详细设计/ss-services/00-整体设计/后端整体架构设计.md) | 后端架构、模块分层、包职责   |
| [前端架构设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/前端-架构设计.md)                            | 前端架构、图元系统、渲染系统 |
| [后端框架设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/后端-框架设计.md)                            | NestJS 框架设计              |
| [后端数据库设计](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/后端-数据库设计.md)                        | 数据库表结构                 |
| [后端开发规范](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/后端-开发规范.md)                            | 后端编码规范                 |
| [前端开发指引](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/前端-开发指引.md)                            | 前端开发环境、调试           |
| [功能列表](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/01-功能说明/功能列表.md)                                     | 364 项功能的完成率追踪       |
| [功能整合目录](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/02-详细设计/00-功能整合/)                                | 前后端功能整合文档           |

---

## 12. 调试与诊断

### 前端

- Vite dev server 默认端口 `5173`，API 代理到 `localhost:4000`
- `VITE_API_BASE_URL` 环境变量控制 API 目标
- 调试跳过认证：设置 `VITE_DEBUG_SKIP_AUTH=true`（前端路由守卫跳过 token 检查）

### 后端

- 端口：`4000`（`.env.dev` 中的 `PORT`）
- 环境变量优先于数据库配置（`SystemConfigService.get()` 先查 `process.env`）
- `debug-mock-token`：非生产模式下可用 mock token 跳过 JWT 校验
- SQLite 文件位置：
  - 全局：`ss-services/ss-node/data/db/ss-node.db`
  - 项目：`{PROJECTS_DIR}/{projectName}/db/system.db`
- 日志通过 `StructuredLogger`（`@ss-node/ss-core`）输出

### workspace 包编译问题

修改 workspace 包后，需重新编译该包才能在依赖方生效：

```bash
cd ss-services\ss-node
pnpm --filter @ss-node/ss-device build
# 然后重启 dev server
```

前端同理：

```bash
cd ss-editor
pnpm --filter @scada-editor/core build
```

### 12.4 启动失败与重试

开发中遇到启动失败、热更新卡死、端口占用、或 workspace 包修改未生效时，，，必须使用，， ，，`bin/`，， ，，脚本处理，不要手动删除，， ，，`node_modules`、`dist`、`.vite`，， ，，等目录，，。

#### 推荐重试流程

```powershell
# Step 1: 关闭所有 dev server 窗口，杀掉残留 Node 进程
.\bin\kill-node.bat

# Step 2: 清理缓存 + 重新编译 workspace 包（前端 Vite 缓存 + 后端 dist/tsbuildinfo）
.\bin\clear-vite-cache.bat

# Step 3: 重新启动对应模式
.\bin\start.bat          # 或 start-data.bat / start-scada.bat
```

#### 常见症状 → 对应脚本

| 症状                                  | 原因                 | 处理脚本                                                                                                                                      |
| ------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE` 端口被占用               | 上次进程未正常退出   | [`kill-node.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/kill-node.bat) → 重新启动                                       |
| Vite 报「依赖预构建过期」/ 页面白屏   | `.vite` 缓存损坏     | [`clear-vite-cache.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/clear-vite-cache.bat)                                    |
| workspace 包修改未生效                | dist 未重新编译      | [`clear-vite-cache.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/clear-vite-cache.bat)（已含后端 `pnpm build`）           |
| 后端模块找不到 / `Cannot find module` | workspace 包未编译   | `cd ss-services\ss-node && pnpm build` → [`start-backend.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/start-backend.bat) |
| TypeScript 增量缓存导致类型错误       | `*.tsbuildinfo` 过期 | [`clear-vite-cache.bat`](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/bin/clear-vite-cache.bat)（已清理 tsbuildinfo）              |

#### 切换产品模式

调试不同产品形态时，先 `kill-node.bat` 停掉当前模式服务，再启动目标模式，避免端口冲突：

```powershell
.\bin\kill-node.bat         # 停掉当前模式
.\bin\start-data.bat        # 切换到 data 模式（或 start-scada.bat）
```

> `clear-vite-cache.bat` 的执行步骤：① 重新编译 `@scada-editor/editor` → ② 清理前端 Vite 依赖缓存 → ③ 清理后端 workspace 包 `dist/` 与 `*.tsbuildinfo` → ④ 重新 `pnpm build` 后端 → ⑤ 启动前端 dev server。后端需另行通过 `start-backend.bat` 启动。

---

## 13. 文档更新记录

> 本记录追踪 AGENTS.md 本身的变更，遵循 §8.4 修改记录规范（含"模型"列）。

| 版本 | 日期       | 更新内容                                                                                                                                                                                                                                                                                                                                                                               | 模型            |
| ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| v1.0 | 2026-07-11 | 初始版本：项目导航索引、技术栈、仓库结构、快速启动、代码规范、架构模式、测试策略、设计文档规范、关键文件速查、调试诊断                                                                                                                                                                                                                                                                 | —               |
| v1.1 | 2026-07-19 | 新增 §8.4 修改记录规范（`docs/` 下文档更新日志须含"模型"列）                                                                                                                                                                                                                                                                                                                           | —               |
| v1.2 | 2026-07-30 | 更新启动失败重试流程（§12.4 `kill-node`/`clear-vite-cache` 脚本）；最后更新日期同步                                                                                                                                                                                                                                                                                                    | DeepSeek-V4-Pro |
| v1.3 | 2026-08-02 | `event.db` 废弃相关内容更新；数据库统一为 `system.db` 单文件；移除 `init-event-db.sql` 引用；告警记录表 `alm_alarm_records` 合并入 `init-system-db.sql`                                                                                                                                                                                                                                | GLM-5.2         |
| v1.4 | 2026-08-03 | 新增 §5.5 标识符与变量命名规范（强制）：禁止缩写全称命名；领域标识符对照表（`pid`→`projectId` 等 8 项）；通用缩写禁止清单（32 项）；11 个应用场景全覆盖；项目/设备标识符、API 路由参数、`projectinfo.json` 字段、存储 Key、事件 payload、AI 自查清单；修正 §8.4 格式                                                                                                                   | GLM-5.2         |
| v1.5 | 2026-08-03 | 修正 §5.5.1/§5.5.5/§5.5.10：`device.tid`（设备编码）推荐全称由 `tagId` 改为 `deviceCode`——经查 `tagId` 已固化含义为 DataTag UUID（后端 1325 + 前端 872 = 2197 处），若用于设备编码将造成一名两义                                                                                                                                                                                       | GLM-5.2         |
| v1.6 | 2026-08-03 | L3 重构实施完成：`device.tid` → `device.deviceCode` 全量落地。后端 ss-device（实体/DTO/Service/导入导出/备份/错误常量）+ ss-collector-sdk（IDeviceContext）+ ss-cli（设备创建向导/命令）+ ss-core/ai（backend-tools）；前端 api types + device.api.ts + 6 视图组件 + i18n；后端 9 个 spec + 前端 5 个测试文件同步更新；DB 列名保留 `tid`（策略 A 零 migration）；导入兼容旧 `tid` 字段 | GLM-5.2         |
| v1.7 | 2026-08-03 | 策略 B 实施完成：DB 列名 `tid`→`device_code` / `name`→`device_name`（snake_case）。更新 §5.5.5/§5.5.10：实体 `@Column` name 属性更新；init-system-db.sql + 001-initial-schema.sql 同步；新增 `renameDeviceColumnsPreSync` pre-sync 迁移（复用 `migrateNullProjectIdsPreSync` 模式）；11 个现有项目 DB 全部自动迁移成功，数据零丢失；467 测试全通过；设备 CRUD API 验证通过             | GLM-5.2         |

---

最后更新：2026-08-03
