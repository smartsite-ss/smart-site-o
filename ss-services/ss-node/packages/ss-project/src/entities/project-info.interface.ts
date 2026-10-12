// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ProjectInfo {
  /** 项目唯一标识符（拼音全拼 kebab-case，用作目录名/DB 隔离/InfluxDB bucket/Redis key） */
  projectId: string;
  /** tenantId 多租户预留字段（当前 = projectId，为以后扩展多租户预置） */
  tenantId: string;
  /** 项目名称（显示名称） */
  projectName: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  config: Record<string, any>;
  /** 项目地址 */
  address?: string;
  /** 经度（十进制字符串，如 "116.404"） */
  longitude?: string;
  /** 纬度（十进制字符串，如 "39.915"） */
  latitude?: string;
  /** 负责人 */
  owner?: string;
  /** 项目封面图片相对路径（如 "images/cover-1234567890.png"） */
  image?: string;
  /** 项目启用状态（true=启用，false=停用）。停用的项目不采集、不在设备树显示、不计入首页统计 */
  enabled?: boolean;
}
