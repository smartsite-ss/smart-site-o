// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Final targeted fixes for remaining 5 files with Chinese.
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

const REPLACEMENTS = {
  // === CanvasRulerUtils.test.ts ===
  'editor\\src\\__tests__\\ruler\\CanvasRulerUtils.test.ts': [
    // it() descriptions with Chinese
    ["it('scale=0.1 返回 2000/500'", "it('scale=0.1 returns 2000/500'"],
    ["it('scale=0.25 返回 1000/200'", "it('scale=0.25 returns 1000/200'"],
    ["it('scale=0.5 返回 500/100'", "it('scale=0.5 returns 500/100'"],
    ["it('scale=1 返回 200/50（1:1标准视图）'", "it('scale=1 returns 200/50 (1:1 standard view)'"],
    ["it('scale=2 返回 100/20'", "it('scale=2 returns 100/20'"],
    ["it('scale=4 返回 50/10'", "it('scale=4 returns 50/10'"],
    ["it('scale=8 返回 25/5/1（含微刻度 micro=1）'", "it('scale=8 returns 25/5/1 (with micro-tick micro=1)'"],
    ["it('scale=16 返回 10/2/1（超精密模式）'", "it('scale=16 returns 10/2/1 (ultra-precision mode)'"],
    ["it('scale=0 落入第一个分支返回 2000/500'", "it('scale=0 falls into first branch returns 2000/500'"],
    ["it('scale=1000（极大值）落入最后一个分支返回 10/2/1'", "it('scale=1000 (extreme value) falls into last branch returns 10/2/1'"],
    ["it('默认 PX 单位返回四舍五入整数字符串'", "it('default PX unit returns rounded integer string'"],
    ["it('CM 单位: (value * 0.026458).toFixed(1) + \"cm\"'", "it('CM unit: (value * 0.026458).toFixed(1) + \"cm\"'"],
    ["it('INCH 单位: (value * 0.0104167).toFixed(2) + '\"'", "it('INCH unit: (value * 0.0104167).toFixed(2) + '\"'"],
    ["it('MM 单位: Math.round(value * 0.26458).toString() + \"mm\"'", "it('MM unit: Math.round(value * 0.26458).toString() + \"mm\"'"],
    ["it('M 单位: (value * 0.00026458).toFixed(2) + \"m\"'", "it('M unit: (value * 0.00026458).toFixed(2) + \"m\"'"],
    ["it('基本范围: scale=1, start=0, end=500'", "it('basic range: scale=1, start=0, end=500'"],
    ["it('验证主刻度标签有值且递增'", "it('verify major tick labels have values and are increasing'"],
    ["it('高倍缩放 scale=10 产生微刻度'", "it('high zoom scale=10 produces micro ticks'"],
    ["it('低倍缩放 scale=0.05 使用较粗间隔且主刻度无标签'", "it('low zoom scale=0.05 uses coarser intervals without major tick labels'"],
    ["it('滚动偏移量作用下开始结束位置刻度发生位移'", "it('ticks shift under scroll offset'"],
    ["it('网格对齐: gridSize=50，主刻度位置(150,350,550)均能被50整除'", "it('grid alignment: gridSize=50, major tick positions (150,350,550) all divisible by 50'"],
    ["it('gridSize=0 时不产生网格对齐标记'", "it('no grid alignment marks when gridSize=0'"],
    ["it('极大范围不超过最大刻度数 500'", "it('maximum range should not exceed max tick count of 500'"],
    ["it('空范围 start===end 产生最少刻度'", "it('empty range start===end produces minimum ticks'"],
    ["it('垂直方向也正确产生刻度'", "it('vertical orientation also produces correct ticks'"],
    ["it('全部刻度位置在 [start, end] 区间内'", "it('all tick positions are within [start, end] range'"],
    ["it('水平方向: clientX=150, containerRect.left=50, scrollOffset=0 → 100'", "it('horizontal: clientX=150, containerRect.left=50, scrollOffset=0 → 100'"],
    ["it('垂直方向: clientY=200, containerRect.top=60, scrollOffset=10 → 150'", "it('vertical: clientY=200, containerRect.top=60, scrollOffset=10 → 150'"],
    ["it('带滚动偏移时坐标正确叠加'", "it('coordinates correctly superimposed with scroll offset'"],
    ["it('次刻度在主刻度之间且无标签'", "it('minor ticks are between major ticks without labels'"],
    ["it('包含全部五种单位'", "it('includes all five units'"],
    ["it('包含水平和垂直方向'", "it('includes horizontal and vertical orientations'"],
    // Comments
    ['// 共 11 个刻度: 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500', '// 11 ticks total: 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500'],
    ['// 验证刻度位置线性递增', '// Verify tick positions increase linearly'],
    ['// 每4个次刻度出现一个主刻度（majorInterval/minorInterval = 200/50 = 4）', '// Every 4 minor ticks gives one major tick (majorInterval/minorInterval = 200/50 = 4)'],
    ['// 主刻度必须有标签（scale=1 > 0.5，显示标签）', '// Major ticks must have labels (scale=1 > 0.5, show labels)'],
    ['// 标签值递增', '// Label values increase'],
    ['// 次刻度在主刻度之间：两个主刻度(150,350) 之间should have3个次刻度(250,300,350?)', '// Minor ticks between major ticks: between two majors (150,350) should have 3 minor ticks (250,300,350?)'],
    ['// 实际: 0,50,100,(150 major),200,250,300,(350 major),400,450,500', '// Actual: 0,50,100,(150 major),200,250,300,(350 major),400,450,500'],
    ['// 次刻度: 0,50,100,200,250,300,400,450,500 = 9个', '// Minor ticks: 0,50,100,200,250,300,400,450,500 = 9 total'],
    ['// 它们平均分布在主刻度间隔内', '// They are evenly distributed within major tick intervals'],
    ['// 微刻度无标签', '// Micro ticks have no labels'],
    ['// scale=0.05 ≤ 0.5 时不显示标签', '// No labels when scale=0.05 ≤ 0.5'],
    ['// 有偏移和无偏移的结果不同', '// Results differ between with and without offset'],
    ['// 不管有无偏移，所有刻度位置必须在 [start, end] 范围内', '// Regardless of offset, all tick positions must be within [start, end] range'],
    ['// start===end 时 maxTickCount = Math.ceil(0/minInterval)+1 = 1', '// When start===end, maxTickCount = Math.ceil(0/minInterval)+1 = 1'],
    ['// 仅当 displayPos >= start && <= end 时才会被加入', '// Only added when displayPos >= start && <= end'],
    ['// 水平方向', '// Horizontal'],
    ['// 垂直方向', '// Vertical'],
  ],

  // === graphic.store.blackbox.test.ts ===
  'core\\src\\__tests__\\store\\graphic.store.blackbox.test.ts': [
    // Line 2 JSDoc
    ['🧪 ss-editor 黑盒测试 — 插件新增/修改/删除/复制/粘贴/数据绑定/事件/样式/动画/批量', 'ss-editor blackbox test — Graphic add/modify/delete/copy/paste/data binding/events/styles/animation/batch'],
    // Line 68 section comment
    ['§1 插件Add Graphic', '§1 Add Graphic'],
    // Copy/paste/style remaining issues
    ["it('copyStyle should copy制源图元样式'", "it('copyStyle should copy source graphic style'"],
    ["it('pasteStyle should paste贴样式到目标图元'", "it('pasteStyle should paste style to target graphic'"],
    ["it('resetStyle 应重置为类型默认值'", "it('resetStyle should reset to type default'"],
    // Line 331
    ['§14 批量Batch Wrapper batchUpdate / batchUpdateSync', '§14 Batch Wrapper batchUpdate / batchUpdateSync'],
    // Line 47 describe
    ["describe('🧪 插件新增/change 黑盒测试 (graphic.store)'", "describe('Graphic add/change blackbox test (graphic.store)'"],
  ],

  // === QualityPropagator.test.ts ===
  'core\\src\\__tests__\\scada-data\\QualityPropagator.test.ts': [
    ["describe('数据质量标记 - TDD'", "describe('Data quality marking - TDD'"],
    ["describe('视觉反馈'", "describe('Visual feedback'"],
    ["describe('Quality Propagation规则'", "describe('Quality Propagation rules'"],
  ],

  // === ExpressionEngine.test.ts ===
  'core\\src\\__tests__\\runtime\\ExpressionEngine.test.ts': [
    ["describe('基本运算'", "describe('Basic arithmetic'"],
    ["describe('逻辑与比较运算'", "describe('Logical and comparison operations'"],
    ["describe('条件表达式'", "describe('Conditional expressions'"],
    ["describe('函数调用'", "describe('Function calls'"],
    ["describe('表达式编译'", "describe('Expression compilation'"],
    ["describe('依赖分析'", "describe('Dependency analysis'"],
    // The string value '温度:25°C' - this is a test expectation value, keep as-is? No, translate
    ["expect(result.value).toBe('温度:25°C')", "expect(result.value).toBe('Temp:25°C')"],
  ],

  // === eventBus-singleton.test.ts ===
  'core\\src\\__tests__\\platform\\eventBus-singleton.test.ts': [
    // JSDoc comments
    ['* - platform/event/EventBus.ts 有自己的 Events 枚举和 eventBus 实例', '* - platform/event/EventBus.ts has its own Events enum and eventBus instance'],
    ['* - utils/event/eventBus.ts 有另一个完整的 Events 枚举和 eventBus 实例', '* - utils/event/eventBus.ts has another complete Events enum and eventBus instance'],
    ['* Bug 表现：BasePage/graphic.store 通过 utils 的 eventBus **发**事件，', '* Bug: BasePage/graphic.store emits events via utils/eventBus,'],
    ['* LayerPanel 通过 platform 的 eventBus **收**事件 → 事件永远收不到', '* LayerPanel receives via platform/eventBus → events are never delivered'],
    ["it('GROUP_DELETED 事件should从 store 传递到 LayerPanel'", "it('GROUP_DELETED event should propagate from store to LayerPanel'"],
    ["it('PAGE_SWITCHED 事件should正确传递'", "it('PAGE_SWITCHED event should propagate correctly'"],
  ],
};

console.log('=== Final targeted fixes ===\n');

let fixedCount = 0;
for (const [relPath, replacements] of Object.entries(REPLACEMENTS)) {
  const fullPath = path.join(PACKAGES_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`NOT FOUND: ${relPath}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let original = content;
  
  for (const [oldStr, newStr] of replacements) {
    content = content.split(oldStr).join(newStr);
  }
  
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✓ Fixed: ${relPath}`);
    fixedCount++;
  }
}

console.log(`\nDone! Fixed ${fixedCount} files.`);