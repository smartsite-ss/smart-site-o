// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Device } from './entities/device.entity';
import { DataTag } from './entities/data-tag.entity';
import { TagDataType, DeadbandMode, ConversionType } from './entities/data-tag.entity';

export interface IDeviceService {
  findById(id: string): Promise<Device | null>;
  findByIds(ids: string[]): Promise<Device[]>;
  findByProject(projectId: string): Promise<Device[]>;
  createDevice(data: Partial<Device>): Promise<Device>;
  updateDevice(id: string, data: Partial<Device>): Promise<Device>;
  deleteDevice(id: string): Promise<void>;
  applyTemplate(deviceId: string, templateId: string, projectId: string): Promise<Device>;
  syncTemplate(deviceId: string, templateId: string): Promise<Device>;
  getTags(deviceId: string): Promise<DataTag[]>;
  getDeviceTree(
    projectId: string,
  ): Promise<{ id: string; name: string; type: string; children: any[] }[]>;
}

export { Device, DataTag, TagDataType, DeadbandMode, ConversionType };
