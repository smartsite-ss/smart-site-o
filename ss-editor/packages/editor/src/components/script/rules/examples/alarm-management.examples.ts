// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 告警管理脚本示例
 *
 * === 场景说明 ===
 * 告警管理是 SCADA 系统的核心功能，脚本可以编程方式管理告警生命周期。
 * 包括触发、确认、清除告警，以及告警汇总分析。
 *
 * === 触发方式 ===
 * - dataChange: 数据变化触发告警判断
 * - event: 告警事件触发联动处理
 * - schedule: 定时生成告警汇总
 *
 * === 常用 API 组合 ===
 * triggerAlarm / acknowledgeAlarm / clearAlarm / getActiveAlarms → 告警生命周期
 * isAlarm / readTag / writeTag                                    → 告警判断
 * setGraphicProps / showGraphic / hideGraphic                      → 告警可视化
 * notify / log / fetch                                             → 告警通知
 */

import type { ScriptExample } from '../types';

export const alarmManagementExamples: ScriptExample[] = [
  // ═══════════════════════════════════════════════════════════
  // 示例 1：多级告警判断
  // ═══════════════════════════════════════════════════════════
  {
    id: 'alarm-multi-level',
    title: '多级告警判断',
    description: '根据传感器数值区间触发不同级别的告警（info/warning/critical/emergency）。',
    category: 'alarm-management',
    triggerType: 'dataChange',
    requiredTags: ['temp_sensor_01'],
    tags: ['入门', '多级告警', '判断'],
    difficulty: 'easy',
    code: `// 场景：多级告警判断
// 触发方式：dataChange（绑定 temp_sensor_01 标签）
// 涉及 API：readTag, triggerAlarm, acknowledgeAlarm, setGraphicProps, notify, log, isAlarm

const temp = readTag('temp_sensor_01');
const tagId = 'temp_sensor_01';

// 多级阈值判断
if (temp >= 120) {
  // 紧急告警
  triggerAlarm({ tagId, level: 'emergency', message: \`温度紧急: \${temp}°C (≥120°C)\` });
  setGraphicProps('temp_alarm_light', { customProps: { color: '#FF0000', blink: true } });
  notify(\`紧急告警: 温度 \${temp}°C\`, 'error');

} else if (temp >= 100) {
  // 严重告警
  triggerAlarm({ tagId, level: 'critical', message: \`温度严重超标: \${temp}°C (≥100°C)\` });
  setGraphicProps('temp_alarm_light', { customProps: { color: '#FF0000', blink: true } });
  notify(\`严重告警: 温度 \${temp}°C\`, 'error');

} else if (temp >= 80) {
  // 警告
  triggerAlarm({ tagId, level: 'warning', message: \`温度偏高: \${temp}°C (≥80°C)\` });
  setGraphicProps('temp_alarm_light', { customProps: { color: '#FFA500', blink: false } });
  notify(\`温度偏高: \${temp}°C\`, 'warn');

} else if (temp <= 0) {
  // 低温告警
  triggerAlarm({ tagId, level: 'warning', message: \`温度过低: \${temp}°C (≤0°C)\` });
  setGraphicProps('temp_alarm_light', { customProps: { color: '#00BFFF', blink: false } });

} else {
  // 正常：清除之前的告警指示灯
  setGraphicProps('temp_alarm_light', { customProps: { color: '#00FF00', blink: false } });
}

log('info', \`温度告警检查完成: \${temp}°C\`);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 2：告警自动确认与恢复
  // ═══════════════════════════════════════════════════════════
  {
    id: 'alarm-auto-recovery',
    title: '告警自动确认与恢复',
    description: '当数据恢复正常时，自动确认并清除之前的告警。',
    category: 'alarm-management',
    triggerType: 'dataChange',
    requiredTags: ['temp_sensor_01'],
    tags: ['进阶', '自动恢复', '告警生命周期'],
    difficulty: 'medium',
    code: `// 场景：告警自动确认与恢复
// 触发方式：dataChange（绑定 temp_sensor_01 标签）
// 涉及 API：readTag, getActiveAlarms, acknowledgeAlarm, clearAlarm,
//           setGraphicProps, log

const temp = readTag('temp_sensor_01');
const tagId = 'temp_sensor_01';

// 1. 获取当前该标签的所有活跃告警
const activeAlarms = getActiveAlarms();
const tagAlarms = activeAlarms.filter(a => a.tagId === tagId);

if (temp < 80 && tagAlarms.length > 0) {
  // 2. 温度恢复正常，自动清除所有告警
  for (const alarm of tagAlarms) {
    log('info', \`自动恢复: 确认告警 \${alarm.id}\`);
    acknowledgeAlarm(alarm.id);
    clearAlarm(alarm.id);
  }

  // 3. 恢复图元正常状态
  setGraphicProps('temp_alarm_light', {
    customProps: { color: '#00FF00', blink: false },
  });

  notify(\`温度恢复正常: \${temp}°C，已清除告警\`, 'info');
  log('info', \`温度恢复正常 \${temp}°C, 已清除 \${tagAlarms.length} 个告警\`);
} else if (temp < 80) {
  // 无告警，正常状态
  setGraphicProps('temp_alarm_light', {
    customProps: { color: '#00FF00', blink: false },
  });
}
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 3：告警统计分析
  // ═══════════════════════════════════════════════════════════
  {
    id: 'alarm-statistics',
    title: '告警统计分析',
    description: '定时统计当前告警情况，按级别分类汇总，生成告警报表。',
    category: 'alarm-management',
    triggerType: 'schedule',
    cronExpression: '0 */15 * * * *',
    tags: ['进阶', '统计分析', '报表'],
    difficulty: 'medium',
    code: `// 场景：告警统计分析（每15分钟）
// 触发方式：Cron 定时（0 */15 * * * *）
// 涉及 API：getActiveAlarms, writeTag, setGraphicProps, notify, log, round

// 1. 获取所有活跃告警
const activeAlarms = getActiveAlarms();

// 2. 按级别分类统计
const stats = {
  emergency: activeAlarms.filter(a => a.level === 'emergency').length,
  critical: activeAlarms.filter(a => a.level === 'critical').length,
  warning: activeAlarms.filter(a => a.level === 'warning').length,
  info: activeAlarms.filter(a => a.level === 'info').length,
  total: activeAlarms.length,
};

// 3. 写入统计标签
writeTag('alarm_emergency_count', stats.emergency);
writeTag('alarm_critical_count', stats.critical);
writeTag('alarm_warning_count', stats.warning);
writeTag('alarm_info_count', stats.info);
writeTag('alarm_total_count', stats.total);

// 4. 更新告警看板图元
setGraphicProps('alarm_emergency_badge', {
  customProps: { text: String(stats.emergency), color: '#FF0000' },
});
setGraphicProps('alarm_critical_badge', {
  customProps: { text: String(stats.critical), color: '#FF4444' },
});
setGraphicProps('alarm_warning_badge', {
  customProps: { text: String(stats.warning), color: '#FFA500' },
});
setGraphicProps('alarm_total_badge', {
  customProps: { text: String(stats.total), color: '#FFFFFF' },
});

// 5. 紧急/严重告警时通知
if (stats.emergency > 0) {
  notify(\`紧急告警: \${stats.emergency}个 | 严重: \${stats.critical}个 | 总计: \${stats.total}个\`, 'error');
} else if (stats.critical > 0) {
  notify(\`严重告警: \${stats.critical}个 | 警告: \${stats.warning}个 | 总计: \${stats.total}个\`, 'warn');
}

log('info', \`告警统计: 紧急\${stats.emergency} 严重\${stats.critical} 警告\${stats.warning} 信息\${stats.info} 总计\${stats.total}\`);
`,
  },
];