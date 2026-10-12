---
name: "dev-lifecycle"
description: "提供软件开发生命周期全流程指导，包括需求分析、架构设计、编码开发、测试验证、代码审查等阶段。当用户询问如何开始新功能开发、遵循开发流程或需要完整的项目开发指南时调用。"
---

# 软件开发全流程指南

本 Skill 提供从需求到上线的完整开发流程指导，适用于 SS-SCADA 项目。

## 一、开发流程总览

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   需求分析   │───▶│   架构设计   │───▶│   编码实现   │───▶│   测试验证   │───▶│   代码审查   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼                  ▼
  功能说明书        详细设计文档        代码实现          单元/集成测试        PR Review
```

---

## 二、第一阶段：需求分析与设计

### 2.1 需求收集

#### 输入产物
- [功能说明书](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/01-功能说明/SS-SCADA用户手册-语雀版.md)
- 用户故事 / 用例描述
- 原型图或交互稿

#### 需求分析清单

```markdown
## 需求分析模板

### 1. 功能概述
- **功能名称**: [名称]
- **优先级**: P0(紧急) / P1(高) / P2(中) / P3(低)
- **目标用户**: [角色]
- **业务价值**: [描述]

### 2. 功能点拆解
| ID | 功能点 | 描述 | 复杂度 | 依赖 |
|----|--------|------|--------|------|
| F01 | ...   | ...  | 高/中/低 | - |

### 3. 验收标准
- [ ] AC1: ...
- [ ] AC2: ...

### 4. 技术约束
- 性能要求:
- 兼容性要求:
- 安全要求:

### 5. 影响范围
- **前端模块**: [列表]
- **后端模块**: [列表]
- **数据库变更**: [是/否]
- **API 变更**: [是/否]
```

### 2.2 架构设计

#### 设计文档位置

```
docs/
├── 03-架构设计/
│   ├── 前端-架构设计.md      # 整体前端架构
│   ├── 后端-API设计.md       # API 接口设计
│   ├── 后端-数据库设计.md     # 数据库模型
│   ├── 后端-框架设计.md       # NestJS 框架配置
│   └── 后端-概要设计.md       # 系统概要设计
└── 02-详细设计/
    ├── ss-editor/            # 前端详细设计
    │   ├── 00-系统全景/
    │   ├── 01-图元编辑/
    │   ├── 02-画布与页面/
    │   ├── 03-运行态/
    │   ├── 04-数据管理/
    │   ├── 05-脚本引擎/
    │   ├── 06-插件图元/
    │   ├── 07-开发手册/
    │   ├── 15-SCADA业务/
    │   └── 16-平台扩展/
    └── ss-services/          # 后端详细设计
```

#### 设计原则

1. **单一职责**: 每个模块只做一件事
2. **开放封闭**: 对扩展开放，对修改关闭
3. **依赖倒转**: 依赖抽象而非具体实现
4. **接口隔离**: 接口应该小而专一

#### 前端组件设计规范

参考: [前端-图元组件规范](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/前端-图元组件规范.md)

```typescript
// 组件结构示例
// packages/plugins/basic/button/index.ts
import type { IGraphicPlugin } from '@scada-editor/plugin-sdk'

export default {
  name: 'button',
  displayName: '按钮',
  icon: 'icon-button',
  category: 'basic',
  
  // 属性定义
  properties: {
    text: { type: 'string', default: 'Button' },
    width: { type: 'number', default: 100 },
    height: { type: 'number', default: 36 },
    backgroundColor: { type: 'color', default: '#1890ff' },
    borderRadius: { type: 'number', default: 4 }
  },

  // 事件定义
  events: ['click', 'mouseenter', 'mouseleave'],
  
  // 数据绑定支持
  dataBindings: [
    { property: 'text', type: 'string' },
    { property: 'visible', type: 'boolean' }
  ]
}
```

#### 后端模块设计规范

参考: [后端-开发规范](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/后端-开发规范.md)

```typescript
// NestJS 模块结构
// modules/device/device.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository],
  exports: [DeviceService]
})
export class DeviceModule {}
```

---

## 三、第二阶段：编码开发

### 3.1 开发环境准备

```bash
# 1. 克隆项目
git clone <repo-url>
cd ss-v7

