// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Final comprehensive pass at translating remaining Chinese in test files.
 * Handles all remaining patterns identified after previous runs.
 */
const fs = require('fs');
const path = require('path');
const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

const EXTRA = {
  // === plugin-coverage ===
  '发现 ${pluginDirs.length} 个插件目录': 'Found ${pluginDirs.length} plugin directories',
  '发现 ${testFiles.length} 个测试文件:': 'Found ${testFiles.length} test files:',
  '3d 分类应有测试文件': '3d category should have test files',
  'decorates_borders 应有测试文件': 'decorates_borders should have test files',
  'decorates_head 应有测试文件': 'decorates_head should have test files',
  'decorates_other 应有测试文件': 'decorates_other should have test files',

  // === decorates_* ===
  '每个 field 应有 labelKey': 'each field should have labelKey',
  '${field.name} 缺少 labelKey': '${field.name} is missing labelKey',
  'status 字段应有 4 个选项': 'status field should have 4 options',
  '应接受位置和大小参数': 'should accept position and size parameters',
  'getSize 应返回正确尺寸': 'getSize should return correct size',
  'componentName 应为字符串': 'componentName should be a string',
  'getComponentProps 应返回对象': 'getComponentProps should return an object',
  'getComponentProps 返回的宽高应与插件尺寸一致': 'getComponentProps width/height should match plugin dimensions',
  'getComponentProps 应包含 colors 数组': 'getComponentProps should include a colors array',
  'pluginProps 应可读': 'pluginProps should be readable',
  'setPluginProps 应正确写入属性': 'setPluginProps should correctly write properties',
  'draw 方法应可调用不抛错': 'draw method should be callable without errors',
  'render 方法应可调用不抛错': 'render method should be callable without errors',

  // === Industrial plugins (template literal patterns) ===
  '${field.name} 应在边界值 [${field.min}, ${field.max}] 内正常': '${field.name} should work within boundary values [${field.min}, ${field.max}]',
  '修改 bodyColor 后 render 应使用新的颜色值': 'render should use the new color value after changing bodyColor',
  '修改 liquidColor 后 render 应使用新的颜色值': 'render should use the new color value after changing liquidColor',
  '修改 pipeColor 后 render 应使用新的颜色值': 'render should use the new color value after changing pipeColor',
  '修改 flowingColor 后 render 应使用新的颜色值': 'render should use the new color value after changing flowingColor',
  '修改 onColor 后 render 应使用新的颜色值': 'render should use the new color value after changing onColor',
  '修改 faceColor 后 render 应使用新的颜色值': 'render should use the new color value after changing faceColor',
  '修改 backgroundColor 后 render 应使用新的颜色值': 'render should use the new color value after changing backgroundColor',
  '修改 color 后 render 应使用新的颜色值': 'render should use the new color value after changing color',
  '所有字段在 render 源码中有引用': 'all fields are referenced in the render source code',
  '未在 render 中使用的字段:': 'fields not used in render:',
  'points 字段应支持 setPluginProps 写入并正确读取': 'points field should support setPluginProps write and correct read',

  // === StatusIndicator / PipeH ===
  '默认状态应为 normal': 'default status should be normal',
  '默认状态应为 stopped': 'default status should be stopped',
  'getHtmlTemplate 应返回包含 HTML 的字符串': 'getHtmlTemplate should return a string containing HTML',
  'setDefaultProps 应写入配置': 'setDefaultProps should write configuration',
  '切换 status 应正确更新': 'switching status should update correctly',
  '默认应包含有效的 points 数组': 'should include a valid points array by default',
  'setPluginProps 应正确写入属性': 'setPluginProps should correctly write properties',

  // === schema-validation ===
  'Schema 静态校验 (Phase 1 / Layer 1)': 'Schema static validation (Phase 1 / Layer 1)',
  'schema should pass validation（0 个 error）': 'schema should pass validation (0 errors)',
  '${field.name}: "${field.defaultValue}" 不是有效 hex': '${field.name}: "${field.defaultValue}" is not a valid hex',

  // === decorates-specific ===
  '${item.name} — 属性读写一致性': '${item.name} — Property read/write consistency',
  '${item.name} — render 方法': '${item.name} — render method',
  '${head.name} — 属性读写一致性': '${head.name} — Property read/write consistency',
  '${head.name} — render 方法': '${head.name} — render method',

  // === StatusIndicator ===
  'StatusIndicatorPlugin — 属性读写一致性': 'StatusIndicatorPlugin — Property read/write consistency',
  'StatusIndicatorPlugin — render 方法': 'StatusIndicatorPlugin — render method',
  'PipeHPlugin — 属性读写一致性': 'PipeHPlugin — Property read/write consistency',
  'PipeHPlugin — render 方法': 'PipeHPlugin — render method',

  // === Other patterns ===
  '请输入...': 'Please enter...',
  '复选框': 'Checkbox',
};

