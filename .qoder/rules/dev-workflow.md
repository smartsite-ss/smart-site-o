---
description: "SS-v7 开发流程：需求驱动开发流程、常见开发任务（新增页面/后端模块）、设计文档规范"
version: "1.0.0"
---

# 开发工作流

## 需求驱动开发流程

当接到新功能需求时，按以下优先级推进：

```
1. 需求理解
   ├─ 读取 docs/01-功能说明/ 和 docs/02-详细设计/ 中的相关文档
   └─ 明确前后端边界与 API 契约

2. 影响分析
   ├─ 搜索相关代码，识别需修改的文件清单
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

## 常见开发任务

### 新增数据中台页面

1. 在 `packages/system/src/router/index.ts` 添加路由配置
2. 在 `packages/system/src/views/` 创建视图组件
3. 在 `SystemLayout.vue` 中添加菜单项（或后续改为在 menu.config.ts 中配置）
4. 在 `zh-CN.json` 和 `en-US.json` 添加 i18n label

### 新增后端业务模块

1. 在 `packages/` 下创建新包（参考 ss-device 结构）
2. 创建 Entity → DTO → Service → Controller → Module
3. 在 `apps/ss-data-server/src/app.module.ts` 注册模块
4. 如需数据库表：更新 `data/init/init-system-db.sql`
5. 编写单元测试（`src/__tests__/xxx.service.spec.ts`）

## 功能整合文档结构

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

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
