---
name: "vue-node-best-practice"
description: "提供 Vue3 + Node.js 技术方案的最佳实践指导，包括项目结构、代码规范、性能优化、安全策略等。当用户询问 Vue 或 Node 技术选型、架构设计、开发规范、性能优化时调用。"
---

# Vue3 + Node.js 技术方案最佳实践

## 一、项目架构总览

本项目采用 **Monorepo** 架构，使用 pnpm workspaces 管理多包依赖。

### 1.1 前端架构 (Vue3)

```
ss-editor/
├── apps/
│   ├── web/              # Web 应用入口
│   ├── desktop/          # Electron 桌面端
│   └── desktop-tauri/    # Tauri 桌面端
├── packages/
│   ├── core/             # 核心逻辑库 (Canvas, 状态管理, 工具函数)
│   ├── ui/               # UI 组件库
│   └── plugins/          # 图元插件库
│       ├── basic/        # 基础图元 (button, label, shape...)
│       ├── chart/        # 图表图元
│       ├── form/         # 表单图元
│       └── industrial/   # 工业图元 (pump, valve, tank...)
```

### 1.2 后端架构 (NestJS)

```
%TARGET%/
├── src/
│   ├── main.ts           # 应用入口
│   ├── app.module.ts     # 根模块
│   ├── modules/          # 业务模块
│   │   ├── device/       # 设备管理
│   │   ├── project/      # 项目管理
│   │   ├── alarm/        # 告警管理
│   │   ├── report/       # 报表系统
│   │   └── ...
│   ├── common/           # 公共工具、拦截器、过滤器
│   └── config/           # 配置文件
```

---

## 二、Vue3 前端最佳实践

### 2.1 技术栈选型

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Vue | ^3.3.4 | Composition API 为主 |
| 构建工具 | Vite | ^4.4.9 | 快速冷启动、HMR |
| 类型系统 | TypeScript | ^5.2.2 | 严格模式 |
| 状态管理 | Pinia | ^2.1.7 | 轻量、TypeScript 友好 |
| UI 组件库 | Naive UI | ^2.34.4 | Vue3 专属组件库 |
| 路由 | Vue Router | ^4.2.5 | |
| 国际化 | Vue I18n | ^9.2.2 | |
| 测试 | Vitest | ^0.34.0 | 单元测试 |
| 画布引擎 | Konva | ^9.2.0 | 2D  Canvas 图形操作 |

### 2.2 代码规范

#### Composition API 风格

```typescript
// 推荐：使用 <script setup> + TypeScript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGraphicStore } from '@scada-editor/core'

// Props 定义
interface Props {
  graphicId: string
  editable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  editable: false
})

// Emits 定义
const emit = defineEmits<{
  update: [id: string, data: GraphicData]
  delete: [id: string]
}>()

// 状态
const loading = ref(false)
const graphicData = ref<GraphicData | null>(null)

// Store
const graphicStore = useGraphicStore()

// Computed
const isValid = computed(() => !!graphicData.value?.id)

// Methods
async function loadGraphic(id: string) {
  loading.value = true
  try {
    graphicData.value = await graphicStore.fetchById(id)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadGraphic(props.graphicId)
})
</script>
```

#### 命名规范

- **组件名**: PascalCase，多单词组合，如 `GraphicEditor.vue`
- **组合式函数**: `use` 前缀，如 `useGraphic.ts`, `useCanvasRender.ts`
- **Store**: `useXxxStore`，如 `useGraphicStore.ts`
- **类型/接口**: PascalCase，如 `GraphicData`, `CanvasOptions`
- **常量**: UPPER_SNAKE_CASE
- **文件组织**: 每个组件一个文件夹，包含 `.vue`, `.ts`, `.css`

### 2.3 状态管理 (Pinia)

```typescript
// stores/graphic.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Graphic, GraphicType } from '../types'

export const useGraphicStore = defineStore('graphic', () => {
  // State
  const graphics = ref<Graphic[]>([])
  const selectedId = ref<string | null>(null)

  // Getters (computed)
  const selectedGraphic = computed(() =>
    graphics.value.find(g => g.id === selectedId.value)
  )
  const graphicsByType = computed(() => (type: GraphicType) =>
    graphics.value.filter(g => g.type === type)
  )

  // Actions
  function addGraphic(graphic: Graphic) {
    graphics.value.push(graphic)
  }

  function removeGraphic(id: string) {
    const index = graphics.value.findIndex(g => g.id === id)
    if (index > -1) graphics.value.splice(index, 1)
  }

  function selectGraphic(id: string | null) {
    selectedId.value = id
  }

  return {
    graphics,
    selectedId,
    selectedGraphic,
    graphicsByType,
    addGraphic,
    removeGraphic,
    selectGraphic
  }
})
```

