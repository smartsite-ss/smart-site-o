// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PipelineContext, PipelineStep } from '../pipeline-orchestrator';
export declare class CacheUpdateStep implements PipelineStep {
  readonly name = 'CacheUpdate';
  readonly order = 5;
  private readonly logger;
  private cache;
  process(ctx: PipelineContext): Promise<PipelineContext>;
  getLatest(tagId: string): PipelineContext | undefined;
}
