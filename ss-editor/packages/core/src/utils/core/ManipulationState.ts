// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ManipulationStateType {
  moving: boolean;
  resizing: boolean;
  rotating: boolean;
  selecting: boolean;
  dragging: boolean;
}

export interface ManipulationInfo {
  type: keyof ManipulationStateType;
  graphicId?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

export class ManipulationState {
  private state: ManipulationStateType = {
    moving: false,
    resizing: false,
    rotating: false,
    selecting: false,
    dragging: false,
  };

  private manipulationInfo: ManipulationInfo | null = null;

  isActive(): boolean {
    return Object.values(this.state).some(Boolean);
  }

  isMoving(): boolean {
    return this.state.moving;
  }

  isResizing(): boolean {
    return this.state.resizing;
  }

  isRotating(): boolean {
    return this.state.rotating;
  }

  isSelecting(): boolean {
    return this.state.selecting;
  }

  isDragging(): boolean {
    return this.state.dragging;
  }

  set(state: Partial<ManipulationStateType>): void {
    Object.assign(this.state, state);
    
    if (Object.values(state).some(Boolean)) {
      const activeType = Object.keys(state).find(
        key => state[key as keyof ManipulationStateType]
      ) as keyof ManipulationStateType;
      if (activeType) {
        this.manipulationInfo = {
          type: activeType,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
          startTime: Date.now(),
        };
      }
    } else if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }

  setWithInfo(info: Omit<ManipulationInfo, 'startTime' | 'currentX' | 'currentY'>): void {
    this.set({ [info.type]: true });
    if (this.manipulationInfo) {
      this.manipulationInfo.type = info.type;
      this.manipulationInfo.graphicId = info.graphicId;
      this.manipulationInfo.startX = info.startX;
      this.manipulationInfo.startY = info.startY;
    }
  }

  updatePosition(x: number, y: number): void {
    if (this.manipulationInfo) {
      this.manipulationInfo.currentX = x;
      this.manipulationInfo.currentY = y;
    }
  }

  getInfo(): ManipulationInfo | null {
    return this.manipulationInfo;
  }

  reset(): void {
    this.state = {
      moving: false,
      resizing: false,
      rotating: false,
      selecting: false,
      dragging: false,
    };
    this.manipulationInfo = null;
  }

  getState(): Readonly<ManipulationStateType> {
    return { ...this.state };
  }

  getDuration(): number {
    if (!this.manipulationInfo) return 0;
    return Date.now() - this.manipulationInfo.startTime;
  }

  getDelta(): { dx: number; dy: number } {
    if (!this.manipulationInfo) return { dx: 0, dy: 0 };
    return {
      dx: this.manipulationInfo.currentX - this.manipulationInfo.startX,
      dy: this.manipulationInfo.currentY - this.manipulationInfo.startY,
    };
  }

  startMove(graphicId?: string, startX: number = 0, startY: number = 0): void {
    this.setWithInfo({ type: 'moving', graphicId, startX, startY });
  }

  startResize(graphicId?: string, startX: number = 0, startY: number = 0): void {
    this.setWithInfo({ type: 'resizing', graphicId, startX, startY });
  }

  startRotate(graphicId?: string, startX: number = 0, startY: number = 0): void {
    this.setWithInfo({ type: 'rotating', graphicId, startX, startY });
  }

  startSelect(startX: number = 0, startY: number = 0): void {
    this.setWithInfo({ type: 'selecting', startX, startY });
  }

  startDrag(startX: number = 0, startY: number = 0): void {
    this.setWithInfo({ type: 'dragging', startX, startY });
  }

  endMove(): void {
    this.state.moving = false;
    if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }

  endResize(): void {
    this.state.resizing = false;
    if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }

  endRotate(): void {
    this.state.rotating = false;
    if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }

  endSelect(): void {
    this.state.selecting = false;
    if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }

  endDrag(): void {
    this.state.dragging = false;
    if (!this.isActive()) {
      this.manipulationInfo = null;
    }
  }
}

export const manipulationState = new ManipulationState();