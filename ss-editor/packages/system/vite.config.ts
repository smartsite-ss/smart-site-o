// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { readFileSync } from 'fs';

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

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
    __BUILD_TIME__: JSON.stringify(formatBuildTime(new Date())),
  },
  plugins: [
    // @ts-expect-error vue() type mismatch: vitest/config and @vitejs/plugin-vue resolve different Vite instances via pnpm
    vue(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.vue'],
      exclude: ['src/__tests__/**'],
      tsconfigPath: resolve(__dirname, 'tsconfig.json'),
      // @ts-expect-error skipDiagnostics is a valid option for vite-plugin-dts but not in type defs
      skipDiagnostics: true,
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/**/*.spec.ts'],
  },
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ScadaSystem',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        'pinia',
        'axios',
        'socket.io-client',
        // echarts 全部子模块
        /^echarts/,
        'vue-echarts',
        // monaco-editor
        '@monaco-editor/loader',
        'monaco-editor',
        // 内部包依赖
        '@scada-editor/core',
        '@scada-editor/shared',
        'vue-i18n',
      ],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          pinia: 'Pinia',
          axios: 'axios',
          'socket.io-client': 'io',
          'vue-echarts': 'VChart',
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
});
