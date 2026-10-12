# @ss-node/ss-core

Smart SCADA Core Library — 核心库，提供认证、用户管理、WebSocket 实时通信、协议适配器接口、Pipeline 数据管道。

## Exports

- **core/auth/** — `AuthModule`, `AuthService`, `JwtAuthGuard`, Login/Register DTO
- **core/user/** — `UserModule`, `User` Entity
- **websocket/** — `WebSocketModule`, `ScadaWebSocketGateway`
- **protocols/** — `IProtocolAdapter` / `IDeviceContext` / `ITagContext` 接口定义, `ProtocolModule`
- **pipeline/** — 8-Step Pipeline: `ProtocolReadStep` → `TransformStep` → `DeadbandStep` → `QualityCheckStep` → `AlarmCheckStep` → `CacheUpdateStep` → `PersistStep` → `PublishStep`

## Usage

```typescript
import { AuthModule, JwtAuthGuard } from '@ss-node/ss-core';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
