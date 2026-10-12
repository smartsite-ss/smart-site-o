# SCADA Editor 项目开发指引

## 一、功能开发前置要求

> 每次提交代码前，确保已满足以下 4 项强制要求。

### 1.1 批处理文件（.bat）规范

- **编码**：UTF-8 无 BOM
- **内容**：所有注释、提示信息必须使用英文
- **格式**：`chcp 65001` 开头，`setlocal/endlocal` 隔离作用域，关键操作检查 `%errorlevel%`

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem === Build the project ===
echo ================================================
echo [1/4] Building project...
echo ================================================

pnpm install
if !errorlevel! equ 1 (
    echo ERROR: Failed to install dependencies!
    pause & exit /b 1
)

endlocal
```

### 1.2 主题样式规范

- 所有颜色值**必须使用 CSS 变量**，严禁硬编码颜色值
- 核心变量：`--primary`、`--background`、`--surface`、`--text`、`--text-secondary`、`--border`、`--border-light`、`--status-success/warning/error`

```css
/* ✅ 正确：使用 CSS 变量 */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
}

/* ❌ 错误：硬编码颜色 */
.sidebar {
  background: #0f172a;
  border-right: 1px solid #1e293b;
}
```

### 1.3 测试用例同步

- 添加/修改功能时，**必须同步编写单元测试**
- 测试文件放在 `__tests__/` 目录，命名为 `xxx.test.ts`
- 使用 Vitest，每个 `it()` 只测一件事
- 覆盖率要求：整体语句 ≥ 80%，新增代码 ≥ 90%

### 1.4 国际化同步

- 新增/修改功能时，**必须同步完成国际化开发**
- 所有用户可见文本使用 `$t()`，禁止硬编码中文
- 新增翻译键必须同时添加到 `zh-CN.json` 和 `en-US.json`
- 翻译键命名：`module.keyName`（如 `settings.exportConfig`）

---

## 二、代码风格规范

### 2.1 TypeScript

- 使用严格模式（`"strict": true`），避免 `any`（测试代码除外）
- 接口命名 `I` 前缀（如 `IGraphicConfig`），类型别名 `T` 前缀（如 `TGraphicType`）

### 2.2 静态类型检查

```bash
pnpm typecheck   # 全量类型检查
pnpm lint        # ESLint 检查
```

- 类型 Error 和 ESLint Error 必须修复，不能提交
- 第三方库类型问题可用 `@ts-expect-error` 并注释说明原因
- 测试代码特殊规则：未使用变量加 `_` 前缀，Mock 可用 `as any`

### 2.3 Vue 组件

- Vue 3 Composition API（`<script setup>`）
- 组件命名 PascalCase，文件命名 kebab-case
- Props/emits 必须有完整类型定义

### 2.4 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 函数/变量 | camelCase | `handleSave`、`layoutConfig` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_WIDTH` |
| Store 文件 | `xxx.store.ts` | `graphic.store.ts` |

### 2.5 代码格式

- Prettier 自动格式化：2 空格缩进、单引号优先、分号结尾

---

## 三、目录结构与 Monorepo 规范

```
ss-editor/
├── apps/                    # 应用入口（web、desktop、desktop-tauri）
├── packages/
│   ├── core/                # 核心库（图形引擎、状态管理、国际化）
│   ├── system/              # 管理端功能包
│   ├── ui/                  # UI 组件库
│   └── plugins/             # 图元插件
├── docs/                    # 文档
└── records/                 # 记录文件
```

### 3.1 双路由体系

| 路由前缀 | 功能 | 入口文件 |
|----------|------|----------|
| `/editor` | 编辑器 | `apps/web/src/router/index.ts` |
| `/system` | 管理端 | `packages/system/src/router/index.ts` |

- System 包路由使用**静态导入**组件（Vite Library Mode 不支持动态 import）
- 认证守卫通过 `meta.requiresAuth` 实现

### 3.2 包间依赖

```
apps/web → @scada-editor/system / core / ui
packages/system → @scada-editor/core
```

### 3.3 构建顺序

```bash
pnpm --filter @scada-editor/core build
pnpm --filter @scada-editor/ui build
pnpm --filter @scada-editor/system build
pnpm --filter @scada-editor/web build
```

---

## 四、状态管理规范

- 使用 Pinia `defineStore`，异步操作用 `async/await`
- 基本类型用 `ref()`，对象用 `reactive()`，计算用 `computed()`
- 性能敏感场景用 `shallowRef()` / `markRaw()`
- 遵循单向数据流：UI 事件 → Store Action → State 更新 → UI 响应

---

## 五、事件处理规范

- 事件名 kebab-case 语义化命名（如 `layout-config-changed`）
- 使用 `TypedEventBus` 进行类型安全通信
- 组件挂载时注册监听，卸载时移除

---

## 六、错误处理规范

