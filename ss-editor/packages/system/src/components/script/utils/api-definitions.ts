// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本引擎 API 静态定义
 *
 * 所有 API 方法元数据（名称、签名、说明、分类、代码模板）的统一静态文件。
 * completionData.ts 和 useScriptTemplates.ts 均从此文件读取，
 * 后续接口修改只需更新此文件即可。
 *
 * 更新指南：
 * 1. 新增 API：在 API_DEFINITIONS 数组中添加一项
 * 2. 修改签名：更新对应项的 detail/insertText/signature 字段
 * 3. 移除 API：从数组中删除对应项
 * 4. 调整分类：修改 category 字段
 */

export interface ApiMethodDefinition {
  /** 方法名（带前缀） */
  label: string;
  /** 补全种类 */
  kind: 'function',
  /** 签名显示 */
  detail: string;
  /** 中文说明 */
  documentation: string;
  /** 补全插入文本（支持 Monaco snippet 语法，如 ${1:param}） */
  insertText: string;
  /** 排序权重 */
  sortText: string;
  /** API 分类 */
  category: ApiCategory;
  /** 完整签名（用于模板下拉显示） */
  signature: string;
}

export type ApiCategory =
  | 'data'       // 数据读写
  | 'graphic'    // 图元操作
  | 'alarm'      // 告警操作
  | 'page'       // 页面操作
  | 'network'    // 网络请求
  | 'timer'      // 定时器
  | 'utility';   // 工具函数

export const API_CATEGORY_LABELS: Record<ApiCategory, string> = {
  data: '数据读写',
  graphic: '图元操作',
  alarm: '告警操作',
  page: '页面操作',
  network: '网络请求',
  timer: '定时器',
  utility: '工具函数',
};

