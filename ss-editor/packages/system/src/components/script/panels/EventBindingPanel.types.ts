// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** 事件绑定配置 */
export interface EventBindingConfig {
  /** 事件全名，如 "data:changed" */
  eventFullName: string;
  /** 绑定的脚本ID */
  scriptId: string;
  /** 可选条件表达式 */
  condition?: string;
}