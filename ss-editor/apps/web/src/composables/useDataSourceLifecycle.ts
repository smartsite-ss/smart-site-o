// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { watch } from 'vue';
import { ScadaDataManager, BindingManager } from '@scada-editor/core';
import { usePageDataSourceStore, useWsStore } from '@scada-editor/system';

/**
 * 从页面图元的 dataSource 配置提取绑定列表。
 *
 * graphicBindings 可能未持久化到页面 JSON（或已陈旧），此函数作为唯一构建入口，
 * 供 EditorView / PreviewView 在激活数据管道前重建最新绑定。
 */
export function buildGraphicBindingsFromPage(page: any): any[] {
  const rawGraphics = page?.graphics?.value || page?.graphics || [];
  const entries: any[] = [];
  for (const graphic of rawGraphics) {
    const graphicDataSource = graphic?.dataSource;
    if (!graphicDataSource?.enabled || !graphicDataSource?.dataSource) continue;
    entries.push({
      graphicId: graphic.id,
      dataSourceId: graphicDataSource.dataSource,
      propertyPath: graphicDataSource.propertyPath || 'config.customProps.text',
      filterScript: graphicDataSource.filterScript || '',
      driverScript: graphicDataSource.driverScript || '',
    });
  }
  return entries;
}

/**
 * useDataSourceLifecycle — 数据源生命周期统一管理
 *
 * 抽取自 PreviewView.initDataSourceManager / EditorView.preview 中的重复逻辑：
 * 1. 合并 graphicBindings 与图元自身 dataSource 配置（filterScript/driverScript/propertyPath 兜底）
 * 2. ScadaDataManager.initPage 启动数据源调度
 * 3. pageDataSourceStore.loadGroup 加载运行态数据面板状态
 * 4. BindingManager.bind 批量注册属性路径映射
 *
 * 互补关系说明：
 * - DataSourceManager 负责驱动/管道/AQ 订阅（filterScript/driverScript 执行）
 * - BindingManager 负责属性路径映射（expression/format → applyProperty）
 * - 二者互补非冗余，数据到达后各自承担不同职责
 */
