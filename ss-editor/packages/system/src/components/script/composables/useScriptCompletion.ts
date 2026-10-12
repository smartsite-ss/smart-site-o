// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { getCompletionsByMode } from '../utils/completionData';
import type { ScriptEditorMode } from '../ScriptEditor.types';

/**
 * 上下文感知前缀映射：根据输入前缀过滤补全项
 * 例如：输入 `api.` 时只显示 api.* 方法
 */
const CONTEXT_PREFIXES: Record<string, string> = {
  'api.': 'api.',
  'data.': 'data',
  'context.': 'context',
  'event.': 'event',
  'page.': 'page',
  'timer.': 'timer',
  'utils.': 'utils',
};

export function useScriptCompletion(
  monacoRef: { value: any },
  editorRef: { value: any },
  mode: ScriptEditorMode,
) {
  let disposed = false;
  // 缓存补全数据，避免每次输入都重新计算
  const completionItems = getCompletionsByMode(mode);

  function register() {
    if (!monacoRef.value || !editorRef.value) return;

    const monaco = monacoRef.value;

    const provider = monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.', '(', '"', "'"],

      provideCompletionItems(model: any, position: any) {
        if (disposed) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // 上下文感知过滤：根据输入前缀只显示相关补全项
        const filteredItems = filterByContext(completionItems, textBeforeCursor);

        const suggestions = filteredItems.map((item) => ({
          label: item.label,
          kind: getCompletionKind(monaco, item.kind),
          detail: item.detail,
          documentation: item.documentation,
          insertText: item.insertText,
          insertTextRules: item.kind === 'snippet'
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range,
          sortText: item.sortText ?? 'z',
        }));

        return { suggestions };
      },
    });

    return provider;
  }

  /**
   * 根据输入上下文过滤补全项
   * - 输入 `api.` → 只显示 api.* 方法
   * - 输入 `data.` → 只显示 data 相关
   * - 其他情况 → 显示全部
   */
  function filterByContext(items: any[], textBeforeCursor: string): any[] {
    for (const [suffix, prefix] of Object.entries(CONTEXT_PREFIXES)) {
      if (textBeforeCursor.endsWith(suffix)) {
        return items.filter((item) => item.label.startsWith(prefix));
      }
    }
    return items;
  }

  function getCompletionKind(monaco: any, kind: string): number {
    const Kind = monaco.languages.CompletionItemKind;
    const map: Record<string, number> = {
      function: Kind.Function,
      variable: Kind.Variable,
      snippet: Kind.Snippet,
      keyword: Kind.Keyword,
    };
    return map[kind] ?? Kind.Function;
  }

  function dispose() {
    disposed = true;
  }

  return { register, dispose };
}