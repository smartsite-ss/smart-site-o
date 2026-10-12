// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  IGraphicConfig,
  IGraphicEvent,
  IDataSource,
  IAnimation,
  IGraphicStyle,
} from './IProperty';

export interface GraphicPropertyChanges {
  geometry?: { x?: number; y?: number; width?: number; height?: number };
  style?: Record<string, any>;
  customProps?: Record<string, any>;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
  isUndoRedo?: boolean;
}

export interface DataBindingPayload {
  field: string;
  value: any;
  source: string;
}

export interface IGraphic {
  id: string;
  type: string;
  version?: string;

  config: IGraphicConfig;
  events: IGraphicEvent;
  dataSource: IDataSource;
  animation?: IAnimation;

  children?: IGraphic[];

  draw(context: CanvasRenderingContext2D): void;

  update(properties: Partial<Record<string, any>>): void;

  containsPoint(x: number, y: number): boolean;

  intersectsRegion(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean;

  toJSON(): any;

  fromJSON(data: any): void;

  getPosition(): { x: number; y: number };
  setPosition(x: number, y: number): void;
  getSize(): { width: number; height: number };
  setSize(width: number, height: number): void;
  getZIndex(): number;
  setZIndex(zIndex: number): void;
  getVisible(): boolean;
  setVisible(visible: boolean): void;
  getLocked(): boolean;
  setLocked(locked: boolean): void;
  getDisabled(): boolean;
  setDisabled(disabled: boolean): void;

  getRotation(): number;
  setRotation(rotation: number): void;
  rotate(degrees: number, origin?: { x: number; y: number }): void;
  setRotationAbsolute(degrees: number): void;

  getProps<T>(key: string, defaultValue?: T): T;
  setProps(key: string, value: any): void;

  getFontStyle(): {
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
  };
  setFontStyle(style: {
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
  }): void;

  getBorderStyle(): {
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    borderStyle?: string;
  };
  setBorderStyle(style: {
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    borderStyle?: string;
  }): void;

  getStyle(): IGraphicStyle;
  setStyle(style: IGraphicStyle): void;

  validateProperties(properties: Partial<Record<string, any>>): void;
  getProperty<T>(path: string, defaultValue: T): T;
  setProperty(path: string, value: any): void;

  onMounted?(): void;
  onUnmounted?(): void;
  onPropertyChanged?(changes: GraphicPropertyChanges): void;
  onDataChanged?(data: DataBindingPayload): void;
  onThemeChanged?(themeName: string): void;
  onResize?(width: number, height: number): void;
  onVisibilityChanged?(visible: boolean): void;
}