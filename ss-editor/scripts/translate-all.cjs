// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Comprehensive script to translate Chinese text in test files to English.
 * Merges all previous translations and adds rule-based pattern matching.
 */
const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// ===== TRANSLATION MAPPING =====
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
  '初始状态 dirty 应为 false': 'initial dirty should be false',
  'markDirty 应将 dirty 设为 true': 'markDirty should set dirty to true',
  'clearDirty 应将 dirty 恢复为 false': 'clearDirty should reset dirty to false',
  'setter 方式设置 dirty 应生效': 'setter-based dirty assignment should work',

  // === FormatPainterManager ===
  '状态管理': 'State management',
  'pickStyle - 拾取样式': 'pickStyle - Pick style',
  'paintStyle - 涂抹样式（同类图元）': 'paintStyle - Paint style (same type)',
  'paintStyle - 涂抹样式（异类图元）': 'paintStyle - Paint style (different type)',
  'applyFormat - 完整交互流程': 'applyFormat - Complete interaction flow',
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

  // === SaveServiceManager ===
  'SaveService 未初始化，请先调用 init()': 'SaveService is not initialized, please call init() first',
  'server 模式需要配置 apiBaseUrl': 'Server mode requires apiBaseUrl configuration',
  '保存失败: ': 'Save failed: ',
  '加载失败: ': 'Load failed: ',
  '删除失败: ': 'Delete failed: ',

  // === E2E Workflows ===
  'E2E: 设计工作流': 'E2E: Design Workflow',
  'TC-E2E-001: 创建项目 → 添加页面 → 添加图形 → 保存': 'TC-E2E-001: Create project → Add page → Add graphics → Save',
  'TC-E2E-002: 加载项目 → 编辑图形 → 撤销/重做 → 保存': 'TC-E2E-002: Load project → Edit graphics → Undo/Redo → Save',
  'TC-E2E-003: 选择图形 → 复制 → 粘贴 → 删除': 'TC-E2E-003: Select graphics → Copy → Paste → Delete',
  'TC-E2E-004: 图层操作 → 排序 → 分组 → 取消分组': 'TC-E2E-004: Layer operations → Reorder → Group → Ungroup',
  'TC-E2E-005: 导出项目 → 导入项目 → 验证数据完整性': 'TC-E2E-005: Export project → Import project → Verify data integrity',
  '边界情况': 'Edge cases',
  'E2E: 数据绑定工作流': 'E2E: Data Binding Workflow',
  'TC-E2E-010: 创建数据源 → 绑定标签到图形 → 启动数据模拟 → 验证图形更新': 'TC-E2E-010: Create data source → Bind tags to graphics → Start data simulation → Verify graph updates',
  'TC-E2E-011: 配置告警 → 触发告警 → 验证告警通知': 'TC-E2E-011: Configure alarm → Trigger alarm → Verify alarm notification',
  'TC-E2E-012: 脚本执行 → 数据转换 → 验证输出': 'TC-E2E-012: Script execution → Data transformation → Verify output',
  'TC-E2E-013: 任务调度器 → 调度任务 → 执行 → 验证结果': 'TC-E2E-013: Task scheduler → Schedule task → Execute → Verify result',
  '边界情况与错误路径': 'Edge cases and error paths',

  // === Design workflow it descriptions ===
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
  '应能导出项目为 JSON': 'should export project as JSON',
  '应能导出项目为 HTML': 'should export project as HTML',
  '导出后导入应保持数据完整性': 'import/export should preserve data integrity',
  '创建项目': 'Create project',
  '导出': 'Export',
  '导入': 'Import',
  '页面名重复检查应正确工作': 'page name duplicate check should work correctly',
  '应能设置页面图标': 'should set page icon',
  '应能获取缩放相关配置': 'should get zoom-related config',
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

  // === E2E data binding ===
  '应能绑定数据标签到图形': 'should bind data tags to a graphic',
  '应能解除数据绑定': 'should unbind data',
  '应能对多个图形绑定不同数据源': 'should bind different data sources to multiple graphics',
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
  '加载空场景不应崩溃': 'loading an empty scenario should not crash',
  '设置 tagValues 到 engine 中': 'Set tagValues in the engine',
  '使用 eventType 作为 key 来添加动作': 'Use eventType as key to add action',
  '使用 eventType 作为 key 来删除事件': 'Use eventType as key to delete event',

  // === Comments ===
  'Mock 图形工厂': 'Mock Graphic Factory',
  'Mock 存储服务': 'Mock Storage Service',
  '辅助函数：创建模拟图形': 'Helper function: create mock graphic',
  '导入 stores': 'Import stores',
  '导入真实引擎': 'Import real engines',
  '测试套件': 'Test suite',
  '重置 mock 存储': 'Reset mock storage',
  '先保存项目': 'Save project first',
  '重置 stores': 'Reset stores',
  '加载项目': 'Load project',
  '选中两个图形': 'Select two graphics',
  '先选中图元': 'Select graphics first',
  '确认初始状态': 'Verify initial state',
  '模拟 BaseGraphic.update() 的核心行为：': 'Simulates the core behavior of BaseGraphic.update():',
  '初始状态': 'initial state',
  'Mock 页面管理器': 'Mock Page Manager',
  'Mock StateService': 'Mock StateService',
  'Mock ProjectMigration': 'Mock ProjectMigration',

  // === CanvasRulers ===
  '组件定义': 'Component definition',
  '应成功Import组件': 'should import component successfully',
  '应有组件名称': 'should have a component name',
  '应定义必需的 props': 'should define required props',
  '应定义可选 props 及默认值': 'should define optional props and default values',

  // === ViewportManagement ===
  '视口管理': 'Viewport management',
  '缩放至合适': 'Zoom to fit',
  '滚轮缩放': 'Scroll wheel zoom',
  '平移拖拽': 'Pan drag',
  '缩放限制': 'Zoom limits',
  '基本功能': 'Basic functionality',
  '图形选中状态': 'Graphic selection state',
  '图形编辑模式': 'Graphic editing mode',

  // === Schema generator ===
  'Schema 生成器': 'Schema generator',

  // === PageDataSource Store ===
  '2. 初始化组 (initGroup / loadGroup / clearGroup)': '2. Group initialization (initGroup / loadGroup / clearGroup)',
  '4. 图元选择 (selectGraphic)': '4. Graphic selection (selectGraphic)',
  '5. 变量管理 (Variable management)': '5. Variable management',
  '6. 图元绑定 (Graphic binding)': '6. Graphic binding',
  '7. 计算属性 (Computed properties)': '7. Computed properties',
  '8. 数据获取 (fetchDataSourceData)': '8. Data fetching (fetchDataSourceData)',
  '10. 工具函数 (resolveDataPath / applyScale)': '10. Utility functions (resolveDataPath / applyScale)',

  // === Three.js ===
  'P3-1.9: Three.js 基础设施单元测试': 'P3-1.9: Three.js infrastructure unit test',
  'P3-1.9 Three.js 基础设施测试': 'P3-1.9 Three.js infrastructure test',
  '应是单例模式': 'should be a singleton',
  '应正确初始化': 'should initialize correctly',
  '可禁用/启用': 'should be toggleable disable/enable',
};

