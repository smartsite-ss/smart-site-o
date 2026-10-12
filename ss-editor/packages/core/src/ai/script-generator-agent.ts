// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Script Generator Agent — P1-T06 智能脚本助手
 *
 * 统一 AI 助手面板的 `script-dev` 任务类型后端逻辑：
 *   1. 解析用户的自然语言脚本需求
 *   2. 匹配触发事件类型（dataChange/timer/event/manual）
 *   3. 构造 LLM System Prompt（含 26 ScriptAPI 完整知识）
 *   4. LLM 生成符合 ScriptAPI 规范的脚本代码
 *   5. 前端提供"插入 ScriptEditor"快捷操作
 *
 * 关联决策：D-005 混合模式、D-016 Session 委托
 *
 * 用法:
 *   const agent = new ScriptGeneratorAgent();
 *   const result = agent.analyze('当温度超过 80 度时触发告警');
 */

import { ChatMessage } from './ai-client';
import type { TriggerMatchResult } from './trigger-matcher';
import { triggerMatcher } from './trigger-matcher';

// ============================================================
// 类型定义
// ============================================================

export interface ScriptGenInput {
  /** 用户原始输入 */
  userInput: string;
  /** 匹配的触发事件 */
  trigger: TriggerMatchResult;
}

export interface ScriptGenResult {
  /** 完整的 System Prompt（含 ScriptAPI 知识） */
  systemPrompt: string;
  /** 用于发送给 LLM 的消息列表 */
  messages: ChatMessage[];
  /** 匹配的触发配置 */
  trigger: TriggerMatchResult;
}

// ============================================================
// 常量：26 ScriptAPI 完整文档（注入到 System Prompt）
// ============================================================

const SCRIPT_API_DOCS = `## ScriptAPI 参考（26 个 API）

### 数据读写（run-time）
| API | 签名 | 说明 |
|-----|------|------|
| readTag | \`(tagId: string) => any | null\` | 读取数据标签最新值 |
| writeTag | \`(tagId: string, value: any) => void\` | 写入数据标签值 |
| getTagQuality | \`(tagId: string) => string\` | 获取标签数据质量（good/bad/uncertain） |

### 图元操作（design-time + run-time）
| API | 签名 | 说明 |
|-----|------|------|
| setGraphicProps | \`(graphicId: string, props: Record<string, any>) => void\` | 批量设置图元属性 |
| showGraphic | \`(graphicId: string) => void\` | 显示图元 |
| hideGraphic | \`(graphicId: string) => void\` | 隐藏图元 |
| moveGraphic | \`(graphicId: string, x: number, y: number) => void\` | 移动图元位置 |
| rotateGraphic | \`(graphicId: string, angle: number) => void\` | 旋转图元角度（度） |

### 告警操作
| API | 签名 | 说明 |
|-----|------|------|
| triggerAlarm | \`(config: { tagId: string; level: string; message: string }) => void\` | 触发告警（level: info/warn/error/critical） |
| acknowledgeAlarm | \`(alarmId: string) => void\` | 确认告警 |
| clearAlarm | \`(alarmId: string) => void\` | 清除告警 |
| getActiveAlarms | \`() => any[]\` | 获取当前活跃告警列表 |

### 页面操作
| API | 签名 | 说明 |
|-----|------|------|
| switchPage | \`(pageId: string) => void\` | 切换页面 |
| getCurrentPageId | \`() => string\` | 获取当前页面 ID |

### 网络请求
| API | 签名 | 说明 |
|-----|------|------|
| fetch | \`(url: string, options?: { method, headers, body }) => Promise<any>\` | HTTP 请求 |

### 定时器
| API | 签名 | 说明 |
|-----|------|------|
| setTimeout | \`(callback: () => void, delay: number) => number\` | 设置一次性定时器 |
| setInterval | \`(callback: () => void, interval: number) => number\` | 设置周期性定时器 |
| clearTimeout | \`(id: number) => void\` | 清除定时器 |
| clearInterval | \`(id: number) => void\` | 清除周期性定时器 |

### 工具函数
| API | 签名 | 说明 |
|-----|------|------|
| sleep | \`(ms: number) => Promise<void>\` | 异步等待 |
| notify | \`(message: string, level?: 'info'|'warn'|'error') => void\` | 弹出通知 |
| log | \`(level: 'info'|'warn'|'error', message: string) => void\` | 日志记录 |
| round | \`(value: number, decimals?: number) => number\` | 四舍五入 |
| clamp | \`(value: number, min: number, max: number) => number\` | 值钳位 |
| mapRange | \`(v: number, inMin: number, inMax: number, outMin: number, outMax: number) => number\` | 线性映射 |
| colorForValue | \`(v: number, min: number, max: number) => string\` | 根据值返回颜色 |

### 触发方式
| 触发类型 | 说明 | 配置参数 |
|----------|------|---------|
| dataChange | 数据标签值变化时触发 | tagId (标签 ID), condition (条件: >, <, >=, <=, ==, !=), threshold (阈值) |
| timer | 定时触发 | interval (间隔毫秒), cron (Cron 表达式，可选) |
| event | 图元事件触发 | graphicId (图元 ID), eventType (click/dblclick/mousedown/mouseup) |
| manual | 手动触发（按钮/菜单） | 无需配置参数 |
`;

