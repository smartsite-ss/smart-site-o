// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { DeviceControlService } from './device-control.service';

@Module({
  providers: [DeviceControlService],
  exports: [DeviceControlService],
})
export class DeviceControlModule {}
