// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Tool Executor — P1-T03 前端工具执行器
 *
 * 管理前端可用工具的注册与执行。
 * 工具通过 MCP 协议与本地系统交互（编辑器 cmd / 数据中台 query）。
 *
 * 工具分为两类：
 *   - Local：直接操作编辑器的工具（scene.*, plugin.*）
 *   - Remote：调用后端 API 的工具（alarm.*, device.*, script.*）
 *
 * 关联决策：D-005（混合模式），D-013（MCP 工具协议）
 *
 * 用法:
 *   const result = await toolExecutor.execute('scene_addGraphic', { type: 'pump', x: 100 });
 */

/** 工具参数 Schema */
export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
}

/** 工具定义 */
export interface ToolDefinition {
  name: string;
  description: string;
  category: 'scene' | 'plugin' | 'script' | 'alarm' | 'device' | 'datatag' | 'kb' | 'layout';
  params: ToolParam[];
  /** 执行工具的回调 */
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

/** 工具执行结果 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** 工具执行选项 */
export interface ToolExecuteOptions {
  /** 调用方标识 */
  caller?: string;
  /** 超时毫秒 */
  timeout?: number;
}

/** 工具注册表 */
const toolRegistry = new Map<string, ToolDefinition>();

export class ToolExecutor {
  /**
   * 注册一个工具
   */
  register(tool: ToolDefinition): void {
    if (toolRegistry.has(tool.name)) {
      console.warn(`[ToolExecutor] 工具 ${tool.name} 已注册，将被覆盖`);
    }
    toolRegistry.set(tool.name, tool);
  }

  /**
   * 注册多个工具
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 获取所有已注册的工具列表（用于生成 system prompt）
   */
  getToolList(): ToolDefinition[] {
    return Array.from(toolRegistry.values());
  }

  /**
   * 生成工具 Schema（用于 LLM function calling）
   */
  getToolSchemas(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.getToolList().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            tool.params.map((p) => [
              p.name,
              { type: p.type, description: p.description },
            ]),
          ),
          required: tool.params.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));
  }

  /**
   * 按名称执行工具
   */
  async execute(
    toolName: string,
    params: Record<string, unknown> = {},
    options: ToolExecuteOptions = {},
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return { success: false, error: `未找到工具: ${toolName}` };
    }

    const timeout = options.timeout || 30_000;
    const timer = new Promise<ToolResult>((_, reject) => {
      setTimeout(() => reject(new Error(`工具执行超时: ${toolName}`)), timeout);
    });

    try {
      const result = await Promise.race([tool.execute(params), timer]);
      return result;
    } catch (err) {
      return {
        success: false,
        error: `工具执行失败: ${(err as Error).message}`,
      };
    }
  }

  /**
   * 执行多个工具调用
   */
  async executeBatch(toolCalls: Array<{ name: string; params: Record<string, unknown> }>): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc.name, tc.params)));
  }

  /**
   * 注销工具
   */
  unregister(toolName: string): boolean {
    return toolRegistry.delete(toolName);
  }
}

/** 单例 */
export const toolExecutor = new ToolExecutor();
