// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseGraphic } from '@scada-editor/plugin-sdk';
import { EnterAnimationState, AnimationTransform } from './types';
import { EASING } from './easing';
import { getAnimationTransform } from './registry';

export class EnterAnimationEngine {
  private animations = new Map<string, { state: EnterAnimationState; graphic: BaseGraphic }>();
  private animFrameId: number | null = null;
  private onFrame: (() => void) | null = null;

  constructor(onFrame?: () => void) {
    this.onFrame = onFrame ?? null;
  }

  setFrameCallback(callback: () => void): void {
    this.onFrame = callback;
  }

  play(graphic: BaseGraphic): void {
    const anim = graphic.animation;
    if (!anim || !anim.enabled) return;

    const state: EnterAnimationState = {
      playing: true,
      finished: false,
      startTime: performance.now() + anim.delay * 1000,
      progress: 0,
      easedProgress: 0,
    };
    this.animations.set(graphic.id, { state, graphic });
    this.startLoop();
  }

  getTransform(graphicId: string, width: number, height: number): AnimationTransform | null {
    const entry = this.animations.get(graphicId);
    if (!entry || entry.state.finished) return null;

    const anim = entry.graphic.animation;
    if (!anim?.enabled) return null;

    return getAnimationTransform(anim.type as any, entry.state.easedProgress, width, height);
  }

  stop(graphicId: string): void {
    this.animations.delete(graphicId);
    if (this.animations.size === 0) this.stopLoop();
  }

  previewOnce(graphic: BaseGraphic): void {
    const anim = graphic.animation;
    if (!anim) return;

    this.stop(graphic.id);

    const state: EnterAnimationState = {
      playing: true,
      finished: false,
      startTime: performance.now() + anim.delay * 1000,
      progress: 0,
      easedProgress: 0,
    };
    const snapshot = { enabled: anim.enabled };
    anim.enabled = true;

    this.animations.set(graphic.id, { state, graphic });
    this.startLoop();

    const checkFinished = () => {
      const entry = this.animations.get(graphic.id);
      if (!entry || entry.state.finished) {
        anim.enabled = snapshot.enabled;
        this.animations.delete(graphic.id);
        if (this.animations.size === 0) this.stopLoop();
      } else {
        requestAnimationFrame(checkFinished);
      }
    };
    requestAnimationFrame(checkFinished);
  }

  isPlaying(graphicId: string): boolean {
    const entry = this.animations.get(graphicId);
    return !!entry && entry.state.playing && !entry.state.finished;
  }

  private tick(): void {
    const now = performance.now();
    let hasActive = false;

    for (const [, entry] of this.animations) {
      if (entry.state.finished) continue;

      const anim = entry.graphic.animation;
      if (!anim?.enabled) {
        entry.state.finished = true;
        continue;
      }

      const elapsed = (now - entry.state.startTime) / 1000;
      if (elapsed < 0) {
        hasActive = true;
        continue;
      }

      const raw = Math.min(elapsed / anim.duration, 1);
      entry.state.progress = raw;
      entry.state.easedProgress = EASING[anim.easing || 'ease']?.(raw) ?? raw;

      if (raw >= 1) {
        entry.state.easedProgress = 1;
        entry.state.finished = true;
      } else {
        hasActive = true;
      }
    }

    const finishedIds: string[] = [];
    for (const [id, entry] of this.animations) {
      if (entry.state.finished) {
        finishedIds.push(id);
      }
    }
    for (const id of finishedIds) {
      this.animations.delete(id);
    }

    if (hasActive) {
      this.onFrame?.();
    } else {
      this.stopLoop();
    }
  }

  private startLoop(): void {
    if (this.animFrameId !== null) return;
    const loop = () => {
      this.tick();
      if (this.animations.size > 0) {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  destroy(): void {
    this.stopLoop();
    this.animations.clear();
  }
}