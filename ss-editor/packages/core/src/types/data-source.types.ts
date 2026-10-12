// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface IApiQueryParam {
  key: string
  value: string
}

export interface IDimension {
  field: string
  label: string
}

export interface IKpi {
  field: string
  label: string
  aggregation: string
}

export interface IFilter {
  field: string
  operator: string
  value: any
}

export interface IDataColumn {
  label: string
  name: string
  value: string
  map: string
}

export interface IDataMapping {
  value: string
  display: string
}

export interface IDataValidation {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export type DataFormat = '' | 'number' | 'currency' | 'percent' | 'decimal_1' | 'decimal_2'

export interface IGraphicDataSource {
  enabled: boolean

  sourceType: 'tag' | 'api' | 'dataset' | 'static'

  tagId?: string
  bindingMode?: 'simple' | 'expression'
  propertyPath?: string
  expression?: string

  apiUrl?: string
  apiMethod?: 'GET' | 'POST'
  apiHeaders?: string
  apiQueryParams?: IApiQueryParam[]

  datasetId?: string
  dimensions?: IDimension[]
  kpis?: IKpi[]
  filters?: IFilter[]
  statementInfo?: Record<string, any>

  dataColumns?: IDataColumn[]
  dataAttr?: string[]
  dataProp?: 'value' | 'map'

  staticData?: any[]
  previewData?: any
  previewHeader?: any
  previewVisible?: boolean

  useDataDeal?: boolean
  dataDealFunction?: string | null

  openRefresh?: boolean
  refreshInterval?: number

  dataFormat?: DataFormat
  validation?: IDataValidation
  dataMapping?: IDataMapping[]

  xAxisData?: any[] | null
  yAxisData?: any[] | null
}

export function createDefaultDataSource(): IGraphicDataSource {
  return {
    enabled: false,
    sourceType: 'tag',
    tagId: '',
    bindingMode: 'simple',
    propertyPath: '',
    expression: '',
    apiUrl: '',
    apiMethod: 'GET',
    apiHeaders: '{}',
    apiQueryParams: [],
    staticData: [],
    useDataDeal: false,
    dataDealFunction: null,
    openRefresh: false,
    refreshInterval: 30,
    dataFormat: '',
    validation: {
      required: false,
      min: undefined,
      max: undefined,
      pattern: '',
      message: '',
    },
    dataMapping: [],
  }
}