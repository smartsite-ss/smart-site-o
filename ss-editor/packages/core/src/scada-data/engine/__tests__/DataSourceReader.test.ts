// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect } from 'vitest';
import {
  extractTagIds,
  readTagSnapshot,
  readTagSnapshots,
  buildSourceSummary,
  type WsStoreLike,
} from '../DataSourceReader';

// ── 辅助函数 ────────────────────────────────────────────────────────

function makeWsStore(entries: Record<string, { value: unknown; quality?: string; timestamp?: number }>): WsStoreLike {
  return { tagValues: new Map(Object.entries(entries)) };
}

function emptyWsStore(): WsStoreLike {
  return { tagValues: new Map() };
}

// ── extractTagIds ────────────────────────────────────────────────────

describe('extractTagIds', () => {
  it('从 ds.properties.tagIds 提取', () => {
    const ds = { properties: { tagIds: ['a', 'b'] } };
    expect(extractTagIds(ds)).toEqual(['a', 'b']);
  });

  it('从 ds.config.tagIds 提取（兜底 ds.properties 不存在）', () => {
    const ds = { config: { tagIds: ['c', 'd'] } };
    expect(extractTagIds(ds)).toEqual(['c', 'd']);
  });

  it('ds.properties 为空对象时 props 不兜底到 ds.config（仅 falsy 时兜底）', () => {
    const ds = { properties: {}, config: { tagIds: ['x'] } };
    // properties 为 {} 是 truthy，不会兜底到 config.tagIds
    expect(extractTagIds(ds)).toEqual([]);
  });

  it('从 ds.tags 提取（兜底 properties 和 config 都无 tagIds）', () => {
    const ds = { properties: {}, config: {}, tags: ['e', 'f'] };
    expect(extractTagIds(ds)).toEqual(['e', 'f']);
  });

  it('从 ds.properties.tags 提取（兜底 properties.tagIds 不存在）', () => {
    const ds = { properties: { tags: ['g'] } };
    expect(extractTagIds(ds)).toEqual(['g']);
  });

  it('所有路径都为空时返回 []', () => {
    const ds = {};
    expect(extractTagIds(ds)).toEqual([]);
  });

  it('tagIds 不是数组时返回 []', () => {
    const ds = { properties: { tagIds: 'not-an-array' } };
    expect(extractTagIds(ds)).toEqual([]);
  });

  it('ds 为 null 时安全返回 []', () => {
    expect(extractTagIds(null as unknown as Record<string, unknown>)).toEqual([]);
  });

  it('ds 为 undefined 时安全返回 []', () => {
    expect(extractTagIds(undefined as unknown as Record<string, unknown>)).toEqual([]);
  });

  it('重复的 tagId 不去重（由调用方决定）', () => {
    const ds = { tags: ['a', 'a', 'b'] };
    expect(extractTagIds(ds)).toEqual(['a', 'a', 'b']);
  });
});

// ── readTagSnapshot ──────────────────────────────────────────────────

describe('readTagSnapshot', () => {
  it('wsStore 中有数据时返回正确快照', () => {
    const store = makeWsStore({
      'tag-1': { value: 123.4, quality: 'good', timestamp: 1700000000000 },
    });
    const snap = readTagSnapshot('tag-1', '温度A', store);
    expect(snap).toEqual({
      tagId: 'tag-1',
      tagName: '温度A',
      currentValue: 123.4,
      quality: 'good',
      lastUpdate: 1700000000000,
    });
  });

  it('wsStore 中无对应 tag 时返回 undefined 字段', () => {
    const store = emptyWsStore();
    const snap = readTagSnapshot('tag-unknown', '未知', store);
    expect(snap).toEqual({
      tagId: 'tag-unknown',
      tagName: '未知',
      currentValue: undefined,
      quality: undefined,
      lastUpdate: undefined,
    });
  });

  it('tagName 为空时用 tagId 兜底', () => {
    const store = emptyWsStore();
    const snap = readTagSnapshot('tag-x', '', store);
    expect(snap.tagName).toBe('tag-x');
  });

  it('wsEntry 缺少 quality 时返回 undefined', () => {
    const store = makeWsStore({
      'tag-2': { value: 0 },
    });
    const snap = readTagSnapshot('tag-2', '开关', store);
    expect(snap.quality).toBeUndefined();
  });

  it('wsEntry 缺少 timestamp 时返回 undefined', () => {
    const store = makeWsStore({
      'tag-3': { value: 'on' },
    });
    const snap = readTagSnapshot('tag-3', '状态', store);
    expect(snap.lastUpdate).toBeUndefined();
  });

  it('wsEntry value 为 null 时正常传递', () => {
    const store = makeWsStore({
      'tag-4': { value: null, quality: 'bad', timestamp: 1000 },
    });
    const snap = readTagSnapshot('tag-4', '空值', store);
    expect(snap.currentValue).toBeNull();
    expect(snap.quality).toBe('bad');
  });

  it('wsEntry value 为 0 时正常传递（非 undefined）', () => {
    const store = makeWsStore({
      'tag-5': { value: 0, quality: 'good', timestamp: 2000 },
    });
    const snap = readTagSnapshot('tag-5', '零值', store);
    expect(snap.currentValue).toBe(0);
  });
});

