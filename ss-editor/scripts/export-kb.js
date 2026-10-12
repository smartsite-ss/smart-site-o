// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 知识库导出脚本
 *
 * 从 script-api-registry.ts 和 *.examples.ts 生成 kb-data.json
 * 同时扫描 plugins/ 目录提取图元属性 Schema
 * 用法：node scripts/export-kb.js [outputPath]
 *
 * 示例：
 *   node scripts/export-kb.js
 *   node scripts/export-kb.js ./dist/kb-data.json
 *   node scripts/export-kb.js ./public/knowledge-base/v2/kb-data.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════════════════════════

const DEFAULT_OUTPUT = path.resolve(
  __dirname,
  "../packages/editor/public/knowledge-base/v2/kb-data.json",
);
const REGISTRY_PATH = path.resolve(
  __dirname,
  "../packages/editor/src/components/script/rules/script-api-registry.ts",
);
const EXAMPLES_DIR = path.resolve(
  __dirname,
  "../packages/editor/src/components/script/rules/examples",
);
const PLUGINS_DIR = path.resolve(__dirname, "../packages/plugins");

// ═══════════════════════════════════════════════════════════════
// 额外输出路径（apps/web/public/static/ — Vite dev server 根目录）
// ═══════════════════════════════════════════════════════════════

const WEB_PUBLIC_STATIC_DIR = path.resolve(
  __dirname,
  "../apps/web/public/static/knowledge-base",
);

/**
 * 将 kb-data.json 写入到指定版本目录 + latest 目录
 */
function writeToVersion(outputDir, kbData) {
  const versionPath = path.join(outputDir, "v2", "kb-data.json");
  writeJson(versionPath, kbData);
  const latestPath = path.join(outputDir, "latest", "kb-data.json");
  writeJson(latestPath, kbData);
}

// ═══════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════

/** 读取文件内容 */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/** 确保目录存在 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** 写入 JSON 文件 */
function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✓ Written: ${filePath}`);
}

/** 递归查找文件 */
function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 解析注册表
// ═══════════════════════════════════════════════════════════════

/**
 * 从 TypeScript 文件解析 API_REGISTRY 数组
 * 使用正则提取，不依赖 TypeScript 编译器
 */
function parseApiRegistry(tsContent) {
  const registry = [];

  // 提取 API_REGISTRY 数组内容
  const arrayMatch = tsContent.match(
    /export\s+const\s+API_REGISTRY\s*:\s*ApiMethodDef\[\]\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!arrayMatch) {
    throw new Error(
      "Could not find API_REGISTRY array in script-api-registry.ts",
    );
  }

  const arrayContent = arrayMatch[1];

  // 提取每个 API 对象（简化解析：按 { ... } 块分割）
  const objectRegex = /\{\s*name:\s*['"]([^'"]+)['"]\s*,[\s\S]*?\},?\n/g;
  let match;

  while ((match = objectRegex.exec(arrayContent)) !== null) {
    const block = match[0];

    const api = {
      name: extractString(block, "name"),
      category: extractString(block, "category"),
      signature: extractString(block, "signature"),
      summary: extractString(block, "summary"),
      description: extractString(block, "description"),
      params: extractParams(block),
      returns: extractString(block, "returns"),
      availableIn: extractArray(block, "availableIn"),
      notes: extractOptionalString(block, "notes"),
      example: extractOptionalString(block, "example"),
      detail: extractString(block, "detail"),
      insertText: extractString(block, "insertText"),
      sortText: extractString(block, "sortText"),
    };

    registry.push(api);
  }

  return registry;
}

/** 提取字符串字段 */
function extractString(block, field) {
  const regex = new RegExp(`${field}:\\s*['"]([^'"]*)['"]`, "i");
  const match = block.match(regex);
  return match ? match[1] : "";
}

/** 提取可选字符串字段 */
function extractOptionalString(block, field) {
  const regex = new RegExp(`${field}:\\s*['"]([^'"]*)['"]`, "i");
  const match = block.match(regex);
  return match ? match[1] : undefined;
}

/** 提取数组字段 */
function extractArray(block, field) {
  const regex = new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`, "i");
  const match = block.match(regex);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter((s) => s.length > 0);
}

