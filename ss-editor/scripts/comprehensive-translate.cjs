// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Ultra-comprehensive script to translate ALL remaining Chinese in test files.
 * Handles all 58 files that still contain Chinese characters.
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// ===== COMPLETE TRANSLATION DICTIONARY =====
const DICT = {
  // === section markers ===
  '§1 新增 addGraphic': '§1 Add Graphic',
  '§2 删除 removeGraphic': '§2 Remove Graphic',
  '§3 属性change applyProperty': '§3 Property Change (applyProperty)',
  '§4 样式change applyStyle': '§4 Style Change (applyStyle)',
  '§5 样式剪贴板 copyStyle / pasteStyle / resetStyle': '§5 Style Clipboard (copyStyle / pasteStyle / resetStyle)',
  '§5 样式剪贴板': '§5 Style Clipboard',
  '§6 复制 duplicateGraphic': '§6 Duplicate Graphic',
  '§7 剪切板 copy / cut / paste': '§7 Clipboard (copy/cut/paste)',
  '§7 剪切板 copy/cut/paste': '§7 Clipboard (copy/cut/paste)',
  '§8 数据绑定 bindData / unbindData / applyData': '§8 Data Binding (bindData / unbindData / applyData)',
  '§8 数据绑定': '§8 Data Binding',
  '§9 事件 addEvent / removeEvent / addAction / triggerEvent': '§9 Events (addEvent / removeEvent / addAction / triggerEvent)',
  '§9 事件交互': '§9 Event Interaction',
  '§10 动画 addAnimation / removeAnimation': '§10 Animation (addAnimation / removeAnimation)',
  '§10 动画': '§10 Animation',
  '§11 批量操作 batchOperation': '§11 Batch Operation',
  '§12 质量指示器 applyQualityIndicator': '§12 Quality Indicator (applyQualityIndicator)',
  '§12 质量指示器': '§12 Quality Indicator',
  '§13 边界与异常测试': '§13 Boundary & Exception Tests',
  '§13 边界与异常': '§13 Boundary & Exception',
  '§14 批次包装': '§14 Batch Wrapper',
  '§14 批次包装 batchUpdate / batchUpdateSync': '§14 Batch Wrapper (batchUpdate / batchUpdateSync)',

  // === graphic.store.blackbox.test.ts ===
  '🧪 ss-editor 黑盒测试 — 插件新增/修改/删除/复制/粘贴/数据绑定/事件/样式/动画/批量': 'ss-editor blackbox test — Graphic add/modify/delete/copy/paste/data binding/events/styles/animation/batch',
  '覆盖 useGraphicStore 全部公开 API，通过真实 BasePage + BaseGraphic 实例验证。': 'Covers all public APIs of useGraphicStore, verified through real BasePage + BaseGraphic instances.',
  '插件新增/change 黑盒测试 (graphic.store)': 'Graphic add/change blackbox test (graphic.store)',
  '新增 addGraphic': 'Add Graphic',
  '应该创建图元并添加到页面': 'should create a graphic and add it to the page',
  '新增后应自动选中新建图元': 'should auto-select the newly created graphic',
  '多次新增应在页面积累': 'multiple adds should accumulate on the page',
  '新增图元的位置和尺寸正确': 'new graphic position and size should be correct',
  '应能为每种类型赋予唯一 ID': 'should assign a unique ID for each type',
  '不存在的图形类型应抛出错误': 'non-existent graphic type should throw an error',
  '删除 removeGraphic': 'Remove Graphic',
  '应该从页面删除指定图元': 'should remove the specified graphic from the page',
  '删除不存在的 ID Should not crash': 'deleting non-existent ID should not crash',
  '属性change applyProperty': 'Property Change (applyProperty)',
  '应通过点号路径change嵌套属性': 'should change nested properties via dot path',
  '应通过点号路径change深层嵌套属性': 'should change deeply nested properties via dot path',
  'change不存在的路径应自动创建中间对象': 'changing a non-existent path should auto-create intermediate objects',
  '样式change applyStyle': 'Style Change (applyStyle)',
  '应批量应用样式': 'should apply styles in batch',
  'applyStyle 应保留未change的原有属性': 'applyStyle should preserve unchanged properties',
  '复制 duplicateGraphic': 'Duplicate Graphic',
  '应复制图元并选中新图元': 'should duplicate the graphic and select the new one',
  '剪切板 copy/cut/paste': 'Clipboard (copy/cut/paste)',
  'paste 应在 copy 后追加图元': 'paste should append graphics after copy',
  'paste 应偏移位置': 'paste should offset position',
  'cut 应从页面移除并可通过 paste 恢复': 'cut should remove from page and be restorable via paste',
  '数据绑定 bindData / unbindData / applyData': 'Data Binding (bindData / unbindData / applyData)',
  'bindData 应绑定数据源和字段': 'bindData should bind data source and field',
  'unbindData 应解绑': 'unbindData should unbind',
  'applyData 应对绑定图元正常执行': 'applyData should execute normally on bound graphics',
  '事件交互': 'Event Interaction',
  'addEvent 应注册事件处理器': 'addEvent should register an event handler',
  'removeEvent 应删除事件处理器': 'removeEvent should remove an event handler',
  'addAction should be事件添加动作': 'addAction should be adding an action',
  'triggerEvent 应触发满足条件的动作': 'triggerEvent should trigger actions that match conditions',
  'addAnimation 应添加动画到图元': 'addAnimation should add animation to graphic',
  'removeAnimation 应删除指定索引动画': 'removeAnimation should remove animation at specified index',
  '批量操作 batchOperation': 'Batch Operation',
  '应批量执行新增/更新/删除': 'should execute batch add/update/delete',
  '批量新增多个图元': 'should batch add multiple graphics',
  '质量指示器 applyQualityIndicator': 'Quality Indicator (applyQualityIndicator)',
  'good 质量应设置绿色边框': 'good quality should set green border',
  'bad 质量应设置红色边框': 'bad quality should set red border',
  'stale 质量应设置灰色边框': 'stale quality should set gray border',
  '边界与异常': 'Boundary & Exception',
  '对不存在的图元调用 applyProperty Should not crash': 'calling applyProperty on non-existent graphic should not crash',
  '对不存在的图元调用 applyStyle Should not crash': 'calling applyStyle on non-existent graphic should not crash',
  '对不存在的图元调用 bindData Should not crash': 'calling bindData on non-existent graphic should not crash',
  '对不存在的事件触发 triggerEvent Should not crash': 'triggering event on non-existent graphic should not crash',
  '连续新增 200 个图元Should not crash': 'adding 200 graphics consecutively should not crash',
  '批次包装': 'Batch Wrapper',
  'batchUpdate 应在完成后关闭 isBatchOperating': 'batchUpdate should close isBatchOperating after completion',
  'batchUpdateSync 应在完成后关闭 isBatchOperating': 'batchUpdateSync should close isBatchOperating after completion',
  '嵌套 batchUpdate should not提前关闭': 'nested batchUpdate should not close prematurely',
  '复制 (Duplicate)': 'Duplicate',
  '应该创建图元副本': 'should create a copy of the graphic',
  '复制后应该只选中新图元': 'should only select the new graphic after duplication',

  // === eventBus-singleton.test.ts ===
  '测试 EventBus 单例一致性': 'Test EventBus singleton consistency',
  '背景：此前存在两个独立的 EventBus 模块：': 'Background: there were two independent EventBus modules:',
  'platform/event/EventBus.ts 有自己的 Events 枚举和 eventBus 实例': 'platform/event/EventBus.ts had its own Events enum and eventBus instance',
  'utils/event/eventBus.ts 有另一个完整的 Events 枚举和 eventBus 实例': 'utils/event/eventBus.ts had another complete Events enum and eventBus instance',
  'Bug 表现：BasePage/graphic.store 通过 utils 的 eventBus **发**事件，': 'Bug behavior: BasePage/graphic.store emits events via utils eventBus,',
  'LayerPanel 通过 platform 的 eventBus **收**事件 → 事件永远收不到': 'LayerPanel receives events via platform eventBus → events are never received',
  '修复：platform/event/EventBus.ts 改为 `export * from utils/event/eventBus`': 'Fix: platform/event/EventBus.ts changed to `export * from utils/event/eventBus`',
  '确保全局只有一个 eventBus 实例': 'Ensures there is only one global eventBus instance',
  'EventBus 单例一致性': 'EventBus Singleton Consistency',
  'platform/event/EventBus 与 utils/event/eventBus 一致性': 'platform/event/EventBus and utils/event/eventBus consistency',
  '两个路径Export的 eventBus should be同一个实例': 'eventBus exported from both paths should be the same instance',
  '两个路径Export的 Events 枚举should be同一个引用': 'Events enum exported from both paths should be the same reference',
  '通过 utils 发出的事件应能从 platform Import的 eventBus 接收': 'events emitted via utils should be received by eventBus imported from platform',
  '通过 platform 发出的事件应能从 utils Import的 eventBus 接收': 'events emitted via platform should be received by eventBus imported from utils',
  'Events 枚举完整性': 'Events Enum Completeness',
  'should include GROUP_DELETED 事件': 'should include GROUP_DELETED event',
  'should include GROUP_UPDATED 事件': 'should include GROUP_UPDATED event',
  'should include GROUP_CREATED 事件': 'should include GROUP_CREATED event',
  'should include所有图元和页面相关事件': 'should include all graphic and page related events',
  '事件通信场景：模拟 LayerPanel 与 BasePage': 'Event communication scenario: simulating LayerPanel and BasePage',
  'BasePage 通过 utils/eventBus 发出的 GRAPHIC_ADDED 事件应能被 LayerPanel 监听到': 'GRAPHIC_ADDED event emitted by BasePage via utils/eventBus should be listenable by LayerPanel',
  '// LayerPanel 从 platform/event/EventBus Import eventBus': '// LayerPanel imports eventBus from platform/event/EventBus',
  '// BasePage 从 utils/event/eventBus Import eventBus': '// BasePage imports eventBus from utils/event/eventBus',
  '// 模拟 LayerPanel 注册监听': '// Simulate LayerPanel registering listener',
  '// 模拟 BasePage 添加图元后发出事件': '// Simulate BasePage emitting event after adding graphic',
  'graphic.store 通过 utils/eventBus 发出的 GRAPHIC_REMOVED 事件应能被 LayerPanel 监听到': 'GRAPHIC_REMOVED event emitted by graphic.store via utils/eventBus should be listenable by LayerPanel',

  // === multi-page-regression.test.ts ===
  '多页面场景回归测试': 'Multi-page scenario regression test',
  '覆盖：页面选择/切换、图层显示、图元复制、图元移动等功能的跨页面交互': 'Covers: cross-page interactions for page selection/switch, layer display, graphic copy, graphic move, etc.',
  '多页面回归测试': 'Multi-page Regression Test',
  'toggleGraphicLock / toggleGraphicVisibility 历史记录正确性': 'toggleGraphicLock / toggleGraphicVisibility history correctness',
  'toggleGraphicLock 应保存正确的锁定状态到历史记录': 'toggleGraphicLock should save correct lock state to history',
  '// initial state：未锁': '// initial state: unlocked',
  '// 切换为锁': '// Toggle to locked',
  '// 撤销应恢复为未锁': '// Undo should restore to unlocked',
  'toggleGraphicVisibility 应保存正确的显示状态到历史记录': 'toggleGraphicVisibility should save correct visibility state to history',
  '// initial state：可见': '// initial state: visible',
  '// 切换为隐藏': '// Toggle to hidden',
  '// 撤销应恢复为可见': '// Undo should restore to visible',
  '连续切换锁定状态多次后撤销should correctly恢复': 'after toggling lock state multiple times, undo should correctly restore',
  'page.undo(); // 恢复为 false': 'page.undo(); // restore to false',
  'page.undo(); // 恢复为 true': 'page.undo(); // restore to true',
  'copyPageGraphics 追加而非替换': 'copyPageGraphics appends instead of replaces',
  '复制页面图元应追加到目标页面，而非替换': 'copying page graphics should append to target page, not replace',
  '// 源页面有2个图元': '// Source page has 2 graphics',
  '// 目标页面有 1 个图元': '// Target page has 1 graphic',
  '// 复制源页面图元到目标页面（使用修复后的 addGraphic 追加逻辑）': '// Copy source page graphics to target page (using fixed addGraphic append logic)',
  '// 目标页面应有 1（原有） + 2（复制） = 3 个图元': '// Target page should have 1 (original) + 2 (copied) = 3 graphics',
  'copyPage 深拷贝数据': 'copyPage deep copies data',
  '复制页面的 groups 应与原页面独立': 'copied page groups should be independent from the original page',
  '// 创建组合': '// Create group',
  '// 模拟修复后的 copyPage（深拷贝 groups）': '// Simulate fixed copyPage (deep copy groups)',
  '// change原页面的 groups should not影响复制页面': '// Changing original page groups should not affect copied page',
  '// children 数组也应独立': '// children arrays should also be independent',
  'LayerManager 交换图层时两个图元都应触发事件': 'LayerManager: both graphics should emit events when swapping layers',
  'bringForward 应对被交换的两个图元都触发 GRAPHIC_UPDATED 事件': 'bringForward should trigger GRAPHIC_UPDATED event for both swapped graphics',
  '// 两个图元都应触发事件': '// Both graphics should trigger events',
  'sendBackward 应对被交换的两个图元都触发 GRAPHIC_UPDATED 事件': 'sendBackward should trigger GRAPHIC_UPDATED event for both swapped graphics',
  '页面 ID 唯一性': 'Page ID Uniqueness',
  '添加新页面应生成唯一 ID': 'adding a new page should generate a unique ID',
  '即使快速连续创建也不会产生重复 ID': 'even rapid consecutive creation should not produce duplicate IDs',
  'reorderGraphic 不产生重复的 zIndex': 'reorderGraphic does not produce duplicate zIndex',
  '重新排列图元后所有 zIndex 应唯一': 'all zIndex values should be unique after rearranging graphics',
  '// 将第5个图元移到第1个位置': '// Move 5th graphic to 1st position',
  '// 检查所有 zIndex 唯一': '// Check all zIndex are unique',
  '重新排列后图元顺序should correctly': 'graphic order should be correct after rearrangement',
  '// 初始顺序: g0, g1, g2': '// Initial order: g0, g1, g2',
  '// 将最后的移到最前': '// Move last to front',
  '页面切换时选择状态隔离': 'Selection state isolation when switching pages',
  '切换页面后选择状态应属于当前页面': 'selection state should belong to the current page after switching',
  '// 在页面 1 选择图元': '// Select graphic on page 1',
  '// 页面 2 的选择应独立': '// Page 2 selection should be independent',
  '// 在页面 2 选择图元': '// Select graphic on page 2',
  '// 页面 1 的选择不受影响': '// Page 1 selection should remain unaffected',
  '跨页面复制粘贴': 'Cross-page copy/paste',
  '复制的图元应有新 ID': 'copied graphic should have a new ID',
  '复制的图元位置应偏移': 'copied graphic position should be offset',
  '复制组合应创建新组合并保持成员关系': 'copying a group should create a new group and maintain membership',

  // === all-features.test.ts ===
  '图元操作功能测试': 'Graphic Operation Feature Tests',
  '测试形状': 'Test Shape',
  '撤销 (Undo)': 'Undo',
  '应该撤销添加操作': 'should undo add operation',
  '应该撤销删除操作': 'should undo delete operation',
  '在没有历史记录时should not该报错': 'should not throw when there is no history',
  '重做 (Redo)': 'Redo',
  '在没有可重做操作时should not该报错': 'should not throw when there is no redo operation',
  '删除 (Delete)': 'Delete',
  '应该删除选中的图形': 'should delete the selected graphic',
  '删除后应该清空选中状态': 'should clear selection after deletion',
  '复制 (Copy)': 'Copy',
  '应该保持原图元选中状态': 'should keep the original graphic selected',
  '复制后原图元数量应该不变': 'original graphic count should remain unchanged after copy',
  '剪切 (Cut)': 'Cut',
  '剪切后应该保持图元数量不变（剪切功能由上层实现）': 'graphic count should remain unchanged after cut (cut is implemented by higher layer)',
  '粘贴 (Paste)': 'Paste',
  '应该从剪贴板粘贴图元': 'should paste graphic from clipboard',
  '粘贴后新图元应该被选中': 'the new pasted graphic should be selected',
  '在剪贴板为空时should not该报错': 'should not throw when clipboard is empty',
  '一次复制多次粘贴时，图元位置应该有累积偏移': 'when pasting multiple times after one copy, graphic positions should have cumulative offset',
  '// 创建原始图元': '// Create original graphic',
  '// 复制图元': '// Copy graphic',
  '// 第一次粘贴 - 位置应该偏移 20px': '// First paste - position should offset by 20px',
  '// 第二次粘贴 - 位置应该偏移 40px': '// Second paste - position should offset by 40px',
  '// 第三次粘贴 - 位置应该偏移 60px': '// Third paste - position should offset by 60px',
  '// 验证总共 4 个图元': '// Verify 4 graphics total',
  '组合 (Group)': 'Group',
  '应该从多个图元创建分组': 'should create a group from multiple graphics',
  '创建分组后图元应该在分组内': 'graphics should be inside the group after group creation',
  'should not该为零个图元创建分组': 'should not create a group for zero graphics',
  'should not该为不存在的图元创建分组': 'should not create a group for non-existent graphics',
};

