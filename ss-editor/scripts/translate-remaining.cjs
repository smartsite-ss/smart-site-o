// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Script to handle remaining Chinese text in test files.
 * Reads files, identifies Chinese text, and provides translations.
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// Additional translations for remaining Chinese text
const EXTRA_TRANSLATIONS = {
  // === pageDataSource.store.test.ts ===
  '2. 初始化组 (initGroup / loadGroup / clearGroup)': '2. Group initialization (initGroup / loadGroup / clearGroup)',
  '4. 图元选择 (selectGraphic)': '4. Graphic selection (selectGraphic)',
  '5. 变量管理 (Variable management)': '5. Variable management',
  '6. 图元绑定 (Graphic binding)': '6. Graphic binding',
  '7. 计算属性 (Computed properties)': '7. Computed properties',
  '8. 数据获取 (fetchDataSourceData)': '8. Data fetching (fetchDataSourceData)',
  '10. 工具函数 (resolveDataPath / applyScale)': '10. Utility functions (resolveDataPath / applyScale)',

  // === PageBrowserPlugin.test.ts ===
  '测试页面': 'Test Page',
  '页面1': 'Page1',
  '页面2': 'Page2',
  '页面浏览器': 'Page Browser',
  '监控页': 'Monitor Page',
  'PageBrowserPlugin — Schema 静态校验 (Layer 1)': 'PageBrowserPlugin — Schema static validation (Layer 1)',
  'schema.name 应非空': 'schema.name should not be empty',
  'schema.fields 应非空数组': 'schema.fields should be a non-empty array',
  '每个 field 应有 name 和 type': 'each field should have name and type',
  'select 类型应有 options 或 optionsProvider': 'select type should have options or optionsProvider',
  'select 字段必须有 options 或 optionsProvider': 'select field must have options or optionsProvider',
  'select字段 "${field.name}" 应至少有 options 或 optionsProvider': 'select field "${field.name}" should have at least options or optionsProvider',
  'number 类型的 min 不应大于 max': 'number type min should not be greater than max',
  '所有 field 应有 defaultValue（除 required 字段外）': 'all fields should have defaultValue (except required fields)',
  'required 字段（如 pageName）由用户运行时选择，无需 defaultValue': 'required fields (e.g., pageName) are selected at runtime, no defaultValue needed',
  'color 类型的 defaultValue 应为有效 hex': 'color type defaultValue should be a valid hex',
  'PageBrowserPlugin — 属性读写一致性 (Layer 2)': 'PageBrowserPlugin — Property read/write consistency (Layer 2)',
  '所有 schema defaultProps 应与 constructor 初始化值一致': 'all schema defaultProps should match constructor initial values',
  '所有字段应支持 setPluginProps 写入并正确读取': 'all fields should support setPluginProps write and correct read',
  'onPropertyChanged 应在属性变更时触发': 'onPropertyChanged should fire when properties change',
  'PageBrowserPlugin — 声明-渲染映射验证 (Layer 3)': 'PageBrowserPlugin — Declaration-rendering mapping validation (Layer 3)',
  'render 应在调用后不抛出错误（无页面数据）': 'render should not throw after being called (no page data)',
  'render 应在有加载错误时正常渲染': 'render should render normally with load errors',
  '测试错误信息': 'test error message',
  'PageBrowserPlugin — 构造与基础功能': 'PageBrowserPlugin — Construction and basic functionality',
  '应正确创建实例': 'should create instance correctly',
  '应接受位置和尺寸参数': 'should accept position and size parameters',
  'draw 方法应正常调用（无内容）': 'draw method should be called normally (no content)',
  'PageBrowserPlugin — 显示模式测试': 'PageBrowserPlugin — Display mode test',
  '默认显示模式应为 stretch': 'default display mode should be stretch',
  '修改显示模式后 render 应正常': 'render should work after changing display mode',
  'PageBrowserPlugin — 边框配置测试': 'PageBrowserPlugin — Border configuration test',
  '默认边框样式应为 solid': 'default border style should be solid',
  '修改边框属性后 render 应正常': 'render should work after changing border properties',
  '边框样式设为 none 且线宽为 0 时不应绘制边框': 'should not draw border when border style is none and line width is 0',
  'none 模式下不应有 strokeRect 调用': 'should not call strokeRect in none mode',
  'solid 边框应调用 setLineDash([])': 'solid border should call setLineDash([])',
  'dashed 边框应调用 setLineDash([8,4])': 'dashed border should call setLineDash([8,4])',
  'dotted 边框应调用 setLineDash([2,2])': 'dotted border should call setLineDash([2,2])',
  'PageBrowserPlugin — 背景色配置测试': 'PageBrowserPlugin — Background color configuration test',
  '默认背景色应为 #FFFFFF': 'default background color should be #FFFFFF',
  '背景色设为 transparent 时不应绘制背景': 'should not draw background when background color is transparent',
  'transparent 时不应有 fillRect (通过 fillRoundedRect 调用)': 'should not call fillRect when transparent (via fillRoundedRect)',
  '修改背景色后 render 应正常': 'render should work after changing background color',
  'PageBrowserPlugin — optionsProvider 动态选项 (Layer 1)': 'PageBrowserPlugin — optionsProvider dynamic options (Layer 1)',
  'pageName 字段应有 optionsProvider 为 "pageStore.pages"': 'pageName field should have optionsProvider as "pageStore.pages"',
  'pageName 字段不应有静态 options（由 optionsProvider 动态提供）': 'pageName field should not have static options (dynamically provided by optionsProvider)',
  'displayMode 字段应有静态 options 且无 optionsProvider': 'displayMode field should have static options and no optionsProvider',
  'borderStyle 字段应有静态 options 且无 optionsProvider': 'borderStyle field should have static options and no optionsProvider',
  '非 select 字段不应有 options 或 optionsProvider': 'non-select fields should not have options or optionsProvider',
  'PageBrowserPlugin — Schema 注册到 ConfigTemplateManager': 'PageBrowserPlugin — Schema registration in ConfigTemplateManager',
  '确保 schema 已注册（index.ts 中已有注册调用）': 'ensure schema is registered (registration call exists in index.ts)',
  'getPluginSchema 应返回已注册的 schema': 'getPluginSchema should return registered schema',
  'getTemplate 应返回与 getPluginSchema 相同的结果': 'getTemplate should return the same result as getPluginSchema',
  'hasPluginSchema 应对已注册的 schema 返回 true': 'hasPluginSchema should return true for registered schema',
  'hasPluginSchema 应对未注册的 schema 返回 false': 'hasPluginSchema should return false for unregistered schema',
  'getPluginSchema 应对未注册类型返回 null': 'getPluginSchema should return null for unregistered type',
  'getTemplate 应对未注册类型返回 null': 'getTemplate should return null for unregistered type',
  'getPropsPath 应对未设置 propsPath 的 schema 返回 undefined': 'getPropsPath should return undefined for schema without propsPath',
  'getDefaultValueFactory 应返回默认值工厂': 'getDefaultValueFactory should return default value factory',
  '有 defaultValue 的字段应有值': 'fields with defaultValue should have a value',
  'pageName 没有 defaultValue（required），不应有值': 'pageName has no defaultValue (required), should have no value',
  'unregisterPluginSchema 应正确移除 schema': 'unregisterPluginSchema should correctly remove schema',
  'getAllPluginSchemas 应包含已注册的 schema': 'getAllPluginSchemas should include registered schema',
  'PageBrowserPlugin — optionsProvider 运行时解析': 'PageBrowserPlugin — optionsProvider runtime resolution',
  'optionsProvider 字符串 "pageStore.pages" 应能被解析': 'optionsProvider string "pageStore.pages" should be resolvable',
  'pageStore.pages 应提供模拟的页面列表': 'pageStore.pages should provide a mocked page list',
  '动态Import以获取 mocked usePageStore': 'Dynamic import to get mocked usePageStore',
  'pageStore.pages 中的每个页面应有 name 和 id': 'each page in pageStore.pages should have name and id',
  'optionsProvider 解析结果应可映射为 { value, label } 格式': 'optionsProvider resolution result should be mappable to { value, label } format',

  // === ThreeInfrastructure.test.ts ===
  'P3-1.9: Three.js 基础设施单元测试': 'P3-1.9: Three.js infrastructure unit test',
  '测试 ThreeSceneManager / CameraController / ThreeStagePlugin / ThreeRenderer。': 'Tests ThreeSceneManager / CameraController / ThreeStagePlugin / ThreeRenderer.',
  '由于 three 是可选 peerDependency，测试中使用 mock 模拟 Three.js 核心类。': 'Since three is an optional peerDependency, mocks are used to simulate Three.js core classes.',
  'P3-1.9 Three.js 基础设施测试': 'P3-1.9 Three.js infrastructure test',
  '应是单例模式': 'should be a singleton',
  'initial state未初始化': 'initial state should be uninitialized',
  'reset 应清理实例': 'reset should clean up instance',
  'init 应创建 WebGLRenderer 和 canvas': 'init should create WebGLRenderer and canvas',
  '重复 init 应直接返回': 'repeated init should return directly',
  'registerScene 应注册场景条目': 'registerScene should register a scene entry',
  'unregisterScene 应移除场景条目': 'unregisterScene should remove a scene entry',
  '未初始化时 registerScene 应输出警告': 'registerScene should warn when uninitialized',
  'resize 应更新渲染器和所有相机宽高比': 'resize should update renderer and all camera aspect ratios',
  'destroy 应清理所有资源': 'destroy should clean up all resources',
  'getCanvas 应返回 canvas 元素': 'getCanvas should return canvas element',
  '应正确初始化': 'should initialize correctly',
  '可禁用/启用': 'should be toggleable disable/enable',
  'setTarget 应设置目标点': 'setTarget should set the target point',
  'setPosition 应从 3D 坐标反算球坐标': 'setPosition should calculate spherical coordinates from 3D coordinates',
  'lookAt 应设置目标并更新相机': 'lookAt should set target and update camera',
  'zoom 应调整球坐标半径': 'zoom should adjust spherical coordinate radius',
  'zoom 不应违反 minDistance 约束': 'zoom should not violate minDistance constraint',
  'zoom 不应违反 maxDistance 约束': 'zoom should not violate maxDistance constraint',
  'update 应调用相机更新': 'update should call camera update',
  'attach 应绑定 DOM 事件': 'attach should bind DOM events',
  'detach 应解绑 DOM 事件': 'detach should unbind DOM events',
  'dispose 应清理资源': 'dispose should clean up resources',

  // === CanvasRulers.test.ts ===
  '组件定义': 'Component definition',
  '应成功Import组件': 'should import component successfully',
  '应有组件名称': 'should have a component name',
  '应定义必需的 props': 'should define required props',
  '应定义可选 props 及默认值': 'should define optional props and default values',

  // === ViewportManagement.test.ts ===
  '视口管理': 'Viewport management',
  '画布视口应正确响应容器尺寸变化': 'canvas viewport should respond correctly to container resize',
  '缩放至合适': 'Zoom to fit',
  '缩放至 100%': 'Zoom to 100%',
  '缩放至 200%': 'Zoom to 200%',
  '滚轮缩放': 'Scroll wheel zoom',
  '平移拖拽': 'Pan drag',
  '在视口中拖拽时应正确平移': 'dragging in the viewport should pan correctly',
  'transform 矩阵不变化说明未平移': 'transform matrix unchanged means no pan',
  '键盘方向键/快捷键平移': 'Keyboard arrow keys/shortcut pan',
  '代码修改视口偏移量': 'Code modifies viewport offset',
  '缩放限制': 'Zoom limits',
  '缩放超出限制时应被 clamp': 'zoom should be clamped when exceeding limits',
  '缩放至合适（fit to page）': 'Zoom to fit (fit to page)',

  // === useGraphic.test.ts ===
  'useGraphic 组合式函数': 'useGraphic composable',
  '基本功能': 'Basic functionality',
  '基本图形操作': 'Basic graphic operations',
  '图形选中状态': 'Graphic selection state',
  '图形编辑模式': 'Graphic editing mode',

  // === schema-generator.test.ts ===
  'Schema 生成器': 'Schema generator',
  '应能为简单字段生成 schema': 'should generate schema for simple fields',
  '应能为嵌套对象生成 schema': 'should generate schema for nested objects',
  '应能处理数组类型': 'should handle array types',
  '应能处理枚举类型': 'should handle enum types',
  '应能处理可选字段': 'should handle optional fields',
  '应能处理复合类型': 'should handle complex types',
  '应能正确处理循环引用': 'should handle circular references correctly',
};