# 2. 安装依赖 (使用 pnpm)
pnpm install

# 3. 启动开发服务
# 前端 Web
cd ss-editor/apps/web && pnpm dev

# 后端服务
cd %TARGET% && ppm start:dev

# 或使用快捷脚本
bin/start.bat           # 全部启动
bin/start-frontend.bat  # 仅前端
bin/start-backend.bat   # 仅后端
```

### 3.2 项目结构理解

#### Monorepo 包依赖关系

```
                    ┌─────────────────────────────────────────┐
                    │              Applications               │
                    ├─────────────┬───────────┬───────────────┤
                    │    web      │  desktop  │ desktop-tauri │
                    └──────┬──────┴─────┬─────┴───────┬───────┘
                           │            │             │
              ┌────────────┼────────────┼─────────────┘
              │            │            │
     ┌────────▼────────┐   │     ┌─────▼──────────┐
     │     system      │   │     │    editor      │
     │  (状态/路由/主题) │   │     │  (编辑器核心)   │
     └────────┬────────┘   │     └───────┬────────┘
              │            │             │
     ┌────────▼────────┐   │     ┌───────▼────────┐
     │      core       │◀──┴─────│    shared      │
     │  (画布/工具/类型) │         │  (公共组件)     │
     └────────┬────────┘         └────────────────┘
              │
     ┌────────▼────────┐
     │   plugin-sdk    │
     │  (插件开发接口)   │
     └────────┬────────┘
              │
     ┌────────▼──────────────────────────────────────┐
     │                   plugins                     │
     │  basic | chart | form | electric | mines |... │
     └───────────────────────────────────────────────┘
```

### 3.3 编码规范

#### TypeScript 规范

```typescript
// ✅ 正确的命名和类型定义
interface GraphicOptions {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number  // 可选属性
}

type GraphicType = 'rect' | 'circle' | 'path'

const DEFAULT_OPTIONS: GraphicOptions = {
  id: '',
  x: 0,
  y: 0,
  width: 100,
  height: 100
}

// 函数声明
function createGraphic(type: GraphicType, options?: Partial<GraphicOptions>): Graphic {
  // 实现...
}
```

#### Vue 组件规范

```vue
<!-- 使用 <script setup> + TypeScript -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PropType } from 'vue'

interface Props {
  modelValue: boolean
  options?: GraphicOptions[]
}

