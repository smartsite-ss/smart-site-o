// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { OpcUaService } from './opcua.service.v2';

@Module({
  providers: [OpcUaService],
  exports: [OpcUaService],
})
export class OpcUaCollectorModule {}
