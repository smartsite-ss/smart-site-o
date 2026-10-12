// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 多标签联动脚本示例
 *
 * === 场景说明 ===
 * 多标签联动场景涉及多个标签之间的关联操作。
 * 当一个标签值变化时，联动更新多个相关图元和其他标签。
 * 适用于泵-管道联动、多设备协同控制等场景。
 *
 * === 触发方式 ===
 * - dataChange: 绑定到主控标签
 * - expression: 复杂条件组合触发
 *
 * === 常用 API 组合 ===
 * readTag / writeTag              → 多标签读写
 * setGraphicProps / showGraphic / hideGraphic → 多图元联动
 * moveGraphic / rotateGraphic     → 图元动画
 * mapRange / clamp / round        → 值映射计算
 * triggerAlarm / notify / log     → 结果通知
 */

import type { ScriptExample } from '../types';

export const multiTagLinkingExamples: ScriptExample[] = [
  // ═══════════════════════════════════════════════════════════
  // 示例 1：泵状态联动管道
  // ═══════════════════════════════════════════════════════════
  {
    id: 'linking-pump-pipe',
    title: '泵状态联动管道',
    description: '泵启停时联动管道流动效果，将泵转速映射为管道流速，实现动态联动。',
    category: 'multi-tag-linking',
    triggerType: 'dataChange',
    requiredTags: ['pump_status', 'pump_speed'],
    tags: ['入门', '联动', '泵-管道'],
    difficulty: 'easy',
    code: `// 场景：泵状态联动管道
// 触发方式：dataChange（绑定 pump_status 标签）
// 涉及 API：readTag, setGraphicProps, showGraphic, hideGraphic,
//           mapRange, round, log

const pumpStatus = readTag('pump_status'); // 'running' | 'stopped'

if (pumpStatus === 'running') {
  // 1. 管道流动效果：设置管道颜色 + 流速
  setGraphicProps('pipe_inlet', {
    customProps: { status: 'flowing', flowSpeed: 3, color: '#00BFFF' },
  });
  setGraphicProps('pipe_outlet', {
    customProps: { status: 'flowing', flowSpeed: 3, color: '#00BFFF' },
  });

  // 2. 显示流动指示器
  showGraphic('flow_indicator');

  // 3. 将泵转速映射为流动速度（0-3000 rpm → 0-5 流速）
  const pumpSpeed = readTag('pump_speed');
  const flowSpeed = mapRange(pumpSpeed, 0, 3000, 0, 5);
  setGraphicProps('pipe_inlet', {
    customProps: { flowSpeed: round(flowSpeed, 1) },
  });

  // 4. 根据转速旋转风扇图元
  const fanAngle = mapRange(pumpSpeed, 0, 3000, 0, 360);
  rotateGraphic('fan_blade', fanAngle);

} else {
  // 5. 管道停止
  setGraphicProps('pipe_inlet', {
    customProps: { status: 'stopped', color: '#808080' },
  });
  setGraphicProps('pipe_outlet', {
    customProps: { status: 'stopped', color: '#808080' },
  });
  hideGraphic('flow_indicator');
}

log('info', \`泵状态: \${pumpStatus}, 管道联动完成\`);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 2：多设备协同控制
  // ═══════════════════════════════════════════════════════════
  {
    id: 'linking-multi-device',
    title: '多设备协同控制',
    description: '主设备启停时联动控制多个从设备，包括阀门开闭、风机启停等。',
    category: 'multi-tag-linking',
    triggerType: 'dataChange',
    requiredTags: ['main_switch', 'valve_01', 'valve_02', 'fan_01', 'fan_02'],
    tags: ['进阶', '协同控制', '多设备'],
    difficulty: 'medium',
    code: `// 场景：多设备协同控制
// 触发方式：dataChange（绑定 main_switch 标签）
// 涉及 API：readTag, writeTag, setGraphicProps, showGraphic, hideGraphic,
//           sleep, notify, log

const mainSwitch = readTag('main_switch'); // 'on' | 'off'

if (mainSwitch === 'on') {
  // 1. 启动前检查所有设备状态
  const valve1Status = readTag('valve_01_status');
  const valve2Status = readTag('valve_02_status');
  const fan1Status = readTag('fan_01_status');
  const fan2Status = readTag('fan_02_status');

  log('info', '主开关开启，开始启动设备序列...');

  // 2. 先开阀门
  if (valve1Status !== 'open') {
    writeTag('valve_01_command', 'open');
    setGraphicProps('valve_01', {
      customProps: { status: 'opening', color: '#00BFFF' },
    });
    log('info', '阀门1 开启中...');
  }

  if (valve2Status !== 'open') {
    writeTag('valve_02_command', 'open');
    setGraphicProps('valve_02', {
      customProps: { status: 'opening', color: '#00BFFF' },
    });
    log('info', '阀门2 开启中...');
  }

  // 3. 等待阀门开启（模拟延迟）
  await sleep(2000);

  // 4. 启动风机
  if (fan1Status !== 'running') {
    writeTag('fan_01_command', 'start');
    setGraphicProps('fan_01', {
      customProps: { status: 'running', color: '#00FF00' },
    });
    showGraphic('fan_01_indicator');
    log('info', '风机1 启动');
  }

  if (fan2Status !== 'running') {
    writeTag('fan_02_command', 'start');
    setGraphicProps('fan_02', {
      customProps: { status: 'running', color: '#00FF00' },
    });
    showGraphic('fan_02_indicator');
    log('info', '风机2 启动');
  }

  notify('设备序列启动完成', 'info');

} else {
  // 5. 关闭序列：先停风机，再关阀门
  log('info', '主开关关闭，开始停止设备序列...');

  writeTag('fan_01_command', 'stop');
  writeTag('fan_02_command', 'stop');
  setGraphicProps('fan_01', {
    customProps: { status: 'stopped', color: '#808080' },
  });
  setGraphicProps('fan_02', {
    customProps: { status: 'stopped', color: '#808080' },
  });
  hideGraphic('fan_01_indicator');
  hideGraphic('fan_02_indicator');

  await sleep(3000);

  writeTag('valve_01_command', 'close');
  writeTag('valve_02_command', 'close');
  setGraphicProps('valve_01', {
    customProps: { status: 'closed', color: '#808080' },
  });
  setGraphicProps('valve_02', {
    customProps: { status: 'closed', color: '#808080' },
  });

  notify('设备序列停止完成', 'info');
}
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 3：液位-阀门-泵 PID 联动
  // ═══════════════════════════════════════════════════════════
  {
    id: 'linking-level-control',
    title: '液位-阀门-泵 PID 联动',
    description: '根据液位变化自动调节阀门开度和泵转速，实现储罐液位自动控制。',
    category: 'multi-tag-linking',
    triggerType: 'dataChange',
    requiredTags: ['tank_level', 'valve_position', 'pump_speed'],
    tags: ['进阶', 'PID控制', '自动调节'],
    difficulty: 'hard',
    code: `// 场景：液位-阀门-泵 PID 联动控制
// 触发方式：dataChange（绑定 tank_level 标签）
// 涉及 API：readTag, writeTag, setGraphicProps, moveGraphic,
//           mapRange, clamp, round, log, triggerAlarm

const tankLevel = readTag('tank_level');       // 0-100%
const targetLevel = readTag('target_level');   // 目标液位
const valvePosition = readTag('valve_position'); // 当前阀门开度 0-100%
const pumpSpeed = readTag('pump_speed');       // 当前泵转速 0-3000 rpm

// 1. 液位图元更新
setGraphicProps('tank_level_indicator', {
  customProps: {
    value: round(tankLevel, 1),
    color: colorForValue(tankLevel, 0, 100),
  },
});

// 2. 根据液位与目标的偏差，计算调节量
const deviation = tankLevel - targetLevel;
const threshold = 5; // 5% 死区

if (Math.abs(deviation) <= threshold) {
  // 在死区内，保持当前状态
  log('info', \`液位 \${round(tankLevel, 1)}% 在目标范围内 (±\${threshold}%)\`);
  return;
}

if (deviation > 0) {
  // 液位偏高：增加阀门开度，降低泵速
  const newValve = clamp(valvePosition + mapRange(deviation, threshold, 50, 0, 30), 0, 100);
  const newSpeed = clamp(pumpSpeed - mapRange(deviation, threshold, 50, 0, 1000), 0, 3000);

  writeTag('valve_command', round(newValve, 0));
  writeTag('pump_command', round(newSpeed, 0));

  setGraphicProps('valve_01', {
    customProps: { position: round(newValve, 0), color: '#00BFFF' },
  });
  setGraphicProps('pump_main', {
    customProps: { speed: round(newSpeed, 0), color: '#00FF00' },
  });

  log('info', \`液位偏高 \${round(deviation, 1)}% → 阀门\${round(newValve, 0)}% 泵速\${round(newSpeed, 0)}rpm\`);

} else {
  // 液位偏低：减小阀门开度，增加泵速
  const absDeviation = Math.abs(deviation);
  const newValve = clamp(valvePosition - mapRange(absDeviation, threshold, 50, 0, 30), 0, 100);
  const newSpeed = clamp(pumpSpeed + mapRange(absDeviation, threshold, 50, 0, 1000), 0, 3000);

  writeTag('valve_command', round(newValve, 0));
  writeTag('pump_command', round(newSpeed, 0));

  setGraphicProps('valve_01', {
    customProps: { position: round(newValve, 0), color: '#FFA500' },
  });
  setGraphicProps('pump_main', {
    customProps: { speed: round(newSpeed, 0), color: '#FFA500' },
  });

  log('info', \`液位偏低 \${round(absDeviation, 1)}% → 阀门\${round(newValve, 0)}% 泵速\${round(newSpeed, 0)}rpm\`);
}

// 3. 极限情况告警
if (tankLevel > 90) {
  triggerAlarm({
    tagId: 'tank_level',
    level: 'critical',
    message: \`液位过高: \${round(tankLevel, 1)}%\`,
  });
} else if (tankLevel < 10) {
  triggerAlarm({
    tagId: 'tank_level',
    level: 'critical',
    message: \`液位过低: \${round(tankLevel, 1)}%\`,
  });
}
`,
  },
];