export function useDataSourceLifecycle() {
  const wsStore = useWsStore();
  /** 补偿订阅监听器：bind 执行时 WS 未连接（订阅被丢弃），连接成功后一次性补发 */
  let subscriptionResyncStop: (() => void) | null = null;

  /**
   * 初始化页面数据源生命周期。
   *
   * @param pageData 当前页面 JSON（需包含 dataSource 字段和 getGraphicById 方法）
   * @param projectId 项目标识（用于 WebSocketDriver 建立连接）
   * @param logTag 日志前缀（如 'PreviewView' / 'EditorView'），便于定位问题
   */
  async function initDataSourceLifecycle(
    pageData: any,
    projectId: string,
    logTag = 'useDataSourceLifecycle',
  ): Promise<void> {
    try {
      // 独立 wsStore 连接与 dataSource 生命周期解耦：即使页面未配置任何数据源，
      // 「直接绑定」图元（tag-variable / tag-trend，绑定信息写在 config.customProps）
      // 也需要 wsStore 已连接，才能在编辑态 / 运行态收到实时数据。
      const isRealProject =
        !!projectId && projectId !== 'template-mode' && projectId !== 'default-project';
      if (isRealProject) {
        try {
          await wsStore.connect(projectId);
        } catch {
          // wsStore 连接失败（如 connect_error）不应阻断数据源初始化
        }
      }

      const dataSourceGroup = pageData?.dataSource;
      if (!dataSourceGroup?.dataSources?.length) {
        return;
      }

      const currentPage = pageData;
      if (!currentPage) {
        console.warn(`[${logTag}] initDataSourceLifecycle: currentPage not ready`);
        return;
      }

      // ── 合并 graphicBindings 与图元自身的 dataSource 配置 ──
      //    filterScript / driverScript / propertyPath 在编辑态写入 graphic.dataSource，
      //    而 pageGroup.graphicBindings 可能未持久化/未同步，需从图元兜底读取；
      //    graphicBindings 为空时从图元配置重建（修复：预览态首次打开绑定全部被跳过）
      const persistedBindings = dataSourceGroup.graphicBindings ?? [];
      const rawBindings = persistedBindings.length > 0
        ? persistedBindings
        : buildGraphicBindingsFromPage(currentPage);
      dataSourceGroup.graphicBindings = rawBindings;
      const variables = dataSourceGroup.variables ?? [];
      const graphicBindings = rawBindings.map((gb: any) => {
        const graphic = currentPage.getGraphicById?.(gb.graphicId);
        const gd = graphic?.dataSource;
        return {
          ...gb,
          filterScript: gb.filterScript ?? gd?.filterScript,
          driverScript: gb.driverScript ?? gd?.driverScript,
          propertyPath: gb.propertyPath ?? gd?.propertyPath,
        };
      });

      // ── 启动 DataSourceManager：注入 projectId 上下文 ──
      //    WebSocketDriver.connect 会读取 projectId 建立 WS 连接并订阅标签
      //    DataPipelineBridge 会监听 tagValueChanged 并按 filterScript/driverScript 执行
      await ScadaDataManager.initPage({
        pageId: currentPage.id,
        projectId,
        dataSources: dataSourceGroup.dataSources,
        variables,
        graphicBindings,
      });

      // ── 加载 pageDataSourceStore（仅供运行态数据面板/调试使用）──
      const pageDsStore = usePageDataSourceStore();
      pageDsStore.loadGroup({
        pageId: currentPage.id,
        dataSources: dataSourceGroup.dataSources,
        variables,
        graphicBindings,
      });

      // ── 运行时注册数据绑定到 BindingManager ──
      //    DataSourceManager 负责驱动/管道/AQ 订阅；BindingManager 负责属性路径映射
      //    （handleDataUpdate → graphicStore.applyProperty），二者互补非冗余
      for (const gb of rawBindings) {
        const graphic = currentPage.getGraphicById?.(gb.graphicId);
        if (!graphic) continue;
        const dataSourceId = gb.dataSourceId || gb.tagId;
        const dsVars = variables.filter((v: any) => v.dataSourceId === dataSourceId);
        if (dsVars.length === 0) continue;
        const propertyPath = graphic.dataSource?.propertyPath
          || gb.propertyPath
          || 'config.customProps.text';
        for (const v of dsVars) {
          BindingManager.getInstance().bind(gb.graphicId, v.tagId, v.tagName || v.tagId, propertyPath);
        }
      }

      // ── 补偿订阅 ──
      //    subscribeTags 在 WS 未连接时被静默丢弃，而 BindingManager 内部引用计数已递增，
      //    后续不会重新触发订阅；若 bind 执行时连接尚未就绪，连接成功后补发一次。
      subscriptionResyncStop?.();
      subscriptionResyncStop = null;
      if (!wsStore.isConnected) {
        subscriptionResyncStop = watch(
          () => wsStore.isConnected,
          (connected) => {
            if (!connected) return;
            BindingManager.getInstance().resyncTagSubscriptions();
            subscriptionResyncStop?.();
            subscriptionResyncStop = null;
          },
        );
      }
    } catch (err) {
      console.warn(`[${logTag}] initDataSourceLifecycle failed:`, err);
    }
  }

  /**
   * 销毁页面数据源生命周期（页面卸载/预览关闭时调用）。
   */
  async function destroyDataSourceLifecycle(): Promise<void> {
    subscriptionResyncStop?.();
    subscriptionResyncStop = null;
    try {
      await ScadaDataManager.destroyPage();
    } catch {
      /* ignore */
    }
  }

  return {
    initDataSourceLifecycle,
    destroyDataSourceLifecycle,
  };
}
