// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IPage } from './IPage';
import type { IGraphic } from './IGraphic';

export interface IPageContext {
  getPage(): IPage;
  getGraphicById(id: string): IGraphic | undefined;
  getGraphicsByType(type: string): IGraphic[];
  getGroupMembers(groupId: string): IGraphic[];
  emit<T = any>(event: string, payload: T): void;
  on<T = any>(event: string, handler: (payload: T) => void): () => void;
  animationEngine: any;
  loopAnimationEngine: any;
  setAnimationFrameCallback(callback: () => void): void;
}