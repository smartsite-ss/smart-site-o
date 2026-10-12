// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataInputPayload } from '../../scada-data/types/pipeline.types'
import type { QualityCode } from '../../scada-data/types/quality.types'

export interface IGraphicDataReceiver {
  onDataInput(payload: DataInputPayload): void
  setQualityVisual?(code: QualityCode): void
  clearQualityVisual?(): void
}