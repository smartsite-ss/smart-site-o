// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import type { TagBinding } from '../scada-data/managers/BindingManager';
import type { DataFilter, PipelineResult } from '../scada-data/types/pipeline.types';

export interface PipelineBindingState {
  graphicId: string;
  tagBinding: TagBinding;
  filters: DataFilter[];
  lastResult?: PipelineResult;
  lastValue?: unknown;
}

function getDefaultState() {
  return {
    bindings: {} as Record<string, PipelineBindingState[]>,
  };
}

export const useDataPipelineStore = defineStore('dataPipeline', {
  state: () => getDefaultState(),

  getters: {
    getGraphicBindings: (state) => {
      return (graphicId: string): PipelineBindingState[] => state.bindings[graphicId] || [];
    },
    getLastResult: (state) => {
      return (graphicId: string): PipelineResult | undefined => {
        const bindings = state.bindings[graphicId];
        if (!bindings) return undefined;
        return bindings[0]?.lastResult;
      };
    },
  },

  actions: {
    addBinding(graphicId: string, tagBinding: TagBinding, filters: DataFilter[] = []): void {
      if (!this.bindings[graphicId]) {
        this.bindings[graphicId] = [];
      }
      this.bindings[graphicId].push({ graphicId, tagBinding, filters });
    },

    removeBinding(graphicId: string, tagId?: string): void {
      if (!tagId) {
        delete this.bindings[graphicId];
        return;
      }
      if (!this.bindings[graphicId]) return;
      this.bindings[graphicId] = this.bindings[graphicId].filter((b) => b.tagBinding.tagId !== tagId);
      if (this.bindings[graphicId].length === 0) {
        delete this.bindings[graphicId];
      }
    },

    updateFilters(graphicId: string, filters: DataFilter[]): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        binding.filters = filters;
      }
    },

    addFilter(graphicId: string, filter: DataFilter): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        binding.filters.push(filter);
      }
    },

    removeFilter(graphicId: string, filterId: string): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        binding.filters = binding.filters.filter((f) => f.id !== filterId);
      }
    },

    reorderFilters(graphicId: string, fromIndex: number, toIndex: number): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        const filters = binding.filters;
        if (fromIndex < 0 || fromIndex >= filters.length) return;
        if (toIndex < 0 || toIndex >= filters.length) return;
        const [item] = filters.splice(fromIndex, 1);
        filters.splice(toIndex, 0, item);
      }
    },

    toggleFilterEnabled(graphicId: string, filterId: string, enabled: boolean): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        const filter = binding.filters.find((f) => f.id === filterId);
        if (filter) filter.enabled = enabled;
      }
    },

    setLastResult(graphicId: string, result: PipelineResult, value: unknown): void {
      if (!this.bindings[graphicId]) return;
      for (const binding of this.bindings[graphicId]) {
        binding.lastResult = result;
        binding.lastValue = value;
      }
    },

    clearGraphic(graphicId: string): void {
      delete this.bindings[graphicId];
    },

    clearAll(): void {
      this.bindings = {};
    },
  },
});