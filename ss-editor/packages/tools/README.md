# @scada-editor/tools

> SCADA Editor 组件图标生成工具包 — 自动发现插件、提取 SVG、渲染 PNG

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

---

## 目录

- [简介](#简介)
- [功能特性](#功能特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [CLI 命令参考](#cli-命令参考)
- [API 参考](#api-参考)
- [架构设计](#架构设计)
- [扩展指南](#扩展指南)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

---

## 简介

`@scada-editor/tools` 是 SCADA 编辑器生态中的**图标自动生成工具包**。它能够：

- 自动扫描 `plugins/` 目录下的所有组件插件
- 从 Vue 组件（`Graphic.vue`）中提取纯 SVG 图形代码
- 将 SVG 渲染为高质量的 PNG 图标文件
- 支持按分类、按组件类型灵活筛选生成范围

本工具专为 SCADA Editor 的**电力 (electric)**、**矿业 (mines)**、**基础控件 (basic)** 等各类工业图元插件的图标批量生成而设计，解决了手工维护图标的痛点。

### 适用场景

| 场景 | 说明 |
|------|------|
| 新插件开发 | 开发完 Graphic.vue 后一键生成图标 |
| 批量更新 | 组件样式变更后批量重新渲染 |
| CI/CD 集成 | 在构建流程中自动检查/生成图标 |
| 图标审计 | 列出所有组件及其图标状态 |

---

## 功能特性

### 核心能力

- **🔍 自动发现** — 扫描插件目录结构，自动识别所有组件及其分类
- **⚡ SVG 提取** — 从 Vue SFC 的 `<template>` 中智能提取根级 `<svg>` 元素
- **🖼️ PNG 渲染** — 基于 Playwright 无头浏览器实现像素级精确渲染
- **📦 完整流水线** — 一条命令完成 扫描 → 提取 → 渲染 全流程
- **🎨 自定义配置** — 支持尺寸、背景色、输出格式等全面可配置

### 技术亮点

- **零构建依赖** — CLI 脚本为纯 ESM `.mjs`，可直接 `node` 运行
- **Vue 指令处理** — 自动剥离 `v-if`、`:bind`、`{{ }}` 等 Vue 特有语法
- **增量生成** — 默认跳过已存在文件，支持 `--force` 强制覆盖
- **优雅退出** — Ctrl+C 信号安全关闭浏览器实例
- **TypeScript 优先** — 完整类型定义，IDE 友好

---

## 安装

### 前置依赖

```bash
# 本工具作为 workspace 包已包含在项目中，无需单独安装
# 但需要确保以下 peerDependency 可用：
pnpm add -D playwright
npx playwright install chromium
```

### 验证安装

```bash
# 查看帮助信息
node packages/tools/bin/generate-icons.mjs --help

# 列出所有可发现的组件
node packages/tools/bin/generate-icons.mjs --list
```

---

## 快速开始

### 1. 生成全部组件图标

最常用的场景 — 一键生成所有分类下所有组件的 PNG + SVG 图标：

```bash
pnpm generate-icons:all
# 等价于
node packages/tools/bin/generate-icons.mjs --all
```

输出示例：

```
🎨 SCADA Editor Icon Generator
   尺寸: 128px | 格式: both | 背景: #1e1e2e

🔍 扫描组件...
📦 发现 86 个组件，分布在 8 个分类中

  [1/86] ⚡ 提取 SVG: ammeter...
  [1/86] 🖼️  渲染 PNG: ammeter...
  [1/86] ✅ PNG 已保存: ammeter.png
  [1/86] ✅ SVG 已保存: ammeter.svg
  ...

──────────────────────────────────────────────────
📊 生成汇总
──────────────────────────────────────────────────
  [██████████████████████████████] 86/86
  ✅ 成功: 86
  ⏱️  耗时: 12.3s
```

### 2. 按分类生成

仅生成某个特定分类的图标：

```bash
# 仅电力类组件
pnpm generate-icons:electric

# 仅矿业组件
pnpm generate-icon:mines

# 手动指定其他分类
node packages/tools/bin/generate-icons.mjs --category basic
node packages/tools/bin/generate-icons.mjs --category industrial
```

### 3. 单个组件生成

开发或调试时，只生成某一个组件的图标：

```bash
# 生成刀闸组件图标
node packages/tools/bin/generate-icons.mjs --type daozha

# 生成电流互感器图标
node packages/tools/bin/generate-icons.mjs --type ct
```

### 4. 强制重新生成

当组件图形发生变更后，强制覆盖已有文件：

```bash
# 强制重生成矿业全部分类
node packages/tools/bin/generate-icons.mjs --category mines --force

# 强制重生成并指定自定义背景色
node packages/tools/bin/generate-icons.mjs --all --force --background '#0d1117'
```

### 5. 仅列出组件（不生成）

查看当前项目中有哪些组件可以被识别，以及它们的图标状态：

```bash
node packages/tools/bin/generate-icons.mjs --list
```

输出示例：

```
🔍 正在扫描组件...

  [electric] (35 个组件)
    ✓ ammeter - 电流表 📁 ammeter.png, ammeter.svg
    ✓ breaker - 断路器 📁 breaker.png, breaker.svg
      cablehead - 电缆终端头
    ✓ ct - 电流互感器CT 📁 ct.png, ct.svg
    ...

  [mines] (42 个组件)
    ✓ fan2 - 风机II型 📁 fan2.png, fan2.svg
      aircompressor - 空压机
    ...

📊 共发现 86 个组件，分布在 8 个分类中
```

---

## CLI 命令参考

### 完整选项列表

| 选项 | 缩写 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--category` | `-c` | `string` | — | 指定分类名称（如 `electric`, `mines`, `basic`） |
| `--type` | `-t` | `string` | — | 指定单个组件类型名称 |
| `--all` | `-a` | `boolean` | `false` | 生成所有已发现组件的图标 |
| `--size` | `-s` | `number` | `128` | 输出图片边长（像素） |
| `--format` | `-f` | `string` | `both` | 输出格式：`png` / `svg` / `both` |
| `--force` | — | `boolean` | `false` | 强制覆盖已有文件 |
| `--background` | — | `string` | `#1e1e2e` | PNG 渲染背景色 |
| `--plugins-dir` | — | `string` | `../plugins` | 自定义插件扫描目录 |
| `--list` | — | `boolean` | `false` | 仅列出组件，不执行生成 |
| `--help` | `-h` | `boolean` | `false` | 显示帮助信息 |

### NPM Scripts 快捷方式

在 `package.json` 中预定义了常用命令：

```json
{
  "scripts": {
    "generate-icons": "node bin/generate-icons.mjs",
    "generate-icons:electric": "node bin/generate-icons.mjs --category electric",
    "generate-icon:mines": "node bin/generate-icons.mjs --category mines",
    "generate-icons:all": "node bin/generate-icons.mjs --all"
  }
}
```

使用方式：

```bash
pnpm generate-icons:all
pnpm generate-icons:electric --force --size 256
```

---

## API 参考

### TypeScript 编程接口

除了 CLI，本工具还提供完整的 TypeScript API，适合在脚本或构建流程中使用。

#### 导入

```typescript
import {
  // 核心流水线
  generateIcons,
  type GenerateOptions,
  type GenerateResult,

  // 组件扫描
  scanComponents,
  scanCategories,
  type ComponentInfo,
  type ScanOptions,

  // SVG 提取
  extractSvg,
  extractAllSvgs,
  type SvgExtractOptions,

  // PNG 渲染
  renderPng,
  renderPngToFile,
  renderComponentPng,
  closeBrowser,
  type PngRenderOptions,
} from '@scada-editor/tools'
```

#### 完整流水线示例

```typescript
import { scanComponents, generateIcons, closeBrowser } from '@scada-editor/tools'

async function main() {
  // Step 1: 扫描组件
  const components = await scanComponents('./packages/plugins', {
    categories: ['electric', 'mines'],
  })

  console.log(`发现 ${components.length} 个组件`)

  // Step 2: 生成图标
  const result = await generateIcons(components, {
    size: 128,
    format: 'both',
    force: false,
    backgroundColor: '#1e1e2e',
  })

  console.log(`完成: ${result.success} 成功, ${result.failed} 失败, ${result.skipped} 跳过`)

  // Step 3: 清理资源
  await closeBrowser()
}

main().catch(console.error)
```

#### 分步操作示例

```typescript
import {
  scanComponents,
  extractSvg,
  extractAllSvgs,
  renderPngToFile,
  closeBrowser,
} from '@scada-editor/tools'

async function stepByStep() {
  // 1. 扫描指定分类
  const electricComponents = await scanComponents('./packages/plugins', {
    categories: ['electric'],
  })

  // 2. 批量提取 SVG
  const svgMap = await extractAllSvgs(electricComponents, {
    size: 128,
    backgroundColor: '#1e1e2e',
  })

  console.log(`成功提取 ${svgMap.size} 个 SVG`)

  // 3. 逐个渲染 PNG
  for (const [type, svgContent] of svgMap) {
    const comp = electricComponents.find(c => c.type === type)
    if (!comp) continue

    await renderPngToFile(svgContent, `${comp.dirPath}/${type}.png`, {
      size: 128,
      scale: 2,
      backgroundColor: '#1e1e2e',
      padding: 8,
    })

    console.log(`✅ ${type}.png`)
  }

  await closeBrowser()
}
```

#### 单组件操作示例

```typescript
import { extractSvg, renderPng, closeBrowser } from '@scada-editor/tools'
import type { ComponentInfo } from '@scada-editor/tools'

// 构造组件信息（或从扫描结果获取）
const ctComponent: ComponentInfo = {
  type: 'ct',
  category: 'electric',
  dirPath: './packages/plugins/electric/ct',
  hasGraphicVue: true,
  hasIconVue: true,
  hasPng: false,
  hasSvg: false,
}

async function generateSingle() {
  // 提取 SVG
  const svg = await extractSvg(ctComponent, {
    size: 128,
    backgroundColor: '#1e1e2e',
  })

  if (svg) {
    console.log('SVG 内容:', svg.slice(0, 100) + '...')

    // 渲染为 PNG Buffer
    const pngBuffer = await renderPng(svg, {
      size: 128,
      scale: 2,
      backgroundColor: '#1e1e2e',
    })

    console.log(`PNG 大小: ${pngBuffer.length} bytes`)
  }

  await closeBrowser()
}
```

---

## 架构设计

### 数据流概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        @scada-editor/tools                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐             │
│  │  Scanner  │ ──▶ │ SVG Extract │ ──▶ │ PNG Renderer │             │
│  │          │     │    or       │     │              │             │
│  │ • 扫描目录│     │ • 解析 Vue  │     │ • Playwright │             │
│  │ • 识别组件│     │ • 提取 <svg>│     │ • 截图渲染   │             │
│  │ • 分类聚合│     │ • 清理指令  │     │ • 输出文件   │             │
│  └──────────┘     └─────────────┘     └──────────────┘             │
│       │                  │                    │                     │
│       ▼                  ▼                    ▼                     │
│  ComponentInfo[]     string (SVG)         Buffer / File            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Pipeline (pipeline.ts)                   │   │
│  │            组合上述三个模块，提供一站式调用接口                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              CLI Entry (bin/generate-icons.mjs)               │   │
│  │         参数解析 → 彩色输出 → 进度显示 → 汇总报告              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 模块职责

| 模块 | 路径 | 职责 |
|------|------|------|
| **Scanner** | `src/scanner/index.ts` | 遍历 plugins 目录，识别组件结构，返回 `ComponentInfo[]` |
| **SVG Extractor** | `src/svg-extractor/index.ts` | 解析 Vue SFC，提取 `<template>` 中的根 SVG，剥离 Vue 语法 |
| **PNG Renderer** | `src/png-renderer/index.ts` | 基于 Playwright 将 SVG 渲染为 PNG 图片 |
| **Pipeline** | `src/pipeline.ts` | 编排 scan → extract → render 完整流程 |
| **Types** | `src/types.ts` | 所有 TypeScript 类型定义 |
| **CLI** | `bin/generate-icons.mjs` | 命令行入口，参数解析与用户交互 |

### 文件产出

```
plugins/
└── electric/
    ├── ct/
    │   ├── CtGraphic.vue      # ← 源文件（输入）
    │   ├── ct.png             # ← 自动生成（输出）
    │   └── ct.svg             # ← 自动生成（输出）
    ├── daozha/
    │   ├── daozha.png
    │   └── daozha.svg
    └── ...
```

---

## 扩展指南

### 添加新的 Scanner

如果项目引入了不同结构的插件组织方式，可以实现自定义 Scanner：

```typescript
// src/scanner/custom-scanner.ts
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { ComponentInfo, ScanOptions } from '../types'

export async function scanCustomComponents(
  baseDir: string,
  options?: ScanOptions
): Promise<ComponentInfo[]> {
  // 实现你的自定义扫描逻辑
  // 例如：从 JSON manifest、数据库、或其他目录结构读取

  return []
}
```

关键点：
- 返回统一的 `ComponentInfo` 接口
- 确保 `dirPath` 和 `hasGraphicVue` 字段正确填充
- 复用现有的 Extractor 和 Renderer

### 添加新的渲染器

除 PNG 外，可以扩展支持更多格式：

```typescript
// src/renderers/icns-renderer.ts
import { renderPng } from '../png-renderer/index'

export async function renderIcns(
  svgString: string,
  outputPath: string,
  options?: PngRenderOptions
): Promise<void> {
  const pngBuffer = await renderPng(svgString, options)
  // 使用 png-to-icns 或类似库转换
  // ...
}

export async function renderWebP(
  svgString: string,
  outputPath: string,
  options?: PngRenderOptions & { quality?: number }
): Promise<void> {
  // 使用 sharp 或 playwright 的 webp 输出能力
  // ...
}
```

### 添加新的 Extractor

支持非 Vue 框架的组件：

```typescript
// src/extractors/react-extractor.ts
export async function extractFromReactComponent(
  filePath: string
): Promise<string | null> {
  // 解析 React JSX 中的 SVG
  // 或从 .tsx 文件中提取 return (...) 里的 svg 元素
  return null
}
```

---

## 配置说明

### GenerateOptions 完整字段

```typescript
interface GenerateOptions extends ScanOptions, PngRenderOptions {
  /** 是否强制覆盖已有文件（默认: false） */
  force?: boolean

  /** 输出格式: 'png' | 'svg' | 'both'（默认: 'both'） */
  format?: IconFormat
}
```

### ScanOptions 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `categories` | `string[]` | 全部 | 限制扫描的分类列表 |
| `pluginsDir` | `string` | `'../plugins'` | 插件根目录路径 |
| `includeEmpty` | `boolean` | `false` | 是否包含无 Graphic.vue 的组件 |

### SvgExtractOptions 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number` | `100` | SVG 视口参考尺寸 |
| `backgroundColor` | `string` | — | 背景颜色（可选） |

### PngRenderOptions 字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number` | `128` | 输出图片边长（px） |
| `scale` | `number` | `2` | 设备像素比（Retina 适配） |
| `backgroundColor` | `string` | `'#1e1e2e'` | 渲染背景色 |
| `padding` | `number` | `8` | 内边距（px） |

### 推荐配置场景

```typescript
// 高清图标（用于 Retina 屏幕或大尺寸展示）
const hdConfig: GenerateOptions = {
  size: 256,
  scale: 2,
  padding: 16,
}

// 透明背景图标
const transparentConfig: GenerateOptions = {
  backgroundColor: 'transparent',
}

// 暗色主题
const darkConfig: GenerateOptions = {
  backgroundColor: '#0d1117',
}

// 浅色主题
const lightConfig: GenerateOptions = {
  background: '#ffffff',
}
```

---

## 常见问题

### Q: Playwright 安装失败？

```bash
# 常见原因及解决方案

# 1. 网络问题 — 使用国内镜像
env PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npx playwright install chromium

# 2. 权限问题（Windows）
# 以管理员身份运行 PowerShell，然后执行安装

# 3. 依赖缺失（Linux）
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libgbm1 libasound2 libxshmfence1

# 4. 指定本地 Chromium 路径
# 设置 CHROME_PATH 或 PLAYWRIGHT_BROWSERS_PATH 环境变量
```

### Q: 生成的 PNG 有白边或被裁剪？

调整 `padding` 参数：

```bash
node bin/generate-icons.mjs --all --padding 16
```

或在 API 中设置：

```typescript
await renderPng(svg, { padding: 20 })
```

### Q: 如何处理没有 Graphic.vue 的组件？

这些组件会被自动跳过（status: `skipped`）。使用 `--list` 可以查看哪些组件缺少 Graphic.vue：

```bash
node bin/generate-icons.mjs --list | findstr " "
```

### Q: SVG 提取后样式不正确？

可能的原因：

1. **动态属性未解析** — 检查是否有复杂的 computed 表达式未被覆盖
2. **CSS 样式丢失** — 当前版本仅处理内联样式，scoped CSS 不会被提取
3. **外部依赖** — 如果 SVG 引用了外部字体或图片，渲染结果可能不完整

解决方案：手动编辑生成的 `.svg` 文件进行调整。

### Q: 能否在 Docker/CI 环境中使用？

可以。Playwright 支持 headless 模式，无需显示服务：

```dockerfile
FROM node:20-alpine
RUN npm install -g playwright
RUN npx playwright install chromium --with-deps
COPY . /app
WORKDIR /app
RUN node bin/generate-icons.mjs --all
```

### Q: 如何添加新的组件分类？

只需在 `plugins/` 目录下新建文件夹，内部按如下结构组织即可被自动发现：

```
plugins/
└── my-new-category/        # 新分类
    ├── my-component/       # 新组件
    │   ├── MyGraphic.vue   # 必须包含 Graphic.vue
    │   ├── index.ts
    │   └── package.json
    └── another-component/
        ├── AnotherGraphic.vue
        └── ...
```

---

## License

Apache License 2.0 © SCADA Editor Team

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
