// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 插件事件类型定义（从 ss-core 重导出，2026-07-18）
 *
 * ss-core 是事件总线的所有者，定义所有事件类型。
 * 采集器 SDK 从此处重导出，方便插件相关代码使用。
 */
export type { PluginLifecycleEvent, ExecutorHealth, IsolationCrashEvent } from '@ss-node/ss-core';