// ── readTagSnapshots ─────────────────────────────────────────────────

describe('readTagSnapshots', () => {
  it('批量读取多个标签', () => {
    const store = makeWsStore({
      'a': { value: 1, quality: 'good', timestamp: 100 },
      'b': { value: 2, quality: 'bad', timestamp: 200 },
    });
    const snaps = readTagSnapshots(['a', 'b'], ['标签A', '标签B'], store);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].currentValue).toBe(1);
    expect(snaps[1].currentValue).toBe(2);
  });

  it('部分标签在 wsStore 中不存在时正常返回', () => {
    const store = makeWsStore({
      'a': { value: 1 },
    });
    const snaps = readTagSnapshots(['a', 'missing'], ['A', 'MISSING'], store);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].currentValue).toBe(1);
    expect(snaps[1].currentValue).toBeUndefined();
  });

  it('空数组输入返回空数组', () => {
    const store = makeWsStore({});
    const snaps = readTagSnapshots([], [], store);
    expect(snaps).toEqual([]);
  });

  it('tagNames 长度不足时用 tagId 兜底', () => {
    const store = makeWsStore({
      'tag-1': { value: 42 },
      'tag-2': { value: 99 },
    });
    const snaps = readTagSnapshots(['tag-1', 'tag-2'], ['仅第一个'], store);
    expect(snaps[0].tagName).toBe('仅第一个');
    expect(snaps[1].tagName).toBe('tag-2');
  });
});

// ── buildSourceSummary ───────────────────────────────────────────────