### 6.1 错误类型

所有自定义错误继承自 `GraphicError`：`StorageError`、`ScriptError`、`ExportError`、`ImportError`、`SerializationError`、`ValidationError`

### 6.2 处理原则

```typescript
import { errorService } from '@scada-editor/core';

try {
  saveData();
} catch (error) {
  const details = errorService.record(error, '保存数据');
  showAlert(errorService.getFriendlyMessage(details), 'error');
}
```

- 所有错误必须通过 `errorService.record()` 记录
- 用户提示使用 `showAlert()`，禁止原生 `alert()`
- 关键组件用 `<ErrorBoundary>` 包裹防崩溃

---

## 七、提交规范

**格式：** `<type>: <description>`

| 类型 | 说明 | 类型 | 说明 |
|------|------|------|------|
| `feat` | 新功能 | `fix` | 修复 bug |
| `refactor` | 重构 | `docs` | 文档 |
| `test` | 测试 | `chore` | 构建/工具 |

---

## 八、最佳实践

### 8.1 性能优化

- `computed` 缓存计算结果
- 列表渲染必须设置 `key`
- 频繁切换用 `v-show` 替代 `v-if`
- 大数据用 `shallowRef` / `markRaw` 减少响应式开销

### 8.2 可维护性

- 单一职责、模块解耦、避免循环依赖
- 通用逻辑抽取为 composables

### 8.3 测试规范

- 测试行为而非实现，先写测试后写代码（TDD）
- 每个 `it()` 只测一件事，用描述性命名

```typescript
// ✅ 好的
it('应该在撤销时恢复之前的状态', () => {});
// ❌ 不好
it('测试1', () => {});
```

- 优先修改业务代码，单个用例最多尝试 10 次
- 超过 10 次用 `it.skip()` 跳过并注释说明

---

## 九、安全规范

- 用户输入过滤转义，避免 `v-html` 渲染不可信内容
- 前后端双重验证
- 禁止在代码中暴露密钥/Token/密码

---

## 十、UI 组件与样式规范

### 10.1 样式

- SCSS + BEM 命名（Block__Element--Modifier）
- `<style scoped>` 隔离组件样式
- 禁止 `!important`，优先 CSS Grid / Flexbox 布局
- 颜色严格遵守 [1.2 主题样式规范](#12-主题样式规范)

### 10.2 组件开发

- 独立可复用，清晰的 props/emits 定义
- 内部状态最小化，优先使用 props
- 表单控件：统一样式 + 国际化 + 明确验证反馈

---

## 十一、Vite Library Mode 构建指南

`packages/core`、`packages/system`、`packages/ui` 均使用 Library Mode。

### 关键配置与限制

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: './src/index.ts', fileName: (format) => `index.${format}.js` },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', '/^echarts/', '@scada-editor/core', 'vue-i18n'],
    },
  },
});
```

| 限制 | 说明 | 解决方案 |
|------|------|----------|
| SFC 动态导入 | Rollup 无法解析间接 `.vue` 导入 | 使用静态导入 |
| 外部依赖 | 必须声明 external | echarts 用 `/^echarts/` 正则 |
| 包间引用 | 不能打包进 lib | 加入 external |

---

## 十二、AI 协作开发规范

- **始终使用中文**交互，给绝对路径引用文件
- 复杂任务先出计划，确认后再执行
- 代码验收标准：`编写代码 → typecheck 通过 → lint 通过 → 测试通过 → 人工 Review`
- AI 不做决策：安全策略调整、数据库变更、第三方库引入/替换、生产配置变更

---

## 十三、CI/CD 规范

### 本地门禁（提交前必执行）

```bash
pnpm typecheck && pnpm lint && pnpm test:all
```

### 覆盖率要求

| 指标 | 最低要求 |
|------|----------|
| 整体语句覆盖率 | ≥ 80% |
| 整体分支覆盖率 | ≥ 75% |
| 新增代码覆盖率 | ≥ 90% |
| Core 包覆盖率 | ≥ 85% |

### 构建产物

| 目标 | 输出路径 |
|------|----------|
| Web | `apps/web/dist/` |
| Electron | `apps/desktop/release/` |
| Tauri | `apps/desktop-tauri/src-tauri/target/release/` |

---

## 附录：常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Web 开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm test` | Web 应用单元测试 |
| `pnpm test:core` | Core 包测试（443 用例） |
| `pnpm test:ui` | UI 包测试（119 用例） |
| `pnpm test:all` | 全量测试 |
| `pnpm test:coverage` | Core 包覆盖率报告 |

```bash
pnpm typecheck && pnpm lint && pnpm test:all   # 全量门禁
pnpm --filter @scada-editor/core test           # 单包测试
```

---

**最后更新**: 2026-05-21
**版本**: v3.0（精简结构 + 新增功能开发前置要求 4 条）

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
