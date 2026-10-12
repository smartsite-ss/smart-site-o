// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { join, resolve, dirname } from 'path';
import { existsSync, copyFileSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { vitePluginBundledPlugins } = _require('../../packages/plugins/scripts/vite-plugin-bundled-plugins.cjs');

const SHARED_DEPS = [
  'vue',
  'vue-i18n',
  'pinia',
  'vue-demi',
  '@vue/devtools-api',
  '@scada-editor/core',
  '@scada-editor/plugin-sdk',
  'three',
];

const SHARED_DEP_FILES: Record<string, string> = {
  'vue': 'dist/vue.esm-browser.prod.js',
  'vue-i18n': 'dist/vue-i18n.esm-browser.prod.js',
  'pinia': 'dist/pinia.esm-browser.js',
  'vue-demi': 'lib/index.mjs',
  '@vue/devtools-api': 'lib/esm/index.js',
  'three': 'build/three.module.js',
};

const SHARED_DEP_OUTPUT: Record<string, string> = {
  'vue': 'vue.esm.js',
  'vue-i18n': 'vue-i18n.esm.js',
  'pinia': 'pinia.esm.js',
  'vue-demi': 'vue-demi.esm.js',
  '@vue/devtools-api': 'vue-devtools-api/index.js',
  '@scada-editor/core': 'scada-core.esm.js',
  '@scada-editor/plugin-sdk': 'scada-plugin-sdk.esm.js',
  'three': 'three.esm.js',
};

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function formatBuildTime(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:4000';
  // 注意：build 命令使用 `vite build --mode full|scada|data`，
  // mode 是产品模式（full/scada/data），不是 'production'。
  // 因此判断是否为生产构建必须用 command，不能用 mode。
  const isProd = command === 'build';
  // 部署基路径：默认根路径；H5 内嵌场景由 bin/build-h5-shell.bat 注入 VITE_BASE=/scada-preview/，
  // 使壳可挂载于 H5 站点子路径（同源反代，规避第三方 Cookie 限制）。
  // 所有动态拼接的绝对资源路径（importmap 等）必须基于 appBase，不能硬编码 '/assets/'。
  const appBase = env.VITE_BASE || '/';
  const APP_VERSION = getAppVersion();
  const BUILD_TIME = formatBuildTime(new Date());

  return {
    base: appBase,
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    },
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
    plugins: [
      vitePluginBundledPlugins(),
      vue() as any,
      {
        name: 'strip-baidu-tongji-in-dev',
        // 百度统计仅在发布（生产构建）时保留；开发模式下从 index.html 中剥离，
        // 避免本地开发时向 hm.baidu.com 上报统计数据。
        transformIndexHtml(html) {
          if (isProd) return html;
          return html.replace(/<!--[\s\S]*?Baidu Tongji[\s\S]*?<\/script>\s*/i, '');
        },
      },
      {
        name: 'inject-dev-importmap',
        // Inject import map INLINE (not external file) in dev mode so
        // browser-side dynamic import("@plugins/electric/...") resolves
        // to @fs protocol URLs. Inline avoids caching issues.
        transformIndexHtml(html) {
          if (isProd) return html;
          const mapPath = resolve(__dirname, 'public', 'import-map.json');
          let mapJson = '';
          try {
            mapJson = readFileSync(mapPath, 'utf-8');
          } catch (_e) {
            console.warn('[inject-dev-importmap] import-map.json not found, skipping');
            return html;
          }
          return html.replace(
            '</head>',
            `  <script type="importmap">\n${mapJson}\n  </script>\n  </head>`,
          );
        },
      },
      {
        name: 'copy-dist-plugins',
        // Dev server startup: copy directory plugin assets (images/icons) from
        // dist-plugins/ to public/plugins/ so Vite can serve them at /plugins/* URLs.
        // .mjs files are EXCLUDED in dev mode — plugins are loaded via @fs protocol
        // from TS source, not from pre-built .mjs. Importing .mjs from /public causes
        // Vite warnings ("should not be imported from source code").
        configureServer() {
          if (isProd) return;
          const srcDir = resolve(__dirname, '..', '..', 'packages', 'plugins', 'dist-plugins');
          const destDir = resolve(__dirname, 'public', 'plugins');
          if (existsSync(srcDir)) {
            try {
              // Exclude .mjs (loaded via @fs/Vite alias from TS source) and
              // .json (plugin-manifest.json, registry.json) — manifests
              // are separately synced by generate-directory-configs.cjs --dev
              // via syncPublicManifest(). Copying .json from dist-plugins/
              // would overwrite dev manifests with production .mjs URLs.
              copyDirRecursive(srcDir, destDir, (p) => !p.endsWith('.mjs') && !p.endsWith('.json'));
            } catch (_e) {
              console.warn('  [copy-dist-plugins] Failed to copy dist-plugins to public/plugins:', (_e as Error).message);
            }
          }
        },
      },
      {
        name: 'shared-deps',
        enforce: 'post',
        transformIndexHtml(html) {
          if (!isProd) return html;

          const importMap: { imports: Record<string, string> } = { imports: {} };
          SHARED_DEPS.forEach(function (dep) {
            importMap.imports[dep] = appBase + 'assets/' + SHARED_DEP_OUTPUT[dep];
          });

          const scriptTag =
            '<script type="importmap">\n' +
            JSON.stringify(importMap, null, 2) +
            '\n</script>';

          return html.replace('</head>', '  ' + scriptTag + '\n  </head>');
        },
        async writeBundle() {
          if (!isProd) return;

          const distAssets = resolve(__dirname, 'dist', 'assets');
          if (!existsSync(distAssets)) {
            mkdirSync(distAssets, { recursive: true });
          }

          for (const dep of SHARED_DEPS) {
            const outputName = SHARED_DEP_OUTPUT[dep];
            if (!outputName) continue;

            let src: string | null = null;

            if (dep === '@scada-editor/core') {
              src = resolve(__dirname, '..', '..', 'packages', 'core', 'dist', 'index.es.js');
            } else if (dep === '@scada-editor/plugin-sdk') {
              src = resolve(__dirname, '..', '..', 'packages', 'plugin-sdk', 'dist', 'index.js');
            } else if (dep === '@vue/devtools-api') {
              const relativePath = SHARED_DEP_FILES[dep];
              if (relativePath) {
                const editorDir = resolve(__dirname, '..', '..');
                src = resolveDepPath(dep, relativePath, editorDir);
              }
              if (src && existsSync(src)) {
                const srcDir = dirname(src);
                const destDir = join(distAssets, 'vue-devtools-api');
                copyDirRecursive(srcDir, destDir);
                continue;
              }
            } else {
              const relativePath = SHARED_DEP_FILES[dep];
              if (relativePath) {
                const editorDir = resolve(__dirname, '..', '..');
                const resolvedPath = resolveDepPath(dep, relativePath, editorDir);
                src = resolvedPath || resolve(__dirname, 'node_modules', dep, relativePath);
              }
            }

            if (src && existsSync(src)) {
              const dest = join(distAssets, outputName);
              copyFileSync(src, dest);
            } else {
              console.warn('  [shared-deps] WARN: not found ' + dep + ' → ' + outputName);
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@scada-editor/shared': resolve(__dirname, '../../packages/shared/src'),
        '@scada-editor/system': resolve(__dirname, '../../packages/system/src'),
        '@scada-editor/core': resolve(__dirname, '../../packages/core/src'),
        '@scada-editor/editor': resolve(__dirname, '../../packages/editor/src'),
        '@scada-editor/plugin-sdk': resolve(__dirname, '../../packages/plugin-sdk/src'),
        '@plugins': resolve(__dirname, '../../packages/plugins'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['legacy-js-api', 'import'],
        },
      },
    },
    optimizeDeps: {
      include: [],
      exclude: [
        '@scada-editor/system',
        '@scada-editor/shared',
        '@scada-editor/core',
        '@scada-editor/editor',
        '@scada-editor/plugin-sdk',
      ],
    },
    server: {
      // 端口按产品模式分离（.env.data=5175 / .env.scada=5174），默认 full=5173：
      // 5173 必须留给 full 壳（含 /preview），data/scada 若也起在 5173 会占用壳端口，
      // 且 data 模式无 /preview 路由，H5 iframe 打开 /preview 会重定向 /system（管理端后台）。
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 5173,
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          // SSE 长连接支持：禁用超时与缓冲，确保 agent/execute 等流式端点不会断开
          timeout: 0,
          proxyTimeout: 0,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              // 移除可能被中间件添加的 content-length（流式 SSE 响应不应有固定长度）
              const ct = proxyRes.headers['content-type'] || '';
              if (ct.includes('text/event-stream')) {
                delete proxyRes.headers['content-length'];
              }
            });
          },
        },
        '/socket.io': {
          target: apiBase,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        external: isProd ? SHARED_DEPS : [],
        // CODE-14: 生产构建也启用 manualChunks，避免所有应用代码打进单一 index.js (3.3MB)。
        // 拆分策略：
        //   - editor: 编辑器代码（含 three.js 用法、xlsx/html2canvas 等大依赖），登录页不加载
        //   - system: 系统管理视图 + shared 共享模块（40+ 视图），登录页仅需 LoginView，但 barrel 导出使整包同 chunk
        //   - vendor: 其余 node_modules 第三方依赖
        //   - xlsx / html2canvas: 超大独立依赖单独成 chunk，仅在对应功能触发时加载
        // 注意：packages/shared/ 合并到 system chunk，不再独立成 chunk。
        // 原因：Vue SFC 编译时注入的 _export_sfc 辅助函数（minified 后名为 ct/ie）会被 Rollup 分到
        // "首次使用它的 SFC"所在的 chunk（即 system chunk）。若 shared 独立成 chunk，shared 中的 SFC
        // 会跨 chunk import system chunk 的 _export_sfc，而 system chunk 又 import shared chunk 的内容，
        // 形成 shared ↔ system 循环依赖，触发 "Cannot access 'X' before initialization" TDZ 错误。
        // 由于 LoginView 不 import shared，此合并不影响登录页加载性能。
        output: {
          manualChunks(id) {
            // 应用源码按子系统分包（基于 packages/ 路径匹配，与 resolve.alias 一致）
            if (id.includes('packages/editor/')) return 'editor';
            if (id.includes('packages/system/') || id.includes('packages/shared/')) return 'system';

            // 第三方依赖细分
            if (id.includes('node_modules/')) {
              if (id.includes('xlsx') || id.includes('xlml') || id.includes('cpexcel')) return 'xlsx';
              if (id.includes('html2canvas')) return 'html2canvas';
              if (id.includes('chart.js') || id.includes('chartjs')) return 'chart';
              return 'vendor';
            }
          },
        },
      },
    },
  };
});

function resolveDepPath(packageName: string, relativePath: string, editorDir: string): string | null {
  try {
    const pkgJsonPath = require.resolve(packageName + '/package.json', { paths: [editorDir] });
    const pkgDir = dirname(pkgJsonPath);
    const filePath = join(pkgDir, relativePath);
    if (existsSync(filePath)) return filePath;
  } catch (_e) {
    /* fallback to pnpm search */
  }

  const pnpmDir = join(editorDir, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) return null;

  const dirs = readdirSync(pnpmDir);
  const pnpmPkgName = packageName.replace(/\//g, '+');
  let pkgDir: string | null = null;
  for (const dir of dirs) {
    if (dir.startsWith(pnpmPkgName + '@')) {
      pkgDir = dir;
      break;
    }
  }
  if (!pkgDir) return null;

  const resolvedPath = join(pnpmDir, pkgDir, 'node_modules', packageName, relativePath);
  return existsSync(resolvedPath) ? resolvedPath : null;
}

function copyDirRecursive(srcDir: string, destDir: string, filter?: (filePath: string) => boolean) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, filter);
    } else {
      if (filter && !filter(srcPath)) continue;
      copyFileSync(srcPath, destPath);
    }
  }
}