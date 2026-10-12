# @ss-node/ss-alarm

Smart SCADA Alarm Management Library — 报警规则管理与事件记录追踪。

## Exports

- `AlarmModule` — NestJS 模块
- `AlarmService` — 报警 CRUD + 确认/清除操作
- `AlarmRule` Entity — 支持 GT/LT/EQ/NEQ/GTE/LTE/RANGE 条件
- `AlarmRecord` Entity — ACTIVE → ACKNOWLEDGED → CLEARED 状态机

## Usage

```typescript
import { AlarmModule } from '@ss-node/ss-alarm';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
