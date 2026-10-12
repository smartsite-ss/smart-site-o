# Smart SCADA Services - Node.js 开发规范

## 一、代码风格规范

### 1.1 TypeScript

- 使用 TypeScript 严格模式 (`"strict": true`)
- 避免使用 `any` 类型，优先使用具体类型或泛型
- 接口命名使用 `I` 前缀（如 `IProjectConfig`）
- 类型别名使用 `T` 前缀（如 `TDeviceType`）
- DTO（数据传输对象）命名使用 `XxxDto` 格式
- Entity（数据库实体）使用装饰器 `@Entity()`

### 1.2 静态类型检查规范

#### 1.2.1 检查工具

- **tsc**: TypeScript 编译器（处理 `.ts` 文件）
- **eslint**: 代码质量和风格检查工具

#### 1.2.2 检查命令

```bash
# 检查类型
pnpm typecheck

# 运行 ESLint 检查
pnpm lint

# 格式化代码
pnpm format
```

#### 1.2.3 检查流程

**开发流程：**

```
1. 编写/修改代码
   ↓
2. 运行类型检查
   - `pnpm typecheck` 检查类型
   - `pnpm lint` 检查代码风格
   ↓
3. 修复所有错误和警告
   - 必须解决：类型错误、ESLint 错误
   - 尽量解决：类型警告、ESLint 警告
   ↓
4. 提交代码前确保检查通过
```

**AI 修复代码流程：**

```
1. AI 修改代码完成
   ↓
2. 运行完整静态检查
   - `pnpm typecheck` 检查类型
   - `pnpm lint` 检查代码风格
   ↓
3. 解决所有发现的问题
   - 类型错误：优先修复类型定义
   - 类型警告：分析影响后修复或添加忽略
   - ESLint 错误：修复代码或配置规则
   ↓
4. 再次运行检查确认无误
```

#### 1.2.4 package.json 脚本配置

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
  }
}
```

#### 1.2.5 错误处理原则

1. **类型错误（Error）**：必须修复，不能提交
2. **类型警告（Warning）**：
   - 优先分析并修复
   - 如果是第三方库问题，可考虑 `@ts-expect-error` 或 `@ts-ignore`
   - 使用忽略时必须添加注释说明原因
3. **ESLint 错误（Error）**：必须修复
4. **ESLint 警告（Warning）**：尽量修复

#### 1.2.6 类型忽略使用规范

**正确示例：**

```typescript
// @ts-expect-error: 第三方库类型定义不完善，需要忽略
const result = someThirdPartyFunction();

// @ts-ignore: 临时绕过，待完善类型后移除
// TODO: 完善类型定义
const data = apiResponse as any;
```

**错误示例：**

```typescript
// ❌ 没有说明原因就忽略
// @ts-ignore
const bad = something();
```

#### 1.2.7 测试用例静态检测修正

##### 1.2.7.1 未使用变量处理

**问题描述：**
测试代码中存在声明但未使用的变量，影响代码可读性和维护性。

**解决方式：**
给未使用的变量加下划线前缀 `_`

**正确示例：**

```typescript
// ✅ 好的：未使用的变量加下划线前缀
const _unusedVariable = someValue;
const [_first, second] = array;
const { _unusedProp, usedProp } = object;
```

**错误示例：**

```typescript
// ❌ 不好的：未使用的变量没有下划线前缀
const unusedVariable = someValue;
const [first, second] = array; // first 未使用
const { unusedProp, usedProp } = object; // unusedProp 未使用
```

##### 1.2.7.2 使用 `as any` 处理测试模拟对象

**问题描述：**
测试代码中经常需要模拟各种对象，这些模拟对象的类型通常与实际类型不完全匹配，导致类型检查错误。

**解决方式：**
使用 `as any` 断言来处理测试模拟对象的类型不匹配问题。

**正确示例：**

```typescript
// ✅ 好的：使用 as any 处理模拟对象
jest.mock('@nestjs/typeorm', () => ({
  getRepositoryToken: jest.fn(),
}));

const mockRepository = {
  find: jest.fn(),
  save: jest.fn(),
};

