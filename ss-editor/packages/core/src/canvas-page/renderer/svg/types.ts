// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ViewportRect } from '../types'
import { IGraphic } from '@scada-editor/plugin-sdk'

export interface SVGGraphicMapping {
  graphicType: string
  svgTag: string
  svgFactory: (graphic: IGraphic) => SVGElement
}

export interface SVGViewportConfig {
  viewport: ViewportRect | null
  enabled: boolean
  bufferRatio: number
}