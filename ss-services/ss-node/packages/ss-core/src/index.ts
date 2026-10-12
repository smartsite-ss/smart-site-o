// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export { AuthModule } from './core/auth/auth.module';
export { AuthService } from './core/auth/auth.service';
export { WechatAuthModule } from './core/auth/wechat/wechat-auth.module';
export { WechatAuthService } from './core/auth/wechat/wechat-auth.service';
// --- 微信小程序订阅消息（10 模块） ---
export { WechatSubscribeMessageModule } from './core/subscribe-message/wechat-subscribe-message.module';
export {
  WechatSubscribeMessageChannel,
  MOCK_DEVICE_STATUS_TEMPLATE_ID,
} from './core/subscribe-message/wechat-subscribe-message.channel';
export type {
  SubscribeMessagePayload,
  DeviceStatusSubscribePayload,
} from './core/subscribe-message/wechat-subscribe-message.channel';
export { SubscribeMessageService } from './core/subscribe-message/subscribe-message.service';
export type {
  AuthorizationReportDto,
  NotificationPreferenceDto,
} from './core/subscribe-message/subscribe-message.service';
export {
  WechatSubscribeAuthorization,
} from './core/subscribe-message/entities/wechat-subscribe-authorization.entity';
export type { SubscribeAuthorizationStatus } from './core/subscribe-message/entities/wechat-subscribe-authorization.entity';
export {
  WechatNotificationPreference,
  ALARM_LEVEL_SEVERITY,
} from './core/subscribe-message/entities/wechat-notification-preference.entity';
export type { MinimumAlarmLevel } from './core/subscribe-message/entities/wechat-notification-preference.entity';
export { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
export { UserModule } from './core/user/user.module';
export { BaseEntity, ProjectScopedEntity } from './core/entities/base.entity';
export {
  SystemEvent,
  SystemEventClearReason,
  SystemEventDispositionType,
} from './core/entities/system-event.entity';
export { SystemEventService } from './core/system-event/system-event.service';
export type {
  CreateSystemEventDto,
  SystemEventQuery,
} from './core/system-event/system-event.service';
export { SystemEventModule } from './core/system-event/system-event.module';
export { BaseService } from './core/base-service';
export { ErrorFactory } from './core/error-factory';
export { User } from './core/user/entities/user.entity';
export { UserRole } from './core/user/entities/user.entity';
export { Role } from './core/user/entities/role.entity';
export { Position } from './core/user/entities/position.entity';
export { TagAuthorization } from './core/user/entities/tag-authorization.entity';
export { UserService } from './core/user/user.service';
export { RoleService } from './core/user/role.service';
export { SessionService } from './core/auth/session/session.service';
export { PositionService } from './core/user/position.service';
export { AuthorizationService } from './core/user/authorization.service';
export type { TagAuthDto } from './core/user/authorization.service';
export { WebSocketModule } from './websocket/websocket.module';
export { ScadaWebSocketGateway } from './websocket/websocket.gateway';
export { DataPushBridge } from './websocket/data-push-bridge';
export { ConnectionLimiterService } from './websocket/connection-limiter.service';
export type { ConnectionLimiterConfig } from './websocket/connection-limiter.service';
export { RoomService } from './websocket/room/room.service';
export type { RoomMember, RoomJoinResult } from './websocket/room/room.service';
export { ConnectionMonitorService } from './websocket/connection-monitor.service';
export type {
  ConnectionSnapshot,
  MessageRateStats,
  DurationStats,
  MonitorStats,
} from './websocket/connection-monitor.service';
export { OfflineMessageService } from './websocket/offline-message.service';
export type {
  OfflineMessage,
  OfflineMessageStats,
  OfflineMessageConfig,
} from './websocket/offline-message.service';
export { OfflineMessageRedisPersistence } from './websocket/offline-message-redis.persistence';
export { OfflineMessageCacheService } from './websocket/offline-message-cache.service';
export type {
  CachedMessage,
  CacheStats as WsOfflineCacheStats,
} from './websocket/offline-message-cache.service';
// --- Plugin & Diagnostics 已迁移至 @ss-node/ss-collector-sdk ---
// --- Protocol 接口 (IProtocolAdapter/IDeviceContext/ITagContext/ChannelValidationResult/FieldError) 已迁移至 @ss-node/ss-collector-sdk ---

export { RolesGuard } from './core/auth/guards/roles.guard';
export { Roles } from './core/auth/decorators/roles.decorator';
export { ReadRoles, WriteRoles } from './core/auth/decorators/role-combiners';
export { PermissionsGuard } from './core/auth/guards/permissions.guard';
export { Permissions } from './core/auth/decorators/permissions.decorator';
export { PermissionCodes, DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATEGORIES } from './core/auth/permission-codes';
export { Public } from './core/auth/decorators/public.decorator';

export { EventBusModule } from './event-bus/event-bus.module';
export { EventBusService } from './event-bus/event-bus.service';
export type { EmitHook } from './event-bus/event-bus.service';
export * from './event-bus/event-bus.types';

// --- Event Log (事件日志，配置变更可追溯) ---
export { EventLogModule } from './event-log/event-log.module';
export { EventLogService } from './event-log/event-log.service';
export { EventLogController } from './event-log/event-log.controller';
export { EventLogQueryDto } from './event-log/event-log-query.dto';
export { EventLog } from './event-log/entities/event-log.entity';
export type { SubscriberRecord, EventLogStatus } from './event-log/entities/event-log.entity';

// --- Database (项目级数据库管理) ---
export { DatabaseModule } from './database/database.module';
export { ProjectDatabaseService } from './database/project-database.service';
export { PathModule } from './path/path.module';
export { PathResolverService } from './path/path-resolver.service';
export type {
  PoolConfig,
  PoolStats,
  ProjectDbMode,
  ProjectDbConnection,
} from './database/project-database.service';

export { CacheModule } from './cache/cache.module';
export { DataPointCacheService } from './cache/data-point-cache.service';
export { DataPointRepository } from './cache/data-point.repository';
export * from './cache/cache.types';

// --- Redis（全局共享 Redis 客户端） ---
export { RedisModule } from './redis/redis.module';
export {
  REDIS_CLIENT_DEFAULT,
  REDIS_CLIENT_OFFLINE,
  REDIS_CLIENT_PURPOSE,
  type RedisClientToken,
} from './redis/redis.constants';
export { createRedisClient, closeRedisClient } from './redis/redis.client-factory';
export { LatestValueRedisService, type LatestValueEntry } from './redis/latest-value-redis.service';

export { HealthModule } from './health/health.module';
export { HealthCheckerService } from './health/health-checker.service';
export * from './health/health.types';
export * from './health/system-resource-checker';

export { MetricsModule } from './metrics/metrics.module';
export { MetricsCollectorService } from './metrics/metrics-collector.service';
export * from './metrics/metrics.types';

export { ConnectionModule } from './connection/connection.module';
export { CircuitBreakerService } from './connection/circuit-breaker.service';
export { ConnectionPoolService } from './connection/connection-pool.service';
export {
  ProtocolConnectionPoolService,
  ProtocolConnection,
  ProtocolPoolConfig,
} from './connection/protocol-connection-pool.service';
export * from './connection/connection.types';

export { LoggerModule } from './logger/logger.module';
export { StructuredLogger } from './logger/structured-logger.service';
export { LogEntry, StructuredLoggerConfig } from './logger/logger.types';
export {
  getLogConfig,
  createAppFileTransport,
  createErrorFileTransport,
  createPluginLogger,
} from './logger/logger-factory';
export type { LogConfig } from './logger/logger-factory';
// S-M02: 审计日志独立通道（哈希链防篡改）
export { AuditLoggerModule } from './logger/audit-logger.module';
export { AuditLoggerService } from './logger/audit-logger.service';
export { AuditLogController } from './logger/audit-log.controller';
export { AuditLogQueryDto } from './logger/audit-log-query.dto';
export type {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  AuditLogEntry,
  AuditChainVerificationResult,
  AuditLogQueryFilter,
  AuditLogQueryResult,
  AuditLogStats,
} from './logger/audit-logger.types';
export {
  RateLimitGuard,
  RATE_LIMIT_DEFAULTS,
  RATE_LIMIT_DEV_DEFAULT,
  RATE_LIMIT_PROD_DEFAULT,
  getRateLimitConfig,
  type RateLimitConfig,
} from './api/rate-limit.guard';
export { OperationLogInterceptor } from './api/operation-log.interceptor';

export { TransformInterceptor } from './interceptors/transform.interceptor';
export { OperationLogInterceptor as RequestAuditInterceptor } from './api/operation-log.interceptor';
export type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  PaginationMeta,
} from './common/api-response.interface';
export { ThrottleExceptionFilter } from './common/throttle-exception.filter';

