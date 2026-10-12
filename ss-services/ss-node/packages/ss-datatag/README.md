# @ss-node/ss-datatag

Smart SCADA Data Tag Library — 数据标签处理服务：工程转换、死区过滤、质量检查。

## Exports

- `DatatagModule` — NestJS 模块
- `TransformService` — linear scale / polynomial / lookupTable
- `DeadbandService` — absolute / relative / time 三种死区
- `QualityService` — range check / staleness check

## Usage

```typescript
import { DatatagModule, TransformService } from '@ss-node/ss-datatag';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
