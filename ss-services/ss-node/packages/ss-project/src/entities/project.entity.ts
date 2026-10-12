// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ProjectInfo } from './project-info.interface';

export class Project {
  /** 项目唯一标识符（拼音全拼 kebab-case，用作目录名/DB 隔离/InfluxDB bucket/Redis key） */
  projectId: string;
  /** tenantId 多租户预留字段（当前 = projectId，为以后扩展多租户预置） */
  tenantId: string;
  /** 项目名称（显示名称） */
  projectName: string;
  description: string;
  version: string;
  config: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  pages?: any[];
  /** 工程位置（项目目录绝对路径，运行时计算） */
  projectPath?: string;
  /** 数据库位置（项目数据库目录绝对路径，运行时计算） */
  databasePath?: string;
  /** 项目地址 */
  address?: string;
  /** 经度（十进制字符串） */
  longitude?: string;
  /** 纬度（十进制字符串） */
  latitude?: string;
  /** 负责人 */
  owner?: string;
  /** 项目封面图片相对路径（如 "images/cover-1234567890.png"） */
  image?: string;
  /** 项目启用状态（true=启用，false=停用）。停用的项目不采集、不在设备树显示、不计入首页统计 */
  enabled: boolean;
  /** 页面数量（运行时计算，不入 projectinfo.json） */
  pageCount?: number;
  /** 项目目录总大小（字节，运行时计算，不入 projectinfo.json） */
  folderSize?: number;

  constructor(partial?: Partial<Project>) {
    if (partial) {
      Object.assign(this, partial);
    }
    // enabled 默认 false（停用），兼容旧 projectinfo.json 无此字段的情况
    if (this.enabled === undefined) {
      this.enabled = false;
    }
  }

  toProjectInfo(): ProjectInfo {
    return {
      projectId: this.projectId,
      tenantId: this.tenantId,
      projectName: this.projectName,
      description: this.description,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      config: this.config || {},
      address: this.address,
      longitude: this.longitude,
      latitude: this.latitude,
      owner: this.owner,
      image: this.image,
      enabled: this.enabled,
    };
  }
}
