# 图元插件开发指南

## 目录

1. [快速开始](#-快速开始)
2. [目录结构](#-目录结构)
3. [部署模式](#-部署模式)
4. [核心概念](#-核心概念)
5. [属性 Schema 规范](#-属性-schema-规范)
6. [国际化 (i18n)](#-国际化-i18n)
7. [测试与验证](#-测试与验证)
8. [常见问题与根因](#-常见问题与根因)
9. [开发 CheckList](#-开发-checklist)

---

## 快速开始

### 新增图元（Bundled 模式，6 步完成）

#### 步骤 1：确定部署模式

根据插件的业务性质选择模式：

| 条件                                       |     模式      | 目录                                |
| ------------------------------------------ | :-----------: | ----------------------------------- |
| 跨行业通用组件（按钮、输入框、装饰边框等） |  **bundled**  | `plugins/{category}/{plugin-name}/` |
| 行业定制组件（电力、矿产、工业等）         | **directory** | `plugins/{category}/{plugin-name}/` |

> 目录结构已扁平化：所有插件统一放在 `plugins/{category}/{plugin-name}/`，不再有 `bundled/`/`directory/` 物理目录。部署模式由 `categories.json` 中各分类的 `deployMode` 字段唯一决定。

#### 步骤 2：创建插件目录

```bash
packages/plugins/{category}/{plugin-name}/
```

#### 步骤 3：创建必需文件

```text
packages/plugins/{category}/{plugin-name}/
├── index.ts                      # 插件入口（必需）
├── XxxPlugin.ts                  # 图元类（必需）
├── xxxPropertySchema.ts          # 属性 Schema 声明（必需）
├── XxxIcon.vue                   # 工具栏图标组件（可选）
├── XxxConfig.vue                 # 自定义配置面板（可选）
├── locales/
│   ├── zh-CN.json               # 中文国际化（可选）
│   └── en-US.json               # 英文国际化（可选）
├── package.json                  # 包配置（directory 模式必需，含 version）
├── plugin-manifest.json          # 远程加载 manifest（directory 模式必需）
├── vite.config.ts                # 独立构建配置（directory 模式必需）
└── __tests__/
    └── XxxPlugin.test.ts
```

#### 步骤 4：定义属性 Schema

```typescript
// packages/plugins/basic/my-button/myButtonPropertySchema.ts
import { type PluginPropertySchema } from "@scada-editor/core";

export const myButtonPropertySchema: PluginPropertySchema = {
  name: "我的按钮",
  layout: "grid",
  columns: 2,
  propsPath: "customProps",
  fields: [
    {
      name: "text",
      label: "文本",
      type: "text",
      defaultValue: "Button",
      group: "basic",
    },
    {
      name: "backgroundColor",
      label: "背景色",
      type: "color",
      defaultValue: "#4CAF50FF",
      group: "style",
    },
    {
      name: "borderRadius",
      label: "圆角",
      type: "number",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 4,
      group: "style",
    },
    {
      name: "fontWeight",
      label: "字体粗细",
      type: "select",
      options: [
        { value: "normal", label: "正常" },
        { value: "bold", label: "粗体" },
      ],
      defaultValue: "normal",
      group: "text",
    },
  ],
};
```

**SchemaField 类型对照：**

| type       | 用途       |                必需额外属性                 |
| ---------- | ---------- | :-----------------------------------------: |
| `text`     | 文本输入   |                      —                      |
| `number`   | 数值输入   |        `min`, `max`, `step`（推荐）         |
| `range`    | 滑块范围   |            `min`, `max`, `step`             |
| `color`    | 颜色选择器 | `defaultValue` 须为 8 位 hex（`#RRGGBBAA`） |
| `select`   | 下拉选择   |            `options`（非空数组）            |
| `checkbox` | 复选框     |                      —                      |
| `boolean`  | 布尔开关   |                      —                      |
| `textarea` | 多行文本   |                      —                      |

#### 步骤 5：实现图元类

```typescript
// packages/plugins/basic/my-button/MyButtonPlugin.ts
import {
  BasePlugin,
  Graphic,
  DrawContext,
  InferSchemaProps,
  buildDefaultsFromSchema,
} from "@scada-editor/core";
import { myButtonPropertySchema } from "./myButtonPropertySchema";

const defaultProps = buildDefaultsFromSchema(myButtonPropertySchema);

@Graphic({
  type: "my-button",
  name: "我的按钮",
  category: "basic",
  description: "自定义按钮图元",
  defaultProps: defaultProps,
  defaultWidth: 100,
  defaultHeight: 40,
  features: {
    resizable: true,
    rotatable: false,
    cloneable: true,
    groupable: true,
    dataBindable: false,
  },
})
export class MyButtonPlugin extends BasePlugin<
  InferSchemaProps<typeof myButtonPropertySchema>
> {
  constructor(x = 0, y = 0, w = 100, h = 40) {
    super("my-button", x, y, w, h);
    this.setDefaultProps({ ...defaultProps });
  }

  protected render(dc: DrawContext): void {
    const ctx = dc.ctx;
    const { width, height } = this.getSize();
    const props = this.pluginProps;

    ctx.fillStyle = props.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, props.borderRadius);
    ctx.fill();

    ctx.fillStyle = props.fontColor;
    ctx.font = `${props.fontWeight === "bold" ? "bold" : "normal"} ${props.fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(props.text, width / 2, height / 2);
  }
}
```

#### 步骤 6：创建入口文件

```typescript
// packages/plugins/basic/my-button/index.ts
import { createPlugin } from "@scada-editor/core";

export { default as MyButtonIcon } from "./MyButtonIcon.vue";
export { default as MyButtonConfig } from "./MyButtonConfig.vue";
import { MyButtonPlugin } from "./MyButtonPlugin";
import { myButtonPropertySchema } from "./myButtonPropertySchema";
export { MyButtonPlugin, myButtonPropertySchema };

export default createPlugin({
  type: "my-button",
  category: "basic",
  label: "我的按钮",
  plugin: MyButtonPlugin,
  schema: myButtonPropertySchema,
  defaultWidth: 100,
  defaultHeight: 40,
});
```

#### Directory 模式额外步骤

Directory 模式插件还需要：

1. 在 `package.json` 中声明 `version` 和 `pluginMeta`
2. 添加 `vite.config.ts` 独立构建配置
3. 生成 `plugin-manifest.json` 用于远程发现

详见 [插件开发方案](../../../docs/02-详细设计/ss-editor/06-插件图元/插件开发方案.md) 附录 B。

---

## 目录结构

```text
packages/plugins/
├── basic/                          │   bundled   · 基础类图元（6 个）
│   ├── button/                     │
│   ├── image/                      │
│   ├── label/                      │
│   ├── naive-button/               │
│   ├── shape/                      │
│   └── textbox/                    │
├── system/                         │   bundled   · 系统类图元（15 个）
│   ├── navigation-button/          │
│   ├── page-browser/               │
│   ├── tag-variable/               │
│   └── ...                         │
├── form/                           │   bundled   · 表单类图元（2 个）
│   ├── checkbox/                   │
│   └── input/                      │
├── chart/                          │   bundled   · 图表类图元（6 个）
│   ├── chart/                      │
│   ├── chart-bar/                  │
│   ├── chart-pie/                  │
│   ├── gauge/                      │
│   ├── multi-chart/                │
│   └── trend-chart/                │
├── decorates_borders/              │   bundled   · 边框装饰（19 个）
│   └── border01 ~ border19/        │
├── decorates_head/                 │   bundled   · 头部装饰（6 个）
│   └── head01 ~ head06/            │
├── decorates_other/                │   bundled   · 其它装饰（5 个）
│   ├── clock/                      │
│   ├── countdown/                  │
│   ├── flipper-number/             │
│   ├── number/                     │
│   └── time-common/                │
├── electric/                       │   directory · 电力行业（27 个）
│   ├── ammeter/                    │
│   ├── breaker/                    │
│   └── ...                         │
├── industrial/                     │   directory · 工业自动化（15 个）
│   ├── gauge/                      │
│   ├── pipe/                       │
│   └── ...                         │
├── mines/                          │   directory · 矿产行业（57 个）
│   ├── ballmill/                   │
│   └── ...                         │
├── 3d/                             │   directory · 3D 模型（2 个）
│   ├── three-cube/                 │
│   └── three-gauge/                │
├── svg/                            │   directory · SVG 图元（1 个）
│   └── svg-pipe/                   │
└── __tests__/                      ← 插件测试
    ├── form/                       │   表单插件测试
    ├── test-utils/                 │   测试工具集
    │   ├── PropertyVerifier.ts     │   属性读写一致性验证器
    │   ├── MockDrawContext.ts      │   Mock Canvas 2D 上下文
    │   ├── RenderFieldMapper.ts    │   Schema 字段-渲染映射分析
    │   ├── EndToEndValidator.ts    │   端到端验证器
    │   └── VisualSnapshot.ts       │   可视化回归测试
    ├── schema-validation.test.ts   │   全局 Schema 静态校验
    └── plugin-coverage.test.ts     │   测试覆盖汇总
```

---

## 部署模式

### Bundled 模式 vs Directory 模式对比

| 维度             | Bundled（内联）            | Directory/Single-JS（远程）  |
| ---------------- | -------------------------- | ---------------------------- |
| **定位**         | 核心基础插件，跨行业通用   | 行业定制插件，垂直领域专用   |
| **构建方式**     | 随编辑器主包一起 Vite 构建 | 每个插件独立构建为 ESM 文件  |
| **加载时机**     | 编辑器启动时 eager 加载    | 运行时按需动态 import()      |
| **HMR**          | ✅ Vite HMR 热更新         | ❌ 需要重新构建部署          |
| **Tree Shaking** | ✅ 参与主包 Tree Shaking   | ❌ 独立文件，不参与          |
| **版本管理**     | 随编辑器主版本             | 独立语义化版本号             |
| **部署更新**     | 随编辑器发布               | 独立部署到 CDN，可灰度更新   |
| **加载性能**     | 增加主包体积               | 按需加载，不影响初始加载     |
| **离线可用**     | ✅ 内联于主包              | 需配合 Service Worker 缓存   |
| **开发体验**     | 开箱即用，HMR 秒级反馈     | 需配置独立构建，开发周期稍长 |

### 选择决策树

```
新增插件
  │
  ├─ 是否跨行业通用？所有项目都可能用到？
  │   └─ YES → Bundled 模式
  │       例：按钮、输入框、表单、边框装饰、图表
  │
  └─ 是否属于特定行业？仅部分项目需要？
      └─ YES → Directory 模式
          例：电力图元（电流表、断路器）、矿产图元（球磨机、破碎机）
```

### 已分类插件清单

|     模式      | 分类              | 插件数 | 加载方式                      |
| :-----------: | ----------------- | :----: | ----------------------------- |
|  **bundled**  | basic             |   6    | `import.meta.glob eager:true` |
|  **bundled**  | system            |   15   | `import.meta.glob eager:true` |
|  **bundled**  | form              |   2    | `import.meta.glob eager:true` |
|  **bundled**  | chart             |   6    | `import.meta.glob eager:true` |
|  **bundled**  | decorates_borders |   19   | `import.meta.glob eager:true` |
|  **bundled**  | decorates_head    |   6    | `import.meta.glob eager:true` |
|  **bundled**  | decorates_other   |   5    | `import.meta.glob eager:true` |
| **directory** | electric          |   27   | 远程 `import(url)` + manifest |
| **directory** | industrial        |   15   | 远程 `import(url)` + manifest |
| **directory** | mines             |   57   | 远程 `import(url)` + manifest |
| **directory** | 3d                |   2    | 远程 `import(url)` + manifest |
| **directory** | svg               |   1    | 远程 `import(url)` + manifest |

---

## 核心概念

### 1. BasePlugin 基类

所有图元插件继承自 `BasePlugin<PropsType>`：

```typescript
import { BasePlugin, Graphic, DrawContext } from '@scada-editor/core';

@Graphic({ type: 'xxx', name: 'XXX', category: 'basic', ... })
export class XxxPlugin extends BasePlugin<XxxProps> {
  constructor(x = 0, y = 0, w = 100, h = 100) {
    super('xxx', x, y, w, h);
    this.setDefaultProps({ ...defaultProps });
  }

  protected render(dc: DrawContext): void {
    const props = this.pluginProps;
    // 使用 Canvas 2D API 绘制
  }
}
```

**核心 API：**

| 方法                             | 说明                                           |
| -------------------------------- | ---------------------------------------------- |
| `this.pluginProps`               | 获取当前自定义属性（`config.customProps`）     |
| `this.setPluginProps(partial)`   | 批量更新属性（触发重绘和 `onPropertyChanged`） |
| `this.setDefaultProps(defaults)` | 初始化默认属性值                               |
| `this.getSize()`                 | 获取 `{ width, height }`                       |
| `this.getPosition()`             | 获取 `{ x, y }`                                |
| `this.draw(ctx)`                 | 调用 `render(dc)` 绘制（兼容旧接口）           |

**生命周期钩子（按需覆写）：**

| 钩子                           | 说明               |
| ------------------------------ | ------------------ |
| `onMounted()`                  | 图元被添加到场景时 |
| `onUnmounted()`                | 图元被移除时       |
| `onPropertyChanged(changes)`   | 属性变更时         |
| `onThemeChanged(themeName)`    | 主题切换时         |
| `onVisibilityChanged(visible)` | 可见性变更时       |

### 2. @Graphic 装饰器

```typescript
@Graphic({
  type: string;           // 图元唯一标识（如 'button', 'gauge'）
  name: string;           // 显示名称
  category: string;       // 分类：'basic' | 'form' | 'industrial' | 'chart' | ...
  description?: string;   // 描述
  defaultProps?: object;  // 默认属性值（buildDefaultsFromSchema 生成）
  defaultWidth?: number;  // 默认宽度
  defaultHeight?: number; // 默认高度
  features?: {            // 能力标记
    resizable?: boolean;
    rotatable?: boolean;
    cloneable?: boolean;
    groupable?: boolean;
    dataBindable?: boolean;
  };
})
```

### 3. createPlugin 工厂

每个插件的 `index.ts` 必须通过 `createPlugin` 导出默认注册对象：

```typescript
import { createPlugin } from "@scada-editor/core";

export default createPlugin({
  type: "xxx",
  category: "basic",
  label: "XXX",
  plugin: XxxPlugin,
  schema: xxxPropertySchema,
  defaultWidth: 100,
  defaultHeight: 100,
});
```

### 4. 属性数据流

```

[propertySchema.ts] → buildDefaultsFromSchema() → defaultProps
                                                   │
                                                   ▼
                                                 BasePlugin constructor
                                                   │  setDefaultProps()
                                                   ▼
                                             config.customProps
                                                   │
                                                   ▼
                                             属性面板读写
                                                   │
                                                   ▼
                                             render(dc)
                                                   │  this.pluginProps
                                                   ▼
                                             Canvas 2D 渲染

```

---

## 属性 Schema 规范

### Schema 结构

```typescript
interface PluginPropertySchema {
  name: string; // Schema 显示名称
  layout?: "grid" | "list"; // 面板布局
  columns?: number; // 网格列数
  propsPath?: string; // 属性存储路径，默认 'customProps'
  fields: SchemaField[]; // 字段列表
}

interface SchemaField {
  name: string; // 字段名（关键：render() 中通过 props.{name} 引用）
  label: string; // 显示标签
  labelKey?: string; // i18n key（可选）
  type: FieldType; // 控件类型
  defaultValue: any; // 默认值（必须提供）
  group?: string; // 分组名
  min?: number; // number 类型最小值
  max?: number; // number 类型最大值
  step?: number; // number 类型步长
  options?: SelectOption[]; // select 类型选项
}
```

### 关键规范

1. **每个 field 必须提供 `defaultValue`** — 否则属性面板初始状态为空
2. **`color` 类型使用 8 位 hex**：`#RRGGBBAA`（含 alpha 通道），如 `'#4CAF50FF'`
3. **`propsPath` 默认 `'customProps'`** — 与 `this.pluginProps` 对应
4. **`select` 类型 `options` 不能为空** — 否则属性面板显示异常
5. **`number` 类型推荐声明 `min`、`max`、`step`** — 确保输入范围可控
6. **`field.name` 必须在 `render(dc)` 中实际使用** — 避免"死属性"

---

## 国际化 (i18n)

每个插件通过 `locales/` 目录提供多语言支持：

```json
{
  "pluginNamespace": {
    "panelTitle": "属性面板标题",
    "properties": {
      "fieldName": "字段显示名"
    },
    "options": {
      "selectFieldName": {
        "optionValue": "选项显示名"
      }
    },
    "groups": {
      "groupName": "分组显示名"
    }
  }
}
```

在 Schema 中通过 `labelKey` 引用：`{ name: 'text', labelKey: 'button.properties.text', ... }`

---

## 测试与验证

### 五层验证架构

```

┌─────────────────────────────────────────────────────────────────────────┐
│                        Layer 5: 可视化回归测试                            │
│                  像素级截图对比，验证渲染效果                               │
├─────────────────────────────────────────────────────────────────────────┤
│                        Layer 4: 跨层数据流完整性                           │
│             端到端：Schema → 初始化 → 修改 → 提交 → 渲染                    │
├─────────────────────────────────────────────────────────────────────────┤
│                        Layer 3: 声明-渲染映射验证                          │
│         每个 schema 字段是否在 render() 中实际消费（静态分析 + 运行时）       │
├─────────────────────────────────────────────────────────────────────────┤
│                        Layer 2: 属性读写一致性                              │
│      每个 Plugin 实例：写属性 → 读属性 → 验证值一致；回调触发；序列化          │
├─────────────────────────────────────────────────────────────────────────┤
│                        Layer 1: Schema 静态校验                            │
│      CI 阶段：schema 结构完整性、defaultValue 存在性、类型一致性              │
└─────────────────────────────────────────────────────────────────────────┘

```

### 测试工具集说明

| 工具              | 文件                                  | 层级 | 用途                                                      |
| ----------------- | ------------------------------------- | :--: | --------------------------------------------------------- |
| Schema 校验测试   | `__tests__/schema-validation.test.ts` |  L1  | 对全部 Schema 做结构校验                                  |
| PropertyVerifier  | `test-utils/PropertyVerifier.ts`      |  L2  | 验证默认值一致性、读写一致性、边界值、回调触发            |
| RenderFieldMapper | `test-utils/RenderFieldMapper.ts`     |  L3  | 静态分析 Schema 字段在 Plugin.ts 源码中的引用             |
| MockDrawContext   | `test-utils/MockDrawContext.ts`       |  L3  | Mock Canvas 2D 上下文，记录所有绘制 API 调用              |
| EndToEndValidator | `test-utils/EndToEndValidator.ts`     |  L4  | 完整链路：Schema → 构造 → 读写 → Render 无异常 → 字段使用 |
| VisualSnapshot    | `test-utils/VisualSnapshot.ts`        |  L5  | 属性变更前后渲染调用对比                                  |

### Directory 模式额外测试

Directory 模式插件还需额外测试：

| 测试项       | 说明                                         |
| ------------ | -------------------------------------------- |
| 独立构建成功 | `vite build` 无错误，产出 `index.mjs`        |
| 远程加载模拟 | Mock `import()` 验证 manifest 解析和插件注册 |
| 版本兼容性   | 验证 `sdkVersionRange` 校验逻辑              |
| 离线缓存     | Service Worker 缓存命中/更新测试             |

### 测试编写模板

```typescript
// __tests__/{category}/XxxPlugin.test.ts
import { XxxPlugin } from "../../{category}/{name}/XxxPlugin";
import { xxxPropertySchema } from "../../{category}/{name}/xxxPropertySchema";
import { PropertyVerifier } from "../test-utils/PropertyVerifier";
import { createMockDrawContext } from "../test-utils/MockDrawContext";
import { RenderFieldMapper } from "../test-utils/RenderFieldMapper";

describe("XxxPlugin — Schema 静态校验 (Layer 1)", () => {
  it("每个 field 应有 name、type 和 defaultValue", () => {
    /* ... */
  });
  it("color 类型的 defaultValue 应为有效 hex", () => {
    /* ... */
  });
  it("number 类型的 min 不应大于 max", () => {
    /* ... */
  });
});

describe("XxxPlugin — 属性读写一致性 (Layer 2)", () => {
  const verifier = new PropertyVerifier(XxxPlugin, xxxPropertySchema);

  it("所有 schema defaultProps 应与 constructor 初始化值一致", () => {
    expect(
      verifier.verifyDefaultValues().filter((r) => !r.passed),
    ).toHaveLength(0);
  });

  it("所有字段应支持 setPluginProps 写入并正确读取", () => {
    expect(verifier.verifyAll().failed).toBe(0);
  });

  it("onPropertyChanged 应在属性变更时触发", () => {
    const instance = verifier.createInstance();
    let changed = false;
    instance.onPropertyChanged = () => {
      changed = true;
    };
    instance.setPluginProps({ key: "value" });
    expect(changed).toBe(true);
  });
});

describe("XxxPlugin — 声明-渲染映射验证 (Layer 3)", () => {
  it("render 应在调用后不抛出错误", () => {
    const plugin = new XxxPlugin(0, 0, 100, 100);
    const { dc } = createMockDrawContext(100, 100);
    expect(() => plugin.render(dc)).not.toThrow();
  });

  it("所有字段在 render 源码中有引用", () => {
    const mapper = new RenderFieldMapper(
      xxxPropertySchema,
      "./{category}/{name}/XxxPlugin.ts",
    );
    const unusedFields = mapper.getUnusedFields();
    if (unusedFields.length > 0) {
      console.warn("未在 render 中使用的字段:", unusedFields);
    }
  });
});
```

### 运行测试

```bash
# 运行全部插件测试（根目录）
pnpm test:plugins

# 仅运行 Schema 校验
pnpm validate:schemas

# 进入插件目录运行
cd packages/plugins
pnpm test

# Directory 模式构建验证
pnpm build:plugins:directory
```

---

## 常见问题与根因

### 属性失效的 8 大根因（R1-R8）

| #      | 根因                                                 | 严重度 | 典型表现                               |
| ------ | ---------------------------------------------------- | :----: | -------------------------------------- |
| **R1** | Schema 声明了但 render 未消费                        | 🔴 高  | 属性面板有选项，改了但图形不变         |
| **R2** | usePluginConfig 双重 config 嵌套                     | 🔴 高  | 自定义 Config 组件写入路径错误         |
| **R3** | Schema defaultValue 与 constructor 不一致            | 🟡 中  | 初始渲染与 schema 声明不符             |
| **R4** | 属性写入路径与读取路径不匹配                         | 🟡 中  | `config.customProps` vs `config.style` |
| **R5** | 类型转换丢失精度/截断                                | 🟡 中  | number 类型修改后被四舍五入            |
| **R6** | BaseGraphic.update 中 properties.properties 键名误导 | 🔴 高  | 部分更新路径从未触发                   |
| **R7** | GenericConfig 与 \*Config.vue 读取路径不一致         | 🔴 高  | GenericConfig 正常，自定义 Config 无效 |
| **R8** | 颜色格式校验缺失                                     | 🟡 中  | 8 位 hex vs 6 位 hex，alpha 通道丢失   |

### 常见坑

1. **Schema 字段名 ≠ render 中使用的变量名**：Schema 的 `name` 必须与 `this.pluginProps.xxx` 中引用的属性名一致
2. **Color 未带 alpha 通道**：使用 `'#4CAF50'` 而非 `'#4CAF50FF'` 会导致透明度丢失
3. **defaultValue 与 setDefaultProps 不一致**：Schema 定义的值应通过 `buildDefaultsFromSchema()` 统一生成
4. **忘记调用 setDefaultProps**：constructor 中必须调用 `this.setDefaultProps({ ...defaultProps })`
5. **粗放式重定义 scheduleRedraw**：使用 setPluginProps 更新属性会自动触发重绘
6. **Directory 模式忘记声明 version**：`package.json` 中必须有 `version` 字段用于远程版本管理
7. **Directory 模式 peerDependencies 遗漏**：确保声明 `@scada-editor/plugin-sdk` 为 peerDependency

---

## 开发 CheckList

新增或修改图元插件时，逐项确认：

### 所有插件通用

- [ ] **Schema 文件**：
  - [ ] `fields` 中每个 field 都有 `name`、`label`、`type`、`defaultValue`
  - [ ] `number` / `range` 类型有 `min`、`max`、`step`
  - [ ] `select` 类型有 `options`（非空数组）
  - [ ] `color` 类型 `defaultValue` 为 8 位 hex（`#RRGGBBAA`）
  - [ ] `propsPath = 'customProps'`（默认值）

- [ ] **Plugin 类**：
  - [ ] `@Graphic({...})` 装饰器配置完整
  - [ ] constructor 中调用 `this.setDefaultProps({ ...defaultProps })`
  - [ ] `defaultProps` 通过 `buildDefaultsFromSchema()` 生成并与 schema 一致
  - [ ] `render(dc)` 使用 `this.pluginProps` 读取自定义属性
  - [ ] `render(dc)` 消费了 schema 声明的所有字段（无死属性）
  - [ ] 如有需要，覆写 `onPropertyChanged`、`onThemeChanged` 等生命周期钩子

- [ ] **入口文件**：
  - [ ] `index.ts` 通过 `createPlugin({...})` 导出默认注册对象
  - [ ] 同时导出 `XxxPlugin`、`xxxPropertySchema`、`XxxIcon`、`XxxConfig`

- [ ] **国际化（可选）**：
  - [ ] `locales/zh-CN.json` 和 `locales/en-US.json` 内容完整

- [ ] **测试文件**：
  - [ ] Layer 1: Schema 静态校验通过
  - [ ] Layer 2: `PropertyVerifier` 100% 通过（默认值 + 读写 + 边界值 + 回调）
  - [ ] Layer 3: `render()` 不抛异常，`RenderFieldMapper` 无死属性
  - [ ] Layer 4: `EndToEndValidator` 端到端验证通过

### Directory 模式额外检查

- [ ] **package.json**：
  - [ ] `version` 字段使用语义化版本
  - [ ] `pluginMeta` 包含 `type`、`category`、`deployMode`、`sdkVersionRange`
  - [ ] `peerDependencies` 声明 `@scada-editor/plugin-sdk`

- [ ] **vite.config.ts**：
  - [ ] 独立构建配置正确，output format 为 `es`
  - [ ] external 列表包含 `vue` 和 `@scada-editor/plugin-sdk`

- [ ] **plugin-manifest.json**：
  - [ ] `url` 指向正确的 CDN 地址
  - [ ] `checksum` 完整性校验值

- [ ] **构建验证**：
  - [ ] `pnpm build` 成功产出 `dist/index.mjs`
  - [ ] 独立文件大小合理（建议 < 100KB）

### CI 检查

- [ ] `pnpm validate:schemas` 通过
- [ ] `pnpm test:plugins` 通过
- [ ] `pnpm build:plugins:directory` 通过（directory 模式插件）

## 文档更新记录

| 版本 | 日期       | 更新内容                                                                        | 模型    |
| ---- | ---------- | ------------------------------------------------------------------------------- | ------- |
| v1.0 | —          | 初始版本                                                                        | —       |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化）                                              | GLM-5.2 |
| v1.2 | 2026-08-17 | 修正 deployMode（industrial/3d 改 directory）、目录结构扁平化、回填真实计数 161 | —       |
