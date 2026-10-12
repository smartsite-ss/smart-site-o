# @ss-node/ss-device

Smart SCADA Device Management Library — 设备管理与数据标签实体定义。

## Exports

- `DeviceModule` — NestJS 模块
- `DeviceService` — 设备 CRUD 业务逻辑
- `Device` Entity — 支持 Modbus TCP/RTU, OPC UA, MQTT
- `DataTag` Entity — 8 种数据类型, linear scaling

## Usage

```typescript
import { DeviceModule, Device } from '@ss-node/ss-device';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
