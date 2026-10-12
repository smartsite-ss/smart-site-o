// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ApiVersionConfig {
  current: string;
  supported: string[];
  deprecated: string[];
}

export const API_VERSION_CONFIG: ApiVersionConfig = {
  current: 'v1',
  supported: ['v1'],
  deprecated: [],
};
