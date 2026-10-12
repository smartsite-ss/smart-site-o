// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { DataSourceConfig, DataSourceInfo, TagValue } from '../types/data-source.types';
import type { DataSourceManagerStatus } from '../types/graphic-data.types';
import type { IDataSourceDriver } from '../drivers/IDataSourceDriver';
import { DriverRegistry } from './DriverRegistry';
import { TagCache } from './TagCache';
import { SubscriptionManager } from './SubscriptionManager';
import type { TagValueChangeHandler, BindingInfo, VariableInfo } from './SubscriptionManager';
import { extractTagIds } from './DataSourceReader';

export type { TagValueChangeHandler };

export interface PageDataSourceInput {
  /** v3.0: pageId 用于标识当前页面，dataSources 来自页面 JSON 的 dataSource 字段 */
  pageId: string;
  /** v4.5: 运行态项目标识，用于 WebSocketDriver 建立连接、订阅标签 */
  projectId?: string;
  /** v3.0: 页面 dataSource 集合，直接从页面 JSON 反序列化，不再从独立数据库查询 */
  dataSources: Array<{
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
    enabled?: boolean;
  }>;
  variables: Array<{
    tagId: string;
    tagName: string;
    dataSourceId: string;
    dataType: string;
    unit?: string;
    minValue?: number;
    maxValue?: number;
    alarmHigh?: number;
    alarmHighHigh?: number;
    alarmLow?: number;
    alarmLowLow?: number;
    decimalPlaces?: number;
  }>;
  /** @deprecated v3.0 — graphicBindings 正逐步迁移至各图元的 graphicData 字段。运行时建议从图元自己的 graphicData 读取绑定信息。 */
  graphicBindings: Array<{
    graphicId: string;
    graphicName: string;
    graphicType: string;
    tagId: string;
    filterScript?: string;
    driverScript?: string;
    /** 图元属性路径；缺省 'config.customProps.text' */
    propertyPath?: string;
  }>;
}

interface EventBusLike {
  emit(eventType: string, payload: unknown, sourceId?: string): void;
}

/**
 * DataSourceManager — 页面数据源集中管理窗口（组合 DriverRegistry / TagCache / SubscriptionManager）
 *
 * **v3.0 定位**：本管理器是页面内所有数据源的集中管理窗口，提供统一查看、修改、调试能力。
 * 它不是持久化层——数据源集合随页面 JSON 一同序列化，页面加载时从页面配置直接反序列化。
 */
export class DataSourceManager {
  private _driverRegistry = new DriverRegistry();
  private _tagCache = new TagCache();
  private _subscriptionManager = new SubscriptionManager();
  private _eventBus: EventBusLike;
  private _pageId = '';
  private _projectId = '';
  private _activeTimers: Set<ReturnType<typeof setInterval>> = new Set();
  private _initialized = false;
  /** 轮询数据源连续失败次数（用于熔断判断） */
  private _refreshErrorCounts = new Map<string, number>();
  private static readonly MAX_CONSECUTIVE_ERRORS = 3;

