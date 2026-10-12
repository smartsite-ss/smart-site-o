// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest'
import { createDefaultDataSource, type IGraphicDataSource } from '../../types/data-source.types'

describe('createDefaultDataSource', () => {
  it('should return disabled tag mode by default', () => {
    const ds = createDefaultDataSource()
    expect(ds.enabled).toBe(false)
    expect(ds.sourceType).toBe('tag')
    expect(ds.bindingMode).toBe('simple')
  })

  it('should have empty string defaults for optional fields', () => {
    const ds = createDefaultDataSource()
    expect(ds.tagId).toBe('')
    expect(ds.propertyPath).toBe('')
    expect(ds.expression).toBe('')
    expect(ds.apiUrl).toBe('')
    expect(ds.apiMethod).toBe('GET')
    expect(ds.apiHeaders).toBe('{}')
    expect(ds.dataFormat).toBe('')
    expect(ds.dataDealFunction).toBeNull()
  })

  it('should have empty array defaults for collection fields', () => {
    const ds = createDefaultDataSource()
    expect(ds.apiQueryParams).toEqual([])
    expect(ds.staticData).toEqual([])
    expect(ds.dataMapping).toEqual([])
  })

  it('should have default validation settings', () => {
    const ds = createDefaultDataSource()
    expect(ds.validation).toBeDefined()
    expect(ds.validation!.required).toBe(false)
    expect(ds.validation!.min).toBeUndefined()
    expect(ds.validation!.max).toBeUndefined()
    expect(ds.validation!.pattern).toBe('')
    expect(ds.validation!.message).toBe('')
  })

  it('should have default refresh settings', () => {
    const ds = createDefaultDataSource()
    expect(ds.openRefresh).toBe(false)
    expect(ds.refreshInterval).toBe(30)
  })

  it('should have useDataDeal disabled by default', () => {
    const ds = createDefaultDataSource()
    expect(ds.useDataDeal).toBe(false)
  })
})

describe('IGraphicDataSource type structure', () => {
  it('should support tag source type', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'tag',
      tagId: 'temp_001',
      bindingMode: 'simple',
      propertyPath: 'config.customProps.text',
    }
    expect(ds.sourceType).toBe('tag')
    expect(ds.tagId).toBe('temp_001')
  })

  it('should support api source type with query params', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'api',
      apiUrl: 'https://api.example.com/data',
      apiMethod: 'POST',
      apiHeaders: '{"Authorization":"Bearer token"}',
      apiQueryParams: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
      ],
    }
    expect(ds.sourceType).toBe('api')
    expect(ds.apiUrl).toBe('https://api.example.com/data')
    expect(ds.apiQueryParams!.length).toBe(2)
  })

  it('should support dataset source type', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'dataset',
      datasetId: 'ds_001',
      dimensions: [{ field: 'city', label: 'City' }],
      kpis: [{ field: 'amount', label: 'Amount', aggregation: 'sum' }],
    }
    expect(ds.sourceType).toBe('dataset')
    expect(ds.dimensions!.length).toBe(1)
    expect(ds.kpis!.length).toBe(1)
  })

  it('should support static source type', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'static',
      staticData: [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
      ],
    }
    expect(ds.sourceType).toBe('static')
    expect(ds.staticData!.length).toBe(2)
  })

  it('should support dataFormat options', () => {
    const formats = ['', 'number', 'currency', 'percent', 'decimal_1', 'decimal_2'] as const
    formats.forEach(f => {
      const ds: IGraphicDataSource = {
        enabled: false,
        sourceType: 'tag',
        dataFormat: f,
      }
      expect(ds.dataFormat).toBe(f)
    })
  })

  it('should support dataMapping array', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'tag',
      dataMapping: [
        { value: '1', display: 'Normal' },
        { value: '0', display: 'Abnormal' },
      ],
    }
    expect(ds.dataMapping!.length).toBe(2)
    expect(ds.dataMapping![0].value).toBe('1')
    expect(ds.dataMapping![0].display).toBe('Normal')
  })

  it('should support full configuration', () => {
    const ds: IGraphicDataSource = {
      enabled: true,
      sourceType: 'api',
      tagId: 'temp_001',
      bindingMode: 'expression',
      propertyPath: 'config.style.color',
      expression: 'val > 80 ? "#ff0000" : "#00ff00"',
      apiUrl: 'https://api.example.com/data',
      apiMethod: 'GET',
      apiHeaders: '{}',
      apiQueryParams: [],
      useDataDeal: true,
      dataDealFunction: 'formatNumber();',
      openRefresh: true,
      refreshInterval: 15,
      dataFormat: 'number',
      validation: {
        required: true,
        min: 0,
        max: 100,
        pattern: '^\\d+$',
        message: 'Please enter a number',
      },
      dataMapping: [
        { value: '1', display: 'Enabled' },
      ],
    }
    expect(ds.enabled).toBe(true)
    expect(ds.sourceType).toBe('api')
    expect(ds.bindingMode).toBe('expression')
    expect(ds.useDataDeal).toBe(true)
    expect(ds.openRefresh).toBe(true)
    expect(ds.refreshInterval).toBe(15)
    expect(ds.validation!.required).toBe(true)
    expect(ds.validation!.min).toBe(0)
    expect(ds.validation!.max).toBe(100)
    expect(ds.validation!.pattern).toBe('^\\d+$')
    expect(ds.dataMapping!.length).toBe(1)
  })

  it('should produce independent copies from createDefaultDataSource', () => {
    const ds1 = createDefaultDataSource()
    const ds2 = createDefaultDataSource()
    ds1.tagId = 'tag_a'
    ds1.apiQueryParams!.push({ key: 'k', value: 'v' })
    ds1.dataMapping!.push({ value: '1', display: 'One' })

    expect(ds2.tagId).toBe('')
    expect(ds2.apiQueryParams).toEqual([])
    expect(ds2.dataMapping).toEqual([])
  })
})