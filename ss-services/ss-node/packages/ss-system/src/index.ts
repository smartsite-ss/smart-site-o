// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { SystemModule } from './system.module';

export { SystemService } from './system.service';
export type { SystemHealthDetails } from './system.service';

export { ErrorLog, SystemConfig, OperationLog, BackupLog } from './entities/system.entity';
export { DeviceTagTemplate } from './entities/device-tag-template.entity';
export type { TemplateVariable } from './entities/device-tag-template.entity';

export { TemplateStatus } from './enums/template-status.enum';

export { DeviceTemplateService } from './template/device-template.service';
export type { ApplyResult, SyncResult, TemplateResponse } from './template/device-template.service';

export { DeviceTemplateController } from './template/device-template.controller';

export { CreateDeviceTemplateDto } from './dto/create-device-template.dto';
export { UpdateDeviceTemplateDto } from './dto/update-device-template.dto';
export { ApplyTemplateDto } from './dto/apply-template.dto';
export { SyncTemplateDto } from './dto/sync-template.dto';

export { TemplateLoaderService } from './template/template-loader.service';
export type { LoadedTemplate } from './template/template-loader.service';

export { TemplateIndexService } from './template/template-index.service';
export type {
  TemplateTreeIndex,
  IndustryNode,
  CategoryNode,
  TemplateEntry,
  CreateCategoryDto,
  RenameCategoryDto,
  DeleteCategoryDto,
} from './template/template-index.service';

export { TemplateDiffService } from './template/template-diff.service';
export type { VariableDiff, TemplateDiffResult } from './template/template-diff.service';

export { TemplateInitService } from './template/template-init.service';

export { DictionaryLoaderService } from './dict/dictionary-loader.service';
export type { DictItem, DictTable, DictCategory } from './dict/dictionary-loader.service';
export { DictionaryController } from './dict/dictionary.controller';

// Phase 1 - P0
export { OperationLogService } from './operation-log/operation-log.service';
export type { OperationLogQuery, OperationLogStats } from './operation-log/operation-log.service';
export { OperationLogController } from './operation-log/operation-log.controller';
export { HealthService } from './health/health.service';
export type { HealthProbeResult, DetailedHealth } from './health/health.service';
export { HealthController } from './health/health.controller';

// Phase 2 - P1
export { ErrorLogService } from './error-log/error-log.service';
export type { ErrorLogQuery, ErrorStats } from './error-log/error-log.service';
export { ErrorLogController } from './error-log/error-log.controller';
export { SystemConfigService } from './config/system-config.service';
export { SystemConfigController } from './config/system-config.controller';
export { SystemMenuConfigService } from './config/system-menu-config.service';
export { MenuI18nService } from './config/menu-i18n.service';
export type { MenuI18nItem, MenuI18nTable } from './config/menu-i18n.service';
export { SystemInfoService } from './info/system-info.service';
export type { SystemInfo } from './info/system-info.service';
export { SystemInfoController } from './info/system-info.controller';

// Phase 3 - P2
export { BackupService } from './backup/backup.service';
export type { BackupInfo, BackupConfig } from './backup/backup.service';
export { BackupController } from './backup/backup.controller';
export { DatabaseService } from './backup/database.service';
export type { DatabaseStatus, IntegrityCheckResult, VacuumResult } from './backup/database.service';
export { DatabaseController } from './backup/database.controller';
export { ResourceMonitorService } from './monitor/resource-monitor.service';
export type { ResourceSnapshot, AlertConfig } from './monitor/resource-monitor.service';
export { ResourceMonitorController } from './monitor/resource-monitor.controller';
export { LogViewerService } from './log-viewer/log-viewer.service';
export type { LogEntry, LogFilter } from './log-viewer/log-viewer.service';
export { LogViewerController } from './log-viewer/log-viewer.controller';
export { UserAdminService } from './admin/user-admin.service';
export type { UserQuery, AdminUserListResponse } from './admin/user-admin.service';
export { UserAdminController } from './admin/user-admin.controller';

// Phase 3 - P3
export { SetupService } from './setup/setup.service';
export type {
  SetupStep1Data,
  SetupStep2Data,
  SetupStep3Data,
  SetupStatus,
} from './setup/setup.service';
export { SetupController } from './setup/setup.controller';
export { SystemI18nService, I18nAuthError } from './i18n/system-i18n.service';
export { UpgradeService } from './upgrade/upgrade.service';
export type { UpgradeInfo, UpgradeResult, MigrationRecord } from './upgrade/upgrade.service';
export { UpgradeController } from './upgrade/upgrade.controller';
export { TerminalService } from './terminal/terminal.service';
export type { TerminalCommand } from './terminal/terminal.service';
export { TerminalGateway } from './terminal/terminal.gateway';

// Phase 4 - 基础服务管理
export { BaseServicesService } from './base-services/base-services.service';
export type {
  ServiceStatus,
  ServiceActionResult,
  LogEntry as BaseServiceLogEntry,
} from './base-services/base-services.service';
export { BaseServicesController } from './base-services/base-services.controller';
export { BaseServiceEntity } from './base-services/base-service.entity';
export { CreateBaseServiceDto, UpdateBaseServiceDto } from './base-services/base-service.dto';

// Phase 5 - 系统配置管理与重启
export {
  CONFIG_METADATA_REGISTRY,
  CONFIG_CATEGORY_INFO,
  PENDING_RESTART_KEY,
  ConfigMetadataHelper,
} from './config/config-metadata';
export type { ConfigMetadata, ConfigCategory, ConfigValueType } from './config/config-metadata';
export type { ConfigItemView, ConfigUpdateResult } from './config/system-config.service';
export { SystemRestartService } from './restart/system-restart.service';
export type {
  RestartState,
  RestartStatus,
  RuntimeEnvironment,
} from './restart/system-restart.service';

// Phase 6 - 知识库（纯文件方案）
export { KnowledgeModule } from './knowledge/knowledge.module';
export { KnowledgeService } from './knowledge/knowledge.service';
export { KnowledgeController } from './knowledge/knowledge.controller';
export type {
  KbModule,
  KbRouteMapping,
  KbManifest,
  KbArticle,
  KbTreeNode,
  KbRouteMatch,
  KbSearchResult,
  KbLangStat,
  KbLangsResponse,
} from './knowledge/knowledge.types';

// Phase 7 - 定时任务配置管理
export { TimerConfigService } from './timer-config/timer-config.service';
export type { TimerEntry } from './timer-config/timer-config.service';
export { TimerConfigController } from './timer-config/timer-config.controller';