// 使用 as any 处理 Repository 模拟
(getRepositoryToken as any).mockReturnValue(mockRepository);
```

#### 1.2.8 检查清单

在提交代码前，确认以下检查已通过：

- [ ] `pnpm typecheck` 无错误
- [ ] `pnpm lint` 无错误
- [ ] 所有类型警告已评估（已修复或合理忽略）
- [ ] 业务代码中未使用 `any` 类型替代具体类型（测试代码除外）
- [ ] DTO 和 Entity 有完整的类型定义
- [ ] 测试代码中的未使用变量已添加下划线前缀 `_`
- [ ] 测试中的模拟对象已使用 `as any` 处理类型不匹配问题

### 1.3 NestJS 代码规范

#### 1.3.1 模块结构

每个功能模块应包含：

- `xxx.module.ts` - 模块定义
- `xxx.controller.ts` - 控制器
- `xxx.service.ts` - 服务层
- `dto/` - 数据传输对象
- `entities/` - 数据库实体
- `guards/` - 守卫（可选）
- `interceptors/` - 拦截器（可选）
- `pipes/` - 管道（可选）

#### 1.3.2 命名规范

- **模块类**: `XxxModule`（如 `ProjectModule`）
- **控制器类**: `XxxController`（如 `ProjectController`）
- **服务类**: `XxxService`（如 `ProjectService`）
- **实体类**: `Xxx`（如 `Project`）
- **DTO 类**: `CreateXxxDto`, `UpdateXxxDto` 等
- **文件命名**: 与类名一致，使用 kebab-case（如 `project.controller.ts`）

#### 1.3.3 装饰器使用

- 使用 `@Controller()` 装饰控制器
- 使用 `@Injectable()` 装饰服务
- 使用 `@Module()` 装饰模块
- 使用 `@Entity()` 装饰实体
- 使用 `@InjectRepository()` 注入 Repository

### 1.4 函数与变量

- 函数命名采用 camelCase（如 `handleSaveProject`）
- 变量命名采用 camelCase（如 `projectConfig`）
- 常量命名采用 UPPER_SNAKE_CASE（如 `DEFAULT_SCAN_RATE`）
- 私有属性使用 `#` 前缀或 `private` 修饰符

### 1.5 代码格式化

- 使用 Prettier 自动格式化
- 缩进使用 2 个空格
- 单引号优先于双引号
- 语句结尾必须加分号

## 二、目录结构规范

### 2.1 项目结构（Monorepo）

```
ss-data/                           ← 根目录（Monorepo 管理）
├── apps/
│   └── ss-data-server/            ← 主应用（NestJS 启动入口）
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── ...
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
├── packages/                      ← 核心包（可复用模块）
│   ├── ss-core/                  ← @ss-node/ss-core（认证、用户、WebSocket、报警、Pipeline）
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   ├── ss-device/               ← @ss-node/ss-device（设备管理）
│   │   ├── src/
│   │   └── ...
│   ├── ss-project/              ← @ss-node/ss-project（项目管理）
│   │   ├── src/
│   │   └── ...
│   ├── ss-sdk/                  ← @ss-node/ss-sdk（公共类型定义）
│   │   ├── src/
│   │   └── ...
│   ├── ss-storage/              ← @ss-node/ss-storage（数据存储抽象）
│   │   ├── src/
│   │   └── ...
│   └── ss-collector/           ← @ss-node/ss-collector（数据采集框架）
│       ├── src/
│       └── ...
├── data/                         ← 数据目录（SQLite、配置）
├── docs/                         ← 技术文档
├── package.json                  ← Monorepo 根配置
├── pnpm-workspace.yaml          ← Workspace 配置
├── tsconfig.json                ← TypeScript 根配置
└── README.md
```

### 2.2 模块分类原则（Monorepo）

- **应用**: `apps/ss-data-server/` (主应用)
- **核心包**: `packages/ss-core/` (@ss-node/ss-core)
- **业务包**: `packages/ss-device/`, `packages/ss-project/`
- **采集包**: `packages/ss-collector/` (Modbus/OPC UA/MQTT)
- **存储包**: `packages/ss-storage/` (SQLite + InfluxDB)
- **SDK**: `packages/ss-sdk/` (公共类型定义)

## 三、数据库设计规范

### 3.0 双存储架构设计原则

**元数据存储**: SQLite 3.35+ (轻量级，零配置，单文件部署)  
**时序数据存储**: InfluxDB 2.7+ (列式压缩、自动降采样、高效范围查询)  
**设计原则**: 按数据特征分离存储，发挥各自优势

#### 3.0.1 存储职责划分