// ===== RULE-BASED PATTERNS =====
// These handle repetitive patterns in plugin tests where plugin name varies
function applyRuleBasedTranslations(text) {
  let result = text;

  // === Describe patterns (used across ALL plugin tests) ===
  const describeRules = [
    ['Schema 静态校验 \\(Layer 1\\)', 'Schema static validation (Layer 1)'],
    ['属性读写一致性 \\(Layer 2\\)', 'Property read/write consistency (Layer 2)'],
    ['声明-渲染映射验证 \\(Layer 3\\)', 'Declaration-rendering mapping validation (Layer 3)'],
    ['渲染功能验证 \\(Layer 3\\)', 'Rendering functionality validation (Layer 3)'],
    ['构造与基础功能', 'Construction and basic functionality'],
    ['Schema 注册到 ConfigTemplateManager', 'Schema registration in ConfigTemplateManager'],
    ['optionsProvider 动态选项 \\(Layer 1\\)', 'optionsProvider dynamic options (Layer 1)'],
    ['optionsProvider 运行时解析', 'optionsProvider runtime resolution'],
    ['显示模式测试', 'Display mode test'],
    ['边框配置测试', 'Border configuration test'],
    ['背景色配置测试', 'Background color configuration test'],
  ];
  for (const [cn, en] of describeRules) {
    result = result.replace(new RegExp(cn, 'g'), en);
  }

  // === It description patterns (common across all plugin tests) ===
  // Schema validation layer
  result = result.replace(/schema\.name 应非空/g, 'schema.name should not be empty');
  result = result.replace(/schema\.fields 应非空数组/g, 'schema.fields should be a non-empty array');
  result = result.replace(/每个 field 应有 name 和 type/g, 'each field should have name and type');
  result = result.replace(/select 类型应有 options 或 optionsProvider/g, 'select type should have options or optionsProvider');
  result = result.replace(/select 类型应有 options/g, 'select type should have options');
  result = result.replace(/select 字段必须有 options 或 optionsProvider/g, 'select field must have options or optionsProvider');
  result = result.replace(/number 类型的 min 不应大于 max/g, 'number type min should not be greater than max');
  result = result.replace(/所有 field 应有 defaultValue（除 required 字段外）/g, 'all fields should have defaultValue (except required fields)');
  result = result.replace(/所有 field 应有 defaultValue/g, 'all fields should have defaultValue');
  result = result.replace(/color 类型的 defaultValue 应为有效 hex/g, 'color type defaultValue should be a valid hex');
  result = result.replace(/字段名不应重复/g, 'field names should not be duplicated');
  result = result.replace(/非 select 字段不应有 options 或 optionsProvider/g, 'non-select fields should not have options or optionsProvider');

  // Property layer
  result = result.replace(/所有 schema defaultProps 应与 constructor 初始化值一致/g, 'all schema defaultProps should match constructor initial values');
  result = result.replace(/所有字段应支持 setPluginProps 写入并正确读取/g, 'all fields should support setPluginProps write and correct read');
  result = result.replace(/onPropertyChanged 应在属性变更时触发/g, 'onPropertyChanged should fire when properties change');

  // Render layer
  result = result.replace(/render 应在调用后不抛出错误（无页面数据）/g, 'render should not throw after being called (no page data)');
  result = result.replace(/render 应在调用后不抛出错误/g, 'render should not throw after being called');
  result = result.replace(/render 应在有加载错误时正常渲染/g, 'render should render normally with load errors');

  // Constructor
  result = result.replace(/应正确创建实例/g, 'should create instance correctly');
  result = result.replace(/应接受位置和尺寸参数/g, 'should accept position and size parameters');
  result = result.replace(/应接受位置参数/g, 'should accept position parameters');
  result = result.replace(/draw 方法应正常调用（无内容）/g, 'draw method should be called normally (no content)');
  result = result.replace(/draw 方法应正常调用/g, 'draw method should be called normally');

  // Display mode
  result = result.replace(/默认显示模式应为 stretch/g, 'default display mode should be stretch');
  result = result.replace(/修改显示模式后 render 应正常/g, 'render should work after changing display mode');

  // Border
  result = result.replace(/默认边框样式应为 solid/g, 'default border style should be solid');
  result = result.replace(/修改边框属性后 render 应正常/g, 'render should work after changing border properties');
  result = result.replace(/边框样式设为 none 且线宽为 0 时不应绘制边框/g, 'should not draw border when border style is none and line width is 0');
  result = result.replace(/none 模式下不应有 strokeRect 调用/g, 'should not call strokeRect in none mode');
  result = result.replace(/solid 边框应调用 setLineDash\(\[\]\)/g, 'solid border should call setLineDash([])');
  result = result.replace(/dashed 边框应调用 setLineDash\(\[8,4\]\)/g, 'dashed border should call setLineDash([8,4])');
  result = result.replace(/dotted 边框应调用 setLineDash\(\[2,2\]\)/g, 'dotted border should call setLineDash([2,2])');

  // Background
  result = result.replace(/默认背景色应为 #FFFFFF/g, 'default background color should be #FFFFFF');
  result = result.replace(/背景色设为 transparent 时不应绘制背景/g, 'should not draw background when background color is transparent');
  result = result.replace(/修改背景色后 render 应正常/g, 'render should work after changing background color');

  // optionsProvider
  result = result.replace(/pageName 字段应有 optionsProvider 为 "pageStore.pages"/g, 'pageName field should have optionsProvider as "pageStore.pages"');
  result = result.replace(/pageName 字段不应有静态 options（由 optionsProvider 动态提供）/g, 'pageName field should not have static options (dynamically provided by optionsProvider)');
  result = result.replace(/displayMode 字段应有静态 options 且无 optionsProvider/g, 'displayMode field should have static options and no optionsProvider');
  result = result.replace(/borderStyle 字段应有静态 options 且无 optionsProvider/g, 'borderStyle field should have static options and no optionsProvider');

  // Schema registration
  result = result.replace(/getPluginSchema 应返回已注册的 schema/g, 'getPluginSchema should return registered schema');
  result = result.replace(/getTemplate 应返回与 getPluginSchema 相同的结果/g, 'getTemplate should return the same result as getPluginSchema');
  result = result.replace(/hasPluginSchema 应对已注册的 schema 返回 true/g, 'hasPluginSchema should return true for registered schema');
  result = result.replace(/hasPluginSchema 应对未注册的 schema 返回 false/g, 'hasPluginSchema should return false for unregistered schema');
  result = result.replace(/getPluginSchema 应对未注册类型返回 null/g, 'getPluginSchema should return null for unregistered type');
  result = result.replace(/getTemplate 应对未注册类型返回 null/g, 'getTemplate should return null for unregistered type');
  result = result.replace(/getPropsPath 应对未设置 propsPath 的 schema 返回 undefined/g, 'getPropsPath should return undefined for schema without propsPath');
  result = result.replace(/getDefaultValueFactory 应返回默认值工厂/g, 'getDefaultValueFactory should return default value factory');
  result = result.replace(/unregisterPluginSchema 应正确移除 schema/g, 'unregisterPluginSchema should correctly remove schema');
  result = result.replace(/getAllPluginSchemas 应包含已注册的 schema/g, 'getAllPluginSchemas should include registered schema');

  // optionsProvider runtime
  result = result.replace(/optionsProvider 字符串 "pageStore.pages" 应能被解析/g, 'optionsProvider string "pageStore.pages" should be resolvable');
  result = result.replace(/pageStore.pages 应提供模拟的页面列表/g, 'pageStore.pages should provide a mocked page list');
  result = result.replace(/pageStore.pages 中的每个页面应有 name 和 id/g, 'each page in pageStore.pages should have name and id');
  result = result.replace(/optionsProvider 解析结果应可映射为/g, 'optionsProvider resolution result should be mappable to');

  // === Plugin-specific it descriptions ===
  result = result.replace(/默认属性应包含/g, 'default properties should include');
  result = result.replace(/默认属性应含/g, 'default properties should include');
  result = result.replace(/绘制方法应正常执行/g, 'draw method should execute normally');
  result = result.replace(/修改属性后 render 应正常/g, 'render should work after changing properties');
  result = result.replace(/修改 bodyColor 后 render 应正常执行/g, 'render should work after changing bodyColor');
  result = result.replace(/修改 impellerColor 后 render 应正常执行/g, 'render should work after changing impellerColor');
  result = result.replace(/设置运行状态应不报错/g, 'setting running status should not throw');
  result = result.replace(/切换旋转方向应不报错/g, 'toggling rotation direction should not throw');

  // === Plugin coverage ===
  result = result.replace(/插件测试覆盖汇总/g, 'Plugin test coverage summary');
  result = result.replace(/应至少有 40 个插件目录/g, 'should have at least 40 plugin directories');
  result = result.replace(/应至少有 20 个测试文件/g, 'should have at least 20 test files');
  result = result.replace(/分类应有测试文件/g, 'category should have test files');

  // === Schema validation ===
  result = result.replace(/应包含全部 16 个 schema/g, 'should include all 16 schemas');
  result = result.replace(/schema 应通过校验/g, 'schema should pass validation');
  result = result.replace(/应是单例模式/g, 'should be a singleton');
  result = result.replace(/应正确初始化/g, 'should initialize correctly');
  result = result.replace(/可禁用\/启用/g, 'should be toggleable disable/enable');

  // === Three.js ===
  result = result.replace(/initial state未初始化/g, 'initial state should be uninitialized');
  result = result.replace(/reset 应清理实例/g, 'reset should clean up instance');
  result = result.replace(/init 应创建 WebGLRenderer 和 canvas/g, 'init should create WebGLRenderer and canvas');
  result = result.replace(/重复 init 应直接返回/g, 'repeated init should return directly');
  result = result.replace(/registerScene 应注册场景条目/g, 'registerScene should register a scene entry');
  result = result.replace(/unregisterScene 应移除场景条目/g, 'unregisterScene should remove a scene entry');
  result = result.replace(/未初始化时 registerScene 应输出警告/g, 'registerScene should warn when uninitialized');
  result = result.replace(/resize 应更新渲染器和所有相机宽高比/g, 'resize should update renderer and all camera aspect ratios');
  result = result.replace(/destroy 应清理所有资源/g, 'destroy should clean up all resources');
  result = result.replace(/getCanvas 应返回 canvas 元素/g, 'getCanvas should return canvas element');
  result = result.replace(/setTarget 应设置目标点/g, 'setTarget should set the target point');
  result = result.replace(/setPosition 应从 3D 坐标反算球坐标/g, 'setPosition should calculate spherical coordinates from 3D coordinates');
  result = result.replace(/lookAt 应设置目标并更新相机/g, 'lookAt should set target and update camera');
  result = result.replace(/zoom 应调整球坐标半径/g, 'zoom should adjust spherical coordinate radius');
  result = result.replace(/zoom 不应违反 minDistance 约束/g, 'zoom should not violate minDistance constraint');
  result = result.replace(/zoom 不应违反 maxDistance 约束/g, 'zoom should not violate maxDistance constraint');
  result = result.replace(/update 应调用相机更新/g, 'update should call camera update');
  result = result.replace(/attach 应绑定 DOM 事件/g, 'attach should bind DOM events');
  result = result.replace(/detach 应解绑 DOM 事件/g, 'detach should unbind DOM events');
  result = result.replace(/dispose 应清理资源/g, 'dispose should clean up resources');

  // === Viewport / Canvas ===
  result = result.replace(/画布视口应正确响应容器尺寸变化/g, 'canvas viewport should respond correctly to container resize');
  result = result.replace(/缩放至 100%/g, 'Zoom to 100%');
  result = result.replace(/缩放至 200%/g, 'Zoom to 200%');
  result = result.replace(/在视口中拖拽时应正确平移/g, 'dragging in the viewport should pan correctly');
  result = result.replace(/transform 矩阵不变化说明未平移/g, 'transform matrix unchanged means no pan');
  result = result.replace(/键盘方向键\/快捷键平移/g, 'Keyboard arrow keys/shortcut pan');
  result = result.replace(/代码修改视口偏移量/g, 'Code modifies viewport offset');
  result = result.replace(/缩放超出限制时应被 clamp/g, 'zoom should be clamped when exceeding limits');
  result = result.replace(/缩放至合适（fit to page）/g, 'Zoom to fit (fit to page)');

  // === useGraphic ===
  result = result.replace(/useGraphic 组合式函数/g, 'useGraphic composable');
  result = result.replace(/基本图形操作/g, 'Basic graphic operations');

  // === Schema generator ===
  result = result.replace(/应能为简单字段生成 schema/g, 'should generate schema for simple fields');
  result = result.replace(/应能为嵌套对象生成 schema/g, 'should generate schema for nested objects');
  result = result.replace(/应能处理数组类型/g, 'should handle array types');
  result = result.replace(/应能处理枚举类型/g, 'should handle enum types');
  result = result.replace(/应能处理可选字段/g, 'should handle optional fields');
  result = result.replace(/应能处理复合类型/g, 'should handle complex types');
  result = result.replace(/应能正确处理循环引用/g, 'should handle circular references correctly');

  // === error messages in expect() ===
  result = result.replace(/缺少 defaultValue/g, 'is missing defaultValue');
  result = result.replace(/缺少 type/g, 'is missing type');
  result = result.replace(/缺少 options/g, 'is missing options');
  result = result.replace(/缺少 name/g, 'is missing name');
  result = result.replace(/options 为空/g, 'options is empty');
  result = result.replace(/不是有效 hex/g, 'is not a valid hex');
  result = result.replace(/重复字段/g, 'duplicate fields');

  // Clean up
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

// ===== PROCESSING =====
const PATTERNS = [
  { regex: /\/\/\s*(.+[\u4e00-\u9fff\u3400-\u4dbf].*)/g, replace: (match, text) => `// ${translateText(text)}` },
  { regex: /(it|it\.only|it\.skip|it\.todo)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  { regex: /(describe|describe\.only|describe\.skip)\s*\(\s*(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\2/g, replace: (match, fn, quote, text) => `${fn}('${translateText(text)}'` },
  { regex: /(?:rejects\.toThrow|toThrow|throw new Error)\s*\(\s*'([^']*[\u4e00-\u9fff][^']*)'/g, replace: (match, text) => match.replace(text, translateText(text)) },
  { regex: /(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\1/g, replace: (match, quote, text) => `'${translateText(text)}'` },
];

function translateText(text) {
  // Try exact match first
  if (TRANSLATIONS[text]) return TRANSLATIONS[text];

  // Try partial match
  for (const [cn, en] of Object.entries(TRANSLATIONS)) {
    if (text.includes(cn)) return text.replace(cn, en);
  }

  // Try rule-based translation
  const translated = applyRuleBasedTranslations(text);
  if (translated !== text) return translated;

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

const testFiles = findTestFiles(PACKAGES_DIR);
console.log(`Found ${testFiles.length} test files`);

let translatedCount = 0;
for (const file of testFiles) {
  if (file.includes('node_modules')) continue;
  const wasModified = processFile(file);
  if (wasModified) {
    translatedCount++;
    console.log(`\u2713 Translated: ${path.relative(PACKAGES_DIR, file)}`);
  }
}

console.log(`\nDone! ${translatedCount} files were translated.`);