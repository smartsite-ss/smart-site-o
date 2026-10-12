// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Aggressive final pass - handles ALL remaining Chinese in all test files.
 * Uses multiple strategies in sequence to catch everything.
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// Massive dictionary of Chinese -> English translations
const DICT = {
  // === all-features.test.ts remaining ===
  '测试用的空实现': 'empty test implementation',
  '模拟 store 中的选择逻辑': 'simulate store selection logic',
  '取消组合 (Ungroup)': 'Ungroup',
  '应该取消分组并保留图元': 'should ungroup and preserve graphics',
  '取消不存在的分组should not报错': 'ungrouping a non-existent group should not throw',
  'isGroup 应该正确识别分组': 'isGroup should correctly identify groups',
  '组合图元空间变换': 'Group graphic spatial transformations',
  'moveGroup 应该移动组内所有图元': 'moveGroup should move all graphics in the group',
  'scaleGroup 应该缩放组内所有图元': 'scaleGroup should scale all graphics in the group',
  'rotateGroup 应该旋转组内所有图元': 'rotateGroup should rotate all graphics in the group',
  'getGroupBounds 应该返回正确的组合边界框': 'getGroupBounds should return the correct group bounding box',
  '组合图元选择行为': 'Group graphic selection behavior',
  '组合后组内图元应该处于选中状态': 'graphics in the group should be selected after grouping',
  '点击组内图元应该选中整个组': 'clicking a graphic in the group should select the entire group',
  '进入组编辑模式后应该可以选择单个图元': 'should be able to select individual graphics after entering group edit mode',
  '退出组编辑模式后应该恢复正常选择行为': 'should restore normal selection behavior after exiting group edit mode',
  'toggleGroupEditMode 应该切换组编辑模式': 'toggleGroupEditMode should toggle group edit mode',
  '组合图元增减成员': 'Group graphic member management',
  'addToGroup 应该将图元添加到组合': 'addToGroup should add a graphic to the group',
  'removeFromGroup 应该从组合中移除图元': 'removeFromGroup should remove a graphic from the group',

  // === ContextMenu.test.ts ===
  '// 暂时简化测试，因为组件测试比较复杂': '// Temporarily simplified test due to component test complexity',
  '// 我们可以在后续完善': '// We can improve this later',
  "it('should have the component file'": "it('should have the component file'",
  '// 测试存在性，实际功能测试待后续完善': '// Test existence, actual functionality tests to be improved later',

  // === CommonContextMenu.test.ts ===
  '通用右键菜单': 'CommonContextMenu',
  '右键菜单组件测试': 'ContextMenu component tests',

  // === TransformHandles.test.ts ===
  'TransformHandles 组件': 'TransformHandles component',
  '渲染测试': 'Render test',
  '交互测试': 'Interaction test',
  '边界情况': 'Edge cases',
  '缩放手柄渲染': 'Scale handle rendering',
  '旋转手柄渲染': 'Rotate handle rendering',
  '变换操作': 'Transform operation',

  // === CanvasRulers.test.ts ===
  '标尺组件测试': 'Ruler component tests',
  '水平标尺渲染': 'Horizontal ruler rendering',
  '垂直标尺渲染': 'Vertical ruler rendering',
  '标尺交互': 'Ruler interaction',

  // === RulerUtils.test.ts ===
  '标尺工具函数': 'Ruler utility functions',
  '坐标转换': 'Coordinate conversion',
  '单位换算': 'Unit conversion',

  // === PluginLayerManager.test.ts ===
  '插件图层管理器': 'Plugin layer manager',
  '图层操作': 'Layer operations',
  '图层排序': 'Layer sorting',

  // === DataPanel.test.ts ===
  '数据面板': 'Data panel',
  '数据绑定': 'Data binding',
  '数据源配置': 'Data source configuration',

  // === ConfigTab.test.ts ===
  '配置选项卡': 'Config tab',
  '选项卡切换': 'Tab switching',
  '配置项渲染': 'Config item rendering',

  // === useVirtualList.test.ts ===
  '虚拟列表': 'Virtual list',
  '基础渲染': 'Basic rendering',
  '滚动性能': 'Scrolling performance',

  // === useGraphic.test.ts ===
  '图元操作': 'Graphic operations',
  '选中状态': 'Selection state',
  '属性修改': 'Property modification',

  // === schema-generator.test.ts ===
  'Schema 生成器': 'Schema generator',
  '基础类型生成': 'Basic type generation',
  '嵌套对象生成': 'Nested object generation',
  '数组类型生成': 'Array type generation',
  '枚举类型生成': 'Enum type generation',

  // === ThemeMatrix.test.ts ===
  '主题矩阵': 'Theme matrix',
  '主题切换': 'Theme switching',
  '颜色变量': 'Color variables',

  // === SchemaValidator.test.ts ===
  'Schema 校验器': 'Schema validator',
  '必填字段校验': 'Required field validation',
  '类型校验': 'Type validation',

  // === I18nCoverage.test.ts ===
  '国际化覆盖': 'Internationalization coverage',
  '翻译键检查': 'Translation key check',
  '语言包完整性': 'Language pack completeness',

  // === I18nProvider.test.ts ===
  '国际化提供者': 'I18n provider',
  '语言切换': 'Language switching',
  '翻译函数': 'Translation function',

  // === PipePathPlugin.test.ts ===
  '管道路径插件': 'Pipe path plugin',
  '路径计算': 'Path calculation',
  '路径渲染': 'Path rendering',

  // === ws-store.test.ts ===
  'WebSocket 存储': 'WebSocket store',
  '连接管理': 'Connection management',
  '消息处理': 'Message handling',

  // === template.store.test.ts ===
  '模板存储': 'Template store',
  '模板管理': 'Template management',
  '模板渲染': 'Template rendering',

  // === i18n-validation.test.ts ===
  '国际化验证': 'I18n validation',
  '翻译完整性': 'Translation completeness',
  '键值一致性': 'Key-value consistency',

  // === index.test.ts (create-plugin) ===
  '插件创建': 'Plugin creation',
  '模板生成': 'Template generation',
  '文件结构': 'File structure',

  // === BasePlugin.test.ts ===
  '基础插件测试': 'Base plugin tests',
  '插件生命周期': 'Plugin lifecycle',
  '插件初始化': 'Plugin initialization',

  // === decorators.test.ts ===
  '装饰器测试': 'Decorator tests',
  '属性装饰器': 'Property decorator',
  '方法装饰器': 'Method decorator',

  // === DrawContext.test.ts ===
  '绘制上下文': 'Draw context',
  '绘制状态管理': 'Draw state management',
  '画布操作': 'Canvas operations',

  // === keyboard.service.test.ts ===
  '键盘服务': 'Keyboard service',
  '快捷键注册': 'Shortcut registration',
  '快捷键触发': 'Shortcut trigger',

  // === keyboard.service-extra.test.ts ===
  '键盘服务扩展': 'Keyboard service extras',
  '组合键': 'Combination keys',

  // === LayerManager.test.ts ===
  '图层管理器': 'Layer manager',
  '图层顺序': 'Layer order',
  '图层可见性': 'Layer visibility',

  // === LayoutManager.test.ts ===
  '布局管理器': 'Layout manager',
  '自动布局': 'Auto layout',
  '对齐方式': 'Alignment',

  // === Project.test.ts ===
  '项目管理': 'Project management',
  '页面管理': 'Page management',
  '项目导入导出': 'Project import/export',

  // === theme.test.ts ===
  '主题管理': 'Theme management',
  '主题应用': 'Theme application',

  // === ViewportManager.test.ts ===
  '视口管理器': 'Viewport manager',
  '视口变换': 'Viewport transform',
  '缩放操作': 'Zoom operations',

  // === KonvaRenderer.test.ts ===
  'Konva 渲染器': 'Konva renderer',
  '渲染性能': 'Render performance',
  '图形渲染': 'Graphic rendering',

  // === ClipboardManager.test.ts ===
  '剪贴板管理器': 'Clipboard manager',
  '复制粘贴': 'Copy and paste',

  // === copy-paste-flow.test.ts ===
  '复制粘贴流程': 'Copy-paste flow',
  '跨页面复制': 'Cross-page copy',

  // === GraphicDecorator.test.ts ===
  '图形装饰器': 'Graphic decorator',
  '装饰器渲染': 'Decorator rendering',

  // === GraphicFactory.test.ts ===
  '图形工厂': 'Graphic factory',
  '图形注册': 'Graphic registration',
  '图形创建': 'Graphic creation',

  // === GroupManager.test.ts ===
  '组合管理器': 'Group manager',
  '组合操作': 'Group operations',

  // === HistoryManager.test.ts ===
  '历史记录管理器': 'History manager',
  '撤销重做': 'Undo and redo',
  '历史记录栈': 'History stack',

  // === HistoryManager-extra.test.ts ===
  '历史记录扩展': 'History manager extras',
  '批量操作历史': 'Batch operation history',

  // === SelectionManager-extra.test.ts ===
  '选择管理器扩展': 'Selection manager extras',
  '多选操作': 'Multi-selection',

  // === SmartAlignManager.test.ts ===
  '智能对齐管理器': 'Smart align manager',
  '对齐分布': 'Align and distribute',

  // === graphic.store.test.ts ===
  '图形存储': 'Graphic store',
  '状态管理测试': 'State management tests',

  // === benchmark.test.ts ===
  '性能基准测试': 'Performance benchmark test',
  '渲染性能基准': 'Render performance benchmark',

  // === complete-workflow.test.ts ===
  '完整工作流测试': 'Complete workflow test',
  '创建页面': 'Create page',
  '添加图元': 'Add graphic',
  '编辑属性': 'Edit properties',
  '保存项目': 'Save project',

  // === scenario-test.test.ts ===
  '场景测试': 'Scenario test',
  '用户操作模拟': 'User operation simulation',

  // === DataSourceTypes.test.ts ===
  '数据源类型': 'Data source types',
  '类型定义': 'Type definitions',

  // === DataSourceManager.test.ts ===
  '数据源管理器': 'Data source manager',
  '注册注销': 'Register and unregister',

  // === ExpressionTrigger.test.ts ===
  '表达式触发器': 'Expression trigger',
  '触发条件': 'Trigger conditions',

  // === RealtimeEngine.test.ts ===
  '实时引擎': 'Realtime engine',
  '数据刷新': 'Data refresh',

  // === ScriptEngine.test.ts ===
  '脚本引擎': 'Script engine',
  '脚本执行': 'Script execution',

  // === TaskScheduler.test.ts ===
  '任务调度器': 'Task scheduler',
  '定时任务': 'Scheduled tasks',

  // === timerUtils.test.ts ===
  '定时器工具': 'Timer utilities',

  // === QualityPropagator.test.ts ===
  '数据质量标记 - TDD': 'Data quality marking - TDD',
  '视觉反馈': 'Visual feedback',
  'Quality Propagation规则': 'Quality Propagation rules',

  // === ExpressionEngine.test.ts remaining ===
  '基本运算': 'Basic arithmetic',
  '逻辑与比较运算': 'Logical and comparison operations',
  '条件表达式': 'Conditional expressions',
  '函数调用': 'Function calls',
  '表达式编译': 'Expression compilation',
  '依赖分析': 'Dependency analysis',

  // === eventBus-singleton.test.ts remaining ===
  '// LayerPanel 从 platform/event/EventBus Import eventBus': '// LayerPanel imports eventBus from platform/event/EventBus',
  '// BasePage 从 utils/event/eventBus Import eventBus': '// BasePage imports eventBus from utils/event/eventBus',
  '// 模拟 LayerPanel 注册监听': '// Simulate LayerPanel registering listener',
  '// 模拟 BasePage 添加图元后发出事件': '// Simulate BasePage emitting event after adding graphic',

  // === graphic.store.blackbox.test.ts remaining ===
  '🧪 ss-editor 黑盒测试 — 插件新增/修改/删除/复制/粘贴/数据绑定/事件/样式/动画/批量': 'ss-editor blackbox test — Graphic add/modify/delete/copy/paste/data-binding/events/styles/animation/batch',
  'copyStyle should copy制源图元样式': 'copyStyle should copy source graphic style',
  'pasteStyle should paste贴样式到目标图元': 'pasteStyle should paste style to target graphic',
  'resetStyle 应重置为类型默认值': 'resetStyle should reset to type default',
  '插件新增/change 黑盒测试 (graphic.store)': 'Graphic add/change blackbox test (graphic.store)',
  'copy 后追加图元': 'append graphics after copy',
  '应偏移位置': 'should offset position',
  '应从页面移除并可通过 paste 恢复': 'should remove from page and be restorable via paste',

  // === CanvasRulerUtils.test.ts remaining ===
  '返回': 'returns',
  '标准视图': 'standard view',
  '含微刻度 micro=1': 'with micro-tick micro=1',
  '超精密模式': 'ultra-precision mode',
  '落入第一个分支返回': 'falls into first branch returns',
  '极大值': 'extreme value',
  '落入最后一个分支返回': 'falls into last branch returns',
  '默认 PX 单位返回四舍五入整数字符串': 'default PX unit returns rounded integer string',
};

