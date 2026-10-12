// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
export declare class DeadbandStep implements PipelineStep {
  readonly name = 'Deadband';
  readonly order = 2;
  private readonly logger;
  private lastValues;
  process(ctx: PipelineContext): Promise<PipelineContext>;
}
