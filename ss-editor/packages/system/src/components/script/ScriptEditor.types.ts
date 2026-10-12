// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ─── 脚本编辑器模式（与 core 包保持一致） ───
export type ScriptEditorMode = 'filter' | 'driver' | 'interaction' | 'timer' | 'expression';

export interface ScriptEditorProps {
  mode: ScriptEditorMode;
  modelValue: string;
  height?: string | number;
  readonly?: boolean;
  placeholder?: string;
  showToolbar?: boolean;
  showDebugPanel?: boolean;
  showApiPanel?: boolean;
  mockData?: Record<string, any>;
  mockContext?: Record<string, any>;
  engine?: 'monaco' | 'codemirror';
  extraCompletions?: ScriptCompletionItem[];
  editorOverrides?: Record<string, any>;
}

export interface ScriptEditorEmits {
  (e: 'update:modelValue', value: string): void;
  (e: 'save', value?: string): void;
  (e: 'execute', result: TestRunResult): void;
}

export interface ScriptCompletionItem {
  label: string;
  kind: 'function' | 'variable' | 'snippet' | 'keyword';
  detail?: string;
  documentation?: string;
  insertText: string;
  sortText?: string;
}

export interface EditorDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TestRunResult {
  success: boolean;
  output?: any;
  error?: string;
  stackTrace?: string;
  executionTime: number;
  apiCalls: Array<{ method: string; args: any[] }>;
  timestamp: number;
}

export interface ScriptEditorExpose {
  getValue(): string;
  setValue(value: string): void;
  formatCode(): void;
  insertSnippet(snippet: string): void;
  undo(): void;
  redo(): void;
  focus(): void;
  validate(): { valid: boolean; errors: EditorDiagnostic[] };
  testRun(mockData?: Record<string, any>): Promise<TestRunResult>;
  getEditorInstance(): any;
}