const props = withDefaults(defineProps<Props>(), {
  options: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [options: GraphicOptions[]]
}>()

// 响应式状态
const loading = ref(false)

// 计算属性
const hasOptions = computed(() => props.options.length > 0)

// 方法
function handleChange() {
  emit('update:modelValue', !props.modelValue)
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <div class="graphic-container">
    <!-- 模板内容 -->
  </div>
</template>

<style scoped>
.graphic-container {
  /* 样式 */
}
</style>
```

#### Git 提交规范

参考: [.trae/rules/git-commit-message.md](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/.trae/rules/git-commit-message.md)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具变动

**示例**:
```
feat(plugin): add new pump graphic component

- Add PumpPlugin with animation support
- Implement rotation and color binding
- Add SVG rendering for different states

Closes #123
```

### 3.4 新功能开发步骤

#### 步骤 1: 创建分支

```bash
# 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/<feature-name>

# 示例
git checkout -b feature/add-valve-plugin
```

#### 步骤 2: 实现功能

按照以下顺序开发：

1. **定义类型** (`types/index.ts`)
2. **实现核心逻辑** (`core/` 或对应包)
3. **创建 UI 组件** (Vue 组件)
4. **集成到系统** (注册路由/Store/插件)
5. **编写测试**

#### 步骤 3: 本地验证

```bash
# 运行 lint 检查
pnpm lint

# 运行类型检查
pnpm typecheck

# 运行测试
pnpm test

# 构建验证
pnpm build
```

#### 步骤 4: 提交代码

```bash
git add .
git commit -m "feat(scope): description"
git push origin feature/<feature-name>
```

---

## 四、第三阶段：测试验证

### 4.1 测试策略

| 测试类型 | 工具 | 覆盖范围 | 目标 |
|----------|------|----------|------|
| 单元测试 | Vitest | 工具函数、Store | ≥80% |
| 组件测试 | Vitest + Vue Test Utils | Vue 组件 | ≥70% |
| E2E 测试 | Playwright | 核心流程 | 关键路径 |
| API 测试 | Jest (后端) | NestJS 接口 | ≥75% |

### 4.2 前端测试

#### 单元测试示例

```typescript
// __tests__/utils/math.test.ts
import { describe, it, expect } from 'vitest'
import { clamp, roundToDecimal } from '@/packages/core/src/utils/math'

describe('Math Utils', () => {
  describe('clamp()', () => {
    it('should clamp value within range', () => {
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(5, 0, 10)).toBe(5)
    })
  })

  describe('roundToDecimal()', () => {
    it('should round to specified decimal places', () => {
      expect(roundToDecimal(3.14159, 2)).toBe(3.14)
      expect(roundToDecimal(1.005, 2)).toBe(1.01)
    })
  })
})
```

#### 组件测试示例

```typescript
// __tests__/components/ButtonComponent.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ButtonComponent from '@/components/ButtonComponent.vue'

describe('ButtonComponent', () => {
  const defaultProps = {
    text: 'Click Me',
    onClick: vi.fn()
  }

  it('renders correctly', () => {
    const wrapper = mount(ButtonComponent, { props: defaultProps })
    expect(wrapper.text()).toContain('Click Me')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(ButtonComponent, { props: defaultProps })
    await wrapper.find('button').trigger('click')
    expect(defaultProps.onClick).toHaveBeenCalled()
  })

  it('applies variant styles', () => {
    const wrapper = mount(ButtonComponent, {
      props: { ...defaultProps, variant: 'primary' }
    })
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })
})
```

### 4.3 后端测试

```typescript
// device.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DeviceService } from './device.service'
import { Device } from './entities/device.entity'

describe('DeviceService', () => {
  let service: DeviceService
  let mockRepo: any

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: getRepositoryToken(Device), useValue: mockRepo }
      ]
    }).compile()

    service = module.get<DeviceService>(DeviceService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return all devices', async () => {
    const devices = [{ id: '1', name: 'Test' }]
    mockRepo.find.mockResolvedValue(devices)

    const result = await service.findAll()
    expect(result).toEqual(devices)
    expect(mockRepo.find).toHaveBeenCalled()
  })
})
```

### 4.4 E2E 测试

参考: [e2e/core-flow.spec.ts](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/ss-editor/e2e/core-flow.spec.ts)

```typescript
// e2e/graphic-operations.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Graphic Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.canvas-container')
  })

  test('can create a rectangle graphic', async ({ page }) => {
    // 点击工具栏矩形按钮
    await page.click('[data-testid="tool-rectangle"]')
    
    // 在画布上绘制
    await page.mouse.click(100, 100)
    await page.mouse.move(200, 150)
    await page.mouse.click()
    
    // 验证图形已创建
    await expect(page.locator('.graphic-rect')).toHaveCount(1)
  })

  test('can select and move graphic', async ({ page }) => {
    // 先创建图形
    // 选择图形
    await page.click('.graphic-rect')
    
    // 拖拽移动
    const box = await page.locator('.graphic-rect').boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 50, box.y + 30)
      await page.mouse.up()
    }
    
    // 验证位置变化
    const newBox = await page.locator('.graphic-rect').boundingBox()
    expect(newBox?.x).toBeGreaterThan(box.x)
  })
})
```

### 4.5 测试运行命令

```bash
# 前端测试
cd ss-editor

# 所有测试
pnpm test

# 覆盖率报告
pnpm test:coverage --reporter=html

# 监听模式
pnpm test --watch

# 特定文件
pnpm test src/packages/core/__tests__

# 后端测试
cd %TESTDIR%
pnpm test

