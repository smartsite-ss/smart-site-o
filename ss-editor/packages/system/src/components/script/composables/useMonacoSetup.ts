// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { shallowRef, onMounted, onUnmounted, type Ref } from 'vue';
import loader from '@monaco-editor/loader';
import type { ScriptEditorMode } from '../ScriptEditor.types';
import { themeManager } from '@scada-editor/core';

// 配置 Monaco 使用稳定版本，避免最新版可能的性能回归
// 0.52.0 是 AMD 构建废弃前的最后一个有注释的稳定版本
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs',
  },
});

/** 根据应用主题名判断属于深色还是浅色主题 */
function isDarkTheme(themeName: string): boolean {
  const darkThemes = new Set(['dark', 'techDarkBlue', 'blueDark', 'greenTech', 'highContrast']);
  return darkThemes.has(themeName);
}

export function useMonacoSetup(
  containerRef: Ref<HTMLElement | null>,
  _mode: ScriptEditorMode,
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

  const jsSyntaxRules = [
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

  async function initEditor() {
    if (!containerRef.value) return;

    const monaco = await loader.init();
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

    monaco.editor.defineTheme('scada-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: jsSyntaxRules,
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b',
        'editor.selectionBackground': '#1e3a5f',
        'editorCursor.foreground': '#f1f5f9',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editorBracketMatch.background': '#1e3a5f',
        'editorBracketMatch.border': '#3b82f6',
        'editorSuggestWidget.background': '#1e293b',
        'editorSuggestWidget.selectedBackground': '#1e3a5f',
      },
    });

    monaco.editor.defineTheme('scada-light', {
      base: 'vs',
      inherit: true,
      rules: [
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
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editor.selectionBackground': '#add6ff',
        'editorCursor.foreground': '#000000',
        'editorLineNumber.foreground': '#999999',
        'editorLineNumber.activeForeground': '#333333',
        'editorBracketMatch.background': '#e0e0e0',
        'editorBracketMatch.border': '#2196F3',
        'editorSuggestWidget.background': '#ffffff',
        'editorSuggestWidget.selectedBackground': '#e8f0fe',
      },
    });

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

    // 订阅应用主题变化，同步更新 Monaco 编辑器主题
    disposeTheme = themeManager.subscribe((_theme) => {
      const newMonacoTheme = isDarkTheme(themeManager.getCurrentThemeName())
        ? 'scada-dark'
        : 'scada-light';
      monaco.editor.setTheme(newMonacoTheme);
    });

    editor.onDidChangeModelContent(() => {
      value.value = editor.getValue();
    });

    // ── 复制功能支持 ──
    // Monaco Editor 的 clipboard 模块在某些 CDN 环境或浏览器中可能无法正常工作，
    // 导致 Ctrl+C / 右键复制不可用。通过以下三层机制确保复制功能可用：
    //   1. 原生 copy 事件监听：捕获浏览器 copy 事件，写入选中文本
    //   2. 右键菜单 action：提供可靠的右键复制入口
    //   3. execCommand 回退：当 Clipboard API 不可用时的降级方案

    // 监听浏览器原生 copy 事件，将 Monaco 选中文本写入剪贴板
    const copyHandler = (e: ClipboardEvent) => {
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
        if (import.meta.env.DEV) console.warn('[Monaco] copy fallback failed:', err);
      }
      document.body.removeChild(textarea);
    }

    editorRef.value = editor;
    disposeEditor = () => {
      containerRef.value?.removeEventListener('copy', copyHandler);
      editor.dispose();
    };
  }

  function updateValue(newValue: string) {
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
    disposeEditor?.();
    disposeTheme?.();
  });

  return { editorRef, monacoRef, updateValue };
}