/** 提取参数数组 */
function extractParams(block) {
  const params = [];
  const paramsRegex = /params:\s*\[([\s\S]*?)\],\s*\n/;
  const match = block.match(paramsRegex);

  if (!match) return params;

  const paramsContent = match[1];
  const paramRegex =
    /\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*type:\s*['"]([^'"]+)['"]\s*,\s*required:\s*(true|false)\s*,\s*description:\s*['"]([^'"]*)['"](?:\s*,\s*defaultValue:\s*['"]([^'"]*)['"])?\s*\}/g;

  let paramMatch;
  while ((paramMatch = paramRegex.exec(paramsContent)) !== null) {
    params.push({
      name: paramMatch[1],
      type: paramMatch[2],
      required: paramMatch[3] === "true",
      description: paramMatch[4],
      defaultValue: paramMatch[5] || undefined,
    });
  }

  return params;
}

// ═══════════════════════════════════════════════════════════════
// 解析示例
// ═══════════════════════════════════════════════════════════════

/**
 * 从示例文件解析 ScriptExample 数组
 */
function parseExamples(tsContent) {
  const examples = [];

  // 提取 export const xxxExamples: ScriptExample[] = [...]
  const arrayMatch = tsContent.match(
    /export\s+const\s+\w+Examples\s*:\s*ScriptExample\[\]\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!arrayMatch) return examples;

  const arrayContent = arrayMatch[1];

  // 使用括号计数解析器提取每个示例对象（替代正则，正确处理 code 模板字符串中的嵌套 { }）
  const objects = parseBraceBlocks(arrayContent);
  for (const block of objects) {
    const example = {
      id: extractString(block, "id"),
      title: extractString(block, "title"),
      description: extractString(block, "description"),
      category: extractString(block, "category"),
      triggerType: extractString(block, "triggerType"),
      requiredTags: extractArray(block, "requiredTags"),
      tags: extractArray(block, "tags"),
      difficulty: extractString(block, "difficulty"),
      code: extractCode(block),
    };
    if (example.id) {
      examples.push(example);
    }
  }

  return examples;
}

/**
 * 括号计数解析器：从文本中提取所有顶层 { ... } 块
 * 正确处理：
 *  - 嵌套的 {}（通过 depth 计数）
 *  - 模板字符串 ``（跳过其中的 {}）
 *  - 单引号/双引号字符串（跳过内部的 {}）
 */
function parseBraceBlocks(text) {
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    // 找到下一个顶层 { 开始位置
    const start = text.indexOf("{", i);
    if (start === -1) break;

    const block = extractBraceBlock(text, start);
    if (block) {
      blocks.push(block);
      i = start + block.length;
    } else {
      i = start + 1;
    }
  }
  return blocks;
}

/**
 * 从指定位置提取一个完整的 { ... } 块
 * 返回包含外层 {} 的字符串
 */
function extractBraceBlock(text, startPos) {
  if (text[startPos] !== "{") return null;

  let depth = 0;
  let i = startPos;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;

  while (i < text.length) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    // 处理转义字符
    if (prev === "\\") {
      i++;
      continue;
    }

    // 处理引号状态（不在模板字符串中时）
    if (!inTemplate) {
      if (ch === "'" && !inDoubleQuote) { inSingleQuote = !inSingleQuote; i++; continue; }
      if (ch === '"' && !inSingleQuote) { inDoubleQuote = !inDoubleQuote; i++; continue; }
    }

    // 处理模板字符串（反引号）
    if (ch === "`" && !inSingleQuote && !inDoubleQuote) {
      inTemplate = !inTemplate;
      i++;
      continue;
    }

    // 仅在非字符串、非模板状态下统计括号
    if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }

    i++;

    // depth 回到 0 表示顶层括号闭合
    if (!inSingleQuote && !inDoubleQuote && !inTemplate && depth === 0) {
      return text.slice(startPos, i);
    }
  }

  return null;
}