  constructor(eventBus: EventBusLike) {
    this._eventBus = eventBus;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** 运行态项目标识，供 WebSocketDriver 等 driver 读取 */
  getProjectId(): string {
    return this._projectId;
  }

  // ── 驱动注册 ──────────────────────────────────────

  registerDriverFactory(type: string, factory: () => IDataSourceDriver): void {
    this._driverRegistry.registerDriverFactory(type, factory);
  }

  // ── 页面生命周期 ─────────────────────────────────

  async init(pageGroup: PageDataSourceInput): Promise<void> {
    if (this._initialized) await this.destroy();

    this._pageId = pageGroup.pageId;
    this._projectId = pageGroup.projectId ?? '';
    this._subscriptionManager.init(
      pageGroup.graphicBindings.map((b) => ({ ...b })) as BindingInfo[],
      pageGroup.variables as VariableInfo[],
    );

    for (const ds of pageGroup.dataSources) {
      if (ds.enabled === false) continue;
      if (!this._driverRegistry.hasFactory(ds.type)) {
        console.warn(`[DataSourceManager] No driver for type "${ds.type}", source "${ds.name}" skipped`);
        continue;
      }
      const { sourceId, driver, info, statusEntry } = this._driverRegistry.createDriver(
        ds.type, ds.config as Record<string, unknown>, ds.name, ds.id,
      );
      this._connectDriverCallback(sourceId, driver);
      let tagIds = pageGroup.variables
        .filter((v) => v.dataSourceId === ds.id || v.dataSourceId === sourceId)
        .map((v) => v.tagId);
      // 兜底：variables 为空时从 ds.config / ds.properties 提取 tagIds
      if (tagIds.length === 0) {
        tagIds = extractTagIds((ds as any).config || ds);
      }
      if (tagIds.length > 0) this._subscriptionManager.subscribeToSource(driver, tagIds);
      try {
        // 注入 projectId 上下文供 WebSocketDriver 等驱动读取（不修改原 config）
        const connectConfig = this._projectId
          ? { ...info.config, projectId: this._projectId } as any
          : info.config;
        await driver.connect(connectConfig);
        // connect() 在某些预期场景（如未登录）可能不抛异常但也未实际连接，
        // 必须通过 getStatus() 校准状态，不能盲信无异常=已连接
        const driverStatus = driver.getStatus();
        info.status = driverStatus;
        if (driverStatus === 'connected') {
          statusEntry.status = 'active';
          this._eventBus.emit('sourceConnected', { sourceId, type: ds.type });
        } else if (driverStatus === 'error') {
          statusEntry.status = 'error';
          statusEntry.errorMessage = info.lastError || 'Connection failed';
          this._eventBus.emit('sourceError', { sourceId, error: info.lastError || 'Connection failed' });
        } else {
          // disconnected / connecting 等非错误状态 —— 面板显示"已断开"而非"错误"
          statusEntry.status = 'idle';
          console.log(`[DataSourceManager.init] driver "${ds.name}" status=${driverStatus} at ${Date.now()}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        info.status = 'error';
        info.lastError = msg;
        statusEntry.status = 'error';
        statusEntry.errorMessage = msg;
        this._eventBus.emit('sourceError', { sourceId, error: msg });
      }
      this._applyRefreshStrategy(sourceId, ds.type, ds.config);
    }

    this._initialized = true;
    this._eventBus.emit('dataSourceManagerReady', { pageId: this._pageId });
  }

  async destroy(pageId?: string): Promise<void> {
    if (pageId && pageId !== this._pageId) return;
    for (const timer of this._activeTimers) clearInterval(timer);
    this._activeTimers.clear();

    for (const { id: sourceId } of this._driverRegistry.getAllSources()) {
      const driver = this._driverRegistry.getDriver(sourceId);
      const info = this._driverRegistry.getSource(sourceId);
      if (info) info.status = 'disconnected';
      if (driver) {
        try {
          driver.offData(this._createOnDataCallback(sourceId));
          await driver.disconnect();
        } catch { /* ignore */ }
      }
    }
    this._driverRegistry.clear();
    this._tagCache.clear();
    this._subscriptionManager.clear();
    this._refreshErrorCounts.clear();
    this._pageId = '';
    this._projectId = '';
    this._initialized = false;
    this._eventBus.emit('dataSourceManagerDestroyed', { pageId });
  }

  // ── 数据拉取 ─────────────────────────────────────

  async fetchAll(): Promise<void> {
    for (const { id } of this._driverRegistry.getAllSources()) await this._fetchSource(id);
  }

  async fetchById(dataSourceId: string): Promise<void> {
    if (this._driverRegistry.getSource(dataSourceId)) await this._fetchSource(dataSourceId);
  }

  // ── 状态查询 ─────────────────────────────────────

  getStatus(): DataSourceManagerStatus {
    return this._driverRegistry.buildStatus(this._pageId, this._subscriptionManager.getBindings().length);
  }

  getBindings(): BindingInfo[] {
    return this._subscriptionManager.getBindings();
  }

  /** 按 tagId 检索绑定（供 DataPipelineBridge 执行 filter/driver 脚本） */
  getBindingsByTagId(tagId: string): BindingInfo[] {
    return this._subscriptionManager.getBindingsByTagId(tagId);
  }

  getVariableMeta(tagId: string): PageDataSourceInput['variables'][0] | undefined {
    return this._subscriptionManager.getVariableMeta(tagId) as PageDataSourceInput['variables'][0] | undefined;
  }

  // ── 标签变更监听 ─────────────────────────────────

  onTagValueChanged(handler: TagValueChangeHandler): () => void {
    return this._subscriptionManager.onTagValueChanged(handler);
  }

  // ── 数据源注册/注销 ──────────────────────────────

  async registerSource(config: DataSourceConfig): Promise<string> {
    const { sourceId, driver, info } = this._driverRegistry.createDriver(
      config.type, (config as unknown as { config: Record<string, unknown> }).config || {}, config.type,
    );
    this._connectDriverCallback(sourceId, driver);
    try {
      await driver.connect(config);
      info.status = 'connected';
      this._eventBus.emit('sourceConnected', { sourceId, type: config.type });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      info.status = 'error';
      info.lastError = msg;
      this._eventBus.emit('sourceError', { sourceId, error: msg });
    }
    return sourceId;
  }

  async unregisterSource(sourceId: string): Promise<void> {
    const driver = this._driverRegistry.removeSource(sourceId);
    if (driver) {
      driver.offData(this._createOnDataCallback(sourceId));
      await driver.disconnect();
    }
    this._eventBus.emit('sourceDisconnected', { sourceId });
    this._tagCache.clearCachedTags(sourceId);
  }

  // ── 启停控制 ─────────────────────────────────────

  async start(): Promise<void> {
    for (const { id } of this._driverRegistry.getAllSources()) {
      const driver = this._driverRegistry.getDriver(id);
      if (driver && driver.getStatus() !== 'connected') {
        const info = this._driverRegistry.getSource(id)!;
        try { await driver.connect(info.config); info.status = 'connected'; } catch { info.status = 'error'; }
      }
    }
  }

  async stop(): Promise<void> {
    for (const { id } of this._driverRegistry.getAllSources()) {
      const driver = this._driverRegistry.getDriver(id);
      const info = this._driverRegistry.getSource(id);
      if (info) info.status = 'disconnected';
      if (driver) await driver.disconnect();
    }
  }

  async pause(sourceId: string): Promise<void> {
    const driver = this._driverRegistry.getDriver(sourceId);
    const info = this._driverRegistry.getSource(sourceId);
    if (driver && info) { info.status = 'disconnected'; await driver.disconnect(); }
    this._driverRegistry.updateStatusEntry(sourceId, { status: 'paused' });
  }

  async resume(sourceId: string): Promise<void> {
    const driver = this._driverRegistry.getDriver(sourceId);
    const info = this._driverRegistry.getSource(sourceId);
    if (driver && info) {
      try { await driver.connect(info.config); info.status = 'connected'; } catch { info.status = 'error'; }
    }
    this._driverRegistry.updateStatusEntry(sourceId, { status: 'active' });
  }

  // ── 数据读取 ─────────────────────────────────────

  subscribeToSource(sourceId: string, tagIds: string[]): void {
    this._subscriptionManager.subscribeToSource(this._driverRegistry.getDriver(sourceId), tagIds);
  }

  getCachedValue(tagId: string): TagValue | undefined {
    return this._tagCache.getCachedValue(tagId);
  }

  getAllCachedValues(): Map<string, TagValue> {
    return this._tagCache.getAllCachedValues();
  }

  getSource(sourceId: string): DataSourceInfo | undefined {
    return this._driverRegistry.getSource(sourceId);
  }

  getSourceRawData(sourceId: string): Record<string, unknown> | undefined {
    return this._tagCache.getSourceRawData(sourceId);
  }

  getAllSources(): DataSourceInfo[] {
    return this._driverRegistry.getAllSources();
  }

  getDriver(sourceId: string): IDataSourceDriver | undefined {
    return this._driverRegistry.getDriver(sourceId);
  }

  async writeTag(sourceId: string, tagId: string, value: unknown): Promise<void> {
    const driver = this._driverRegistry.getDriver(sourceId);
    if (driver) await driver.write(tagId, value);
  }

  // ── 内部方法 ─────────────────────────────────────

  private _connectDriverCallback(sourceId: string, driver: IDataSourceDriver): void {
    driver.onData(this._createOnDataCallback(sourceId));
  }

  private _createOnDataCallback(sourceId: string): (values: TagValue[]) => void {
    return (values) => this._onDataReceived(sourceId, values);
  }

  private _onDataReceived(sourceId: string, values: TagValue[]): void {
    const now = Date.now();
    this._driverRegistry.updateStatusEntry(sourceId, { lastFetchTime: now });
    // 熔断器：根据本次推送的数据质量更新错误计数（替代原双层轮询中的 _fetchSource 错误捕获）
    this._updateCircuitBreaker(sourceId, values);
    const changes = this._tagCache.processReceivedData(sourceId, values);
    if (changes.length > 0) {
      console.log(`[DataSourceManager._onData] source=${sourceId}, changes=${changes.length}: ${changes.map(c => `${c.tagId.slice(0,8)}=${String(c.value).slice(0,20)}`).join(', ')}`);
    }
    for (const change of changes) {
      const payload = { ...change, timestamp: now };
      this._eventBus.emit('tagValueChanged', payload);
      this._subscriptionManager.notifyTagValueChanged(payload);
    }
  }

  /**
   * 熔断器：driver 推送 stale/bad 质量数据时计数，连续达到阈值则 emit sourceError。
   * 推送 good 数据时重置计数。替代原 _applyRefreshStrategy 中的 _fetchSource 错误捕获逻辑。
   */
  private _updateCircuitBreaker(sourceId: string, values: TagValue[]): void {
    const hasBadQuality = values.some((v) => v.quality === 'stale' || v.quality === 'bad');
    if (hasBadQuality) {
      const prev = this._refreshErrorCounts.get(sourceId) || 0;
      const count = prev + 1;
      this._refreshErrorCounts.set(sourceId, count);
      this._driverRegistry.updateStatusEntry(sourceId, { status: 'error', errorMessage: `数据质量降级 (连续 ${count} 次)` });
      if (count >= DataSourceManager.MAX_CONSECUTIVE_ERRORS) {
        this._eventBus.emit('sourceError', { sourceId, error: `连续 ${count} 次推送降级数据` });
      }
    } else if (this._refreshErrorCounts.get(sourceId)) {
      this._refreshErrorCounts.delete(sourceId);
      this._driverRegistry.updateStatusEntry(sourceId, { status: 'active', errorMessage: undefined });
    }
  }

  private async _fetchSource(sourceId: string): Promise<void> {
    const driver = this._driverRegistry.getDriver(sourceId);
    const info = this._driverRegistry.getSource(sourceId);
    if (!driver || !info) return;
    this._driverRegistry.updateStatusEntry(sourceId, { status: 'loading' });
    try {
      await driver.connect(info.config);
      info.status = 'connected';
      this._driverRegistry.updateStatusEntry(sourceId, { status: 'active', lastFetchTime: Date.now() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      info.status = 'error';
      info.lastError = msg;
      this._driverRegistry.updateStatusEntry(sourceId, { status: 'error', errorMessage: msg });
    }
  }

  /**
   * 刷新策略：driver 自治轮询，DSM 不再启动定时器（消除双层轮询）。
   * - static/tag/websocket：无轮询
   * - api/polling/sql：driver 内部 _startPolling 自管定时器
   * - 熔断器逻辑已迁移到 _onDataReceived → _updateCircuitBreaker
   *
   * 保留此方法作为扩展点（未来可在此挂载按需刷新、健康检查等策略）。
   */
  private _applyRefreshStrategy(_sourceId: string, _dsType: string, _dsConfig: Record<string, unknown>): void {
    // no-op: driver 自管轮询，DSM 通过 _onDataReceived 的熔断器监控数据质量
  }
}