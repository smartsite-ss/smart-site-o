// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 定时任务脚本示例
 *
 * === 场景说明 ===
 * 定时任务脚本通过 Cron 表达式在指定时间自动执行。
 * 适用于周期性报表生成、定时巡检、交班汇总等场景。
 *
 * === 触发方式 ===
 * - schedule (Cron): 通过 Cron 表达式定时触发
 * - 页面定时器: 页面加载后按固定间隔执行
 *
 * === 常用 API 组合 ===
 * readTag / writeTag              → 批量数据读写
 * triggerAlarm / notify / log     → 结果通知
 * getActiveAlarms                 → 告警汇总
 * fetch                           → 数据上报
 * round / clamp / mapRange        → 统计计算
 */

import type { ScriptExample } from '../types';

export const scheduledTaskExamples: ScriptExample[] = [
  // ═══════════════════════════════════════════════════════════
  // 示例 1：每小时产量统计
  // ═══════════════════════════════════════════════════════════
  {
    id: 'scheduled-hourly-report',
    title: '每小时产量统计',
    description: '每小时整点统计各产线产量并写入汇总标签。产量不足时触发告警和通知。',
    category: 'scheduled-task',
    triggerType: 'schedule',
    cronExpression: '0 0 * * * *',
    tags: ['入门', '统计', '产量'],
    difficulty: 'easy',
    code: `// 场景：每小时产量统计
// 触发方式：Cron 定时（0 0 * * * *，每小时整点）
// 涉及 API：readTag, writeTag, setGraphicProps, showGraphic, hideGraphic,
//           triggerAlarm, notify, log, isAlarm

// 1. 读取所有产线产量标签
const lines = ['line_01', 'line_02', 'line_03'];
const currentHour = new Date().getHours();
let totalOutput = 0;

for (const lineId of lines) {
  const data = readTag(\`\${lineId}_output\`);
  totalOutput += data || 0;
  log('info', \`\${lineId} 时产量: \${data}\`);
}

// 2. 写入汇总标签
writeTag(\`hourly_total_h\${currentHour}\`, totalOutput);
log('info', \`第\${currentHour}时总产量: \${totalOutput}\`);

// 3. 检查是否低于目标
const target = 500;
if (totalOutput < target) {
  log('warn', \`时产量 \${totalOutput} 低于目标 \${target}\`);

  // 产量不足时图元提示
  setGraphicProps('output_alert', {
    customProps: { text: \`产量不足: \${totalOutput}/\${target}\`, color: '#FFA500' },
  });
  showGraphic('output_alert');
} else {
  hideGraphic('output_alert');
}

// 4. 交班时间点发送通知
if (currentHour === 8 || currentHour === 16 || currentHour === 0) {
  notify(\`交班报告: 累计产量 \${totalOutput}\`, 'info');
}

// 5. 判断是否触发告警
if (isAlarm(totalOutput, 500, 100)) {
  triggerAlarm({
    tagId: 'hourly_total',
    level: 'warning',
    message: \`时产量 \${totalOutput} 低于目标 \${target}\`,
  });
}
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 2：每日设备巡检
  // ═══════════════════════════════════════════════════════════
  {
    id: 'scheduled-daily-inspection',
    title: '每日设备巡检',
    description: '每天定时检查所有设备状态，生成巡检报告，异常设备触发告警。',
    category: 'scheduled-task',
    triggerType: 'schedule',
    cronExpression: '0 0 8 * * *',
    tags: ['进阶', '巡检', '设备管理'],
    difficulty: 'medium',
    code: `// 场景：每日设备巡检（每天 08:00 执行）
// 触发方式：Cron 定时（0 0 8 * * *）
// 涉及 API：readTag, writeTag, getTagQuality, getActiveAlarms,
//           triggerAlarm, notify, log, round

const devices = [
  { id: 'pump_main', name: '主泵', tagId: 'pump_main_status' },
  { id: 'pump_backup', name: '备用泵', tagId: 'pump_backup_status' },
  { id: 'fan_01', name: '风机1号', tagId: 'fan_01_status' },
  { id: 'fan_02', name: '风机2号', tagId: 'fan_02_status' },
];

let normalCount = 0;
let warningCount = 0;
let errorCount = 0;

// 1. 遍历检查所有设备
for (const device of devices) {
  const status = readTag(device.tagId);
  const quality = getTagQuality(device.tagId);

  if (quality !== 'good') {
    // 数据质量异常
    errorCount++;
    log('error', \`\${device.name} 数据质量异常: \${quality}\`);
    continue;
  }

  if (status === 'running' || status === 'normal') {
    normalCount++;
    log('info', \`\${device.name}: 正常 (\${status})\`);
  } else if (status === 'warning') {
    warningCount++;
    log('warn', \`\${device.name}: 警告 (\${status})\`);
  } else {
    errorCount++;
    log('error', \`\${device.name}: 异常 (\${status})\`);
    triggerAlarm({
      tagId: device.tagId,
      level: 'warning',
      message: \`\${device.name} 状态异常: \${status}\`,
    });
  }
}

// 2. 写入巡检统计
const total = devices.length;
writeTag('inspection_total', total);
writeTag('inspection_normal', normalCount);
writeTag('inspection_warning', warningCount);
writeTag('inspection_error', errorCount);

// 3. 计算健康率
const healthRate = round((normalCount / total) * 100, 1);
writeTag('device_health_rate', healthRate);

// 4. 获取当前活跃告警
const activeAlarms = getActiveAlarms();
const criticalAlarms = activeAlarms.filter(a => a.level === 'critical' || a.level === 'emergency');

// 5. 巡检结果通知
if (errorCount > 0) {
  notify(
    \`巡检完成: \${normalCount}正常/\${warningCount}警告/\${errorCount}异常 | 严重告警: \${criticalAlarms.length}个\`,
    'error'
  );
} else if (warningCount > 0) {
  notify(
    \`巡检完成: \${normalCount}正常/\${warningCount}警告 | 健康率: \${healthRate}%\`,
    'warn'
  );
} else {
  notify(
    \`巡检完成: 全部正常 | 健康率: \${healthRate}%\`,
    'info'
  );
}

log('info', \`巡检报告: 设备\${total}台, 正常\${normalCount}, 警告\${warningCount}, 异常\${errorCount}\`);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 3：定时数据上报
  // ═══════════════════════════════════════════════════════════
  {
    id: 'scheduled-data-upload',
    title: '定时数据上报',
    description: '每5分钟汇总关键指标数据，通过 HTTP 请求上报到后端服务。',
    category: 'scheduled-task',
    triggerType: 'schedule',
    cronExpression: '0 */5 * * * *',
    tags: ['进阶', 'HTTP', '数据上报'],
    difficulty: 'medium',
    code: `// 场景：定时数据上报（每5分钟）
// 触发方式：Cron 定时（0 */5 * * * *）
// 涉及 API：readTag, fetch, log, notify, round

// 1. 收集关键指标数据
const metrics = {
  timestamp: new Date().toISOString(),
  temperature: readTag('temp_sensor_01'),
  pressure: readTag('pressure_sensor'),
  humidity: readTag('humidity_sensor'),
  totalOutput: readTag('total_output'),
  energyConsumption: readTag('energy_total'),
  activeAlarms: getActiveAlarms().length,
};

// 2. 计算派生指标
metrics.avgTemperature = round(
  (readTag('temp_sensor_01') + readTag('temp_sensor_02') + readTag('temp_sensor_03')) / 3,
  1
);

// 3. 通过 HTTP POST 上报数据
try {
  const response = await fetch('https://api.example.com/v1/metrics/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metrics),
  });

  if (response.success) {
    log('info', '数据上报成功');
  } else {
    log('warn', \`数据上报失败: \${response.message}\`);
  }
} catch (err) {
  log('error', \`数据上报异常: \${err.message}\`);
  notify('数据上报失败，请检查网络', 'warn');
}

// 4. 记录上报日志
log('info', \`指标上报: 温度\${metrics.avgTemperature}°C, 产量\${metrics.totalOutput}, 告警\${metrics.activeAlarms}个\`);
`,
  },
];