// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// fixtures/runtime-fixtures.ts
import { QualityCode } from '../../scada-data/mocks/data-source-mock';

export const RUNTIME_FIXTURES = {
  /** 模拟工业温度传感器数据 */
  temperatureTags: {
    "reactor.temp": () => ({
      value: 180 + Math.random() * 5,
      quality: QualityCode.GOOD,
      timestamp: Date.now(),
    }),
    "boiler.temp": () => ({
      value: 95 + Math.random() * 3,
      quality: QualityCode.GOOD,
      timestamp: Date.now(),
    }),
    "ambient.temp": () => ({
      value: 25 + Math.random() * 2,
      quality: QualityCode.GOOD,
      timestamp: Date.now(),
    }),
  },

  /** 模拟告警产生序列 */
  alarmScenario: {
    normalOperation: [
      { tag: "reactor.temp", value: 180, quality: QualityCode.GOOD },
      { tag: "reactor.pressure", value: 15, quality: QualityCode.GOOD },
    ],
    warningThreshold: [
      { tag: "reactor.temp", value: 195, quality: QualityCode.GOOD },
      { tag: "reactor.pressure", value: 18, quality: QualityCode.GOOD },
    ],
    criticalAlarm: [
      { tag: "reactor.temp", value: 260, quality: QualityCode.BAD },
      { tag: "reactor.pressure", value: 28, quality: QualityCode.BAD },
    ],
  },

  /** 模拟OPC-UA地址空间 */
  opcuaAddressSpace: {
    "ns=1;s=production.line1.speed": { value: 1200, type: "Double" },
    "ns=1;s=production.line1.status": { value: 1, type: "Int32" },
    "ns=1;s=production.line1.temperature": { value: 220, type: "Double" },
    "ns=1;s=production.line1.pressure": { value: 16.5, type: "Double" },
    "ns=1;s=production.line1.emergency_stop": { value: false, type: "Boolean" },
  },

  /** 多设备场景 */
  multiDeviceScenario: [
    {
      name: "line1_plc",
      protocol: "modbus",
      address: "192.168.1.100:502",
      tags: [
        { name: "speed", address: 40001, type: "holding" },
        { name: "temp", address: 30001, type: "input" },
        { name: "running", address: 0, type: "coil" },
      ],
    },
    {
      name: "line2_opc",
      protocol: "opcua",
      address: "opc.tcp://192.168.1.101:4840",
      tags: [
        { name: "speed", nodeId: "ns=2;s=line2.speed" },
        { name: "temp", nodeId: "ns=2;s=line2.temp" },
      ],
    },
  ],
};
