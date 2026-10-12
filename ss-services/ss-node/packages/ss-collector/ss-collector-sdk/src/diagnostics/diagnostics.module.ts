// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module, Global } from '@nestjs/common';
import { CollectorDiagnosticsService } from './collector-diagnostics.service';
import { CollectorDiagnosticsController } from './collector-diagnostics.controller';

@Global()
@Module({
  providers: [CollectorDiagnosticsService],
  controllers: [CollectorDiagnosticsController],
  exports: [CollectorDiagnosticsService],
})
export class DiagnosticsModule {}
