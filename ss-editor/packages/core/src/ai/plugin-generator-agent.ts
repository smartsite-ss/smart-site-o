// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Plugin Generator Agent — P1-T05 智能插件开发助手
 *
 * 统一 AI 助手面板的 `plugin-dev` 任务类型后端逻辑：
 *   1. 解析用户的自然语言插件需求
 *   2. 推断插件属性 Schema（字段名/类型/默认值/选项）
 *   3. 调用 PluginCodeGenerator 生成 TS 骨架
 *   4. 构造 LLM System Prompt（含骨架 + 业务逻辑要求）
 *   5. LLM 补齐绘制逻辑（DrawPipeline 工业原语）
 *   6. 返回完整文件树供前端预览/写入
 *
 * 关联决策：D-005 混合模式、D-016 Session 委托
 *
 * 用法:
 *   const agent = new PluginGeneratorAgent();
 *   const result = await agent.analyze('创建一个带开关和状态灯的阀门插件');
 *   // result.schema → 推断的属性定义
 *   // result.skeleton → 插件骨架代码（PluginCodeGenerator 输出）
 *   // result.systemPrompt → 发给 LLM 的完整 System Prompt
 */

import { ChatMessage } from './ai-client';

// ============================================================
// 类型定义
// ============================================================

export type PluginRenderBackend = 'vue' | 'canvas2d' | 'svg-dom' | 'css-dom' | 'three3d';

export interface PluginPropertyField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'range';
  label: string;
  defaultValue?: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  group?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export interface PluginSchema {
  fields: PluginPropertyField[];
}

export interface PluginGenInput {
  /** 插件类型标识（kebab-case，如 'my-valve'） */
  type: string;
  /** 显示名称 */
  label: string;
  /** 分类（industrial/chart/form/custom） */
  category: string;
  /** 渲染后端 */
  renderBackend: PluginRenderBackend;
  /** 属性定义 */
  schema: PluginSchema;
}

export interface PluginGenResult {
  /** 推断的插件配置 */
  config: PluginGenInput;
  /** 完整的 System Prompt（含插件骨架 + 业务逻辑指引） */
  systemPrompt: string;
  /** 用于发送给 LLM 的消息列表 */
  messages: ChatMessage[];
}

// ============================================================
// 常量：插件分类关键词映射
// ============================================================

const CATEGORY_KEYWORDS: Record<string, string> = {
  阀门: 'industrial',
  泵: 'industrial',
  电机: 'industrial',
  传感器: 'industrial',
  仪表: 'industrial',
  开关: 'industrial',
  指示灯: 'industrial',
  管道: 'industrial',
  液位: 'industrial',
  温度: 'industrial',
  压力: 'industrial',
  流量: 'industrial',
  图表: 'chart',
  趋势: 'chart',
  报表: 'chart',
  表单: 'form',
  输入框: 'form',
  按钮: 'form',
};

// ============================================================
// 常量：5 种渲染后端的绘制指引
// ============================================================

