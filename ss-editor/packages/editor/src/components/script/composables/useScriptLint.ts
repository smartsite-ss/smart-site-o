// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScriptEditorMode, EditorDiagnostic } from '../ScriptEditor.types';

export function useScriptLint(
  monacoRef: { value: any },
  editorRef: { value: any },
  mode: ScriptEditorMode,
) {
  function setupLinting() {
    if (!monacoRef.value || !editorRef.value) return;

    const monaco = monacoRef.value;
    const editor = editorRef.value;

    // 初始清除 TS 语言服务的语义诊断标记（setupLinting 在 onMounted 延迟 500ms 后调用，
    // 此时 TS 服务已完成首次诊断，初始模板代码的误报标记已存在）
    const initialModel = editor.getModel();
    if (initialModel) {
      monaco.editor.setModelMarkers(initialModel, 'typescript', []);
      monaco.editor.setModelMarkers(initialModel, 'javascript', []);
    }

    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;

      const markers: any[] = [];

      if (mode === 'filter') {
        const code = model.getValue();
        if (!/return\s+/.test(code)) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: 'filter 模式缺少 return 语句，建议添加: return data;',
            startLineNumber: model.getLineCount(),
            startColumn: 1,
            endLineNumber: model.getLineCount(),
            endColumn: model.getLineMaxColumn(model.getLineCount()),
            source: 'ScriptEngine',
          });
        }
      }

      monaco.editor.setModelMarkers(model, 'script-engine', markers);

      // 清除 Monaco 内置 TS 语言服务的语义诊断标记
      // （如 showGraphic、readTag 等自定义 API 被误报为 "未定义"）
      // 使用 setTimeout 确保在 TS 服务完成诊断后清除
      setTimeout(() => {
        if (monacoRef.value && editorRef.value) {
          const m = editorRef.value.getModel();
          if (m) {
            const monacoInst = monacoRef.value;
            monacoInst.editor.setModelMarkers(m, 'typescript', []);
            monacoInst.editor.setModelMarkers(m, 'javascript', []);
          }
        }
      }, 50);
    });
  }

  function validate(): { valid: boolean; errors: EditorDiagnostic[] } {
    if (!monacoRef.value || !editorRef.value) {
      return { valid: true, errors: [] };
    }

    const monaco = monacoRef.value;
    const model = editorRef.value.getModel();
    if (!model) return { valid: true, errors: [] };

    const markers = monaco.editor.getModelMarkers({ owner: 'script-engine' });
    const errors: EditorDiagnostic[] = markers.map((m: any) => ({
      line: m.startLineNumber,
      column: m.startColumn,
      message: m.message,
      severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
    }));

    return { valid: errors.filter((e) => e.severity === 'error').length === 0, errors };
  }

  return { setupLinting, validate };
}