# E2E 测试
cd ss-editor
pnpm test:e2e
```

---

## 五、第四阶段：代码审查与发布

### 5.1 Code Review 清单

#### 功能完整性
- [ ] 所有验收标准是否满足？
- [ ] 边界情况是否处理？
- [ ] 错误处理是否完善？

#### 代码质量
- [ ] 命名是否清晰有意义？
- [ ] 是否有重复代码可以抽取？
- [ ] 函数/方法长度是否合理？
- [ ] 注释是否必要且准确？

#### 性能考虑
- [ ] 是否有不必要的重渲染？
- [ ] 大数据处理是否有优化？
- [ ] 内存泄漏风险？

#### 安全检查
- [ ] 是否有 XSS 风险？
- [ ] 输入是否经过验证？
- [ ] 敏感信息是否泄露？

### 5.2 PR 提交模板

```markdown
## 📝 变更说明
[简要描述本次变更的内容]

## 🔗 关联 Issue
Closes #<issue-number>

## 📸 截图/演示 (UI 变更必填)
[截图或 GIF]

## ✅ 变更清单
- [ ] 新增功能: ...
- [ ] 修复问题: ...
- [ ] 重构: ...

## 🧪 测试情况
- [ ] 单元测试通过
- [ ] 手动测试完成
- [ ] 无回归问题

## ⚠️ 注意事项
[需要 reviewer 特别关注的地方]
```

### 5.3 发布流程

参考: [前端-发布部署指南](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/09-运维与发布/前端-发布部署指南.md)

```bash
# 1. 版本号更新 (遵循语义化版本)
# MAJOR.MINOR.PATCH

# 2. 构建生产版本
pnpm build

# 3. 打包桌面应用
bin/build-desktop.bat
bin/build-tauri.bat

# 4. 发布到仓库
pnpm publish --filter @scada-editor/*

# 5. 创建 Git Tag
git tag v1.2.3
git push origin v1.2.3
```

---

## 六、常用命令速查

### 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev                # Web 前端
pnpm dev:desktop        # Electron 桌面端
pnpm dev:tauri          # Tauri 桌面端
ppm start:dev           # 后端

# 构建
pnpm build              # 全部构建
pnpm build:desktop      # 桌面端
pnpm build:tauri        # Tauri

# 代码质量
pnpm lint               # ESLint 检查
pnpm typecheck          # TypeScript 类型检查
pnpm format             # Prettier 格式化

# 测试
pnpm test               # 单元测试
pnpm test:e2e           # E2E 测试
pnpm test:coverage      # 覆盖率报告
```

### 包特定命令

```bash
# core 包
pnpm --filter @scada-editor/core test
pnpm --filter @scada-editor/core build

# plugins 包
pnpm --filter @scada-editor/plugins build

# system 包
pnpm --filter @scada-editor/system dev
```

---

## 七、问题排查指南

### 7.1 常见开发问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 端口被占用 | 上次进程未退出 | `npx kill-port 3000` |
| 依赖安装失败 | 网络/pnpm 缓存 | `pnpm store prune && pnpm install` |
| 类型错误 | TS 配置不一致 | 检查 tsconfig.json |
| HMR 不生效 | Vite 配置 | 重启 dev server |
| 样式不生效 | CSS Modules | 检查 scoped/class 命名 |

### 7.2 调试技巧

```typescript
// Vue DevTools
// 安装浏览器扩展，查看组件树和状态

// Console 调试
console.log('debug:', { state, props })

// VSCode 调试器
// launch.json 配置 breakpoints

// Network 面板
// 查看 API 请求/响应
```

---

## 八、文档资源索引

| 文档类别 | 路径 |
|----------|------|
| 功能说明 | [docs/01-功能说明/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/01-功能说明/) |
| 详细设计 | [docs/02-详细设计/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/02-详细设计/) |
| 架构设计 | [docs/03-架构设计/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/03-架构设计/) |
| 开发规范 | [docs/04-开发规范/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/04-开发规范/) |
| 联调文档 | [docs/05-前后端联调/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/05-前后端联调/) |
| 测试方案 | [docs/06-测试方案/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/06-测试方案/) |
| 运维部署 | [docs/09-运维与发布/](file:///f:/work/smartdata/202603_trace/trunk/code/ss-v7/docs/09-运维与发布/) |
