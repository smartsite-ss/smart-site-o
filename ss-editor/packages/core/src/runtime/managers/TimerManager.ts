// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ITimerConfig, ITimerExecutionResult, DEFAULT_TIMER_CONFIG } from '../../types/timer';
import { IPage } from '../../graphic-editing/graphic/base/IPage';
import { ScriptError, errorService } from '../../utils/core/errors';

/**
 * 定时器管理器
 * 负责管理页面的所有定时器
 */
export class TimerManager {
  private timers: Map<string, ITimerConfig> = new Map();
  private runningTimers: Map<string, any> = new Map(); // 存储setTimeout/setInterval的ID
  private executionLogs: Map<string, ITimerExecutionResult[]> = new Map();
  
  private readonly MAX_LOGS_PER_TIMER = 100;

  /**
   * 自动生成定时器名称
   * 格式：定时器01, 定时器02... 基于已存在名称的最大编号+1
   * 中间删除后不会复用已删除编号
   */
  private generateTimerName(): string {
    let maxNum = 0;
    for (const timer of this.timers.values()) {
      const match = timer.name.match(/定时器(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `定时器${String(maxNum + 1).padStart(2, '0')}`;
  }

  /**
   * 构造函数
   */
  constructor() {}

  /**
   * 获取所有定时器
   */
  getAllTimers(): ITimerConfig[] {
    return Array.from(this.timers.values());
  }

  /**
   * 获取单个定时器
   */
  getTimer(id: string): ITimerConfig | null {
    return this.timers.get(id) || null;
  }

  /**
   * 添加定时器
   * 名称按"定时器01, 定时器02..."格式自动生成（基于已存在名称最大编号+1）
   */
  addTimer(timerConfig: Omit<ITimerConfig, 'id' | 'lastExecuteTime' | 'executeCount'>): ITimerConfig {
    const isNameExplicitlySet = timerConfig.name !== undefined && timerConfig.name !== '';

    const timer: ITimerConfig = {
      ...DEFAULT_TIMER_CONFIG,
      ...timerConfig,
      id: `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastExecuteTime: undefined,
      executeCount: 0,
    };

    // 未显式传入名称时（或名称沿用默认值），按"定时器01"格式自动生成
    if (!isNameExplicitlySet || timer.name === DEFAULT_TIMER_CONFIG.name) {
      timer.name = this.generateTimerName();
    }

    this.timers.set(timer.id, timer);
    this.executionLogs.set(timer.id, []);
    return timer;
  }

  /**
   * 更新定时器
   */
  updateTimer(id: string, config: Partial<ITimerConfig>): void {
    const timer = this.timers.get(id);
    if (timer) {
      // 如果是更新enabled状态，需要先停止再启动
      const wasEnabled = timer.enabled;
      
      Object.assign(timer, config);
      
      if (config.enabled !== undefined && config.enabled !== wasEnabled) {
        if (config.enabled) {
          this.startTimer(id);
        } else {
          this.stopTimer(id);
        }
      }
    }
  }

  /**
   * 删除定时器
   */
  removeTimer(id: string): void {
    this.stopTimer(id);
    this.timers.delete(id);
    this.executionLogs.delete(id);
  }

  /**
   * 启用定时器
   */
  enableTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer && !timer.enabled) {
      timer.enabled = true;
    }
  }

  /**
   * 禁用定时器
   */
  disableTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer && timer.enabled) {
      timer.enabled = false;
      this.stopTimer(id);
    }
  }

  /**
   * 启动单个定时器
   */
  startTimer(id: string, page?: IPage): void {
    const timer = this.timers.get(id);
    if (!timer || !timer.enabled) {
      return;
    }

    // 如果已经在运行，先停止
    this.stopTimer(id);

    // 创建执行器
    const execute = () => {
      try {
        if (page) {
          this.executeTimerScript(timer, page);
        } else {
          this.executeTimer(timer);
        }
      } catch (error) {
        console.error(`Timer ${timer.id} execution error:`, error);
      }
    };

    let intervalId: ReturnType<typeof setTimeout>;
    if (timer.type === 'interval') {
      // 间隔定时器
      intervalId = setInterval(execute, timer.interval) as unknown as ReturnType<typeof setTimeout>;
    } else {
      // 超时定时器，支持重复
      const executeTimeout = (remaining: number) => {
        if (remaining <= 0) return;
        
        intervalId = setTimeout(() => {
          try {
            if (page) {
              this.executeTimerScript(timer, page);
            } else {
              this.executeTimer(timer);
            }
            if (timer.repeatCount === undefined || timer.repeatCount < 0 || (timer.executeCount ?? 0) < timer.repeatCount) {
              executeTimeout(remaining - 1);
            }
          } catch (error) {
            console.error(`Timer ${timer.id} execution error:`, error);
          }
        }, timer.interval);
        
        this.runningTimers.set(id, intervalId);
      };
      
      executeTimeout(timer.repeatCount || Infinity);
      return;
    }

    this.runningTimers.set(id, intervalId);
  }

  /**
   * 停止单个定时器
   */
  stopTimer(id: string): void {
    const intervalId = this.runningTimers.get(id);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      clearTimeout(intervalId);
      this.runningTimers.delete(id);
    }
  }

  /**
   * 启动所有启用的定时器
   */
  startAllTimers(): void {
    for (const [id, timer] of this.timers.entries()) {
      if (timer.enabled) {
        this.startTimer(id);
      }
    }
  }

  /**
   * 停止所有定时器
   */
  stopAllTimers(): void {
    for (const id of this.runningTimers.keys()) {
      this.stopTimer(id);
    }
  }

  /**
   * 执行定时器脚本
   * @param page 可选页面对象，传入后脚本可通过 page API 访问图元和脚本引擎接口
   */
  executeTimer(timer: ITimerConfig, page?: IPage): ITimerExecutionResult {
    const result: ITimerExecutionResult = {
      success: true,
      timestamp: Date.now(),
    };

    try {
      // 创建沙箱执行环境（传入 page 时，脚本可通过 page 对象访问图元及脚本引擎接口）
      const output = this.executeScriptInSandbox(timer.script, timer.id, page || null);
      result.output = output;

      // 更新执行统计
      timer.lastExecuteTime = Date.now();
      timer.executeCount = (timer.executeCount || 0) + 1;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    // 记录执行日志
    this.addExecutionLog(timer.id, result);
    return result;
  }

  /**
   * 执行定时器脚本（带page参数）
   */
  executeTimerScript(timer: ITimerConfig, page: IPage): ITimerExecutionResult {
    const result: ITimerExecutionResult = {
      success: true,
      timestamp: Date.now(),
    };

    try {
      // 创建沙箱执行环境
      const output = this.executeScriptInSandbox(timer.script, timer.id, page);
      result.output = output;

      // 更新执行统计
      timer.lastExecuteTime = Date.now();
      timer.executeCount = (timer.executeCount || 0) + 1;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    // 记录执行日志
    this.addExecutionLog(timer.id, result);
    return result;
  }

  /**
   * 在沙箱中执行脚本
   */
  private executeScriptInSandbox(script: string, timerId: string, page: IPage | null): string {
    const output: string[] = [];
    
    // 创建沙箱执行环境
    const sandbox: Record<string, any> = {
      // 页面相关 API
      page: page ? {
        id: page.id,
        name: page.name,
        width: page.width,
        height: page.height,
        // 获取所有图元
        getGraphics: () => page.getGraphics(),
        // 根据 ID 获取图元
        getGraphicById: (id: string) => {
          // 使用 BasePage 的 findGraphicById 方法，它会从 graphicManager 中查找
          const graphic = page.findGraphicById(id);
          if (!graphic) {
            return null;
          }
          // 返回一个简化但可靠的图元对象包装
          return {
            id: graphic.id,
            type: graphic.type,
            // 直接访问属性的方法
            getProperty: (path: string, defaultValue?: any) => {
              return this.getNestedProperty(graphic, path, defaultValue);
            },
            // 直接访问位置
            getPosition: () => {
              const geometry = graphic.config?.geometry || {};
              return {
                x: geometry.x ?? 0,
                y: geometry.y ?? 0
              };
            },
            getSize: () => {
              const geometry = graphic.config?.geometry || {};
              return {
                width: geometry.width ?? 100,
                height: geometry.height ?? 100
              };
            }
          };
        },
        // 更新图元属性
        updateGraphicProperty: (id: string, propertyPath: string, value: any) => {
          
          // 构建正确的属性对象 - 注意，只需要 config 下面的属性！
          const keys = propertyPath.split('.');
          const properties: Record<string, any> = {};
          
          // 确保我们跳过 'config' 前缀（如果有的话）
          let startIndex = 0;
          if (keys.length >= 2 && keys[0] === 'config' && keys[1] === 'config') {
            startIndex = 2;
          }
          
          // 构建嵌套属性对象
          let current = properties;
          for (let i = startIndex; i < keys.length - 1; i++) {
            current[keys[i]] = {};
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          
          page.updateGraphic(id, properties);
        },
        // 移动图元（更方便的方法）
        moveGraphic: (id: string, x: number, y: number) => {
          page.moveGraphic(id, x, y);
        },
        // 批量更新图元
        batchUpdateGraphics: (updates: Array<{ id: string; properties: Record<string, any> }>) => {
          updates.forEach(u => {
            page.updateGraphic(u.id, u.properties);
          });
        },
        // 刷新显示
        refreshDisplay: () => {},
      } : null,
      // 工具函数
      utils: {
        log: (...args: any[]) => {
          output.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '));
        },
        formatDate: (date?: Date) => {
          const d = date || new Date();
          return d.toLocaleString();
        },
        random: (min: number, max: number) => {
          return Math.random() * (max - min) + min;
        },
        sleep: (ms: number) => {
          return new Promise((resolve) => setTimeout(resolve, ms));
        },
      },
      // 定时器相关API
      timer: {
        id: timerId,
        getCurrentTimer: () => this.getTimer(timerId),
        getExecutionCount: () => (this.getTimer(timerId)?.executeCount || 0),
      },
      // 数据绑定API（占位）
      data: {
        getValue: (_key: string) => null,
        setValue: (_key: string, _value: any) => {},
      },
    };

    // ══════════════════════════════════════════════════════
    // 注入顶级 API（与 ScriptEngine ScriptAPI 保持兼容）
    // ══════════════════════════════════════════════════════
    // 图元操作 API
    sandbox.showGraphic = (id: string) => {
      if (page) page.updateGraphic(id, { visible: true });
    };
    sandbox.hideGraphic = (id: string) => {
      if (page) page.updateGraphic(id, { visible: false });
    };
    sandbox.setGraphicProps = (id: string, props: Record<string, any>) => {
      if (page) page.updateGraphic(id, props);
    };
    sandbox.moveGraphic = (id: string, x: number, y: number) => {
      if (page) page.moveGraphic(id, x, y);
    };
    // 前端定时器 API（基于浏览器原生 setTimeout/setInterval）
    sandbox.setTimeout = (callback: (...args: any[]) => any, delay: number): number => {
      return setTimeout(callback, delay) as unknown as number;
    };
    sandbox.clearTimeout = (id: number): void => {
      clearTimeout(id);
    };
    sandbox.setInterval = (callback: (...args: any[]) => any, interval: number): number => {
      return setInterval(callback, interval) as unknown as number;
    };
    sandbox.clearInterval = (id: number): void => {
      clearInterval(id);
    };
    // sleep（与 ClientScriptAPI 保持兼容，返回 Promise）
    sandbox.sleep = (ms: number): Promise<void> => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    // 创建安全的脚本执行环境（支持 async/await）
    try {
      const sandboxKeys = Object.keys(sandbox);
      const sandboxValues = Object.values(sandbox);
      // 用 async IIFE 包裹，使 await sleep() 等异步调用可用
      const fn = new Function(...sandboxKeys, `return (async () => {\n${script}\n})();`);
      const result = fn(...sandboxValues);
      // 如果结果是 Promise，不阻塞执行（避免阻塞 interval 循环）
      if (result instanceof Promise) {
        result.catch((error: any) => {
          const err = new ScriptError(
            timerId,
            error instanceof Error ? error.message : String(error)
          );
          errorService.record(err, 'TimerManager.executeScriptInSandbox');
        });
      }
      return output.join('\n');
    } catch (error) {
      const err = new ScriptError(
        timerId,
        error instanceof Error ? error.message : String(error)
      );
      errorService.record(err, 'TimerManager.executeScriptInSandbox');
      throw err;
    }
  }

  /**
   * 获取嵌套属性
   */
  private getNestedProperty(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length; i++) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[keys[i]];
    }
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * 添加执行日志
   */
  private addExecutionLog(timerId: string, result: ITimerExecutionResult): void {
    let logs = this.executionLogs.get(timerId);
    if (!logs) {
      logs = [];
      this.executionLogs.set(timerId, logs);
    }
    logs.push(result);
    
    // 限制日志数量
    if (logs.length > this.MAX_LOGS_PER_TIMER) {
      logs.shift();
    }
  }

  /**
   * 获取执行日志
   */
  getExecutionLogs(timerId: string): ITimerExecutionResult[] {
    return this.executionLogs.get(timerId) || [];
  }

  /**
   * 清除执行日志
   */
  clearExecutionLogs(timerId?: string): void {
    if (timerId) {
      this.executionLogs.set(timerId, []);
    } else {
      for (const key of this.executionLogs.keys()) {
        this.executionLogs.set(key, []);
      }
    }
  }

  /**
   * 检查定时器是否在运行
   */
  isTimerRunning(id: string): boolean {
    return this.runningTimers.has(id);
  }

  /**
   * 序列化为JSON（用于持久化）
   */
  toJSON(): ITimerConfig[] {
    return this.getAllTimers();
  }

  /**
   * 从JSON恢复
   */
  fromJSON(timersData: ITimerConfig[]): void {
    this.stopAllTimers();
    this.timers.clear();
    this.executionLogs.clear();
    
    for (const timerData of timersData) {
      // 验证数据
      const timer: ITimerConfig = {
        id: timerData.id || `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: timerData.name || 'New Timer',
        enabled: Boolean(timerData.enabled),
        interval: typeof timerData.interval === 'number' ? timerData.interval : 1000,
        script: timerData.script || '',
        type: timerData.type === 'timeout' ? 'timeout' : 'interval',
        repeatCount: timerData.repeatCount,
        lastExecuteTime: timerData.lastExecuteTime,
        executeCount: timerData.executeCount || 0,
      };
      this.timers.set(timer.id, timer);
      this.executionLogs.set(timer.id, []);
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAllTimers();
    this.timers.clear();
    this.executionLogs.clear();
  }
}