/** 提取代码块（支持模板字符串） */
function extractCode(block) {
  // 先尝试匹配模板字符串
  const tplMatch = block.match(/code:\s*`([\s\S]*?)`\s*,?\s*\}/);
  if (tplMatch) {
    return tplMatch[1].trim();
  }

  const stringMatch = block.match(/code:\s*['"]([\s\S]*?)['"],?\s*\}/);
  if (stringMatch) {
    return stringMatch[1];
  }

  return "";
}

// ═══════════════════════════════════════════════════════════════
// 解析图元属性 Schema
// ═══════════════════════════════════════════════════════════════

/**
 * 从 propertySchema.ts 文件解析图元属性定义
 */
function parseGraphicSchema(filePath) {
  try {
    const content = readFile(filePath);

    // 提取 schema 名称
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    if (!nameMatch) return null;

    const displayName = nameMatch[1];

    // 提取 pluginType（从文件路径推断）
    const dirParts = path.dirname(filePath).split(path.sep);
    const pluginType = dirParts[dirParts.length - 1];

    // 提取分类
    const categoryParts = dirParts;
    let category = "other";
    const pluginsIdx = categoryParts.indexOf("plugins");
    if (pluginsIdx >= 0 && categoryParts.length > pluginsIdx + 2) {
      category = categoryParts[pluginsIdx + 1]; // industrial, electric, basic, etc.
    }

    // 提取 fields 数组
    const fieldsMatch = content.match(/fields:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
    if (!fieldsMatch) return null;

    const fieldsContent = fieldsMatch[1];
    const fields = [];

    // 提取每个字段
    const fieldRegex =
      /\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,[\s\S]*?\}/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
      const fieldBlock = fieldMatch[0];

      const field = {
        name: extractString(fieldBlock, "name"),
        type: extractString(fieldBlock, "type") || "string",
        label: extractString(fieldBlock, "label"),
        defaultValue: extractFieldDefaultValue(fieldBlock),
        options: extractFieldOptions(fieldBlock),
        min: extractFieldNumber(fieldBlock, "min"),
        max: extractFieldNumber(fieldBlock, "max"),
        step: extractFieldNumber(fieldBlock, "step"),
        group: extractString(fieldBlock, "group"),
      };

      // 跳过空 name
      if (field.name) {
        fields.push(field);
      }
    }

    if (fields.length === 0) return null;

    return {
      pluginType,
      displayName,
      category,
      fields,
      schemaVersion: "1.0",
    };
  } catch {
    return null;
  }
}

/** 提取字段默认值 */
function extractFieldDefaultValue(block) {
  const regex = /defaultValue:\s*([^,\s}]+)/;
  const match = block.match(regex);
  if (!match) return undefined;

  const val = match[1];
  // 去除引号
  if (val.startsWith("'") || val.startsWith('"')) {
    return val.slice(1, -1);
  }
  // 转换布尔值
  if (val === "true") return true;
  if (val === "false") return false;
  // 转换数字
  const num = Number(val);
  if (!isNaN(num)) return num;
  return val;
}

/** 提取字段数字属性 */
function extractFieldNumber(block, field) {
  const regex = new RegExp(`${field}:\\s*(-?[\\d.]+)`, "i");
  const match = block.match(regex);
  return match ? Number(match[1]) : undefined;
}

