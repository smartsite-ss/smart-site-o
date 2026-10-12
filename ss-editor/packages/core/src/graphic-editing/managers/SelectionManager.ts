// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { SelectionMode, ISelectionState } from '../../types';

// 回调配置接口
interface Subscription {
  id: string;
  callback: (state: ISelectionState) => void;
  priority: number;
  once: boolean;
}

export class SelectionManager {
  private selectedGraphicId: string | null = null;
  private selectedGraphicIdsSet: Set<string> = new Set();
  private mode: SelectionMode = SelectionMode.SINGLE;
  private isSelecting: boolean = false;
  private selectionRect: { left: number; top: number; width: number; height: number } = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  };
  private subscriptions: Subscription[] = [];
  
  // 历史记录
  private history: ISelectionState[] = [];
  private historyIndex = -1;
  private maxHistoryLength = 50;

  constructor(onChange?: (state: ISelectionState) => void) {
    if (onChange) {
      this.subscribe(onChange);
    }
    // 保存初始状态
    this.saveCurrentState();
  }

  getState(): ISelectionState {
    return {
      selectedGraphicId: this.selectedGraphicId,
      selectedGraphicIds: Array.from(this.selectedGraphicIdsSet),
      mode: this.mode,
      isSelecting: this.isSelecting,
      selectionRect: { ...this.selectionRect },
    };
  }
  
  // 获取选择框状态
  getIsSelecting(): boolean {
    return this.isSelecting;
  }
  
  setIsSelecting(isSelecting: boolean): void {
    this.isSelecting = isSelecting;
    this.notifyChange();
  }
  
  // 获取选择框矩形
  getSelectionRect(): { left: number; top: number; width: number; height: number } {
    return { ...this.selectionRect };
  }
  
  setSelectionRect(rect: { left: number; top: number; width: number; height: number }): void {
    this.selectionRect = { ...rect };
    this.notifyChange();
  }

  setMode(mode: SelectionMode): void {
    this.mode = mode;
    this.notifyChange();
  }

  getMode(): SelectionMode {
    return this.mode;
  }

  subscribe(callback: (state: ISelectionState) => void, priority: number = 0, once: boolean = false): () => void {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const subscription: Subscription = { id, callback, priority, once };
    this.subscriptions.push(subscription);
    this.subscriptions.sort((a, b) => b.priority - a.priority);
    
    return () => this.unsubscribe(id);
  }

  unsubscribe(id: string): void {
    this.subscriptions = this.subscriptions.filter(sub => sub.id !== id);
  }

  clearSubscriptions(): void {
    this.subscriptions = [];
  }

  select(id: string): ISelectionState {
    this.doSelect(id);
    this.saveCurrentState();
    this.notifyChange();
    return this.getState();
  }

  selectMultiple(ids: string[]): ISelectionState {
    this.doSelectMultiple(ids);
    this.saveCurrentState();
    this.notifyChange();
    return this.getState();
  }

  selectBatch(operations: Array<{ id: string; action: 'add' | 'remove' | 'toggle' }>): ISelectionState {
    for (const op of operations) {
      switch (op.action) {
        case 'add':
          this.selectedGraphicIdsSet.add(op.id);
          break;
        case 'remove':
          this.selectedGraphicIdsSet.delete(op.id);
          break;
        case 'toggle':
          if (this.selectedGraphicIdsSet.has(op.id)) {
            this.selectedGraphicIdsSet.delete(op.id);
          } else {
            this.selectedGraphicIdsSet.add(op.id);
          }
          break;
      }
    }
    this.updateSelectedId();
    this.saveCurrentState();
    this.notifyChange();
    return this.getState();
  }

  addToSelection(id: string): ISelectionState {
    if (!this.selectedGraphicIdsSet.has(id)) {
      this.selectedGraphicIdsSet.add(id);
      this.selectedGraphicId = id;
      this.saveCurrentState();
      this.notifyChange();
    }
    return this.getState();
  }

  removeFromSelection(id: string): ISelectionState {
    if (this.selectedGraphicIdsSet.has(id)) {
      this.selectedGraphicIdsSet.delete(id);
      this.updateSelectedId();
      this.saveCurrentState();
      this.notifyChange();
    }
    return this.getState();
  }

  clear(): ISelectionState {
    if (this.selectedGraphicIdsSet.size > 0) {
      this.selectedGraphicIdsSet.clear();
      this.selectedGraphicId = null;
      this.saveCurrentState();
      this.notifyChange();
    }
    return this.getState();
  }

  toggleSelection(id: string): ISelectionState {
    if (this.selectedGraphicIdsSet.has(id)) {
      this.selectedGraphicIdsSet.delete(id);
    } else {
      this.selectedGraphicIdsSet.add(id);
    }
    this.updateSelectedId();
    this.saveCurrentState();
    this.notifyChange();
    return this.getState();
  }

  undo(): ISelectionState | null {
    if (this.canUndo()) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      return state;
    }
    return null;
  }

  redo(): ISelectionState | null {
    if (this.canRedo()) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.applyState(state);
      return state;
    }
    return null;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    this.saveCurrentState();
  }

  getSelectedGraphicId(): string | null {
    return this.selectedGraphicId;
  }

  getSelectedGraphicIds(): string[] {
    return Array.from(this.selectedGraphicIdsSet);
  }

  isSelected(id: string): boolean {
    return this.selectedGraphicIdsSet.has(id);
  }

  getSelectedCount(): number {
    return this.selectedGraphicIdsSet.size;
  }

  hasSelection(): boolean {
    return this.selectedGraphicIdsSet.size > 0;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  private updateSelectedId(): void {
    const ids = Array.from(this.selectedGraphicIdsSet);
    this.selectedGraphicId = ids.length > 0 ? ids[ids.length - 1] : null;
  }

  private saveCurrentState(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push(this.getState());
    
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  private applyState(state: ISelectionState): void {
    this.selectedGraphicIdsSet = new Set(state.selectedGraphicIds);
    this.selectedGraphicId = state.selectedGraphicId;
    this.mode = state.mode;
    this.isSelecting = state.isSelecting || false;
    this.selectionRect = state.selectionRect || { left: 0, top: 0, width: 0, height: 0 };
    this.notifyChange();
  }

  private doSelect(id: string): void {
    switch (this.mode) {
      case SelectionMode.SINGLE:
        this.selectedGraphicIdsSet.clear();
        this.selectedGraphicIdsSet.add(id);
        this.selectedGraphicId = id;
        break;
      case SelectionMode.ADDITIVE:
        if (this.selectedGraphicIdsSet.has(id)) {
          this.selectedGraphicIdsSet.delete(id);
        } else {
          this.selectedGraphicIdsSet.add(id);
        }
        this.updateSelectedId();
        break;
      case SelectionMode.SUBTRACTIVE:
        this.selectedGraphicIdsSet.delete(id);
        this.updateSelectedId();
        break;
    }
  }

  private doSelectMultiple(ids: string[]): void {
    switch (this.mode) {
      case SelectionMode.SINGLE:
        this.selectedGraphicIdsSet.clear();
        if (ids.length > 0) {
          this.selectedGraphicIdsSet.add(ids[0]);
          this.selectedGraphicId = ids[0];
        } else {
          this.selectedGraphicId = null;
        }
        break;
      case SelectionMode.ADDITIVE:
        for (const id of ids) {
          if (this.selectedGraphicIdsSet.has(id)) {
            this.selectedGraphicIdsSet.delete(id);
          } else {
            this.selectedGraphicIdsSet.add(id);
          }
        }
        this.updateSelectedId();
        break;
      case SelectionMode.SUBTRACTIVE:
        for (const id of ids) {
          this.selectedGraphicIdsSet.delete(id);
        }
        this.updateSelectedId();
        break;
      case SelectionMode.BOX:
        this.selectedGraphicIdsSet.clear();
        for (const id of ids) {
          this.selectedGraphicIdsSet.add(id);
        }
        this.selectedGraphicId = ids.length > 0 ? ids[0] : null;
        break;
    }
  }

  private notifyChange(): void {
    const state = this.getState();
    const toRemove: string[] = [];
    
    for (const subscription of this.subscriptions) {
      try {
        subscription.callback(state);
        if (subscription.once) {
          toRemove.push(subscription.id);
        }
      } catch (error) {
        console.error('Error in selection callback:', error);
      }
    }
    
    for (const id of toRemove) {
      this.unsubscribe(id);
    }
  }
}
