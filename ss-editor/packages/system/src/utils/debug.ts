// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const DEBUG_SKIP_AUTH_KEY = 'scada_debug_skip_auth'
// ⚠️  debug-mock-token 仅在后端 NODE_ENV !== 'production' 时被识别（参见 jwt-auth.guard.ts isDevMode()）
//     生产构建绝不可使用此 token，否则前端跳过登录但后端 401 → 获取不到任何数据
const DEBUG_TOKEN = 'debug-mock-token'

export interface DebugUser {
  id: string
  username: string
  displayName: string
  email: string
  role: 'admin' | 'user' | 'viewer'
}

export const DEBUG_USER: DebugUser = {
  id: 'debug-user',
  username: 'debug',
  displayName: 'Debug User',
  email: 'debug@local.dev',
  role: 'admin',
}

export function isDebugSkipAuth(): boolean {
  return localStorage.getItem(DEBUG_SKIP_AUTH_KEY) === '1'
}

export function setDebugSkipAuth(enable: boolean): void {
  if (enable) {
    localStorage.setItem(DEBUG_SKIP_AUTH_KEY, '1')
  } else {
    localStorage.removeItem(DEBUG_SKIP_AUTH_KEY)
  }
}

export function getDebugToken(): string {
  return DEBUG_TOKEN
}
