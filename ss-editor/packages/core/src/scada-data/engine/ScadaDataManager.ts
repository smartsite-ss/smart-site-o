// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { EventBus } from './EventBus';
import { DataSourceManager } from './DataSourceManager';
import type { PageDataSourceInput } from './DataSourceManager';
import type { IDataSourceDriver } from '../drivers/IDataSourceDriver';
import { DataPipeline } from './DataPipeline';
import { DataDriverEngine } from './DataDriverEngine';
import { DataPipelineBridge } from './DataPipelineBridge';

/**
 * ScadaDataManager — 全局数据源统一调度入口
 *
 * 职责：
 * - 持有全局 EventBus 单例
 * - 持有全局 DataSourceManager 单例
 * - 持有 DataPipeline / DataDriverEngine / DataPipelineBridge 单例
 * - 提供 init() 注册驱动工厂（应用层注入，如 WebSocketDriver）
 * - 提供 initPage() 在页面加载时初始化数据源并启动 filter/driver 脚本执行
 * - 提供 destroyPage() 在页面卸载时清理
 */
class ScadaDataManagerClass {
  private _eventBus: EventBus;
  private _dataSourceManager: DataSourceManager;
  private _dataPipeline: DataPipeline;
  private _dataDriverEngine: DataDriverEngine;
  private _pipelineBridge: DataPipelineBridge | null = null;

  constructor() {
    this._eventBus = new EventBus();
    this._dataSourceManager = new DataSourceManager(this._eventBus);
    this._dataPipeline = new DataPipeline();
    this._dataDriverEngine = new DataDriverEngine();
  }

  get eventBus(): EventBus {
    return this._eventBus;
  }

  get dataSourceManager(): DataSourceManager {
    return this._dataSourceManager;
  }

  get dataPipeline(): DataPipeline {
    return this._dataPipeline;
  }

  get dataDriverEngine(): DataDriverEngine {
    return this._dataDriverEngine;
  }

  /**
   * 初始化：注册驱动工厂。
   * 应在应用启动时调用一次（main.ts），传入 WebSocketDriver 工厂。
   */
  init(driverFactories: Record<string, () => IDataSourceDriver>): void {
    for (const [type, factory] of Object.entries(driverFactories)) {
      this._dataSourceManager.registerDriverFactory(type, factory);
    }
  }

  /**
   * 页面加载时初始化数据源。
   * 自动订阅标签，数据到达后通过 EventBus 发出 tagValueChanged 事件。
   * 同时启动 DataPipelineBridge，使 filterScript/driverScript 在数据到达时自动执行。
   */
  async initPage(pageGroup: PageDataSourceInput): Promise<void> {
    await this._dataSourceManager.init(pageGroup);

    // 启动 DataPipelineBridge：监听 DataSourceManager 的 tagValueChanged，
    // 按 binding 上的 filterScript / driverScript 执行数据管道
    this._pipelineBridge = new DataPipelineBridge({
      dataSourceManager: this._dataSourceManager,
      dataPipeline: this._dataPipeline,
      dataDriverEngine: this._dataDriverEngine,
      getBindingsByTagId: (tagId) => this._dataSourceManager.getBindingsByTagId(tagId)
        .map((b) => ({
          graphicId: b.graphicId,
          tagId: b.tagId,
          graphicName: b.graphicName,
          graphicType: b.graphicType,
          filterScript: b.filterScript,
          driverScript: b.driverScript,
        })),
      getVariableMeta: (tagId) => {
        const meta = this._dataSourceManager.getVariableMeta(tagId);
        return meta ? (meta as Record<string, unknown>) : {};
      },
    });
    this._pipelineBridge.start();
  }

  /**
   * 页面卸载时清理数据源。
   */
  async destroyPage(): Promise<void> {
    if (this._pipelineBridge) {
      this._pipelineBridge.stop();
      this._pipelineBridge = null;
    }
    await this._dataSourceManager.destroy();
  }

  /**
   * 获取数据源管理器的状态（用于调试面板）。
   */
  getStatus() {
    return this._dataSourceManager.getStatus();
  }

  /**
   * 手动拉取所有数据源（用于手动刷新按钮）。
   */
  async fetchAll(): Promise<void> {
    await this._dataSourceManager.fetchAll();
  }

  /**
   * 获取单个标签的实时缓存值（用于运行态数据面板读取）。
   */
  getTagValue(tagId: string): any {
    return this._dataSourceManager.getCachedValue(tagId);
  }
}

/** 全局单例 */
export const ScadaDataManager = new ScadaDataManagerClass();
