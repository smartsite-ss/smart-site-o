// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { ModbusService } from './modbus.service.v2';
import { ModbusRTUService } from './modbus-rtu.service';

@Module({
  providers: [ModbusService, ModbusRTUService],
  exports: [ModbusService, ModbusRTUService],
})
export class ModbusCollectorModule {}
