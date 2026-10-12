// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { IGraphicStyle } from '../graphic/base/IProperty';

export type FormatPainterMode = 'idle' | 'pick' | 'paint';

export class FormatPainterManager {
  private _mode: FormatPainterMode = 'idle';
  private _copiedStyle: Partial<IGraphicStyle> | null = null;
  private _copiedCustomProps: Record<string, any> | null = null;
  private _sourceGraphicId: string | null = null;
  private _sourceGraphicType: string | null = null;
  private _onModeChange: ((mode: FormatPainterMode) => void) | null = null;

  skipTypeCheck: boolean = true;

  get mode(): FormatPainterMode {
    return this._mode;
  }

  get copiedStyle(): Partial<IGraphicStyle> | null {
    return this._copiedStyle;
  }

  get sourceGraphicId(): string | null {
    return this._sourceGraphicId;
  }

  get sourceGraphicType(): string | null {
    return this._sourceGraphicType;
  }

  activate(selectedGraphic?: any): FormatPainterMode {
    if (selectedGraphic) {
      this.pickStyle(selectedGraphic);
      return this._mode;
    }
    this._mode = 'pick';
    this._onModeChange?.('pick');
    return this._mode;
  }

  deactivate(): void {
    this._mode = 'idle';
    this._copiedStyle = null;
    this._copiedCustomProps = null;
    this._sourceGraphicId = null;
    this._sourceGraphicType = null;
    this._onModeChange?.('idle');
  }

  applyFormat(targetGraphic: any): void {
    if (this._mode === 'pick') {
      this.pickStyle(targetGraphic);
    } else if (this._mode === 'paint') {
      this.paintStyle(targetGraphic);
    }
  }

  pickStyle(graphic: any): void {
    const rawStyle = graphic.getStyle?.() || {};
    this._copiedStyle = JSON.parse(JSON.stringify(rawStyle));

    const rawProps = graphic.config?.customProps;
    this._copiedCustomProps = rawProps ? JSON.parse(JSON.stringify(rawProps)) : null;

    this._sourceGraphicId = graphic.id;
    this._sourceGraphicType = graphic.config?.type || null;

    this._mode = 'paint';
    this._onModeChange?.('paint');
  }

  paintStyle(graphic: any): void {
    if (!this._copiedStyle || this._mode !== 'paint') return;

    const isSameType = graphic.config?.type === this._sourceGraphicType;

    if (!this.skipTypeCheck && !isSameType) {
      return;
    }

    const mergedStyle: Record<string, any> = {};
    for (const key of Object.keys(this._copiedStyle)) {
      if (this._copiedStyle[key] !== undefined) {
        mergedStyle[key] = this._copiedStyle[key];
      }
    }

    graphic.update?.({ style: mergedStyle });

    // 复制 customProps（高级属性）
    // 注意：BaseGraphic.update() 通过 properties.properties 映射到 config.customProps
    if (this._copiedCustomProps) {
      const existingProps = graphic.config?.customProps || {};

      if (isSameType) {
        // 同类图元：完整复制全部高级属性（PropertySchema 字段列表一致）
        graphic.update?.({ properties: { ...existingProps, ...this._copiedCustomProps } });
      } else {
        // 异类图元：仅复制名称相同的字段，目标不支持的字段不应用
        const commonProps: Record<string, any> = {};
        for (const key of Object.keys(this._copiedCustomProps)) {
          if (key in existingProps) {
            commonProps[key] = this._copiedCustomProps[key];
          }
        }
        if (Object.keys(commonProps).length > 0) {
          graphic.update?.({ properties: { ...existingProps, ...commonProps } });
        }
      }
    }
  }

  getMode(): FormatPainterMode {
    return this._mode;
  }

  isActive(): boolean {
    return this._mode !== 'idle';
  }

  getSourceInfo(): { id: string; type: string } | null {
    if (this._sourceGraphicId && this._sourceGraphicType) {
      return { id: this._sourceGraphicId, type: this._sourceGraphicType };
    }
    return null;
  }

  onModeChange(callback: (mode: FormatPainterMode) => void): void {
    this._onModeChange = callback;
  }

  dispose(): void {
    this.deactivate();
    this._onModeChange = null;
  }
}