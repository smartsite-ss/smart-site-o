// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 脚本引擎 API 规则注册文件
 *
 * === 用途 ===
 * 本文件是脚本引擎所有 API 接口的**唯一数据源**（Single Source of Truth）。
 * 所有脚本编辑器中的 API 补全提示、模板下拉、帮助文档均从此文件读取数据。
 *
 * === 更新指南 ===
 * 1. 新增 API：在 API_REGISTRY 数组中添加一项，Vue 组件自动生效
 * 2. 修改签名/注释：更新对应项的 detail/signature/documentation 字段
 * 3. 移除 API：从数组中删除对应项
 * 4. 调整分类：修改 category 字段
 * 5. 无需修改任何 Vue 组件代码
 *
 * === 与设计文档对齐 ===
 * - 设计文档：docs/02-详细设计/ss-editor/05-脚本引擎/01-脚本引擎.md §2.4
 * - 源码实现：packages/core/src/scada-data/engine/ClientScriptAPI.ts
 * - 类型定义：packages/core/src/scada-data/types/script.types.ts
 */

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

/** API 方法分类 */
export type ApiCategory =
  | 'data'       // 数据读写
  | 'graphic'    // 图元操作
  | 'alarm'      // 告警操作
  | 'page'       // 页面操作
  | 'network'    // 网络请求
  | 'timer'      // 定时器
  | 'utility';   // 工具函数

/** API 分类中文标签 */
export const API_CATEGORY_LABELS: Record<ApiCategory, string> = {
  data: '数据读写',
  graphic: '图元操作',
  alarm: '告警操作',
  page: '页面操作',
  network: '网络请求',
  timer: '定时器',
  utility: '工具函数',
};

/** API 分类图标（emoji，用于 UI 展示） */
export const API_CATEGORY_ICONS: Record<ApiCategory, string> = {
  data: '📊',
  graphic: '🎨',
  alarm: '🔔',
  page: '📄',
  network: '🌐',
  timer: '⏱',
  utility: '🔧',
};

/** 单个 API 方法的完整定义 */
export interface ApiMethodDef {
  /** 方法名 */
  name: string;
  /** 所属分类 */
  category: ApiCategory;
  /** 类型签名（如 "(tagId: string) => any | null"） */
  signature: string;
  /** 中文说明（一句话） */
  summary: string;
  /** 详细说明（支持多行） */
  description: string;
  /** 参数说明 */
  params: ApiParamDef[];
  /** 返回值说明 */
  returns: string;
  /** 可用环境：client | server | sandbox */
  availableIn: string[];
  /** 使用注意（可选） */
  notes?: string;
  /** 基础用法示例代码（可选） */
  example?: string;
  /** Monaco 补全详情 */
  detail: string;
  /** Monaco 补全插入文本（支持 snippet 语法） */
  insertText: string;
  /** Monaco 补全排序权重 */
  sortText: string;
}

/** API 参数定义 */
export interface ApiParamDef {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: string;
  /** 是否必填 */
  required: boolean;
  /** 参数说明 */
  description: string;
  /** 默认值（可选） */
  defaultValue?: string;
}

// ═══════════════════════════════════════════════════════════════
// API 注册表（26 个方法，与设计文档 §2.4 严格对齐）
// ═══════════════════════════════════════════════════════════════

