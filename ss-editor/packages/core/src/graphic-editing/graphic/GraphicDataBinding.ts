// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { TagBinding } from '../../scada-data/managers/BindingManager';
import type { DataFilter } from '../../scada-data/types/pipeline.types';

export interface GraphicDataBinding {
  graphicId: string;
  tagBindings: TagBinding[];
  pipelineConfig: {
    filters: DataFilter[];
    errorStrategy: 'skip' | 'stop' | 'defaultValue';
    defaultValue?: unknown;
  };
  driverConfig: {
    script?: string;
    priority?: number;
    enabled?: boolean;
  };
  sourceId?: string;
}