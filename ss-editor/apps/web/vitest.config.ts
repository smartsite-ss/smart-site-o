// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Stub for @vite/env virtual module (needed by vue HMR in vitest)
      '@vite/env': resolve(__dirname, 'src/__mocks__/vite-env-stub.ts'),
      // 指向源码入口，避免因 dist 未构建导致模块解析失败
      '@scada-editor/system': resolve(__dirname, '../../packages/system/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.ts'],
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