// ===== RULE-BASED PATTERNS =====
function applyRules(text) {
  let r = text;
  // Common it() descriptions
  r = r.replace(/应非空/g, 'should not be empty');
  r = r.replace(/应有/g, 'should have');
  r = r.replace(/应能/g, 'should');
  r = r.replace(/应可/g, 'should be able to');
  r = r.replace(/不应/g, 'should not');
  r = r.replace(/应正/g, 'should');
  r = r.replace(/应保/g, 'should');
  r = r.replace(/应返/g, 'should return');
  r = r.replace(/应创/g, 'should create');
  r = r.replace(/应删/g, 'should delete');
  r = r.replace(/应复/g, 'should copy');
  r = r.replace(/应粘/g, 'should paste');
  r = r.replace(/应同/g, 'should be the same');
  r = r.replace(/应正/g, 'should be correct');
  r = r.replace(/should not该/g, 'should not');
  r = r.replace(/should be/g, 'should be');
  r = r.replace(/Should not/g, 'should not');
  r = r.replace(/should not/g, 'should not');
  r = r.replace(/can not/g, 'cannot');
  // Section comments
  r = r.replace(/===== 测试辅助 =====/g, '===== Test Helpers =====');
  r = r.replace(/===== 测试用例 =====/g, '===== Test Cases =====');
  r = r.replace(/==================== 测试辅助 ====================/g, '==================== Test Helpers ====================');
  r = r.replace(/==================== 测试用例 ====================/g, '==================== Test Cases ====================');
  // JSDoc @vitest-environment
  // Common patterns in SCADA tests
  r = r.replace(/数据源管理/g, 'Data Source Management');
  r = r.replace(/类型定义/g, 'Type Definition');
  r = r.replace(/注册与初始化/g, 'Registration & Initialization');
  r = r.replace(/基础功能/g, 'Basic Functionality');
  r = r.replace(/边界情况/g, 'Edge Cases');
  r = r.replace(/错误处理/g, 'Error Handling');
  r = r.replace(/性能测试/g, 'Performance Test');
  r = r.replace(/性能基准/g, 'Performance Benchmark');
  r = r.replace(/质量传播/g, 'Quality Propagation');
  r = r.replace(/表达式引擎/g, 'Expression Engine');
  r = r.replace(/脚本引擎/g, 'Script Engine');
  r = r.replace(/定时器工具/g, 'Timer Utils');
  r = r.replace(/实时数据引擎/g, 'Realtime Data Engine');
  r = r.replace(/任务调度器/g, 'Task Scheduler');
  r = r.replace(/触发器/g, 'Trigger');
  // More common patterns
  r = r.replace(/应正确/g, 'should correctly');
  r = r.replace(/应返回/g, 'should return');
  r = r.replace(/应创建/g, 'should create');
  r = r.replace(/应删除/g, 'should delete');
  r = r.replace(/应复制/g, 'should copy');
  r = r.replace(/应粘贴/g, 'should paste');
  r = r.replace(/应相同/g, 'should be the same');
  r = r.replace(/应报错/g, 'should throw');
  r = r.replace(/不报错/g, 'should not throw');
  r = r.replace(/应触发/g, 'should trigger');
  r = r.replace(/应调用/g, 'should call');
  r = r.replace(/应包含/g, 'should include');
  r = r.replace(/应保/g, 'should keep');
  r = r.replace(/应设/g, 'should set');
  r = r.replace(/应更/g, 'should change');
  r = r.replace(/应更/g, 'should update');
  r = r.replace(/应同/g, 'should match');
  r = r.replace(/应为/g, 'should be');
  r = r.replace(/应能正/g, 'should correctly');
  r = r.replace(/不做/g, 'should not');
  r = r.replace(/会正/g, 'should correctly');
  return r;
}

