// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IPageContext } from './IPageContext';
import type { IPage } from './IPage';
import type { IGraphic } from '@scada-editor/plugin-sdk';
import type { BasePage } from './BasePage';
import type { GroupManager } from '../../managers/GroupManager';
import type { EnterAnimationEngine } from '../../../animations/EnterAnimationEngine';
import type { LoopAnimationEngine } from '../../../animations/LoopAnimationEngine';
import { eventBus } from '../../../utils/event/eventBus';

export class PageContextImpl implements IPageContext {
  private _animationEngine: EnterAnimationEngine | null = null;
  private _loopAnimationEngine: LoopAnimationEngine | null = null;

  constructor(
    private page: BasePage,
    private groupManager: GroupManager
  ) {}

  get animationEngine(): EnterAnimationEngine | null {
    return this._animationEngine;
  }

  set animationEngine(engine: EnterAnimationEngine | null) {
    this._animationEngine = engine;
  }

  get loopAnimationEngine(): LoopAnimationEngine | null {
    return this._loopAnimationEngine;
  }

  set loopAnimationEngine(engine: LoopAnimationEngine | null) {
    this._loopAnimationEngine = engine;
  }

  setAnimationFrameCallback(callback: () => void): void {
    if (this._animationEngine) {
      this._animationEngine.setFrameCallback(callback);
    }
  }

  getPage(): IPage {
    return this.page;
  }

  getGraphicById(id: string): IGraphic | undefined {
    return this.page.graphics.find(g => g.id === id);
  }

  getGraphicsByType(type: string): IGraphic[] {
    return this.page.graphics.filter(g => g.type === type);
  }

  getGroupMembers(groupId: string): IGraphic[] {
    return this.groupManager.getGroupMembers(groupId);
  }

  emit<T = any>(event: string, payload: T): void {
    eventBus.emit(event, payload);
  }

  on<T = any>(event: string, handler: (payload: T) => void): () => void {
    eventBus.on(event, handler as any);
    return () => eventBus.off(event, handler as any);
  }
}