---
name: "test-helper"
description: "通用测试辅助工具，支持运行测试、生成测试用例、查看覆盖率报告等。当用户需要执行测试、编写测试代码、调试测试失败或询问测试相关问题时调用。"
---

# 通用测试工具

本 Skill 提供完整的测试辅助功能，包括测试执行、用例生成、覆盖率分析等。

## 一、测试运行

### 1.1 基础命令

```bash
# 运行所有测试
pnpm test

# 运行特定文件的测试
pnpm test src/utils/math.test.ts

# 监听模式（文件变化自动重新运行）
pnpm test --watch

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 只运行失败的测试
pnpm test --only-fails
```

### 1.2 Vitest 特定选项

```bash
# 运行匹配名称的测试
pnpm test -t "add function"

# 并行运行测试
pnpm test --threads

# 更新快照
pnpm test -u

# 显示详细报告
pnpm test --reporter=verbose
```

---

## 二、测试用例生成指南

### 2.1 单元测试模板

#### 工具函数测试

```typescript
// __tests__/utils/math.test.ts
import { describe, it, expect } from 'vitest'
import { add, subtract, multiply } from '@/utils/math'

describe('Math Utils', () => {
  describe('add()', () => {
    it('should add two positive numbers', () => {
      expect(add(1, 2)).toBe(3)
    })

    it('should handle negative numbers', () => {
      expect(add(-1, -2)).toBe(-3)
    })

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5)
    })

    it('should throw error for non-number input', () => {
      expect(() => add('a' as any, 1)).toThrow()
    })
  })

  describe('subtract()', () => {
    it('should subtract correctly', () => {
      expect(subtract(5, 3)).toBe(2)
    })
  })
})
```

#### 异步函数测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchData } from '@/api/client'

describe('fetchData', () => {
  it('should fetch data successfully', async () => {
    const data = await fetchData('/api/users')
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should handle errors', async () => {
    await expect(fetchData('/api/invalid')).rejects.toThrow()
  })

  it('should respect timeout', async () => {
    const start = Date.now()
    await expect(fetchData('/api/slow')).rejects.toThrow()
    expect(Date.now() - start).toBeLessThan(6000) // 5s timeout + buffer
  })
})
```

### 2.2 Vue 组件测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ButtonComponent from '@/components/ButtonComponent.vue'

describe('ButtonComponent', () => {
  // Props 测试
  it('renders with default props', () => {
    const wrapper = mount(ButtonComponent)
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Click me')
  })

  it('applies variant class', () => {
    const wrapper = mount(ButtonComponent, {
      props: { variant: 'primary' }
    })
    expect(wrapper.find('button').classes()).contain('btn-primary')
  })

  // Events 测试
  it('emits click event', async () => {
    const wrapper = mount(ButtonComponent)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')?.[0]).toEqual([])
  })

  // Slots 测试
  it('renders slot content', () => {
    const wrapper = mount(ButtonComponent, {
      slots: {
        default: 'Custom Content'
      }
    })
    expect(wrapper.text()).toContain('Custom Content')
  })

  // Disabled 状态
  it('disables button when disabled prop is true', () => {
    const wrapper = mount(ButtonComponent, {
      props: { disabled: true }
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
```

### 2.3 Pinia Store 测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '@/stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with zero', () => {
    const store = useCounterStore()
    expect(store.count).toBe(0)
  })

  it('increments count', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
  })

  it('computes doubled value', () => {
    const store = useCounterStore()
    store.increment()
    store.increment()
    expect(store.doubleCount).toBe(4)
  })
})
```

### 2.4 Mock 与 Stub

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from '@/services/user.service'
import { ApiClient } from '@/api/client'

describe('UserService', () => {
  let userService: UserService
  let mockApiClient: any

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    userService = new UserService(mockApiClient as ApiClient)
  })

  it('fetches user by ID', async () => {
    const mockUser = { id: 1, name: 'Test User' }
    mockApiClient.get.mockResolvedValue(mockUser)

    const user = await userService.getUser(1)

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/1')
    expect(user).toEqual(mockUser)
  })

  it('handles API errors', async () => {
    mockApiClient.get.mockRejectedValue(new Error('Network Error'))

    await expect(userService.getUser(999)).rejects.toThrow('Network Error')
  })
})
```

---

## 三、测试最佳实践

### 3.1 命名规范

```
✅ Good:
- describes the expected behavior
- should return null when user not found
- throws error for invalid input

❌ Bad:
- test 1
- it works
- check this
```

### 3.2 AAA 模式 (Arrange-Act-Assert)

```typescript
it('calculates total price', () => {
  // Arrange - 准备数据
  const items = [
    { name: 'Item 1', price: 10, quantity: 2 },
    { name: 'Item 2', price: 5, quantity: 3 }
  ]
  const calculator = new PriceCalculator()

  // Act - 执行操作
  const total = calculator.calculateTotal(items)

  // Assert - 验证结果
  expect(total).toBe(35)
})
```

### 3.3 测试隔离原则

- **每个测试应该独立运行**，不依赖其他测试的执行顺序
- 使用 `beforeEach`/`afterEach` 清理状态
- 避免共享可变状态

### 3.4 覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| 核心业务逻辑 | ≥ 90% |
| 工具函数 | ≥ 80% |
| UI 组件 | ≥ 70% |
| 类型定义 | N/A |

---

## 四、常见问题排查

### 4.1 测试超时

```typescript
// 增加单个测试的超时时间
it('handles slow operation', async () => {
  // ...
}, 10000) // 10秒超时
```

### 4.2 异步测试问题

```typescript
// ✅ 正确：使用 async/await
it('fetches data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// ❌ 错误：忘记 await
it('broken test', () => {
  const data = fetchData() // Promise 未等待
  expect(data).toBeDefined() // 总是 undefined
})

// ✅ 使用 flushPromises 等待所有异步操作完成
import { flushPromises } from '@vue/test-utils'

await wrapper.trigger('click')
await flushPromises()
expect(...).toBe(...)
```

### 4.3 Mock 清理

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

---

## 五、测试配置参考

### vitest.config.ts 关键配置

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
})
```

### 测试 Setup 文件

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { config } from '@vue/test-utils'

config.global.stubs = {
  'router-link': true,
  'router-view': true
}
```

---

## 六、快速诊断清单

当测试失败时，按以下步骤排查：

1. **检查错误信息** - 是否是断言失败还是异常抛出？
2. **检查 Mock** - Mock 是否正确设置和返回？
3. **检查异步** - 是否正确处理了 Promise？
4. **检查依赖** - 测试是否缺少必要的依赖注入？
5. **单独运行** - 用 `--run` 单独运行该测试文件确认问题
6. **添加日志** - 在测试中临时添加 `console.log` 调试
