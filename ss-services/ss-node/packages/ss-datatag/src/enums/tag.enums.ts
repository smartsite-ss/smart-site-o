// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export enum TagDataType {
  BOOLEAN = 'boolean',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
  FLOAT32 = 'float32',
  FLOAT64 = 'float64',
  STRING = 'string',
}

export enum DeadbandMode {
  NONE = 'none',
  ABSOLUTE = 'absolute',
  PERCENT = 'percent',
  TIME = 'time',
}

export enum ConversionType {
  LINEAR = 'linear',
  POLYNOMIAL = 'polynomial',
  LOOKUP_TABLE = 'lookup_table',
  SCRIPT = 'script',
  NONE = 'none',
}

export enum TagDirection {
  READ = 'read',
  WRITE = 'write',
  READ_WRITE = 'read-write',
}
