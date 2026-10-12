// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Editor MCP Tools — P1-T04 编辑器工具注册
 *
 * 将编辑器核心操作注册为 MCP 工具，供 AI Agent 调用。
 * 涵盖 6 大操作：
 *   - scene.createPage    创建新页面
 *   - scene.addGraphic    添加图元
 *   - scene_setBinding    设置数据绑定
 *   - scene_setProperty   修改图元属性
 *   - scene_autoLayout    自动布局
 *   - scene.deleteGraphic 删除图元
 *
 * 安全分级：
 *   - LOW：只读操作（查询已注册图元）
 *   - MEDIUM：写入操作（创建/修改/布局）
 *   - HIGH：删除操作（需用户确认）
 *
 * 关联决策：D-004（MCP 协议）、D-008（权限继承）
 *
 * 用法:
 *   import { registerEditorTools } from './editor-tools';
 *   registerEditorTools();  // 在编辑器初始化时调用
 */

import { GraphicFactory } from '@scada-editor/plugin-sdk';
import { usePageStore } from '../store/page.store';
import { getCurrentPage, addGraphic, removeGraphic, getGraphicById } from '../store/graphic-crud';
import type { IGraphic } from '../types';
import { toolExecutor, type ToolDefinition, type ToolResult } from './tool-executor';

/** 安全级别 */
type SafetyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** 扩展的编辑器工具定义（含安全级别） */
interface EditorToolDef extends ToolDefinition {
  safetyLevel: SafetyLevel;
  version: string;
}

// ============================================================
//  工具定义
// ============================================================

