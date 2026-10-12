---
description: "SS-v7 测试策略：测试层级、文件约定、覆盖率要求、运行命令 — 生成测试代码时参考此规则"
version: "1.0.0"
---

# 测试策略

## 测试层级

| 层级 | 工具 | 覆盖率要求 | 命令 |
|------|------|-----------|------|
| 单元测试 | Vitest（前端）/ Jest（后端） | 新增代码 ≥ 90% | `pnpm test` |
| 集成测试 | Supertest（后端） | 核心 API 100% | — |
| E2E | Playwright（前端） | 关键流程 | `pnpm test:e2e` |

## 测试文件约定

- 文件位置：`__tests__/` 或 `src/__tests__/`
- 命名：`xxx.test.ts`（Vitest）或 `xxx.spec.ts`（Jest/前端的某些旧文件）
- 每个 `it()` 只测一件事
- 测试关注**行为**，不关注实现细节

## 运行测试

```bash
# 前端
cd ss-editor
pnpm test:core       # core 包单元测试
pnpm test:ui         # editor 包单元测试
pnpm test:all        # 全部
pnpm test:e2e        # E2E

# 后端
cd ss-services\ss-data
pnpm test            # 全部测试
pnpm --filter @ss-data/ss-device test   # 单包测试
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
