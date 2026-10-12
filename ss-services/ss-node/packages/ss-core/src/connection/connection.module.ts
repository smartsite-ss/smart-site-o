// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ConnectionPoolService } from './connection-pool.service';
import { ProtocolConnectionPoolService } from './protocol-connection-pool.service';
import { ProtocolConfigService } from './protocol-config.service';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [EventBusModule],
  providers: [
    CircuitBreakerService,
    ConnectionPoolService,
    ProtocolConnectionPoolService,
    ProtocolConfigService,
  ],
  exports: [
    CircuitBreakerService,
    ConnectionPoolService,
    ProtocolConnectionPoolService,
    ProtocolConfigService,
  ],
})
export class ConnectionModule {}
