// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
// @ts-expect-error: CJS module without type declarations
import { vitePluginBundledPlugins } from '../plugins/scripts/vite-plugin-bundled-plugins.cjs';

export default defineConfig({
  plugins: [
    vitePluginBundledPlugins(),
    vue() as any,
  ],
  esbuild: {
    // 插件源文件使用 @Graphic({}) 装饰器（experimentalDecorators），esbuild 默认不支持
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ScadaEditorUI',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'vue-router', '@scada-editor/core', '@scada-editor/plugin-sdk', '@scada-editor/system', 'pinia', 'vue-i18n', '@monaco-editor/loader'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          '@scada-editor/core': 'ScadaEditorCore',
          '@scada-editor/system': 'ScadaEditorSystem',
          pinia: 'Pinia',
          'vue-i18n': 'VueI18n',
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'import'],
      },
    },
  },
});