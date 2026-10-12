-- ============================================================
-- 项目级 system.db 初始化脚本
-- 位置：ss-services/ss-data/data/init/init-system-db.sql
-- 用途：创建项目系统配置数据库及其基础表结构
-- 使用：运行 sqlite3 system.db < init-system-db.sql
-- ============================================================

-- 性能调优
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- ============================================================
-- 设备管理 — 来自 设备管理.md 数据库设计
-- 注：project_config 和 pages 以 JSON 文件存储于工程目录，不入库
-- 表命名规范：业务前缀_表名（dev_ = 设备模块，sys_ = 系统模块）
-- ============================================================

-- 清理旧版无前缀表（兼容历史数据库升级）
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS device_groups;
DROP TABLE IF EXISTS device_group_members;
DROP TABLE IF EXISTS device_status_log;
DROP TABLE IF EXISTS data_tags;

-- 设备实例表
CREATE TABLE IF NOT EXISTS dev_devices (
    id                  TEXT PRIMARY KEY,
    project_id          TEXT NOT NULL,
    device_code         TEXT NOT NULL,
    device_name         TEXT NOT NULL,
    name_alias          TEXT DEFAULT '',
    description         TEXT DEFAULT '',
    type                TEXT NOT NULL,
    driver              TEXT DEFAULT '',
    config              TEXT DEFAULT '{}',
    connection          TEXT DEFAULT '{}',
    status              TEXT NOT NULL DEFAULT 'offline',
    group_id            TEXT,
    template_id         TEXT,
    template_version    TEXT,
    template_applied_at TEXT,
    error_count         INTEGER NOT NULL DEFAULT 0,
    last_online_at      TEXT,
    last_data_at        TEXT,
    last_error_at       TEXT,
    last_error_msg      TEXT,
    scan_rate           INTEGER NOT NULL DEFAULT 1000,
    offline_period      INTEGER NOT NULL DEFAULT 30000,
    updated_by          TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- 注：v7.6 的 data_period → offline_period 列重命名原先在此处以无条件 ALTER 执行，已移除。
--     原因：本脚本仅用于全新库初始化（project-database.service.ts 仅当 system.db 不存在时
--     才调用 executeInitScript），而新库建表即为 offline_period，该 ALTER 必然报
--     "no such column: data_period"；executeInitScript 会收集错误并在结束时整体 reject，
--     导致其后所有建表语句虽已执行、初始化仍被判定为失败。
--     存量库的重命名由 renameDeviceColumnsPreSync() 与
--     apps/ss-node-server/src/migrations/ 下的迁移负责，不在此脚本处理。

CREATE INDEX IF NOT EXISTS idx_dev_devices_project ON dev_devices(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_devices_status ON dev_devices(status);
CREATE INDEX IF NOT EXISTS idx_dev_devices_type ON dev_devices(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_devices_project_device_code ON dev_devices(project_id, device_code);
CREATE INDEX IF NOT EXISTS idx_dev_devices_device_code ON dev_devices(device_code);
CREATE INDEX IF NOT EXISTS idx_dev_devices_group ON dev_devices(group_id);

-- 设备分组表
CREATE TABLE IF NOT EXISTS dev_device_groups (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES dev_device_groups(id) ON DELETE SET NULL
);

-- 设备-分组成员关联表（多对多）
CREATE TABLE IF NOT EXISTS dev_device_group_members (
    device_id   TEXT NOT NULL,
    group_id    TEXT NOT NULL,
    PRIMARY KEY (device_id, group_id),
    FOREIGN KEY (device_id) REFERENCES dev_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES dev_device_groups(id) ON DELETE CASCADE
);

-- 设备状态变更日志表
CREATE TABLE IF NOT EXISTS dev_device_status_log (
    id            TEXT PRIMARY KEY,
    device_id     TEXT NOT NULL,
    from_status   TEXT,
    to_status     TEXT NOT NULL,
    reason        TEXT,
    error_message TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (device_id) REFERENCES dev_devices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dev_device_status_log_device ON dev_device_status_log(device_id);
CREATE INDEX IF NOT EXISTS idx_dev_device_status_log_created ON dev_device_status_log(created_at);

-- ============================================================
-- 权限管理 — v7.0 新增（来自 02-权限管理.md）
-- ============================================================

-- 设备分组授权表
CREATE TABLE IF NOT EXISTS sys_device_group_authorizations (
    id          TEXT PRIMARY KEY,
    role_id     TEXT NOT NULL,
    project_id  TEXT NOT NULL,
    group_id    TEXT NOT NULL,
    permission  TEXT NOT NULL DEFAULT 'read',
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(role_id, project_id, group_id),
    FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dga_role_project ON sys_device_group_authorizations(role_id, project_id);

-- 标签级授权表（3.6 实现）
CREATE TABLE IF NOT EXISTS sys_tag_authorizations (
    id          TEXT PRIMARY KEY,
    role_id     TEXT NOT NULL,
    project_id  TEXT NOT NULL,
    tag_id      TEXT NOT NULL,
    permission  TEXT NOT NULL DEFAULT 'read',
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(role_id, project_id, tag_id),
    FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ta_role_project ON sys_tag_authorizations(role_id, project_id);

-- 权限变更审计日志表
CREATE TABLE IF NOT EXISTS sys_permission_audit_logs (
    id            TEXT PRIMARY KEY,
    operator_id   TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    action        TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     TEXT NOT NULL,
    changes       TEXT,
    ip_address    TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pal_operator ON sys_permission_audit_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_pal_action ON sys_permission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_pal_target ON sys_permission_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pal_created ON sys_permission_audit_logs(created_at);

-- ============================================================
-- 备份日志表 — 记录每次备份操作，区分全局/项目、自动/手动
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_backup_logs (
    id              TEXT PRIMARY KEY,
    db_type         TEXT NOT NULL,              -- system | project
    backup_type     TEXT NOT NULL,              -- auto | manual
    project_name    TEXT,                       -- 项目名称（db_type=project 时）
    filename        TEXT NOT NULL,
    file_path       TEXT,
    size_bytes      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'success',     -- success | failed
    error_message   TEXT,
    backup_location TEXT,
    triggered_by    TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bkl_db_type ON sys_backup_logs(db_type);
CREATE INDEX IF NOT EXISTS idx_bkl_backup_type ON sys_backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_bkl_project ON sys_backup_logs(project_name);
CREATE INDEX IF NOT EXISTS idx_bkl_status ON sys_backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_bkl_created ON sys_backup_logs(created_at);

-- ============================================================
-- 菜单管理 — v7.1 新增 subsystem 列
-- 注意：sys_menus 是全局系统表，由 SystemMenuConfigService.syncDefaultMenus()
--       在 ss-node.db 中建表，不需要在项目级 init SQL 中重复创建。
--       以下 SQL 仅兼容已有旧表缺失 subsystem 列的场景。
-- ============================================================
ALTER TABLE sys_menus ADD COLUMN subsystem TEXT;
CREATE INDEX IF NOT EXISTS idx_sys_menus_subsystem ON sys_menus(subsystem);

-- ============================================================
-- 菜单数据初始化（v7.1 DB 唯一数据源方案）
-- 系统管理（settings）：用户使用类 — 系统设置、用户、角色、岗位、字典、知识库
-- 系统运维（ops）：运维/监控类 — 系统信息、健康检查、数据库运维、基础服务、
--                    WS监控、系统配置、AI配置、Web终端、菜单配置、通知渠道
-- 注意：此 SQL 仅为已有部署提供 INSERT OR IGNORE 补增；
--       首次启动与字段同步由 SystemMenuConfigService.syncDefaultMenus() 自动完成
-- ============================================================

-- 系统运维顶级菜单
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('ops', NULL, 'system.nav.systemOps', '/info', 'ops', '["admin"]', 110, 0, NULL, datetime('now'), datetime('now'));

-- 系统运维 — 子菜单
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('health', 'ops', 'system.nav.health', '/health', 'health', NULL, 80, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('database-ops', 'ops', 'system.nav.databaseOps', '/database-ops', 'database', '["admin"]', 90, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('base-services', 'ops', 'system.nav.baseServices', '/base-services', 'base-services', '["admin"]', 95, 0, NULL, datetime('now'), datetime('now'));

-- 修正可能存在的旧 label_key
UPDATE sys_menus SET label_key = 'system.nav.baseServices', updated_at = datetime('now')
WHERE id = 'base-services' AND label_key != 'system.nav.baseServices';

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('ws-monitor', 'ops', 'system.nav.wsMonitor', '/ws-monitor', 'ws-monitor', '["admin"]', 96, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('ai-config', 'ops', 'system.nav.aiConfig', '/ai-config', 'settings', '["admin"]', 971, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('terminal', 'ops', 'system.nav.terminal', '/terminal', 'terminal', '["admin"]', 98, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('menus', 'ops', 'system.nav.menus', '/menus', 'menu-config', '["admin"]', 99, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('notification-channels', 'ops', 'system.nav.notificationChannels', '/notification-channels', 'notification', '["admin"]', 100, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('timer-config', 'ops', 'system.nav.timerConfig', '/timer-config', 'timer', '["admin"]', 101, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('system-logs', NULL, 'system.nav.systemLogs', '/operation-logs', 'system-logs', '["admin"]', 999, 0, NULL, datetime('now'), datetime('now'));

-- 清理重命名前的旧菜单项（audit-logs → operation-logs）
DELETE FROM sys_menus WHERE id = 'audit-logs';

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('operation-logs', 'system-logs', 'system.nav.operationLogs', '/operation-logs', 'audit', '["admin"]', 10, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('permission-audit-logs', 'system-logs', 'system.nav.permissionAuditLogs', '/permission-audit-logs', 'permission-audit', '["admin"]', 20, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('error-logs', 'system-logs', 'system.nav.errorLogs', '/error-logs', 'error-log', '["admin"]', 30, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('app-logs', 'system-logs', 'system.nav.appLogs', '/app-logs', 'app-log', '["admin"]', 40, 0, NULL, datetime('now'), datetime('now'));

-- v7.2 菜单整合：将日志类菜单从 ops 迁移到 system-logs 父菜单下
UPDATE sys_menus SET parent_id = 'system-logs', updated_at = datetime('now')
WHERE id IN ('operation-logs', 'permission-audit-logs', 'error-logs', 'app-logs')
  AND parent_id = 'ops';

-- 系统管理 — 子菜单
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('knowledge', 'settings', 'system.nav.knowledge', '/knowledge', 'knowledge', NULL, 99, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('gallery', 'settings', 'system.nav.gallery', '/gallery', 'gallery', '["admin"]', 100, 0, NULL, datetime('now'), datetime('now'));

-- 设备管理 — 子菜单（设备列表 + 设备监控）
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('device-list', 'devices', 'system.nav.devices', '/devices', 'devices', '["admin","user"]', 10, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('device-monitor', 'devices', 'system.nav.deviceMonitor', '/device-monitor', 'device-monitor', '["admin","user"]', 20, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('real-time-trend', 'devices', 'system.nav.realTimeTrend', '/real-time-trend', 'trend', '["admin","user"]', 30, 0, NULL, datetime('now'), datetime('now'));

-- v7.5 项目管理二级菜单重组：project-list + page-management 归入 projects 父菜单
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('project-list', 'projects', 'system.nav.projectList', '/projects', 'projects', '["admin"]', 10, 0, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('page-management', 'projects', 'system.nav.pageManagement', '/page-management', 'page-management', '["admin"]', 20, 0, NULL, datetime('now'), datetime('now'));

-- v7.2 兼容迁移：将旧数据库中仍挂在 settings 下的运维类菜单迁移到 ops
-- v7.x 清理：删除已废弃的 system-config 菜单项（与 系统管理→系统设置 重复）
DELETE FROM sys_menus WHERE id = 'system-config';

UPDATE sys_menus SET parent_id = 'ops', updated_at = datetime('now')
WHERE id IN ('info', 'health', 'database-ops', 'base-services', 'ws-monitor', 'ai-config', 'terminal', 'menus', 'notification-channels', 'timer-config')
  AND parent_id = 'settings';

-- v7.3 菜单整合：将 system-logs 从 ops 提升为顶级菜单
UPDATE sys_menus SET parent_id = NULL, sort_order = 999, updated_at = datetime('now')
WHERE id = 'system-logs' AND parent_id = 'ops';

-- v7.4 报表管理菜单重组：将 reports 和 historical-trend 归入 report-management 父菜单
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('report-management', NULL, 'system.nav.reportManagement', '/reports', 'report-management', '["admin","user"]', 60, 0, NULL, datetime('now'), datetime('now'));

UPDATE sys_menus SET parent_id = 'report-management', updated_at = datetime('now')
WHERE id IN ('reports', 'control-logs', 'historical-trend') AND parent_id IS NULL;

-- v7.5 操作日志菜单项：归入报表管理
INSERT OR IGNORE INTO sys_menus (id, parent_id, label_key, path, icon, roles, sort_order, is_detail, subsystem, created_at, updated_at)
VALUES ('control-logs', 'report-management', 'system.nav.controlLogs', '/control-logs', 'system-logs', '["admin","user"]', 55, 0, NULL, datetime('now'), datetime('now'));

-- ============================================================
-- 基础服务管理 — 管理第三方软件（Redis/InfluxDB/自定义）
-- 存储在全局数据库中，支持 CRUD + 启停 + 配置 + 日志
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_base_services (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    description     TEXT,
    binary_path     TEXT,
    start_args      TEXT,
    config_path     TEXT,
    log_dir         TEXT,
    data_dir        TEXT,
    process_name    TEXT,
    port            INTEGER DEFAULT 0,
    start_script    TEXT,
    stop_script     TEXT,
    enabled         INTEGER DEFAULT 1,
    auto_start      INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_base_services_name ON sys_base_services(name);
CREATE INDEX IF NOT EXISTS idx_base_services_enabled ON sys_base_services(enabled);

-- 默认基础服务记录（已有部署补增，路径由 BaseServicesService.syncDefaultServices() 在启动时补全）
INSERT OR IGNORE INTO sys_base_services (name, display_name, description, port, enabled, auto_start, sort_order, created_at, updated_at)
VALUES ('nanomq', 'NanoMQ', 'NanoMQ MQTT 消息代理', 1883, 1, 0, 3, datetime('now'), datetime('now'));

-- AI Provider 配置表（全局数据库）
CREATE TABLE IF NOT EXISTS sys_ai_providers (
    id              TEXT PRIMARY KEY,
    provider_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    api_key         TEXT NOT NULL,
    api_base        TEXT NOT NULL,
    default_model   TEXT NOT NULL,
    models          TEXT DEFAULT '[]',
    enabled         INTEGER DEFAULT 1,
    sort_order      INTEGER DEFAULT 0,
    config          TEXT DEFAULT '{}',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_id ON sys_ai_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled ON sys_ai_providers(enabled);

-- 预置 AI 供应商配置（默认禁用，用户填入 API Key 后启用）
-- 注意：api_key 为空，用户需在系统设置 → AI 模型配置页面填入
-- config 字段存储 codegenModel/liteModel/embeddingModel/timeout 等扩展配置
INSERT OR IGNORE INTO sys_ai_providers (id, provider_id, name, api_key, api_base, default_model, models, enabled, sort_order, config) VALUES
('preset-deepseek', 'deepseek', 'DeepSeek', '', 'https://api.deepseek.com/v1', 'deepseek-chat', '["deepseek-chat","deepseek-coder","deepseek-reasoner"]', 0, 0, '{"codegenModel":"deepseek-coder","liteModel":"deepseek-chat","timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"https://platform.deepseek.com/api_keys","supportsEmbedding":false,"description":"代码生成能力极强、推理优秀、性价比高"}'),
('preset-zhipu', 'zhipu', '智谱 GLM', '', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4', '["glm-4","glm-4-flash","glm-4-air","glm-4-plus","embedding-3"]', 0, 1, '{"liteModel":"glm-4-flash","embeddingModel":"embedding-3","embeddingDim":1024,"timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"https://open.bigmodel.cn/usercenter/apikeys","supportsEmbedding":true,"description":"中文理解最佳、多模态支持、生态完善"}'),
('preset-qwen', 'qwen', '通义千问 (Qwen)', '', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'qwen-plus', '["qwen-max","qwen-plus","qwen-turbo","qwen-long","text-embedding-v3"]', 0, 2, '{"codegenModel":"qwen-plus","liteModel":"qwen-turbo","embeddingModel":"text-embedding-v3","embeddingDim":1024,"timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"https://dashscope.console.aliyun.com/apiKey","supportsEmbedding":true,"description":"阿里云出品，多模型规模、长文本处理能力强"}'),
('preset-moonshot', 'moonshot', 'Kimi (月之暗面)', '', 'https://api.moonshot.cn/v1', 'moonshot-v1-8k', '["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"]', 0, 3, '{"liteModel":"moonshot-v1-8k","timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"https://platform.moonshot.cn/console/api-keys","supportsEmbedding":false,"description":"超长上下文支持（最高 128K），适合长文档处理"}'),
('preset-ernie', 'ernie', '文心一言 (ERNIE)', '', 'https://qianfan.baidubce.com/v2', 'ernie-4.0-8k-latest', '["ernie-4.0-8k-latest","ernie-3.5-8k","ernie-speed-128k","ernie-lite-8k"]', 0, 4, '{"codegenModel":"ernie-4.0-8k-latest","liteModel":"ernie-lite-8k","embeddingModel":"bge-large-zh","embeddingDim":1024,"timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application","supportsEmbedding":true,"description":"百度出品，中文理解强、生态完善"}'),
('preset-openai', 'openai', 'OpenAI', '', 'https://api.openai.com/v1', 'gpt-4o', '["gpt-4o","gpt-4o-mini","gpt-4-turbo","o1-preview","o1-mini","text-embedding-3-small","text-embedding-3-large"]', 0, 5, '{"codegenModel":"gpt-4o","liteModel":"gpt-4o-mini","embeddingModel":"text-embedding-3-small","embeddingDim":1536,"timeout":60000,"maxRetries":3,"region":"international","apiKeyUrl":"https://platform.openai.com/api-keys","supportsEmbedding":true,"description":"业界标杆，多模态、代码生成、推理能力全面领先"}'),
('preset-claude', 'claude', 'Anthropic Claude', '', 'https://api.anthropic.com/v1', 'claude-3-5-sonnet-20241022', '["claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022","claude-3-opus-20240229"]', 0, 6, '{"codegenModel":"claude-3-5-sonnet-20241022","liteModel":"claude-3-5-haiku-20241022","timeout":60000,"maxRetries":3,"region":"international","apiKeyUrl":"https://console.anthropic.com/settings/keys","supportsEmbedding":false,"description":"超长上下文、推理与代码能力出色、安全性强"}'),
('preset-gemini', 'gemini', 'Google Gemini', '', 'https://generativelanguage.googleapis.com/v1beta/openai', 'gemini-1.5-pro', '["gemini-1.5-pro","gemini-1.5-flash","gemini-1.5-flash-8b","text-embedding-004"]', 0, 7, '{"codegenModel":"gemini-1.5-pro","liteModel":"gemini-1.5-flash","embeddingModel":"text-embedding-004","embeddingDim":768,"timeout":60000,"maxRetries":3,"region":"international","apiKeyUrl":"https://aistudio.google.com/apikey","supportsEmbedding":true,"description":"Google 出品，多模态原生支持、超长上下文（最高 2M tokens）"}'),
('preset-mistral', 'mistral', 'Mistral AI', '', 'https://api.mistral.ai/v1', 'mistral-large-latest', '["mistral-large-latest","mistral-small-latest","codestral-latest","mistral-embed"]', 0, 8, '{"codegenModel":"codestral-latest","liteModel":"mistral-small-latest","embeddingModel":"mistral-embed","embeddingDim":1024,"timeout":60000,"maxRetries":3,"region":"international","apiKeyUrl":"https://console.mistral.ai/api-keys/","supportsEmbedding":true,"description":"欧洲领先 AI 公司，开源生态活跃、代码生成强"}'),
('preset-custom', 'custom', '自定义供应商', '', '', '', '[]', 0, 9, '{"timeout":60000,"maxRetries":3,"region":"domestic","apiKeyUrl":"","supportsEmbedding":false,"description":"手动配置任意 OpenAI 兼容 API 端点"}');

-- ============================================================
-- AI 对话持久化 / Prompt 版本管理 / 用量日志（P2-T08）
-- 说明：sys_ai_providers 已在上方定义；以下 5 张表原先仅由开发环境
--       TypeORM synchronize 自动建表，生产环境（app.module.ts
--       synchronize: !isProduction → false）全新部署会缺表，故补齐。
--       建表语句与 ss-core/src/ai/entities 下的实体定义一一对应。
-- ============================================================

-- AI 会话（按 project + user 隔离）
CREATE TABLE IF NOT EXISTS sys_ai_conversations (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '新对话',
    project_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    task_type       TEXT NOT NULL DEFAULT 'chat',
    model           TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    archived        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project_user ON sys_ai_conversations(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON sys_ai_conversations(updated_at);

-- AI 会话消息（role: system / user / assistant / tool）
CREATE TABLE IF NOT EXISTS sys_ai_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT,
    tool_calls      TEXT,
    tool_call_id    TEXT,
    tool_name       TEXT,
    tokens          INTEGER NOT NULL DEFAULT 0,
    seq             INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON sys_ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_seq ON sys_ai_messages(conversation_id, seq);

-- AI Prompt 模板定义（key 为业务唯一标识）
CREATE TABLE IF NOT EXISTS sys_ai_prompts (
    id                  TEXT PRIMARY KEY,
    "key"               TEXT NOT NULL,
    name                TEXT NOT NULL,
    task_type           TEXT NOT NULL DEFAULT 'chat',
    description         TEXT,
    active_version_id   TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompts_key ON sys_ai_prompts("key");
CREATE INDEX IF NOT EXISTS idx_ai_prompts_task_type ON sys_ai_prompts(task_type);

-- AI Prompt 版本历史（status: draft / active / archived）
CREATE TABLE IF NOT EXISTS sys_ai_prompt_versions (
    id              TEXT PRIMARY KEY,
    prompt_id       TEXT NOT NULL,
    version         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    system_prompt   TEXT NOT NULL,
    variables       TEXT,
    llm_config      TEXT,
    changelog       TEXT,
    metrics         TEXT,
    created_by      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt ON sys_ai_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt_status ON sys_ai_prompt_versions(prompt_id, status);

-- AI 用量与成本日志（Token / 费用 / 延迟，供成本监控与预算熔断）
CREATE TABLE IF NOT EXISTS sys_ai_usage_logs (
    id                  TEXT PRIMARY KEY,
    provider_id         TEXT NOT NULL,
    model               TEXT NOT NULL,
    task_type           TEXT NOT NULL DEFAULT 'chat',
    user_id             TEXT,
    project_id          TEXT,
    conversation_id     TEXT,
    prompt_tokens       INTEGER NOT NULL DEFAULT 0,
    completion_tokens   INTEGER NOT NULL DEFAULT 0,
    total_tokens        INTEGER NOT NULL DEFAULT 0,
    estimated_cost      DECIMAL(12, 8) NOT NULL DEFAULT 0,
    success             INTEGER NOT NULL DEFAULT 1,
    error_message       TEXT,
    latency_ms          INTEGER,
    created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON sys_ai_usage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON sys_ai_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_task_type ON sys_ai_usage_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON sys_ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_project ON sys_ai_usage_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON sys_ai_usage_logs(created_at);

-- ============================================================
-- 趋势查询方案保存
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_trend_query_schemes (
    id                      TEXT PRIMARY KEY,
    name                    TEXT NOT NULL,
    project_id              TEXT NOT NULL,
    device_id               TEXT NOT NULL,
    tag_ids                 TEXT NOT NULL DEFAULT '[]',
    start_time              TEXT,
    end_time                TEXT,
    interpolation_mode      TEXT NOT NULL DEFAULT 'raw',
    interpolation_interval  INTEGER DEFAULT 1000,
    preset_range            TEXT,
    scene                   TEXT NOT NULL DEFAULT 'historical-trend',
    created_at              TEXT DEFAULT (datetime('now')),
    updated_at              TEXT DEFAULT (datetime('now')),
    created_by              TEXT
);
CREATE INDEX IF NOT EXISTS idx_trend_schemes_project ON sys_trend_query_schemes(project_id);

-- ============================================================
-- 报警管理 — 告警记录表（原 event.db 中的表，数据库统一后合并至此）
-- 注：alm_alarm_rules 由 TypeORM synchronize 创建，此处仅提供
--      alm_alarm_records 的 SQL 回退建表（无实体注册时使用）
-- ============================================================
CREATE TABLE IF NOT EXISTS alm_alarm_records (
    id              TEXT PRIMARY KEY,
    rule_id         TEXT,
    tag_id          TEXT NOT NULL,
    device_id       TEXT,
    project_id      TEXT NOT NULL,
    alarm_type      TEXT NOT NULL DEFAULT '',
    level           TEXT DEFAULT 'warning',
    message         TEXT DEFAULT '',
    trigger_value   TEXT,
    limit_value     TEXT,
    status          TEXT DEFAULT 'active',
    acknowledged    INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TEXT,
    cleared_reason  TEXT,
    recovered_at    TEXT,
    recovered_value TEXT,
    disposition_type TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alm_records_project ON alm_alarm_records(project_id);
CREATE INDEX IF NOT EXISTS idx_alm_records_tag ON alm_alarm_records(tag_id);
CREATE INDEX IF NOT EXISTS idx_alm_records_status ON alm_alarm_records(status);
CREATE INDEX IF NOT EXISTS idx_alm_records_created ON alm_alarm_records(created_at);
