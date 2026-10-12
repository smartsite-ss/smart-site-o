// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  type CarouselConfig,
  type CarouselState,
  type CarouselPageInfo,
  DEFAULT_CAROUSEL_CONFIG,
} from '../types/CarouselConfig';

/**
 * 轮播管理器
 * 负责管理预览运行态下项目页面的自动轮播切换
 */
export class CarouselManager {
  private config: CarouselConfig;
  private state: CarouselState;
  private onPageSwitch: (pageId: string) => void;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private animationFrameId: number | null = null;
  private lastSwitchTime: number = 0;

  constructor(
    config: Partial<CarouselConfig>,
    onPageSwitch: (pageId: string) => void,
  ) {
    this.config = { ...DEFAULT_CAROUSEL_CONFIG, ...config };
    this.onPageSwitch = onPageSwitch;
    this.state = {
      isRunning: false,
      isPaused: false,
      currentIndex: 0,
      elapsedTime: 0,
      carouselPages: [],
    };
  }

  /** 从页面列表构建轮播页面集合 */
  buildCarouselPages(pages: CarouselPageInfo[]): void {
    const pageIds = this.config.pageIds.length > 0
      ? this.config.pageIds
      : pages.map(p => p.id);

    this.state.carouselPages = pages.filter(p => pageIds.includes(p.id));
  }

  /** 启动轮播 */
  start(): void {
    console.log('[CarouselManager] start() 调用:', {
      carouselPagesCount: this.state.carouselPages.length,
      isRunning: this.state.isRunning,
      interval: this.config.interval,
    });

    if (this.state.carouselPages.length === 0) {
      console.warn('[CarouselManager] start: 没有可轮播的页面，跳过');
      return;
    }
    if (this.state.isRunning) {
      console.log('[CarouselManager] start: 已在运行中，跳过');
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.elapsedTime = 0;
    this.lastSwitchTime = Date.now();
    this.scheduleNext();
    this.startProgressTracker();
    console.log('[CarouselManager] 轮播已启动:', { interval: this.config.interval, nextSwitch: `${this.config.interval / 1000}s 后` });
  }

  /** 停止轮播 */
  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.elapsedTime = 0;
    this.clearTimer();
    this.clearProgressTracker();
  }

  /** 暂停切换（保留定时器但不触发切换） */
  pause(): void {
    if (!this.state.isRunning) return;
    this.state.isPaused = true;
  }

  /** 恢复切换 */
  resume(): void {
    if (!this.state.isRunning) return;
    this.state.isPaused = false;
  }

  /** 播放（启动或恢复） */
  play(): void {
    if (!this.state.isRunning) {
      this.start();
    } else {
      this.resume();
    }
  }

  /** 切换到上一页 */
  previous(): void {
    if (this.state.carouselPages.length === 0) return;

    const totalPages = this.state.carouselPages.length;
    if (this.config.loop) {
      this.state.currentIndex = (this.state.currentIndex - 1 + totalPages) % totalPages;
    } else {
      this.state.currentIndex = Math.max(0, this.state.currentIndex - 1);
    }

    this.performSwitch();
  }

  /** 切换到下一页 */
  next(): void {
    if (this.state.carouselPages.length === 0) return;

    const totalPages = this.state.carouselPages.length;
    if (this.config.loop) {
      this.state.currentIndex = (this.state.currentIndex + 1) % totalPages;
    } else {
      const next = this.state.currentIndex + 1;
      if (next >= totalPages) {
        this.stop();
        return;
      }
      this.state.currentIndex = next;
    }

    console.log('[CarouselManager] next: 切换到页面索引', this.state.currentIndex,
      '页面:', this.state.carouselPages[this.state.currentIndex]?.name);
    this.performSwitch();
  }

  /** 跳到指定索引页 */
  goTo(index: number): void {
    if (index < 0 || index >= this.state.carouselPages.length) return;
    this.state.currentIndex = index;
    this.performSwitch();
  }

  /** 更新配置 */
  updateConfig(partial: Partial<CarouselConfig>): void {
    const wasRunning = this.state.isRunning;
    const wasEnabled = this.config.enabled;
    const wasInterval = this.config.interval;

    this.config = { ...this.config, ...partial };

    // 禁用了轮播 → 停止
    if (wasRunning && wasEnabled && !this.config.enabled) {
      this.stop();
      return;
    }

    // 启用轮播 → 启动
    if (!wasRunning && this.config.enabled) {
      if (this.state.carouselPages.length > 1 || this.config.showSinglePage) {
        this.start();
      }
      return;
    }

    // 间隔变化 → 重启定时器
    if (wasRunning && this.config.interval !== wasInterval) {
      this.state.elapsedTime = 0;
      this.lastSwitchTime = Date.now();
      this.clearTimer();
      this.scheduleNext();
    }
  }

  /** 获取当前状态快照 */
  getState(): Readonly<CarouselState> {
    return this.state;
  }

  /** 获取当前配置快照 */
  getConfig(): Readonly<CarouselConfig> {
    return this.config;
  }

  /** 销毁 */
  destroy(): void {
    this.stop();
  }

  /** 执行页面切换 */
  private performSwitch(): void {
    const page = this.state.carouselPages[this.state.currentIndex];
    if (page) {
      this.lastSwitchTime = Date.now();
      this.state.elapsedTime = 0;
      this.onPageSwitch(page.id);
    }
  }

  /** 启动定时切换 */
  private scheduleNext(): void {
    this.clearTimer();
    this.intervalId = setInterval(() => {
      if (!this.state.isPaused) {
        this.next();
      }
    }, this.config.interval);
  }

  /** 启动进度追踪 */
  private startProgressTracker(): void {
    this.clearProgressTracker();
    const tick = () => {
      if (!this.state.isRunning) return;
      this.state.elapsedTime = Date.now() - this.lastSwitchTime;
      if (this.state.elapsedTime >= this.config.interval) {
        this.state.elapsedTime = this.config.interval;
      }
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  /** 清理定时器 */
  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 清理进度追踪 */
  private clearProgressTracker(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