/** 所有 API 方法定义（26 个） */
export const API_DEFINITIONS: ApiMethodDefinition[] = [
  // ─── 数据读写 ───
  {
    label: 'api.readTag',
    kind: 'function',
    detail: '(tagId: string) => any | null',
    documentation: '读取标签当前值',
    insertText: 'readTag(${1:tagId})',
    sortText: 'a',
    category: 'data',
    signature: 'readTag(tagId)',
  },
  {
    label: 'api.writeTag',
    kind: 'function',
    detail: '(tagId: string, value: any) => void',
    documentation: '写入标签值',
    insertText: 'writeTag(${1:tagId}, ${2:value})',
    sortText: 'a',
    category: 'data',
    signature: 'writeTag(tagId, value)',
  },
  {
    label: 'api.getTagQuality',
    kind: 'function',
    detail: '(tagId: string) => string',
    documentation: '获取标签数据质量码',
    insertText: 'getTagQuality(${1:tagId})',
    sortText: 'a',
    category: 'data',
    signature: 'getTagQuality(tagId)',
  },

  // ─── 图元操作 ───
  {
    label: 'api.setGraphicProps',
    kind: 'function',
    detail: '(graphicId: string, props: Record<string, any>) => void',
    documentation: '批量设置图元属性',
    insertText: 'setGraphicProps(${1:graphicId}, { ${2:key}: ${3:value} })',
    sortText: 'b',
    category: 'graphic',
    signature: 'setGraphicProps(graphicId, props)',
  },
  {
    label: 'api.showGraphic',
    kind: 'function',
    detail: '(graphicId: string) => void',
    documentation: '显示图元',
    insertText: 'showGraphic(${1:graphicId})',
    sortText: 'b',
    category: 'graphic',
    signature: 'showGraphic(graphicId)',
  },
  {
    label: 'api.hideGraphic',
    kind: 'function',
    detail: '(graphicId: string) => void',
    documentation: '隐藏图元',
    insertText: 'hideGraphic(${1:graphicId})',
    sortText: 'b',
    category: 'graphic',
    signature: 'hideGraphic(graphicId)',
  },
  {
    label: 'api.moveGraphic',
    kind: 'function',
    detail: '(graphicId: string, x: number, y: number) => void',
    documentation: '移动图元到指定坐标',
    insertText: 'moveGraphic(${1:graphicId}, ${2:x}, ${3:y})',
    sortText: 'b',
    category: 'graphic',
    signature: 'moveGraphic(graphicId, x, y)',
  },
  {
    label: 'api.rotateGraphic',
    kind: 'function',
    detail: '(graphicId: string, angle: number) => void',
    documentation: '旋转图元到指定角度',
    insertText: 'rotateGraphic(${1:graphicId}, ${2:angle})',
    sortText: 'b',
    category: 'graphic',
    signature: 'rotateGraphic(graphicId, angle)',
  },

  // ─── 告警操作 ───
  {
    label: 'api.triggerAlarm',
    kind: 'function',
    detail: '(config: {tagId, level, message}) => void',
    documentation: '触发告警',
    insertText: 'triggerAlarm({ tagId: ${1:tagId}, level: "${2|info,warning,critical,emergency|}", message: "${3:message}" })',
    sortText: 'c',
    category: 'alarm',
    signature: 'triggerAlarm({tagId, level, message})',
  },
  {
    label: 'api.acknowledgeAlarm',
    kind: 'function',
    detail: '(alarmId: string) => void',
    documentation: '确认告警',
    insertText: 'acknowledgeAlarm(${1:alarmId})',
    sortText: 'c',
    category: 'alarm',
    signature: 'acknowledgeAlarm(alarmId)',
  },
  {
    label: 'api.clearAlarm',
    kind: 'function',
    detail: '(alarmId: string) => void',
    documentation: '清除告警',
    insertText: 'clearAlarm(${1:alarmId})',
    sortText: 'c',
    category: 'alarm',
    signature: 'clearAlarm(alarmId)',
  },
  {
    label: 'api.getActiveAlarms',
    kind: 'function',
    detail: '() => any[]',
    documentation: '获取当前活跃告警列表',
    insertText: 'getActiveAlarms()',
    sortText: 'c',
    category: 'alarm',
    signature: 'getActiveAlarms()',
  },

  // ─── 页面操作 ───
  {
    label: 'api.switchPage',
    kind: 'function',
    detail: '(pageId: string) => void',
    documentation: '切换到指定页面',
    insertText: 'switchPage(${1:pageId})',
    sortText: 'd',
    category: 'page',
    signature: 'switchPage(pageId)',
  },
  {
    label: 'api.getCurrentPageId',
    kind: 'function',
    detail: '() => string',
    documentation: '获取当前页面 ID',
    insertText: 'getCurrentPageId()',
    sortText: 'd',
    category: 'page',
    signature: 'getCurrentPageId()',
  },

  // ─── 网络请求 ───
  {
    label: 'api.fetch',
    kind: 'function',
    detail: '(url: string, options?: {method, headers, body}) => Promise<any>',
    documentation: 'HTTP 请求（GET/POST，自动解析 JSON）',
    insertText: 'await fetch(${1:url}${2:, { method: \'${3:GET}\' }})',
    sortText: 'e',
    category: 'network',
    signature: 'fetch(url, options?)',
  },

  // ─── 定时器 ───
  {
    label: 'api.setTimeout',
    kind: 'function',
    detail: '(callback: () => void, delay: number) => number',
    documentation: '延迟执行回调（ms），页面卸载时自动清理',
    insertText: 'setTimeout(() => { ${1} }, ${2:1000})',
    sortText: 'f',
    category: 'timer',
    signature: 'setTimeout(callback, delay)',
  },
  {
    label: 'api.setInterval',
    kind: 'function',
    detail: '(callback: () => void, interval: number) => number',
    documentation: '周期执行回调（ms），页面卸载时自动清理',
    insertText: 'setInterval(() => { ${1} }, ${2:5000})',
    sortText: 'f',
    category: 'timer',
    signature: 'setInterval(callback, interval)',
  },
  {
    label: 'api.clearTimeout',
    kind: 'function',
    detail: '(id: number) => void',
    documentation: '清除 setTimeout',
    insertText: 'clearTimeout(${1:timerId})',
    sortText: 'f',
    category: 'timer',
    signature: 'clearTimeout(id)',
  },
  {
    label: 'api.clearInterval',
    kind: 'function',
    detail: '(id: number) => void',
    documentation: '清除 setInterval',
    insertText: 'clearInterval(${1:timerId})',
    sortText: 'f',
    category: 'timer',
    signature: 'clearInterval(id)',
  },

  // ─── 工具函数 ───
  {
    label: 'api.sleep',
    kind: 'function',
    detail: '(ms: number) => Promise<void>',
    documentation: '异步休眠（毫秒）',
    insertText: 'await sleep(${1:1000})',
    sortText: 'g',
    category: 'utility',
    signature: 'sleep(ms)',
  },
  {
    label: 'api.notify',
    kind: 'function',
    detail: '(message: string, level?: "info"|"warn"|"error") => void',
    documentation: '弹出通知消息',
    insertText: 'notify(${1:message}, ${2:"info"})',
    sortText: 'g',
    category: 'utility',
    signature: 'notify(message, level?)',
  },
  {
    label: 'api.log',
    kind: 'function',
    detail: '(level: "info"|"warn"|"error", message: string) => void',
    documentation: '记录日志',
    insertText: 'log("${1|info,warn,error|}", ${2:message})',
    sortText: 'g',
    category: 'utility',
    signature: 'log(level, message)',
  },
  {
    label: 'api.round',
    kind: 'function',
    detail: '(value: number, decimals?: number) => number',
    documentation: '数值四舍五入',
    insertText: 'round(${1:value}, ${2:2})',
    sortText: 'g',
    category: 'utility',
    signature: 'round(value, decimals?)',
  },
  {
    label: 'api.clamp',
    kind: 'function',
    detail: '(value: number, min: number, max: number) => number',
    documentation: '值域约束',
    insertText: 'clamp(${1:value}, ${2:min}, ${3:max})',
    sortText: 'g',
    category: 'utility',
    signature: 'clamp(value, min, max)',
  },
  {
    label: 'api.mapRange',
    kind: 'function',
    detail: '(v: number, inMin: number, inMax: number, outMin: number, outMax: number) => number',
    documentation: '线性映射',
    insertText: 'mapRange(${1:v}, ${2:inMin}, ${3:inMax}, ${4:outMin}, ${5:outMax})',
    sortText: 'g',
    category: 'utility',
    signature: 'mapRange(v, inMin, inMax, outMin, outMax)',
  },
  {
    label: 'api.colorForValue',
    kind: 'function',
    detail: '(v: number, min?: number, max?: number) => string',
    documentation: '值→颜色映射（红-黄-绿渐变）',
    insertText: 'colorForValue(${1:v}, ${2:0}, ${3:100})',
    sortText: 'g',
    category: 'utility',
    signature: 'colorForValue(v, min?, max?)',
  },
  {
    label: 'api.isAlarm',
    kind: 'function',
    detail: '(v: number, high: number, low?: number) => boolean',
    documentation: '告警判断（v >= high 或 v <= low）',
    insertText: 'isAlarm(${1:v}, ${2:high}, ${3:low})',
    sortText: 'g',
    category: 'utility',
    signature: 'isAlarm(v, high, low?)',
  },
];

/** 按分类分组获取 API 定义 */
export function getApiDefinitionsByCategory(): Record<string, ApiMethodDefinition[]> {
  const groups: Record<string, ApiMethodDefinition[]> = {};
  for (const def of API_DEFINITIONS) {
    const catLabel = API_CATEGORY_LABELS[def.category];
    if (!groups[catLabel]) groups[catLabel] = [];
    groups[catLabel].push(def);
  }
  return groups;
}