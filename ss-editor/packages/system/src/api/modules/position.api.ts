// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse } from '../types/api';

export interface PositionInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionDto {
  name: string;
  code: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdatePositionDto {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export const positionApi = {
  getPositions(): Promise<ApiResponse<PositionInfo[]>> {
    return client.get('/positions').then((res) => res.data);
  },

  getPosition(id: string): Promise<ApiResponse<PositionInfo>> {
    return client.get(`/positions/${id}`).then((res) => res.data);
  },

  createPosition(dto: CreatePositionDto): Promise<ApiResponse<PositionInfo>> {
    return client.post('/positions', dto).then((res) => res.data);
  },

  updatePosition(id: string, dto: UpdatePositionDto): Promise<ApiResponse<PositionInfo>> {
    return client.put(`/positions/${id}`, dto).then((res) => res.data);
  },

  deletePosition(id: string): Promise<void> {
    return client.delete(`/positions/${id}`);
  },
};