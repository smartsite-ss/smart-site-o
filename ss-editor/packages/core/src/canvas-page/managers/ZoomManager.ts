// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { i18n } from '../../locales';

// 经 unknown 断言为 (key: string) => string：避免 vue-i18n 对 messages 字面量 schema 的深度类型实例化（TS2589）
const t = (key: string): string =>
  (i18n.global as unknown as { t: (key: string) => string }).t('zoomManager.' + key);

/**
 * 缩放模式
 */
export enum ZoomMode {
  MOUSE_CENTER = 'mouse-center',
  CANVAS_CENTER = 'canvas-center',
  TOP_LEFT = 'top-left'
}

/**
 * 适配模式
 */
export type FitMode = 'auto' | 'contain' | 'fitWidth' | 'fitHeight' | 'stretch';

/**
 * 适配模式配置
 */
export interface FitModeConfig {
  mode: FitMode;
  label: string;
  description: string;
}

/**
 * 适配模式选项列表
 */
export const fitModeOptions: FitModeConfig[] = [
  { mode: 'auto', label: t('fitModes.auto.label'), description: t('fitModes.auto.description') },
  { mode: 'contain', label: t('fitModes.contain.label'), description: t('fitModes.contain.description') },
  { mode: 'fitWidth', label: t('fitModes.fitWidth.label'), description: t('fitModes.fitWidth.description') },
  { mode: 'fitHeight', label: t('fitModes.fitHeight.label'), description: t('fitModes.fitHeight.description') },
  { mode: 'stretch', label: t('fitModes.stretch.label'), description: t('fitModes.stretch.description') },
];

/**
 * 自适应策略配置
 */
export interface AutoFitConfig {
  enabled: boolean;           // 是否启用自动适配
  debounceDelay: number;      // 防抖延迟（毫秒）
  minAspectRatio: number;     // Y轴铺满的最小宽高比
  maxAspectRatio: number;     // X轴铺满的最大宽高比
}

/**
 * 缩放范围（百分比），用于调用方覆盖 ZoomManager 内部默认值（10~200）
 */
export interface ScaleRange {
  minScale: number;
  maxScale: number;
}

/**
 * 默认自适应配置
 */
export const defaultAutoFitConfig: AutoFitConfig = {
  enabled: true,
  debounceDelay: 300,
  minAspectRatio: 1.0,
  maxAspectRatio: 1.5
};

/**
 * 缩放管理类
 */
export class ZoomManager {
  private static defaultMinScale = 10;
  private static defaultMaxScale = 200;
  private static defaultStep = 10;

