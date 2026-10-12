# 03 · 前端开发（ss-editor）

前端是 Vue 3 + Vite 的 pnpm 工作区，包含若干**库包**（`@scada-editor/*`）和一个**宿主应用**（`scada-editor-web`）。开发期通过 Vite 直接消费库包源码，无需先构建库。

## 1. 包结构

| 包名 | 路径 | 作用 |
| --- | --- | --- |
| `@scada-editor/core` | `packages/core` | 核心：状态管理、画布引擎抽象、共享类型 |
| `@scada-editor/editor` | `packages/editor` | **编辑器主体**：图形编辑、图层、画布页（`graphic-editing/`、`canvas-page/`）等 Vue 组件 |
| `@scada-editor/system` | `packages/system` | 管理端 / 系统 UI |
| `@scada-editor/plugin-sdk` | `packages/plugin-sdk` | 插件 SDK，提供 `@Graphic({})` 装饰器（实验性装饰器） |
| `packages/plugins` | `packages/plugins` | 内置插件（各采集协议可视化组件等） |
| `scada-editor-web` | `apps/web` | **宿主应用**：Vite 配置、路由、代理、运行模式 |

## 2. 运行模式（modes）

前端按产品模式拆分，由 Vite `--mode` 与对应 `.env` 控制：

| mode | 说明 | 端口 |
| --- | --- | --- |
| `development`（默认 / full 壳） | 完整功能壳，含 `/preview` | **5173** |
| `data` | 数据中台/系统管理 | 5175 |
| `scada` | 编辑/采集 | 5174 |

> 端口由 `.env.{mode}` 中的 `VITE_PORT` 决定，默认 5173。注意 5173 必须留给 full 壳，data/scada 另占 5175/5174，避免 `/preview` 路由被占用后重定向异常。

## 3. 常用命令

```bat
cd ss-editor

pnpm install                 安装依赖

pnpm dev                     启动插件 CLI 开发（构建插件 + 监听）
pnpm dev:web                 仅启动 web 宿主（vite --mode development）
pnpm dev:full / dev:scada / dev:data   不同产品模式

pnpm build:web               生产构建（core → editor → system → web，--mode production）
pnpm build:web:full / :scada / :data
pnpm --filter scada-editor-web preview   预览构建产物

pnpm typecheck               vue-tsc --noEmit
pnpm test                    单元测试（vitest）
pnpm lint                    eslint
```

## 4. 开发服务器与代理

`apps/web/vite.config.ts`：

- 开发服务器默认端口 `5173`（可被 `VITE_PORT` 覆盖）。
- 代理：
  - `/api` → 后端（`VITE_API_BASE_URL`，默认 `http://localhost:4000`），并禁用超时以支持 SSE 流式响应。
  - `/socket.io` → 后端（`ws: true`），用于实时数据推送。

前端通过 `VITE_API_BASE_URL` 定位后端；开发期默认指向 `http://localhost:4000`。调试开关 `VITE_DEBUG_SKIP_AUTH`（仅 `.env.development`）可在前端跳过鉴权，但**后端不识别**对应的 mock token，切勿用于生产。

## 5. 插件机制

- 内置插件位于 `packages/plugins/`，由 `packages/plugins/scripts/plugins-cli.cjs` 统一构建/校验/开发。
- 插件使用 `@Graphic({})` 装饰器（`@scada-editor/plugin-sdk` 提供），类型声明在 `plugin-sdk` 内。
- 新建插件参考 `packages/create-plugin/`。

## 6. 跨包导入注意事项（踩坑）

编辑器库包（`packages/editor` 等）在**宿主应用 `apps/web` 的 Vite 上下文**中也会被直接编译。此时：

- `@scada-editor/core`、`@scada-editor/system` 等**工作区包别名**可用（由 `apps/web` 的 Vite/tsconfig 解析）。
- 但编辑器库包**自身的 `@/` 别名**（指向 `packages/editor/src`）在 web 上下文中会解析失败，报 `Failed to resolve import "@/..."`。

**规范**：在库包源码内引用同包文件时，**优先用相对路径**（如 `'../../canvas-page/templates/WidgetTemplatePanel.vue'`），或改用 `@scada-editor/*` 工作区别名；不要用 `@/...` 跨文件导入，避免被 web 编译时误解析。详见 [04-常见问题排查](./04-troubleshooting.md)。