| 数据库       | 存储内容                                                                              | 写入频率       | 数据量级 |
| ------------ | ------------------------------------------------------------------------------------- | -------------- | -------- |
| **SQLite**   | 用户/权限、项目/页面、设备配置、标签定义、报警规则/记录、数据快照、审计日志、系统配置 | 低 (<10/s)     | MB~百MB  |
| **InfluxDB** | 标签历史值(tag_values)、聚合数据(tag_aggregations)                                    | 高 (数百~千/s) | GB~TB    |

#### 3.0.2 SQLite 设计规则

**必须遵守：**

- 使用 TypeORM 标准类型装饰器，由 TypeORM 自动映射
- 枚举字段使用 `VARCHAR`，应用层校验
- JSON 字段使用 `TEXT`，应用层序列化/反序列化
- 时间字段使用 `DATETIME`
- 布尔字段使用 `BOOLEAN` (TypeORM 自动转 0/1)
- 生产环境启用 WAL 模式 (`PRAGMA journal_mode=WAL`)

**绝对禁止：**

- 使用 PostgreSQL 特有的 `JSONB`、`ENUM` 类型
- 使用 CHECK 约束（跨库兼容性差）
- 在 SQLite 中存储大量时序数据（高频写入场景交 InfluxDB）
- 使用数据库特定的函数和语法

#### 3.0.3 InfluxDB 设计规则

**必须遵守：**

- 使用官方 Node.js SDK (`@influxdata/influxdb-client`)
- Measurement 命名：小写下划线（`tag_values`, `tag_aggregations`）
- Tag（索引列）用于快速过滤：`tag_id`, `device_id`, `project_id`, `quality`
- Field（值列）不可索引，存放数值：`value`, `original`, `string_val`, `bool_val`
- 写入采用批量模式：`writeApi.writePoints()` + 定时 `flush()`
- 降采样使用 InfluxDB Task 而非应用层定时任务
- Tag 值组合不宜过多（建议 <10万），tag_id 使用 UUID 是安全的

**环境配置：**

```bash
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=ss-data-deployment-token
INFLUXDB_ORG=ss-org
INFLUXDB_BUCKET=ss_node_data
INFLUXDB_BATCH_SIZE=1000
INFLUXDB_FLUSH_INTERVAL=5000
```

> 详细设计参考：[数据库设计文档](./docs/01-架构设计/数据库设计.md) §8 InfluxDB 时序数据设计

#### 3.0.4 类型映射标准

| 逻辑类型  | TypeORM 类型          | SQLite 映射    | 说明                   |
| --------- | --------------------- | -------------- | ---------------------- |
| 主键 UUID | `varchar(36)`         | TEXT           | 标准 UUID 格式         |
| 字符串    | `varchar(n)` / `text` | TEXT           | 根据长度选择           |
| JSON 数据 | `text`                | TEXT           | 应用层序列化           |
| 枚举值    | `varchar(n)`          | TEXT           | 应用层校验             |
| 整数      | `integer`             | INTEGER        | -                      |
| 精确数值  | `real`                | REAL           | SQLite 无 DECIMAL 精度 |
| 布尔值    | `boolean`             | INTEGER (0/1)  | TypeORM 自动转换       |
| 时间戳    | `datetime`            | TEXT (ISO8601) | 标准时间格式           |

#### 3.0.5 SQLite 枚举处理规范

```typescript
// 正确：使用 VARCHAR + 应用层校验
@Column('varchar', { length: 20 })
role: UserRole;  // 'admin' | 'user' | 'viewer'

// 在服务层或 DTO 中校验
@IsIn(['admin', 'user', 'viewer'])
role: string;

// 错误：使用数据库 ENUM 或 CHECK 约束
@Column({
  type: 'enum',  // 不兼容
  enum: ['admin', 'user', 'viewer']
})
role: string;
```

#### 3.0.6 JSON 数据处理规范

```typescript
// 正确：使用 TEXT 存储，应用层序列化
@Column('text', { nullable: true })
config: string;  // JSON 字符串

// 使用时解析
const configData = JSON.parse(entity.config);

// 错误：使用数据库 JSON 类型
@Column('jsonb')  // PostgreSQL 特有
config: Record<string, any>;
```

#### 3.0.7 TypeORM 实体示例

