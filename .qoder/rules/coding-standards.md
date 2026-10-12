---
description: "SS-v7 代码规范：门禁流程、主题样式、国际化、TypeScript 严格模式、命名规范、提交信息格式"
alwaysApply: true
version: "1.1.0"
---

# 代码规范

## 门禁流程

编写代码 → typecheck ✓ → lint ✓ → test ✓ → Code Review ✓ → 提交

| 关卡 | 命令 | 阻断条件 |
|------|------|------|
| 类型检查 | `pnpm typecheck` | 任何 Error |
| 代码风格 | `pnpm lint` | 任何 Error |
| 单元测试 | `pnpm test` | 任何失败 |

## 强制规则

### 1. 主题样式（CSS 变量）

**所有颜色必须用 CSS 变量，严禁硬编码颜色值。前端新增/修改样式时必须同步完成统一样式处理。**

常用变量：`--primary`、`--surface`、`--text`、`--text-secondary`、`--border`、`--background` 等。

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

### 2. 国际化（i18n）

**前端新增/修改 UI 文本必须同步完成国际化处理。** 所有 UI 文本必须使用 `$t('system.xxx.yyy')`，**严禁硬编码中文或其他语言文本**。同步在以下两个文件中添加/更新翻译 key，确保 key 一致无遗漏：
- [zh-CN.json](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/packages/system/src/locales/zh-CN.json)
- `en-US.json`

### 3. TypeScript 严格模式

**禁止 `any`**，优先使用具体类型或泛型。使用 `unknown` 替代 `any` 处理未知类型。

## 命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| Vue SFC 文件 | PascalCase | `DeviceListView.vue` |
| TS 工具文件 | kebab-case | `device.api.ts` |
| 目录 | kebab-case 或小写 | `device/`, `data-tag/` |
| NestJS 模块 | XxxModule | `DeviceModule` |
| NestJS 控制器 | XxxController | `DeviceController` |
| NestJS 服务 | XxxService | `DeviceService` |
| DTO | CreateXxxDto / UpdateXxxDto | `CreateDeviceDto` |
| Entity | Xxx | `Device` |
| 函数/变量 | camelCase | `handleSaveProject` |
| 接口 | IXxx | `IProjectConfig` |
| 类型别名 | TXxx | `TDeviceType` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_SCAN_RATE` |

## 提交信息格式

使用简易中文格式，尽量说明原因而不是做了什么，包含功能模块前缀：

```
feat: 设备管理-分组支持拖拽排序
fix: 设备管理-分组创建后未刷新列表
refactor: 系统-菜单改为集中配置
docs: 设计文档-菜单配置方案
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
