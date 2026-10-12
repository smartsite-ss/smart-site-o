// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Context Manager — P1-T03 前端上下文管理器
 *
 * 收集编辑器运行上下文，供 Agent 决策使用：
 *   - 编辑器状态（当前页面、选中图元、历史操作）
 *   - 数据中台状态（活动报警、设备列表等，可供后续接入）
 *   - 用户上下文（角色、最近操作、偏好）
 *
 * 关联决策：D-005 混合模式（上下文注入 system prompt）
 *
 * 用法:
 *   const ctx = contextManager.collectContext();
 *   const systemPrompt = contextManager.buildSystemPrompt(ctx);
 */

/** 编辑器上下文 */
export interface EditorContext {
  currentPage?: {
    id: string;
    name: string;
    width: number;
    height: number;
  };
  selectedElements: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  historySteps: number;
  zoom: number;
}

/** 运行时上下文 */
export interface RuntimeContext {
  activeAlarms: number;
  connectedDevices: number;
  currentProject: string;
}

/** 用户上下文 */
export interface UserContext {
  role: string;
  language: string;
  theme: string;
}

/** 完整上下文 */
export interface AgentContext {
  editor: EditorContext;
  runtime: RuntimeContext;
  user: UserContext;
  timestamp: number;
}

export class ContextManager {
  private editorState: EditorContext = {
    selectedElements: [],
    historySteps: 0,
    zoom: 1,
  };

  private runtimeState: RuntimeContext = {
    activeAlarms: 0,
    connectedDevices: 0,
    currentProject: '',
  };

  /**
   * 更新编辑器状态
   */
  updateEditorState(partial: Partial<EditorContext>): void {
    this.editorState = { ...this.editorState, ...partial };
  }

  /**
   * 更新运行时状态
   */
  updateRuntimeState(partial: Partial<RuntimeContext>): void {
    this.runtimeState = { ...this.runtimeState, ...partial };
  }

  /**
   * 收集完整上下文
   */
  collectContext(): AgentContext {
    return {
      editor: { ...this.editorState },
      runtime: { ...this.runtimeState },
      user: {
        role: 'editor',
        language: localStorage.getItem('i18n') || 'zh-CN',
        theme: localStorage.getItem('theme') || 'light',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 构建 system prompt（注入上下文）
   */
  buildSystemPrompt(ctx: AgentContext): string {
    const parts = [
      '你是一个智能 SCADA 系统 AI 助手，具备以下能力：',
      '- 画面创建与编辑（添加图元、调整布局、自动排版）',
      '- 数据绑定（关联数据标签与图元属性）',
      '- 脚本生成（生成采集/计算脚本）',
      '- 插件开发辅助（生成自定义图元插件代码）',
      '- 知识问答（SCADA 系统使用说明）',
    ];

    // 编辑器上下文
    if (ctx.editor.currentPage) {
      const p = ctx.editor.currentPage;
      parts.push(
        `\n【当前编辑器状态】`,
        `- 当前页面：${p.name}（${p.width}×${p.height}，ID: ${p.id}）`,
      );
    }
    if (ctx.editor.selectedElements.length > 0) {
      parts.push(
        `- 选中图元：${ctx.editor.selectedElements.map((e) => `${e.name}(${e.type})`).join(', ')}`,
      );
    }

    // 运行时上下文
    parts.push(
      `\n【系统状态】`,
      `- 当前项目：${ctx.runtime.currentProject || '(未加载)'}`,
      `- 活动报警：${ctx.runtime.activeAlarms} 条`,
      `- 在线设备：${ctx.runtime.connectedDevices} 台`,
    );

    return parts.join('\n');
  }
}

/** 单例 */
export const contextManager = new ContextManager();