```typescript
import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('projects')
export class Project {
  // 使用 varchar 存储 UUID
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // 使用 text 存储 JSON
  @Column('text', { nullable: true })
  config: string; // JSON 字符串

  // 使用 varchar 存储枚举值
  @Column('varchar', { length: 20 })
  status: 'active' | 'inactive' | 'archived';

  // 使用 boolean，TypeORM 自动转换
  @Column('boolean', { default: true })
  is_active: boolean;

  // 使用 datetime 存储时间
  @Column('datetime')
  created_at: Date;

  @Column('datetime')
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column('varchar', { length: 36 })
  created_by: string;
}
```

#### 3.0.8 环境配置

```bash
# SQLite 配置
DATABASE_PATH=../../ss-run/ss/data/db/ss-data.db

# InfluxDB 配置
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=ss-data-deployment-token
INFLUXDB_ORG=ss-org
INFLUXDB_BUCKET=ss_node_data
INFLUXDB_BATCH_SIZE=1000
INFLUXDB_FLUSH_INTERVAL=5000
```

#### 3.0.9 注意事项

1. **双写一致性**：每条数据写入 SQLite 快照 + InfluxDB 历史，两个写入独立、容许短暂不一致（最终一致性）
2. **InfluxDB 降级**：InfluxDB 不可用时写入本地文件队列，恢复后回放
3. **索引策略**：SQLite 外键必须加索引；InfluxDB Tag 自动索引，Field 不可索引
4. **数据备份**：SQLite 复制文件即可；InfluxDB 使用 `influx backup` 命令
5. **文档同步**：所有数据库设计变更同步更新 [数据库设计文档](./docs/01-架构设计/数据库设计.md)

### 3.1 TypeORM 实体设计

- 使用 `@Entity()` 装饰实体
- 使用 `@PrimaryGeneratedColumn()` 定义主键
- 使用 `@Column()` 定义列
- 使用 `@CreateDateColumn()` 和 `@UpdateDateColumn()` 自动管理时间
- 使用 `@ManyToOne()`, `@OneToMany()` 定义关系
- 使用 `@JoinColumn()` 指定外键

**实体示例：**

```typescript
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  config: string; // JSON 字符串，应用层序列化

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: 'createdBy' })
  createdBy: User;

  @Column({ name: 'createdBy' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3.2 数据库迁移

- 使用 TypeORM 迁移管理数据库变更
- 迁移文件命名：`Timestamp-MigrationName.ts`
- 生成迁移：`pnpm typeorm migration:generate`
- 运行迁移：`pnpm typeorm migration:run`
- 回滚迁移：`pnpm typeorm migration:revert`

### 3.3 Repository 模式

- 在服务中注入 Repository
- 避免在控制器中直接使用 Repository
- 复杂查询封装在服务层方法中

## 四、API 设计规范

### 4.1 RESTful API 设计

- 使用 HTTP 动词：GET, POST, PATCH, DELETE
- 资源路径使用复数形式（如 `/projects`）
- 嵌套资源使用路径参数（如 `/projects/:projectId/devices`）
- 使用合适的 HTTP 状态码

### 4.2 路由前缀

- 所有 API 路由统一前缀：`/api/v1`
- 版本号使用路径形式（如 `v1`, `v2`）

### 4.3 Swagger 文档

- 使用 `@ApiTags()` 对 Controller 分组
- 使用 `@ApiOperation()` 描述接口功能
- 使用 `@ApiProperty()` 描述 DTO 属性
- 使用 `@ApiBearerAuth()` 标记需要认证的接口

### 4.4 DTO 设计

- 使用 `class-validator` 进行数据验证
- 使用 `class-transformer` 进行数据转换
- 创建操作使用 `CreateXxxDto`
- 更新操作使用 `UpdateXxxDto`（使用 `PartialType`）

**DTO 示例：**

```typescript
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '项目配置' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
```

## 五、错误处理规范

### 5.1 异常过滤器

- 使用 NestJS 异常过滤器统一处理异常
- 返回标准化的错误响应格式

**错误响应格式：**

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request",
  "timestamp": "2026-05-08T00:00:00.000Z",
  "path": "/api/v1/projects"
}
```

### 5.2 业务异常

- 定义自定义异常类
- 使用 NestJS 内置异常类（`NotFoundException`, `BadRequestException`, `UnauthorizedException` 等）
- 在服务层抛出异常，在控制器捕获或由全局过滤器处理

