// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { StructuredLogger } from './structured-logger.service';

/**
 * LoggerModule — 全局日志模块
 *
 * StructuredLogger 保留上下文/脱敏/采样能力，但文件输出已统一委托给
 * 全局 Winston（main.ts 通过 LoggerFactory 创建 DailyRotateFile transport）。
 * 此处不再需要 resolveLogFilePath / fileOutput 配置。
 *
 * 文件日志目录与轮转策略由 LoggerFactory.getLogConfig() 集中管理：
 *   {LOG_DIR}/app/app-%DATE%.log        — 应用日志
 *   {LOG_DIR}/error/error-%DATE%.log    — 错误日志
 */
@Global()
@Module({
  providers: [
    {
      provide: StructuredLogger,
      useFactory: () =>
        new StructuredLogger({
          logLevel: (process.env.LOG_LEVEL as any) || 'log',
          jsonFormat: process.env.NODE_ENV === 'production',
        }),
    },
  ],
  exports: [StructuredLogger],
})
export class LoggerModule {}
