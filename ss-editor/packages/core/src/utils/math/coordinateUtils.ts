// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// 逻辑坐标接口
export interface LogicalPoint {
  x: number;
  y: number;
}

// 显示坐标接口
export interface DisplayPoint {
  x: number;
  y: number;
}

// 矩形接口
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 视图状态接口
export interface ViewState {
  scale: number;
  offset: {
    x: number;
    y: number;
  };
}

/**
 * 坐标转换工具类
 */
export class CoordinateUtils {
  /**
   * 将逻辑坐标转换为显示坐标
   * @param logical 逻辑坐标
   * @param viewState 视图状态（包含缩放比例和偏移）
   * @returns 显示坐标
   */
  public static logicalToDisplay(logical: LogicalPoint, viewState: ViewState): DisplayPoint {
    return {
      x: logical.x * viewState.scale + viewState.offset.x,
      y: logical.y * viewState.scale + viewState.offset.y
    };
  }

  /**
   * 将显示坐标转换为逻辑坐标
   * @param display 显示坐标
   * @param viewState 视图状态（包含缩放比例和偏移）
   * @returns 逻辑坐标
   */
  public static displayToLogical(display: DisplayPoint, viewState: ViewState): LogicalPoint {
    return {
      x: (display.x - viewState.offset.x) / viewState.scale,
      y: (display.y - viewState.offset.y) / viewState.scale
    };
  }

  /**
   * 计算矩形的显示坐标
   * @param logicalRect 逻辑矩形 {x, y, width, height}
   * @param viewState 视图状态（包含缩放比例和偏移）
   * @returns 显示矩形 {x, y, width, height}
   */
  public static logicalRectToDisplay(logicalRect: Rect, viewState: ViewState): Rect {
    return {
      x: logicalRect.x * viewState.scale + viewState.offset.x,
      y: logicalRect.y * viewState.scale + viewState.offset.y,
      width: logicalRect.width * viewState.scale,
      height: logicalRect.height * viewState.scale
    };
  }

  /**
   * 计算矩形的逻辑坐标
   * @param displayRect 显示矩形 {x, y, width, height}
   * @param viewState 视图状态（包含缩放比例和偏移）
   * @returns 逻辑矩形 {x, y, width, height}
   */
  public static displayRectToLogical(displayRect: Rect, viewState: ViewState): Rect {
    return {
      x: (displayRect.x - viewState.offset.x) / viewState.scale,
      y: (displayRect.y - viewState.offset.y) / viewState.scale,
      width: displayRect.width / viewState.scale,
      height: displayRect.height / viewState.scale
    };
  }

  /**
   * 计算两点之间的距离
   * @param point1 第一个点
   * @param point2 第二个点
   * @returns 两点之间的距离
   */
  public static distance(point1: LogicalPoint | DisplayPoint, point2: LogicalPoint | DisplayPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查点是否在矩形内
   * @param point 点
   * @param rect 矩形
   * @returns 点是否在矩形内
   */
  public static pointInRect(point: LogicalPoint | DisplayPoint, rect: Rect): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  /**
   * 计算两个矩形的交集
   * @param rect1 第一个矩形
   * @param rect2 第二个矩形
   * @returns 交集矩形，如果没有交集则返回null
   */
  public static intersectRects(rect1: Rect, rect2: Rect): Rect | null {
    const x = Math.max(rect1.x, rect2.x);
    const y = Math.max(rect1.y, rect2.y);
    const width = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - x;
    const height = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - y;

    if (width <= 0 || height <= 0) {
      return null;
    }

    return { x, y, width, height };
  }
}

// 保持向后兼容，导出旧的函数式接口
export function logicalToDisplay(logical: LogicalPoint, viewState: ViewState): DisplayPoint {
  return CoordinateUtils.logicalToDisplay(logical, viewState);
}

export function displayToLogical(display: DisplayPoint, viewState: ViewState): LogicalPoint {
  return CoordinateUtils.displayToLogical(display, viewState);
}

export function logicalRectToDisplay(logicalRect: Rect, viewState: ViewState): Rect {
  return CoordinateUtils.logicalRectToDisplay(logicalRect, viewState);
}

export function displayRectToLogical(displayRect: Rect, viewState: ViewState): Rect {
  return CoordinateUtils.displayRectToLogical(displayRect, viewState);
}
