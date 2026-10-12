// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * Mock API 工厂：创建带日志收集的 Mock ScriptAPI 实例
 */
export function createMockApi(apiCalls: Array<{ method: string; args: any[] }>) {
  return {
    readTag: (tagId: string) => {
      apiCalls.push({ method: 'readTag', args: [tagId] });
      return null;
    },
    writeTag: (tagId: string, value: any) => {
      apiCalls.push({ method: 'writeTag', args: [tagId, value] });
    },
    getTagQuality: (tagId: string) => {
      apiCalls.push({ method: 'getTagQuality', args: [tagId] });
      return 'good';
    },
    setGraphicProps: (graphicId: string, props: Record<string, any>) => {
      apiCalls.push({ method: 'setGraphicProps', args: [graphicId, props] });
    },
    showGraphic: (graphicId: string) => {
      apiCalls.push({ method: 'showGraphic', args: [graphicId] });
    },
    hideGraphic: (graphicId: string) => {
      apiCalls.push({ method: 'hideGraphic', args: [graphicId] });
    },
    moveGraphic: (graphicId: string, x: number, y: number) => {
      apiCalls.push({ method: 'moveGraphic', args: [graphicId, x, y] });
    },
    rotateGraphic: (graphicId: string, angle: number) => {
      apiCalls.push({ method: 'rotateGraphic', args: [graphicId, angle] });
    },
    triggerAlarm: (config: any) => {
      apiCalls.push({ method: 'triggerAlarm', args: [config] });
    },
    acknowledgeAlarm: (alarmId: string) => {
      apiCalls.push({ method: 'acknowledgeAlarm', args: [alarmId] });
    },
    clearAlarm: (alarmId: string) => {
      apiCalls.push({ method: 'clearAlarm', args: [alarmId] });
    },
    getActiveAlarms: () => {
      apiCalls.push({ method: 'getActiveAlarms', args: [] });
      return [];
    },
    switchPage: (pageId: string) => {
      apiCalls.push({ method: 'switchPage', args: [pageId] });
    },
    getCurrentPageId: () => {
      apiCalls.push({ method: 'getCurrentPageId', args: [] });
      return 'test-page';
    },
    fetch: async (url: string, options?: any) => {
      apiCalls.push({ method: 'fetch', args: [url, options] });
      return { status: 200, data: {} };
    },
    setTimeout: (callback: () => void, delay: number) => {
      apiCalls.push({ method: 'setTimeout', args: [delay] });
      return globalThis.setTimeout(callback, delay);
    },
    setInterval: (callback: () => void, interval: number) => {
      apiCalls.push({ method: 'setInterval', args: [interval] });
      return globalThis.setInterval(callback, interval);
    },
    clearTimeout: (id: number) => {
      apiCalls.push({ method: 'clearTimeout', args: [id] });
      globalThis.clearTimeout(id);
    },
    clearInterval: (id: number) => {
      apiCalls.push({ method: 'clearInterval', args: [id] });
      globalThis.clearInterval(id);
    },
    sleep: async (ms: number) => {
      apiCalls.push({ method: 'sleep', args: [ms] });
      await new Promise((r) => globalThis.setTimeout(r, ms));
    },
    notify: (message: string, level: string = 'info') => {
      apiCalls.push({ method: 'notify', args: [message, level] });
    },
    log: (level: string, message: string) => {
      apiCalls.push({ method: 'log', args: [level, message] });
    },
    round: (value: number, decimals: number = 0) => {
      apiCalls.push({ method: 'round', args: [value, decimals] });
      return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },
    clamp: (value: number, min: number, max: number) => {
      apiCalls.push({ method: 'clamp', args: [value, min, max] });
      return Math.max(min, Math.min(max, value));
    },
    mapRange: (v: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
      apiCalls.push({ method: 'mapRange', args: [v, inMin, inMax, outMin, outMax] });
      return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
    },
    colorForValue: (v: number, min: number = 0, max: number = 100) => {
      apiCalls.push({ method: 'colorForValue', args: [v, min, max] });
      const ratio = Math.max(0, Math.min(1, (v - min) / (max - min)));
      return `#${Math.round(ratio * 255).toString(16).padStart(2, '0')}${Math.round((1 - ratio) * 255).toString(16).padStart(2, '0')}00`;
    },
    isAlarm: (v: number, high: number, low: number = 0) => {
      apiCalls.push({ method: 'isAlarm', args: [v, high, low] });
      return v >= high || v <= low;
    },
  };
}