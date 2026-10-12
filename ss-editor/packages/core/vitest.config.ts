// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@scada-editor/core': resolve(__dirname, 'src'),
      '@scada-editor/system': resolve(__dirname, '../system/src'),
      '@scada-editor/plugin-sdk': resolve(__dirname, '../plugin-sdk/src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: {
      deps: {
        inline: [/@scada-editor\/.*/],
      },
    },
  },
  define: {
    'import.meta.env': {
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false,
    },
  },
});