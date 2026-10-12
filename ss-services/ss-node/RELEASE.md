#  ss-data 编译发布说

##  编译状

✅**\*编译成功*** 2026-05-0

##  完成的工

###  1. 项目结

```
ss-services/ss-data/
├── src/              # 源代码
├── dist/             # 编译输出（已生成）
├── package.json      # 依赖配置
├── tsconfig.json     # TypeScript 配置
└── DEVELOPMENT_GUIDELINES.md # 开发规范
```

###  2. 修复的问

- ✅ 修复了`WebSocketGateway`` 类名与装饰器名冲突的问
- ✅ 将类名重命名为`ScadaWebSocketGateway`
- ✅ 更新了相关模块引

###  3. 安装的依

- ✅ NestJS 核心框架和模
- ✅ TypeORM 数据库 OR
- ✅ Socket.IO WebSocket 支
- ✅ 工业协议库（Modbus, OPC UA, MQTT
- ✅ JWT 认证和 Passpor
- ✅ 开发工具（TypeScript, ESLint, Prettier, Jest

##  目录说

###  编译输出目录 (dist/

包含所有编译后的文件

- `.js`` - 编译后的 JavaScript 代
- `.js.map`` - Source map 文
- `.d.ts`` - TypeScript 类型定义文

###  源代码目录 (src/

- `auth/`` - 认证模
- `user/`` - 用户模
- `project/`` - 项目管理模
- `device/`` - 设备管理模
- `alarm/`` - 报警管理模
- `data/`` - 数据管理模
- `protocol/`` - 工业协议模
- `websocket/`` - WebSocket 模
- `app.module.ts`` - 根模
- `main.ts`` - 应用入

##  运行应

###  开发模

```bash
cd ss-services/ss-data
pnpm start:dev
```

###  生产模

```bash
cd ss-services/ss-data
pnpm build  # 已完成
pnpm start:prod
```

###  查看 API 文

启动后访问`http://localhost:4000/api-docs`

##  环境配

确保已设置`.env`` 文件

```env
NODE_ENV=development
PORT=4000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=smart_scada
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

##  下一

1. **\*数据库设***：创建 PostgreSQL 数据库并运行迁
2. **\*测试运***：运行`pnpm test`` 执行单元测
3. **\*开发功***：根据需求开发具体业务功
4. **\*前端集***：与 scada-editor 前端应用集

##  注意事

- 生产环境请修改`JWT_SECRET`` 为安全的密
- 确保数据库连接配置正
- 首次运行前需创建数据
- 工业协议需要相应的设备或模拟器才能测

---

**\*编译完成时***：2026-05-0\
**\*版***：1.0.

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
