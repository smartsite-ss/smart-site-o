// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { shallowRef, onMounted, onUnmounted, type Ref } from 'vue';
import loader from '@monaco-editor/loader';
import { themeManager } from '@scada-editor/core';
import { useKnowledgeBase } from './useKnowledgeBase';

// 配置 Monaco 使用稳定版本，避免最新版可能的性能回归
// 0.52.0 是 AMD 构建废弃前的最后一个有注释的稳定版本
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs',
  },
});

// ── 主题名称对照 ──
// 应用主题名（来自 themeManager / plugin-sdk 的 kebab-case 命名）
const DARK_THEMES = new Set(['dark', 'tech-dark-blue', 'blue-dark', 'green-tech', 'high-contrast']);

function isDarkTheme(themeName: string): boolean {
  return DARK_THEMES.has(themeName);
}

// ── 动态颜色读取 ──
// 从 CSS 变量读取颜色，确保 Monaco 编辑器与当前应用主题完全一致。
// 当用户切换主题（如 dark → tech-dark-blue → green-tech），CSS 变量
// --background / --text / --surface 等同步更新，Monaco 颜色跟随变化。
function readCSSVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function buildMonacoThemeColors(isDark: boolean): Record<string, string> {
  if (isDark) {
    return {
      'editor.background': readCSSVar('--background', '#0f172a'),
      'editor.foreground': readCSSVar('--text', '#e2e8f0'),
      'editor.lineHighlightBackground': readCSSVar('--surface', '#1e293b'),
      'editor.selectionBackground': readCSSVar('--border-focus', '#1e3a5f'),
      'editorCursor.foreground': readCSSVar('--text', '#f1f5f9'),
      'editorLineNumber.foreground': readCSSVar('--text-tertiary', '#64748b'),
      'editorLineNumber.activeForeground': readCSSVar('--text-secondary', '#94a3b8'),
      'editorBracketMatch.background': readCSSVar('--surface', '#1e3a5f'),
      'editorBracketMatch.border': readCSSVar('--primary', '#3b82f6'),
      'editorSuggestWidget.background': readCSSVar('--elevated', '#1e293b'),
      'editorSuggestWidget.selectedBackground': readCSSVar('--border-focus', '#1e3a5f'),
    };
  }
  // 浅色主题
  return {
    'editor.background': readCSSVar('--background', '#ffffff'),
    'editor.foreground': readCSSVar('--text', '#333333'),
    'editor.lineHighlightBackground': readCSSVar('--surface', '#f0f0f0'),
    'editor.selectionBackground': readCSSVar('--border-focus', '#add6ff'),
    'editorCursor.foreground': readCSSVar('--text', '#000000'),
    'editorLineNumber.foreground': readCSSVar('--text-tertiary', '#999999'),
    'editorLineNumber.activeForeground': readCSSVar('--text-secondary', '#333333'),
    'editorBracketMatch.background': readCSSVar('--surface', '#e0e0e0'),
    'editorBracketMatch.border': readCSSVar('--primary', '#2196F3'),
    'editorSuggestWidget.background': readCSSVar('--elevated', '#ffffff'),
    'editorSuggestWidget.selectedBackground': readCSSVar('--surface', '#e8f0fe'),
  };
}

