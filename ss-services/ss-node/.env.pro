# ===========================================
# Smart SCADA - ss-node 生产环境配置
# 仅包含与 .env.base 不同的生产环境覆盖项
# .env.base 中已有的值无需重复定义
# ===========================================

# 应用配置
NODE_ENV=production
PORT=4000

# ── 方案 A：预览壳基地址（后端下发完整壳 URL） ──
# 生产：H5 iframe 直连远程已部署的 8080 独立壳（绝对地址），与管理端 /preview 完全隔离。
# 壳 = 管理端 web 自身的 /mobile-preview/preview 路由（方案B，复用 PreviewView，与管理端 /preview 隔离）。
# 后端生成 previewUrl = ${SCADA_SHELL_BASE_URL}/preview，故最终 H5 iframe 指向：
#   http://117.72.244.100:8080/mobile-preview/preview?ticket=..&projectId=..&pageName=..
# - 无需单独构建/部署壳；插件从管理端同源 /plugins/ 加载，插件更新走管理端常规发布即可。
# - PreviewView 已支持 ?ticket= -> Bearer 兑换，跨源 iframe 无需 cookie。
# - 注意：8080 全局若带 X-Frame-Options: SAMEORIGIN 需清除（见 nginx.conf /mobile-preview 相关说明）。
SCADA_SHELL_BASE_URL=http://117.72.244.100:8080/mobile-preview

# InfluxDB — 生产部署时需填入真实 token
INFLUXDB_TOKEN=

# 日志 — 生产环境降低级别，保留更久
LOG_LEVEL=info
LOG_MAX_FILES=30

# 国际化 — 生产关闭热重载
I18N_WATCH=false

# 限流 — 生产环境收紧
RATE_LIMIT_MAX=300

# ── S-M04: Swagger 文档环境隔离 ──
# 生产环境下，仅当配置了 SWAGGER_USER + SWAGGER_PASSWORD 时才暴露 API 文档（HTTP Basic Auth 保护）
# 留空则完全禁用 Swagger，防止 API 结构泄露
# SWAGGER_USER=admin
# SWAGGER_PASSWORD=请替换为强密码

# ── 微信扫码登录 — 生产环境强制真实模式 ──
# 功能总开关：本地开发保持 false（用 Mock 模式调试），部署到服务器由部署模板 .env 控制
WECHAT_LOGIN_ENABLED=false
# 生产环境禁止使用 Mock 模式（会跳过真实微信鉴权，任意 openid 即可登录）
WECHAT_MOCK=false
# 微信开放平台网站应用凭证（已在服务器部署模板中配置启用）
WECHAT_APPID=wxba6161ea5b7c2557
WECHAT_SECRET=8f4fd51d86664cedf5fd60dc2b55ad69
WECHAT_REDIRECT_URI=https://smartsite.top/api/v1/auth/wechat/callback