const PATTERNS = [
  { regex: /\/\/\s*(.+[\u4e00-\u9fff\u3400-\u4dbf].*)/g, replace: (match, text) => `// ${translateText(text)}` },
  { regex: /(it|it\.only|it\.skip|it\.todo)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  { regex: /(describe|describe\.only|describe\.skip)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  { regex: /(?:rejects\.toThrow|toThrow|throw new Error)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => match.replace(text, translateText(text)) },
  // console.warn / console.log with Chinese
  { regex: /(console\.(?:warn|log|error))\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, fn, text) => `${fn}('${translateText(text)}'` },
  { regex: /(console\.(?:warn|log|error))\s*\(\s*\`([^\`]*[\u4e00-\u9fff][^\`]*)\`/g, replace: (match, fn, text) => `${fn}('${translateText(text)}'` },
  // String variables with template literals: `中文${var}中文`
  { regex: /\`([^\`]*[\u4e00-\u9fff][^\`]*)\`/g, replace: (match, text) => `\`${translateText(text)}\`` },
  // Single-quoted strings
  { regex: /'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => `'${translateText(text)}'` },
];

function translateText(text) {
  // Exact match
  if (EXTRA[text]) return EXTRA[text];

  // Handle describe patterns with plugin name prefix
  // Pattern: "XXX — ChineseDescription"
  const describeMatch = text.match(/^(.+? — )(.+)$/);
  if (describeMatch) {
    const prefix = describeMatch[1];
    const suffix = describeMatch[2];
    const translatedSuffix = translateText(suffix);
    if (translatedSuffix !== suffix) return prefix + translatedSuffix;
  }

  // Partial match
  for (const [cn, en] of Object.entries(EXTRA)) {
    if (text.includes(cn)) return text.replace(cn, en);
  }

  // Rule-based replacements for common patterns
  let result = text;
  result = result.replace(/应使用新的颜色值/g, 'should use the new color value');
  result = result.replace(/应可调用不抛错/g, 'should be callable without errors');
  result = result.replace(/应可读/g, 'should be readable');
  result = result.replace(/应正确写入属性/g, 'should correctly write properties');
  result = result.replace(/应正确更新/g, 'should update correctly');
  result = result.replace(/应有测试文件/g, 'should have test files');
  result = result.replace(/应有 labelKey/g, 'should have labelKey');
  result = result.replace(/应可调用不抛错/g, 'should be callable without errors');
  result = result.replace(/应包含有效的/g, 'should include a valid');
  result = result.replace(/应包含/g, 'should include');
  result = result.replace(/应为/g, 'should be');
  result = result.replace(/应返回/g, 'should return');
  result = result.replace(/应正确/g, 'should correctly');
  result = result.replace(/不应/g, 'should not');
  result = result.replace(/修改/g, 'change');
  result = result.replace(/后 render/g, 'render after');

  // Schema validation context
  result = result.replace(/（0 个 error）/g, '(0 errors)');
  result = result.replace(/不是有效 hex/g, 'is not a valid hex');
  
  if (result !== text) return result;

  return text;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    for (const pattern of PATTERNS) {
      const newContent = content.replace(pattern.regex, pattern.replace);
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    }
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...findTestFiles(fullPath));
    } else if (
      entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx') ||
      entry.name.endsWith('.spec.js') || entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.js')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

const testFiles = findTestFiles(PACKAGES_DIR);
console.log(`Found ${testFiles.length} test files`);

let count = 0;
for (const file of testFiles) {
  if (file.includes('node_modules')) continue;
  if (processFile(file)) {
    count++;
    console.log(`\u2713 ${path.relative(PACKAGES_DIR, file)}`);
  }
}
console.log(`\nDone! ${count} files translated.`);