/** 提取 select 字段的 options */
function extractFieldOptions(block) {
  const optionsMatch = block.match(/options:\s*\[([\s\S]*?)\]\s*,/);
  if (!optionsMatch) return undefined;

  const optionsContent = optionsMatch[1];
  const options = [];
  const optionRegex =
    /\{\s*value:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g;
  let optMatch;

  while ((optMatch = optionRegex.exec(optionsContent)) !== null) {
    options.push({
      value: optMatch[1],
      label: optMatch[2],
    });
  }

  return options.length > 0 ? options : undefined;
}

// ═══════════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════════

function main() {
  const outputPath = process.argv[2] || DEFAULT_OUTPUT;

  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log("  Knowledge Base Export Script (v2.3)");
  console.log(
    "═══════════════════════════════════════════════════════════════",
  );
  console.log();

  try {
    // 1. 解析 API 注册表
    console.log("📖 Parsing API registry...");
    const registryContent = readFile(REGISTRY_PATH);
    const apiRegistry = parseApiRegistry(registryContent);
    console.log(`   ✓ Found ${apiRegistry.length} APIs`);

    // 2. 解析示例文件
    console.log("📖 Parsing examples...");
    const exampleFiles = fs
      .readdirSync(EXAMPLES_DIR)
      .filter((f) => f.endsWith(".examples.ts"))
      .map((f) => path.join(EXAMPLES_DIR, f));

    const exampleCategories = [];
    const categoryLabels = {
      "data-driven": "数据驱动",
      "event-driven": "事件驱动",
      "graphic-operation": "图元操作",
      "multi-tag-linking": "多标签联动",
      "alarm-management": "告警管理",
      "scheduled-task": "定时任务",
    };
    const categoryIcons = {
      "data-driven": "📊",
      "event-driven": "⚡",
      "graphic-operation": "🎨",
      "multi-tag-linking": "🔗",
      "alarm-management": "🔔",
      "scheduled-task": "⏱",
    };

    for (const filePath of exampleFiles) {
      const content = readFile(filePath);
      const examples = parseExamples(content);

      if (examples.length > 0) {
        const category = examples[0].category;
        exampleCategories.push({
          category,
          label: categoryLabels[category] || category,
          icon: categoryIcons[category] || "📄",
          items: examples,
        });
        console.log(`   ✓ ${category}: ${examples.length} examples`);
      }
    }

    // 3. 解析图元属性 Schema
    console.log("📖 Parsing graphic schemas...");
    const schemaFiles = findFiles(PLUGINS_DIR, /PropertySchema\.ts$/);
    const graphicSchemas = [];

    for (const filePath of schemaFiles) {
      const schema = parseGraphicSchema(filePath);
      if (schema) {
        graphicSchemas.push(schema);
      }
    }

    // 去重（按 pluginType）
    const seenTypes = new Set();
    const uniqueSchemas = graphicSchemas.filter((s) => {
      if (seenTypes.has(s.pluginType)) return false;
      seenTypes.add(s.pluginType);
      return true;
    });

    console.log(`   ✓ Found ${uniqueSchemas.length} graphic schemas`);
    for (const s of uniqueSchemas) {
      console.log(
        `     - ${s.pluginType} (${s.displayName}): ${s.fields.length} fields`,
      );
    }

    // 4. 构建知识库 JSON
    console.log();
    console.log("🔨 Building knowledge base JSON...");

    const kbData = {
      meta: {
        version: "2.3",
        appVersion: ">=1.0.0",
        updatedAt: new Date().toISOString(),
        apiCount: apiRegistry.length,
        apiNames: apiRegistry.map((a) => a.name),
        graphicSchemaCount: uniqueSchemas.length,
      },
      apiRegistry,
      examples: exampleCategories,
      graphicSchemas: uniqueSchemas,
    };

    // 5. 写入文件
    console.log();
    console.log("💾 Writing output...");

    // 输出到 packages/editor/public/knowledge-base/（编辑器包）
    writeJson(outputPath, kbData);

    // 输出到 apps/web/public/static/knowledge-base/（Web 应用 — Vite dev server 静态目录）
    writeToVersion(WEB_PUBLIC_STATIC_DIR, kbData);

    // 6. 同时写入 latest（基于 editor 的输出目录）
    const latestPath = path.resolve(
      path.dirname(outputPath),
      "../latest/kb-data.json",
    );
    writeJson(latestPath, kbData);

    // 7. 生成 versions.json
    const versionsPath = path.resolve(
      path.dirname(outputPath),
      "../versions.json",
    );
    const versionsData = {
      latest: "2.3",
      versions: [
        {
          version: "2.3",
          path: "/v2/kb-data.json",
          updatedAt: new Date().toISOString(),
          appVersionRange: ">=1.0.0",
          changes: [
            "新增图元属性 Schema 支持（graphicSchemas）",
            `共 ${uniqueSchemas.length} 种图元类型，${uniqueSchemas.reduce((sum, s) => sum + s.fields.length, 0)} 个属性字段`,
            "export-kb 脚本增强：自动扫描 plugins/ 目录提取图元属性",
            "修复 system 包知识库桩实现",
          ],
        },
      ],
    };
    writeJson(versionsPath, versionsData);

    // 同时写入 web 应用的 versions.json
    const webVersionsPath = path.join(WEB_PUBLIC_STATIC_DIR, "versions.json");
    writeJson(webVersionsPath, versionsData);

    console.log();
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("  ✅ Export complete!");
    console.log(`  📦 APIs: ${apiRegistry.length}`);
    console.log(
      `  📦 Examples: ${exampleCategories.reduce((sum, cat) => sum + cat.items.length, 0)}`,
    );
    console.log(`  📦 Graphic Schemas: ${uniqueSchemas.length} types`);
    console.log(`  📁 Output: ${outputPath}`);
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
  } catch (err) {
    console.error();
    console.error("❌ Export failed:");
    console.error(err.message);
    console.error();
    process.exit(1);
  }
}

main();
