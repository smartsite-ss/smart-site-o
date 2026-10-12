// 全局类型声明

declare interface Window {
  $message: {
    error: (message: string) => void
    success: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
  }
  $t: (key: string) => string
}

// 为 process 全局对象添加类型声明
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string
    VITE_HTTP_PROXY: string
    VITE_PRO_PATH: string
  }
}

// 为 import.meta.env 添加类型声明
declare interface ImportMetaEnv {
  VITE_HTTP_PROXY: string
  VITE_PRO_PATH: string
  PROD: boolean
  DEV: boolean
}

// 为 axios 实例添加类型声明
declare module 'axios' {
  export interface AxiosInstance {
    <T = any>(config: AxiosRequestConfig): Promise<T>
  }
}
