// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** 单个变量的趋势样式，字段对齐参考组件 LineCommon/config.vue */
export interface TrendSeriesStyle {
  lineStyle: {
    /** 线条宽度 */
    width: number;
    /** 线条类型：实线/虚线/点线 */
    type: 'solid' | 'dashed' | 'dotted';
    /** 线条颜色（变量主色） */
    color: string;
  };
  /** 实心点大小（px，0 表示不显示） */
  symbolSize: number;
  /** 数据标签 */
  label: {
    show: boolean;
    fontSize: number;
    color: string;
    /** 标签位置 */
    position: 'top' | 'left' | 'right' | 'bottom';
  };
  /** 区域填充 */
  areaStyle: {
    show: boolean;
    /** 三档渐变色（开始/中间/结束） */
    colorStops: Array<{ offset: number; color: string }>;
    /** 透明度 0~1 */
    opacity: number;
  };
}

/** 一个被绑定的标签变量 + 其趋势样式（tag-trend 与 history-trend 共用） */
export interface ChartTagBinding {
  /** 所属项目 ID（历史查询定位 InfluxDB 桶所必需） */
  projectId: string;
  /** 设备 UUID 主键 */
  deviceId: string;
  /** 设备编码（用户可读，展示用） */
  deviceCode: string;
  /** 设备名称（展示用） */
  deviceName: string;
  /** 标签 ID（订阅/查询的唯一标识） */
  tagId: string;
  /** 标签名称（展示用） */
  tagName: string;
  /** 标签数据类型 */
  dataType: string;
  /** 每变量趋势样式 */
  style: TrendSeriesStyle;
}

/** 一个被绑定的标签变量（不含趋势样式，供 gauge/bar/pie/radar/waterpolo/progress 等变量图表使用） */
export interface ChartVariableBinding {
  /** 所属项目 ID（历史查询定位 InfluxDB 桶所必需） */
  projectId: string;
  /** 设备 UUID 主键 */
  deviceId: string;
  /** 设备编码（用户可读，展示用） */
  deviceCode: string;
  /** 设备名称（展示用） */
  deviceName: string;
  /** 标签 ID（订阅/查询的唯一标识） */
  tagId: string;
  /** 标签名称（展示用） */
  tagName: string;
  /** 标签数据类型 */
  dataType: string;
}

/** 图表容器样式输入（背景/边框/圆角/阴影，与 tag-trend / history-trend 对齐） */
export interface ChartContainerStyleInput {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  borderRadius: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}
