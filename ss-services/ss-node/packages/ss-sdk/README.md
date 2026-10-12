# @ss-node/ss-sdk

Smart SCADA Node SDK — 共享类型定义、DTO 和工具函数包。所有其他包的基础依赖。

## Exports

- **types/** — `DataQuality`, `DeviceStatus`, `AlarmLevel`, `AlarmCondition`, `PaginationMeta`, `PaginatedResult`, `ApiResponse`, `ApiError`
- **dto/** — `PaginationDto`（通用分页查询参数）
- **utils/** — `generateId()`, `buildPaginatedResponse()`, `maskSensitive()`

## Usage

```typescript
import { PaginationDto, buildPaginatedResponse } from '@ss-node/ss-sdk';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
