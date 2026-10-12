// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: './ButtonGraphic.ts',
      name: '@scada-editor/plugins-button',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', '@scada-editor/core'],
      output: {
        globals: {
          vue: 'Vue',
          '@scada-editor/core': 'ScadaEditorCore',
        },
      },
    },
  },
});