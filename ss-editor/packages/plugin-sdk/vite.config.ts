// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es', 'umd'],
      name: 'ScadaEditorPluginSDK',
    },
    rollupOptions: {
      external: ['vue', 'vue-i18n', 'three', '@scada-editor/core'],
      output: {
        inlineDynamicImports: true,
        globals: {
          vue: 'Vue',
        },
      },
    },
    minify: true,
    sourcemap: true,
  },
});