// ── 语法高亮规则（深色/浅色共享 token → color 映射） ──
const jsSyntaxRulesDark = [
  { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
  { token: 'comment.line', foreground: '6A9955', fontStyle: 'italic' },
  { token: 'comment.block', foreground: '6A9955', fontStyle: 'italic' },
  { token: 'keyword', foreground: '569CD6' },
  { token: 'keyword.control', foreground: 'C586C0' },
  { token: 'keyword.operator', foreground: 'D4D4D4' },
  { token: 'string', foreground: 'CE9178' },
  { token: 'string.quote', foreground: 'CE9178' },
  { token: 'string.template', foreground: 'CE9178' },
  { token: 'string.escape', foreground: 'D7BA7D' },
  { token: 'number', foreground: 'B5CEA8' },
  { token: 'number.hex', foreground: 'B5CEA8' },
  { token: 'number.float', foreground: 'B5CEA8' },
  { token: 'identifier', foreground: '9CDCFE' },
  { token: 'variable', foreground: '9CDCFE' },
  { token: 'variable.readonly', foreground: '4FC1FF' },
  { token: 'type.identifier', foreground: '4EC9B0' },
  { token: 'function', foreground: 'DCDCAA' },
  { token: 'method', foreground: 'DCDCAA' },
  { token: 'delimiter.parenthesis', foreground: 'FFD700' },
  { token: 'delimiter.bracket', foreground: 'FFD700' },
  { token: 'delimiter.brace', foreground: 'FFD700' },
  { token: 'delimiter.comma', foreground: 'D4D4D4' },
  { token: 'delimiter.period', foreground: 'D4D4D4' },
  { token: 'delimiter.semicolon', foreground: 'D4D4D4' },
  { token: 'regexp', foreground: 'D16969' },
  { token: 'type', foreground: '4EC9B0' },
  { token: 'keyword.boolean', foreground: '569CD6' },
  { token: 'keyword.null', foreground: '569CD6' },
  { token: 'api-keyword', foreground: '4FC1FF', fontStyle: 'bold' },
];

const jsSyntaxRulesLight = [
  { token: 'comment', foreground: '008000', fontStyle: 'italic' },
  { token: 'comment.line', foreground: '008000', fontStyle: 'italic' },
  { token: 'comment.block', foreground: '008000', fontStyle: 'italic' },
  { token: 'keyword', foreground: '0000FF' },
  { token: 'keyword.control', foreground: 'AF00DB' },
  { token: 'keyword.operator', foreground: '000000' },
  { token: 'string', foreground: 'A31515' },
  { token: 'string.quote', foreground: 'A31515' },
  { token: 'string.template', foreground: 'A31515' },
  { token: 'string.escape', foreground: 'EE0000' },
  { token: 'number', foreground: '098658' },
  { token: 'number.hex', foreground: '098658' },
  { token: 'number.float', foreground: '098658' },
  { token: 'identifier', foreground: '001080' },
  { token: 'variable', foreground: '001080' },
  { token: 'variable.readonly', foreground: '0070C1' },
  { token: 'type.identifier', foreground: '267F99' },
  { token: 'function', foreground: '795E26' },
  { token: 'method', foreground: '795E26' },
  { token: 'delimiter.parenthesis', foreground: '000000' },
  { token: 'delimiter.bracket', foreground: '000000' },
  { token: 'delimiter.brace', foreground: '000000' },
  { token: 'delimiter.comma', foreground: '000000' },
  { token: 'delimiter.period', foreground: '000000' },
  { token: 'delimiter.semicolon', foreground: '000000' },
  { token: 'regexp', foreground: '811F3F' },
  { token: 'type', foreground: '267F99' },
  { token: 'keyword.boolean', foreground: '0000FF' },
  { token: 'keyword.null', foreground: '0000FF' },
  { token: 'api-keyword', foreground: '0070C1', fontStyle: 'bold' },
];

/** 注册（或更新） Monaco 深色/浅色主题，颜色从 CSS 变量动态读取 */
function defineMonacoThemes(monaco: any, isDark: boolean): void {
  if (isDark) {
    monaco.editor.defineTheme('scada-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: jsSyntaxRulesDark,
      colors: buildMonacoThemeColors(true),
    });
  } else {
    monaco.editor.defineTheme('scada-light', {
      base: 'vs',
      inherit: true,
      rules: jsSyntaxRulesLight,
      colors: buildMonacoThemeColors(false),
    });
  }
}

