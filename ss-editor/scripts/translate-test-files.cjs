// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Script to translate Chinese text in test files to English.
 * Run: node scripts/translate-test-files.js
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// Comprehensive Chinese-to-English translation mapping
const TRANSLATIONS = {
  // === Common test descriptions ===
  '脏状态（dirty）管理': 'dirty state management',
  '基础 dirtry 方法': 'Basic dirty methods',
  '图元 CRUD 自动标记 dirty': 'Graphic CRUD auto mark dirty',
  '图层操作自动标记 dirty': 'Layer operations auto mark dirty',
  '组合操作自动标记 dirty': 'Group operations auto mark dirty',
  '对齐/分布/批量操作自动标记 dirty': 'Align/Distribute/Batch operations auto mark dirty',
  '历史操作自动标记 dirty': 'History operations auto mark dirty',
  '页面属性修改自动标记 dirty': 'Page property modifications auto mark dirty',
  'openPages 响应式追踪 dirty': 'openPages reactively tracks dirty',
  '图形 store 辅助函数标记 dirty': 'Graphic store utility functions mark dirty',
  '保存后清除 dirty': 'Clear dirty after save',

  // === FormatPainterManager ===
  '状态管理': 'State management',
  'pickStyle - 拾取样式': 'pickStyle - Pick style',
  'paintStyle - 涂抹样式（同类图元）': 'paintStyle - Paint style (same type)',
  'paintStyle - 涂抹样式（异类图元）': 'paintStyle - Paint style (different type)',
  'applyFormat - 完整交互流程': 'applyFormat - Complete interaction flow',

  // === SaveServiceManager error messages ===
  'SaveService 未初始化，请先调用 init()': 'SaveService is not initialized, please call init() first',
  'server 模式需要配置 apiBaseUrl': 'Server mode requires apiBaseUrl configuration',
  '保存失败: ': 'Save failed: ',
  '加载失败: ': 'Load failed: ',
  '删除失败: ': 'Delete failed: ',

  // === E2E Design Workflow ===
  'E2E: 设计工作流': 'E2E: Design Workflow',
  'TC-E2E-001: 创建项目 → 添加页面 → 添加图形 → 保存': 'TC-E2E-001: Create project → Add page → Add graphics → Save',
  'TC-E2E-002: 加载项目 → 编辑图形 → 撤销/重做 → 保存': 'TC-E2E-002: Load project → Edit graphics → Undo/Redo → Save',
  'TC-E2E-003: 选择图形 → 复制 → 粘贴 → 删除': 'TC-E2E-003: Select graphics → Copy → Paste → Delete',
  'TC-E2E-004: 图层操作 → 排序 → 分组 → 取消分组': 'TC-E2E-004: Layer operations → Reorder → Group → Ungroup',
  'TC-E2E-005: 导出项目 → 导入项目 → 验证数据完整性': 'TC-E2E-005: Export project → Import project → Verify data integrity',
  '边界情况': 'Edge cases',

  '初始状态 dirty 应为 false': 'initial dirty should be false',
  'markDirty 应将 dirty 设为 true': 'markDirty should set dirty to true',
  'clearDirty 应将 dirty 恢复为 false': 'clearDirty should reset dirty to false',
  'setter 方式设置 dirty 应生效': 'setter-based dirty assignment should work',
  'addGraphic 后 should mark dirty': 'addGraphic should mark dirty',
  'removeGraphic 后 should mark dirty': 'removeGraphic should mark dirty',
  'moveGraphic 后 should mark dirty': 'moveGraphic should mark dirty',
  'updateGraphic 后 should mark dirty': 'updateGraphic should mark dirty',
  'duplicateGraphic 后 should mark dirty': 'duplicateGraphic should mark dirty',
  'importGraphics 后 should mark dirty': 'importGraphics should mark dirty',
  'bringToFront 后 should mark dirty': 'bringToFront should mark dirty',
  'sendToBack 后 should mark dirty': 'sendToBack should mark dirty',
  'lockGraphic 后 should mark dirty': 'lockGraphic should mark dirty',
  'hideGraphic 后 should mark dirty': 'hideGraphic should mark dirty',
  'createGroup 后 should mark dirty': 'createGroup should mark dirty',
  'ungroup 后 should mark dirty': 'ungroup should mark dirty',
  'alignGraphics 后 should mark dirty': 'alignGraphics should mark dirty',
  'distributeGraphics 后 should mark dirty': 'distributeGraphics should mark dirty',
  'batchEdit 后 should mark dirty': 'batchEdit should mark dirty',
  'undo 后 should mark dirty': 'undo should mark dirty',
  'redo 后 should mark dirty': 'redo should mark dirty',
  'updatePageProperties 后 should mark dirty': 'updatePageProperties should mark dirty',
  'openPages 应追踪 page.dirty 变化': 'openPages should track page.dirty changes',
  'clearDirty 后 openPages 应反映状态变化': 'openPages should reflect state changes after clearDirty',
  'addGraphic 通过 store 后 dirty 应为 true': 'addGraphic via store should set dirty to true',
  'removeGraphic 通过 store 后 dirty 应为 true': 'removeGraphic via store should set dirty to true',
  'applyStyle 应标记 dirty': 'applyStyle should mark dirty',
  'applyProperty 应标记 dirty': 'applyProperty should mark dirty',
  'clearDirty 应在保存流程中被调用': 'clearDirty should be called in the save flow',

  // Initial state
  '初始状态应为 idle': 'initial state should be idle',
  'activate() 无选中图元时进入 pick 模式': 'activate() without selected graphic enters pick mode',
  'activate() 有选中图元时直接拾取并进入 paint 模式': 'activate() with selected graphic picks and enters paint mode',
  'deactivate() 应重置所有状态': 'deactivate() should reset all state',
  'onModeChange 回调应正确触发': 'onModeChange callback should fire correctly',
  '应复制源图元的 style': 'should copy style from source graphic',
  '应复制源图元的 customProps': 'should copy customProps from source graphic',
  'pickStyle 后进入 paint 模式': 'pickStyle should enter paint mode',
  '应涂抹 style 到同类图元': 'should paint style to same-type graphic',
  '应完整复制 customProps 到同类图元': 'should fully copy customProps to same-type graphic',
  '涂抹同类图元时不应删除目标已有的 customProps 字段': 'should not delete existing customProps fields when painting same type',
  '应仅复制名称相同的 customProps 字段': 'should only copy customProps fields with the same name',
  '异类图元无共同字段时应跳过 customProps 复制': 'should skip customProps copy when different types have no common fields',
  'paint 模式下应涂抹样式到目标图元': 'should paint style to target graphic in paint mode',
  'paint 模式下多次涂抹应保持状态': 'should maintain state after multiple paint operations in paint mode',
  'deactivate 后 applyFormat 不应生效': 'applyFormat should not work after deactivate',
  '拾取样式后应返回源图元信息': 'should return source graphic info after picking style',
  '未拾取时应返回 null': 'should return null when no style has been picked',
  '应重置状态并清除回调': 'should reset state and clear callbacks',

  // === E2E Data Binding Workflow ===
  'E2E: 数据绑定工作流': 'E2E: Data Binding Workflow',
  'TC-E2E-010: 创建数据源 → 绑定标签到图形 → 启动数据模拟 → 验证图形更新': 'TC-E2E-010: Create data source → Bind tags to graphics → Start data simulation → Verify graph updates',
  'TC-E2E-011: 配置告警 → 触发告警 → 验证告警通知': 'TC-E2E-011: Configure alarm → Trigger alarm → Verify alarm notification',
  'TC-E2E-012: 脚本执行 → 数据转换 → 验证输出': 'TC-E2E-012: Script execution → Data transformation → Verify output',
  'TC-E2E-013: 任务调度器 → 调度任务 → 执行 → 验证结果': 'TC-E2E-013: Task scheduler → Schedule task → Execute → Verify result',
  '边界情况与错误路径': 'Edge cases and error paths',

  '应能绑定数据标签到图形': 'should bind data tags to a graphic',
  '应能解除数据绑定': 'should unbind data',
  '应能对多个图形绑定不同数据源': 'should bind different data sources to multiple graphics',
  '数据模拟应能加载场景': 'data simulation should load a scenario',
  '数据模拟应能启动和暂停': 'data simulation should start and pause',
  '数据模拟应能停止并重置': 'data simulation should stop and reset',
  '数据模拟应能逐步执行': 'data simulation should execute step by step',
  '数据模拟循环模式应在最后一步后回到第一步': 'data simulation loop mode should go back to first step after last step',
  '应能跳转到指定步骤': 'should go to a specific step',
  '应能设置模拟速度': 'should set simulation speed',
  '应能清除模拟场景': 'should clear simulation scenario',
  '应能添加事件处理器到图形': 'should add an event handler to a graphic',
  '应能添加动作到事件处理器': 'should add an action to the event handler',
  '应能删除事件处理器': 'should delete an event handler',
  '应能删除动作': 'should delete an action',
  '应能触发事件处理器': 'should trigger an event handler',
  '应能注册脚本': 'should register a script',
  '应能执行简单脚本并返回结果': 'should execute a simple script and return results',
  '应能执行数据转换脚本': 'should execute a data transformation script',
  '应能使用脚本 API 进行数据变换': 'should use Script API for data transformation',
  '应能处理脚本执行错误': 'should handle script execution errors',
  '应能使用 Math 内置函数': 'should use Math built-in functions',
  '应能用于告警判断脚本': 'should work as alarm judgment script',
  '应能注销脚本': 'should unregister a script',
  '应能通过脚本 store 执行脚本': 'should execute a script through the script store',
  '应能调度 Cron 任务': 'should schedule a Cron task',
  '应能获取所有调度任务': 'should get all scheduled tasks',
  '应能按脚本 ID 获取调度任务': 'should get scheduled tasks by script ID',
  '应能暂停和恢复任务': 'should pause and resume tasks',
  '应能取消任务': 'should cancel a task',
  'Cron 表达式 * * * * * 应每分钟执行': 'Cron expression * * * * * should execute every minute',
  '指定分钟的 Cron 表达式应正确计算': 'Cron expression with specified minute should calculate correctly',
  '绑定不存在的图形不应抛异常': 'binding data to a non-existent graphic should not throw',
  '解除绑定不存在的图形不应抛异常': 'unbinding data from a non-existent graphic should not throw',
  '空场景不应有进度': 'empty scenario should have no progress',
  '加载空场景不应崩溃': 'loading an empty scenario should not crash',
  '无场景时不应启动模拟': 'should not start simulation without a scenario',
  '最小值 0.1': 'Minimum value 0.1',
  '最后一步后应停止': 'Should stop after last step',
  '设置 tagValues 到 engine 中': 'Set tagValues in the engine',
  '使用 eventType 作为 key 来添加动作': 'Use eventType as key to add action',
  '使用 eventType 作为 key 来删除事件': 'Use eventType as key to delete event',
  '触发事件不应崩溃': 'Triggering event should not crash',

  // === Helper comments ===
  'Mock 图形工厂': 'Mock Graphic Factory',
  'Mock 存储服务': 'Mock Storage Service',
  '辅助函数：创建模拟图形': 'Helper function: create mock graphic',
  '导入 stores': 'Import stores',
  '导入真实引擎': 'Import real engines',
  '测试套件': 'Test suite',
  '设置 mockGraphicFactoryCreate 的默认行为': 'Set default behavior for mockGraphicFactoryCreate',
  '重置 mock 存储': 'Reset mock storage',
  '先保存项目': 'Save project first',
  '重置 stores': 'Reset stores',
  '加载项目': 'Load project',
  '选中两个图形': 'Select two graphics',
  '先选中图元': 'Select graphics first',
  '确认初始状态': 'Verify initial state',
  '修改 dirty 后，openPages 应返回新数组（触发响应式更新）': 'After modifying dirty, openPages should return a new array (trigger reactive update)',
  '清除 dirty 模拟初始状态': 'Clear dirty to simulate initial state',
  '模拟保存成功后的清理': 'Simulate cleanup after successful save',

  // === Design Workflow it descriptions ===
  '应能创建新页面': 'should create a new page',
  '应能创建页面并添加图形': 'should create a page and add graphics',
  '应能添加多种类型的图形': 'should add multiple types of graphics',
  '应能保存项目': 'should save the project',
  '应能加载已保存的项目': 'should load a saved project',
  '加载不存在的项目索引应返回 false': 'loading a non-existent project index should return false',
  '应能编辑图形属性': 'should edit graphic properties',
  '应能批量编辑图形（不抛异常）': 'should batch edit graphics (no throw)',
  '应能删除项目': 'should delete a project',
  '删除不存在的项目索引应返回 false': 'deleting a non-existent project index should return false',
  '应能选择图形': 'should select a graphic',
  '应能多选图形': 'should multi-select graphics',
  '应能切换图形选择状态': 'should toggle graphic selection',
  'addGraphic 已自动选中图形，先清除选择': 'addGraphic auto-selects the graphic, first clear selection',
  '应能删除图形': 'should delete a graphic',
  '删除不存在的图形不应报错': 'deleting a non-existent graphic should not throw',
  '应能复制页面': 'should copy a page',
  '应能创建页面分组': 'should create a page group',
  '应能移动页面到分组': 'should move a page to a group',
  '应能从分组中移除页面': 'should remove a page from a group',
  '应能重命名页面分组': 'should rename a page group',
  '应能删除页面分组': 'should delete a page group',
  '页面应回到未分组状态': 'Pages should return to ungrouped state',
  '应能对页面排序': 'should reorder pages',
  '应能删除页面': 'should delete a page',
  '有多于一个页面才能删除': 'Need more than one page to delete',
  '只有一个页面时不应删除': 'should not delete when only one page exists',
  '确保只有一个页面': 'Ensure only one page',
  '应能导出项目为 JSON': 'should export project as JSON',
  '应能导出项目为 HTML': 'should export project as HTML',
  '导出后导入应保持数据完整性': 'import/export should preserve data integrity',
  '创建项目': 'Create project',
  '导出': 'Export',
  '导入': 'Import',
  '导入空数据不应报错': 'importing empty data should not throw',
  '导入无效 JSON 应能正确处理': 'importing invalid JSON should be handled gracefully',
  '期望可能抛出异常': 'Exception may be thrown',
  '不应崩溃': 'Should not crash',
  '页面名重复检查应正确工作': 'page name duplicate check should work correctly',
  '应能设置页面图标': 'should set page icon',
  '图标设置不应报错': 'Setting icon should not throw',
  '应能获取页面模式': 'should get page mode',
  '应能获取缩放相关配置': 'should get zoom-related config',

  // === E2E test comments ===
  'E2E 测试：设计工作流': 'E2E test: Design Workflow',
  '测试策略：': 'Test strategy:',
  'Mock Pinia stores 和外部依赖（konva, uuid）': 'Mock Pinia stores and external dependencies (konva, uuid)',
  '使用 setActivePinia 创建真实的 Pinia 实例': 'Use setActivePinia to create real Pinia instances',
  '测试完整的设计工作流：创建项目 → 编辑图形 → 撤销重做 → 保存': 'Test the complete design workflow: create project → edit graphics → undo/redo → save',

  // === Canvas2DBackend ===
  '在 jsdom 环境下 ctx 可能为 null，仅验证不抛出异常': 'In jsdom environment, ctx may be null, just verify no exception is thrown',

  // === Other common patterns ===
  '模拟图元对象，用于测试 FormatPainterManager': 'Mock graphic object for testing FormatPainterManager',

  // More...
  '模拟 BaseGraphic.update() 的核心行为：': 'Simulates the core behavior of BaseGraphic.update():',
  '初始状态': 'initial state',
  'Mock 页面管理器': 'Mock Page Manager',
  'Mock StateService': 'Mock StateService',
  'Mock ProjectMigration': 'Mock ProjectMigration',
};

