// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    outDir: resolve(__dirname, 'dist'),
    rollupOptions: {
      external: [
        'vue',
        'vue-i18n',
        'pinia',
        'vue-demi',
        '@vue/devtools-api',
        '@scada-editor/plugin-sdk',
        '@scada-editor/core',
      ],
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        globals: {
          vue: 'Vue',
          'vue-i18n': 'VueI18n',
          pinia: 'Pinia',
          '@scada-editor/plugin-sdk': 'ScadaEditorPluginSDK',
          '@scada-editor/core': 'ScadaEditorCore',
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
});