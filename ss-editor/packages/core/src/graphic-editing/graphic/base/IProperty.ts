// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface IPosition {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface IGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  visible?: boolean;
}

export interface IGraphicStyle {
  // ==================== 图形相关属性 ====================
  backgroundColor?: string; // 背景颜色，支持 hex/rgba 格式
  color?: string;           // 前景颜色，支持 hex/rgba 格式
  opacity?: number;         // 透明度，取值范围 0-1

  // ==================== 文本相关属性 ====================
  fontColor?: string;       // 字体颜色，支持 hex/rgba 格式
  fontSize?: number;        // 字体大小（像素）
  fontFamily?: string;      // 字体名称，如 'Arial', 'Microsoft YaHei'
  fontStyle?: string;       // 字体样式：normal | italic | oblique
  fontWeight?: string;      // 字体粗细：normal | bold | 100-900
  textAlign?: 'left' | 'center' | 'right'; // 文本对齐方式
  letterSpacing?: number;   // 字间距（像素）
  lineHeight?: number;      // 行高（像素）

  // ==================== 边框相关属性 ====================
  borderColor?: string;     // 边框颜色，支持 hex/rgba 格式
  borderWidth?: number;     // 边框宽度（像素）
  borderRadius?: number;    // 边框圆角（像素）
  borderStyle?: string;     // 边框样式：solid | dashed | dotted

  // ==================== 阴影相关属性 ====================
  shadowBlur?: number;      // 阴影模糊程度（像素）
  shadowOffsetX?: number;   // 阴影水平偏移（像素）
  shadowOffsetY?: number;   // 阴影垂直偏移（像素）
  shadowColor?: string;     // 阴影颜色，支持 hex/rgba 格式
  shadowSpread?: number;    // 阴影扩展距离（像素）

  // ==================== 布局相关属性 ====================
  padding?: string;         // 内边距，支持 CSS 格式如 '10px' 或 '10px 20px'
  margin?: string;          // 外边距，支持 CSS 格式如 '10px' 或 '10px 20px'

  [key: string]: any;       // 动态扩展属性
}

export interface IGraphicConfig {
  id: string;
  type: string;
  name: string;
  // 图形基本配置
  geometry: IGeometry;
  // 图形样式配置
  style: IGraphicStyle;
  data?: any;

  locked: boolean;
  visible: boolean;
  disabled: boolean;

  zIndex: number;
  // 组合相关属性
  isGroup: boolean;
  groupId: string | null;
  groupMembers: string[];
  // 子图形
  children?: IGraphicConfig[];

  // 图形差异化属性
  customProps: Record<string, any>;
  // 创建时间
  createdAt: number;
  // 更新时间
  updatedAt: number;
}

// 事件
export interface IEvent {
  id: string;
  eventType: string; // click, hover, focus, blur, etc.
  actions: Array<{
    id: string;
    actionType: string; // show, hide, change, navigate, etc.
    target: string;
    value: any;
    conditions: Array<{
      id: string;
      field: string;
      operator: string; // equal, notEqual, greaterThan, lessThan, etc.
      value: any;
    }>;
  }>;
}

export interface IGraphicEvent {
  type: string;
  target?: IGraphicConfig;
  payload: any;
  timestamp: number;
  eventHandlers: Record<string, IEvent>;
}

export type IGraphicProps = IGraphicConfig;

// 数据验证规则
export interface IDataValidation {
  required: boolean;
  min: any;
  max: any;
  pattern: string;
  script: string;
  message: string;
}

// 数据源
export interface IDataSource {
  type: string;
  target: IGraphicConfig;
  payload: any;
  timestamp: number;
  validation: IDataValidation;
  enabled: boolean;
  dataSource: string;
  dataField: string;
  displayField: string;

  dataMapping: Array<{
    value: any;
    display: string;
  }>;
}

// 动画
export interface IAnimation {
  enabled: boolean;
  type: string; // AnimationType: fade-in, slide-right-in, rotate-in, etc.
  duration: number;
  delay: number;
  easing: string; // EasingType: linear, ease, ease-in, ease-out, bounce, etc.
  properties: Record<string, any>;
  // 循环动画
  loopEnabled?: boolean;
  loopType?: string; // LoopAnimationType
  loopDuration?: number;
  loopSpeed?: number;
}
