// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export const DeviceErrors = {
  NOT_FOUND: { code: 'DEV_001', status: 404, message: '设备不存在' },
  TID_EXISTS: { code: 'DEV_002', status: 400, message: '设备的 deviceCode 在当前项目中已存在' },
  NAME_EXISTS: { code: 'DEV_003', status: 400, message: '设备名称已存在' },
  INVALID_TYPE: { code: 'DEV_004', status: 400, message: '不支持的设备类型' },
  CONNECTION_FAILED: { code: 'DEV_005', status: 500, message: '设备连接失败' },
  CONNECTION_TIMEOUT: { code: 'DEV_006', status: 504, message: '设备连接超时' },
  ALREADY_CONNECTED: { code: 'DEV_007', status: 400, message: '设备已连接' },
  NOT_CONNECTED: { code: 'DEV_008', status: 400, message: '设备未连接' },
  DIAGNOSE_FAILED: { code: 'DEV_009', status: 500, message: '诊断执行失败' },
  SIMULATION_NOT_ENABLED: { code: 'DEV_010', status: 400, message: '设备未启用仿真模式' },
  BACKUP_INVALID: { code: 'DEV_011', status: 400, message: '设备备份文件无效' },
  MAX_GROUPS_EXCEEDED: { code: 'DEV_012', status: 400, message: '分组层级不能超过3级' },
  FORBIDDEN: { code: 'DEV_013', status: 403, message: '无权限操作此设备' },

  // ====== 通道配置错误码 ======
  INVALID_CHANNEL_CONFIG: { code: 'DEV_014', status: 400, message: '通道配置无效' },
  CHANNEL_CONNECTION_FAILED: { code: 'DEV_015', status: 500, message: '通道连接失败' },
  CHANNEL_PROTOCOL_MISMATCH: { code: 'DEV_016', status: 400, message: '通道协议与设备类型不匹配' },
};
