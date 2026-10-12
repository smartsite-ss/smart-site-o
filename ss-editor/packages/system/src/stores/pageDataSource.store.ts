// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DataSourceRecord } from '../api/modules/dataSource.api';
import { useWsStore } from './ws.store';
import { extractTagIds, readTagSnapshot, ScadaDataManager } from '@scada-editor/core';

export interface FetchResultItem {
    tagId: string;
    value: unknown;
    quality: string;
    time: string;
    dataType?: string;
}

export interface DataSourceFetchResult {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    items: FetchResultItem[];
    rawData?: unknown;
    error?: string;
    errorType?: 'network' | 'parse' | 'timeout' | 'server' | 'unknown';
    timestamp: number;
}

export interface PageVariable {
    tagId: string;
    tagName: string;
    dataSourceId: string;
    dataType: 'int' | 'float' | 'string' | 'bool';
    currentValue?: unknown;
    quality?: string;
    lastUpdate?: number;
}

export interface GraphicBinding {
    graphicId: string;
    graphicName: string;
    graphicType: string;
    dataSourceId?: string;
    tagId: string;
    filterScript?: string;
    driverScript?: string;
    lastExecution?: {
        timestamp: number;
        elapsed: number;
        success: boolean;
    };
}

export interface PageDataSourceGroup {
    pageId: string;
    dataSources: DataSourceRecord[];
    variables: PageVariable[];
    /** @deprecated v3.0 — graphicBindings 已迁移至图元自身的 graphicData 字段，此处保留仅为兼容。运行时 DataSourceManager 从各图元的 graphicData 读取绑定信息。 */
    graphicBindings: GraphicBinding[];
}