const RENDER_BACKEND_GUIDE: Record<PluginRenderBackend, string> = {
  canvas2d: `### Canvas 2D 渲染（DrawPipeline 工业原语）
\`\`\`typescript
import { DrawContext } from '@scada-editor/plugin-sdk';

render(dc: DrawContext): void {
  // DrawPipeline 提供的 20+ 工业原语：
  // dc.rect(x, y, w, h, style)     — 矩形（面板/边框/背板）
  // dc.circle(x, y, r, style)       — 圆形（指示灯/按钮）
  // dc.line(x1, y1, x2, y2, style)  — 线段（连线/刻度线）
  // dc.arc(x, y, r, startAngle, endAngle) — 弧线（表盘/量程弧）
  // dc.text(x, y, text, style)      — 文本（标签/数值显示）
  // dc.path(points, style)          — 路径（自定义形状）
  // dc.roundedRect(x, y, w, h, r, style) — 圆角矩形
  // dc.polygon(points, style)       — 多边形
  // dc.image(img, x, y, w, h)       — 图像
  // dc.gauge(x, y, r, value, min, max) — 仪表盘
  // dc.pipe(x, y, w, h, direction)  — 管道（水平/垂直/弯头）
  // dc.fillGradient(...)            — 渐变填充
  // dc.setShadow(...)               — 阴影
  // dc.beginGroup() / dc.endGroup() — 分组变换
  // dc.save() / dc.restore()        — 状态栈
  //
  // 样式对象 Style：
  // { fill?, stroke?, strokeWidth?, lineDash?, opacity?, shadow? }
  //
  // 访问属性：this.getProps()
  // 获取尺寸：this.getSize().width / this.getSize().height
}
\`\`\``,

  vue: `### Vue 组件渲染
\`\`\`typescript
// 返回 Vue 组件选项对象（不使用 .vue 文件）
getComponent() {
  return {
    template: \`<div :style="containerStyle">
      <!-- 模板中可直接使用 props 中的属性 -->
      <span>{{ props.label }}</span>
      <div :class="{ active: props.isOn }"></div>
    </div>\`,
    props: Object.keys(defaults),
    computed: {
      containerStyle() {
        const p = (this as any).props;
        return { width: '100%', height: '100%', background: p.bgColor };
      },
    },
  };
}
\`\`\``,

  'svg-dom': `### SVG DOM 渲染
\`\`\`typescript
getSvgTemplate(props: Props): string {
  // 返回完整 SVG 字符串，\${} 内可访问 props
  return \`<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 \${this.getSize().width} \${this.getSize().height}">
    <rect x="0" y="0" width="\${this.getSize().width}"
      height="\${this.getSize().height}" fill="\${props.bgColor}" />
    <text x="50%" y="50%" text-anchor="middle"
      fill="\${props.textColor}">\${props.label}</text>
  </svg>\`;
}
\`\`\``,

  'css-dom': `### CSS DOM 渲染
\`\`\`typescript
getHtmlTemplate(props: Props): string {
  return \`<div style="width:100%;height:100%;background:\${props.bgColor};">
    <span style="color:\${props.textColor};">\${props.label}</span>
  </div>\`;
}
\`\`\``,

  three3d: `### Three.js 3D 渲染
\`\`\`typescript
async loadScene(THREE: any, scene: any, camera: any): Promise<void> {
  // 创建 3D 几何体
  const geometry = new THREE.BoxGeometry(
    this.getSize().width, this.getSize().height, 50
  );
  const material = new THREE.MeshPhongMaterial({
    color: this.getProps().color || 0x00ff00,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}
\`\`\``,
};

// ============================================================
// PluginGeneratorAgent
// ============================================================

export class PluginGeneratorAgent {
  /**
   * 分析用户输入，推断插件 Schema 并生成 LLM Prompt
   *
   * 注意：PluginCodeGenerator 骨架生成在 LLM 推断 Schema 之后调用，
   * 但完整文件需 LLM 补齐绘制逻辑。这里生成包含骨架注入指引的 System Prompt。
   */
  analyze(userInput: string): PluginGenResult {
    const config = this._inferPluginConfig(userInput);

    return {
      config,
      systemPrompt: this._buildSystemPrompt(config),
      messages: this._buildMessages(userInput, config),
    };
  }

  /**
   * 构建包含完整 API 知识的 System Prompt
   */
  buildSystemPrompt(config: PluginGenInput): string {
    return this._buildSystemPrompt(config);
  }

  // ─── 私有方法 ───

  private _inferPluginConfig(userInput: string): PluginGenInput {
    const nameMatch = userInput.match(/(?:创建|生成|做一个?)\s*(?:一个?\s*)?(.+?)(?:插件|图元|组件|$)/);
    const label = nameMatch?.[1]?.trim() || 'CustomGraphic';
    const type = label
      .replace(/[^\w\u4e00-\u9fff]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'custom-graphic';

    const category = this._inferCategory(userInput);
    const renderBackend = this._inferRenderBackend(userInput);
    const schema = this._inferSchema(userInput);

    return { type, label, category, renderBackend, schema };
  }

  private _inferCategory(input: string): string {
    for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (input.includes(kw)) return cat;
    }
    return 'custom';
  }

  private _inferRenderBackend(input: string): PluginRenderBackend {
    if (input.includes('3D') || input.includes('三维') || input.includes('three')) return 'three3d';
    if (input.includes('Vue') || input.includes('组件')) return 'vue';
    if (input.includes('SVG')) return 'svg-dom';
    if (input.includes('CSS') || input.includes('HTML') || input.includes('DOM')) return 'css-dom';
    return 'canvas2d'; // 默认：Canvas 2D（工业场景最常用）
  }

