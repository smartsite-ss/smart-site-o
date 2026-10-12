// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IPage } from './IPage';
import type { IGraphic } from '@scada-editor/plugin-sdk';
import type { EnterAnimationEngine } from '../../../animations/EnterAnimationEngine';

/**
 * 页面上下文接口
 *
 * 图元通过此接口感知页面环境，实现图元间联动、数据查询等能力。
 * 由 BasePage 在 addGraphic 时自动注入，插件开发者通过 this.pageContext 访问。
 */
export interface IPageContext {
  /** 获取当前页面 */
  getPage(): IPage;

  /** 按ID查找任意图元 */
  getGraphicById(id: string): IGraphic | undefined;

  /** 按类型查找所有图元 */
  getGraphicsByType(type: string): IGraphic[];

  /** 按分组查找成员 */
  getGroupMembers(groupId: string): IGraphic[];

  /** 触发事件总线 */
  emit<T = any>(event: string, payload: T): void;

  /** 监听事件总线，返回取消监听的函数 */
  on<T = any>(event: string, handler: (payload: T) => void): () => void;

  /** 进入动画引擎 */
  animationEngine: EnterAnimationEngine | null;

  /** 设置动画帧回调（由编辑器层注入 drawCanvas） */
  setAnimationFrameCallback(callback: () => void): void;
}