// ============================================================
// 常量：触发方式 → 代码模板
// ============================================================

const TRIGGER_TEMPLATES: Record<string, string> = {
  dataChange: `// dataChange 触发：当 {tagId} 值变化时执行
// 可通过 api.readTag('{tagId}') 获取当前值
const currentValue = api.readTag('{tagId}');
if (currentValue {condition} {threshold}) {
  // TODO: 在这里添加业务逻辑
}`,

  timer: `// timer 触发：每 {interval}ms 执行一次
// 适合周期性检查、轮询等场景`,

  event: `// event 触发：当用户与 {graphicId} 交互时执行
// eventType: {eventType}`,

  manual: `// manual 触发：用户手动调用
// 适合绑定到按钮或菜单项`,
};

// ============================================================
// ScriptGeneratorAgent
// ============================================================

export class ScriptGeneratorAgent {
  /**
   * 分析用户输入，匹配触发事件并生成 LLM System Prompt
   */
  analyze(userInput: string): ScriptGenResult {
    const trigger = triggerMatcher.match(userInput);

    return {
      trigger,
      systemPrompt: this._buildSystemPrompt(trigger),
      messages: this._buildMessages(userInput, trigger),
    };
  }

  /**
   * 构建包含完整 ScriptAPI 知识的 System Prompt
   */
  buildSystemPrompt(trigger: TriggerMatchResult): string {
    return this._buildSystemPrompt(trigger);
  }

  // ─── 私有方法 ───

  private _buildSystemPrompt(trigger: TriggerMatchResult): string {
    const triggerSection = trigger.type !== 'unknown'
      ? `### 触发配置
- **触发类型**: ${trigger.type}
- **置信度**: ${(trigger.confidence * 100).toFixed(0)}%${trigger.tagId ? `\n- **标签 ID**: ${trigger.tagId}` : ''}${trigger.condition ? `\n- **条件**: ${trigger.condition}` : ''}${trigger.threshold !== undefined ? `\n- **阈值**: ${trigger.threshold}` : ''}${trigger.interval ? `\n- **间隔**: ${trigger.interval}ms` : ''}

### 触发类型代码模板
\`\`\`javascript
${this._getTriggerTemplate(trigger)}
\`\`\``
      : '### 触发配置\n未能自动匹配触发类型，请根据业务逻辑选择合适的触发方式。';

    return `你是一个 Smart-SCADA v7 脚本开发专家。你需要根据用户的自然语言描述生成符合 ScriptAPI 规范的脚本代码。

## 脚本环境说明
- 脚本在沙箱（Sandbox）中执行，安全受限
- 全局可访问 \`api\` 对象（ScriptAPI 实例）和 \`context\` 对象
- 禁止使用 \`window\`、\`document\`、\`eval\`、\`fetch\`（请用 api.fetch）
- 禁止使用 \`setTimeout\`/\`setInterval\` 全局函数（请用 api.setTimeout/api.setInterval）

${SCRIPT_API_DOCS}

${triggerSection}

## 代码规范
1. 使用 \`api\` 前缀调用所有 ScriptAPI 方法
2. 异步操作使用 \`await\`
3. 变量声明使用 \`const\` 或 \`let\`，不使用 \`var\`
4. 添加注释说明关键逻辑
5. 不要定义函数（沙箱脚本直接执行）
6. 不要使用 \`export\` 或 \`import\`

## 输出要求
**只输出代码，不要输出解释性文字。** 代码用 \`\`\`javascript 包裹。`;
  }

  private _buildMessages(userInput: string, trigger: TriggerMatchResult): ChatMessage[] {
    return [
      { role: 'system', content: this._buildSystemPrompt(trigger) },
      { role: 'user', content: `请为以下需求生成 ScriptAPI 脚本代码：\n\n"${userInput}"` },
    ];
  }

  private _getTriggerTemplate(trigger: TriggerMatchResult): string {
    const tpl = TRIGGER_TEMPLATES[trigger.type] || TRIGGER_TEMPLATES.manual;
    return tpl
      .replace('{tagId}', trigger.tagId || 'YOUR_TAG_ID')
      .replace('{condition}', trigger.condition || '>')
      .replace('{threshold}', String(trigger.threshold ?? 0))
      .replace('{interval}', String(trigger.interval ?? 1000))
      .replace('{graphicId}', trigger.graphicId || 'YOUR_GRAPHIC_ID')
      .replace('{eventType}', trigger.eventType || 'click');
  }
}

/** 单例 */
export const scriptGeneratorAgent = new ScriptGeneratorAgent();
