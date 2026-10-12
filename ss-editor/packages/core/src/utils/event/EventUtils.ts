// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 事件处理工具类
 */
export class EventUtils {
  /**
   * 防抖函数
   * @param func 要防抖的函数
   * @param wait 等待时间（毫秒）
   * @returns 防抖后的函数
   */
  public static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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
   * 事件委托
   * @param parent 父元素
   * @param selector 子元素选择器
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  public static delegateEvent(parent: Element, selector: string, eventType: string, handler: (event: Event, target: Element) => void): void {
    parent.addEventListener(eventType, (event) => {
      const target = event.target as Element;
      const closest = target.closest(selector);
      if (closest && parent.contains(closest)) {
        handler(event, closest);
      }
    });
  }

  /**
   * 阻止事件冒泡
   * @param event 事件对象
   */
  public static stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  /**
   * 阻止默认事件
   * @param event 事件对象
   */
  public static preventDefault(event: Event): void {
    event.preventDefault();
  }

  /**
   * 同时阻止事件冒泡和默认事件
   * @param event 事件对象
   */
  public static stopEvent(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * 获取鼠标在元素内的坐标
   * @param event 鼠标事件
   * @param element 元素
   * @returns 鼠标在元素内的坐标
   */
  public static getMousePosition(event: MouseEvent, element: Element): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * 获取触摸在元素内的坐标
   * @param event 触摸事件
   * @param element 元素
   * @returns 触摸在元素内的坐标
   */
  public static getTouchPosition(event: TouchEvent, element: Element): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }



  /**
   * 跨浏览器添加事件监听器
   * @param element 元素
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  public static addEventListener(element: Element | Window | Document, eventType: string, handler: EventListener): void {
    if (element.addEventListener) {
      element.addEventListener(eventType, handler);
    } else if ((element as any).attachEvent) {
      (element as any).attachEvent(`on${eventType}`, handler);
    }
  }

  /**
   * 跨浏览器移除事件监听器
   * @param element 元素
   * @param eventType 事件类型
   * @param handler 事件处理函数
   */
  public static removeEventListener(element: Element | Window | Document, eventType: string, handler: EventListener): void {
    if (element.removeEventListener) {
      element.removeEventListener(eventType, handler);
    } else if ((element as any).detachEvent) {
      (element as any).detachEvent(`on${eventType}`, handler);
    }
  }
}