export const usePageDataSourceStore = defineStore('pageDataSource', () => {
    const currentGroup = ref<PageDataSourceGroup | null>(null);

    const selectedGraphicId = ref<string | null>(null);

    const loading = ref(false);
    const error = ref<string | null>(null);

    const currentFetchResult = ref<DataSourceFetchResult | null>(null);
    const fetchLoading = ref(false);
    const fetchError = ref<string | null>(null);

    const dataSources = computed(() => currentGroup.value?.dataSources ?? []);

    const variables = computed(() => currentGroup.value?.variables ?? []);

    const graphicBindings = computed(() => currentGroup.value?.graphicBindings ?? []);

    const selectedGraphicBinding = computed(() => {
        if (!selectedGraphicId.value || !currentGroup.value) return null;
        return currentGroup.value.graphicBindings.find(
            (b: GraphicBinding) => b.graphicId === selectedGraphicId.value,
        ) ?? null;
    });

    const variablesByDataSource = computed(() => {
        const map: Record<string, PageVariable[]> = {};
        for (const v of variables.value) {
            if (!map[v.dataSourceId]) {
                map[v.dataSourceId] = [];
            }
            map[v.dataSourceId].push(v);
        }
        return map;
    });

    const unbindedGraphicIds = computed(() => {
        if (!currentGroup.value) return [];
        const bindedIds = new Set(currentGroup.value.graphicBindings.map((b: GraphicBinding) => b.graphicId));
        return currentGroup.value.graphicBindings
            .filter((b: GraphicBinding) => !bindedIds.has(b.graphicId))
            .map((b: GraphicBinding) => b.graphicId);
    });

    function initGroup(pageId: string) {
        currentGroup.value = {
            pageId,
            dataSources: [],
            variables: [],
            graphicBindings: [],
        };
    }

    function loadGroup(group: PageDataSourceGroup) {
        currentGroup.value = { ...group };
    }

    function clearGroup() {
        currentGroup.value = null;
    }

    function selectGraphic(graphicId: string | null) {
        selectedGraphicId.value = graphicId;
    }

    // ── DataSource CRUD ──

    function addDataSource(source: DataSourceRecord) {
        if (!currentGroup.value) return;
        currentGroup.value.dataSources.push(source);
    }

    function updateDataSource(id: string, updates: Partial<DataSourceRecord>) {
        if (!currentGroup.value) return;
        const idx = currentGroup.value.dataSources.findIndex((ds: DataSourceRecord) => ds.id === id);
        if (idx >= 0) {
            currentGroup.value.dataSources[idx] = {
                ...currentGroup.value.dataSources[idx],
                ...updates,
            };
        }
    }

    function removeDataSource(id: string) {
        if (!currentGroup.value) return;
        currentGroup.value.dataSources = currentGroup.value.dataSources.filter(
            (ds: DataSourceRecord) => ds.id !== id,
        );
        // also remove variables belonging to this data source
        currentGroup.value.variables = currentGroup.value.variables.filter(
            (v: PageVariable) => v.dataSourceId !== id,
        );
        // also remove bindings referencing these variables
        const removedTagIds = new Set(
            currentGroup.value.variables
                .filter((v: PageVariable) => v.dataSourceId === id)
                .map((v: PageVariable) => v.tagId),
        );
        currentGroup.value.graphicBindings = currentGroup.value.graphicBindings.filter(
            (b: GraphicBinding) => !removedTagIds.has(b.tagId),
        );
    }

    function getDataSourceById(id: string): DataSourceRecord | undefined {
        return currentGroup.value?.dataSources.find((ds: DataSourceRecord) => ds.id === id);
    }

    // ── Variable management ──

    function addVariables(newVars: PageVariable[]) {
        if (!currentGroup.value) return;
        for (const v of newVars) {
            const exists = currentGroup.value.variables.find((ev: PageVariable) => ev.tagId === v.tagId);
            if (!exists) {
                currentGroup.value.variables.push(v);
            }
        }
    }

    function updateVariableValue(tagId: string, value: unknown, quality?: string) {
        if (!currentGroup.value) return;
        const v = currentGroup.value.variables.find((v: PageVariable) => v.tagId === tagId);
        if (v) {
            v.currentValue = value;
            v.quality = quality ?? v.quality;
            v.lastUpdate = Date.now();
        }
    }

    function removeVariable(tagId: string) {
        if (!currentGroup.value) return;
        currentGroup.value.variables = currentGroup.value.variables.filter(
            (v: PageVariable) => v.tagId !== tagId,
        );
        // also remove bindings referencing this variable
        currentGroup.value.graphicBindings = currentGroup.value.graphicBindings.filter(
            (b: GraphicBinding) => b.tagId !== tagId,
        );
    }

    function getVariableByTagId(tagId: string): PageVariable | undefined {
        return currentGroup.value?.variables.find((v: PageVariable) => v.tagId === tagId);
    }

    function getVariablesByDataSourceId(dataSourceId: string): PageVariable[] {
        return (currentGroup.value?.variables ?? []).filter(
            (v: PageVariable) => v.dataSourceId === dataSourceId,
        );
    }

    // ── Graphic binding management ──

    function bindGraphicToVariable(
        graphicId: string,
        graphicName: string,
        graphicType: string,
        tagId: string,
    ) {
        if (!currentGroup.value) return;
        const existing = currentGroup.value.graphicBindings.find(
            (b: GraphicBinding) => b.graphicId === graphicId,
        );
        if (existing) {
            existing.tagId = tagId;
            existing.graphicName = graphicName;
            existing.graphicType = graphicType;
        } else {
            currentGroup.value.graphicBindings.push({
                graphicId,
                graphicName,
                graphicType,
                tagId,
            });
        }
    }

    function bindGraphicToDataSource(
        graphicId: string,
        graphicName: string,
        graphicType: string,
        dataSourceId: string,
    ) {
        if (!currentGroup.value) return;
        const existing = currentGroup.value.graphicBindings.find(
            (b: GraphicBinding) => b.graphicId === graphicId,
        );
        if (existing) {
            existing.dataSourceId = dataSourceId;
            existing.tagId = dataSourceId;
            existing.graphicName = graphicName;
            existing.graphicType = graphicType;
        } else {
            currentGroup.value.graphicBindings.push({
                graphicId,
                graphicName,
                graphicType,
                dataSourceId,
                tagId: dataSourceId,
            });
        }
    }

    function unbindGraphic(graphicId: string) {
        if (!currentGroup.value) return;
        currentGroup.value.graphicBindings = currentGroup.value.graphicBindings.filter(
            (b: GraphicBinding) => b.graphicId !== graphicId,
        );
    }

    function getBindingByGraphicId(graphicId: string): GraphicBinding | undefined {
        return currentGroup.value?.graphicBindings.find((b: GraphicBinding) => b.graphicId === graphicId);
    }

    function getBindingsByTagId(tagId: string): GraphicBinding[] {
        return (currentGroup.value?.graphicBindings ?? []).filter(
            (b: GraphicBinding) => b.tagId === tagId,
        );
    }

    function updateBindingScripts(
        graphicId: string,
        scripts: { filterScript?: string; driverScript?: string },
    ) {
        if (!currentGroup.value) return;
        const binding = currentGroup.value.graphicBindings.find(
            (b: GraphicBinding) => b.graphicId === graphicId,
        );
        if (binding) {
            if (scripts.filterScript !== undefined) {
                binding.filterScript = scripts.filterScript;
            }
            if (scripts.driverScript !== undefined) {
                binding.driverScript = scripts.driverScript;
            }
        }
    }

    function updateBindingExecutionStatus(
        graphicId: string,
        success: boolean,
        elapsed: number,
    ) {
        if (!currentGroup.value) return;
        const binding = currentGroup.value.graphicBindings.find(
            (b: GraphicBinding) => b.graphicId === graphicId,
        );
        if (binding) {
            binding.lastExecution = {
                timestamp: Date.now(),
                elapsed,
                success,
            };
        }
    }

    function getUnboundGraphics(allGraphics: Array<{ id: string; name: string; type: string }>) {
        if (!currentGroup.value) return allGraphics;
        const boundIds = new Set(
            currentGroup.value.graphicBindings.map((b: GraphicBinding) => b.graphicId),
        );
        return allGraphics.filter((g) => !boundIds.has(g.id));
    }

    // ── Data Fetching ──

    async function fetchDataSourceData(dataSourceId: string): Promise<DataSourceFetchResult> {
        fetchLoading.value = true;
        fetchError.value = null;
        currentFetchResult.value = null;

        try {
            const ds = getDataSourceById(dataSourceId);
            if (!ds) {
                throw new Error(`Data source not found: ${dataSourceId}`);
            }

            // 禁用数据源不允许拉取，对齐 DataSourceManager.init 中的 enabled===false 跳过逻辑
            if (ds.enabled === false) {
                const disabledResult: DataSourceFetchResult = {
                    sourceId: dataSourceId,
                    sourceName: ds.name || dataSourceId,
                    sourceType: ds.type,
                    items: [],
                    error: '数据源已禁用',
                    timestamp: Date.now(),
                };
                currentFetchResult.value = disabledResult;
                return disabledResult;
            }

            const now = Date.now();
            const timeStr = new Date().toLocaleTimeString();
            const sourceName = ds.name || dataSourceId;
            const sourceType = ds.type;

            let items: FetchResultItem[] = [];
            let rawData: unknown = null;

            switch (sourceType) {
                case 'static': {
                    const variables = ds.properties?.variables ?? [];
                    rawData = variables;
                    items = variables.map((v: any) => ({
                        tagId: v.tagId || '',
                        value: v.value,
                        quality: 'good',
                        time: timeStr,
                        dataType: v.dataType,
                    }));
                    break;
                }

                case 'api': {
                    const url = ds.url || ds.properties?.url;
                    if (!url) {
                        items = [{
                            tagId: 'config',
                            value: JSON.stringify(ds.properties || {}, null, 2),
                            quality: 'uncertain',
                            time: timeStr,
                        }];
                        break;
                    }

                    let timeoutId: ReturnType<typeof setTimeout> | undefined;

                    try {
                        const method = ds.method || ds.properties?.method || 'GET';
                        const headers: Record<string, string> = ds.headers || ds.properties?.headers || {};
                        const body = ds.body || ds.properties?.body;
                        const timeout = (ds as any).timeout || (ds.properties as any)?.timeout || 30000;

                        const controller = new AbortController();
                        timeoutId = setTimeout(() => controller.abort(), timeout);

                        const fetchOptions: RequestInit = {
                            method,
                            headers: { 'Content-Type': 'application/json', ...headers },
                            signal: controller.signal,
                        };
                        if (method === 'POST' && body) {
                            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                        }

                        const response = await fetch(url, fetchOptions);
                        clearTimeout(timeoutId);
                        const data = await response.json();
                        rawData = data;

                        const dataPath = ds.dataPath || ds.properties?.dataPath || '';
                        const fieldMappings = ds.properties?.fieldMappings ?? [];
                        const resolvedData = dataPath ? resolveDataPath(data, dataPath) : data;

                        if (Array.isArray(fieldMappings) && fieldMappings.length > 0) {
                            items = fieldMappings.map((m: any) => {
                                const val = resolveDataPath(resolvedData, m.jsonPath);
                                return {
                                    tagId: m.tagId || '',
                                    value: val !== undefined ? applyScale(val, m.scale, m.offset) : null,
                                    quality: 'good',
                                    time: timeStr,
                                    dataType: m.dataType,
                                };
                            });
                        } else if (Array.isArray(resolvedData)) {
                            items = resolvedData.slice(0, 50).map((item: any, idx: number) => ({
                                tagId: `api_item_${idx}`,
                                value: item,
                                quality: 'good',
                                time: timeStr,
                            }));
                        } else if (resolvedData && typeof resolvedData === 'object') {
                            items = Object.entries(resolvedData).slice(0, 50).map(([key, val]) => ({
                                tagId: key,
                                value: val,
                                quality: 'good',
                                time: timeStr,
                            }));
                        }
                    } catch (fetchErr: any) {
                        clearTimeout(timeoutId);
                        const errorType = fetchErr.name === 'AbortError' ? 'timeout' :
                            fetchErr instanceof TypeError ? 'network' :
                            fetchErr instanceof SyntaxError ? 'parse' : 'unknown';
                        items = [{
                            tagId: 'error',
                            value: `API fetch failed: ${fetchErr.message}`,
                            quality: 'bad',
                            time: timeStr,
                            dataType: errorType,
                        }];
                        rawData = { error: fetchErr.message, errorType };
                    }
                    break;
                }

                case 'tag':
                case 'device': {
                    const tagIds = extractTagIds(ds as unknown as Record<string, unknown>);
                    // 运行态：优先通过 DataSourceManager 驱动读取实时缓存
                    const dm = ScadaDataManager.dataSourceManager;
                    if (dm.initialized) {
                        await dm.fetchById(dataSourceId);
                        const cachedValues: Record<string, unknown> = {};
                        items = tagIds.map((tagId: string) => {
                            const cached = dm.getCachedValue(tagId);
                            cachedValues[tagId] = cached
                                ? { value: cached.value, quality: cached.quality, timestamp: cached.timestamp }
                                : null;
                            return {
                                tagId,
                                value: cached?.value ?? null,
                                quality: cached?.quality ?? 'uncertain',
                                time: cached?.timestamp
                                    ? new Date(cached.timestamp).toLocaleTimeString()
                                    : timeStr,
                            };
                        });
                        rawData = { tagIds, values: cachedValues };
                        break;
                    }
                    // 编辑态：从 wsStore 读取实时数据 fallback
                    const wsStore = useWsStore();
                    const wsValues: Record<string, unknown> = {};
                    for (const tagId of tagIds) {
                        const snapshot = readTagSnapshot(tagId, tagId, wsStore);
                        wsValues[tagId] = snapshot.currentValue !== undefined
                            ? { value: snapshot.currentValue, quality: snapshot.quality, timestamp: snapshot.lastUpdate }
                            : null;
                    }
                    rawData = { tagIds, values: wsValues };
                    items = tagIds.map((tagId: string) => {
                        const snapshot = readTagSnapshot(tagId, tagId, wsStore);
                        return {
                            tagId,
                            value: snapshot.currentValue ?? null,
                            quality: snapshot.quality ?? 'uncertain',
                            time: snapshot.lastUpdate
                                ? new Date(snapshot.lastUpdate).toLocaleTimeString()
                                : timeStr,
                        };
                    });
                    if (items.length === 0 && ds.properties?.sourceName) {
                        items = [{
                            tagId: 'config',
                            value: JSON.stringify({ sourceName: ds.properties.sourceName, tagIds }, null, 2),
                            quality: 'uncertain',
                            time: timeStr,
                        }];
                    }
                    break;
                }

                case 'sql':
                case 'database': {
                    const queryMode = ds.properties?.queryMode || 'sql';
                    const sqlQuery = ds.properties?.sqlQuery || '';
                    const tableName = ds.properties?.tableName || '';
                    const selectedColumns = ds.properties?.selectedColumns ?? [];
                    const sqlColumnMappings = ds.properties?.sqlColumnMappings ?? [];

                    if (queryMode === 'sql' && sqlQuery) {
                        rawData = { queryMode, sqlQuery, columnMappings: sqlColumnMappings };
                        items = [{
                            tagId: 'query',
                            value: sqlQuery,
                            quality: 'uncertain',
                            time: timeStr,
                        }];
                    } else if (queryMode === 'table' && selectedColumns.length > 0) {
                        rawData = { queryMode, tableName, selectedColumns };
                        items = selectedColumns.map((col: any) => ({
                            tagId: col.tagId || col.columnName,
                            value: null,
                            quality: 'uncertain',
                            time: timeStr,
                            dataType: col.dataType,
                        }));
                    } else {
                        rawData = ds.properties;
                        items = [{
                            tagId: 'config',
                            value: JSON.stringify(ds.properties || {}, null, 2),
                            quality: 'uncertain',
                            time: timeStr,
                        }];
                    }
                    break;
                }

                default: {
                    rawData = ds.properties;
                    items = [{
                        tagId: 'config',
                        value: JSON.stringify({
                            type: sourceType,
                            name: sourceName,
                            config: ds.properties || {},
                        }, null, 2),
                        quality: 'uncertain',
                        time: timeStr,
                    }];
                    break;
                }
            }

            const result: DataSourceFetchResult = {
                sourceId: dataSourceId,
                sourceName,
                sourceType,
                items,
                rawData,
                timestamp: now,
            };

            currentFetchResult.value = result;
            return result;
        } catch (err: any) {
            const msg = err.message || 'Fetch failed';
            const errorType = err.name === 'AbortError' ? 'timeout' :
                err instanceof TypeError ? 'network' :
                err instanceof SyntaxError ? 'parse' : 'unknown';
            fetchError.value = msg;
            const result: DataSourceFetchResult = {
                sourceId: dataSourceId,
                sourceName: dataSourceId,
                sourceType: 'unknown',
                items: [],
                error: msg,
                errorType,
                timestamp: Date.now(),
            };
            currentFetchResult.value = result;
            return result;
        } finally {
            fetchLoading.value = false;
        }
    }

    function clearFetchResult() {
        currentFetchResult.value = null;
        fetchError.value = null;
        fetchLoading.value = false;
    }

    function resolveDataPath(data: unknown, path: string): unknown {
        if (!path || !data || typeof data !== 'object') return data;
        const parts = path.split('.');
        let current: any = data;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    }

    function applyScale(value: unknown, scale?: number, offset?: number): unknown {
        if (typeof value !== 'number') return value;
        let result = value;
        if (scale !== undefined && scale !== null && scale !== 1) result *= scale;
        if (offset !== undefined && offset !== null && offset !== 0) result += offset;
        return result;
    }

    // ── Export / Import ──

    function toJSON(): PageDataSourceGroup | null {
        return currentGroup.value ? { ...currentGroup.value } : null;
    }

    function fromJSON(group: PageDataSourceGroup) {
        currentGroup.value = { ...group };
    }

    /**
     * 统一保存链路：将当前 store 状态序列化后写入页面 JSON 的 dataSource 字段。
     * 替代各组件中重复的 `currentPage.dataSource = pageDsStore.toJSON()` 调用。
     *
     * @param page 当前页面对象（需具有可写的 dataSource 字段）
     */
    function persistToPage(page: { dataSource?: PageDataSourceGroup | null }): void {
        page.dataSource = toJSON();
    }

    function clearError() {
        error.value = null;
    }

    return {
        currentGroup,
        selectedGraphicId,
        loading,
        error,
        currentFetchResult,
        fetchLoading,
        fetchError,
        dataSources,
        variables,
        graphicBindings,
        selectedGraphicBinding,
        variablesByDataSource,
        unbindedGraphicIds,
        initGroup,
        loadGroup,
        clearGroup,
        selectGraphic,
        addDataSource,
        updateDataSource,
        removeDataSource,
        getDataSourceById,
        addVariables,
        updateVariableValue,
        removeVariable,
        getVariableByTagId,
        getVariablesByDataSourceId,
        bindGraphicToVariable,
        bindGraphicToDataSource,
        unbindGraphic,
        getBindingByGraphicId,
        getBindingsByTagId,
        updateBindingScripts,
        updateBindingExecutionStatus,
        getUnboundGraphics,
        fetchDataSourceData,
        clearFetchResult,
        toJSON,
        fromJSON,
        persistToPage,
        clearError,
    };
});