// ===== FILE-SPECIFIC FIXES =====
const FILE_FIXES = {};

// ===== MAIN PROCESSING =====
function translateText(text) {
  // Exact match
  if (DICT[text]) return DICT[text];
  
  // Check partial matches - find all Chinese substrings and try to translate
  let result = text;
  // Sort by length (longest first) to avoid partial replacement issues
  const entries = Object.entries(DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [cn, en] of entries) {
    if (result.includes(cn)) {
      result = result.replace(cn, en);
    }
  }
  
  // Apply rule-based translations
  const ruleResult = applyRules(result);
  if (ruleResult !== result) return ruleResult;
  
  return result;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let changed = false;

    // 1. Apply specific file fixes
    const relPath = path.relative(PACKAGES_DIR, filePath);
    
    // 2. Replace Chinese in // comments
    let newContent = content.replace(/(\/\/\s*)([\u4e00-\u9fff\u3400-\u4dbf].*)/g, (match, prefix, text) => {
      const translated = translateText(text);
      if (translated !== text) {
        changed = true;
        return prefix + translated;
      }
      // Try character-by-character replacement for unmatched text
      const result = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => {
        const t = translateText(cn);
        changed = changed || (t !== cn);
        return t;
      });
      return prefix + result;
    });

    // 3. Replace Chinese in /** */ comments
    newContent = newContent.replace(/(\*\s*)([\u4e00-\u9fff\u3400-\u4dbf].*)/g, (match, prefix, text) => {
      const translated = translateText(text);
      if (translated !== text) {
        changed = true;
        return prefix + translated;
      }
      const result = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => {
        const t = translateText(cn);
        changed = changed || (t !== cn);
        return t;
      });
      return prefix + result;
    });

    // 4. Replace Chinese in it() and describe() string arguments
    newContent = newContent.replace(/(it|it\.only|it\.skip|describe|describe\.only|describe\.skip)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff\u3400-\u4dbf][^'"`]*)\2/g, (match, fn, quote, text) => {
      const translated = translateText(text);
      if (translated !== text) {
        changed = true;
        return `${fn}('${translated}'`;
      }
      return match;
    });

    // 5. Replace Chinese in template literals (backtick strings)
    newContent = newContent.replace(/(`[^`]*)([\u4e00-\u9fff\u3400-\u4dbf][^`]*`)/g, (match, before, after) => {
      // Only translate the Chinese parts inside the template literal
      const translated = before + after.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => {
        const t = translateText(cn);
        changed = changed || (t !== cn);
        return t;
      });
      if (translated !== match) {
        changed = true;
        return translated;
      }
      return match;
    });

    // 6. Replace Chinese in string values (single/double quoted strings that contain Chinese)
    newContent = newContent.replace(/(['"`])([^'"`]*[\u4e00-\u9fff\u3400-\u4dbf][^'"`]*)\1/g, (match, quote, text) => {
      // Skip if already inside it()/describe()
      const translated = translateText(text);
      if (translated !== text) {
        changed = true;
        return `'${translated}'`;
      }
      const result = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, (cn) => {
        const t = translateText(cn);
        changed = changed || (t !== cn);
        return t;
      });
      return `'${result}'`;
    });

    // 7. Replace any remaining isolated Chinese characters/phrases
    // This catches any Chinese that wasn't caught by the above patterns
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]+/g;
    newContent = newContent.replace(chineseRegex, (match) => {
      const translated = translateText(match);
      if (translated !== match) {
        changed = true;
        return translated;
      }
      return match;
    });

    if (changed) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Fixed: ${relPath}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`✗ Error ${filePath}: ${err.message}`);
    return false;
  }
}

// ===== FIND AND PROCESS =====
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

console.log('=== Comprehensive Chinese-to-English Translation ===\n');

const testFiles = findTestFiles(PACKAGES_DIR);
console.log(`Found ${testFiles.length} test files total`);

let fixed = 0;
let hasChinese = 0;
for (const file of testFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (/[\u4e00-\u9fff]/.test(content)) {
    hasChinese++;
    if (processFile(file)) fixed++;
  }
}

console.log(`\nDone! ${fixed} files translated out of ${hasChinese} files with Chinese.`);