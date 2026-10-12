// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/// <reference types="vite/client" />
/// <reference types="vue-i18n" />
/// <reference types="vue-router" />

// 确保文件是模块（非脚本），避免 declare module 遮蔽原有类型
export {};

declare global {
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}