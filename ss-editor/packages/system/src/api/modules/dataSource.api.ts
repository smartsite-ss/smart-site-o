// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';
import type { ApiResponse, PaginatedApiResponse, PaginationParams } from '../types/api';

export interface DataSourceConfig {
    type: 'static' | 'dynamic' | 'public' | 'device' | 'api' | 'tag' | 'sql' | 'database';
    name: string;
    description?: string;
    tags?: string[];
    pollingInterval?: number;
    timeout?: number;
    retryCount?: number;
    url?: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Record<string, any>;
    expression?: string;
    properties?: Record<string, any>;
    dataPath?: string;
}

export interface DataSourceRecord extends DataSourceConfig {
    id: string;
    projectId: string;
    enabled: boolean;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MockConfig {
    id: string;
    dataSourceId: string;
    enabled: boolean;
    mode: 'static' | 'dynamic' | 'replay';
    generatorType?: 'sinWave' | 'randomWalk' | 'pulse' | 'ramp' | 'noise';
    generatorParams?: Record<string, any>;
    staticValue?: any;
    replaySource?: string;
    replaySpeed?: number;
}

export interface SimulationScenario {
    id: string;
    name: string;
    description?: string;
    dataSourceId?: string;
    steps: SimulationStep[];
    loop: boolean;
    speed: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface SimulationStep {
    id: string;
    order: number;
    duration: number;
    action: 'setValue' | 'setAlarm' | 'setQuality' | 'increment' | 'decrement' | 'random';
    params: Record<string, any>;
}

const buildUrl = (projectId: string, path: string) =>
    `/projects/${projectId}/datasources${path}`;

export const dataSourceApi = {
    list(projectId: string, params?: PaginationParams): Promise<PaginatedApiResponse<DataSourceRecord>> {
        return client.get(buildUrl(projectId, ''), { params }).then((res) => res.data);
    },

    getById(projectId: string, id: string): Promise<ApiResponse<DataSourceRecord>> {
        return client.get(buildUrl(projectId, `/${id}`)).then((res) => res.data);
    },

    create(projectId: string, config: DataSourceConfig): Promise<ApiResponse<DataSourceRecord>> {
        return client.post(buildUrl(projectId, ''), config).then((res) => res.data);
    },

    update(projectId: string, id: string, config: Partial<DataSourceConfig>): Promise<ApiResponse<DataSourceRecord>> {
        return client.patch(buildUrl(projectId, `/${id}`), config).then((res) => res.data);
    },

    delete(projectId: string, id: string): Promise<void> {
        return client.delete(buildUrl(projectId, `/${id}`));
    },

    enable(projectId: string, id: string): Promise<ApiResponse<DataSourceRecord>> {
        return client.post(buildUrl(projectId, `/${id}/enable`)).then((res) => res.data);
    },

    disable(projectId: string, id: string): Promise<ApiResponse<DataSourceRecord>> {
        return client.post(buildUrl(projectId, `/${id}/disable`)).then((res) => res.data);
    },

    test(projectId: string, id: string): Promise<ApiResponse<{ success: boolean; latency: number; error?: string }>> {
        return client.post(buildUrl(projectId, `/${id}/test`)).then((res) => res.data);
    },

    getMockConfigs(projectId: string): Promise<ApiResponse<MockConfig[]>> {
        return client.get(buildUrl(projectId, '/mocks')).then((res) => res.data);
    },

    saveMockConfig(projectId: string, config: MockConfig): Promise<ApiResponse<MockConfig>> {
        if (config.id) {
            return client.put(buildUrl(projectId, `/mocks/${config.id}`), config).then((res) => res.data);
        }
        return client.post(buildUrl(projectId, '/mocks'), config).then((res) => res.data);
    },

    deleteMockConfig(projectId: string, id: string): Promise<void> {
        return client.delete(buildUrl(projectId, `/mocks/${id}`));
    },

    getSimulationScenarios(projectId: string): Promise<ApiResponse<SimulationScenario[]>> {
        return client.get(buildUrl(projectId, '/simulations')).then((res) => res.data);
    },

    saveSimulationScenario(projectId: string, scenario: SimulationScenario): Promise<ApiResponse<SimulationScenario>> {
        if (scenario.id) {
            return client.put(buildUrl(projectId, `/simulations/${scenario.id}`), scenario).then((res) => res.data);
        }
        return client.post(buildUrl(projectId, '/simulations'), scenario).then((res) => res.data);
    },

    deleteSimulationScenario(projectId: string, id: string): Promise<void> {
        return client.delete(buildUrl(projectId, `/simulations/${id}`));
    },

    importFile(projectId: string, file: File): Promise<ApiResponse<{ recordCount: number; headers: string[]; preview: any[] }>> {
        const formData = new FormData();
        formData.append('file', file);
        return client.post(buildUrl(projectId, '/import'), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then((res) => res.data);
    },
};