  /**
   * 计算缩放后的位置
   * @param currentScale 当前缩放比例
   * @param newScale 新的缩放比例
   * @param zoomMode 缩放模式
   * @param mouseX 鼠标X坐标
   * @param mouseY 鼠标Y坐标
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @returns 新的偏移量
   */
  public static calculateZoomOffset(
    currentScale: number,
    newScale: number,
    zoomMode: ZoomMode,
    mouseX: number,
    mouseY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { offsetX: number; offsetY: number } {
    let offsetX = 0;
    let offsetY = 0;

    const scaleRatio = newScale / currentScale;

    switch (zoomMode) {
      case ZoomMode.MOUSE_CENTER:
        // 以鼠标位置为中心缩放
        offsetX = mouseX - (mouseX * scaleRatio);
        offsetY = mouseY - (mouseY * scaleRatio);
        break;

      case ZoomMode.CANVAS_CENTER:
        // 以画布中心为中心缩放
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        offsetX = canvasCenterX - (canvasCenterX * scaleRatio);
        offsetY = canvasCenterY - (canvasCenterY * scaleRatio);
        break;

      case ZoomMode.TOP_LEFT:
        // 以左上角为中心缩放
        offsetX = 0;
        offsetY = 0;
        break;
    }

    return { offsetX, offsetY };
  }

  /**
   * 限制缩放范围
   * @param scale 当前缩放比例
   * @param minScale 最小缩放比例
   * @param maxScale 最大缩放比例
   * @returns 限制后的缩放比例
   */
  public static clampScale(scale: number, minScale = this.defaultMinScale, maxScale = this.defaultMaxScale): number {
    return Math.max(minScale, Math.min(maxScale, scale));
  }

  /**
   * 计算缩放后的画布尺寸
   * @param originalWidth 原始宽度
   * @param originalHeight 原始高度
   * @param scale 缩放比例
   * @returns 缩放后的尺寸
   */
  public static calculateScaledSize(originalWidth: number, originalHeight: number, scale: number): { width: number; height: number } {
    return {
      width: originalWidth * (scale / 100),
      height: originalHeight * (scale / 100)
    };
  }

  /**
   * 计算缩放后的点坐标
   * @param x 原始X坐标
   * @param y 原始Y坐标
   * @param scale 缩放比例
   * @returns 缩放后的坐标
   */
  public static scalePoint(x: number, y: number, scale: number): { x: number; y: number } {
    return {
      x: x * (scale / 100),
      y: y * (scale / 100)
    };
  }

  /**
   * 计算反缩放后的点坐标
   * @param x 缩放后的X坐标
   * @param y 缩放后的Y坐标
   * @param scale 缩放比例
   * @returns 原始坐标
   */
  public static unscalePoint(x: number, y: number, scale: number): { x: number; y: number } {
    return {
      x: x / (scale / 100),
      y: y / (scale / 100)
    };
  }

  /**
   * 获取默认缩放参数
   * @returns 默认缩放参数
   */
  public static getDefaultZoomParams(): { minScale: number; maxScale: number; step: number } {
    return {
      minScale: this.defaultMinScale,
      maxScale: this.defaultMaxScale,
      step: this.defaultStep
    };
  }

  /**
   * 设置默认缩放参数
   * @param minScale 最小缩放比例
   * @param maxScale 最大缩放比例
   * @param step 缩放步长
   */
  public static setDefaultZoomParams(minScale: number, maxScale: number, step: number): void {
    this.defaultMinScale = minScale;
    this.defaultMaxScale = maxScale;
    this.defaultStep = step;
  }

  /**
   * 根据屏幕宽高比自动选择适配模式
   * @param aspectRatio 屏幕宽高比
   * @param config 自适应配置
   * @returns 适配模式
   */
  public static autoSelectFitMode(aspectRatio: number, config: AutoFitConfig = defaultAutoFitConfig): FitMode {
    if (aspectRatio < config.minAspectRatio) {
      return 'fitHeight';      // 竖屏：Y轴铺满
    } else if (aspectRatio < config.maxAspectRatio) {
      return 'contain';        // 接近正方形：自适应比例
    } else {
      return 'fitWidth';       // 宽屏：X轴铺满
    }
  }

  /**
   * 计算适配模式对应的缩放比例
   * @param fitMode 适配模式
   * @param contentWidth 内容宽度
   * @param contentHeight 内容高度
   * @param viewportWidth 窗口宽度
   * @param viewportHeight 窗口高度
   * @returns 缩放比例（百分比）
   */
  public static calculateFitScale(
    fitMode: FitMode,
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number
  ): number {
    let scaleX = 100;
    let scaleY = 100;

    switch (fitMode) {
      case 'contain':
        // 等比缩放，取较小值
        scaleX = (viewportWidth / contentWidth) * 100;
        scaleY = (viewportHeight / contentHeight) * 100;
        return Math.min(scaleX, scaleY);

      case 'fitWidth':
        // X轴铺满
        return (viewportWidth / contentWidth) * 100;

      case 'fitHeight':
        // Y轴铺满
        return (viewportHeight / contentHeight) * 100;

      case 'stretch':
        // 拉伸，不保持比例（不推荐使用）
        scaleX = (viewportWidth / contentWidth) * 100;
        scaleY = (viewportHeight / contentHeight) * 100;
        // 返回平均值作为参考
        return (scaleX + scaleY) / 2;

      default:
        return 100;
    }
  }

  /**
   * 根据窗口尺寸自动计算最佳缩放比例
   * @param contentWidth 内容宽度
   * @param contentHeight 内容高度
   * @param viewportWidth 窗口宽度
   * @param viewportHeight 窗口高度
   * @param config 自适应配置
   * @returns 包含适配模式和缩放比例的结果
   */
  public static calculateAutoFitScale(
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    config: AutoFitConfig = defaultAutoFitConfig,
    scaleRange?: ScaleRange,
  ): { fitMode: FitMode; scale: number } {
    // 计算屏幕宽高比
    const aspectRatio = viewportWidth / viewportHeight;

    // 自动选择适配模式
    const fitMode = this.autoSelectFitMode(aspectRatio, config);

    // 计算缩放比例
    const scale = this.calculateFitScale(
      fitMode,
      contentWidth,
      contentHeight,
      viewportWidth,
      viewportHeight
    );

    // 限制缩放范围（未传 scaleRange 时使用内部默认值兜底）
    const clampedScale = this.clampScale(
      scale,
      scaleRange?.minScale,
      scaleRange?.maxScale,
    );

    return { fitMode, scale: clampedScale };
  }

  /**
   * 根据当前适配模式计算缩放比例（支持 auto 模式）
   * @param currentFitMode 当前适配模式
   * @param contentWidth 内容宽度
   * @param contentHeight 内容高度
   * @param viewportWidth 窗口宽度
   * @param viewportHeight 窗口高度
   * @param config 自适应配置
   * @returns 包含实际适配模式和缩放比例的结果
   */
  public static calculateScaleByMode(
    currentFitMode: FitMode,
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    config: AutoFitConfig = defaultAutoFitConfig,
    scaleRange?: ScaleRange,
  ): { fitMode: FitMode; scale: number } {
    if (currentFitMode === 'auto') {
      // 如果是自动模式，使用自动适配
      return this.calculateAutoFitScale(
        contentWidth,
        contentHeight,
        viewportWidth,
        viewportHeight,
        config,
        scaleRange,
      );
    } else {
      // 如果是手动选择的模式，直接计算缩放（未传 scaleRange 时使用内部默认值兜底）
      const scale = this.clampScale(
        this.calculateFitScale(
          currentFitMode,
          contentWidth,
          contentHeight,
          viewportWidth,
          viewportHeight
        ),
        scaleRange?.minScale,
        scaleRange?.maxScale,
      );
      return { fitMode: currentFitMode, scale };
    }
  }

  /**
   * 获取当前屏幕的适配模式建议
   * @param config 自适应配置
   * @returns 适配模式
   */
  public static getCurrentScreenFitMode(config: AutoFitConfig = defaultAutoFitConfig): FitMode {
    if (typeof window === 'undefined') {
      return 'contain'; // 默认返回自适应比例
    }
    const aspectRatio = window.innerWidth / window.innerHeight;
    return this.autoSelectFitMode(aspectRatio, config);
  }

  /**
   * 判断是否为竖屏
   * @returns 是否为竖屏
   */
  public static isPortrait(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < window.innerHeight;
  }

  /**
   * 判断是否为宽屏
   * @param threshold 宽屏阈值，默认1.5
   * @returns 是否为宽屏
   */
  public static isWideScreen(threshold: number = 1.5): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth / window.innerHeight >= threshold;
  }
}
