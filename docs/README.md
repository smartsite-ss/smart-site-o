# Smart Site O · 开发指引

本仓库是 Smart SCADA 的**开源精简版**（smart-site-o），采用 pnpm 多工作区（monorepo）结构，包含两大独立工作区：

| 工作区 | 路径 | 定位 | 技术栈 |
| --- | --- | --- | --- |
| 前端编辑器 | `ss-editor/` | Web 端 SCADA 可视化编辑器 / 管理后台 | Vue 3 + Vite 5 + Pinia + Naive UI + ECharts + Monaco + TypeScript |
| 后端服务 | `ss-services/ss-node/` | NestJS 业务服务与采集网关 | NestJS 10 + TypeORM + SQLite3 + Socket.IO + ioredis + Swagger |

根目录下的 `bin/` 提供了一键启动脚本：`install-deps.bat`（装依赖）、`start-backend.bat`（启动后端）、`start-frontend.bat`（启动前端）、`start.bat`（全栈）。

---

## 文档体系（四大类）

| 类别 | 文档 | 说明 |
| --- | --- | --- |
| 快速开始 | [环境搭建与启动](./01-getting-started.md) · [开发环境搭建手册](./开发环境搭建手册.md) | 前置条件、依赖安装、首次运行、生产构建 |
| 用户手册 | [用户手册](./用户手册.md) | 组态编辑器与数据中台的使用操作 |
| 开发指引 | 本文（开发指引）· [后端开发](./02-backend.md) · [前端开发](./03-frontend.md) | 架构、包结构、产品/运行模式、开发工作流、插件机制 |
| 部署运维 | [部署运维](./部署运维.md) · [常见问题排查](./04-troubleshooting.md) | 生产部署、配置、备份、升级、监控、排错 |

---

## 快速上手（TL;DR）

```bat
:: 1. 安装依赖（前端 + 后端）
bin\install-deps.bat

:: 2. 启动后端（安装→构建全部包→拷贝 SQL→nest watch）
bin\start-backend.bat

:: 3. 另开一个终端启动前端（Vite，默认 5173）
bin\start-frontend.bat
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:4000 （Swagger 文档：http://localhost:4000/api/docs）
- 首次启动数据库未初始化：浏览器打开前端后会引导到 **初始化向导**，先创建 admin 账号即可登录。

> 端口说明：后端默认 `4000`（由 `.env.base` / 产品模式决定）；前端默认 `5173`，代理 `/api`、`/socket.io` 到后端。详见对应章节。
