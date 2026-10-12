// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Code Block Parser — P1-T05/P1-T06 共享
 *
 * 从 LLM 响应（Markdown）中提取代码块，识别文件名，输出结构化文件列表。
 *
 * 识别规则：
 *   1. 围栏代码块 ```lang\n...\n``` → 提取语言和代码
 *   2. 文件指令行 // file: path/to/file.ts → 设置后续代码块的文件名
 *   3. 无文件名时自动推断（.ts/.js/.vue 等后缀）
 *
 * 用法:
 *   const result = parseCodeBlocks(llmResponse);
 *   // result.files → [{ path, lang, code }]
 *   // result.text  → 非代码部分的纯文本
 */

export interface ParsedFile {
  /** 文件路径（如 'src/index.ts'） */
  path: string;
  /** 编程语言 */
  lang: string;
  /** 代码内容 */
  code: string;
}

export interface ParsedResult {
  /** 提取的文件列表 */
  files: ParsedFile[];
  /** 非代码块的纯文本（保留 Markdown 格式） */
  text: string;
}

/** 文件名识别正则 */
const FILE_DIRECTIVE_RE = /^\s*(?:\/\/|#|<!--)\s*file:\s*(.+?)(?:\s*-->)?\s*$/im;

/** 语言 → 扩展名映射 */
const LANG_EXT: Record<string, string> = {
  typescript: '.ts',
  ts: '.ts',
  tsx: '.tsx',
  javascript: '.js',
  js: '.js',
  jsx: '.jsx',
  vue: '.vue',
  json: '.json',
  css: '.css',
  html: '.html',
  markdown: '.md',
  md: '.md',
  yaml: '.yml',
  yml: '.yml',
  sql: '.sql',
  sh: '.sh',
  bash: '.sh',
  python: '.py',
  py: '.py',
};

/**
 * 解析 LLM 响应中的代码块
 */
export function parseCodeBlocks(content: string): ParsedResult {
  const files: ParsedFile[] = [];
  const textParts: string[] = [];
  let lastIndex = 0;

  // 匹配围栏代码块 ```lang\ncode\n```
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let currentFileName = '';

  while ((match = fenceRegex.exec(content)) !== null) {
    const lang = match[1] || '';
    const code = match[2] || '';

    // 累积代码块之前的文本
    if (match.index > lastIndex) {
      textParts.push(content.slice(lastIndex, match.index));
    }
    lastIndex = fenceRegex.lastIndex;

    // 检查第一行是否为文件指令
    const lines = code.split('\n');
    const firstLine = lines[0] || '';
    const fileMatch = firstLine.match(FILE_DIRECTIVE_RE);

    let fileName = '';
    let codeContent = code;

    if (fileMatch) {
      fileName = fileMatch[1].trim();
      // 移除文件指令行
      codeContent = lines.slice(1).join('\n');
      currentFileName = fileName;
    } else if (currentFileName) {
      fileName = currentFileName;
      // 同一文件名只用于第一个未命名代码块
      currentFileName = '';
    }

    // 自动推断文件名
    if (!fileName) {
      const ext = LANG_EXT[lang] || '.txt';
      fileName = `unnamed-${files.length + 1}${ext}`;
    }

    files.push({
      path: fileName,
      lang,
      code: codeContent,
    });
  }

  // 最后一个代码块之后的内容
  if (lastIndex < content.length) {
    textParts.push(content.slice(lastIndex));
  }

  const text = textParts.join('').replace(/\n{3,}/g, '\n\n').trim();

  return { files, text };
}

/**
 * 从代码块中提取单个代码段（无文件结构）
 */
export function extractCodeBlocks(content: string): Array<{ lang: string; code: string }> {
  const results: Array<{ lang: string; code: string }> = [];
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(content)) !== null) {
    const lang = match[1] || '';
    let code = match[2] || '';

    // 去掉文件指令行
    const lines = code.split('\n');
    if (lines[0] && FILE_DIRECTIVE_RE.test(lines[0])) {
      code = lines.slice(1).join('\n');
    }

    results.push({ lang, code });
  }

  return results;
}
