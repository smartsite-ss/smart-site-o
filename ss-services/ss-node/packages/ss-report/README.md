# @ss-node/ss-report

Smart SCADA Report Library — 报表模板管理与报表生成。

## Exports

- `ReportModule` — NestJS 模块
- `ReportService` — 日报/月报生成
- 日报: `POST /projects/:projectId/reports/daily`
- 月报: `POST /projects/:projectId/reports/monthly`

## Usage

```typescript
import { ReportModule } from '@ss-node/ss-report';
```

## 文档更新记录

| 版本 | 日期 | 更新内容 | 模型 |
| ---- | ---- | -------- | ---- |
| v1.0 | — | 初始版本 | — |
| v1.1 | 2026-08-02 | 补充文档更新记录章节（统一规范化） | GLM-5.2 |
