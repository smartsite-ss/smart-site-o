// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
export declare class QualityCheckStep implements PipelineStep {
  readonly name = 'QualityCheck';
  readonly order = 3;
  private readonly logger;
  process(ctx: PipelineContext): Promise<PipelineContext>;
}
