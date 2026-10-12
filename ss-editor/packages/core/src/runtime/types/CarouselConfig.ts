// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 页面轮播相关类型定义
 */

/** 轮播过渡效果 */
export type CarouselTransition = 'none' | 'fade' | 'slide-left' | 'slide-right';

/** 轮播配置（项目级持久化） */
export interface CarouselConfig {
  /** 是否启用轮播 */
  enabled: boolean;
  /** 轮播间隔（毫秒），默认 30000（30秒） */
  interval: number;
  /** 参与轮播的页面 ID 列表；为空则使用全部页面 */
  pageIds: string[];
  /** 是否循环播放 */
  loop: boolean;
  /** 切换过渡效果 */
  transition: CarouselTransition;
  /** 是否在预览启动时自动开始 */
  autoStart: boolean;
  /** 是否单页时仍显示轮播控制 */
  showSinglePage: boolean;
}

/** 轮播页面信息 */
export interface CarouselPageInfo {
  id: string;
  name: string;
  /** 在原 pages 数组中的索引 */
  index: number;
}

/** 轮播运行时状态 */
export interface CarouselState {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 是否已暂停 */
  isPaused: boolean;
  /** 当前播放的页面在 carouselPages 中的索引 */
  currentIndex: number;
  /** 当前页已播放时间（ms） */
  elapsedTime: number;
  /** 轮播的页面列表（已过滤排序） */
  carouselPages: CarouselPageInfo[];
}

/** 默认轮播配置 */
export const DEFAULT_CAROUSEL_CONFIG: CarouselConfig = {
  enabled: false,
  interval: 10000,
  pageIds: [],
  loop: true,
  transition: 'fade',
  autoStart: false,
  showSinglePage: false,
};