export function useMonacoSetup(
  containerRef: Ref<HTMLElement | null>,
  _mode: unknown,
  value: Ref<string>,
  options?: {
    readonly?: boolean;
    editorOverrides?: Record<string, any>;
  },
) {
  // 使用 shallowRef 存储 Monaco 实例，防止 Vue3 深度响应式代理
  // Monaco editor / monaco 对象是巨大的对象树，若被 Vue3 的 ref() 深度
  // 包装为 reactive Proxy，会导致：
  //   1. 初始化时遍历整个对象树创建 Proxy → 主线程长时间阻塞
  //   2. 每次属性访问都经过 Proxy getter 触发 track() → 运行时性能急剧下降
  //   3. onDidChangeModelContent 回调中调用 getValue()/setModelMarkers()
  //      均通过 Proxy 层层传递，叠加后导致浏览器 tab 卡死
  const editorRef = shallowRef<any>(null);
  const monacoRef = shallowRef<any>(null);
  let disposeEditor: (() => void) | null = null;
  let disposeTheme: (() => void) | null = null;
  let disposed = false;

  async function initEditor() {
    if (!containerRef.value || disposed) return;

    // 初始化时加载知识库（如果尚未加载）
    const { loadKb } = useKnowledgeBase();
    await loadKb();

    const monaco = await loader.init();
    if (disposed) return;
    monacoRef.value = monaco;

    monaco.languages.setLanguageConfiguration('javascript', {
      brackets: [['{', '}'], ['[', ']'], ['(', ')']],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
      ],
    });

    // 禁用 JavaScript 语义诊断，避免内置 TS 语言服务对脚本 API 产生误报
    // （如 showGraphic、readTag 等自定义 API 被标记为 "未定义"）
    try {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: true,
      });
    } catch {
      // monaco.languages.typescript 可能未加载（懒加载），忽略
    }

    // 为 Monaco 的 TS/JS 语言服务添加全局类型声明，使自定义 API 不再被标记为 "未定义"
    // 这是解决 "6 条日志" 错误的根本方案：声明所有脚本 API 为全局变量
    try {
      const scriptApiDeclarations = `
// 脚本引擎 API 类型声明 — 使 Monaco 不将自定义 API 误报为未定义
declare var api: {
  readTag(tagId: string): any;
  writeTag(tagId: string, value: any): void;
  getTagQuality(tagId: string): string;
  setGraphicProps(graphicId: string, props: Record<string, any>): void;
  showGraphic(graphicId: string): void;
  hideGraphic(graphicId: string): void;
  moveGraphic(graphicId: string, x: number, y: number): void;
  rotateGraphic(graphicId: string, angle: number): void;
  triggerAlarm(config: { tagId: string; level: string; message: string }): void;
  acknowledgeAlarm(alarmId: string): void;
  clearAlarm(alarmId: string): void;
  getActiveAlarms(): any[];
  switchPage(pageId: string): void;
  getCurrentPageId(): string;
  fetch(url: string, options?: any): Promise<any>;
  sleep(ms: number): Promise<void>;
  notify(message: string, level?: string): void;
  log(level: string, message: string): void;
  round(value: number, decimals?: number): number;
  clamp(value: number, min: number, max: number): number;
  mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
  colorForValue(v: number, min?: number, max?: number): string;
  isAlarm(v: number, high: number, low?: number): boolean;
};

declare var event: {
  graphicId: string;
  x: number;
  y: number;
  type: string;
  timestamp: number;
};

declare var context: {
  graphicId: string;
  tagValues: Record<string, any>;
  triggerType: string;
  event: any;
};

declare var graphic: any;
declare var data: any;
`;
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        scriptApiDeclarations,
        'ts:scada-script-api.d.ts',
      );
    } catch {
      // monaco.languages.typescript 可能未加载（懒加载），忽略
    }

    // 注册两种主题（scada-dark / scada-light），颜色从 CSS 变量动态读取
    // 详见模块顶部的 buildMonacoThemeColors / defineMonacoThemes
    defineMonacoThemes(monaco, true);
    defineMonacoThemes(monaco, false);

    // 根据当前应用主题选择 Monaco 主题
    const currentTheme = themeManager.getCurrentThemeName();
    const monacoTheme = isDarkTheme(currentTheme) ? 'scada-dark' : 'scada-light';

    const editor = monaco.editor.create(containerRef.value, {
      value: value.value,
      language: 'javascript',
      theme: monacoTheme,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      matchBrackets: 'always',
      folding: true,
      foldingStrategy: 'indentation',
      renderWhitespace: 'selection',
      readOnly: options?.readonly ?? false,
      suggest: { showKeywords: true, showSnippets: true },
      ...options?.editorOverrides,
    });

    // 编辑器创建后立即清除 TS/JS 语言服务的初始诊断标记
    // 两次清除：一次同步（catch 已完成的诊断），一次延迟（catch 异步诊断）
    const clearModel = editor.getModel();
    if (clearModel) {
      monaco.editor.setModelMarkers(clearModel, 'typescript', []);
      monaco.editor.setModelMarkers(clearModel, 'javascript', []);
    }
    setTimeout(() => {
      if (disposed) return;
      const m = editor.getModel();
      if (m) {
        monaco.editor.setModelMarkers(m, 'typescript', []);
        monaco.editor.setModelMarkers(m, 'javascript', []);
      }
    }, 200);

    // 订阅应用主题变化，同步更新 Monaco 编辑器主题
    // 每次切换主题时重新定义主题颜色（因为 CSS 变量已更新），
    // 确保 Monaco 编辑器始终与应用主题颜色一致
    disposeTheme = themeManager.subscribe((_theme) => {
      if (disposed) return;
      const isDark = isDarkTheme(themeManager.getCurrentThemeName());
      // 重新定义主题：从最新的 CSS 变量读取颜色
      defineMonacoThemes(monaco, isDark);
      // 应用切换
      monaco.editor.setTheme(isDark ? 'scada-dark' : 'scada-light');
    });

    editor.onDidChangeModelContent(() => {
      if (disposed) return;
      // 使用微任务延迟 getValue()，避免在 model change 事件中同步读取
      // 整个模型内容导致主线程阻塞（尤其在大脚本或复杂 token 时）
      Promise.resolve().then(() => {
        if (disposed) return;
        value.value = editor.getValue();
      });
    });

    // ── 复制功能支持 ──
    // Monaco Editor 的 clipboard 模块在某些 CDN 环境或浏览器中可能无法正常工作，
    // 导致 Ctrl+C / 右键复制不可用。通过以下三层机制确保复制功能可用：
    //   1. 原生 copy 事件监听：捕获浏览器 copy 事件，写入选中文本
    //   2. 右键菜单 action：提供可靠的右键复制入口
    //   3. execCommand 回退：当 Clipboard API 不可用时的降级方案

    // 监听浏览器原生 copy 事件，将 Monaco 选中文本写入剪贴板
    const copyHandler = (e: ClipboardEvent) => {
      if (disposed) return;
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) {
          e.clipboardData?.setData('text/plain', text);
          e.preventDefault();
        }
      }
    };
    containerRef.value.addEventListener('copy', copyHandler);

    // 右键菜单复制命令
    editor.addAction({
      id: 'scada-copy',
      label: 'Copy',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1,
      keybindings: [],
      run: (ed: any) => {
        if (disposed) return;
        copySelection(ed);
      },
    });

    function copySelection(ed: any) {
      const selection = ed.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = ed.getModel()?.getValueInRange(selection);
        if (text) {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
          } else {
            fallbackCopy(text);
          }
        }
      }
    }

    function fallbackCopy(text: string) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.warn('[Monaco] copy fallback failed:', err);
      }
      document.body.removeChild(textarea);
    }

    editorRef.value = editor;
    disposeEditor = () => {
      disposed = true;
      containerRef.value?.removeEventListener('copy', copyHandler);
      editor.dispose();
    };
  }

  function updateValue(newValue: string) {
    if (disposed) return;
    const editor = editorRef.value;
    if (editor && editor.getValue() !== newValue) {
      const position = editor.getPosition();
      editor.setValue(newValue);
      if (position) editor.setPosition(position);
    }
  }

  onMounted(() => {
    initEditor();
  });

  onUnmounted(() => {
    disposed = true;
    disposeEditor?.();
    disposeTheme?.();
  });

  return { editorRef, monacoRef, updateValue };
}