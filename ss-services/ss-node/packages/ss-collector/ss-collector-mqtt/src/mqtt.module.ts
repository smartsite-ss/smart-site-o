// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service.v2';

@Module({
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttCollectorModule {}
