-- ============================================================
-- ss-device 初始数据库迁移脚本
-- 版本: 001
-- 说明: 创建 dev_devices、dev_device_groups、dev_data_tags、dev_tag_latest_values 表
-- 兼容: SQLite
-- ============================================================

-- 设备表
CREATE TABLE IF NOT EXISTS "dev_devices" (
    "id"                TEXT PRIMARY KEY,
    "device_code"       VARCHAR(64),
    "device_name"       TEXT NOT NULL,
    "nameAlias"         VARCHAR(128),
    "description"       TEXT,
    "type"              VARCHAR(30) NOT NULL,
    "config"            TEXT,
    "status"            VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    "projectId"         TEXT NOT NULL,
    "createdAt"         DATETIME NOT NULL DEFAULT (datetime('now')),
    "updatedAt"         DATETIME NOT NULL DEFAULT (datetime('now')),
    "last_online_at"    DATETIME,
    "error_count"       INTEGER NOT NULL DEFAULT 0,
    "last_error_at"     DATETIME,
    "last_error_msg"    TEXT,
    "template_id"       VARCHAR(36),
    "template_version"  VARCHAR(20),
    "template_applied_at" DATETIME,
    "connection"        TEXT,
    "group_id"          VARCHAR(36),
    "driver"            VARCHAR(30)
);

CREATE INDEX IF NOT EXISTS "idx_dev_devices_device_code" ON "dev_devices"("device_code");
CREATE INDEX IF NOT EXISTS "idx_dev_devices_projectId" ON "dev_devices"("projectId");
CREATE INDEX IF NOT EXISTS "idx_dev_devices_group_id" ON "dev_devices"("group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_dev_devices_projectId_device_code" ON "dev_devices"("projectId", "device_code");

-- 设备分组表
CREATE TABLE IF NOT EXISTS "dev_device_groups" (
    "id"          TEXT PRIMARY KEY,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "project_id"  TEXT NOT NULL,
    "parent_id"   TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "created_at"  DATETIME NOT NULL DEFAULT (datetime('now')),
    "updated_at"  DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("parent_id") REFERENCES "dev_device_groups"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_dev_device_groups_project_id" ON "dev_device_groups"("project_id");

-- 数据标签表
CREATE TABLE IF NOT EXISTS "dev_data_tags" (
    "id"                  TEXT PRIMARY KEY,
    "name"                TEXT NOT NULL,
    "address"             TEXT NOT NULL,
    "dataType"            VARCHAR(20) NOT NULL DEFAULT 'FLOAT32',
    "config"              TEXT,
    "scale"               DECIMAL(10, 2),
    "offset"              DECIMAL(10, 2),
    "scanRate"            INTEGER NOT NULL DEFAULT 1000,
    "enabled"             BOOLEAN NOT NULL DEFAULT 1,
    "description"         VARCHAR(50),
    "unit"                VARCHAR(50),
    "decimalPlaces"       INTEGER,
    "minValue"            DOUBLE,
    "maxValue"            DOUBLE,
    "project_id"          TEXT,
    "displayFormat"       VARCHAR(20) DEFAULT '%.2f',
    "engMinValue"         DOUBLE,
    "engMaxValue"         DOUBLE,
    "timeout"             INTEGER DEFAULT 5000,
    "retryCount"          INTEGER DEFAULT 3,
    "deadbandMode"        VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "deadbandValue"       DOUBLE,
    "deadbandPercent"     DOUBLE,
    "deadbandTime"        INTEGER,
    "conversionType"      VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "conversionConfig"    TEXT,
    "alarmHighHigh"       DOUBLE,
    "alarmHigh"           DOUBLE,
    "alarmLow"            DOUBLE,
    "alarmLowLow"         DOUBLE,
    "alarmDeviation"      DOUBLE,
    "alarmEnabled"        BOOLEAN NOT NULL DEFAULT 1,
    "qualityCheckEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "maxAge"              INTEGER,
    "archiveEnabled"      BOOLEAN NOT NULL DEFAULT 0,
    "archiveInterval"     INTEGER,
    "archiveDeadband"     DOUBLE,
    "retentionDays"       INTEGER,
    "priority"            INTEGER NOT NULL DEFAULT 0,
    "group_id"            TEXT,
    "category"            TEXT,
    "tags"                TEXT,
    "simulation_enabled"  BOOLEAN NOT NULL DEFAULT 0,
    "simulation_config"   TEXT,
    "deviceId"            TEXT NOT NULL,
    "createdAt"           DATETIME NOT NULL DEFAULT (datetime('now')),
    "updatedAt"           DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_dev_data_tags_deviceId" ON "dev_data_tags"("deviceId");
CREATE INDEX IF NOT EXISTS "idx_dev_data_tags_project_id" ON "dev_data_tags"("project_id");

-- 标签最新值表
CREATE TABLE IF NOT EXISTS "dev_tag_latest_values" (
    "tagId"     TEXT PRIMARY KEY,
    "device_id" TEXT NOT NULL,
    "value"     TEXT,
    "quality"   VARCHAR(20) NOT NULL DEFAULT 'good',
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_dev_tag_latest_values_device_id" ON "dev_tag_latest_values"("device_id");