  private _inferSchema(input: string): PluginSchema {
    const fields: PluginPropertyField[] = [];

    // 开关 → boolean
    if (/开关|启用|显示.*状态|运行.*状态/.test(input)) {
      fields.push({
        name: 'isOn', type: 'boolean', label: '开关状态', defaultValue: false, group: '状态',
      });
    }

    // 状态灯 / 颜色指示
    if (/状态灯|指示灯|颜色/.test(input)) {
      fields.push({
        name: 'statusColor', type: 'color', label: '状态颜色', defaultValue: '#00ff00', group: '外观',
      });
      fields.push({
        name: 'status', type: 'select', label: '状态', defaultValue: 'normal', group: '状态',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'warning', label: '警告' },
          { value: 'alarm', label: '告警' },
          { value: 'offline', label: '离线' },
        ],
      });
    }

    // 文本标签
    if (/标签|名称|文字|标题/.test(input)) {
      fields.push({
        name: 'label', type: 'text', label: '标签文字', defaultValue: 'Label', group: '文本',
      });
      fields.push({
        name: 'fontSize', type: 'number', label: '字体大小', defaultValue: 14, min: 8, max: 72, group: '文本',
      });
      fields.push({
        name: 'textColor', type: 'color', label: '文字颜色', defaultValue: '#ffffff', group: '文本',
      });
    }

    // 数值显示
    if (/数值|值|量程|范围|温度|压力|流量|液位/.test(input)) {
      fields.push({
        name: 'minValue', type: 'number', label: '最小值', defaultValue: 0, group: '量程',
      });
      fields.push({
        name: 'maxValue', type: 'number', label: '最大值', defaultValue: 100, group: '量程',
      });
      fields.push({
        name: 'unit', type: 'text', label: '单位', defaultValue: '', group: '量程',
      });
    }

    // 管道/阀体/阀门/泵体颜色
    if (/管道|阀体|阀门|泵体|背景/.test(input)) {
      fields.push({
        name: 'bodyColor', type: 'color', label: '主体颜色', defaultValue: '#3388ff', group: '外观',
      });
    }

    // 默认属性（所有插件都应有的通用属性）
    if (fields.length === 0) {
      fields.push(
        { name: 'label', type: 'text', label: '标签', defaultValue: 'Label', group: '文本' },
        { name: 'textColor', type: 'color', label: '文字颜色', defaultValue: '#ffffff', group: '外观' },
        { name: 'bgColor', type: 'color', label: '背景颜色', defaultValue: '#3388ff', group: '外观' },
      );
    }

    return { fields };
  }

  private _buildSystemPrompt(config: PluginGenInput): string {
    const renderGuide = RENDER_BACKEND_GUIDE[config.renderBackend];

    const fieldDocs = config.schema.fields
      .map((f) => {
        const parts = [`  - \`${f.name}\` (${f.type})`];
        if (f.defaultValue !== undefined) parts.push(`默认: ${JSON.stringify(f.defaultValue)}`);
        if (f.options) parts.push(`选项: ${f.options.map((o) => o.value).join(' | ')}`);
        return parts.join(', ');
      })
      .join('\n');

    return `你是一个 Smart-SCADA v7 插件开发专家。用户需要创建一个工业组态图元插件。

## 插件配置
- **类型标识**: \`${config.type}\`
- **显示名称**: ${config.label}
- **分类**: ${config.category}
- **渲染后端**: ${config.renderBackend}

## 属性 Schema
\`\`\`typescript
interface Props {
${fieldDocs}
}
\`\`\`

## 基类信息
- 基类: \`BasePlugin<Props>\`（Canvas 2D）/ \`VueComponentPlugin\` / \`SvgDomPlugin\` / \`CssDomPlugin\` / \`Three3dPlugin\`
- 访问属性: \`this.getProps()\`
- 获取尺寸: \`this.getSize().width\`, \`this.getSize().height\`
- 设置默认属性: \`this.setDefaultProps({ ...defaults })\`

## 绘制指引
${renderGuide}

## 输出要求
请生成完整的插件类代码，包含：
1. import 语句
2. Props 接口定义
3. defaults 默认值对象
4. 插件类（继承对应基类）
5. render/getSvgTemplate/getHtmlTemplate/getComponent/loadScene 方法（根据渲染后端）

**只输出代码，不要输出解释性文字。** 代码需包含 TODO 注释标注业务逻辑需 AI 补齐的部分。`;
  }

  private _buildMessages(userInput: string, config: PluginGenInput): ChatMessage[] {
    return [
      { role: 'system', content: this._buildSystemPrompt(config) },
      {
        role: 'user',
        content: `请为以下需求生成完整的插件代码：\n\n"${userInput}"\n\n插件类型: ${config.type}\n渲染后端: ${config.renderBackend}`,
      },
    ];
  }
}

/** 单例 */
export const pluginGeneratorAgent = new PluginGeneratorAgent();
