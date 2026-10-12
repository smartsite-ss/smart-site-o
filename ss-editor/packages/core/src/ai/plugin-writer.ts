// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Plugin File Writer — P1-T05 插件文件输出流水线
 *
 * 职责：
 *   1. 调用 PluginCodeGenerator.generateAll() 生成 TS 骨架
 *   2. 将 LLM 返回的代码块合并到骨架（替换业务逻辑部分）
 *   3. 返回完整的文件树（供 AiAssistantPanel 预览/下载/写入）
 *
 * 合并策略：
 *   - PluginClass 文件：保留骨架的 import/类声明，替换 render 方法体
 *   - PropertySchema 文件：直接用骨架（LLM 不生成 Schema）
 *   - index.ts：直接用骨架
 *   - locales：直接用骨架
 *
 * 用法:
 *   const writer = new PluginFileWriter();
 *   const fileTree = writer.buildFromLLMResponse(config, llmResponse);
 *   // fileTree → { 'PumpPlugin.ts': '...', 'index.ts': '...', ... }
 */

import { PluginCodeGenerator } from '@scada-editor/plugin-sdk';
import { RenderBackend } from '@scada-editor/plugin-sdk';
import { parseCodeBlocks } from './code-parser';
import type { PluginGenInput } from './plugin-generator-agent';

/** 最终输出文件树 */
export type PluginFileTree = Record<string, string>;

/** 生成结果（含文件树和元数据） */
export interface PluginBuildResult {
  /** 文件树 path → content */
  files: PluginFileTree;
  /** 插件类型 */
  type: string;
  /** 骨架文件路径列表 */
  skeletonPaths: string[];
  /** LLM 生成的文件路径列表 */
  llmPaths: string[];
}

/** PluginRenderBackend → RenderBackend 枚举映射 */
const RENDER_BACKEND_MAP: Record<string, RenderBackend> = {
  vue: RenderBackend.VUE_COMPONENT,
  canvas2d: RenderBackend.CANVAS_2D,
  'svg-dom': RenderBackend.SVG_DOM,
  'css-dom': RenderBackend.CSS_DOM,
  three3d: RenderBackend.THREE_3D,
};

/**
 * 将 PluginGenInput 转换为 PluginCodeGenerator 所需的 GenerateOptions
 */
function toCodeGenOptions(config: PluginGenInput) {
  return {
    type: config.type,
    label: config.label,
    category: config.category,
    renderBackend: RENDER_BACKEND_MAP[config.renderBackend] || RenderBackend.CANVAS_2D,
    schema: {
      fields: config.schema.fields.map((f) => ({
        name: f.name,
        type: f.type,
        label: f.label,
        defaultValue: f.defaultValue,
        required: f.required,
        min: f.min,
        max: f.max,
        group: f.group,
        options: f.options,
      })),
    },
  };
}

export class PluginFileWriter {
  /**
   * 从 LLM 响应构建最终文件树
   *
   * @param config 插件配置（由 PluginGeneratorAgent 推断）
   * @param llmResponse LLM 返回的完整 Markdown 响应
   * @returns 合并后的文件树
   */
  buildFromLLMResponse(config: PluginGenInput, llmResponse: string): PluginBuildResult {
    // 1. 生成 TS 骨架
    const options = toCodeGenOptions(config);
    const skeleton = PluginCodeGenerator.generateAll(options);
    const skeletonPaths = Object.keys(skeleton);

    // 2. 解析 LLM 响应中的代码块
    const parsed = parseCodeBlocks(llmResponse);
    const llmPaths: string[] = [];

    // 3. 合并：LLM 代码替换骨架中对应文件
    const merged: PluginFileTree = { ...skeleton };

    for (const file of parsed.files) {
      llmPaths.push(file.path);

      // 尝试匹配骨架文件
      const matchedKey = this._matchSkeletonPath(file.path, skeletonPaths);

      if (matchedKey) {
        // LLM 生成的代码替换骨架
        merged[matchedKey] = file.code;
      } else {
        // 新文件（如 LLM 生成的额外工具函数）
        merged[file.path] = file.code;
      }
    }

    return {
      files: merged,
      type: config.type,
      skeletonPaths,
      llmPaths,
    };
  }

  /**
   * 仅构建骨架（无 LLM 参与），用于预览
   */
  buildSkeleton(config: PluginGenInput): PluginBuildResult {
    const options = toCodeGenOptions(config);
    const skeleton = PluginCodeGenerator.generateAll(options);

    return {
      files: skeleton,
      type: config.type,
      skeletonPaths: Object.keys(skeleton),
      llmPaths: [],
    };
  }

  /**
   * 尝试将 LLM 返回的文件路径匹配到骨架文件
   * 在多个骨架文件间匹配
   * 匹配逻辑：`ValvePlugin.ts` ↔ `src/ValvePlugin.ts` / `ValvePlugin.ts` / `valve-plugin.ts`
   */
  private _matchSkeletonPath(llmPath: string, skeletonPaths: string[]): string | null {
    const base = llmPath.replace(/^.*[/\\]/, '').toLowerCase();

    for (const sk of skeletonPaths) {
      const skBase = sk.replace(/^.*[/\\]/, '').toLowerCase();
      if (base === skBase) return sk;

      // 去掉扩展名后比较（如 ValvePlugin ↔ ValvePlugin.ts）
      const baseNoExt = base.replace(/\.[^.]+$/, '');
      const skNoExt = skBase.replace(/\.[^.]+$/, '');
      if (baseNoExt === skNoExt) return sk;
    }

    return null;
  }

  /**
   * 将文件树序列化为可下载的 JSON blob
   */
  static toDownloadBlob(files: PluginFileTree): Blob {
    const json = JSON.stringify(files, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * 触发浏览器下载
   */
  static downloadFiles(files: PluginFileTree, pluginType: string): void {
    const blob = this.toDownloadBlob(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pluginType}-plugin.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** 单例 */
export const pluginFileWriter = new PluginFileWriter();