export const API_REGISTRY: ApiMethodDef[] = [
  // ───────────────────────────────────────────────────────────
  // 一、数据读写（3 个）
  // ───────────────────────────────────────────────────────────
  {
    name: 'readTag',
    category: 'data',
    signature: 'readTag(tagId: string) => any | null',
    summary: '读取标签当前值',
    description: '从数据源管理器中读取指定标签的当前值。如果标签不存在或尚未初始化，返回 null。',
    params: [
      { name: 'tagId', type: 'string', required: true, description: '标签唯一标识符' },
    ],
    returns: '标签当前值（any），不存在时返回 null',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '读取的值会包含标签的质量码信息。对于高频数据变化场景，建议结合 debounce 使用。',
    example: 'const temp = readTag("temp_sensor_01");\nif (temp > 100) { /* 处理 */ }',
    detail: '(tagId: string) => any | null',
    insertText: 'readTag(${1:tagId})',
    sortText: 'a',
  },
  {
    name: 'writeTag',
    category: 'data',
    signature: 'writeTag(tagId: string, value: any) => void',
    summary: '写入标签值',
    description: '向指定标签写入新值。写入操作会触发 data:changed 事件，可能连锁触发其他脚本。',
    params: [
      { name: 'tagId', type: 'string', required: true, description: '标签唯一标识符' },
      { name: 'value', type: 'any', required: true, description: '要写入的值' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '写入操作会导致数据变化事件，注意避免循环触发（A写B → B读A → A写B）。',
    example: 'writeTag("pump_status", "running");',
    detail: '(tagId: string, value: any) => void',
    insertText: 'writeTag(${1:tagId}, ${2:value})',
    sortText: 'a',
  },
  {
    name: 'getTagQuality',
    category: 'data',
    signature: 'getTagQuality(tagId: string) => string',
    summary: '获取标签数据质量码',
    description: '获取指定标签的数据质量码，用于判断数据可靠性。常见质量码：good（正常）、bad（异常）、uncertain（不确定）。',
    params: [
      { name: 'tagId', type: 'string', required: true, description: '标签唯一标识符' },
    ],
    returns: '质量码字符串（"good" | "bad" | "uncertain"）',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '在数据驱动的脚本中，建议先检查质量码再使用数据值。',
    example: 'if (getTagQuality("sensor_01") === "good") {\n  const val = readTag("sensor_01");\n  // 安全使用数据\n}',
    detail: '(tagId: string) => string',
    insertText: 'getTagQuality(${1:tagId})',
    sortText: 'a',
  },

  // ───────────────────────────────────────────────────────────
  // 二、图元操作（5 个，仅客户端脚本可用）
  // ───────────────────────────────────────────────────────────
  {
    name: 'setGraphicProps',
    category: 'graphic',
    signature: 'setGraphicProps(graphicId: string, props: Record<string, any>) => void',
    summary: '批量设置图元属性',
    description: '批量设置图元的位置、尺寸、样式、自定义属性等。支持增量合并，不会丢失已有属性。',
    params: [
      { name: 'graphicId', type: 'string', required: true, description: '目标图元 ID' },
      { name: 'props', type: 'Record<string, any>', required: true, description: '属性键值对，如 { x: 100, y: 200, borderColor: "#FF0000" }' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    notes: '属性采用增量合并策略（Object.assign），不会覆盖未指定的属性。如需清空某个属性，将其值设为 null。',
    example: 'setGraphicProps("temp_gauge", {\n  customProps: { value: 85, status: "warning" },\n  borderColor: "#FFA500",\n});',
    detail: '(graphicId: string, props: Record<string, any>) => void',
    insertText: 'setGraphicProps(${1:graphicId}, { ${2:key}: ${3:value} })',
    sortText: 'b',
  },
  {
    name: 'showGraphic',
    category: 'graphic',
    signature: 'showGraphic(graphicId: string) => void',
    summary: '显示图元',
    description: '将指定图元设置为可见状态。等价于 setGraphicProps(id, { visible: true })。',
    params: [
      { name: 'graphicId', type: 'string', required: true, description: '目标图元 ID' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'showGraphic("flow_indicator");',
    detail: '(graphicId: string) => void',
    insertText: 'showGraphic(${1:graphicId})',
    sortText: 'b',
  },
  {
    name: 'hideGraphic',
    category: 'graphic',
    signature: 'hideGraphic(graphicId: string) => void',
    summary: '隐藏图元',
    description: '将指定图元设置为不可见状态。等价于 setGraphicProps(id, { visible: false })。',
    params: [
      { name: 'graphicId', type: 'string', required: true, description: '目标图元 ID' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'hideGraphic("output_alert");',
    detail: '(graphicId: string) => void',
    insertText: 'hideGraphic(${1:graphicId})',
    sortText: 'b',
  },
  {
    name: 'moveGraphic',
    category: 'graphic',
    signature: 'moveGraphic(graphicId: string, x: number, y: number) => void',
    summary: '移动图元到指定坐标',
    description: '将图元移动到画布上的指定坐标位置。坐标原点为画布左上角。',
    params: [
      { name: 'graphicId', type: 'string', required: true, description: '目标图元 ID' },
      { name: 'x', type: 'number', required: true, description: '目标 X 坐标（像素）' },
      { name: 'y', type: 'number', required: true, description: '目标 Y 坐标（像素）' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'moveGraphic("pump_icon", 300, 200);',
    detail: '(graphicId: string, x: number, y: number) => void',
    insertText: 'moveGraphic(${1:graphicId}, ${2:x}, ${3:y})',
    sortText: 'b',
  },
  {
    name: 'rotateGraphic',
    category: 'graphic',
    signature: 'rotateGraphic(graphicId: string, angle: number) => void',
    summary: '旋转图元到指定角度',
    description: '将图元旋转到指定角度（度数制）。0° 为原始方向，正值顺时针旋转。',
    params: [
      { name: 'graphicId', type: 'string', required: true, description: '目标图元 ID' },
      { name: 'angle', type: 'number', required: true, description: '旋转角度（度数，0-360）' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'rotateGraphic("fan_blade", readTag("fan_speed") * 36);',
    detail: '(graphicId: string, angle: number) => void',
    insertText: 'rotateGraphic(${1:graphicId}, ${2:angle})',
    sortText: 'b',
  },

  // ───────────────────────────────────────────────────────────
  // 三、告警操作（4 个）
  // ───────────────────────────────────────────────────────────
  {
    name: 'triggerAlarm',
    category: 'alarm',
    signature: 'triggerAlarm(config: { tagId: string; level: string; message: string }) => void',
    summary: '触发告警',
    description: '触发一个告警事件。告警会在告警列表中显示，并可通过事件总线通知其他系统。',
    params: [
      { name: 'config.tagId', type: 'string', required: true, description: '关联的标签 ID' },
      { name: 'config.level', type: 'string', required: true, description: '告警级别：info / warning / critical / emergency' },
      { name: 'config.message', type: 'string', required: true, description: '告警描述信息' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '告警级别从上到下递增：info < warning < critical < emergency。同一标签的重复告警会被去重。',
    example: 'triggerAlarm({\n  tagId: "temp_sensor_01",\n  level: "critical",\n  message: `温度超标: ${temp}°C`,\n});',
    detail: '(config: {tagId, level, message}) => void',
    insertText: 'triggerAlarm({ tagId: ${1:tagId}, level: "${2|info,warning,critical,emergency|}", message: "${3:message}" })',
    sortText: 'c',
  },
  {
    name: 'acknowledgeAlarm',
    category: 'alarm',
    signature: 'acknowledgeAlarm(alarmId: string) => void',
    summary: '确认告警',
    description: '确认（签收）指定的告警。确认后告警状态变为已确认，不再闪烁。',
    params: [
      { name: 'alarmId', type: 'string', required: true, description: '告警唯一标识符' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'acknowledgeAlarm("alarm_001");',
    detail: '(alarmId: string) => void',
    insertText: 'acknowledgeAlarm(${1:alarmId})',
    sortText: 'c',
  },
  {
    name: 'clearAlarm',
    category: 'alarm',
    signature: 'clearAlarm(alarmId: string) => void',
    summary: '清除告警',
    description: '清除指定的告警，将其从活跃告警列表中移除。',
    params: [
      { name: 'alarmId', type: 'string', required: true, description: '告警唯一标识符' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'clearAlarm("alarm_001");',
    detail: '(alarmId: string) => void',
    insertText: 'clearAlarm(${1:alarmId})',
    sortText: 'c',
  },
  {
    name: 'getActiveAlarms',
    category: 'alarm',
    signature: 'getActiveAlarms() => any[]',
    summary: '获取当前活跃告警列表',
    description: '返回当前所有未清除的活跃告警列表。常用于生成告警汇总报表。',
    params: [],
    returns: '活跃告警数组，每个元素包含 { id, tagId, level, message, timestamp }',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'const alarms = getActiveAlarms();\nconst criticalCount = alarms.filter(a => a.level === "critical").length;',
    detail: '() => any[]',
    insertText: 'getActiveAlarms()',
    sortText: 'c',
  },

  // ───────────────────────────────────────────────────────────
  // 四、页面操作（2 个，仅客户端脚本可用）
  // ───────────────────────────────────────────────────────────
  {
    name: 'switchPage',
    category: 'page',
    signature: 'switchPage(pageId: string) => void',
    summary: '切换到指定页面',
    description: '导航到指定的 SCADA 页面。常用于告警联动时自动跳转到相关页面。',
    params: [
      { name: 'pageId', type: 'string', required: true, description: '目标页面 ID' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    notes: '页面切换是异步操作，切换后当前脚本的后续代码可能不会执行。',
    example: 'switchPage("page_alarm_detail");',
    detail: '(pageId: string) => void',
    insertText: 'switchPage(${1:pageId})',
    sortText: 'd',
  },
  {
    name: 'getCurrentPageId',
    category: 'page',
    signature: 'getCurrentPageId() => string',
    summary: '获取当前页面 ID',
    description: '返回当前显示的页面 ID。可用于条件判断，针对不同页面执行不同逻辑。',
    params: [],
    returns: '当前页面 ID 字符串',
    availableIn: ['client'],
    example: 'const pageId = getCurrentPageId();\nif (pageId === "page_main") { /* 主页面逻辑 */ }',
    detail: '() => string',
    insertText: 'getCurrentPageId()',
    sortText: 'd',
  },

  // ───────────────────────────────────────────────────────────
  // 五、网络请求（1 个）
  // ───────────────────────────────────────────────────────────
  {
    name: 'fetch',
    category: 'network',
    signature: 'fetch(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<any>',
    summary: 'HTTP 请求',
    description: '发起 HTTP 请求，支持 GET/POST/PUT/DELETE 等方法。自动解析 JSON 响应。',
    params: [
      { name: 'url', type: 'string', required: true, description: '请求 URL' },
      { name: 'options.method', type: 'string', required: false, description: 'HTTP 方法（GET/POST/PUT/DELETE），默认 GET', defaultValue: '"GET"' },
      { name: 'options.headers', type: 'Record<string, string>', required: false, description: '自定义请求头' },
      { name: 'options.body', type: 'string', required: false, description: '请求体（POST/PUT 时使用）' },
    ],
    returns: 'Promise<any> — 自动解析 JSON 或返回文本',
    availableIn: ['client', 'server'],
    notes: '客户端脚本中 fetch 通过沙箱代理执行，避免跨域问题。服务端脚本中可用完整 fetch API。',
    example: 'const data = await fetch("/api/v1/control/pump", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ command: "start" }),\n});',
    detail: '(url: string, options?: {method, headers, body}) => Promise<any>',
    insertText: 'await fetch(${1:url}${2:, { method: \'${3:GET}\' }})',
    sortText: 'e',
  },

  // ───────────────────────────────────────────────────────────
  // 六、定时器（4 个，容器内管理，页面卸载自动清理）
  // ───────────────────────────────────────────────────────────
  {
    name: 'setTimeout',
    category: 'timer',
    signature: 'setTimeout(callback: () => void, delay: number) => number',
    summary: '延迟执行回调',
    description: '在指定延迟（毫秒）后执行回调函数。返回定时器 ID，可用于 clearTimeout。页面卸载时自动清理。',
    params: [
      { name: 'callback', type: '() => void', required: true, description: '延迟执行的函数' },
      { name: 'delay', type: 'number', required: true, description: '延迟时间（毫秒）' },
    ],
    returns: '定时器 ID（number）',
    availableIn: ['client'],
    notes: '与浏览器原生 setTimeout 不同，此定时器由容器管理，页面卸载时自动清理，无需手动释放。',
    example: 'setTimeout(() => {\n  hideGraphic("popup");\n}, 3000);',
    detail: '(callback: () => void, delay: number) => number',
    insertText: 'setTimeout(() => { ${1} }, ${2:1000})',
    sortText: 'f',
  },
  {
    name: 'setInterval',
    category: 'timer',
    signature: 'setInterval(callback: () => void, interval: number) => number',
    summary: '周期执行回调',
    description: '每隔指定时间间隔（毫秒）重复执行回调函数。返回定时器 ID，可用于 clearInterval。页面卸载时自动清理。',
    params: [
      { name: 'callback', type: '() => void', required: true, description: '周期执行的函数' },
      { name: 'interval', type: 'number', required: true, description: '间隔时间（毫秒）' },
    ],
    returns: '定时器 ID（number）',
    availableIn: ['client'],
    notes: '回调中的异常会被静默吞掉，不会导致脚本终止。如需长期运行，推荐使用 Cron 定时任务替代。',
    example: 'setInterval(() => {\n  const val = readTag("sensor_01");\n  setGraphicProps("display", { text: String(val) });\n}, 5000);',
    detail: '(callback: () => void, interval: number) => number',
    insertText: 'setInterval(() => { ${1} }, ${2:5000})',
    sortText: 'f',
  },
  {
    name: 'clearTimeout',
    category: 'timer',
    signature: 'clearTimeout(id: number) => void',
    summary: '清除 setTimeout',
    description: '取消之前通过 setTimeout 设置的延迟执行。',
    params: [
      { name: 'id', type: 'number', required: true, description: 'setTimeout 返回的定时器 ID' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'const timerId = setTimeout(() => { /* ... */ }, 5000);\nclearTimeout(timerId);',
    detail: '(id: number) => void',
    insertText: 'clearTimeout(${1:timerId})',
    sortText: 'f',
  },
  {
    name: 'clearInterval',
    category: 'timer',
    signature: 'clearInterval(id: number) => void',
    summary: '清除 setInterval',
    description: '取消之前通过 setInterval 设置的周期执行。',
    params: [
      { name: 'id', type: 'number', required: true, description: 'setInterval 返回的定时器 ID' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    example: 'const intervalId = setInterval(() => { /* ... */ }, 5000);\nclearInterval(intervalId);',
    detail: '(id: number) => void',
    insertText: 'clearInterval(${1:timerId})',
    sortText: 'f',
  },

  // ───────────────────────────────────────────────────────────
  // 七、工具函数（7 个）
  // ───────────────────────────────────────────────────────────
  {
    name: 'sleep',
    category: 'utility',
    signature: 'sleep(ms: number) => Promise<void>',
    summary: '异步休眠',
    description: '暂停脚本执行指定的毫秒数。仅在 async 函数中使用。',
    params: [
      { name: 'ms', type: 'number', required: true, description: '休眠时间（毫秒）' },
    ],
    returns: 'Promise<void>',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '必须在 async 函数中使用 await。大量使用 sleep 会影响脚本性能，建议用定时器替代。',
    example: 'await sleep(1000);\nlog("info", "1秒后执行");',
    detail: '(ms: number) => Promise<void>',
    insertText: 'await sleep(${1:1000})',
    sortText: 'g',
  },
  {
    name: 'notify',
    category: 'utility',
    signature: 'notify(message: string, level?: "info" | "warn" | "error") => void',
    summary: '弹出通知消息',
    description: '在界面上弹出通知消息。支持三种级别：info（信息）、warn（警告）、error（错误）。',
    params: [
      { name: 'message', type: 'string', required: true, description: '通知内容' },
      { name: 'level', type: '"info" | "warn" | "error"', required: false, description: '通知级别，默认 info', defaultValue: '"info"' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client'],
    notes: '通知消息会同时记录到日志中。建议仅在关键节点使用，避免频繁通知干扰操作。',
    example: 'notify("设备已启动", "info");\nnotify("温度偏高", "warn");\nnotify("设备断线", "error");',
    detail: '(message: string, level?: "info"|"warn"|"error") => void',
    insertText: 'notify(${1:message}, ${2:"info"})',
    sortText: 'g',
  },
  {
    name: 'log',
    category: 'utility',
    signature: 'log(level: "info" | "warn" | "error", message: string) => void',
    summary: '记录日志',
    description: '向脚本执行日志中写入一条记录。日志可在调试面板中查看。',
    params: [
      { name: 'level', type: '"info" | "warn" | "error"', required: true, description: '日志级别' },
      { name: 'message', type: 'string', required: true, description: '日志内容' },
    ],
    returns: '无返回值（void）',
    availableIn: ['client', 'server', 'sandbox'],
    notes: '日志是脚本调试的重要手段。建议在关键分支、数据读写前后、异常处理处记录日志。',
    example: 'log("info", `温度读数: ${temp}°C`);\nlog("warn", "数据质量异常");\nlog("error", `执行失败: ${err.message}`);',
    detail: '(level: "info"|"warn"|"error", message: string) => void',
    insertText: 'log("${1|info,warn,error|}", ${2:message})',
    sortText: 'g',
  },
  {
    name: 'round',
    category: 'utility',
    signature: 'round(value: number, decimals?: number) => number',
    summary: '数值四舍五入',
    description: '将数值四舍五入到指定小数位数。',
    params: [
      { name: 'value', type: 'number', required: true, description: '要舍入的数值' },
      { name: 'decimals', type: 'number', required: false, description: '保留小数位数，默认 0', defaultValue: '0' },
    ],
    returns: '四舍五入后的数值',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'round(3.14159, 2); // 返回 3.14\nround(3.14159);    // 返回 3',
    detail: '(value: number, decimals?: number) => number',
    insertText: 'round(${1:value}, ${2:2})',
    sortText: 'g',
  },
  {
    name: 'clamp',
    category: 'utility',
    signature: 'clamp(value: number, min: number, max: number) => number',
    summary: '值域约束',
    description: '将数值限制在 [min, max] 区间内。如果 value < min 返回 min，如果 value > max 返回 max。',
    params: [
      { name: 'value', type: 'number', required: true, description: '输入值' },
      { name: 'min', type: 'number', required: true, description: '最小值' },
      { name: 'max', type: 'number', required: true, description: '最大值' },
    ],
    returns: '约束后的值（min ≤ 返回值 ≤ max）',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'clamp(150, 0, 100);   // 返回 100\nclamp(-10, 0, 100);  // 返回 0\nclamp(50, 0, 100);   // 返回 50',
    detail: '(value: number, min: number, max: number) => number',
    insertText: 'clamp(${1:value}, ${2:min}, ${3:max})',
    sortText: 'g',
  },
  {
    name: 'mapRange',
    category: 'utility',
    signature: 'mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number) => number',
    summary: '线性映射',
    description: '将数值从一个区间线性映射到另一个区间。常用于传感器数据到显示范围的转换。',
    params: [
      { name: 'v', type: 'number', required: true, description: '输入值' },
      { name: 'inMin', type: 'number', required: true, description: '输入区间最小值' },
      { name: 'inMax', type: 'number', required: true, description: '输入区间最大值' },
      { name: 'outMin', type: 'number', required: true, description: '输出区间最小值' },
      { name: 'outMax', type: 'number', required: true, description: '输出区间最大值' },
    ],
    returns: '映射后的值',
    availableIn: ['client', 'server', 'sandbox'],
    example: '// 将 0-3000 的转速映射为 0-100 的百分比\nconst pct = mapRange(1500, 0, 3000, 0, 100); // 返回 50',
    detail: '(v: number, inMin: number, inMax: number, outMin: number, outMax: number) => number',
    insertText: 'mapRange(${1:v}, ${2:inMin}, ${3:inMax}, ${4:outMin}, ${5:outMax})',
    sortText: 'g',
  },
  {
    name: 'colorForValue',
    category: 'utility',
    signature: 'colorForValue(v: number, min?: number, max?: number) => string',
    summary: '值→颜色映射',
    description: '根据数值在 [min, max] 区间的位置，返回红-黄-绿渐变的十六进制颜色。低值偏绿，高值偏红。',
    params: [
      { name: 'v', type: 'number', required: true, description: '输入值' },
      { name: 'min', type: 'number', required: false, description: '区间最小值，默认 0', defaultValue: '0' },
      { name: 'max', type: 'number', required: false, description: '区间最大值，默认 100', defaultValue: '100' },
    ],
    returns: '十六进制颜色字符串（如 "#00FF00"）',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'const color = colorForValue(85, 0, 100); // 返回 "#d4ff00"（偏黄绿色的热力色）',
    detail: '(v: number, min?: number, max?: number) => string',
    insertText: 'colorForValue(${1:v}, ${2:0}, ${3:100})',
    sortText: 'g',
  },
  {
    name: 'isAlarm',
    category: 'utility',
    signature: 'isAlarm(v: number, high: number, low?: number) => boolean',
    summary: '告警判断',
    description: '判断数值是否超出告警范围。当 v >= high（上限）或 v <= low（下限）时返回 true。',
    params: [
      { name: 'v', type: 'number', required: true, description: '待判断的数值' },
      { name: 'high', type: 'number', required: true, description: '告警上限' },
      { name: 'low', type: 'number', required: false, description: '告警下限，默认 0', defaultValue: '0' },
    ],
    returns: '是否超出告警范围（boolean）',
    availableIn: ['client', 'server', 'sandbox'],
    example: 'if (isAlarm(temp, 100, 10)) {\n  triggerAlarm({ tagId: "temp", level: "warning", message: "温度异常" });\n}',
    detail: '(v: number, high: number, low?: number) => boolean',
    insertText: 'isAlarm(${1:v}, ${2:high}, ${3:low})',
    sortText: 'g',
  },
];

// ═══════════════════════════════════════════════════════════════
// 便捷查询函数
// ═══════════════════════════════════════════════════════════════

/** 按分类获取 API 列表 */
export function getApiByCategory(category: ApiCategory): ApiMethodDef[] {
  return API_REGISTRY.filter((api) => api.category === category);
}

/** 按分类分组获取所有 API */
export function getApiGroupedByCategory(): Record<string, ApiMethodDef[]> {
  const groups: Record<string, ApiMethodDef[]> = {};
  for (const api of API_REGISTRY) {
    const label = API_CATEGORY_LABELS[api.category];
    if (!groups[label]) groups[label] = [];
    groups[label].push(api);
  }
  return groups;
}

/** 按运行环境过滤 API */
export function getApiByEnvironment(env: 'client' | 'server' | 'sandbox'): ApiMethodDef[] {
  return API_REGISTRY.filter((api) => api.availableIn.includes(env));
}

/** 按名称查找 API */
export function getApiByName(name: string): ApiMethodDef | undefined {
  return API_REGISTRY.find((api) => api.name === name);
}

/** 获取所有 API 名称列表 */
export function getApiNames(): string[] {
  return API_REGISTRY.map((api) => api.name);
}

/** 获取 API 总数 */
export function getApiCount(): number {
  return API_REGISTRY.length;
}