const editorTools: EditorToolDef[] = [
  // ── scene.createPage ──
  {
    name: 'scene.createPage',
    description: '在当前项目中创建新的监控画面页面',
    category: 'scene',
    safetyLevel: 'MEDIUM',
    version: '1.0.0',
    params: [
      { name: 'name', type: 'string', description: '页面名称（如"泵站监控"）', required: true },
      { name: 'width', type: 'number', description: '页面宽度（默认 1920）', required: false },
      { name: 'height', type: 'number', description: '页面高度（默认 1080）', required: false },
    ],
    execute: async (params): Promise<ToolResult> => {
      const pageStore = usePageStore();
      const name = String(params.name || '新页面');
      const width = Number(params.width) || 1920;
      const height = Number(params.height) || 1080;

      try {
        const page = pageStore.addPage(name);
        if (page && typeof (page as any).setSize === 'function') {
          (page as any).setSize(width, height);
        }
        return {
          success: true,
          data: { pageId: page.id, name: page.name, width, height },
        };
      } catch (err) {
        return { success: false, error: `创建页面失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene.addGraphic ──
  {
    name: 'scene.addGraphic',
    description: '在画布上添加一个图元（如水泵、阀门、仪表、趋势图等）',
    category: 'scene',
    safetyLevel: 'MEDIUM',
    version: '1.0.0',
    params: [
      { name: 'type', type: 'string', description: '图元类型标识（如 pump/valve/tank）', required: true },
      { name: 'name', type: 'string', description: '图元显示名称', required: false },
      { name: 'x', type: 'number', description: 'X 坐标（默认 100）', required: false },
      { name: 'y', type: 'number', description: 'Y 坐标（默认 100）', required: false },
      { name: 'width', type: 'number', description: '宽度（默认 100）', required: false },
      { name: 'height', type: 'number', description: '高度（默认 100）', required: false },
    ],
    execute: async (params): Promise<ToolResult> => {
      const type = String(params.type || '');
      if (!type || !GraphicFactory.hasGraphic(type)) {
        const available = GraphicFactory.getGraphicTypes()
          .slice(0, 10)
          .map((g) => g.type)
          .join(', ');
        return {
          success: false,
          error: `未知图元类型: ${type}。可用类型: ${available}...`,
        };
      }

      const x = Number(params.x) || 100;
      const y = Number(params.y) || 100;
      const width = Number(params.width) || 100;
      const height = Number(params.height) || 100;

      try {
        const graphic = addGraphic(type, x, y, width, height);
        if (!graphic) {
          return { success: false, error: '添加图元失败（当前页面不存在或 addGraphic 不可用）' };
        }
        if (params.name && graphic.config) {
          graphic.config.name = String(params.name);
        }
        return {
          success: true,
          data: {
            graphicId: graphic.id,
            type: graphic.type,
            name: graphic.config?.name || graphic.type,
            position: { x, y },
          },
        };
      } catch (err) {
        return { success: false, error: `添加图元失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene_setBinding ──
  {
    name: 'scene_setBinding',
    description: '将图元属性绑定到数据标签（如标签值 → 图元显示文本）',
    category: 'datatag',
    safetyLevel: 'MEDIUM',
    version: '1.0.0',
    params: [
      { name: 'graphicId', type: 'string', description: '目标图元 ID', required: true },
      { name: 'propertyPath', type: 'string', description: '属性路径（如 customProps.text）', required: true },
      { name: 'tagId', type: 'string', description: '数据标签 ID', required: true },
    ],
    execute: async (params): Promise<ToolResult> => {
      const graphicId = String(params.graphicId || '');
      const propertyPath = String(params.propertyPath || '');
      const tagId = String(params.tagId || '');

      const graphic = getGraphicById(graphicId);
      if (!graphic) {
        return { success: false, error: `未找到图元: ${graphicId}` };
      }

      try {
        // 构建绑定配置
        const bindingConfig = {
          sourceId: tagId,
          sourcePath: 'value',
          targetPath: propertyPath,
          condition: undefined,
          transform: undefined,
        };

        // 追加到图元的 bindings 属性
        const currentBindings = graphic.getProps<Array<{ sourceId: string; sourcePath: string; targetPath: string }>>('bindings', []);
        const newBindings = [...currentBindings, bindingConfig];
        graphic.setProps('bindings', newBindings);

        return {
          success: true,
          data: {
            graphicId,
            propertyPath,
            tagId,
            message: `已将 ${propertyPath} 绑定到标签 ${tagId}`,
          },
        };
      } catch (err) {
        return { success: false, error: `绑定失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene_setProperty ──
  {
    name: 'scene_setProperty',
    description: '修改图元属性（位置、尺寸、文本等）',
    category: 'scene',
    safetyLevel: 'MEDIUM',
    version: '1.0.0',
    params: [
      { name: 'graphicId', type: 'string', description: '目标图元 ID', required: true },
      { name: 'property', type: 'string', description: '属性名（x/y/width/height/rotation/opacity/text）', required: true },
      { name: 'value', type: 'string', description: '属性值', required: true },
    ],
    execute: async (params): Promise<ToolResult> => {
      const graphicId = String(params.graphicId || '');
      const property = String(params.property || '');
      const value = params.value;

      const graphic = getGraphicById(graphicId);
      if (!graphic) {
        return { success: false, error: `未找到图元: ${graphicId}` };
      }

      try {
        switch (property) {
          case 'x':
            graphic.setPosition(Number(value), graphic.config.geometry?.y || 0);
            break;
          case 'y':
            graphic.setPosition(graphic.config.geometry?.x || 0, Number(value));
            break;
          case 'width':
            graphic.setSize(Number(value), graphic.config.geometry?.height || 0);
            break;
          case 'height':
            graphic.setSize(graphic.config.geometry?.width || 0, Number(value));
            break;
          case 'rotation':
            graphic.setRotation(Number(value));
            break;
          case 'opacity':
            graphic.setProperty('config.style.opacity', Number(value));
            break;
          case 'text':
            graphic.setProps('customProps.text', String(value));
            break;
          case 'name':
            graphic.config.name = String(value);
            break;
          default:
            graphic.setProps(`customProps.${property}`, value);
        }

        return {
          success: true,
          data: { graphicId, property, value },
        };
      } catch (err) {
        return { success: false, error: `设置属性失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene_autoLayout ──
  {
    name: 'scene_autoLayout',
    description: '自动排列画布上的图元（4 种布局模式）',
    category: 'layout',
    safetyLevel: 'MEDIUM',
    version: '1.0.0',
    params: [
      { name: 'mode', type: 'string', description: '布局模式：grid/flow/circle/free（默认 grid）', required: false },
      { name: 'columns', type: 'number', description: '每行列数（grid 模式，默认 3）', required: false },
      { name: 'spacing', type: 'number', description: '图元间距（默认 50）', required: false },
    ],
    execute: async (params): Promise<ToolResult> => {
      const mode = String(params.mode || 'grid');
      const columns = Number(params.columns) || 3;
      const spacing = Number(params.spacing) || 50;

      const currentPage = getCurrentPage();
      if (!currentPage) {
        return { success: false, error: '没有活动页面' };
      }

      const graphics = currentPage.graphics as IGraphic[];
      if (!graphics || graphics.length === 0) {
        return { success: true, data: { message: '画布上没有图元，无需布局' } };
      }

      const startX = 100;
      const startY = 100;

      try {
        switch (mode) {
          case 'grid': {
            for (let i = 0; i < graphics.length; i++) {
              const col = i % columns;
              const row = Math.floor(i / columns);
              graphics[i].setPosition(
                startX + col * (150 + spacing),
                startY + row * (150 + spacing),
              );
            }
            break;
          }
          case 'flow': {
            for (let i = 0; i < graphics.length; i++) {
              graphics[i].setPosition(
                startX + i * (150 + spacing),
                startY,
              );
            }
            break;
          }
          case 'circle': {
            const radius = Math.max(200, graphics.length * 40);
            const centerX = startX + radius;
            const centerY = startY + radius;
            for (let i = 0; i < graphics.length; i++) {
              const angle = (2 * Math.PI * i) / graphics.length;
              graphics[i].setPosition(
                centerX + radius * Math.cos(angle),
                centerY + radius * Math.sin(angle),
              );
            }
            break;
          }
          default:
            return { success: false, error: `不支持的布局模式: ${mode}。支持: grid/flow/circle` };
        }

        return {
          success: true,
          data: {
            message: `已按 ${mode} 模式排列 ${graphics.length} 个图元`,
            count: graphics.length,
            mode,
          },
        };
      } catch (err) {
        return { success: false, error: `布局失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene.deleteGraphic ──
  {
    name: 'scene.deleteGraphic',
    description: '从画布上删除指定图元',
    category: 'scene',
    safetyLevel: 'HIGH',
    version: '1.0.0',
    params: [
      { name: 'graphicId', type: 'string', description: '要删除的图元 ID', required: true },
    ],
    execute: async (params): Promise<ToolResult> => {
      const graphicId = String(params.graphicId || '');
      const graphic = getGraphicById(graphicId);
      if (!graphic) {
        return { success: false, error: `未找到图元: ${graphicId}` };
      }

      try {
        removeGraphic(graphicId);
        return {
          success: true,
          data: { deletedId: graphicId, name: graphic.config?.name || graphic.type },
        };
      } catch (err) {
        return { success: false, error: `删除失败: ${(err as Error).message}` };
      }
    },
  },

  // ── scene_getGraphicTypes ──
  {
    name: 'scene_getGraphicTypes',
    description: '获取所有可用的图元类型列表（供 Agent 了解可选图元）',
    category: 'scene',
    safetyLevel: 'LOW',
    version: '1.0.0',
    params: [],
    execute: async (): Promise<ToolResult> => {
      try {
        const types = GraphicFactory.getGraphicTypes().map((info) => ({
          type: info.type,
          name: info.name,
          category: info.category,
        }));
        return { success: true, data: { count: types.length, types } };
      } catch (err) {
        return { success: false, error: `获取图元列表失败: ${(err as Error).message}` };
      }
    },
  },
];

// ============================================================
//  注册入口
// ============================================================

/**
 * 向 ToolExecutor 注册所有编辑器工具。
 * 在编辑器初始化时调用（EditorView onMounted 或插件初始化钩子）。
 *
 * 示例:
 *   registerEditorTools();
 */
export function registerEditorTools(): void {
  toolExecutor.registerAll(editorTools);
  console.log(`[EditorTools] 已注册 ${editorTools.length} 个编辑器 MCP 工具`);
}

/** 获取编辑器工具列表（供 system prompt 生成） */
export function getEditorToolList(): EditorToolDef[] {
  return [...editorTools];
}

/** 检查工具是否为高危操作 */
export function isHighRiskTool(toolName: string): boolean {
  return editorTools.find((t) => t.name === toolName)?.safetyLevel === 'HIGH';
}

/** 按安全级别查询工具 */
export function getToolsBySafetyLevel(level: SafetyLevel): EditorToolDef[] {
  return editorTools.filter((t) => t.safetyLevel === level);
}
