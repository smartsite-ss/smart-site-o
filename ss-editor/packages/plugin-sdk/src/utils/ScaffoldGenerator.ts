// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PluginCodeGenerator, type GenerateOptions } from './PluginCodeGenerator';
import { RenderBackend } from '../types/RenderBackend';
import type { PluginPropertySchemaField } from '../types/PluginPropertySchema';

export interface ScaffoldConfig {
  type: string;
  label: string;
  category: string;
  renderBackend: RenderBackend;
  fields: PluginPropertySchemaField[];
}

export class ScaffoldGenerator {
  static generate(config: ScaffoldConfig): Record<string, string> {
    const options: GenerateOptions = {
      type: config.type,
      label: config.label,
      category: config.category,
      renderBackend: config.renderBackend,
      schema: { fields: config.fields },
    };

    const files = PluginCodeGenerator.generateAll(options);

    files['README.md'] = this._generateReadme(config);

    if (config.renderBackend === RenderBackend.CSS_DOM) {
      files['style.css'] = this._generateCssTemplate(config.type);
    }

    return files;
  }

  private static _generateReadme(config: ScaffoldConfig): string {
    const backendLabels: Record<string, string> = {
      [RenderBackend.VUE_COMPONENT]: 'Vue Component',
      [RenderBackend.CANVAS_2D]: 'Canvas 2D',
      [RenderBackend.SVG_DOM]: 'SVG DOM',
      [RenderBackend.CSS_DOM]: 'CSS DOM',
      [RenderBackend.THREE_3D]: 'Three.js 3D',
    };
    const backend = backendLabels[config.renderBackend] || config.renderBackend;

    return `# ${config.label}

- **Type**: \`${config.type}\`
- **Category**: ${config.category}
- **Render Backend**: ${backend}

## Properties

${config.fields.map((f) => `- \`${f.name}\`: ${f.type}${f.defaultValue !== undefined ? ` (Default: ${f.defaultValue})` : ''}`).join('\n')}

## Development

\`\`\`bash
pnpm dev:plugin
\`\`\`
`;
  }

  private static _generateCssTemplate(_type: string): string {
    return `/* ${_type} Plugin Style */\n.ss-plugin-${_type} {\n  width: 100%;\n  height: 100%;\n}\n`;
  }

  static getBackendChoices(): Array<{ value: RenderBackend; label: string; description: string }> {
    return [
      { value: RenderBackend.VUE_COMPONENT, label: 'Vue Component', description: 'Uses Vue template components for rendering' },
      { value: RenderBackend.CANVAS_2D, label: 'Canvas 2D', description: 'Uses Canvas 2D API for rendering' },
      { value: RenderBackend.SVG_DOM, label: 'SVG DOM', description: 'Uses SVG DOM for rendering' },
      { value: RenderBackend.CSS_DOM, label: 'CSS DOM', description: 'Uses CSS DOM for rendering' },
      { value: RenderBackend.THREE_3D, label: 'Three.js 3D', description: 'Uses Three.js for 3D rendering' },
    ];
  }
}