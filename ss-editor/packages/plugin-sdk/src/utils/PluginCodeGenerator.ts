// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { PluginPropertySchema, PluginPropertySchemaField } from '../types/PluginPropertySchema';
import type { RenderBackend } from '../types/RenderBackend';

export interface GenerateOptions {
  type: string;
  label: string;
  category: string;
  renderBackend: RenderBackend;
  schema: PluginPropertySchema;
}

export interface GenerateResult {
  pluginClass: string;
  propertySchema: string;
  indexEntry: string;
  localeZh: string;
  localeEn: string;
}

export class PluginCodeGenerator {
  static generate(options: GenerateOptions): GenerateResult {
    const { type, label, category, renderBackend, schema } = options;
    const className = this._toPascalCase(type) + 'Plugin';
    const propsInterface = this._generatePropsInterface(schema.fields);
    const defaultsMap = this._generateDefaultsMap(schema.fields);
    const constructorArgs = `${renderBackend === 'three3d' ? 'x = 0, y = 0, w = 400, h = 300' : 'x = 0, y = 0, w = 100, h = 100'}`;

    return {
      pluginClass: this._generatePluginClass(type, className, renderBackend, constructorArgs, defaultsMap, propsInterface),
      propertySchema: this._generateSchemaFile(schema.fields),
      indexEntry: this._generateIndexEntry(type, category, label, className),
      localeZh: this._generateLocale(schema.fields, 'zh'),
      localeEn: this._generateLocale(schema.fields, 'en'),
    };
  }

  static generateAll(options: GenerateOptions): Record<string, string> {
    const result = this.generate(options);
    const name = this._toPascalCase(options.type);
    return {
      [`${name}Plugin.ts`]: result.pluginClass,
      [`${options.type}PropertySchema.ts`]: result.propertySchema,
      [`index.ts`]: result.indexEntry,
      [`locales/zh-CN.json`]: result.localeZh,
      [`locales/en-US.json`]: result.localeEn,
    };
  }

  private static _generatePluginClass(
    type: string,
    className: string,
    renderBackend: RenderBackend,
    constructorArgs: string,
    defaultsMap: string,
    propsInterface: string,
  ): string {
    const baseClassMap: Record<string, string> = {
      vue: 'VueComponentPlugin',
      canvas2d: 'BasePlugin',
      'svg-dom': 'SvgDomPlugin',
      'css-dom': 'CssDomPlugin',
      three3d: 'Three3dPlugin',
    };

    const imports = [
      `import { ${baseClassMap[renderBackend]} } from '@scada-editor/plugin-sdk';`,
    ];
    if (renderBackend === 'canvas2d') {
      imports.push(`import { DrawContext } from '@scada-editor/plugin-sdk';`);
    }

    const renderMethod = renderBackend === 'canvas2d'
      ? `\n  render(dc: DrawContext): void {\n    // TODO: 实现 Canvas 2D 绘制逻辑\n  }`
      : '';

    const htmlMethod = renderBackend === 'svg-dom'
      ? `\n  getSvgTemplate(props: ${className}Props): string {\n    return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${this.getSize().width} \${this.getSize().height}"><!-- TODO --></svg>\`;\n  }`
      : '';

    const cssHtmlMethod = renderBackend === 'css-dom'
      ? `\n  getHtmlTemplate(props: ${className}Props): string {\n    return \`<div style="width:100%;height:100%"><!-- TODO --></div>\`;\n  }`
      : '';

    const componentMethod = renderBackend === 'vue'
      ? `\n  getComponent() {\n    return {\n      template: \`<div style="width:100%;height:100%"><!-- TODO --></div>\`,\n      props: Object.keys(defaults),\n    };\n  }`
      : '';

    const loadSceneMethod = renderBackend === 'three3d'
      ? `\n  async loadScene(THREE: any, scene: any, camera: any): Promise<void> {\n    // TODO: 实现 3D 场景加载\n  }`
      : '';

    return `${imports.join('\n')}
\ninterface ${className}Props {\n${propsInterface}}
\nconst defaults: ${className}Props = {\n${defaultsMap}};
\nexport class ${className} extends ${baseClassMap[renderBackend]}<${className}Props> {
  constructor(${constructorArgs}) {
    super('${type}', x, y, w, h);
    this.setDefaultProps({ ...defaults });
  }${renderMethod}${htmlMethod}${cssHtmlMethod}${componentMethod}${loadSceneMethod}
}`;
  }

  private static _generatePropsInterface(fields: PluginPropertySchemaField[]): string {
    const typeMap: Record<string, string> = {
      text: 'string',
      number: 'number',
      boolean: 'boolean',
      select: 'string',
      color: 'string',
      range: 'number',
    };
    return fields.map((f) => `  ${f.name}: ${typeMap[f.type] || 'string'};`).join('\n');
  }

  private static _generateDefaultsMap(fields: PluginPropertySchemaField[]): string {
    return fields.map((f) => {
      const val = typeof f.defaultValue === 'string' ? `'${f.defaultValue}'` : f.defaultValue;
      return `  ${f.name}: ${val},`;
    }).join('\n');
  }

  private static _generateSchemaFile(fields: PluginPropertySchemaField[]): string {
    const fieldDefs = fields.map((f) => {
      const parts: string[] = [
        `    { name: '${f.name}',`,
        `      type: '${f.type}',`,
        `      label: '${f.label}',`,
      ];
      if (f.defaultValue !== undefined) {
        const val = typeof f.defaultValue === 'string' ? `'${f.defaultValue}'` : f.defaultValue;
        parts.push(`      defaultValue: ${val},`);
      }
      if (f.required) parts.push(`      required: true,`);
      if (f.min !== undefined) parts.push(`      min: ${f.min},`);
      if (f.max !== undefined) parts.push(`      max: ${f.max},`);
      if (f.group) parts.push(`      group: '${f.group}',`);
      if (f.options) {
        const opts = f.options.map((o) => `        { value: ${typeof o.value === 'string' ? `'${o.value}'` : o.value}, label: '${o.label}' }`).join(',\n');
        parts.push(`      options: [\n${opts}\n      ],`);
      }
      return parts.join('\n');
    }).join(',\n\n');

    return `import type { PluginPropertySchema } from '@scada-editor/plugin-sdk';

export const schema: PluginPropertySchema = {
  fields: [
${fieldDefs}
  ],
};`;
  }

  private static _generateIndexEntry(type: string, category: string, label: string, className: string): string {
    return `import { createPlugin } from '@scada-editor/plugin-sdk';
import { ${className} } from './${className}';
import { schema } from './${type}PropertySchema';

export { ${className}, schema };

export default createPlugin({
  type: '${type}',
  category: '${category}',
  label: '${label}',
  plugin: ${className},
  schema,
  defaultWidth: 100,
  defaultHeight: 100,
});`;
  }

  private static _generateLocale(fields: PluginPropertySchemaField[], lang: 'zh' | 'en'): string {
    const labels: Record<string, string> = {};
    for (const f of fields) {
      labels[f.label] = lang === 'zh' ? f.label : `[${f.label}]`;
    }
    return JSON.stringify(labels, null, 2);
  }

  private static _toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_m, c) => c.toUpperCase())
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }
}