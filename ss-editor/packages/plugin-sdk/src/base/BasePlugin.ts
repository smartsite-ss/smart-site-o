// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { BaseGraphic } from './BaseGraphic';
import { DrawPipeline } from './DrawPipeline';
import { DrawContext } from '../types/DrawContext';

export abstract class BasePlugin<TProps extends Record<string, any>> extends BaseGraphic {
  setDefaultProps(props: TProps): void {
    this.config.customProps = { ...props };
  }

  get pluginProps(): Readonly<TProps> {
    return this.config.customProps as unknown as TProps;
  }

  protected setPluginProps(partial: Partial<TProps>): void {
    if (!this.config.customProps) {
      this.config.customProps = {} as any;
    }
    const customProps = this.config.customProps as Record<string, any>;
    const keys = Object.keys(partial) as Array<keyof TProps>;
    for (const k of keys) {
      customProps[k as string] = partial[k];
    }
    if (this.onPropertyChanged) {
      const changedProps: Record<string, any> = {};
      for (const k of keys) {
        changedProps[k as string] = partial[k];
      }
      this.onPropertyChanged({ customProps: changedProps });
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    if (!DrawPipeline.begin(context, this as any)) return;
    const { width, height } = this.getSize();
    const dc = new DrawContext(context, { x: 0, y: 0, width, height }, false);

    const anim = this.animation;
    if (anim?.enabled && anim?.type?.startsWith('loop-')) {
      const engine = this.pageContext?.loopAnimationEngine;
      if (engine) {
        const loopType = anim.type.replace('loop-', '');
        if (!engine.isPlaying(this.id)) engine.play(this.id);
        engine.configure(this.id, {
          type: loopType as any,
          duration: (anim.duration || 1) * 1000,
          speed: 1,
        });
        const transform = engine.getTransform(this.id);
        if (transform) {
          context.translate(transform.translateX || 0, transform.translateY || 0);
          context.rotate((transform.rotate || 0) * Math.PI / 180);
          context.scale(transform.scaleX || 1, transform.scaleY || 1);
          context.globalAlpha *= transform.opacity ?? 1;
        }
      }
    } else if (anim?.loopEnabled && anim?.loopType && anim.loopType !== 'none') {
      const engine = this.pageContext?.loopAnimationEngine;
      if (engine) {
        if (!engine.isPlaying(this.id)) engine.play(this.id);
        engine.configure(this.id, {
          type: anim.loopType as any,
          duration: anim.loopDuration || 1000,
          speed: anim.loopSpeed || 1,
        });
        const transform = engine.getTransform(this.id);
        if (transform) {
          context.translate(transform.translateX || 0, transform.translateY || 0);
          context.rotate((transform.rotate || 0) * Math.PI / 180);
          context.scale(transform.scaleX || 1, transform.scaleY || 1);
          context.globalAlpha *= transform.opacity ?? 1;
        }
      }
    }

    try {
      this.render(dc);
    } catch (e) {
      console.warn(`[BasePlugin] Error rendering plugin type="${this.type}" id="${this.id}":`, e);
    } finally {
      DrawPipeline.end(context, this);
    }
  }

  protected abstract render(dc: DrawContext): void;

  protected drawBackground(dc: DrawContext, options?: { color?: string; radius?: number }): void {
    const color = options?.color ?? this.getStyleProp<string>('backgroundColor');
    const radius = options?.radius ?? this.getStyleProp<number>('borderRadius', 0);
    const { width, height } = this.getSize();
    DrawPipeline.fillRoundedRect(dc.ctx, color || '', width, height, radius);
  }

  protected drawBorder(dc: DrawContext, options?: { color?: string; width?: number; radius?: number; style?: 'solid' | 'dashed' | 'dotted' }): void {
    const color = options?.color ?? this.getStyleProp<string>('borderColor');
    const width = options?.width ?? this.getStyleProp<number>('borderWidth');
    const radius = options?.radius ?? this.getStyleProp<number>('borderRadius');
    const style = options?.style ?? this.getStyleProp<'solid' | 'dashed' | 'dotted'>('borderStyle');
    const { width: w, height: h } = this.getSize();
    DrawPipeline.strokeRoundedRect(dc.ctx, color || '', width || 0, w, h, radius || 0, style || 'solid');
  }

  protected applyShadow(dc: DrawContext): void {
    const blur = this.getStyleProp<number>('shadowBlur', 0);
    if (blur <= 0) return;
    const color = this.getStyleProp<string>('shadowColor', '#000000');
    const ox = this.getStyleProp<number>('shadowOffsetX', 0);
    const oy = this.getStyleProp<number>('shadowOffsetY', 0);
    DrawPipeline.applyShadow(dc.ctx, color, blur, ox, oy);
  }

  protected drawText(dc: DrawContext, text: string, x: number, y: number, options?: {
    color?: string; fontSize?: number; fontFamily?: string; fontWeight?: string;
    align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
  }): void {
    const ctx = dc.ctx;
    const color = options?.color ?? this.getStyleProp<string>('fontColor', '#000000');
    const fontSize = options?.fontSize ?? this.getStyleProp<number>('fontSize', 14);
    const fontWeight = options?.fontWeight ?? this.getStyleProp<string>('fontWeight', 'normal');
    const fontFamily = options?.fontFamily ?? this.getStyleProp<string>('fontFamily', 'Arial');
    const fontStyle = this.getStyleProp<string>('fontStyle', 'normal');
    const align = options?.align ?? this.getStyleProp<CanvasTextAlign>('textAlign', 'left');
    const baseline = options?.baseline ?? 'top';
    const font = DrawPipeline.fontString(fontSize, fontWeight, fontStyle, fontFamily);
    DrawPipeline.drawText(ctx, text, color, font, align, baseline, x, y);
  }

  protected getStyleProp<T = unknown>(key: string, defaultValue?: T): T {
    const cp = this.config.customProps as Record<string, any>;
    if (key in cp) return cp[key] as T;
    return this.getStyle()[key] as T ?? (defaultValue as T);
  }

  getFontStyle(): {
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
  } {
    return {
      fontSize: this.getStyleProp<number>('fontSize'),
      fontFamily: this.getStyleProp<string>('fontFamily'),
      fontStyle: this.getStyleProp<string>('fontStyle'),
      fontWeight: this.getStyleProp<string>('fontWeight'),
      textAlign: this.getStyleProp<'left' | 'center' | 'right'>('textAlign'),
      letterSpacing: this.getStyleProp<number>('letterSpacing'),
      lineHeight: this.getStyleProp<number>('lineHeight'),
    };
  }

  setFontStyle(style: Record<string, any>): void {
    Object.entries(style).forEach(([k, v]) => {
      this.setProperty('config.style.' + k, v);
    });
  }

  getBorderStyle(): {
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    borderStyle?: string;
  } {
    return {
      borderColor: this.getStyleProp<string>('borderColor'),
      borderWidth: this.getStyleProp<number>('borderWidth'),
      borderRadius: this.getStyleProp<number>('borderRadius'),
      borderStyle: this.getStyleProp<string>('borderStyle'),
    };
  }

  setBorderStyle(style: Record<string, any>): void {
    Object.entries(style).forEach(([k, v]) => {
      this.setProperty('config.style.' + k, v);
    });
  }
}