// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue() as any],
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: [/@scada-editor\/core/],
      },
    },
  },
  resolve: {
    alias: {
      '@scada-editor/core': resolve(__dirname, '../core/src/index.ts'),
      '@scada-editor/plugin-sdk': resolve(__dirname, '../plugin-sdk/src/index.ts'),
      '@scada-editor/system': resolve(__dirname, '../system/src/index.ts'),
    },
  },
});