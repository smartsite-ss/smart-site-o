# 01 · 环境搭建与启动

## 1. 前置条件

| 依赖 | 版本要求 | 说明 |
| --- | --- | --- |
| Node.js | **18.x 及以上**（本仓库在 20.x / 24.x 验证） | 同时需要 `npm`（用于全局安装 pnpm） |
| pnpm | 与 lockfile `lockfileVersion: '9.0'` 兼容即可（全局 pnpm 10.x 可用） | 见下方「pnpm 版本说明」 |
| 构建工具链 | Windows：Visual Studio Build Tools（含 C++）+ Python 3 | 用于编译原生模块（见下） |

### 原生模块
后端依赖若干需要本地编译的原生模块：`sqlite3`、`bcryptjs`（纯 JS，无原生）、`serialport`（采集插件可能用到）等。若 `pnpm install` 阶段编译失败，请先安装：

- **Visual Studio Build Tools**：勾选「使用 C++ 的桌面开发」工作负载。
- **Python 3.x**（添加到 PATH，node-gyp 需要）。

安装完成后通常无需额外配置，pnpm 会自动调用 `node-gyp` 编译。

### pnpm 版本说明（重要）
项目 `package.json` 用 `packageManager` 锁定了 pnpm 版本。部分机器上 pnpm 的**自管理版本切换**会尝试在 `node_global\.tools` 下写文件并因权限被拒（EPERM），导致 `pnpm` 命令直接失败。

本仓库已在两个子工作区的 `.npmrc` 中加入：

```ini
manage-package-manager-versions=false
```

以直接使用全局已安装的 pnpm，绕开该问题。**不要删除这两处配置**，否则新环境可能再次踩坑。详见 [04-常见问题排查](./04-troubleshooting.md)。

---

## 2. 安装依赖

推荐用根目录脚本一键安装：

```bat
bin\install-deps.bat
```

脚本会依次执行：

```bat
cd ss-editor           && pnpm install
cd ss-services/ss-node && pnpm install
```

> 仅安装依赖，**不构建**。如需可复现安装可加 `--frozen-lockfile`。

也可手动分别在两个工作区内 `pnpm install`。

---

## 3. 启动（开发模式）

### 方式 A：分别启动（推荐，便于看日志）

```bat
:: 终端 1：后端
bin\start-backend.bat

:: 终端 2：前端
bin\start-frontend.bat
```

`start-backend.bat` 会按顺序执行四个阶段：

1. **Phase A** `pnpm install`（若未安装）
2. **Phase B** `pnpm build`（用 `pnpm -r build` 构建全部 24 个包 + 应用）
3. **Phase C** 拷贝 SQL 初始化脚本到 `ss-run/ss/data/init/`
4. **Phase D** `nest start --tsc --watch` 启动热重载服务

完成后访问：

- 前端：http://localhost:5173
- 后端：http://localhost:4000 ，Swagger：http://localhost:4000/api/docs

### 方式 B：一键全栈

```bat
bin\start.bat
```

内部即依次调用 `start-backend.bat` 与 `start-frontend.bat`。

---

## 4. 首次运行 · 初始化向导

新克隆的仓库数据库为空，首次访问后端会返回「未初始化」状态（`GET /api/v1/setup/status` → `initialized:false`），此时用 `test/test` 登录会得到 **401**（属正常）。

按前端引导进入 **初始化向导（/setup）**，至少完成：

1. **Step 1 创建管理员账号**（`POST /api/v1/setup/step1`，必填 `username/password/email`）
2. **Step 2 基本配置**（站点名、时区、语言）
3. **Step 3 数据配置**
4. **Step 4 完成初始化**

之后即可用创建的管理员账号登录。

---

## 5. 生产构建

### 后端

```bat
cd ss-services/ss-node
pnpm -r build                       :: 构建全部包与服务
pnpm --filter ss-node-server start:prod   :: APP_ENV=pro，运行 dist/main（NODE_ENV=production）
```

生产环境 `.env` 由发布脚本（`publish-node.bat`）在服务目录生成单文件 `.env`。

### 前端

```bat
cd ss-editor
pnpm build:web                    :: core → editor → system → web（vite build --mode production）
pnpm --filter scada-editor-web preview
```

> ⚠️ 生产构建**必须使用 `--mode production`**。`.env.full` 等文件含调试开关（如跳过鉴权），仅限开发使用；后端不识别 mock token，误用会导致正式环境异常。

---

## 6. 目录速览

```
smart-site-o/
├─ bin/                 启动 / 安装脚本
├─ docs/                本文档
├─ ss-editor/           前端工作区（pnpm workspace）
│  ├─ packages/
│  │  ├─ core/          @scada-editor/core
│  │  ├─ editor/        @scada-editor/editor（编辑器主体）
│  │  ├─ system/        @scada-editor/system（管理端）
│  │  ├─ plugin-sdk/    @scada-editor/plugin-sdk
│  │  ├─ plugins/       内置插件
│  │  └─ apps/web/      scada-editor-web 宿主应用
│  └─ pnpm-workspace.yaml
└─ ss-services/ss-node/ 后端工作区（pnpm workspace）
   ├─ packages/         @ss-node/* 业务库（14+ 个）
   ├─ apps/ss-node-server/  NestJS 应用入口
   └─ pnpm-workspace.yaml
```