### 2.4 组件设计原则

1. **单一职责**: 每个组件只做一件事
2. **Props 向下传递**: 避免深层嵌套传递，必要时使用 Provide/Inject
3. **事件向上抛出**: 使用 `defineEmits` 明确定义事件
4. **插槽复用**: 使用具名插槽提高组件灵活性
5. **异步组件**: 大型组件使用 `defineAsyncComponent` 懒加载

```typescript
// 异步加载大型组件
const ChartConfig = defineAsyncComponent(() =>
  import('./ChartConfig.vue')
)
```

### 2.5 性能优化

- **v-show vs v-if**: 频繁切换用 `v-show`，条件渲染用 `v-if`
- **虚拟列表**: 大量数据使用虚拟滚动
- **防抖节流**: 输入搜索、窗口调整等场景
- **Computed 缓存**: 复杂计算使用 `computed`
- **Watch 精确监听**: 避免深度监听，指定具体路径

```typescript
// 精确监听
watch(
  () => props.graphicId,
  (newId) => { loadGraphic(newId) }
)

// 避免：深度监听整个对象
watch(props, () => { ... }, { deep: true }) // ❌
```

---

## 三、Node.js 后端最佳实践 (NestJS)

### 3.1 技术栈选型

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | NestJS | ^10.3.0 | 模块化、可扩展 |
| 语言 | TypeScript | ^5.2.2 | |
| 数据库 ORM | TypeORM | ^0.3.17 | |
| 认证 | Passport + JWT | ^10.0.3 | |
| 文档 | Swagger | ^7.2.0 | API 文档 |
| 日志 | Winston | ^3.11.0 | |
| 配置 | @nestjs/config | ^3.1.1 | 环境变量管理 |
| WebSocket | Socket.io | ^4.7.2 | 实时通信 |

### 3.2 模块设计

```typescript
// modules/device/device.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DeviceController } from './device.controller'
import { DeviceService } from './device.service'
import { DeviceRepository } from './device.repository'
import { Device } from './entities/device.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository],
  exports: [DeviceService]
})
export class DeviceModule {}
```

### 3.3 Controller 规范

```typescript
// modules/device/device.controller.ts
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe,
  HttpCode, HttpStatus
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { DeviceService } from './device.service'
import { CreateDeviceDto, UpdateDeviceDto, DeviceResponseDto } from './dto'

@ApiTags('设备管理')
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  @ApiOperation({ summary: '获取设备列表' })
  @ApiResponse({ status: 200, type: [DeviceResponseDto] })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.deviceService.findAll({ page, limit })
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备详情' })
  async findOne(@Param('id') id: string) {
    return this.deviceService.findOne(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建设备' })
  async create(@Body() dto: CreateDeviceDto) {
    return this.deviceService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新设备' })
  async update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.deviceService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除设备' })
  async remove(@Param('id') id: string) {
    return this.deviceService.remove(id)
  }
}
```

### 3.4 DTO 与验证

```typescript
// modules/device/dto/create-device.dto.ts
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DeviceType, DeviceProtocol } from '../enums'

export class CreateDeviceDto {
  @ApiProperty({ description: '设备名称' })
  @IsString()
  name: string

  @ApiProperty({ description: '设备类型', enum: DeviceType })
  @IsEnum(DeviceType)
  type: DeviceType

  @ApiPropertyOptional({ description: '通信协议', enum: DeviceProtocol })
  @IsOptional()
  @IsEnum(DeviceProtocol)
  protocol?: DeviceProtocol

  @ApiPropertyOptional({ description: '配置参数' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>
}
```

### 3.5 Service 层设计

```typescript
// modules/device/device.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Device } from './entities/device.entity'
import { CreateDeviceDto, UpdateDeviceDto } from './dto'

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>
  ) {}

  async findAll(options: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options
    const [data, total] = await this.deviceRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    })
    return { data, total, page, limit }
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({ where: { id } })
    if (!device) throw new NotFoundException(`Device ${id} not found`)
    return device
  }

  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepository.create(dto)
    return this.deviceRepository.save(device)
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id)
    Object.assign(device, dto)
    return this.deviceRepository.save(device)
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id)
    await this.deviceRepository.remove(device)
  }
}
```

### 3.6 异常处理

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()
    const message = exception.getResponse()

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`
    )

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message
    })
  }
}
```

---

## 四、前后端交互规范

### 4.1 API 设计原则

- **RESTful 风格**: 使用标准 HTTP 方法 (GET/POST/PUT/DELETE)
- **版本控制**: URL 路径中包含版本号 `/api/v1/devices`
- **统一响应格式**:

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.2 前端 HTTP 客户端封装

