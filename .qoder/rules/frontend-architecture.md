---
description: "SS-v7 前端架构规则：模块职责边界、包间引用、workspace 编译、变更强制同步国际化与统一样式"
globs: "ss-editor/**/*.{vue,ts,css}"
version: "1.1.0"
---

# 前端架构规则

## 包间引用

- 前端包引用格式：`@scada-editor/system` → `packages/system/src/index.ts`
- **workspace 包的修改需要重新编译**（`npx tsc` 或 `pnpm build`）才能在其他包中生效

```bash
cd ss-editor
pnpm --filter @scada-editor/core build
```

## 模块职责边界

| 包 | 职责 | 禁止 |
|----|------|------|
| `core` | 数据模型、基础服务、i18n、类型定义 | UI 渲染、具体业务视图 |
| `editor` | 编辑器布局、工具栏、菜单 | 数据中台视图 |
| `system` | 数据中台视图、API 调用、Pinia stores | 编辑器图元逻辑 |
| `shared` | 通用 Vue 组件 | 业务逻辑、API 调用 |

**关键约束**：各包必须严格遵循职责边界，禁止跨职责引用。例如：
- `editor` 包不能直接使用 `system` 包的视图组件
- `core` 包不能包含任何 Vue 组件或 UI 渲染代码
- `shared` 包的组件必须是无业务逻辑的纯展示组件

## 前端变更强制要求

**任何前端新增或修改，必须同步完成以下两项处理，否则视为变更未完成：**

### 1. 国际化（i18n）同步

- 所有新增/修改的 UI 文本必须使用 `$t('system.xxx.yyy')`，**严禁硬编码中文或其他语言文本**
- 同步在以下文件中添加/更新翻译 key：
  - [zh-CN.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/zh-CN.json)
  - `en-US.json`
- 变更完成后必须确认：两个语言文件中的 key 一致，无一遗漏

### 2. 统一样式（CSS 变量）同步

- 所有颜色、间距、阴影等样式值必须使用 CSS 变量，**严禁硬编码颜色值**（如 `#ffffff`、`rgb()` 等）
- 常用变量：`--primary`、`--surface`、`--text`、`--text-secondary`、`--border`、`--background` 等
- 变更完成后必须确认：新增/修改的样式中无不通过 CSS 变量的硬编码值

```css
/* ✅ 正确 */
background: var(--surface);
color: var(--text);
border: 1px solid var(--border);

/* ❌ 错误 */
background: #ffffff;
color: #333333;
border: 1px solid #e5e5e5;
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