function translateText(text) {
  if (DICT[text]) return DICT[text];
  let result = text;
  // Longest match first
  const entries = Object.entries(DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [cn, en] of entries) {
    if (result.includes(cn)) {
      result = result.replace(new RegExp(cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
    }
  }
  return result;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Strategy 1: Direct dictionary replacements on the entire content
    const entries = Object.entries(DICT).sort((a, b) => b[0].length - a[0].length);
    for (const [cn, en] of entries) {
      const escaped = cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(escaped, 'g'), en);
    }

    // Strategy 2: Handle Chinese in it()/describe() with mixed Chinese/English
    content = content.replace(/(it|describe|it\.only|it\.skip|describe\.only|describe\.skip)\s*\((['"`])([^'"`]*?[\u4e00-\u9fff\u3400-\u4dbf][^'"`]*?)\2/g, (match, fn, quote, text) => {
      const translated = translateText(text);
      if (translated !== text) {
        return `${fn}('${translated}'`;
      }
      // Try replacing any remaining Chinese characters individually
      const newText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => translateText(cn) || cn);
      if (newText !== text) {
        return `${fn}('${newText}'`;
      }
      return match;
    });

    // Strategy 3: Handle Chinese in comments (including inline)
    content = content.replace(/\/\/\s*([\u4e00-\u9fff\u3400-\u4dbf].*)/g, (match, text) => {
      const translated = translateText(text);
      if (translated !== text) return `// ${translated}`;
      const newText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => translateText(cn) || cn);
      return `// ${newText}`;
    });

    // Strategy 4: Handle remaining Chinese comments (with English prefix)
    content = content.replace(/\/\/\s*(.*[\u4e00-\u9fff\u3400-\u4dbf].*)/g, (match) => {
      return match.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => translateText(cn) || cn);
    });

    // Strategy 5: Handle Chinese in JSDoc
    content = content.replace(/(\*\s*)([\u4e00-\u9fff\u3400-\u4dbf].*)/g, (match, prefix, text) => {
      const translated = translateText(text);
      if (translated !== text) return prefix + translated;
      const newText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => translateText(cn) || cn);
      return prefix + newText;
    });

    // Strategy 6: Handle Chinese in any remaining strings
    content = content.replace(/(['"`])([^'"`]*?[\u4e00-\u9fff\u3400-\u4dbf][^'"`]*?)\1/g, (match, quote, text) => {
      // Don't touch strings that are clearly code identifiers or test data
      if (text.includes('°C') || text.includes('°F')) return match;
      const translated = translateText(text);
      if (translated !== text) return `'${translated}'`;
      const newText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => translateText(cn) || cn);
      if (newText !== text) return `'${newText}'`;
      return match;
    });

    // Strategy 7: Last resort - replace all remaining isolated Chinese chars
    content = content.replace(/([\u4e00-\u9fff\u3400-\u4dbf])/g, (match) => {
      const t = translateText(match);
      return t !== match ? t : match;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${path.relative(PACKAGES_DIR, filePath)}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    return false;
  }
}

// Find all test files
function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') results.push(...findTestFiles(fullPath));
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

console.log('=== Aggressive final Chinese translation pass ===\n');

const testFiles = findTestFiles(PACKAGES_DIR);
let fixed = 0;
let chineseCount = 0;

for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (/[\u4e00-\u9fff]/.test(content)) {
    chineseCount++;
    if (processFile(file)) fixed++;
  }
}

console.log(`\nDone! Fixed ${fixed} files out of ${chineseCount} with Chinese.`);

// Final verification
let remaining = 0;
for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (/[\u4e00-\u9fff]/.test(content)) {
    remaining++;
    if (remaining <= 5) {
      const rel = path.relative(PACKAGES_DIR, file);
      // Show the first line with Chinese
      const match = content.match(/[^\n]*[\u4e00-\u9fff][^\n]*/);
      console.log(`  Remaining: ${rel} -> ${match ? match[0].trim().substring(0, 80) : ''}`);
    }
  }
}
console.log(`\nFiles still with Chinese: ${remaining}`);