```typescript
// utils/http.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

class HttpClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    })

    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
      },
      (error) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // 统一错误处理
        if (error.response?.status === 401) {
          // 跳转登录
        }
        return Promise.reject(error)
      }
    )
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.instance.get<T>(url, config)
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post<T>(url, data, config)
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.put<T>(url, data, config)
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete<T>(url, config)
  }
}

export const http = new HttpClient()
```

### 4.3 WebSocket 实时通信

```typescript
// composables/useWebSocket.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export function useWebSocket(url: string) {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const lastMessage = ref<any>(null)

  onMounted(() => {
    socket.value = io(url, {
      transports: ['websocket'],
      autoConnect: true
    })

    socket.value.on('connect', () => {
      isConnected.value = true
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
    })

    socket.value.on('message', (data) => {
      lastMessage.value = data
    })
  })

  onUnmounted(() => {
    socket.value?.disconnect()
  })

  function emit(event: string, data?: any) {
    socket.value?.emit(event, data)
  }

  function on(event: string, handler: (data: any) => void) {
    socket.value?.on(event, handler)
  }

  return { socket, isConnected, lastMessage, emit, on }
}
```

---

## 五、安全规范

### 5.1 前端安全

- **XSS 防护**: 使用 `v-text` 替代 `v-html`，必须使用时进行 HTML 转义
- **CSRF 防护**: 使用 SameSite Cookie + CSRF Token
- **敏感信息**: 禁止在代码中硬编码密钥，使用环境变量
- **路由守卫**: 未登录用户拦截访问敏感页面

### 5.2 后端安全

- **输入验证**: 所有接口使用 class-validator 验证 DTO
- **SQL 注入**: 使用 TypeORM 参数化查询
- **认证授权**: JWT Token + Passport 策略
- **速率限制**: 敏感接口添加 @nestjs/throttler
- **CORS**: 配置白名单域名
- **日志脱敏**: 日志中隐藏密码、Token 等敏感信息

---

## 六、性能优化策略

### 6.1 前端优化

| 优化项 | 方案 |
|--------|------|
| 构建优化 | Vite 代码分割、Tree Shaking |
| 加载优化 | 路由懒加载、组件异步加载 |
| 资源优化 | 图片压缩、SVG 图标、字体子集 |
| 缓存策略 | HTTP 缓存、LocalStorage、IndexedDB |
| 渲染优化 | Virtual Scroll、Canvas 离屏渲染 |

### 6.2 后端优化

| 优化项 | 方案 |
|--------|------|
| 数据库 | 索引优化、查询优化、连接池 |
| 缓存 | Redis 缓存热点数据 |
| 并发 | 异步处理、消息队列 |
| 压缩 | Gzip/Brotli 响应压缩 |

---

## 七、测试策略

### 7.1 前端测试 (Vitest)

```typescript
// __tests__/graphic.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphicComponent from '../GraphicComponent.vue'

describe('GraphicComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(GraphicComponent, {
      props: { graphicId: 'test-1' }
    })
    expect(wrapper.find('.graphic').exists()).toBe(true)
  })

  it('emits update event', async () => {
    const wrapper = mount(GraphicComponent)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('update')
  })
})
```

### 7.2 后端测试 (Jest)

```typescript
// device.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { DeviceService } from './device.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Device } from './entities/device.entity'

describe('DeviceService', () => {
  let service: DeviceService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockRepository
        }
      ]
    }).compile()

    service = module.get<DeviceService>(DeviceService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
```

---

## 八、部署与 CI/CD

### 8.1 构建脚本

```bash
# 前端构建
pnpm --filter @scada-editor/core build
pnpm --filter @scada-editor/ui build
pnpm --filter scada-editor-web build

# 后端构建
pnpm --filter ss-data-server build
```

### 8.2 环境变量管理

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000

# .env.production
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=/ws
```

### 8.3 Docker 部署

```dockerfile
# Dockerfile (Frontend)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 九、开发工作流

1. **代码提交**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
2. **代码审查**: 提交 PR 前自测，至少 1 人 Review
3. **分支管理**: main (生产) → develop (开发) → feature/* (功能)
4. **自动化**: CI 运行 lint、typecheck、test，通过后方可合并

---

## 十、常用命令速查

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev              # Web
pnpm dev:desktop      # Electron
pnpm dev:tauri        # Tauri

# 构建
pnpm build            # 全部构建
pnpm build:desktop    # 桌面端

# 测试
pnpm test             # 运行测试
pnpm test:coverage    # 覆盖率

# 代码检查
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
```