// --- Device State (统一设备状态管理) ---
export { DeviceStateModule } from './device/device-state.module';
export { DeviceStateManager } from './device/device-state-manager.service';
export type {
  DeviceStateRecord,
  DeviceDiagnostics,
  DeviceStats,
  AllDeviceStats,
} from './device/device-state-manager.service';

// --- AI Agent (P1-T01 / P1-T03 / P1-T07) ---
export { AiModule } from './ai/ai.module';
export { AiController } from './ai/ai.controller';
export { LLMProxyService } from './ai/llm-proxy.service';
export { AiProviderConfigService } from './ai/ai-provider-config.service';
export type {
  CreateAiProviderDto,
  UpdateAiProviderDto,
  AiProviderView,
} from './ai/ai-provider-config.service';
export { AiProvider } from './ai/entities/ai-provider.entity';
export { OpenAICompatibleProvider } from './ai/openai-compatible-provider';
export { ILLMProvider, LLM_PROVIDERS } from './ai/llm-provider.interface';
export { PROVIDER_PRESETS, findPreset, getPresetsByRegion } from './ai/provider-presets';
export type { ProviderPreset, ProviderRegion } from './ai/provider-presets';
export { FeatureFlagService, AI_FEATURE_FLAGS } from './ai/feature-flag.service';
export type { AiFeatureFlag } from './ai/feature-flag.service';
export { FeatureFlagGuard, RequireFeatureFlag } from './ai/feature-flag.guard';
export { LLMSafetyGuardService } from './ai/llm-safety-guard.service';
export type { SafetyResult, SafetyConfig } from './ai/llm-safety-guard.service';
export { AgentOrchestratorService } from './ai/agent-orchestrator.service';
export type {
  AgentStep,
  AgentExecuteRequest,
  AgentExecuteOptions,
  BackendTool,
} from './ai/agent-orchestrator.service';
export { createAllBackendTools } from './ai/backend-tools';
export type { BackendToolServices } from './ai/backend-tools';
export {
  getSceneCreationSystemPrompt,
  matchGraphicTypes,
  isSceneCreationIntent,
  GRAPHIC_TYPE_MAP,
} from './ai/scene-creator-agent';
export type { GraphicTypeEntry } from './ai/scene-creator-agent';

