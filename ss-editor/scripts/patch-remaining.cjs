// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.resolve(__dirname, '..', 'packages');

// Targeted replacements for remaining Chinese
const REPLACEMENTS = {
  // Three.js describe block
  'P2-1.6 多后端图元同画布集成测试': 'P2-1.6 Multi-backend graphic integration test',
  'P3-1.10 2D/3D 混合画布集成测试': 'P3-1.10 2D/3D mixed canvas integration test',
  'P3-1.9 Three.js 基础设施测试': 'P3-1.9 Three.js infrastructure test',

  // MultiBackendIntegration describe blocks
  '1. 后端类型识别': '1. Backend type identification',
  '2. 多种渲染器共存': '2. Multiple renderer coexistence',
  '3. 插件生命周期隔离': '3. Plugin lifecycle isolation',
  '4. 属性更新互不干扰': '4. Property update isolation',
  '5. 多后端渲染性能基准': '5. Multi-backend rendering performance benchmark',

  // MultiBackendIntegration it blocks
  '默认未知类型应回退到 CANVAS_2D': 'unknown type should default to CANVAS_2D',
  'Vue/SVG/CSS/Three 四种渲染器可同时创建': 'Vue/SVG/CSS/Three renderers can be created simultaneously',
  'Canvas2DRenderer 与 DOM 渲染器可共存同一容器': 'Canvas2DRenderer and DOM renderer can coexist in the same container',
  '不同后端插件 mount/unmount 互不干扰': 'different backend plugins mount/unmount without interference',
  'Canvas2D 插件与 DOM 插件可在同一容器共存': 'Canvas2D and DOM plugins can coexist in the same container',
  'change Vue 插件属性不影响 SVG 插件': 'changing Vue plugin properties does not affect SVG plugin',
  'Canvas2D 插件与 DOM 插件 geometry 更新互不干扰': 'Canvas2D and DOM plugin geometry updates do not interfere',
  '50个Canvas 2D + 10个SVG + 5个Vue 插件共存无内存泄漏征兆': '50 Canvas2D + 10 SVG + 5 Vue plugins coexist without memory leak symptoms',
  'should correctly识别 Canvas2D 插件': 'should correctly identify Canvas2D plugin',
  'should correctly识别 Vue 组件插件': 'should correctly identify Vue component plugin',
  'should correctly识别 SVG DOM 插件': 'should correctly identify SVG DOM plugin',
  'should correctly识别 CSS DOM 插件': 'should correctly identify CSS DOM plugin',
  'should correctly识别 Three.js 3D 插件': 'should correctly identify Three.js 3D plugin',

  // Mixed2D3DIntegration describe blocks
  '1. 混合共存基础验证': '1. Mixed coexistence basic verification',
  '2. 几何更新互不干扰': '2. Geometry update isolation',
  '3. ThreeSceneManager 单例与 Canvas2D 隔离': '3. ThreeSceneManager singleton and Canvas2D isolation',
  '4. 层叠顺序（z-index）验证': '4. Z-index layering order verification',
  '5. 大规模混合压力测试': '5. Large-scale mixed stress test',
  '6. 渲染器注册与后端识别': '6. Renderer registration and backend identification',

  // Mixed2D3DIntegration it blocks
  'Canvas2D 图元与 3D 场景应在同一容器共存': 'Canvas2D graphics and 3D scene should coexist in the same container',
  '3D 场景卸载后 Canvas2D 图元不受影响': '3D scene uninstall should not affect Canvas2D graphics',
  'Canvas2D 图元销毁后 3D 场景不受影响': 'Canvas2D graphic destruction should not affect 3D scene',
  'change Canvas2D 图元 geometry 不影响 3D 场景': 'changing Canvas2D graphic geometry does not affect 3D scene',
  'change 3D 场景 geometry 不影响 Canvas2D 图元': 'changing 3D scene geometry does not affect Canvas2D graphics',
  'ThreeSceneManager 初始化不影响 Canvas2D 图元': 'ThreeSceneManager initialization does not affect Canvas2D graphics',
  'ThreeSceneManager destroy 后 Canvas2D 图元不受影响': 'Canvas2D graphics are unaffected after ThreeSceneManager destroy',
  '多个 Canvas2D 图元应按 zIndex 排序渲染': 'multiple Canvas2D graphics should be rendered in zIndex order',
  'Canvas2D 渲染不影响 3D 场景的 z 轴布局': 'Canvas2D rendering does not affect 3D scene z-axis layout',
  '30个Canvas2D + 3个3D场景共存': '30 Canvas2D + 3 3D scenes coexist',
  'ThreeRenderer + Canvas2DRenderer should be不同后端': 'ThreeRenderer + Canvas2DRenderer should be different backends',
  'ThreeRenderer mount 应传递 container': 'ThreeRenderer mount should pass container',
  'ThreeRenderer update 应传递 props': 'ThreeRenderer update should pass props',

  // 3d-plugins
  'pluginProps 应与 schema 默认值一致': 'pluginProps should match schema default values',
  'loadScene 方法应存在': 'loadScene method should exist',
  'animate 方法应存在': 'animate method should exist',
  'draw 方法应存在': 'draw method should exist',
  '${item.name} — 方法存在性检查': '${item.name} — Method existence check',

  // borders
  '${border.name} — 属性读写一致性': '${border.name} — Property read/write consistency',
  '${border.name} — render 方法': '${border.name} — render method',
};

function applyReplacements(content) {
  for (const [cn, en] of Object.entries(REPLACEMENTS)) {
    content = content.split(cn).join(en);
  }
  return content;
}

const entries = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true });
function processDir(dir) {
  const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of dirEntries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = applyReplacements(content);
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Fixed: ${path.relative(PACKAGES_DIR, fullPath)}`);
      }
    }
  }
}

processDir(PACKAGES_DIR);
console.log('Done!');