// Regex to match Chinese characters
const CHINESE_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]+/g;

// Special patterns that need careful handling
const SPECIAL_PATTERNS = [
  // Comments: // 中文
  { regex: /\/\/\s*(.+[\u4e00-\u9fff\u3400-\u4dbf].*)/g, replace: (match, text) => `// ${translateText(text)}` },
  // it('...', ...) - test names  
  { regex: /(it|it\.only|it\.skip|it\.todo)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, fn, text) => `${fn}('${translateText(text)}'` },
  // describe('...', ...) - describe blocks
  { regex: /(describe|describe\.only|describe\.skip)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, fn, text) => `${fn}('${translateText(text)}'` },
  // Error messages: throw new Error('...') or reject with '...'
  { regex: /(?:rejects\.toThrow|toThrow|throw new Error)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => match.replace(text, translateText(text)) },
  // String variables: '中文'
  { regex: /'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => `'${translateText(text)}'` },
];
  
function translateText(text) {
  // Try exact match first
  if (TRANSLATIONS[text]) {
    return TRANSLATIONS[text];
  }
  
  // Try partial matching for error messages with dynamic parts
  for (const [cn, en] of Object.entries(TRANSLATIONS)) {
    if (text.includes(cn)) {
      return text.replace(cn, en);
    }
  }
  
  // Return the text unchanged if no translation found
  return text;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply special patterns
    for (const pattern of SPECIAL_PATTERNS) {
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

// Main
const testFiles = findTestFiles(PACKAGES_DIR);
console.log(`Found ${testFiles.length} test files`);

let translatedCount = 0;
for (const file of testFiles) {
  const wasModified = processFile(file);
  if (wasModified) {
    translatedCount++;
    console.log(`✓ Translated: ${path.relative(PACKAGES_DIR, file)}`);
  }
}

console.log(`\nDone! ${translatedCount} files were translated.`);