describe('buildSourceSummary', () => {
  // — tag/device 类型 —
  it('tag 类型：单标签汇总值', () => {
    const store = makeWsStore({
      'tag1': { value: 42.5, quality: 'good', timestamp: 1700000000000 },
    });
    const summary = buildSourceSummary(
      { type: 'tag', name: 'ds1' },
      ['tag1'],
      ['温度'],
      store,
    );
    expect(summary).toEqual({
      lastValue: '42.5',
      updatedAt: 1700000000000,
      quality: 'good',
    });
  });

  it('tag 类型：多标签值用逗号分隔', () => {
    const store = makeWsStore({
      't1': { value: 1, quality: 'good', timestamp: 100 },
      't2': { value: 2, quality: 'good', timestamp: 200 },
      't3': { value: 3, quality: 'good', timestamp: 300 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['t1', 't2', 't3'],
      ['a', 'b', 'c'],
      store,
    );
    expect(summary.lastValue).toBe('1, 2, 3');
  });

  it('tag 类型：wsStore 中无数据时显示 —', () => {
    const store = emptyWsStore();
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['tag-no-data'],
      ['无数据标签'],
      store,
    );
    expect(summary.lastValue).toBe('—');
    expect(summary.updatedAt).toBeNull();
    expect(summary.quality).toBeNull();
  });

  it('device 类型：与 tag 类型行为一致', () => {
    const store = makeWsStore({
      'd1': { value: 100, quality: 'good', timestamp: 500 },
    });
    const summary = buildSourceSummary(
      { type: 'device' },
      ['d1'],
      ['设备值'],
      store,
    );
    expect(summary.lastValue).toBe('100');
  });

  // — static 类型 —
  it('static 类型：key:value 格式', () => {
    const store = makeWsStore({
      's1': { value: 'hello', quality: 'good', timestamp: 100 },
    });
    const summary = buildSourceSummary(
      { type: 'static' },
      ['s1'],
      ['keyA'],
      store,
    );
    expect(summary.lastValue).toBe('keyA: hello');
  });

  it('static 类型：无数据时 key: —', () => {
    const store = emptyWsStore();
    const summary = buildSourceSummary(
      { type: 'static' },
      ['s1'],
      ['keyB'],
      store,
    );
    expect(summary.lastValue).toBe('keyB: —');
  });

  // — api 类型 —
  it('api 类型：显示 URL', () => {
    const store = emptyWsStore();
    const summary = buildSourceSummary(
      { type: 'api', url: 'https://example.com/api/data' },
      ['tag-no-care'],  // API 类型不依赖 tagIds 值，但需要至少一个以进入分支
      ['t'],
      store,
    );
    expect(summary.lastValue).toBe('https://example.com/api/data');
  });

  it('api 类型：URL 超长时截断', () => {
    const store = emptyWsStore();
    const longUrl = 'https://example.com/very/long/path/that/exceeds/forty/characters';
    const summary = buildSourceSummary(
      { type: 'api', url: longUrl },
      ['t'],
      ['t'],
      store,
    );
    expect(summary.lastValue!.length).toBeLessThanOrEqual(40);
    expect(summary.lastValue).toMatch(/\.\.\.$/);
  });

  it('api 类型：url 从 properties 中获取', () => {
    const store = emptyWsStore();
    const summary = buildSourceSummary(
      { type: 'api', properties: { url: 'https://props.url.com' } },
      ['t'],
      ['t'],
      store,
    );
    expect(summary.lastValue).toBe('https://props.url.com');
  });

  // — 边界情况 —
  it('tagIds 为空时返回 null', () => {
    const store = makeWsStore({
      'tag1': { value: 42 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      [],
      [],
      store,
    );
    expect(summary).toEqual({ lastValue: null, updatedAt: null, quality: null });
  });

  it('tag 类型：长列表截断（超过 maxLen=60）', () => {
    const store = makeWsStore({
      't1': { value: 'very-long-value-that-takes-many-characters-together' },
      't2': { value: 'another-long-value-here' },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['t1', 't2'],
      ['name1', 'name2'],
      store,
    );
    expect(summary.lastValue!.length).toBeLessThanOrEqual(60);
    expect(summary.lastValue).toMatch(/\.\.\.$/);
  });

  // — updatedAt 取最新 —
  it('updatedAt 取所有标签中最新的 timestamp', () => {
    const store = makeWsStore({
      'old': { value: 1, quality: 'good', timestamp: 1000 },
      'mid': { value: 2, quality: 'good', timestamp: 2000 },
      'new': { value: 3, quality: 'good', timestamp: 3000 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['old', 'mid', 'new'],
      ['o', 'm', 'n'],
      store,
    );
    expect(summary.updatedAt).toBe(3000);
  });

  // — quality 取最差 —
  it('quality 取最差的（bad 优先于 good）', () => {
    const store = makeWsStore({
      'g1': { value: 1, quality: 'good', timestamp: 100 },
      'g2': { value: 2, quality: 'bad', timestamp: 200 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['g1', 'g2'],
      ['a', 'b'],
      store,
    );
    expect(summary.quality).toBe('bad');
  });

  it('全部 good 时 quality 为 good', () => {
    const store = makeWsStore({
      'a': { value: 1, quality: 'good' },
      'b': { value: 2, quality: 'good' },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['a', 'b'],
      ['A', 'B'],
      store,
    );
    expect(summary.quality).toBe('good');
  });

  it('全部无 quality 时返回 null', () => {
    const store = makeWsStore({
      'a': { value: 1 },
      'b': { value: 2 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['a', 'b'],
      ['A', 'B'],
      store,
    );
    expect(summary.quality).toBeNull();
  });

  it('部分标签有质量、部分无时取有值的', () => {
    const store = makeWsStore({
      'a': { value: 1, quality: 'good' },
      'b': { value: 2 },
    });
    const summary = buildSourceSummary(
      { type: 'tag' },
      ['a', 'b'],
      ['A', 'B'],
      store,
    );
    expect(summary.quality).toBe('good');
  });

  // — 未知 type —
  it('未知 type（既不是 tag/device/static/api）时 lastValue 为 null', () => {
    const store = makeWsStore({
      'x': { value: 99 },
    });
    const summary = buildSourceSummary(
      { type: 'database' },
      ['x'],
      ['X'],
      store,
    );
    expect(summary.lastValue).toBeNull();
    expect(summary.updatedAt).toBeNull(); // no timestamp in entry above? No, x has value: 99 but no timestamp, so updatedAt stays null
  });
});

// ── 端到端：模拟 wsStore 数据到达后各函数联动 ──────────────────────────

describe('DataSourceReader — 端到端流程', () => {
  it('wsStore 空 → 填充数据 → readTagSnapshot 读取', () => {
    const store = emptyWsStore();

    // 阶段1：无数据
    const snap1 = readTagSnapshot('tag-1', '温度', store);
    expect(snap1.currentValue).toBeUndefined();

    // 阶段2：模拟 WS 推送数据
    store.tagValues.set('tag-1', { value: 25.5, quality: 'good', timestamp: 1700000000000 });
    const snap2 = readTagSnapshot('tag-1', '温度', store);
    expect(snap2.currentValue).toBe(25.5);
  });

  it('buildSourceSummary 正确反映 wsStore 数据变更', () => {
    const store = emptyWsStore();

    // 初始无数据
    const s1 = buildSourceSummary(
      { type: 'tag', name: 'test' },
      ['t1', 't2'],
      ['温度', '湿度'],
      store,
    );
    expect(s1.lastValue).toBe('—, —');

    // 推送第一批
    store.tagValues.set('t1', { value: 30, quality: 'good', timestamp: 1000 });
    store.tagValues.set('t2', { value: 60, quality: 'good', timestamp: 2000 });
    const s2 = buildSourceSummary(
      { type: 'tag', name: 'test' },
      ['t1', 't2'],
      ['温度', '湿度'],
      store,
    );
    expect(s2.lastValue).toBe('30, 60');
    expect(s2.updatedAt).toBe(2000);
    expect(s2.quality).toBe('good');
  });
});