// P2-T08: 对话持久化 + Prompt版本 + 成本监控
export { AiConversation, AiMessage } from './ai/entities/ai-conversation.entity';
export { AiPrompt, AiPromptVersion } from './ai/entities/ai-prompt.entity';
export type { PromptVersionStatus } from './ai/entities/ai-prompt.entity';
export { AiUsageLog } from './ai/entities/ai-usage-log.entity';
export { ConversationService } from './ai/conversation.service';
export type { TruncationStrategy, ContextWindowConfig } from './ai/conversation.service';
export { PromptVersionService } from './ai/prompt-version.service';
export type { CreatePromptDto, CreateVersionDto, VersionAction } from './ai/prompt-version.service';
export { CostMonitorService, estimateCost, MODEL_PRICES } from './ai/cost-monitor.service';
export type {
  UsageLogInput,
  UsageStatsQuery,
  UsageStats,
  BudgetStatus,
} from './ai/cost-monitor.service';
export { ChunkingService } from './ai/chunking.service';
export type { TextChunk, ChunkStrategy, ChunkConfig } from './ai/chunking.service';
export { EmbeddingService } from './ai/embedding.service';
export type { EmbedRequest, EmbedResult } from './ai/embedding.service';
export { VectorStoreService } from './ai/vector-store.service';
export type { VectorEntry, SearchConfig, SearchResult } from './ai/vector-store.service';
export { RetrievalService } from './ai/retrieval.service';
export type { RetrievalConfig } from './ai/retrieval.service';
export { RAGQAService } from './ai/rag-qa.service';
export type { RAGQuestionRequest, RAGAnswer, KnowledgeItem } from './ai/rag-qa.service';
export {
  httpRequest,
  httpStream,
  parseSSEStream,
  HttpError,
  HttpTimeoutError,
} from './ai/http-client.util';
export type {
  LLMProviderId,
  TaskType,
  ChatRole,
  ChatMessage,
  ToolCall,
  ToolDefinition,
  LLMRequest,
  LLMResponse,
  ChatStreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  ProviderHealth,
  ProviderConfig,
  RoutingConfig,
} from './ai/llm.types';
export { DEFAULT_ROUTING } from './ai/llm.types';
