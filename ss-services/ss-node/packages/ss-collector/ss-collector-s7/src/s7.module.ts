// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { S7Service } from './s7.service';

@Module({
  providers: [S7Service],
  exports: [S7Service],
})
export class S7CollectorModule {}
