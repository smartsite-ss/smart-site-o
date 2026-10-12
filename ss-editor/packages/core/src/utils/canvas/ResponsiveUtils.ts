// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 断点类型
 */
export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

/**
 * 响应式工具类
 */
export class ResponsiveUtils {
  private static breakpoints: Breakpoint[] = [
    { name: 'xs', minWidth: 0, maxWidth: 575 },
    { name: 'sm', minWidth: 576, maxWidth: 767 },
    { name: 'md', minWidth: 768, maxWidth: 991 },
    { name: 'lg', minWidth: 992, maxWidth: 1199 },
    { name: 'xl', minWidth: 1200, maxWidth: 1399 },
    { name: 'xxl', minWidth: 1400 }
  ];

  /**
   * 获取当前断点
   * @returns 当前断点名称
   */
  public static getCurrentBreakpoint(): string {
    const width = window.innerWidth;
    for (const breakpoint of this.breakpoints) {
      if (width >= breakpoint.minWidth && (!breakpoint.maxWidth || width <= breakpoint.maxWidth)) {
        return breakpoint.name;
      }
    }
    return 'xxl';
  }

  /**
   * 检查是否在指定断点范围内
   * @param breakpoint 断点名称
   * @returns 是否在指定断点范围内
   */
  public static isBreakpoint(breakpoint: string): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  /**
   * 检查是否大于等于指定断点
   * @param breakpoint 断点名称
   * @returns 是否大于等于指定断点
   */
  public static isBreakpointUp(breakpoint: string): boolean {
    const currentBreakpoint = this.getCurrentBreakpoint();
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === currentBreakpoint);
    const targetIndex = this.breakpoints.findIndex(bp => bp.name === breakpoint);
    return currentIndex >= targetIndex;
  }

  /**
   * 检查是否小于等于指定断点
   * @param breakpoint 断点名称
   * @returns 是否小于等于指定断点
   */
  public static isBreakpointDown(breakpoint: string): boolean {
    const currentBreakpoint = this.getCurrentBreakpoint();
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === currentBreakpoint);
    const targetIndex = this.breakpoints.findIndex(bp => bp.name === breakpoint);
    return currentIndex <= targetIndex;
  }

  /**
   * 检查是否在指定断点范围内
   * @param minBreakpoint 最小断点
   * @param maxBreakpoint 最大断点
   * @returns 是否在指定断点范围内
   */
  public static isBreakpointBetween(minBreakpoint: string, maxBreakpoint: string): boolean {
    const currentBreakpoint = this.getCurrentBreakpoint();
    const currentIndex = this.breakpoints.findIndex(bp => bp.name === currentBreakpoint);
    const minIndex = this.breakpoints.findIndex(bp => bp.name === minBreakpoint);
    const maxIndex = this.breakpoints.findIndex(bp => bp.name === maxBreakpoint);
    return currentIndex >= minIndex && currentIndex <= maxIndex;
  }

  /**
   * 获取断点的最小宽度
   * @param breakpoint 断点名称
   * @returns 最小宽度
   */
  public static getBreakpointMinWidth(breakpoint: string): number | undefined {
    const bp = this.breakpoints.find(bp => bp.name === breakpoint);
    return bp?.minWidth;
  }

  /**
   * 获取断点的最大宽度
   * @param breakpoint 断点名称
   * @returns 最大宽度
   */
  public static getBreakpointMaxWidth(breakpoint: string): number | undefined {
    const bp = this.breakpoints.find(bp => bp.name === breakpoint);
    return bp?.maxWidth;
  }

  /**
   * 监听窗口大小变化
   * @param callback 回调函数
   * @param debounceDelay 防抖延迟（毫秒）
   * @returns 取消监听的函数
   */
  public static onResize(callback: () => void, debounceDelay: number = 250): () => void {
    const debouncedCallback = this.debounce(callback, debounceDelay);
    window.addEventListener('resize', debouncedCallback);
    return () => window.removeEventListener('resize', debouncedCallback);
  }

  /**
   * 防抖函数
   * @param func 要防抖的函数
   * @param wait 等待时间（毫秒）
   * @returns 防抖后的函数
   */
  private static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * 节流函数
   * @param func 要节流的函数
   * @param limit 时间限制（毫秒）
   * @returns 节流后的函数
   */
  public static throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 注册自定义断点
   * @param breakpoints 断点数组
   */
  public static registerBreakpoints(breakpoints: Breakpoint[]): void {
    this.breakpoints = breakpoints;
  }

  /**
   * 获取所有断点
   * @returns 所有断点
   */
  public static getAllBreakpoints(): Breakpoint[] {
    return [...this.breakpoints];
  }
}