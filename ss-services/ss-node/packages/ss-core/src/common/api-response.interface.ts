// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PaginationMeta } from '@ss-node/ss-sdk';

export { PaginationMeta };

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  code: number;
  data: T[];
  pagination: PaginationMeta;
  message: string;
  timestamp: string;
}

export interface ErrorResponse {
  code: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  details?: unknown[];
}
