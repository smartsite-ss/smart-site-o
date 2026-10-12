// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      '@scada-editor/system': resolve(__dirname, '../system/src'),
      '@scada-editor/core': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ScadaEditorCore',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'vue-i18n', '@scada-editor/plugin-sdk', 'three'],
      output: {
        inlineDynamicImports: true,
        intro: [
          'if (typeof process === "undefined") { var process = { env: {} }; }',
          'if (typeof Buffer === "undefined") { var Buffer = { isBuffer: function() { return false; } }; }',
          'if (typeof global === "undefined") { var global = globalThis; }',
        ].join('\n'),
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'vue-i18n': 'VueI18n',
        },
      },
    },
  },
});