### 5.3 日志记录

- 使用 `@nestjs/common` 的 `Logger` 类
- 或使用 `winston` 进行高级日志记录
- 日志级别：debug, info, warn, error
- 生产环境日志应持久化存储

**日志使用示例：**

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  async create(createProjectDto: CreateProjectDto, userId: string) {
    this.logger.log(`创建项目: ${createProjectDto.name}`);
    try {
      // 业务逻辑
    } catch (error) {
      this.logger.error(`创建项目失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## 六、认证与授权规范

### 6.1 JWT 认证

- 使用 `@nestjs/jwt` 和 `@nestjs/passport`
- 实现 `JwtStrategy` 验证 Token
- 使用 `JwtAuthGuard` 保护路由
- Token 过期时间合理设置

### 6.2 角色授权

- 定义用户角色枚举
- 使用守卫实现角色检查
- 使用装饰器简化角色检查代码

**角色装饰器示例：**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../user/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

## 七、测试规范

### 7.1 测试文件结构

- 测试文件与源文件同目录或放在 `test/` 目录
- 单元测试命名：`xxx.service.spec.ts`
- E2E 测试命名：`xxx.e2e-spec.ts`
- 使用 `__tests__` 目录组织测试文件（可选）

### 7.2 测试工具

- 单元测试：Jest
- E2E 测试：Jest + Supertest
- Mock：使用 `jest.mock()` 和 `jest.spyOn()`

### 7.3 测试核心原则

#### 7.3.1 正确的测试流程

```
功能需求 → 编写测试用例 → 运行测试 →
  ↓
失败 → 分析原因
  ├─ 代码问题 → 修改业务代码 → 重新测试 → 通过
  └─ 测试问题 → 修改测试用例 → 重新测试 → 通过
```

#### 7.3.2 绝对禁止的反模式

❌ **不要为了通过测试而修改测试用例**

- 测试是用来验证代码的，不是反过来
- 如果测试不通过，首先检查代码是否有问题

❌ **不要让测试依赖实现细节**

- 测试应该关注行为，而不是内部实现
- 这样重构代码时测试不会失效

❌ **不要写脆弱的测试**

- 避免测试依赖外部状态或随机数据
- 确保测试是可重复的

#### 7.3.3 应该做的正确做法

✅ **测试行为，而不是实现**

```typescript
// ✅ 好的：测试行为
it('应该创建项目', async () => {
  const project = await service.create(createProjectDto, userId);
  expect(project.name).toBe(createProjectDto.name);
});

// ❌ 不好的：测试实现细节
it('应该调用 repository.save 方法', () => {
  const spy = jest.spyOn(repository, 'save');
  service.create(createProjectDto, userId);
  expect(spy).toHaveBeenCalled();
});
```

✅ **先写测试，再写代码（TDD 或 BDD）**

- 测试描述清楚期望的行为
- 代码实现来满足测试

✅ **测试命名清晰明确**

```typescript
// ✅ 好的命名
it('应该返回用户的项目列表', () => {});
it('应该在创建项目时验证用户权限', () => {});
it('应该在项目不存在时抛出 NotFoundException', () => {});

// ❌ 不好的命名
it('测试1', () => {});
it('createProject', () => {});
```

✅ **每个测试只测一件事**

- 保持测试简单、清晰
- 失败时容易定位问题

### 7.4 测试覆盖率

- 核心功能测试覆盖率 >= 80%
- 使用 `pnpm test:cov` 生成覆盖率报告

### 7.5 Mock 规范

- Repository 使用 `jest.mock` 模拟
- Service 依赖使用 `jest.spyOn` 模拟
- 测试结束后清理 mock 状态
- 使用 `as any` 处理类型不匹配问题（仅测试代码）

## 八、工业协议开发规范

### 8.1 协议接口设计

- 定义统一的协议适配器接口
- 每种协议实现独立的适配器类
- 适配器应支持连接、断开、读、写操作

**协议适配器接口：**

```typescript
export interface IProtocolAdapter {
  connect(device: IDeviceContext): Promise<any>;
  disconnect(client: any): Promise<void>;
  readTag(client: any, tag: ITagContext): Promise<{ tagId: string; value: any; timestamp: Date }>;
  writeTag(client: any, tag: ITagContext, value: any): Promise<void>;
}
```

### 8.2 设备连接状态机

设备连接必须实现完整的状态机，非简单的 online/offline 二元状态：

```
                    ┌──────────────┐
       init────────▶│   OFFLINE    │◀──────────┐
                    └──────┬───────┘           │
                      connect│                  │
                    ┌───────▼───────┐    disconnect│
                    │  CONNECTING   │───────────┘
                    └───────┬───────┘
                 success│      │fail (retry<max)
                    ┌───▼───┐  ┌▼──────────┐
                    │ ONLINE │  │CONNECTING │ (指数退避重试)
                    └───┬───┘  └───────────┘
            heartbeat│     │read/write fail
              fail   │     │(连续N次)
           ┌────────▼──┐  ┌▼──────────┐
           │DEGRADED   │  │   ERROR    │──▶ autoRecoveryTimer
           │(部分通信) │  │ (完全中断) │    (30s后重试)
           └───────────┘  └───────────┘
```

**状态转换规则**：

| 转换                    | 触发条件                  | 动作                        |
| ----------------------- | ------------------------- | --------------------------- |
| OFFLINE → CONNECTING    | 手动连接 / 首次启用       | 建立TCP/串口连接            |
| CONNECTING → ONLINE     | 首次读取成功              | 启动心跳检测                |
| CONNECTING → CONNECTING | 连接失败 + 重试次数 < max | 指数退避: 1s→2s→4s→8s→...   |
| CONNECTING → ERROR      | 连接失败 + 重试次数 ≥ max | 记录错误日志，30s后自动重试 |
| ONLINE → DEGRADED       | 连续心跳失败 < N次        | 标记部分通信异常            |
| DEGRADED → ONLINE       | 心跳恢复正常              | 恢复全功能                  |
| DEGRADED → ERROR        | 连续心跳失败 ≥ N次        | 进入完全中断                |
| ERROR → CONNECTING      | 定时器触发 (30s)          | 自动重试连接                |
| 任意状态 → OFFLINE      | 手动断开                  | 清理连接资源                |

### 8.3 连接管理

- 维护设备连接池（Map<deviceId, ConnectionState>）
- 连接超时处理（默认 10s）
- 最大并发连接数限制（防资源耗尽）
- 连接空闲自动回收（可选）

### 8.4 数据采集

- 采集通过 **Pipeline（责任链模式）** 执行，见详细设计 §5.1
- Pipeline 包含 8 个 Step：ProtocolRead → Transform → Deadband → QualityCheck → AlarmCheck(内联) → CacheUpdate → Persist(双写) → Publish(WS)
- 支持多种扫描速率（按标签 priority 分级调度）
- 批量读取优化（同设备相邻地址合并为一次协议请求）
- 采集背压控制（队列满时降频或丢弃旧数据）
- 异常处理和重试

## 九、WebSocket 规范

### 9.1 Gateway 设计

- 使用 `@WebSocketGateway()` 装饰器
- 使用 `@SubscribeMessage()` 订阅消息
- 使用 `@WebSocketServer()` 获取服务器实例
- 使用 `@ConnectedSocket()` 获取客户端实例

### 9.2 事件命名

- 使用 kebab-case 命名事件
- 格式：`资源:操作`
- 示例：`data:update`, `alarm:trigger`, `device:status`

### 9.3 消息格式

- 统一消息格式
- 包含事件类型和数据
- 添加时间戳和来源信息

**消息格式示例：**

```json
{
  "type": "data:update",
  "payload": {
    "tagId": "uuid",
    "value": 123.45,
    "timestamp": "2026-05-08T00:00:00.000Z"
  }
}
```

## 十、性能优化规范

### 10.1 数据库优化

- 使用索引优化查询性能
- 避免 N+1 查询问题
- 使用 `QueryBuilder` 构建复杂查询
- 合理使用关系加载（`eager` vs `lazy`）

### 10.2 缓存策略

- **L1 缓存 (内存 Map)**：最新值实时缓存，O(1) 读写，采集时即时更新
- **L2 缓存 (SQLite data_snapshots)**：最新值持久化快照，服务重启秒级恢复
- **L3 缓存 (InfluxDB 聚合)**：预计算的降采样数据，InfluxDB Task 自动维护
- 热点标签使用 TTL 标记，避免过期数据误用

### 10.3 异步处理

- **InfluxDB 批量缓冲写入**：`InfluxWriteBuffer` 实现，每5秒或1000条自动刷新
- **本地文件队列降级**：InfluxDB 不可用时，写入本地磁盘队列，恢复后回放
- Pipeline 内各 Step 串行执行、Pipeline 间并行执行（多设备独立采集）
- 报警记录写入异步执行（不阻塞采集管道）

## 十一、安全规范

### 11.1 数据验证

- 所有输入数据使用 DTO 和 class-validator 验证
- SQL 注入防护：使用 TypeORM 参数化查询
- XSS 防护：输出编码和验证

### 11.2 认证安全

- 使用 HTTPS（生产环境）
- 安全存储密码（bcrypt）
- Token 过期时间合理设置
- 实现 Token 刷新机制

### 11.3 授权安全

- 最小权限原则
- 验证资源所有权
- 防止越权访问

## 十二、提交规范

### 12.1 提交信息格式

```
<type>: <description>

[optional body]
```

### 12.2 类型说明

| 类型       | 说明          |
| ---------- | ------------- |
| `feat`     | 新功能        |
| `fix`      | 修复 bug      |
| `refactor` | 代码重构      |
| `docs`     | 文档更新      |
| `style`    | 代码格式调整  |
| `test`     | 测试用例      |
| `chore`    | 构建/工具更新 |
| `perf`     | 性能优化      |

### 12.3 示例

```
feat: 添加 Modbus 协议支持

- 实现 Modbus TCP 连接
- 添加数据读取和写入方法
- 实现自动重连机制
```

## 十三、最佳实践

### 13.1 单一职责原则

- 每个 Controller 只处理一个资源的 CRUD
- 每个 Service 只负责一个业务领域
- 每个 Entity 对应一个数据库表

### 13.2 依赖注入

- 使用 NestJS DI 容器管理依赖
- 避免硬编码依赖
- 便于测试和替换实现

### 13.3 模块化设计

- 按功能划分模块
- 模块之间低耦合
- 公共功能抽取到 `common/` 模块

### 13.4 代码复用

- 公共逻辑抽取为服务
- 通用装饰器集中管理
- 工具函数放在 `common/utils/`

## 十四、配置管理规范

### 14.1 环境变量

- 使用 `.env` 文件管理环境变量
- 提供 `.env.example` 模板
- 敏感信息不提交到版本控制
- 使用 `@nestjs/config` 模块管理配置

### 14.2 配置结构

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
});
```

---

**最后更新**: 2026-05-13
**版本**: v2.1 (新增 Batch Script 规范)

## 十五、Batch Script (.bat) 文件规范

### 15.1 编码要求

**强制规则**:

- ✅ **文件编码**: 必须使用 **UTF-8** (无 BOM)
- ✅ **语言要求**: 所有文本内容必须使用 **English**
- ❌ **禁止**: 使用 GBK/ANSI 编码
- ❌ **禁止**: 使用中文注释、提示信息、标签

### 15.2 命名规范

- 文件命名: `kebab-case.bat` (如 `build_ss_node.bat`)
- 脚本用途说明: 使用英文双冒号注释 `:: Description`
- 变量命名: `UPPER_SNAKE_CASE` (如 `PROJECT_ROOT`, `TARGET_DIR`)
- 标签命名: `lower_case` (如 `:build_complete`, `:menu`)

### 15.3 消息格式标准

#### 状态标签 (Status Tags)

| 标签         | 用途     | 颜色 |
| ------------ | -------- | ---- |
| `[INFO]`     | 信息提示 | 蓝色 |
| `[SUCCESS]`  | 操作成功 | 绿色 |
| `[DONE]`     | 步骤完成 | 绿色 |
| `[PASS]`     | 检查通过 | 绿色 |
| `[WARNING]`  | 警告信息 | 黄色 |
| `[ERROR]`    | 错误信息 | 红色 |
| `[TIP]`      | 提示建议 | 青色 |
| `[STEP n/m]` | 进度指示 | 蓝色 |

#### 消息示例

```batch
:: ✅ 正确示例 (UTF-8 + English)
echo [INFO] Project Root: %PROJECT_ROOT%
echo [STEP 1/4] Cleaning old build files...
echo [DONE] Build completed successfully
echo [ERROR] Node.js not found, please install Node.js 18+

:: ❌ 错误示例 (Chinese or non-UTF-8)
echo [信息] 项目根目录: %PROJECT_ROOT%
echo [错误] 未找到 Node.js
```

### 15.4 项目中的 .bat 文件清单

当前项目包含以下 **7 个 .bat 文件**（均已符合 UTF-8 + English 规范）：

| 文件路径                    | 功能                                        | 状态               |
| --------------------------- | ------------------------------------------- | ------------------ |
| `bin/build_ss_node.bat`     | 构建脚本 (Quick/Full/Production)            | ✅ UTF-8 + English |
| `bin/run_ss_node.bat`       | 运行脚本 (Dev/Debug/Prod with menu)         | ✅ UTF-8 + English |
| `bin/debug_ss_node.bat`     | ⭐ **一键调试启动** (No menu, direct debug) | ✅ UTF-8 + English |
| `bin/publish_ss_node.bat`   | 发布脚本 (Build+Copy+Deploy)                | ✅ UTF-8 + English |
| `bin/build_and_publish.bat` | 一键构建发布                                | ✅ UTF-8 + English |
| `bin/clean_ss_node.bat`     | 清理构建产物                                | ✅ UTF-8 + English |
| `compile-and-copy.bat`      | 编译并复制到运行目录                        | ✅ UTF-8 + English |

### 15.5 创建新 .bat 文件的模板

```batch
@echo off
:: Smart SCADA - Script Name
:: Brief description of script purpose

setlocal enabledelayedexpansion

:: Color definitions (optional)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "NC=[0m"

echo %CYAN%========================================%NC%
echo %CYAN%    Script Title (English)           %NC%
echo %CYAN%========================================%NC%
echo.

:: Main logic here
echo [INFO] Starting process...

:: Success/Failure handling
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%[SUCCESS]%NC% Operation completed successfully
) else (
    echo %RED%[ERROR]%NC% Operation failed
)

echo.
pause
```

### 15.6 检查清单

创建或修改 `.bat` 文件时，确认以下项：

- [ ] 文件保存为 **UTF-8** 编码（无 BOM）
- [ ] 所有 `echo` 输出文本为 **English**
- [ ] 所有 `:: 注释` 为 **English**
- [ ] 所有变量名使用 `UPPER_SNAKE_CASE`
- [ ] 使用标准状态标签 (`[INFO]`, `[DONE]`, `[ERROR]` 等)
- [ ] 错误消息包含明确的解决建议
- [ ] 脚本开头有清晰的标题和描述
- [ ] 包含必要的错误处理和退出码

### 15.7 工具推荐

#### 验证文件编码

**方法 1: 使用 VS Code**

1. 打开 `.bat` 文件
2. 查看右下角状态栏显示的编码（应为 UTF-8）
3. 如需转换: 点击编码 → 通过编码保存 → 选择 UTF-8

**方法 2: 使用命令行 (PowerShell)**

```powershell
# 检查文件编码
[System.IO.File]::ReadAllBytes("file.bat")[0..2]

# UTF-8 无 BOM 应返回: 239, 187, 191 (有 BOM) 或其他 (无 BOM)
# GBK 通常以特定字节序列开头
```

**方法 3: 使用 Git**

```bash
# 查看文件编码信息
git diff --stat -- "*.bat"

# 强制转换为 UTF-8
iconv -f GBK -t UTF-8 input.bat -o output.bat
```

### 15.8 常见问题与解决方案

#### Q1: Windows CMD 显示乱码？

**A**: 确保系统区域设置支持 UTF-8，或在脚本开头添加：

```batch
chcp 65001 >nul
```

#### Q2: 如何批量检查所有 .bat 文件编码？

**A**: 使用以下 PowerShell 脚本：

```powershell
Get-ChildItem -Path . -Filter "*.bat" -Recurse | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)[0..2]
    $encoding = if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { "UTF-8 BOM" }
                elseif ($bytes[0] -ge 0x80) { "Possibly ANSI/GBK" }
                else { "UTF-8 No BOM or ASCII" }

    Write-Host "$($_.FullName): $encoding"
}
```

#### Q3: Git 提交时自动检查编码？

**A**: 在 `.gitattributes` 中添加：

```gitattributes
*.bat text eol=crlf encoding=UTF-8
```

或在 pre-commit hook 中添加编码验证。

---

> **注意**: 此规范的目的是确保项目的批处理脚本具有国际兼容性，便于跨团队协作和 CI/CD 环境运行。

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
