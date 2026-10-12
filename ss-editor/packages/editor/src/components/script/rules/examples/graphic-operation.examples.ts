// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 图元操作脚本示例
 *
 * === 场景说明 ===
 * 图元操作是脚本中最常见的可视化操作。
 * 涵盖图元的显示/隐藏、移动、旋转、属性设置等。
 *
 * === 常用 API 组合 ===
 * setGraphicProps / showGraphic / hideGraphic → 图元属性控制
 * moveGraphic / rotateGraphic                  → 图元动画
 * setTimeout / setInterval                     → 定时动画
 * sleep                                        → 异步动画
 * mapRange / clamp                             → 动画参数计算
 */

import type { ScriptExample } from '../types';

export const graphicOperationExamples: ScriptExample[] = [
  // ═══════════════════════════════════════════════════════════
  // 示例 1：弹窗显示/隐藏
  // ═══════════════════════════════════════════════════════════
  {
    id: 'graphic-popup-control',
    title: '弹窗显示/隐藏',
    description: '点击图元时显示弹窗，3秒后自动隐藏，包含位置计算。',
    category: 'graphic-operation',
    triggerType: 'event',
    tags: ['入门', '弹窗', '显示隐藏'],
    difficulty: 'easy',
    code: `// 场景：弹窗显示/隐藏
// 触发方式：图元交互事件
// 涉及 API：showGraphic, hideGraphic, setGraphicProps, setTimeout

const popupId = 'popup-' + context.graphicId;

// 1. 设置弹窗位置（在点击位置附近显示）
setGraphicProps(popupId, {
  x: context.eventData?.x + 10,
  y: context.eventData?.y - 50,
  visible: true,
});

// 2. 显示弹窗
showGraphic(popupId);

// 3. 3秒后自动隐藏
setTimeout(() => {
  hideGraphic(popupId);
}, 3000);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 2：图元平移动画
  // ═══════════════════════════════════════════════════════════
  {
    id: 'graphic-move-animation',
    title: '图元平移动画',
    description: '使用 moveGraphic + sleep 实现图元平滑移动动画。',
    category: 'graphic-operation',
    triggerType: 'event',
    tags: ['进阶', '动画', '移动'],
    difficulty: 'medium',
    code: `// 场景：图元平移动画
// 触发方式：图元交互事件
// 涉及 API：moveGraphic, sleep, log

// 定义动画参数
const graphicId = 'conveyor_item';
const startX = 100;
const startY = 200;
const endX = 500;
const endY = 200;
const steps = 50;
const duration = 1000; // 总时长 1秒

const dx = (endX - startX) / steps;
const dy = (endY - startY) / steps;
const stepDelay = duration / steps;

// 逐帧移动
for (let i = 0; i <= steps; i++) {
  const x = startX + dx * i;
  const y = startY + dy * i;
  moveGraphic(graphicId, x, y);
  await sleep(stepDelay);
}

log('info', \`图元 \${graphicId} 移动动画完成: (\${startX},\${startY}) → (\${endX},\${endY})\`);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // 示例 3：批量图元样式切换
  // ═══════════════════════════════════════════════════════════
  {
    id: 'graphic-batch-style',
    title: '批量图元样式切换',
    description: '根据条件批量切换多个图元的显示样式，实现主题切换效果。',
    category: 'graphic-operation',
    triggerType: 'dataChange',
    requiredTags: ['system_mode'],
    tags: ['进阶', '批量操作', '样式切换'],
    difficulty: 'medium',
    code: `// 场景：批量图元样式切换
// 触发方式：dataChange（绑定 system_mode 标签）
// 涉及 API：readTag, setGraphicProps, showGraphic, hideGraphic, log

const mode = readTag('system_mode'); // 'day' | 'night' | 'alarm'

// 定义不同模式下的样式配置
const modeStyles = {
  day: {
    background: '#FFFFFF',
    textColor: '#333333',
    borderColor: '#E0E0E0',
  },
  night: {
    background: '#1A1A2E',
    textColor: '#E0E0E0',
    borderColor: '#334155',
  },
  alarm: {
    background: '#2D0000',
    textColor: '#FF6666',
    borderColor: '#FF0000',
  },
};

const style = modeStyles[mode] || modeStyles.day;

// 批量更新的图元列表
const graphics = ['header', 'sidebar', 'status_bar', 'data_panel'];

for (const id of graphics) {
  setGraphicProps(id, {
    customProps: {
      backgroundColor: style.background,
      textColor: style.textColor,
      borderColor: style.borderColor,
    },
  });
}

// 特殊模式下的额外处理
if (mode === 'alarm') {
  showGraphic('alarm_banner');
  setGraphicProps('alarm_banner', {
    customProps: { text: '系统告警模式', color: '#FF0000' },
  });
} else {
  hideGraphic('alarm_banner');
}

log('info', \`系统模式切换: \${mode}\`);
`,
  },
];