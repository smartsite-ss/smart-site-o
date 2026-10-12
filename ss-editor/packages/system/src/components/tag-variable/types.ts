// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/** 设备变量选择器选中的标签变量（供各系统插件的变量绑定配置复用） */
export interface SelectableVariable {
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  tagId: string;
  tagName: string;
  dataType: string;
  /** 标签变量单位（DataTag.unit 带出） */
  unit?: string;
  /** 标签变量小数位（DataTag.decimalPlaces 带出） */
  decimalPlaces?: number;
}
