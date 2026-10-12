// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export class AnimationTimer {
  private _lastTime = 0;
  private _active = false;

  get active(): boolean {
    return this._active;
  }

  start(): void {
    this._active = true;
    this._lastTime = 0;
  }

  stop(): void {
    this._active = false;
    this._lastTime = 0;
  }

  tick(): number {
    if (!this._active) return 0;
    const now = Date.now();
    if (this._lastTime === 0) {
      this._lastTime = now;
      return 0;
    }
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    return dt;
  }

  checkElapsed(ms: number): boolean {
    if (!this._active) return false;
    const now = Date.now();
    if (this._lastTime === 0) {
      this._lastTime = now;
      return false;
    }
    if (now - this._lastTime >= ms) {
      this._lastTime = now;
      return true;
    }
    return false;
  }
}