// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { API_VERSION_CONFIG } from './api-version.config';

@ApiTags('version')
@Controller({ path: 'version', version: undefined })
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Get API version information' })
  getVersion() {
    return {
      current: API_VERSION_CONFIG.current,
      supported: API_VERSION_CONFIG.supported,
      deprecated: API_VERSION_CONFIG.deprecated,
    };
  }
}
