// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { VirtualProtocolAdapter } from './virtual-adapter';
import { VirtualReadStep } from './virtual-read.step';
import { SimulatorFactory } from './simulator-factory';

@Module({
  providers: [SimulatorFactory, VirtualProtocolAdapter, VirtualReadStep],
  exports: [SimulatorFactory, VirtualProtocolAdapter, VirtualReadStep],
})
export class VirtualCollectorModule {}
