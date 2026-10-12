// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 定时器相关类型定义
 */

/**
 * 单个定时器配置
 */
export interface ITimerConfig {
  id: string;                    // 定时器唯一ID
  name: string;                  // 定时器名称
  enabled: boolean;              // 是否启用
  interval: number;              // 执行间隔（毫秒）
  script: string;                // JavaScript脚本内容
  type: 'interval' | 'timeout';  // 定时器类型
  repeatCount?: number;          // 重复次数（仅timeout类型有效）
  lastExecuteTime?: number;      // 上次执行时间
  executeCount?: number;         // 已执行次数
}

/**
 * 页面定时器上下文
 */
export interface ITimerContext {
  page: any;                     // 当前页面对象
  getGraphics: () => any[];      // 获取所有图元
  getGraphicById: (id: string) => any | null; // 根据ID获取图元
  updateGraphicProperty: (id: string, propertyPath: string, value: any) => void; // 更新图元属性
  refreshDisplay: () => void;    // 刷新显示
}

/**
 * 定时器执行结果
 */
export interface ITimerExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  timestamp: number;
}

/**
 * 默认定时器配置
 */
export const DEFAULT_TIMER_CONFIG: Partial<ITimerConfig> = {
  name: 'New Timer',
  enabled: true,
  interval: 1000,
  script: '// 在这里写你的脚本\n// 示例: page.getGraphicById("id")',
  type: 'interval',
  executeCount: 0,
};
