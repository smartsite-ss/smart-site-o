// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Final script to fix all remaining Chinese in test files.
 * Handles the specific remaining patterns found in:
 * - ViewportManagement.test.ts
 * - LargeCanvasViewport.test.ts
 * - ThreeInfrastructure.test.ts
 * - PageBrowserPlugin.test.ts
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// Specific file replacements
const FILE_REPLACEMENTS = {
  // --- ThreeInfrastructure.test.ts ---
  'plugin-sdk\\__tests__\\ThreeInfrastructure.test.ts': [
    ["'右键拖拽should be pan 模式'", "'right-click drag should be pan mode'"],
  ],

  // --- PageBrowserPlugin.test.ts ---
  'plugins\\__tests__\\basic\\PageBrowserPlugin.test.ts': [
    // Template literal line 53
    ['`select字段 "${field.name}" 应至少有 options 或 optionsProvider`', '`select field "${field.name}" should have at least options or optionsProvider`'],
    // Line 285
    ["'pageName 字段应有 optionsProvider 为 \"pageStore.pages\"'", "'pageName field should have optionsProvider as \"pageStore.pages\"'"],
    // Line 397
    ["it('optionsProvider 字符串 \"pageStore.pages\" 应能被解析'", "it('optionsProvider string \"pageStore.pages\" should be resolvable'"],
  ],

  // --- ViewportManagement.test.ts ---
  'editor\\src\\__tests__\\canvas-page\\ViewportManagement.test.ts': [
    // Line 29
    ["describe('useTransform - 智能Viewport management系统'", "describe('useTransform - Smart Viewport management system'"],
    // Line 42 - inline comments in beforeEach
    ['// 重置状态', '// Reset state'],
    ['// 重置mock store', '// Reset mock store'],
    ['// 创建transform实例', '// Create transform instance'],
    // Line 43
    ["describe('zoomIn / zoomOut - 缩放保持视口中心'", "describe('zoomIn / zoomOut - Zoom keeps viewport center'"],
    // Line 44
    ["it('zoomIn应该以画布中心为锚点放大，不改变视口中心位置'", "it('zoomIn should zoom anchored at canvas center without changing viewport center'"],
    // Line 47
    ['// initial state：scale=100, pan=(0,0)', '// initial state: scale=100, pan=(0,0)'],
    // Line 50
    ['// 执行zoomIn', '// Execute zoomIn'],
    // Line 53
    ['// 验证：scale增加5%', '// Verify: scale increased by 5%'],
    // Line 56
    ['// 验证：pan被调整以保持画布中心在视口中心', '// Verify: pan adjusted to keep canvas center at viewport center'],
    // Line 57
    ['// 画布逻辑中心：(960, 540)', '// Canvas logical center: (960, 540)'],
    // Line 58
    ['// 放大后，pan应该调整使该点仍在屏幕中央', '// After zoom, pan should be adjusted so this point remains centered'],
    // Line 62
    ["it('zoomOut应该以画布中心为锚点缩小'", "it('zoomOut should zoom out anchored at canvas center'"],
    // Line 65
    ['// 设置初始scale为200', '// Set initial scale to 200'],
    // Line 70
    ['// 验证：scale减少约5%（200/1.05 ≈ 190.48）', '// Verify: scale decreased by ~5% (200/1.05 ≈ 190.48)'],
    // Line 75
    ["it('多次连续缩放后，缩放值在有效范围内且不溢出'", "it('scale values should stay within valid range and not overflow after multiple zooms'"],
    // Line 78
    ['// 连续执行5次zoomIn', '// Execute zoomIn 5 times in a row'],
    // Line 83
    ['// 验证最终scale在有效范围', '// Verify final scale is within valid range'],
    // Line 87
    ['// CSS模型：panX/panY始终为0', '// CSS model: panX/panY always 0'],
    // Line 92
    ["it('缩放应该在合理范围内（20-300%）'", "it('zoom should be within reasonable range (20-300%)'"],
    // Line 95
    ['// 测试最小值限制', '// Test minimum limit'],
    // Line 100
    ['// 测试最大值限制 - 需要多次zoomIn', '// Test maximum limit - requires multiple zoomIn'],
    // Line 109
    ["describe('fitToWindow - 适应窗口（考虑padding）'", "describe('fitToWindow - Fit window (with padding)'"],
    // Line 111
    ['// Mock DOM元素', '// Mock DOM element'],
    // Line 121
    ["it('fitToWindow应该正确计算缩放比例使画布适应容器'", "it('fitToWindow should correctly calculate scale to fit canvas in container'"],
    // Line 124
    ['// 设置大页面尺寸（3840x2160）', '// Set large page size (3840x2160)'],
    // Line 133
    ["it('fitToWindow应该使内容居中在容器内'", "it('fitToWindow should center content in container'"],
    // Line 136
    ['// 标准Page1920x1080', '// Standard page 1920x1080'],
    // Line 142
    ['// CSS模型：flexbox+margin:auto负责居中，panX/panY保持0', '// CSS model: flexbox+margin:auto handles centering, panX/panY remain 0'],
    // Line 147
    ["it('小页面时应该居中显示'", "it('small page should be centered'"],
    // Line 150
    ['// 小页面尺寸（800x600）', '// Small page size (800x600)'],
    // Line 156
    ['// scale应该按可用空间计算，约90%', '// scale should be calculated from available space, ~90%'],
    // Line 159
    ['// CSS模型：flexbox+margin:auto负责居中，panX/panY保持0', '// CSS model: flexbox+margin:auto handles centering, panX/panY remain 0'],
    // Line 165
    ["describe('clampPan - 边界约束'", "describe('clampPan - Boundary constraints'"],
    // Line 166
    ["it('CSS驱动模型下clampPan为no-op'", "it('clampPan is no-op under CSS-driven model'"],
    // Line 176
    ["it('CSS驱动模型下clampPan不changepan值'", "it('clampPan does not change pan values under CSS-driven model'"],
    // Line 190
    ["it('Ctrl+滚轮应该以鼠标位置为锚点缩放'", "it('Ctrl+wheel should zoom anchored at mouse position'"],
    // Line 216
    ["it('非Ctrl滚轮should not该触发缩放'", "it('non-Ctrl wheel should not trigger zoom'"],
    // Line 233
    ["describe('ensureContentVisible - 智能适配'", "describe('ensureContentVisible - Smart adaptation'"],
    // Line 242
    ["it('有图元时应该调用fitToContent'", "it('should call fitToContent when graphics exist'"],
    // Line 245
    ['// 模拟有图元', '// Simulate having graphics'],
    // Line 258
    ["it('无图元时应该调用fitToWindow'", "it('should call fitToWindow when no graphics exist'"],
    // Line 261
    ['// 无图元', '// No graphics'],
    // Line 270
    ["describe('大页面场景测试'", "describe('Large page scenario tests'"],
    // Line 279
    ["it('4K页面（3840x2160）应该正确适配并居中'", "it('4K page (3840x2160) should fit and center correctly'"],
    // Line 282
    ['// 设置4K页面', '// Set 4K page'],
    // Line 287
    ['// 调用fitToWindow', '// Call fitToWindow'],
    // Line 290
    ['// 验证scale在合理范围内（应该缩小）', '// Verify scale is within reasonable range (should shrink)'],
    ['expect(mockPageStore.currentPage.scale).toBeLessThan(50); // 大幅缩小', 'expect(mockPageStore.currentPage.scale).toBeLessThan(50); // Significantly shrunk'],
    // Line 293
    ['// 验证pan值使画布居中', '// Verify pan values center the canvas'],
    // Line 295
    ['// pan应该在非负范围内', '// pan should be non-negative'],
    // Line 300
    ["it('超大页面（7680x4320 - 8K）也能正常工作'", "it('extra large page (7680x4320 - 8K) should work correctly'"],
    // Line 309
    ['// should not该报错', '// should not throw error'],
    // Line 312
    ['// scale应该不低于20%', '// scale should not be lower than 20%'],
    // Line 317
    ["it('16K超大页面（15360x8640）缩放不低于SCALE_MIN=20'", "it('16K extra large page (15360x8640) zoom should not go below SCALE_MIN=20'"],
    // Line 331
    ["it('极宽页面（10000x1000）缩放后不低于SCALE_MIN'", "it('extremely wide page (10000x1000) zoom should not go below SCALE_MIN'"],
    // Line 344
    ["it('大页面下多次zoomIn后仍能保持在可视区域'", "it('should remain in visible area after multiple zoomIn on large page'"],
    // Line 347
    ['// 4K页面', '// 4K page'],
    // Line 352
    ['//  先fitToWindow', '// First fitToWindow'],
    // Line 355
    ['// 记录initial state', '// Record initial state'],
    // Line 358
    ['// 连续zoomIn 5次', '// ZoomIn 5 times in a row'],
    // Line 363
    ['// 验证scale增加了', '// Verify scale increased'],
    // Line 366
    ['// 验证pan被正确调整（不会让画布消失）', '// Verify pan is correctly adjusted (canvas won\'t disappear)'],
    // Line 372
    ["describe('Edge cases和错误处理'", "describe('Edge cases and error handling'"],
    // Line 373
    ["it('无效的容器尺寸应该安全处理'", "it('invalid container size should be handled safely'"],
    // Line 376
    ['// Mock返回无效尺寸', '// Mock returns invalid size'],
    // Inline strings in line 377 (minified content)
    ['// should not该抛出错误', '// should not throw error'],
    ["it('DOM元素不存在时的回退行为'", "it('fallback behavior when DOM element does not exist'"],
    ['// Mock返回null', '// Mock returns null'],
    ["it('currentPage为null时应该安全处理'", "it('should handle safely when currentPage is null'"],
    ['// 所有操作都应该安全退出', '// All operations should exit safely'],
    // Line 377 end: describe for performance
    ["describe('useTransform - 性能和回归测试'", "describe('useTransform - Performance and regression tests'"],
    // Line 411
    ["it('快速连续缩放操作should not该导致数值溢出'", "it('rapid consecutive zoom operations should not cause numeric overflow'"],
    // Line 414
    ['// 模拟快速连续操作', '// Simulate rapid consecutive operations'],
    // Line 423
    ['// 所有值应该是有限数字', '// All values should be finite numbers'],
    // Line 428
    ['// scale应该在有效范围内', '// scale should be within valid range'],
    // Line 433
    ["it('极端比例页面（1:10 和 10:1）应该正常工作'", "it('extreme aspect ratio pages (1:10 and 10:1) should work correctly'"],
    // Line 436
    ['// 极宽页面', '// Extremely wide page'],
    // Line 442
    ['// 极高页面', '// Extremely tall page'],
    // Line 449
    ["it('resetZoom应该恢复到合理的默认视图'", "it('resetZoom should restore to a reasonable default view'"],
    // Line 452
    ['// 先设置极端状态', '// First set extreme state'],
    // Line 459
    ['// resetZoom现在会调用fitToWindow，scale会被重新计算', '// resetZoom now calls fitToWindow, scale will be recalculated'],
    // Line 460
    ['// 不再强制设为100，而是适应窗口', '// No longer forced to 100, but fits window'],
    // Line 464
    ['// pan应该被重新计算（通过fitToWindow）', '// pan should be recalculated (via fitToWindow)'],
  ],

  // --- LargeCanvasViewport.test.ts ---
  'editor\\src\\__tests__\\canvas-page\\LargeCanvasViewport.test.ts': [
    // Line 34
    ["describe('LargeCanvasViewport - 大画面编辑Viewport management'", "describe('LargeCanvasViewport - Large canvas editing Viewport management'"],
    // Line 69
    ["describe('超大页面 fitToWindow'", "describe('Extra large page fitToWindow'"],
    // Line 73
    ["'超宽': { width: 5120, height: 1440 },", "'Ultra-wide': { width: 5120, height: 1440 },"],
    // Line 74
    ["'超高': { width: 1080, height: 5120 },", "'Ultra-tall': { width: 1080, height: 5120 },"],
    // Line 78
    ["it('${name}页面（${size.width}x${size.height}）fitToWindow 后内容可见'", "it('${name} page (${size.width}x${size.height}) content visible after fitToWindow'"],
    // Inline comments in line 79
    ['// 缩放后内容应不低于SCALE_MIN', '// Content should not go below SCALE_MIN after zoom'],
    ['// 缩放后宽度应在合理范围', '// Width should be within reasonable range after zoom'],
    // Line 79 end
    ["describe('缩放锚点稳定性'", "describe('Zoom anchor stability'"],
    // Line 86
    ["it('在大页面上以视口中心缩放后，scale正确变化且不产生错误'", "it('scale changes correctly and no errors after zoom at viewport center on large page'"],
    // Line 107
    ["it('在4K页面滚动缩放后scale不溢出'", "it('scale does not overflow after scroll zoom on 4K page'"],
    // Line 127
    ["describe('连续缩放 - 画布不丢失'", "describe('Continuous zoom - canvas not lost'"],
    // Line 134
    ["it('大页面连续 zoomIn/zoomOut 50 次后画布原点仍在合理范围'", "it('canvas origin stays within reasonable range after 50 consecutive zoomIn/zoomOut on large page'"],
    // Line 153
    ["it('8K页面快速缩放不产生NaN'", "it('rapid zoom on 8K page does not produce NaN'"],
    // Line 171
    ["describe('极端宽高比页面'", "describe('Extreme aspect ratio pages'"],
    // Line 178
    ["it('极宽页面（10000x1000）fitToWindow 后水平方向正常居中'", "it('extremely wide page (10000x1000) centered horizontally after fitToWindow'"],
    // Line 192
    ["it('极高页面（1000x10000）fitToWindow 后垂直方向正常居中'", "it('extremely tall page (1000x10000) centered vertically after fitToWindow'"],
    // Line 202
    ['// 极高页面缩放后内容可能超出容器，pan可以为负', '// After zoom, extremely tall page content may exceed container, pan can be negative'],
    // Line 209
    ["describe('clampPan 大页面约束'", "describe('clampPan large page constraints'"],
    // Line 216
    ["it('CSS驱动模型下clampPan为no-op，不changepanX/panY'", "it('clampPan is no-op under CSS-driven model, does not change panX/panY'"],
    // Line 230
    ["it('CSS驱动模型下clampPan不强制居中'", "it('clampPan does not force centering under CSS-driven model'"],
    // Line 245
    ["describe('handleWheel 大页面鼠标缩放'", "describe('handleWheel large page mouse zoom'"],
    // Line 246
    ["it('大页面 Ctrl+滚轮以鼠标位置缩放后内容不丢失'", "it('content not lost after Ctrl+wheel zoom at mouse position on large page'"],
  ],
};

function fixFile(relativePath) {
  const fullPath = path.join(PACKAGES_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`NOT FOUND: ${relativePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let original = content;
  const replacements = FILE_REPLACEMENTS[relativePath];

  if (!replacements) return false;

  for (const [oldStr, newStr] of replacements) {
    // Use replaceAll to handle all occurrences
    const before = content;
    content = content.split(oldStr).join(newStr);
    if (content !== before) {
      // Count occurrences
      const count = (before.match(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 1) {
        console.log(`  Replaced ${count}x: ${oldStr.substring(0, 60)}...`);
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`FIXED: ${relativePath}`);
    return true;
  }
  return false;
}

console.log('=== Fixing remaining Chinese in test files ===\n');

let fixedCount = 0;
for (const relativePath of Object.keys(FILE_REPLACEMENTS)) {
  if (fixFile(relativePath)) {
    fixedCount++;
  }
}

console.log(`\nDone! Fixed ${fixedCount} files.`);