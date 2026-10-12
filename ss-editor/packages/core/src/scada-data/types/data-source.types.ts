// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type DataSourceType =
  | 'static'
  | 'expression'
  | 'polling'
  | 'websocket'
  | 'opc'
  | 'modbus'
  | 'mqtt'
  | 'sql'

export interface HttpPollingConfig {
  url: string
  method: 'GET' | 'POST'
  interval: number
  timeout: number
  retryCount: number
  responsePath: string
  headers: Record<string, string>
}

export interface WebSocketConfig {
  url: string
  protocols: string[]
  autoReconnect: boolean
  reconnectInterval: number
}

export interface OpcConfig {
  serverUrl: string
  namespace: string
  nodeId: string
  samplingInterval: number
  securityPolicy: string
}

export interface ModbusConfig {
  host: string
  port: number
  unitId: number
  functionCode: number
  address: number
  quantity: number
  scanRate: number
}

export interface MqttConfig {
  brokerUrl: string
  topic: string
  qos: 0 | 1 | 2
  clientId: string
  username: string
  password: string
  keepAlive: number
}

export interface SqlConfig {
  connectionString: string
  query: string
  interval: number
  timeout: number
  databaseType: string
}

export interface StaticConfig {
  value: unknown
  dataType: string
}

export interface ExpressionConfig {
  expression: string
  dependencies: string[]
}

export type DataSourceConfig =
  | { type: 'static'; config: StaticConfig }
  | { type: 'expression'; config: ExpressionConfig }
  | { type: 'polling'; config: HttpPollingConfig }
  | { type: 'websocket'; config: WebSocketConfig }
  | { type: 'opc'; config: OpcConfig }
  | { type: 'modbus'; config: ModbusConfig }
  | { type: 'mqtt'; config: MqttConfig }
  | { type: 'sql'; config: SqlConfig }

export type DataSourceStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface TagMeta {
  id: string
  name: string
  description: string
  unit: string
  min: number
  max: number
  dataType: string
}

export interface TagValue {
  tagId: string
  value: unknown
  quality: string
  timestamp: number
  sourceId: string
}

export interface DataSourceInfo {
  id: string
  type: DataSourceType
  config: DataSourceConfig
  status: DataSourceStatus
  lastError: string | null
  tags: TagMeta[]
}