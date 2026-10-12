---
description: "SS-v7 后端架构规则：Controller-Service-Repository 分层、EventBus 事件通信、数据库隔离策略、全局模块"
globs: "ss-services/**/*.ts"
version: "1.0.0"
---

# 后端架构规则

## 模块分层

严格遵循三层架构：

```
Controller  →  Service  →  Repository  →  DB
     ↓
Interceptor/Guard（横切关注点）
     ↓
EventBus（模块间解耦）
```

- **全局模块**（`@Global()`）：`ConfigModule`、`I18nModule`、`LoggerModule`
- **`ss-core`** 是基础设施包，提供 Auth、EventBus、Pipeline、WebSocket、ConfigWatcher 等
- **业务包**（ss-device/ss-project 等）依赖 ss-core，**不直接互相依赖**
- **采集器包**（ss-collector-*）实现 `BaseCollectorService` 抽象类

**禁止事项**：
- Controller 中直接调用 Repository
- 业务包之间互相 import（必须通过 EventBus 或 shared DTO 解耦）
- 在 Service 中直接操作其他模块的 Entity

## 事件驱动通信

后端模块间通过 `EventBusService`（基于 `EventEmitter2`）通信，不得直接跨模块调用：

```typescript
// 发布事件
this.eventBus.emitConfigChanged({ configType: 'system', changes: {...} });

// 订阅事件
this.eventBus.on('config.changed', (payload) => { ... });
```

前端通过 WebSocket（Socket.IO）接收后端推送的实时数据。

## 数据库隔离策略

- 全局配置 → `ss-data/data/ss-data.db`（`system_configs`、`users` 表）
- 项目数据 → `{PROJECTS_DIR}/{projectName}/db/system.db`（`devices`、`device_groups` 等表）
- 项目配置 → `projectinfo.json` 文件（不入库）
- `PROJECT_DB_MODE=isolated` 环境变量控制隔离模式

## workspace 包编译

修改 workspace 包后，需重新编译该包才能在依赖方生效：

```bash
cd ss-services\ss-data
pnpm --filter @ss-data/ss-device build
# 然后重启 dev server
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
