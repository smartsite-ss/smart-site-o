// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { defineStore } from 'pinia';
import type { ScadaEventType, EventRecord } from '../scada-data/types/event-bus.types';

function getDefaultState() {
  return {
    history: [] as EventRecord[],
    eventTypeFilter: null as ScadaEventType | null,
    maxRecords: 100,
    paused: false,
  };
}

export const useEventBusStore = defineStore('eventBus', {
  state: () => getDefaultState(),

  getters: {
    filteredHistory: (state): EventRecord[] => {
      if (state.eventTypeFilter) {
        return state.history.filter((r) => r.type === state.eventTypeFilter);
      }
      return state.history;
    },
    eventTypes: (state): ScadaEventType[] => {
      const types = new Set<ScadaEventType>();
      for (const record of state.history) {
        types.add(record.type);
      }
      return Array.from(types);
    },
  },

  actions: {
    addRecord(record: EventRecord): void {
      if (this.paused) return;
      this.history.push(record);
      if (this.history.length > this.maxRecords) {
        this.history = this.history.slice(-this.maxRecords);
      }
    },

    setFilter(eventType: ScadaEventType | null): void {
      this.eventTypeFilter = eventType;
    },

    clearHistory(): void {
      this.history = [];
    },

    setPaused(paused: boolean): void {
      this.paused = paused;
    },

    setMaxRecords(max: number): void {
      this.maxRecords = max;
      if (this.history.length > max) {
        this.history = this.history.slice(-max);
      }
    },
  },
});