// Regex patterns for Chinese text
const CHINESE_PATTERNS = [
  // Comments: // 中文
  { regex: /\/\/\s*(.+[\u4e00-\u9fff\u3400-\u4dbf].*)/g, replace: (match, text) => `// ${translateText(text)}` },
  // it('...', ...) or it(`...`, ...)
  { regex: /(it|it\.only|it\.skip|it\.todo)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  // describe('...', ...)
  { regex: /(describe|describe\.only|describe\.skip)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  // Error messages
  { regex: /(?:rejects\.toThrow|toThrow|throw new Error)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => match.replace(text, translateText(text)) },
  // String variables: '中文' or `中文`
  { regex: /(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\1/g, replace: (match, quote, text) => `'${translateText(text)}'` },
];

function translateText(text) {
  // Try exact match first
  if (EXTRA_TRANSLATIONS[text]) {
    return EXTRA_TRANSLATIONS[text];
  }
  
  // Try partial matching
  for (const [cn, en] of Object.entries(EXTRA_TRANSLATIONS)) {
    if (text.includes(cn)) {
      return text.replace(cn, en);
    }
  }
  
  return text;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const pattern of CHINESE_PATTERNS) {
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
    console.error(`Error processing ${filePath}: ${err.message}`);
    return false;
  }
}

function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.spec.tsx') ||
      entry.name.endsWith('.spec.js') ||
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.test.tsx') ||
      entry.name.endsWith('.test.js')
    ) {
      results.push(fullPath);
    }
  }
  
  return results;
}

const testFiles = findTestFiles(PACKAGES_DIR);
console.log(`Found ${testFiles.length} test files`);

let translatedCount = 0;
for (const file of testFiles) {
  // Skip node_modules
  if (file.includes('node_modules')) continue;
  
  const wasModified = processFile(file);
  if (wasModified) {
    translatedCount++;
    console.log(`✓ Translated: ${path.relative(PACKAGES_DIR, file)}`);
  }
}

console.log(`\nDone! ${translatedCount} files were translated.`);