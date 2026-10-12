# 02 · 后端开发（ss-services/ss-node）

后端是一个 NestJS monorepo，由 **16+ 个库包（`@ss-node/*`）** 和一个 **NestJS 应用（`ss-node-server`）** 组成。应用通过 `app.module.ts` 按「产品模式」按需装配模块。

## 1. 包结构

| 包名 | 作用 |
| --- | --- |
| `@ss-node/ss-sdk` | 共享 SDK：公共 DTO、类型、i18n 资源（i18n 加载路径指向此包 `src/i18n`） |
| `@ss-node/ss-core` | 核心能力：认证/守卫、Redis、EventBus、Logger、PathResolver、WebSocket 网关、AI 模块 |
| `@ss-node/ss-i18n` | 国际化服务 |
| `@ss-node/ss-datatag` | 测点/数据标签 |
| `@ss-node/ss-datasource` | 数据源管理 |
| `@ss-node/ss-device` | 设备管理：状态服务、网关、控制器（实时数据推送） |
| `@ss-node/ss-system` | 系统管理：初始化向导、备份、健康检查、配置、基础服务 |
| `@ss-node/ss-alarm` | 告警 |
| `@ss-node/ss-project` | 项目与组件模板（widget templates） |
| `@ss-node/ss-report` | 报表 |
| `@ss-node/ss-script` | 脚本执行 |
| `@ss-node/ss-storage` (+ `ss-storage-influx` / `-influx3` / `-tdengine`) | 时序存储（InfluxDB / TDengine） |
| `@ss-node/ss-collector/*` | 采集协议：modbus / mqtt / opcua / s7 / virtual，共享 `ss-collector-sdk` |
| `@ss-node/ss-cli` | 命令行工具 |
| `ss-node-server` | **应用入口**：`apps/ss-node-server/src/{main.ts,app.module.ts}` |

## 2. 产品模式（Product Mode）

通过环境变量 `APP_PRODUCT_MODE` 控制按需加载模块，默认 `full`：

| 模式 | 行为 |
| --- | --- |
| `full`（默认） | scada 模块 + data 模块全部加载 |
| `scada` | 仅加载 scada（编辑/采集）模块 |
| `data` | 仅加载 data（数据中台/系统管理）模块 |

环境变量加载顺序（`app.module.ts` 中 `buildEnvFilePaths`）：

```
生产 (NODE_ENV=production):   process.cwd()/.env（单文件）
开发:                         .env.local（本地覆盖，gitignore） → .env.{productMode} → .env.base
未设置 APP_PRODUCT_MODE 时:    .env.{APP_ENV|dev} → .env.base
```

## 3. 配置（.env）

后端配置分散在多个 env 文件（均位于 `ss-services/ss-node/`）：

- `.env.base` — 公共配置（端口基础值、路径变量等）
- `.env.dev` / `.env.data` / `.env.scada` — 各产品模式专有配置
- `.env.example` — **模板**，可复制为 `.env.local` / `.env.dev` 后填入
- `.env.local` — 本地覆盖，**不入库**（已被 gitignore）

常用变量：

| 变量 | 说明 |
| --- | --- |
| `PORT` | HTTP 监听端口（默认 4000） |
| `APP_PRODUCT_MODE` | full / scada / data |
| `JWT_SECRET` | Token 签名密钥 |
| `INFLUXDB_URL/TOKEN/ORG/BUCKET` | 时序库 |
| `MQTT_BROKER_URL` / `OPCUA_SERVER_URL` / `MODBUS_TCP_*` | 采集协议 |
| `CORS_ORIGINS` | 允许跨域的前端源（默认含 5173/4000） |
| `LOG_DIR` / `LOG_LEVEL` | 日志目录与级别 |
| `SS_RUN_DIR` / `RUN_DIR` / `DICTS_DIR` / `TEMPLATES_DIR` | 运行时数据目录（指向 `ss-run/ss/...`） |

> 运行时数据默认落在仓库外的 `ss-run/ss/...`（`start-backend.bat` 的 Phase C 会创建 `ss-run/ss/data/init` 并拷贝 SQL）。

## 4. 常用命令

```bat
cd ss-services/ss-node

pnpm install                      安装依赖
pnpm build                        pnpm -r build（构建全部包 + 应用）
pnpm build:packages               仅构建库包（不含应用）
pnpm --filter <pkg> build         单包构建（如 @ss-node/ss-device）

pnpm dev                          等价于 pnpm --filter ss-node-server dev
pnpm --filter ss-node-server start:dev   开发热重载（nest watch）
pnpm --filter ss-node-server start:prod  生产运行（dist/main）
pnpm --filter ss-node-server typecheck   tsc --noEmit
pnpm -r test                      全量测试（jest，passWithNoTests）
```

应用入口脚本（`apps/ss-node-server/package.json`）：

- `start:dev`：`NODE_ENV=development + nest start --tsc --watch`
- `start:prod`：`APP_ENV=pro + node --require reflect-metadata dist/main`

## 5. 开发工作流建议

- **增量热重载**：`start:dev` 用 `nest build --tsc --watch` + 增量编译，改应用或任意库源码后自动重启。
- **循环依赖注意**：存在包间循环依赖（`ss-alarm ↔ ss-project`、`ss-device ↔ ss-system`）。`pnpm -r build` 在循环图上拓扑序不可靠，可能让某包先于其依赖构建而报 `TS2307`。若遇到此问题，先手动按依赖顺序构建关键包（`ss-system → ss-device → ss-alarm → ss-project`），再跑 `pnpm -r build`。详见 [04-常见问题排查](./04-troubleshooting.md)。
- **类型产物**：每个库包的 `package.json` 以 `dist/index.d.ts` 作为 `types` 入口，依赖包通过 tsconfig `paths` 或 `node_modules` 软链解析。务必保证依赖包的 `dist/index.*` 已生成（构建无误）。
- **Swagger**：启动后访问 `http://localhost:4000/api/docs` 查看与调试接口。

## 6. 健康检查接口

| 路径 | 说明 |
| --- | --- |
| `GET /api/v1/health` | 简单健康检查（公开） |
| `GET /api/v1/health/details` | 详细健康 |
| `GET /api/v1/health/liveness` / `/readiness` | K8s 探针 |
| `GET /api/v1/setup/status` | 初始化状态（`initialized`/`steps`） |
